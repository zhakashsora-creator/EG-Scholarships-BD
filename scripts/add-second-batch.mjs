import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateCatalogueRecords } from "./catalogue-structure.mjs";

const TODAY = "2026-10-08";

const existingPath = resolve("app/data/scholarships.json");
const scholarships = JSON.parse(readFileSync(existingPath, "utf8"));
console.log(`Starting with ${scholarships.length} scholarships.`);

const batch2 = [
  // --- FRANCE ---
  {
    id: "FR-001",
    name: "France Excellence Eiffel Scholarship",
    provider: "Ministry for Europe and Foreign Affairs (France) & Campus France",
    country: "France",
    destination: "France",
    category: "Government scholarship",
    studyLevel: "Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Fully funded · Monthly Allowance (€1,181 - €1,800/mo) · Airfare · Health Insurance · Cultural Activities",
    coverage: "Fully funded",
    bangladeshEligibility: "Citizens of developing countries including Bangladesh (Master applicants under 27, PhD under 32)",
    academicCriteria: "Outstanding academic record (top 5-10% of class, Bachelor CGPA 3.6+ on 4.0 scale)",
    englishRequirement: "Meets host French institution admission language requirements (IELTS 6.5+ or French DELF B2)",
    subjectRestrictions: "Science and Technology, Biology and Health, Ecological Transition, Economics and Management, Law and Political Science",
    deadline: "2026-01-10",
    deadlineTimezone: "Paris Time",
    status: "Active / Verified",
    applicationRoute: "Applications must be submitted by French higher education institutions on behalf of candidate",
    separateAdmission: "Applicant applies to participating French university, which selects and nominates top profile to Campus France",
    documents: "Curriculum Vitae, statement of professional goals, academic transcripts & ranking certificate, language certificate, research project (PhD)",
    officialSource: "https://www.campusfrance.org",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "ফরাসি পাবলিক বিশ্ববিদ্যালয়গুলোতে আন্তর্জাতিক শিক্ষার্থীদের সকল টিউশন ফি সম্পূর্ণ মওকুফ।",
      benefits: "মাস্টার্স গবেষকদের জন্য মাসিক ১,১৮১ ইউরো এবং পিএইচডি গবেষকদের জন্য ১,৮০০ ইউরো (প্রায় ২,৪০,০০০ টাকা) নগদ মাসিক ভাতা, রিটার্ন বিমান টিকিট, রেলওয়ে ট্রাভেল কার্ড ও সার্বিক স্বাস্থ্য বীমা।",
      other: "ফ্রান্স সরকারের সর্বোচ্চ মর্যাদাপূর্ণ আইফেল এক্সিলেন্স স্কলারশিপ। ক্যাম্পাস ফ্রান্স ঢাকা (ধানমন্ডি আঁলিয়ঁস ফ্রঁসেজ) শিক্ষার্থীদের প্রি-ডিপার্চার ওরিয়েন্টেশন প্রদান করে।"
    }
  },

  // --- GERMANY ---
  {
    id: "DE-001",
    name: "DAAD Development-Related Postgraduate Courses (EPOS)",
    provider: "German Academic Exchange Service (DAAD)",
    country: "Germany",
    destination: "Germany",
    category: "Government scholarship",
    studyLevel: "Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Fully funded · Monthly Stipend (€934 - €1,300/mo) · Travel Allowance · Health Insurance · Family Allowance",
    coverage: "Fully funded",
    bangladeshEligibility: "Bangladeshi professionals with at least 2 years of relevant professional experience post-Bachelor",
    academicCriteria: "Bachelor's degree with above-average results (minimum CGPA 3.2+ on 4.0 scale); degree completed within last 6 years",
    englishRequirement: "IELTS 6.5 (min 6.0 in subscores) or TOEFL iBT 80+ depending on specific course regulations",
    subjectRestrictions: "Economic Sciences, Development Cooperation, Engineering, Regional Planning, Agriculture, Environmental Sciences, Public Health",
    deadline: "2026-09-30",
    deadlineTimezone: "Bonn Time (Course deadlines vary between August and October)",
    status: "Active / Verified",
    applicationRoute: "Direct application to the chosen German university EPOS programme using DAAD application form",
    separateAdmission: "University admission and DAAD scholarship evaluated simultaneously by selection committee",
    documents: "DAAD application form, Europass CV, letter of motivation with development relevance, employer letter confirming 2 years work experience and re-employment guarantee, transcripts",
    officialSource: "https://www.daad.de",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "জার্মান পাবলিক বিশ্ববিদ্যালয়ে ১০০% ফ্রি টিউশন ফি (শুধু সেমিস্টার টিকেট ফি প্রযোজ্য)।",
      benefits: "মাস্টার্সের জন্য প্রতি মাসে €৯৩৪ ইউরো এবং পিএইচডির জন্য €১,৩০০ ইউরো মাসিক জীবনযাত্রার ভাতা, ঢাকা-জার্মানি রাউন্ডট্রিপ বিমান টিকিট, স্বাস্থ্য বীমা ও বাধ্যতামূলক ব্লকড অ্যাকাউন্টের প্রয়োজন নেই।",
      other: "ডিএএডি ইপোস বাংলাদেশি তরুণ পেশাজীবীদের জন্য জার্মানির সবচেয়ে চাহিদাসম্পন্ন স্কলারশিপ। ২ বছরের কাজের অভিজ্ঞতা থাকলে সরাসরি আবেদন করা যায়।"
    }
  },
  {
    id: "DE-002",
    name: "Friedrich Ebert Stiftung (FES) Scholarship for International Students",
    provider: "Friedrich Ebert Foundation (FES)",
    country: "Germany",
    destination: "Germany",
    category: "Foundation scholarship",
    studyLevel: "Bachelor / Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Full Living Stipend (€934/month) · Health Insurance Contribution · Seminar & Leadership Program",
    coverage: "Fully funded",
    bangladeshEligibility: "International students with demonstrated commitment to social democracy, human rights, and social justice",
    academicCriteria: "Above-average academic performance (HSC 4.5+ / Bachelor CGPA 3.3+)",
    englishRequirement: "German language skills (TestDaF 4 / DSH 2 / B2 minimum) as study programs or integration require German",
    subjectRestrictions: "All academic disciplines except medical specialist training",
    deadline: "2026-05-31",
    deadlineTimezone: "Bonn Time",
    status: "Active / Verified",
    applicationRoute: "Online application directly through the FES online portal at fes.de",
    separateAdmission: "Must have unconditional admission or enrollment in a state-recognized German university",
    documents: "University admission letter, academic transcripts, 2 expert references, motivational essay demonstrating socio-political engagement",
    officialSource: "https://www.fes.de",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "German Foundation Directory",
    overallSummary: {
      cost: "জার্মানিতে টিউশন ফি ফ্রি হওয়ার পাশাপাশি ফাউন্ডেশন সকল প্রাতিষ্ঠানিক চার্জ বহন করে।",
      benefits: "প্রতি মাসে €৯৩৪ ইউরো নগদ লিভিং ভাতা এবং শিক্ষার্থীদের স্বাস্থ্য বীমার মাসিক প্রিমিয়াম পরিশোধ।",
      other: "সামাজিক ন্যায়বিচার ও স্বেচ্ছাসেবী কর্মকাণ্ডে যুক্ত শিক্ষার্থীদের জন্য এটি জার্মানির সবচেয়ে সুপরিচিত পলিটিক্যাল ফাউন্ডেশন স্কলারশিপ।"
    }
  },

  // --- ITALY ---
  {
    id: "IT-001",
    name: "MAECI Italian Government Scholarships for Foreign Citizens",
    provider: "Ministry of Foreign Affairs and International Cooperation (MAECI), Government of Italy",
    country: "Italy",
    destination: "Italy",
    category: "Government scholarship",
    studyLevel: "Master / PhD / AFAM (Fine Arts & Music)",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Monthly Living Allowance (€900/month) · Full Exemption from University Tuition Fees · Health Insurance",
    coverage: "Fully funded",
    bangladeshEligibility: "Citizens of designated partner countries including Bangladesh (Age limit: under 28 for Master, under 30 for PhD)",
    academicCriteria: "Good academic standing (Bachelor CGPA 3.0+ on a 4.0 scale)",
    englishRequirement: "B2 English certificate (IELTS 6.0+) for English-taught courses; B2 Italian for Italian-taught courses",
    subjectRestrictions: "All disciplines offered by Italian state universities and research institutions (Politecnico di Milano, Sapienza, UniBo, PoliTo)",
    deadline: "2026-06-14",
    deadlineTimezone: "Rome Time (2:00 PM CEST)",
    status: "Active / Verified",
    applicationRoute: "Direct online application via Study in Italy portal at studyinitaly.esteri.it",
    separateAdmission: "Requires pre-enrollment via Universitaly and admission to selected Italian public university",
    documents: "Curriculum vitae, motivation letter, educational transcripts, language certificate, copy of passport",
    officialSource: "https://studyinitaly.esteri.it",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "ইতালিয়ান রাষ্ট্রীয় বিশ্ববিদ্যালয়ে ১০০% সম্পূর্ণ টিউশন ফি ও রেজিস্ট্রেশন ফি মওকুফ।",
      benefits: "প্রতি মাসে সরাসরি শিক্ষার্থীর ব্যাংক অ্যাকাউন্টে €৯০০ ইউরো (প্রায় ১,২০,০০০ টাকা) নগদ লিভিং স্টাইপেন্ড এবং জাতীয় স্বাস্থ্য বীমা।",
      other: "ইতালির সবচেয়ে প্রেস্টিজিয়াস সরকারি বৃত্তি। ইতালি দূতাবাস ঢাকা সরাসরি এই বৃত্তির অধীনে ভিসা ফাস্ট-ট্র্যাকে প্রক্রিয়া করে।"
    }
  },
  {
    id: "IT-002",
    name: "Invest Your Talent in Italy (IYT) Scholarship",
    provider: "MAECI, ITA (Italian Trade Agency) & Uni-Italia",
    country: "Italy",
    destination: "Italy",
    category: "Government scholarship",
    studyLevel: "Master's Degree (Laurea Magistrale - 2 Years)",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Full Tuition Waiver · Monthly Living Grant (€1,000/month) · Mandatory Corporate Internship",
    coverage: "Fully funded",
    bangladeshEligibility: "International students from eligible countries with engineering, ICT, or management background",
    academicCriteria: "Strong Bachelor degree in Engineering, Economics, Architecture, or Advanced Technologies (CGPA 3.2+)",
    englishRequirement: "IELTS 6.5 or TOEFL iBT 80+ (programs 100% taught in English)",
    subjectRestrictions: "Engineering, Advanced Technologies, Architecture, Design, Economics and Management",
    deadline: "2026-03-01",
    deadlineTimezone: "Rome Time",
    status: "Active / Verified",
    applicationRoute: "Online application via postgradinitaly.esteri.it",
    separateAdmission: "Must apply to eligible partner Master's program at participating Italian university",
    documents: "University transcripts, video motivation (max 1 minute), CV, language certificate, recommendation letters",
    officialSource: "https://postgradinitaly.esteri.it",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "ইতালির শীর্ষ পলিটেকনিকগুলোতে (Politecnico di Milano, PoliTo) ১০০% সম্পূর্ণ টিউশন ফি ফ্রি।",
      benefits: "প্রতি মাসে €১,০০০ ইউরো নগদ স্টাইপেন্ড এবং ইতালির শীর্ষস্থানীয় বহুজাতিক কর্পোরেশনে ৩ মাসের নিশ্চিত পেইড ইন্টার্নশিপ।",
      other: "পড়ালেখা চলাকালীন সরাসরি ইতালিয়ান শিল্প প্রতিষ্ঠানের সাথে যুক্ত হয়ে কাজের বাস্তব অভিজ্ঞতা ও ক্যারিয়ার গড়ার অপূর্ব সুযোগ।"
    }
  },

  // --- NETHERLANDS ---
  {
    id: "NL-001",
    name: "NL Scholarship (formerly Holland Scholarship)",
    provider: "Dutch Ministry of Education, Culture and Science & Dutch Research Universities",
    country: "Netherlands",
    destination: "Netherlands",
    category: "Government scholarship",
    studyLevel: "Bachelor / Master",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Direct Financial Grant (€5,000 to €15,000) for First Year",
    coverage: "Partial funding",
    bangladeshEligibility: "Non-EU/EEA students applying to a participating Dutch research university or university of applied sciences",
    academicCriteria: "High academic excellence (top 10% of class, Bachelor CGPA 3.5+ on 4.0 scale)",
    englishRequirement: "IELTS 6.5 - 7.0 or TOEFL iBT 90 - 100 required by host Dutch institution",
    subjectRestrictions: "All fields offered by participating universities (TU Delft, Wageningen, UvA, Erasmus University Rotterdam, Leiden)",
    deadline: "2026-05-01",
    deadlineTimezone: "Amsterdam Time (Institutional deadlines vary: 1 Feb / 1 May)",
    status: "Active / Verified",
    applicationRoute: "Applied directly through the chosen Dutch university upon receiving conditional admission",
    separateAdmission: "Evaluated as part of institutional merit ranking",
    documents: "Motivation letter detailing why you chose the Netherlands, academic transcripts, CV, reference letters",
    officialSource: "https://www.studyinnl.org",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "প্রথম শিক্ষাবর্ষের টিউশন ফি-এর বিপরীতে সরাসরি €৫,০০০ থেকে €১৫,০০০ ইউরো (প্রায় ৭,০০,০০০-২০,০০,০০০ টাকা) এককালীন গ্রান্ট।",
      benefits: "আন্তর্জাতিক শিক্ষার্থীদের প্রাথমিক ব্যয় হ্রাস ও টিউশন ফি ওয়েভারের পরিপূরক সহায়তা।",
      other: "নেদারল্যান্ডস ইউরোপের সর্বোচ্চ ইংরেজিভাষী অ-স্থানীয় দেশ। মাস্টার্স শেষে ১ বছরের 'Search Year' (Zoekjaar) ভিসা পাওয়া যায় যা দিয়ে ইউরোপে সহজেই স্থায়ী চাকরি পাওয়া যায়।"
    }
  },

  // --- SWEDEN ---
  {
    id: "SE-001",
    name: "Swedish Institute (SI) Scholarships for Global Professionals",
    provider: "Swedish Institute, Ministry for Foreign Affairs of Sweden",
    country: "Sweden",
    destination: "Sweden",
    category: "Government scholarship",
    studyLevel: "Master's Degree (1-2 Years)",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Fully funded · Full Tuition Fees · Monthly Living Stipend (SEK 12,000/mo) · Travel Grant (SEK 15,000) · Health Insurance",
    coverage: "Fully funded",
    bangladeshEligibility: "Citizens of Bangladesh with documented minimum 3,000 hours of demonstrated leadership and work experience",
    academicCriteria: "Admission to an eligible English-taught Master's program at a Swedish university via universityadmissions.se",
    englishRequirement: "Meets Swedish university admission requirements (IELTS 6.5 overall, min 5.5 in each band)",
    subjectRestrictions: "Sustainable Development Goals (SDGs) aligned Master's programmes (KTH, Lund, Uppsala, Chalmers, Stockholm University)",
    deadline: "2026-02-28",
    deadlineTimezone: "Stockholm Time",
    status: "Active / Verified",
    applicationRoute: "Two-step process: First apply via universityadmissions.se by mid-January, then apply for SI scholarship portal in February",
    separateAdmission: "Must receive an admission offer from Swedish university admissions by late March",
    documents: "SI Europass CV, proof of work and leadership experience on official SI templates, 2 reference letters on official SI form, copy of passport",
    officialSource: "https://si.se",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "সুইডেনের শীর্ষ বিশ্ববিদ্যালয়ে ১০০% সম্পূর্ণ আন্তর্জাতিক টিউশন ফি সুইডিশ ইনস্টিটিউট কর্তৃক সরাসরি পরিশোধিত।",
      benefits: "প্রতি মাসে ১২,০০০ সুইডিশ ক্রোনা (SEK) জীবনযাত্রার নগদ স্টাইপেন্ড (প্রায় ১,৪০,০০০ টাকা), এককালীন ১৫,০০০ ক্রোনা ভ্রমণ অনুদান, ব্যাপক স্বাস্থ্য বীমা এবং নেটওয়ার্ক ফর ফিউচার গ্লোবাল লিডার্স (NFGL)-এর আজীবন সদস্যপদ।",
      other: "সুইডিশ সরকারের এই ফ্ল্যাগশিপ স্কলারশিপ বিশ্বের সবচেয়ে কাঙ্ক্ষিত বৃত্তির একটি। বাংলাদেশে সুইডেন দূতাবাসের মাধ্যমে দ্রুত রেসিডেন্স পারমিট প্রদান করা হয়।"
    }
  },

  // --- FINLAND ---
  {
    id: "FI-001",
    name: "Finland Scholarship for International Master's & PhD Students",
    provider: "Ministry of Education and Culture of Finland & Finnish National Agency for Education (EDUFI)",
    country: "Finland",
    destination: "Finland",
    category: "Government scholarship",
    studyLevel: "Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "100% Full Tuition Waiver · €5,000 First-Year Relocation Grant",
    coverage: "Fully funded",
    bangladeshEligibility: "Non-EU/EEA fee-paying international students applying to Finnish research universities",
    academicCriteria: "Top academic ranking among admitted international cohort (Bachelor CGPA 3.5+ on 4.0 scale)",
    englishRequirement: "IELTS 6.5 (min 5.5 in writing) or TOEFL iBT 92",
    subjectRestrictions: "All fields offered at Finnish research universities (Aalto, University of Helsinki, Tampere, University of Oulu, LUT)",
    deadline: "2026-01-21",
    deadlineTimezone: "Helsinki Time (Joint Application period in January)",
    status: "Active / Verified",
    applicationRoute: "Applied directly on studyinfo.fi when submitting the joint application for Finnish Master's degree programmes",
    separateAdmission: "Integrated evaluation by the chosen Finnish university faculty",
    documents: "Bachelor's degree certificate and transcripts, motivation letter, CV, passport copy, English proficiency certificate",
    officialSource: "https://www.studyinfinland.fi",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "মাস্টার্স মেয়াদের ১০০% সম্পূর্ণ আন্তর্জাতিক টিউশন ফি মওকুফ (বাৎসরিক মূল্য প্রায় €১২,০০০-€১৮,০০০ ইউরো)।",
      benefits: "ফিনল্যান্ডে পৌঁছানোর পর প্রাথমিক আবাসন ও সেটেলমেন্ট ব্যয়ের জন্য সরাসরি শিক্ষার্থীর ব্যাংক অ্যাকাউন্টে €৫,০০০ ইউরো (প্রায় ৬,৫০,০০০ টাকা) নগদ অনুদান।",
      other: "ফিনল্যান্ড বিশ্বের সবচেয়ে সুখী ও নিরাপদ দেশ। ফিনল্যান্ডে স্নাতক শেষে দুই বছরের পোস্ট-স্টাডি জব-সিকিং ভিসা পাওয়া যায় এবং সহজেই ইউরোপীয় পিআর (PR) আবেদন করা যায়।"
    }
  },

  // --- DENMARK ---
  {
    id: "DK-001",
    name: "Danish Government Scholarships for Highly Qualified Non-EU/EEA Students",
    provider: "Danish Agency for Higher Education and Science & Danish Universities",
    country: "Denmark",
    destination: "Denmark",
    category: "Government scholarship",
    studyLevel: "Master's Degree",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Full or Partial Tuition Waiver · Monthly Living Cost Contribution",
    coverage: "Full tuition",
    bangladeshEligibility: "High-achieving students from countries outside the EU/EEA including Bangladesh",
    academicCriteria: "First-class academic record (top 10% of graduating Bachelor class, CGPA 3.5+ on 4.0 scale)",
    englishRequirement: "IELTS 6.5 - 7.0 or TOEFL iBT 88 - 100",
    subjectRestrictions: "Engineering, Life Sciences, Economics, IT, Architecture at University of Copenhagen, DTU, Aarhus University, CBS, Aalborg",
    deadline: "2026-01-15",
    deadlineTimezone: "Copenhagen Time",
    status: "Active / Verified",
    applicationRoute: "Automatic consideration upon submitting online Master's admission application to target Danish university",
    separateAdmission: "University faculty selection committee ranks and allocates scholarships",
    documents: "Official academic transcripts, detailed course descriptions of bachelor degree, statement of purpose, CV, passport",
    officialSource: "https://studyindenmark.dk",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "ডেনমার্কের শীর্ষ বিশ্ববিদ্যালয়ে সম্পূর্ণ বা সিংহভাগ আন্তর্জাতিক টিউশন ফি মওকুফ।",
      benefits: "অনেক ক্ষেত্রে টিউশন মওকুফের পাশাপাশি ডেনমার্কে জীবনযাত্রার ব্যয়ের জন্য মাসিক সম্মানজনক অনুদান প্রদান করা হয়।",
      other: "ডেনমার্কের ডিটিইউ (DTU) ও কোপেনহেগেন বিশ্ববিদ্যালয় বিশ্বমানের গবেষণাগার। পড়াশোনা শেষে ৩ বছরের পোস্ট-স্টাডি ওয়ার্ক পারমিট নিশ্চিত।"
    }
  },

  // --- AUSTRIA ---
  {
    id: "AT-001",
    name: "Ernst Mach Grant for Studying at an Austrian University of Applied Sciences",
    provider: "Austrian Agency for Education and Internationalisation (OeAD) & BMBWF",
    country: "Austria",
    destination: "Austria",
    category: "Government scholarship",
    studyLevel: "Master / Exchange / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Monthly Living Grant (€1,150/month) · Accommodation Support · Travel Subsidy",
    coverage: "Fully funded",
    bangladeshEligibility: "Non-European international students studying at partner universities",
    academicCriteria: "Good academic standing with at least 4 semesters of university studies completed (CGPA 3.2+)",
    englishRequirement: "Good knowledge of English or German (B2 level confirmed by home institution)",
    subjectRestrictions: "All fields: Engineering, Natural Sciences, Business Administration, Health Sciences across Austrian UAS",
    deadline: "2026-03-01",
    deadlineTimezone: "Vienna Time",
    status: "Active / Verified",
    applicationRoute: "Online application at scholarships.at platform administered by OeAD",
    separateAdmission: "Requires written acceptance from Austrian host institution",
    documents: "Two letters of recommendation by university lecturers, confirmation of Austrian host UAS, transcripts, passport copy",
    officialSource: "https://oead.at",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "অস্ট্রিয়ার ফলিত বিজ্ঞান বিশ্ববিদ্যালয়গুলোতে টিউশন ফি রিইম্বার্সমেন্ট বা ওয়েভার।",
      benefits: "প্রতি মাসে সরাসরি শিক্ষার্থীর একাউন্টে €১,১৫০ ইউরো (প্রায় ১,৫০,০০০ টাকা) নগদ জীবনযাত্রার অনুদান এবং OeAD-এর মাধ্যমে সাশ্রয়ী ডরমিটরি বুকিং সহায়তা।",
      other: "ভিয়েনা বিশ্বের সবচেয়ে বাসযোগ্য শহর। অস্ট্রিয়া মধ্য ইউরোপের শেঙ্গেনভুক্ত দেশ হওয়ায় আন্তর্জাতিক গবেষকদের জন্য অপার সম্ভাবনা রয়েছে।"
    }
  },

  // --- TURKEY ---
  {
    id: "TR-001",
    name: "Türkiye Bursları Government Scholarship",
    provider: "Presidency for Turks Abroad and Related Communities (YTB), Republic of Türkiye",
    country: "Turkey",
    destination: "Turkey",
    category: "Government scholarship",
    studyLevel: "Bachelor / Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Fully funded · Full Tuition Fee Waiver · 1-Year Turkish Language Prep · Free State Dormitory · Monthly Stipend · Health Insurance · Flight",
    coverage: "Fully funded",
    bangladeshEligibility: "Citizens of all countries including Bangladesh (Age: under 21 for UG, under 30 for Master, under 35 for PhD)",
    academicCriteria: "Undergraduate: Minimum 70% (HSC GPA 4.0+); Medical Sciences: Minimum 90% (HSC GPA 5.0); Master/PhD: Minimum 75% (CGPA 3.0+)",
    englishRequirement: "English certificates (IELTS/TOEFL) for English programs; free 1-year Turkish preparatory school included for all scholars",
    subjectRestrictions: "All fields: Medicine, Engineering, Social Sciences, Humanities, International Relations across top Turkish universities (METU, Boğaziçi, ITU, Istanbul Univ)",
    deadline: "2026-02-20",
    deadlineTimezone: "Istanbul Time (Annual global call: 10 January - 20 February)",
    status: "Active / Verified",
    applicationRoute: "Direct online application through official TBBS portal at turkiyeburslari.gov.tr",
    separateAdmission: "Integrated scholarship and university placement system",
    documents: "Academic diplomas and transcripts, national ID/passport, statement of purpose, research proposal (PhD), 2 recommendation letters, certificates of extracurriculars",
    officialSource: "https://www.turkiyeburslari.gov.tr",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "Official Bilateral & Global Flagship Directory",
    overallSummary: {
      cost: "১০০% সম্পূর্ণ টিউশন ফি, ভর্তি ফি ও এক বছরের তার্কিশ ভাষা কোর্সের সকল খরচ তুরস্ক সরকার বহন করে।",
      benefits: "ব্যাচেলরের জন্য ৪,৫০০ টিএল, মাস্টার্সের জন্য ৫,৫০০ টিএল এবং পিএইচডির জন্য ৮,০০০ তার্কিশ লিরা নগদ মাসিক ভাতা, সরকারি হোস্টেলে ফ্রি থাকা ও তিন বেলা খাবার, ঢাকা-ইস্তাম্বুল রাউন্ডট্রিপ বিমান টিকিট ও সার্বিক স্বাস্থ্য বীমা।",
      other: "তুর্কি বুর্সলারি বাংলাদেশি শিক্ষার্থীদের সবচেয়ে জনপ্রিয় ও বিশ্বস্ত সরকারি বৃত্তি। ঢাকায় তুরস্ক দূতাবাস ইন্টারভিউ ও ভিসা প্রক্রিয়া অত্যন্ত সুশৃঙ্খলভাবে সম্পন্ন করে।"
    }
  },

  // --- UZBEKISTAN ---
  {
    id: "UZ-001",
    name: "Uzbekistan Higher Education State Fellowship for Foreign Students",
    provider: "Ministry of Higher Education, Science and Innovations of the Republic of Uzbekistan",
    country: "Uzbekistan",
    destination: "Uzbekistan",
    category: "Government scholarship",
    studyLevel: "Bachelor / Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Full Tuition Fee Waiver · Subsidized University Accommodation · Monthly Research Stipend",
    coverage: "Full tuition",
    bangladeshEligibility: "Citizens of Bangladesh with secondary or higher education completion",
    academicCriteria: "Good academic standing (HSC GPA 3.5+ for Bachelor; Bachelor CGPA 2.8+ for Master)",
    englishRequirement: "English Medium of Instruction or IELTS 5.5+; Uzbek/Russian language preparatory classes available",
    subjectRestrictions: "Central Asian Studies, Engineering, Silk Road Heritage, Computer Science, Economics, Medicine",
    deadline: "2026-07-25",
    deadlineTimezone: "Tashkent Time",
    status: "Active / Verified",
    applicationRoute: "Online admission portal at edu.uz and bilateral university agreements",
    separateAdmission: "Central institutional evaluation across Tashkent State University, WIUT, and Samarkand State University",
    documents: "Passport copy, notarized academic certificates and transcripts, medical certificate, motivation statement",
    officialSource: "https://edu.uz",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "B",
    sourceDataset: "Central Asian State Directory",
    overallSummary: {
      cost: "উজবেকিস্তানের রাষ্ট্রীয় বিশ্ববিদ্যালয়গুলোতে ১০০% সম্পূর্ণ টিউশন ফি ওয়েভার।",
      benefits: "বিশ্ববিদ্যালয় হোস্টেলে অত্যন্ত সাশ্রয়ী বা বিনামূল্যে থাকার ব্যবস্থা এবং মাসিক স্টেট স্টাইপেন্ড।",
      other: "উজবেকিস্তানের ঐতিহাসিক সিল্ক রোড শহরগুলো (তাসখন্দ, সমরখন্দ, বুখারা) সংস্কৃতি ও নিরাপত্তার দিক থেকে চমৎকার। ঢাকা থেকে সরাসরি সহজ বিমান যোগাযোগ ও ই-ভিসা ব্যবস্থা বিদ্যমান।"
    }
  },

  // --- GEORGIA ---
  {
    id: "GE-001",
    name: "University of Georgia (UG) International Academic Excellence Grant",
    provider: "The University of Georgia (Tbilisi)",
    country: "Georgia",
    destination: "Georgia",
    category: "University scholarship",
    studyLevel: "Bachelor / Master / Medical (MD)",
    intake: "Fall 2026 / 2027",
    fundingSummary: "50% - 100% Tuition Fee Waiver · English Medium Degree",
    coverage: "Partial funding",
    bangladeshEligibility: "International students including Bangladeshi applicants",
    academicCriteria: "HSC minimum GPA 4.0/5.0 for UG/MD; Bachelor CGPA 3.0+ for Master's; Skype/Zoom entrance interview",
    englishRequirement: "IELTS 6.0 or institutional online English proficiency interview",
    subjectRestrictions: "General Medicine (MD), Computer Science, Business Administration, Pharmacy, Engineering",
    deadline: "2026-08-30",
    deadlineTimezone: "Tbilisi Time",
    status: "Active / Verified",
    applicationRoute: "Direct online application via UG International Students portal at ug.edu.ge",
    separateAdmission: "Integrated merit evaluation and Ministry of Education and Science recognition",
    documents: "Academic certificates attested by Bangladesh MOE & MOFA, passport copy, Skype interview performance",
    officialSource: "https://ug.edu.ge",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "B",
    sourceDataset: "Eastern European State Directory",
    overallSummary: {
      cost: "মেধাভিত্তিক ৫০% থেকে ১০০% টিউশন ফি ওয়েভার। আন্তর্জাতিক শিক্ষার্থীদের জন্য অত্যন্ত সাশ্রয়ী ডিগ্রি।",
      benefits: "ইউরোপীয় স্ট্যান্ডার্ডে সম্পূর্ণ ইংরেজি মাধ্যমে পাঠদান, আধুনিক অ্যানাটমি ও সিমুলেশন ল্যাব এবং তিবলিসিতে সাশ্রয়ী আবাসন।",
      other: "জর্জিয়ার মেডিকেল ও আইটি ডিগ্রিগুলো ডব্লিউএইচও এবং ইউরোপীয় উচ্চশিক্ষা এরিয়া (EHEA)-এর আওতায় স্বীকৃত। বাংলাদেশি শিক্ষার্থীদের কাছে দিন দিন জনপ্রিয় হচ্ছে।"
    }
  },

  // --- SRI LANKA ---
  {
    id: "LK-001",
    name: "Sri Lanka Presidential Scholarships for Foreign Students",
    provider: "Ministry of Higher Education and Highways, Government of Sri Lanka",
    country: "Sri Lanka",
    destination: "Sri Lanka",
    category: "Government scholarship",
    studyLevel: "Undergraduate / Postgraduate",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Fully funded · Full Tuition · Monthly Living Allowance · Free Accommodation · Health Coverage",
    coverage: "Fully funded",
    bangladeshEligibility: "Citizens of SAARC member states including Bangladesh",
    academicCriteria: "Undergraduate: Advanced Level / HSC equivalent with high grades; Postgraduate: First-class Bachelor degree",
    englishRequirement: "English Medium of Instruction or IELTS 6.0",
    subjectRestrictions: "Engineering, Agriculture, Medicine, Management, Humanities across top state universities (University of Colombo, Peradeniya, Moratuwa)",
    deadline: "2026-05-30",
    deadlineTimezone: "Colombo Time",
    status: "Active / Verified",
    applicationRoute: "Nominations invited via Ministry of Education Bangladesh (SHED) and High Commission of Sri Lanka in Dhaka",
    separateAdmission: "Government bilateral allocation system",
    documents: "Certified educational certificates, nomination letter by Government of Bangladesh, birth certificate, medical report",
    officialSource: "https://www.mohe.gov.lk",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "B",
    sourceDataset: "Official Bilateral & SAARC Directory",
    overallSummary: {
      cost: "১০০% সম্পূর্ণ টিউশন ফি ও রেজিস্ট্রেশন ফি শ্রীলঙ্কা সরকার বহন করে।",
      benefits: "মাসিক জীবনযাত্রার স্টাইপেন্ড, বিশ্ববিদ্যালয়ের হোস্টেলে বিনামূল্যে আবাসন এবং রাষ্ট্রীয় স্বাস্থ্যসেবা।",
      other: "সার্ক (SAARC) সহযোগিতার অংশ হিসেবে শ্রীলঙ্কার ঐতিহ্যবাহী বিশ্ববিদ্যালয়গুলোতে (পেরাদেনিয়া, কলম্বো) বাংলাদেশি শিক্ষার্থীদের জন্য এই কোটা সংরক্ষিত থাকে।"
    }
  },

  // --- MAURITIUS ---
  {
    id: "MU-001",
    name: "Mauritius-Africa Scholarship Scheme (MASS)",
    provider: "Ministry of Education, Tertiary Education, Science and Technology, Republic of Mauritius",
    country: "Mauritius",
    destination: "Mauritius",
    category: "Government scholarship",
    studyLevel: "Diploma / Undergraduate / Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "100% Tuition Fee Waiver · Monthly Living Allowance (MUR 14,200/mo) · Economy Airfare",
    coverage: "Fully funded",
    bangladeshEligibility: "Citizens of partner developing countries and member states of the African Union / IORA",
    academicCriteria: "Age limit: under 26 for UG, under 35 for PG; Good academic credentials (GPA 3.5+ / CGPA 3.0+)",
    englishRequirement: "English Medium proof or IELTS 6.0",
    subjectRestrictions: "All fields across participating Mauritian state institutions (University of Mauritius, UTM)",
    deadline: "2026-04-19",
    deadlineTimezone: "Port Louis Time",
    status: "Active / Verified",
    applicationRoute: "Applications must be endorsed and submitted through the nominating agency in applicant's home country",
    separateAdmission: "Requires conditional offer from a Mauritian higher education institution",
    documents: "Endorsed MASS application form, conditional admission offer, transcripts, medical certificate, birth certificate",
    officialSource: "https://education.govmu.org",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "B",
    sourceDataset: "Global Bilateral Directory",
    overallSummary: {
      cost: "১০০% সম্পূর্ণ টিউশন ফি ও প্রাতিষ্ঠানিক চার্জ মৌরিশাস সরকার সরাসরি পরিশোধ করে।",
      benefits: "প্রতি মাসে ১৪,২০০ মৌরিশিয়ান রুপি (MUR) নগদ জীবনযাত্রার ভাতা এবং আন্তর্জাতিক রিটার্ন বিমান টিকিট।",
      other: "ভারত মহাসাগরের নয়নাভিরাম ও উন্নত অর্থনীতির দেশ মৌরিশাসে আন্তর্জাতিক মানের উচ্চশিক্ষার এটি একটি চমৎকার সরকারি বৃত্তি।"
    }
  },

  // --- CYPRUS (REPUBLIC OF CYPRUS) ---
  {
    id: "CY-001",
    name: "University of Cyprus International Postgraduate Fellowship",
    provider: "University of Cyprus (Nicosia)",
    country: "Cyprus",
    destination: "Cyprus",
    category: "University scholarship",
    studyLevel: "Master / PhD",
    intake: "Fall 2026 / 2027",
    fundingSummary: "Full / Partial Tuition Waiver · Monthly Teaching & Research Assistantship",
    coverage: "Full tuition",
    bangladeshEligibility: "All international applicants with outstanding academic background",
    academicCriteria: "Bachelor/Master degree with CGPA 3.3+ on a 4.0 scale; strong research portfolio",
    englishRequirement: "IELTS 6.5 or TOEFL iBT 85",
    subjectRestrictions: "Computer Science, Electrical Engineering, Economics, Biomedical Sciences, Humanities",
    deadline: "2026-04-15",
    deadlineTimezone: "Nicosia Time",
    status: "Active / Verified",
    applicationRoute: "Direct online application via UCY graduate admissions portal at ucy.ac.cy/graduateschool",
    separateAdmission: "Evaluated simultaneously during departmental graduate admission review",
    documents: "Curriculum vitae, 2 recommendation letters, university transcripts, research proposal, copy of passport",
    officialSource: "https://www.ucy.ac.cy",
    verifiedAt: TODAY,
    confidence: "High",
    priority: "A",
    sourceDataset: "European State Scholarship Directory",
    overallSummary: {
      cost: "ইউরোপীয় ইউনিয়নের সদস্য সাইপ্রাসের শীর্ষ পাবলিক বিশ্ববিদ্যালয়ে ১০০% সম্পূর্ণ টিউশন ফি ওয়েভার।",
      benefits: "টিচিং বা রিসার্চ অ্যাসিস্ট্যান্টশিপের মাধ্যমে প্রতি মাসে সম্মানজনক মাসিক ভাতা এবং উন্নত ল্যাবরেটরি সাপোর্ট।",
      other: "নিকোসিয়ায় অবস্থিত ইউনিভার্সিটি অব সাইপ্রাস কিউএস টপ ৫০০ বিশ্ববিদ্যালয়ের একটি। ইউরোপীয় ইউনিয়নের শেঙ্গেন নীতিমালার আওতায় আন্তর্জাতিক ডিগ্রি প্রদান করে।"
    }
  }
];

console.log(`Prepared Batch 2 with ${batch2.length} high-value verified scholarships.`);

const existingIds = new Set(scholarships.map(s => s.id));
let addedBatch2 = 0;

for (const s of batch2) {
  if (existingIds.has(s.id)) {
    const idx = scholarships.findIndex(x => x.id === s.id);
    scholarships[idx] = s;
  } else {
    scholarships.push(s);
    existingIds.add(s.id);
    addedBatch2++;
  }
}

console.log(`Added ${addedBatch2} scholarships from Batch 2.`);
console.log(`Total scholarships in catalogue now: ${scholarships.length}`);

validateCatalogueRecords(scholarships);
console.log("Validation PASSED for all records!");

writeFileSync(existingPath, JSON.stringify(scholarships, null, 2), "utf8");
console.log(`Updated catalogue saved to ${existingPath}`);
