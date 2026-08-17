import { env } from "cloudflare:workers";

type GeminiRuntime = {
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

export type GeminiCandidate = {
  content?: { parts?: Array<{ text?: string }> };
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  };
  urlContextMetadata?: {
    urlMetadata?: Array<{ retrievedUrl?: string; urlRetrievalStatus?: string }>;
  };
};

export type GeminiResponse = { candidates?: GeminiCandidate[] };

function localValue(key: keyof GeminiRuntime) {
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

function parsePool(value?: string) {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // Newline- or comma-separated values are accepted for local development.
  }
  return value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function runtimeConfig() {
  const runtime = env as unknown as GeminiRuntime;
  const pooled = parsePool(runtime.GEMINI_API_KEYS ?? localValue("GEMINI_API_KEYS"));
  const legacy = runtime.GEMINI_API_KEY ?? localValue("GEMINI_API_KEY");
  const keys = Array.from(new Set([...pooled, ...(legacy?.trim() ? [legacy.trim()] : [])]));
  return {
    keys,
    model: runtime.GEMINI_MODEL ?? localValue("GEMINI_MODEL") ?? "gemini-3.5-flash",
  };
}

export function isGeminiConfigured() {
  return runtimeConfig().keys.length > 0;
}

export function getGeminiModel() {
  return runtimeConfig().model;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function rotated<T>(values: T[]) {
  if (values.length < 2) return values;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const start = bytes[0] % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

/**
 * Calls Gemini with a bounded secret pool. Only transient quota, timeout and
 * service responses move to another key; invalid requests and permissions do
 * not churn through credentials. API key values are never included in errors.
 */
export async function geminiGenerateContent(body: unknown, timeoutMs = 20_000): Promise<GeminiResponse> {
  const { keys, model } = runtimeConfig();
  if (!keys.length) throw new Error("Gemini is not configured");

  const candidates = rotated(keys);
  let finalStatus = 503;
  for (let attempt = 0; attempt < candidates.length; attempt += 1) {
    const key = candidates[attempt];
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      finalStatus = response.status;
      if (response.ok) return await response.json() as GeminiResponse;

      const transient = response.status === 408 || response.status === 429 || response.status === 503;
      if (!transient) throw new Error(`Gemini request was rejected (${response.status})`);
      if (attempt < candidates.length - 1) {
        const jitter = Math.floor(Math.random() * 120);
        await delay(Math.min(1_200, 250 * (2 ** attempt)) + jitter);
      }
    } catch (error) {
      if (error instanceof Error && /rejected/.test(error.message)) throw error;
      finalStatus = 408;
      if (attempt < candidates.length - 1) await delay(250 + Math.floor(Math.random() * 120));
    }
  }
  throw new Error(`Gemini key pool is temporarily unavailable (${finalStatus})`);
}

export function geminiText(payload: GeminiResponse) {
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

export function extractGeminiJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const candidate = fenced ?? (first >= 0 && last > first ? text.slice(first, last + 1) : text);
  return JSON.parse(candidate) as T;
}
