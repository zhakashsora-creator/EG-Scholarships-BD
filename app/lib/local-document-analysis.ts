import type { StudentProfile } from "./matching";

type DocumentForAnalysis = {
  id: string;
  filename: string;
  mimeType?: string;
};

export type LocalDocumentAnalysis = {
  profile: StudentProfile;
  evidenceNotes: string[];
  analyzedIds: string[];
  warnings: string[];
};

type ProgressCallback = (message: string) => void;
type OcrWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;

const MAX_DOCUMENTS = 4;
const MAX_PDF_PAGES = 4;

function extension(filename: string) {
  return filename.toLowerCase().split(".").pop() ?? "";
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function extractSupportedFacts(text: string) {
  const normalized = compact(text);
  const profile: StudentProfile = {};
  const evidenceNotes: string[] = [];

  const gpaMatch = normalized.match(/\b(?:cumulative\s+)?(?:cgpa|gpa)\s*(?:is|of|:|-)?\s*(\d(?:\.\d{1,3})?)\s*(?:\/|out\s+of)\s*(4(?:\.0+)?|5(?:\.0+)?)/i)
    ?? normalized.match(/\b(?:cgpa|gpa)\s*(?:is|:|-)?\s*(\d(?:\.\d{1,3})?)\b/i);
  if (gpaMatch) {
    profile.gpa = gpaMatch[2] ? `${gpaMatch[1]} / ${gpaMatch[2]}` : gpaMatch[1];
    evidenceNotes.push(`Academic result detected: ${profile.gpa}`);
  }

  const englishPatterns: Array<[string, RegExp]> = [
    ["IELTS", /\bIELTS\b[\s\S]{0,80}?\b(?:overall(?:\s+band\s+score)?|band|score)?\s*(?:is|:|-)?\s*(\d(?:\.\d)?)\b/i],
    ["TOEFL", /\bTOEFL(?:\s+iBT)?\b[\s\S]{0,80}?\b(?:total|score)?\s*(?:is|:|-)?\s*(\d{2,3})\b/i],
    ["PTE", /\bPTE(?:\s+Academic)?\b[\s\S]{0,80}?\b(?:overall|score)?\s*(?:is|:|-)?\s*(\d{2,3})\b/i],
    ["Duolingo", /\bDuolingo(?:\s+English\s+Test)?\b[\s\S]{0,80}?\b(?:overall|score)?\s*(?:is|:|-)?\s*(\d{2,3})\b/i],
  ];
  for (const [test, pattern] of englishPatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    profile.englishTest = test;
    profile.englishScore = `${test} ${match[1]}`;
    evidenceNotes.push(`${test} result detected: ${match[1]}`);
    break;
  }

  const experienceMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|full[- ]time\s+|relevant\s+)?(?:work\s+)?experience\b/i);
  if (experienceMatch) {
    profile.workExperience = `${experienceMatch[1]} years`;
    evidenceNotes.push(`Work experience detected: ${profile.workExperience}`);
  }

  return { profile, evidenceNotes };
}

function mergeFacts(target: StudentProfile, source: StudentProfile) {
  for (const key of ["gpa", "englishTest", "englishScore", "workExperience"] as const) {
    if (!target[key] && source[key]) target[key] = source[key];
  }
}

async function getOcrWorker(onProgress: ProgressCallback) {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng", 1, {
    logger(message) {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress(`Reading text on this device — ${Math.round(message.progress * 100)}%`);
      }
    },
  });
}

async function recognizeImage(blob: Blob, worker: OcrWorker) {
  const url = URL.createObjectURL(blob);
  try {
    const result = await worker.recognize(url);
    return result.data.text;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function extractPdfText(blob: Blob, getWorker: () => Promise<OcrWorker>, onProgress: ProgressCallback) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress(`Checking PDF page ${pageNumber} of ${pageCount}`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const selectableText = compact(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    if (selectableText.length >= 80) {
      pages.push(selectableText);
      continue;
    }

    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the PDF page for reading");
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    const worker = await getWorker();
    const result = await worker.recognize(canvas);
    pages.push(result.data.text);
  }

  return pages.join("\n");
}

async function extractDocumentText(documentItem: DocumentForAnalysis, blob: Blob, getWorker: () => Promise<OcrWorker>, onProgress: ProgressCallback) {
  const fileExtension = extension(documentItem.filename);
  const mimeType = documentItem.mimeType || blob.type;
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png"].includes(fileExtension)) {
    return recognizeImage(blob, await getWorker());
  }
  if (mimeType === "application/pdf" || fileExtension === "pdf") {
    return extractPdfText(blob, getWorker, onProgress);
  }
  if (fileExtension === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });
    return result.value;
  }
  throw new Error("This file type needs manual profile entry; on-device reading supports PDF, DOCX, JPG and PNG");
}

export async function analyzeDocumentsOnDevice(documents: DocumentForAnalysis[], onProgress: ProgressCallback): Promise<LocalDocumentAnalysis> {
  const selected = documents.slice(0, MAX_DOCUMENTS);
  const profile: StudentProfile = {};
  const evidenceNotes: string[] = [];
  const analyzedIds: string[] = [];
  const warnings: string[] = [];
  let workerPromise: Promise<OcrWorker> | null = null;
  const getWorker = () => workerPromise ??= getOcrWorker(onProgress);

  try {
    for (let index = 0; index < selected.length; index += 1) {
      const documentItem = selected[index];
      onProgress(`Reading ${documentItem.filename} (${index + 1} of ${selected.length})`);
      try {
        const response = await fetch(`/api/documents/download?id=${encodeURIComponent(documentItem.id)}`);
        if (!response.ok) throw new Error("The document could not be opened securely");
        const text = await extractDocumentText(documentItem, await response.blob(), getWorker, onProgress);
        const facts = extractSupportedFacts(text);
        mergeFacts(profile, facts.profile);
        evidenceNotes.push(...facts.evidenceNotes.map((note) => `${documentItem.filename}: ${note}`));
        analyzedIds.push(documentItem.id);
      } catch (error) {
        warnings.push(`${documentItem.filename}: ${error instanceof Error ? error.message : "could not be read"}`);
      }
    }
  } finally {
    if (workerPromise) await (await workerPromise).terminate();
  }

  onProgress("Creating your evidence-led shortlist");
  return { profile, evidenceNotes, analyzedIds, warnings };
}

