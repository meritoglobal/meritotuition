/** Shared domain types used by the API, the website and the mobile app. */

export type Role = "STUDENT" | "GUARDIAN" | "TEACHER" | "ADMIN";

export type TeachingMode = "ONLINE" | "OFFLINE";

/** Bangladesh class levels a teacher can offer. */
export const CLASS_LEVELS = [
  "CLASS_1_5",
  "CLASS_6_8",
  "CLASS_9_10",
  "SSC",
  "CLASS_11_12",
  "HSC",
  "O_LEVEL",
  "A_LEVEL",
  "ADMISSION",
] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const CLASS_LEVEL_LABEL: Record<ClassLevel, string> = {
  CLASS_1_5: "Class 1-5",
  CLASS_6_8: "Class 6-8",
  CLASS_9_10: "Class 9-10",
  SSC: "SSC",
  CLASS_11_12: "Class 11-12",
  HSC: "HSC",
  O_LEVEL: "O Level",
  A_LEVEL: "A Level",
  ADMISSION: "Admission",
};

export const SUBJECTS = [
  "Math",
  "Higher Math",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Bangla",
  "ICT",
  "Accounting",
  "Economics",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export type Medium = "BANGLA" | "ENGLISH_VERSION" | "ENGLISH_MEDIUM";

/** Max students in one batch is 5 (1:1 to 1:5). */
export type BatchSize = 1 | 2 | 3 | 4 | 5;
export const BATCH_SIZES: BatchSize[] = [1, 2, 3, 4, 5];

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** 0 = Sunday ... 6 = Saturday (BD week starts Saturday, but we store JS weekday numbers). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_LABEL: Record<Weekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};
export const WEEKDAY_LABEL_BN: Record<Weekday, string> = {
  0: "রবি",
  1: "সোম",
  2: "মঙ্গল",
  3: "বুধ",
  4: "বৃহস্পতি",
  5: "শুক্র",
  6: "শনি",
};

/** One recurring slot in a teacher's weekly routine. */
export interface WeeklySlot {
  id: string;
  /** Days this batch meets, e.g. Sun/Tue/Thu. */
  days: Weekday[];
  /** Local Dhaka time, "HH:mm". */
  startTime: string;
  durationMin: number;
  mode: TeachingMode;
  subjects: Subject[];
  level: ClassLevel;
  batchSize: BatchSize;
  seatsTaken: number;
  /** Seats the teacher opens for free trial students in upcoming classes of this batch. */
  trialSeats: number;
  /** Monthly price per student, in BDT (whole taka). */
  monthlyPrice: number;
}

export interface TeacherSummary {
  id: string;
  name: string;
  /** Bangla spelling of the name, shown when the site is in Bangla. */
  nameBn?: string;
  photoUrl?: string;
  university: string;
  department: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  subjects: Subject[];
  levels: ClassLevel[];
  modes: TeachingMode[];
  medium: Medium[];
  /** Offline teaching centre point and radius. */
  area?: { name: string; point: GeoPoint; radiusKm: number };
  /** Lowest monthly price across their slots, BDT. */
  fromPrice: number;
  bio: string;
  bioBn?: string;
  departmentBn?: string;
  freeVideoCount: number;
  routine: WeeklySlot[];
}
