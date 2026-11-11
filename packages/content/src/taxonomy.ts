/**
 * Mastermoshai curriculum taxonomy: every segment a Bangladeshi student can be in,
 * from pre-primary to job/MBA prep. Codes are stable keys shared with
 * @mastermoshai/core (TeacherProfile.levels, RoutineSlot.level) and the content tree.
 *
 * Shape: Segment > Track (a "level" a teacher can teach / a student belongs to)
 * Each Track lists the subject codes it uses and, where relevant, the
 * stream (group) split. Subjects are defined once in SUBJECTS.
 */

export type Stream = 'SCIENCE' | 'BUSINESS' | 'HUMANITIES';
export type Medium = 'BANGLA' | 'ENGLISH_VERSION' | 'ENGLISH_MEDIUM' | 'MADRASA';

export interface Track {
  code: string;
  nameBn: string;
  nameEn: string;
  /** Subject codes taught at this track. Stream-specific lists go in streams. */
  subjects: string[];
  streams?: Partial<Record<Stream, string[]>>;
  /** Exam the track prepares for, if any (shown on exam builder presets). */
  targetExam?: string;
  /** Coaching-market batch formats commonly sold for this track. */
  batchTypes?: string[];
}

export interface Segment {
  code: string;
  nameBn: string;
  nameEn: string;
  ageHint: string;
  tracks: Track[];
}

export const SUBJECTS: Record<string, { bn: string; en: string }> = {
  // early years / primary
  BANGLA: { bn: 'বাংলা', en: 'Bangla' },
  BANGLA_1: { bn: 'বাংলা ১ম পত্র', en: 'Bangla 1st Paper' },
  BANGLA_2: { bn: 'বাংলা ২য় পত্র', en: 'Bangla 2nd Paper' },
  ENGLISH: { bn: 'ইংরেজি', en: 'English' },
  ENGLISH_1: { bn: 'ইংরেজি ১ম পত্র', en: 'English 1st Paper' },
  ENGLISH_2: { bn: 'ইংরেজি ২য় পত্র', en: 'English 2nd Paper' },
  MATH: { bn: 'গণিত', en: 'Mathematics' },
  HIGHER_MATH: { bn: 'উচ্চতর গণিত', en: 'Higher Mathematics' },
  SCIENCE: { bn: 'বিজ্ঞান', en: 'Science' },
  BGS: { bn: 'বাংলাদেশ ও বিশ্বপরিচয়', en: 'Bangladesh & Global Studies' },
  RELIGION: { bn: 'ধর্ম ও নৈতিক শিক্ষা', en: 'Religion & Moral Education' },
  ICT: { bn: 'তথ্য ও যোগাযোগ প্রযুক্তি', en: 'ICT' },
  AGRICULTURE: { bn: 'কৃষিশিক্ষা', en: 'Agriculture Studies' },
  HOME_SCIENCE: { bn: 'গার্হস্থ্য বিজ্ঞান', en: 'Home Science' },
  RHYMES: { bn: 'ছড়া ও কবিতা', en: 'Rhymes' },
  ALPHABET_BN: { bn: 'বর্ণমালা (বাংলা)', en: 'Bangla Alphabet' },
  ALPHABET_EN: { bn: 'বর্ণমালা (ইংরেজি)', en: 'English Alphabet' },
  NUMBERS: { bn: 'সংখ্যা ও গণনা', en: 'Numbers' },
  DRAWING: { bn: 'ছবি আঁকা', en: 'Drawing' },
  GENERAL_KNOWLEDGE: { bn: 'সাধারণ জ্ঞান', en: 'General Knowledge' },
  // science stream
  PHYSICS: { bn: 'পদার্থবিজ্ঞান', en: 'Physics' },
  PHYSICS_1: { bn: 'পদার্থবিজ্ঞান ১ম পত্র', en: 'Physics 1st Paper' },
  PHYSICS_2: { bn: 'পদার্থবিজ্ঞান ২য় পত্র', en: 'Physics 2nd Paper' },
  CHEMISTRY: { bn: 'রসায়ন', en: 'Chemistry' },
  CHEMISTRY_1: { bn: 'রসায়ন ১ম পত্র', en: 'Chemistry 1st Paper' },
  CHEMISTRY_2: { bn: 'রসায়ন ২য় পত্র', en: 'Chemistry 2nd Paper' },
  BIOLOGY: { bn: 'জীববিজ্ঞান', en: 'Biology' },
  BIOLOGY_1: { bn: 'জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)', en: 'Biology 1st Paper (Botany)' },
  BIOLOGY_2: { bn: 'জীববিজ্ঞান ২য় পত্র (প্রাণিবিজ্ঞান)', en: 'Biology 2nd Paper (Zoology)' },
  HIGHER_MATH_1: { bn: 'উচ্চতর গণিত ১ম পত্র', en: 'Higher Math 1st Paper' },
  HIGHER_MATH_2: { bn: 'উচ্চতর গণিত ২য় পত্র', en: 'Higher Math 2nd Paper' },
  // business stream
  ACCOUNTING: { bn: 'হিসাববিজ্ঞান', en: 'Accounting' },
  FINANCE_BANKING: { bn: 'ফিন্যান্স ও ব্যাংকিং', en: 'Finance & Banking' },
  BUSINESS_ENTREPRENEURSHIP: { bn: 'ব্যবসায় উদ্যোগ', en: 'Business Entrepreneurship' },
  BUSINESS_ORG_MGMT: { bn: 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', en: 'Business Organisation & Management' },
  PRODUCTION_MARKETING: { bn: 'উৎপাদন ব্যবস্থাপনা ও বিপণন', en: 'Production Management & Marketing' },
  // humanities stream
  ECONOMICS: { bn: 'অর্থনীতি', en: 'Economics' },
  CIVICS: { bn: 'পৌরনীতি ও নাগরিকতা', en: 'Civics & Citizenship' },
  HISTORY: { bn: 'ইতিহাস', en: 'History' },
  ISLAMIC_HISTORY: { bn: 'ইসলামের ইতিহাস ও সংস্কৃতি', en: 'Islamic History & Culture' },
  GEOGRAPHY: { bn: 'ভূগোল ও পরিবেশ', en: 'Geography & Environment' },
  SOCIOLOGY: { bn: 'সমাজবিজ্ঞান', en: 'Sociology' },
  LOGIC: { bn: 'যুক্তিবিদ্যা', en: 'Logic' },
  PSYCHOLOGY: { bn: 'মনোবিজ্ঞান', en: 'Psychology' },
  STATISTICS: { bn: 'পরিসংখ্যান', en: 'Statistics' },
  // admission / job / postgrad
  GENERAL_ABILITY: { bn: 'সাধারণ জ্ঞান ও মানসিক দক্ষতা', en: 'General Ability' },
  BD_AFFAIRS: { bn: 'বাংলাদেশ বিষয়াবলি', en: 'Bangladesh Affairs' },
  INTL_AFFAIRS: { bn: 'আন্তর্জাতিক বিষয়াবলি', en: 'International Affairs' },
  GEO_ENV_DISASTER: { bn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', en: 'Geography, Environment & Disaster Mgmt' },
  GENERAL_SCIENCE: { bn: 'সাধারণ বিজ্ঞান', en: 'General Science' },
  COMPUTER: { bn: 'কম্পিউটার ও তথ্যপ্রযুক্তি', en: 'Computer & IT' },
  MATH_REASONING: { bn: 'গাণিতিক যুক্তি', en: 'Mathematical Reasoning' },
  MENTAL_ABILITY: { bn: 'মানসিক দক্ষতা', en: 'Mental Ability' },
  ETHICS_GOOD_GOV: { bn: 'নৈতিকতা, মূল্যবোধ ও সুশাসন', en: 'Ethics, Values & Good Governance' },
  ENGLISH_LITERATURE: { bn: 'ইংরেজি সাহিত্য', en: 'English Literature' },
  BANGLA_LITERATURE: { bn: 'বাংলা সাহিত্য', en: 'Bangla Literature' },
  WRITTEN_BANGLA: { bn: 'লিখিত বাংলা', en: 'Written Bangla' },
  WRITTEN_ENGLISH: { bn: 'লিখিত ইংরেজি', en: 'Written English' },
  ANALYTICAL: { bn: 'অ্যানালিটিক্যাল এবিলিটি', en: 'Analytical Ability' },
  ECON_BANKING: { bn: 'অর্থনীতি ও ব্যাংকিং', en: 'Economics & Banking' },
  PEDAGOGY: { bn: 'শিক্ষণ পদ্ধতি', en: 'Pedagogy' },
  LAW: { bn: 'আইন', en: 'Law' },
  VIVA: { bn: 'ভাইভা প্রস্তুতি', en: 'Viva Preparation' },
  IELTS: { bn: 'IELTS', en: 'IELTS' },
  GRE_GMAT: { bn: 'GRE/GMAT', en: 'GRE/GMAT' },
  // English medium
  EM_MATH: { bn: 'Mathematics (EM)', en: 'Mathematics (O/A)' },
  EM_ADD_MATH: { bn: 'Additional Math', en: 'Additional Mathematics' },
  EM_PHYSICS: { bn: 'Physics (EM)', en: 'Physics (O/A)' },
  EM_CHEMISTRY: { bn: 'Chemistry (EM)', en: 'Chemistry (O/A)' },
  EM_BIOLOGY: { bn: 'Biology (EM)', en: 'Biology (O/A)' },
  EM_ENGLISH_LANG: { bn: 'English Language', en: 'English Language' },
  EM_ECONOMICS: { bn: 'Economics (EM)', en: 'Economics (O/A)' },
  EM_ACCOUNTING: { bn: 'Accounting (EM)', en: 'Accounting (O/A)' },
  EM_BUSINESS: { bn: 'Business Studies (EM)', en: 'Business Studies (O/A)' },
  EM_CS: { bn: 'Computer Science (EM)', en: 'Computer Science (O/A)' },
  // university course help (by discipline)
  UNI_CSE: { bn: 'CSE কোর্স', en: 'CSE courses' },
  UNI_EEE: { bn: 'EEE কোর্স', en: 'EEE courses' },
  UNI_CIVIL_ME: { bn: 'সিভিল/মেকানিক্যাল কোর্স', en: 'Civil / Mechanical courses' },
  UNI_MATH_STAT: { bn: 'গণিত ও পরিসংখ্যান (অনার্স)', en: 'Math & Statistics (Hons)' },
  UNI_PHY_CHEM: { bn: 'পদার্থ ও রসায়ন (অনার্স)', en: 'Physics & Chemistry (Hons)' },
  UNI_ACCOUNTING_FINANCE: { bn: 'অ্যাকাউন্টিং ও ফিন্যান্স (BBA)', en: 'Accounting & Finance (BBA)' },
  UNI_ECONOMICS: { bn: 'অর্থনীতি (অনার্স)', en: 'Economics (Hons)' },
  UNI_MEDICAL_BASIC: { bn: 'অ্যানাটমি/ফিজিওলজি/বায়োকেমিস্ট্রি', en: 'Anatomy / Physiology / Biochemistry' },
  UNI_PROGRAMMING: { bn: 'প্রোগ্রামিং', en: 'Programming (C/C++/Python/Java)' },
  UNI_ENGLISH: { bn: 'ইংরেজি (অনার্স)', en: 'English (Hons)' },
  UNI_LAW: { bn: 'আইন (LLB)', en: 'Law (LLB)' },
  // skills
  SPOKEN_ENGLISH: { bn: 'স্পোকেন ইংলিশ', en: 'Spoken English' },
  HANDWRITING: { bn: 'হাতের লেখা', en: 'Handwriting' },
  QURAN: { bn: 'কুরআন শিক্ষা', en: 'Quran' },
  ARABIC: { bn: 'আরবি', en: 'Arabic' },
};

const SSC_COMMON = ['BANGLA_1', 'BANGLA_2', 'ENGLISH_1', 'ENGLISH_2', 'MATH', 'ICT', 'BGS', 'RELIGION'];
const SSC_STREAMS: Track['streams'] = {
  SCIENCE: ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'HIGHER_MATH'],
  BUSINESS: ['ACCOUNTING', 'FINANCE_BANKING', 'BUSINESS_ENTREPRENEURSHIP', 'SCIENCE'],
  HUMANITIES: ['HISTORY', 'GEOGRAPHY', 'CIVICS', 'ECONOMICS', 'SCIENCE'],
};
const HSC_COMMON = ['BANGLA_1', 'BANGLA_2', 'ENGLISH_1', 'ENGLISH_2', 'ICT'];
const HSC_STREAMS: Track['streams'] = {
  SCIENCE: ['PHYSICS_1', 'PHYSICS_2', 'CHEMISTRY_1', 'CHEMISTRY_2', 'HIGHER_MATH_1', 'HIGHER_MATH_2', 'BIOLOGY_1', 'BIOLOGY_2'],
  BUSINESS: ['ACCOUNTING', 'FINANCE_BANKING', 'BUSINESS_ORG_MGMT', 'PRODUCTION_MARKETING', 'ECONOMICS', 'STATISTICS'],
  HUMANITIES: ['ECONOMICS', 'CIVICS', 'HISTORY', 'ISLAMIC_HISTORY', 'GEOGRAPHY', 'SOCIOLOGY', 'LOGIC', 'PSYCHOLOGY'],
};
const PRIMARY = ['BANGLA', 'ENGLISH', 'MATH', 'SCIENCE', 'BGS', 'RELIGION'];
const JUNIOR = ['BANGLA_1', 'BANGLA_2', 'ENGLISH_1', 'ENGLISH_2', 'MATH', 'SCIENCE', 'BGS', 'ICT', 'RELIGION', 'AGRICULTURE'];
const JOB_CORE = ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_ABILITY', 'BD_AFFAIRS', 'INTL_AFFAIRS', 'GENERAL_SCIENCE', 'COMPUTER'];

export const SEGMENTS: Segment[] = [
  {
    code: 'PRE_PRIMARY', nameBn: 'প্রাক-প্রাথমিক', nameEn: 'Pre-primary', ageHint: '৩–৫ বছর',
    tracks: [
      { code: 'PLAY', nameBn: 'প্লে গ্রুপ', nameEn: 'Play group', subjects: ['ALPHABET_BN', 'ALPHABET_EN', 'NUMBERS', 'RHYMES', 'DRAWING'] },
      { code: 'NURSERY', nameBn: 'নার্সারি', nameEn: 'Nursery', subjects: ['ALPHABET_BN', 'ALPHABET_EN', 'NUMBERS', 'RHYMES', 'DRAWING', 'HANDWRITING'] },
      { code: 'KG', nameBn: 'কেজি', nameEn: 'KG', subjects: ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_KNOWLEDGE', 'DRAWING', 'HANDWRITING'] },
    ],
  },
  {
    code: 'PRIMARY', nameBn: 'প্রাথমিক', nameEn: 'Primary', ageHint: '৬–১০ বছর',
    tracks: [
      { code: 'CLASS_1', nameBn: '১ম শ্রেণি', nameEn: 'Class 1', subjects: ['BANGLA', 'ENGLISH', 'MATH'] },
      { code: 'CLASS_2', nameBn: '২য় শ্রেণি', nameEn: 'Class 2', subjects: ['BANGLA', 'ENGLISH', 'MATH'] },
      { code: 'CLASS_3', nameBn: '৩য় শ্রেণি', nameEn: 'Class 3', subjects: PRIMARY },
      { code: 'CLASS_4', nameBn: '৪র্থ শ্রেণি', nameEn: 'Class 4', subjects: PRIMARY },
      { code: 'CLASS_5', nameBn: '৫ম শ্রেণি', nameEn: 'Class 5', subjects: PRIMARY, targetExam: 'PRIMARY_SCHOLARSHIP', batchTypes: ['ACADEMIC', 'SCHOLARSHIP_MODEL_TEST'] },
    ],
  },
  {
    code: 'JUNIOR', nameBn: 'নিম্ন মাধ্যমিক (৬–৮)', nameEn: 'Junior secondary (6–8)', ageHint: '১১–১৩ বছর',
    tracks: [
      { code: 'CLASS_6', nameBn: '৬ষ্ঠ শ্রেণি', nameEn: 'Class 6', subjects: JUNIOR, batchTypes: ['PIONEER', 'PROGRESSIVE', 'TRIAL'] },
      { code: 'CLASS_7', nameBn: '৭ম শ্রেণি', nameEn: 'Class 7', subjects: JUNIOR, batchTypes: ['PIONEER', 'PROGRESSIVE', 'TRIAL'] },
      { code: 'CLASS_8', nameBn: '৮ম শ্রেণি', nameEn: 'Class 8', subjects: JUNIOR, targetExam: 'JUNIOR_SCHOLARSHIP', batchTypes: ['PIONEER', 'PROGRESSIVE', 'SCHOLARSHIP_MODEL_TEST'] },
      { code: 'CADET_ADMISSION', nameBn: 'ক্যাডেট কলেজ ভর্তি', nameEn: 'Cadet college admission', subjects: ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_KNOWLEDGE'], targetExam: 'CADET_COLLEGE', batchTypes: ['FULL_COURSE', 'MODEL_TEST'] },
    ],
  },
  {
    code: 'SECONDARY', nameBn: 'মাধ্যমিক (৯–১০)', nameEn: 'Secondary (9–10)', ageHint: '১৪–১৬ বছর',
    tracks: [
      { code: 'CLASS_9', nameBn: '৯ম শ্রেণি', nameEn: 'Class 9', subjects: SSC_COMMON, streams: SSC_STREAMS, batchTypes: ['PIONEER', 'PROGRESSIVE', 'BANGLA_ENGLISH'] },
      { code: 'CLASS_10', nameBn: '১০ম শ্রেণি', nameEn: 'Class 10', subjects: SSC_COMMON, streams: SSC_STREAMS, batchTypes: ['PIONEER', 'PROGRESSIVE', 'BANGLA_ENGLISH'] },
      { code: 'SSC', nameBn: 'এসএসসি / দাখিল পরীক্ষার্থী', nameEn: 'SSC / Dakhil candidate', subjects: SSC_COMMON, streams: SSC_STREAMS, targetExam: 'SSC', batchTypes: ['FINAL_REVISION', 'MODEL_TEST', 'TEST_PAPER_SOLVE'] },
    ],
  },
  {
    code: 'HIGHER_SECONDARY', nameBn: 'উচ্চ মাধ্যমিক', nameEn: 'Higher secondary', ageHint: '১৬–১৮ বছর',
    tracks: [
      { code: 'HSC_1ST', nameBn: 'এইচএসসি ১ম বর্ষ', nameEn: 'HSC 1st year', subjects: HSC_COMMON, streams: HSC_STREAMS, batchTypes: ['PIONEER', 'PRIME', 'PROGRESSIVE', 'ICT', 'BANGLA_ENGLISH'] },
      { code: 'HSC_2ND', nameBn: 'এইচএসসি ২য় বর্ষ', nameEn: 'HSC 2nd year', subjects: HSC_COMMON, streams: HSC_STREAMS, batchTypes: ['PIONEER', 'PROGRESSIVE'] },
      { code: 'HSC', nameBn: 'এইচএসসি / আলিম পরীক্ষার্থী', nameEn: 'HSC / Alim candidate', subjects: HSC_COMMON, streams: HSC_STREAMS, targetExam: 'HSC', batchTypes: ['FINAL_REVISION', 'MODEL_TEST'] },
    ],
  },
  {
    code: 'ADMISSION', nameBn: 'ভর্তি প্রস্তুতি', nameEn: 'University admission', ageHint: 'এইচএসসি পরবর্তী',
    tracks: [
      { code: 'ADM_ENGINEERING', nameBn: 'ইঞ্জিনিয়ারিং (BUET, CKRUET)', nameEn: 'Engineering (BUET, CKRUET)', subjects: ['PHYSICS', 'CHEMISTRY', 'MATH', 'ENGLISH'], targetExam: 'ENGINEERING_ADMISSION', batchTypes: ['ADMISSION_PROGRAM', 'DP_BATCH', 'MODEL_TEST', 'TRIAL'] },
      { code: 'ADM_MEDICAL', nameBn: 'মেডিকেল ও ডেন্টাল', nameEn: 'Medical & dental (MBBS/BDS)', subjects: ['BIOLOGY', 'CHEMISTRY', 'PHYSICS', 'ENGLISH', 'GENERAL_KNOWLEDGE'], targetExam: 'MEDICAL_ADMISSION', batchTypes: ['ADMISSION_PROGRAM', 'DP_BATCH', 'MODEL_TEST', 'SECOND_TIME'] },
      { code: 'ADM_VARSITY_SCIENCE', nameBn: 'ভার্সিটি বিজ্ঞান ইউনিট (সাবেক ‘ক’) ও গুচ্ছ A', nameEn: 'Varsity Science unit (old Ka) + GST A', subjects: ['PHYSICS', 'CHEMISTRY', 'MATH', 'BIOLOGY', 'BANGLA', 'ENGLISH'], targetExam: 'VARSITY_KA', batchTypes: ['ADMISSION_PROGRAM', 'MODEL_TEST', 'SECOND_TIME'] },
      { code: 'ADM_VARSITY_HUMANITIES', nameBn: 'ভার্সিটি কলা, আইন ও সমাজবিজ্ঞান ইউনিট (সাবেক ‘খ’) ও গুচ্ছ B', nameEn: 'Varsity Arts, Law & Social Science unit (old Kha) + GST B', subjects: ['BANGLA', 'ENGLISH', 'GENERAL_KNOWLEDGE', 'BD_AFFAIRS', 'INTL_AFFAIRS'], targetExam: 'VARSITY_KHA', batchTypes: ['ADMISSION_PROGRAM', 'CRASH', 'MODEL_TEST', 'SECOND_TIME'] },
      { code: 'ADM_VARSITY_BUSINESS', nameBn: 'ভার্সিটি ব্যবসায় শিক্ষা ইউনিট (সাবেক ‘গ’) ও গুচ্ছ C', nameEn: 'Varsity Business Studies unit (old Ga) + GST C', subjects: ['ACCOUNTING', 'BUSINESS_ORG_MGMT', 'FINANCE_BANKING', 'PRODUCTION_MARKETING', 'BANGLA', 'ENGLISH'], targetExam: 'VARSITY_GA', batchTypes: ['ADMISSION_PROGRAM', 'MODEL_TEST'] },
      { code: 'ADM_FINE_ARTS', nameBn: 'চারুকলা ইউনিট', nameEn: 'Fine Arts unit', subjects: ['DRAWING', 'GENERAL_KNOWLEDGE', 'BANGLA', 'ENGLISH'], targetExam: 'VARSITY_FINE_ARTS' },
      { code: 'ADM_AGRI', nameBn: 'কৃষি গুচ্ছ', nameEn: 'Agriculture cluster', subjects: ['PHYSICS', 'CHEMISTRY', 'MATH', 'BIOLOGY'], targetExam: 'AGRI_CLUSTER' },
      { code: 'ADM_IBA_BBA', nameBn: 'IBA BBA', nameEn: 'IBA BBA', subjects: ['ENGLISH', 'MATH', 'ANALYTICAL'], targetExam: 'IBA_BBA' },
      { code: 'ADM_BUP', nameBn: 'BUP', nameEn: 'BUP', subjects: ['ENGLISH', 'MATH', 'GENERAL_KNOWLEDGE', 'BANGLA'], targetExam: 'BUP' },
      { code: 'ADM_NURSING', nameBn: 'নার্সিং / আর্মড ফোর্সেস মেডিকেল', nameEn: 'Nursing / AFMC', subjects: ['BIOLOGY', 'CHEMISTRY', 'PHYSICS', 'ENGLISH', 'GENERAL_KNOWLEDGE'] },
    ],
  },
  {
    code: 'UNIVERSITY', nameBn: 'বিশ্ববিদ্যালয় কোর্স হেল্প', nameEn: 'University course help', ageHint: 'অনার্স/ডিপ্লোমা',
    tracks: [
      { code: 'UNI_ENGINEERING', nameBn: 'ইঞ্জিনিয়ারিং', nameEn: 'Engineering', subjects: ['UNI_CSE', 'UNI_EEE', 'UNI_CIVIL_ME', 'UNI_PROGRAMMING', 'UNI_MATH_STAT'] },
      { code: 'UNI_SCIENCE', nameBn: 'বিজ্ঞান অনুষদ', nameEn: 'Science faculty', subjects: ['UNI_MATH_STAT', 'UNI_PHY_CHEM', 'UNI_PROGRAMMING'] },
      { code: 'UNI_BUSINESS', nameBn: 'ব্যবসায় (BBA)', nameEn: 'Business (BBA)', subjects: ['UNI_ACCOUNTING_FINANCE', 'UNI_ECONOMICS', 'UNI_MATH_STAT'] },
      { code: 'UNI_ARTS_SOCIAL', nameBn: 'কলা ও সামাজিক বিজ্ঞান', nameEn: 'Arts & social science', subjects: ['UNI_ECONOMICS', 'UNI_ENGLISH', 'UNI_LAW'] },
      { code: 'UNI_MEDICAL', nameBn: 'মেডিকেল (MBBS প্রফ)', nameEn: 'Medical (MBBS prof)', subjects: ['UNI_MEDICAL_BASIC'] },
      { code: 'UNI_NATIONAL', nameBn: 'জাতীয় বিশ্ববিদ্যালয় অনার্স', nameEn: 'National University honours', subjects: ['UNI_ACCOUNTING_FINANCE', 'UNI_ECONOMICS', 'UNI_ENGLISH', 'UNI_MATH_STAT'] },
    ],
  },
  {
    code: 'JOB', nameBn: 'চাকরি প্রস্তুতি', nameEn: 'Job preparation', ageHint: 'গ্র্যাজুয়েশন পরবর্তী',
    tracks: [
      { code: 'JOB_BCS_PRELI', nameBn: 'বিসিএস প্রিলিমিনারি', nameEn: 'BCS preliminary', subjects: [...JOB_CORE, 'GEO_ENV_DISASTER', 'MATH_REASONING', 'MENTAL_ABILITY', 'ETHICS_GOOD_GOV'], targetExam: 'BCS_PRELI', batchTypes: ['PIONEER', 'PROGRESSIVE', 'INTENSIVE', 'EXAM_BATCH', 'FREE_WEEK'] },
      { code: 'JOB_BCS_WRITTEN', nameBn: 'বিসিএস লিখিত', nameEn: 'BCS written', subjects: ['WRITTEN_BANGLA', 'WRITTEN_ENGLISH', 'BD_AFFAIRS', 'INTL_AFFAIRS', 'GENERAL_SCIENCE', 'MATH_REASONING', 'MENTAL_ABILITY'], targetExam: 'BCS_WRITTEN', batchTypes: ['WRITTEN_COURSE', 'EXAM_BATCH'] },
      { code: 'JOB_BCS_VIVA', nameBn: 'বিসিএস ভাইভা', nameEn: 'BCS viva', subjects: ['VIVA'], targetExam: 'BCS_VIVA' },
      { code: 'JOB_BANK', nameBn: 'ব্যাংক জব (BB AD, সম্মিলিত ব্যাংক)', nameEn: 'Bank jobs (BB AD, combined bank)', subjects: ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_ABILITY', 'COMPUTER', 'ANALYTICAL', 'ECON_BANKING', 'WRITTEN_ENGLISH'], targetExam: 'BANK_JOB' },
      { code: 'JOB_PRIMARY_TEACHER', nameBn: 'প্রাথমিক সহকারী শিক্ষক নিয়োগ', nameEn: 'Primary assistant teacher', subjects: ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_ABILITY'], targetExam: 'PRIMARY_TEACHER' },
      { code: 'JOB_NTRCA', nameBn: 'শিক্ষক নিবন্ধন (NTRCA)', nameEn: 'NTRCA teacher registration', subjects: ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_ABILITY', 'PEDAGOGY'], targetExam: 'NTRCA' },
      { code: 'JOB_GOVT_GENERAL', nameBn: 'সরকারি চাকরি (৯ম–২০তম গ্রেড)', nameEn: 'Govt jobs (grade 9–20)', subjects: JOB_CORE, targetExam: 'GOVT_JOB' },
      { code: 'JOB_DEFENCE', nameBn: 'ডিফেন্স (আর্মি/নেভি/এয়ার ফোর্স, ISSB)', nameEn: 'Defence officer + ISSB', subjects: ['BANGLA', 'ENGLISH', 'MATH', 'GENERAL_KNOWLEDGE', 'MENTAL_ABILITY'], targetExam: 'DEFENCE' },
      { code: 'JOB_POLICE_NSI', nameBn: 'পুলিশ SI / NSI', nameEn: 'Police SI / NSI', subjects: JOB_CORE, targetExam: 'POLICE_NSI' },
      { code: 'JOB_JUDICIAL', nameBn: 'জুডিশিয়াল সার্ভিস (BJSC)', nameEn: 'Judicial service (BJSC)', subjects: ['LAW', 'BANGLA', 'ENGLISH', 'MATH', 'GENERAL_ABILITY'], targetExam: 'BJSC' },
    ],
  },
  {
    code: 'POSTGRAD', nameBn: 'MBA ও উচ্চশিক্ষা', nameEn: 'MBA & higher study', ageHint: 'গ্র্যাজুয়েশন পরবর্তী',
    tracks: [
      { code: 'PG_MBA_ADMISSION', nameBn: 'MBA ভর্তি (IBA DU/JU, BUP, প্রাইভেট)', nameEn: 'MBA admission (IBA DU/JU, BUP, private)', subjects: ['ENGLISH', 'MATH', 'ANALYTICAL', 'WRITTEN_ENGLISH'], targetExam: 'MBA_ADMISSION' },
      { code: 'PG_IELTS', nameBn: 'IELTS', nameEn: 'IELTS', subjects: ['IELTS'], targetExam: 'IELTS' },
      { code: 'PG_GRE_GMAT', nameBn: 'GRE / GMAT', nameEn: 'GRE / GMAT', subjects: ['GRE_GMAT'], targetExam: 'GRE_GMAT' },
    ],
  },
  {
    code: 'ENGLISH_MEDIUM', nameBn: 'ইংলিশ মিডিয়াম', nameEn: 'English medium', ageHint: 'Grade 1–A level',
    tracks: [
      { code: 'EM_JUNIOR', nameBn: 'Grade 1–8', nameEn: 'Grade 1–8', subjects: ['EM_MATH', 'EM_ENGLISH_LANG', 'SCIENCE'] },
      { code: 'O_LEVEL', nameBn: 'O Level', nameEn: 'O Level (Cambridge/Edexcel)', subjects: ['EM_MATH', 'EM_ADD_MATH', 'EM_PHYSICS', 'EM_CHEMISTRY', 'EM_BIOLOGY', 'EM_ENGLISH_LANG', 'EM_ECONOMICS', 'EM_ACCOUNTING', 'EM_BUSINESS', 'EM_CS'], targetExam: 'O_LEVEL' },
      { code: 'A_LEVEL', nameBn: 'A Level', nameEn: 'A Level (Cambridge/Edexcel)', subjects: ['EM_MATH', 'EM_PHYSICS', 'EM_CHEMISTRY', 'EM_BIOLOGY', 'EM_ECONOMICS', 'EM_ACCOUNTING', 'EM_BUSINESS', 'EM_CS'], targetExam: 'A_LEVEL' },
    ],
  },
  {
    code: 'SKILLS', nameBn: 'স্কিল ও অন্যান্য', nameEn: 'Skills & other', ageHint: 'সব বয়স',
    tracks: [
      { code: 'SKILL_SPOKEN_ENGLISH', nameBn: 'স্পোকেন ইংলিশ', nameEn: 'Spoken English', subjects: ['SPOKEN_ENGLISH'] },
      { code: 'SKILL_PROGRAMMING', nameBn: 'প্রোগ্রামিং', nameEn: 'Programming', subjects: ['UNI_PROGRAMMING'] },
      { code: 'SKILL_QURAN_ARABIC', nameBn: 'কুরআন ও আরবি', nameEn: 'Quran & Arabic', subjects: ['QURAN', 'ARABIC'] },
    ],
  },
];

/** All subject codes a track uses, optionally for one stream. */
export function trackSubjects(track: Track, stream?: Stream): string[] {
  const extra = stream ? track.streams?.[stream] ?? [] : Object.values(track.streams ?? {}).flat();
  return [...new Set([...track.subjects, ...extra])];
}

export function findTrack(code: string): { segment: Segment; track: Track } | undefined {
  for (const segment of SEGMENTS) {
    const track = segment.tracks.find((t) => t.code === code);
    if (track) return { segment, track };
  }
  return undefined;
}

/**
 * Maps the coarse level codes @mastermoshai/core used before this taxonomy existed
 * to the fine-grained track codes here, so existing rows keep working.
 */
export const LEGACY_LEVEL_MAP: Record<string, string[]> = {
  CLASS_1_5: ['CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4', 'CLASS_5'],
  CLASS_6_8: ['CLASS_6', 'CLASS_7', 'CLASS_8'],
  CLASS_11_12: ['HSC_1ST', 'HSC_2ND'],
  CLASS_9_10: ['CLASS_9', 'CLASS_10'],
  SSC: ['SSC'],
  HSC: ['HSC_1ST', 'HSC_2ND', 'HSC'],
  O_LEVEL: ['O_LEVEL'],
  A_LEVEL: ['A_LEVEL'],
  ADMISSION: ['ADM_ENGINEERING', 'ADM_MEDICAL', 'ADM_VARSITY_SCIENCE', 'ADM_VARSITY_HUMANITIES', 'ADM_VARSITY_BUSINESS', 'ADM_FINE_ARTS', 'ADM_AGRI', 'ADM_IBA_BBA', 'ADM_BUP', 'ADM_NURSING'],
};

/** @mastermoshai/core SUBJECTS (display strings) -> subject codes here. */
export const LEGACY_SUBJECT_MAP: Record<string, string[]> = {
  Math: ['MATH'],
  'Higher Math': ['HIGHER_MATH', 'HIGHER_MATH_1', 'HIGHER_MATH_2'],
  Physics: ['PHYSICS', 'PHYSICS_1', 'PHYSICS_2'],
  Chemistry: ['CHEMISTRY', 'CHEMISTRY_1', 'CHEMISTRY_2'],
  Biology: ['BIOLOGY', 'BIOLOGY_1', 'BIOLOGY_2'],
  English: ['ENGLISH', 'ENGLISH_1', 'ENGLISH_2'],
  Bangla: ['BANGLA', 'BANGLA_1', 'BANGLA_2'],
  ICT: ['ICT'],
  Accounting: ['ACCOUNTING'],
  Economics: ['ECONOMICS'],
};
