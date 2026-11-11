/**
 * Demo teachers for the website and app before the API is connected.
 * Names are fictional.
 */
import { DHAKA_AREAS } from "./geo";
import type { TeacherSummary } from "./types";

const area = (name: keyof typeof DHAKA_AREAS, radiusKm: number) => {
  const point = DHAKA_AREAS[name];
  if (!point) throw new Error(`Unknown area ${name}`);
  return { name, point, radiusKm };
};

export const DEMO_TEACHERS: TeacherSummary[] = [
  {
    id: "t-rafi",
    name: "Rafiul Hasan",
    nameBn: "রাফিউল হাসান",
    departmentBn: "ইলেকট্রিক্যাল ও ইলেকট্রনিক ইঞ্জিনিয়ারিং",
    bioBn: "পদার্থবিজ্ঞান আর উচ্চতর গণিত, এসএসসি থেকে এইচএসসি। প্রতি সপ্তাহে বোর্ডের প্রশ্ন ধরে ধরে অনুশীলন, সূত্র মুখস্থ নয়।",
    university: "BUET",
    department: "Electrical & Electronic Engineering",
    verified: true,
    rating: 4.9,
    reviewCount: 48,
    subjects: ["Math", "Higher Math", "Physics"],
    levels: ["CLASS_9_10", "SSC", "HSC"],
    modes: ["ONLINE", "OFFLINE"],
    medium: ["BANGLA", "ENGLISH_VERSION"],
    area: area("Farmgate", 4),
    fromPrice: 3000,
    bio: "Physics and Higher Math for SSC/HSC with board-question practice every week.",
    freeVideoCount: 14,
    routine: [
      { id: "s1", days: [0, 2, 4], startTime: "17:00", durationMin: 60, mode: "ONLINE", subjects: ["Physics"], level: "CLASS_9_10", batchSize: 3, seatsTaken: 1, trialSeats: 1, monthlyPrice: 3000 },
      { id: "s2", days: [6, 1, 3], startTime: "19:00", durationMin: 90, mode: "OFFLINE", subjects: ["Math", "Higher Math"], level: "HSC", batchSize: 1, seatsTaken: 0, trialSeats: 1, monthlyPrice: 8000 },
    ],
  },
  {
    id: "t-nusrat",
    name: "Nusrat Jahan",
    nameBn: "নুসরাত জাহান",
    departmentBn: "রসায়ন",
    bioBn: "ছবি এঁকে, ডায়াগ্রাম দেখিয়ে রসায়নের ভয় তাড়াই। মেডিকেল ভর্তির প্রস্তুতিও করাই।",
    university: "University of Dhaka",
    department: "Chemistry",
    verified: true,
    rating: 4.8,
    reviewCount: 31,
    subjects: ["Chemistry", "Biology"],
    levels: ["CLASS_9_10", "SSC", "HSC", "ADMISSION"],
    modes: ["ONLINE", "OFFLINE"],
    medium: ["BANGLA"],
    area: area("Dhanmondi", 3),
    fromPrice: 2500,
    bio: "Chemistry made simple with diagrams. Medical admission prep.",
    freeVideoCount: 22,
    routine: [
      { id: "s1", days: [0, 2, 4], startTime: "16:00", durationMin: 60, mode: "ONLINE", subjects: ["Chemistry"], level: "SSC", batchSize: 5, seatsTaken: 3, trialSeats: 2, monthlyPrice: 2500 },
      { id: "s2", days: [5], startTime: "10:00", durationMin: 120, mode: "ONLINE", subjects: ["Biology", "Chemistry"], level: "ADMISSION", batchSize: 5, seatsTaken: 5, trialSeats: 0, monthlyPrice: 3500 },
      { id: "s3", days: [5], startTime: "15:00", durationMin: 90, mode: "OFFLINE", subjects: ["Chemistry"], level: "SSC", batchSize: 2, seatsTaken: 0, trialSeats: 1, monthlyPrice: 4500 },
    ],
  },
  {
    id: "t-arif",
    name: "Arif Chowdhury",
    nameBn: "আরিফ চৌধুরী",
    departmentBn: "কম্পিউটার সায়েন্স",
    bioBn: "ইংলিশ মিডিয়ামের ছেলেমেয়েদের ও লেভেল ম্যাথ আর আইসিটি পড়াই। ধীরেসুস্থে, বুঝিয়ে।",
    university: "North South University",
    department: "Computer Science",
    verified: true,
    rating: 4.6,
    reviewCount: 12,
    subjects: ["ICT", "Math", "English"],
    levels: ["CLASS_6_8", "CLASS_9_10", "O_LEVEL"],
    modes: ["ONLINE"],
    medium: ["ENGLISH_MEDIUM", "ENGLISH_VERSION"],
    fromPrice: 4000,
    bio: "O Level Maths and ICT for English-medium students.",
    freeVideoCount: 6,
    routine: [
      { id: "s1", days: [6, 1], startTime: "20:00", durationMin: 60, mode: "ONLINE", subjects: ["Math"], level: "O_LEVEL", batchSize: 2, seatsTaken: 1, trialSeats: 1, monthlyPrice: 4000 },
    ],
  },
  {
    id: "t-sadia",
    name: "Sadia Islam",
    nameBn: "সাদিয়া ইসলাম",
    departmentBn: "সিভিল ইঞ্জিনিয়ারিং",
    bioBn: "৯ম-১০মের বিজ্ঞান বিভাগ: গণিত, পদার্থ, রসায়ন, তিনটাই এক টিচারের কাছে। বাসায় এসে পড়াই।",
    university: "BUET",
    department: "Civil Engineering",
    verified: false,
    rating: 4.7,
    reviewCount: 5,
    subjects: ["Math", "Physics", "Chemistry"],
    levels: ["CLASS_9_10", "SSC"],
    modes: ["OFFLINE"],
    medium: ["BANGLA"],
    area: area("Azimpur / Lalbagh", 3),
    fromPrice: 6000,
    bio: "Home tutor for Class 9-10 science group: Math, Physics, Chemistry together.",
    freeVideoCount: 2,
    routine: [
      { id: "s1", days: [0, 2, 4], startTime: "18:00", durationMin: 90, mode: "OFFLINE", subjects: ["Math", "Physics", "Chemistry"], level: "CLASS_9_10", batchSize: 1, seatsTaken: 0, trialSeats: 1, monthlyPrice: 6000 },
    ],
  },
  {
    id: "t-tanvir",
    name: "Tanvir Ahmed",
    nameBn: "তানভীর আহমেদ",
    departmentBn: "গণিত",
    bioBn: "গণিত একদম গোড়া থেকে, বোর্ড পরীক্ষা মাথায় রেখে। ব্যাচ ছোট, পরীক্ষা প্রতি সপ্তাহে।",
    university: "Jahangirnagar University",
    department: "Mathematics",
    verified: true,
    rating: 4.5,
    reviewCount: 22,
    subjects: ["Math", "Higher Math"],
    levels: ["CLASS_6_8", "CLASS_9_10", "SSC", "HSC"],
    modes: ["ONLINE", "OFFLINE"],
    medium: ["BANGLA"],
    area: area("Mirpur", 5),
    fromPrice: 2000,
    bio: "Board-focused Math from basics. Small batches, weekly tests.",
    freeVideoCount: 9,
    routine: [
      { id: "s1", days: [6, 1, 3], startTime: "17:30", durationMin: 60, mode: "ONLINE", subjects: ["Math"], level: "CLASS_9_10", batchSize: 4, seatsTaken: 2, trialSeats: 1, monthlyPrice: 2000 },
      { id: "s2", days: [0, 3], startTime: "19:30", durationMin: 60, mode: "OFFLINE", subjects: ["Higher Math"], level: "HSC", batchSize: 2, seatsTaken: 1, trialSeats: 0, monthlyPrice: 5000 },
    ],
  },
  {
    id: "t-mahin",
    name: "Mahin Rahman",
    nameBn: "মাহিন রহমান",
    departmentBn: "ইংরেজি",
    bioBn: "গ্রামার মুখস্থ করাই না, ইংরেজিতে কথা বলাই। সকালের ক্লাস স্কুলের আগে, রাতের ক্লাস সব কাজ শেষে।",
    university: "University of Dhaka",
    department: "English",
    verified: true,
    rating: 4.7,
    reviewCount: 26,
    subjects: ["English"],
    levels: ["CLASS_6_8", "CLASS_9_10", "SSC"],
    modes: ["ONLINE"],
    medium: ["BANGLA", "ENGLISH_VERSION"],
    fromPrice: 1800,
    bio: "I don't make you memorise grammar, I get you speaking. Morning class before school, night class after everything else.",
    freeVideoCount: 11,
    routine: [
      { id: "s1", days: [5, 6], startTime: "07:00", durationMin: 60, mode: "ONLINE", subjects: ["English"], level: "CLASS_9_10", batchSize: 1, seatsTaken: 0, trialSeats: 1, monthlyPrice: 3500 },
      { id: "s2", days: [0, 2], startTime: "21:00", durationMin: 60, mode: "ONLINE", subjects: ["English"], level: "CLASS_6_8", batchSize: 5, seatsTaken: 2, trialSeats: 1, monthlyPrice: 1800 },
    ],
  },
  {
    id: "t-farhana",
    name: "Farhana Akter",
    nameBn: "ফারহানা আক্তার",
    departmentBn: "অ্যাকাউন্টিং",
    bioBn: "উত্তরায় বাসায় গিয়ে হিসাববিজ্ঞান আর অর্থনীতি পড়াই। ডেবিট-ক্রেডিটের গিঁট খুলতে আমার কয়েকটা ক্লাসই যথেষ্ট।",
    university: "North South University",
    department: "Accounting",
    verified: true,
    rating: 4.6,
    reviewCount: 17,
    subjects: ["Accounting", "Economics"],
    levels: ["CLASS_11_12", "HSC"],
    modes: ["OFFLINE"],
    medium: ["BANGLA", "ENGLISH_VERSION"],
    area: area("Uttara", 4),
    fromPrice: 5500,
    bio: "Home tutor in Uttara for Accounting and Economics. A few classes is all it takes to untangle debit and credit.",
    freeVideoCount: 4,
    routine: [
      { id: "s1", days: [6, 1, 3], startTime: "16:30", durationMin: 90, mode: "OFFLINE", subjects: ["Accounting"], level: "HSC", batchSize: 2, seatsTaken: 1, trialSeats: 1, monthlyPrice: 5500 },
    ],
  },
  {
    id: "t-sabbir",
    name: "Sabbir Hossain",
    nameBn: "সাব্বির হোসেন",
    departmentBn: "কম্পিউটার সায়েন্স ও ইঞ্জিনিয়ারিং",
    bioBn: "মোহাম্মদপুরে বাসায় গিয়ে গণিত-পদার্থ, আর রাতে অনলাইনে আইসিটি। প্রোগ্রামিং দিয়ে আইসিটি বোঝাই, মুখস্থ দিয়ে নয়।",
    university: "BUET",
    department: "Computer Science & Engineering",
    verified: true,
    rating: 4.8,
    reviewCount: 12,
    subjects: ["Math", "Physics", "ICT"],
    levels: ["CLASS_9_10", "SSC", "HSC"],
    modes: ["ONLINE", "OFFLINE"],
    medium: ["BANGLA"],
    area: area("Mohammadpur", 3),
    fromPrice: 2500,
    bio: "Math and Physics at your home in Mohammadpur, ICT online at night. I teach ICT through programming, not memorising.",
    freeVideoCount: 6,
    routine: [
      { id: "s1", days: [0, 2, 4], startTime: "18:30", durationMin: 90, mode: "OFFLINE", subjects: ["Math", "Physics"], level: "SSC", batchSize: 1, seatsTaken: 0, trialSeats: 1, monthlyPrice: 7000 },
      { id: "s2", days: [6, 3], startTime: "22:00", durationMin: 60, mode: "ONLINE", subjects: ["ICT"], level: "HSC", batchSize: 3, seatsTaken: 1, trialSeats: 1, monthlyPrice: 2500 },
    ],
  },
];

export interface DemoVideo {
  id: string;
  teacherId: string;
  title: string;
  titleBn: string;
  subject: string;
  level: string;
  durationMin: number;
  views: number;
}

export const DEMO_VIDEOS: DemoVideo[] = [
  { id: "v1", teacherId: "t-rafi", title: "Newton's 2nd law in 12 minutes", titleBn: "১২ মিনিটে নিউটনের দ্বিতীয় সূত্র", subject: "Physics", level: "SSC", durationMin: 12, views: 18400 },
  { id: "v2", teacherId: "t-nusrat", title: "Mole concept: the easy way", titleBn: "মোল ধারণা: সহজ উপায়ে", subject: "Chemistry", level: "SSC", durationMin: 18, views: 25100 },
  { id: "v3", teacherId: "t-tanvir", title: "Algebra formulas you must know", titleBn: "বীজগণিতের যে সূত্রগুলো জানতেই হবে", subject: "Math", level: "Class 9-10", durationMin: 15, views: 9700 },
  { id: "v4", teacherId: "t-arif", title: "O Level: simultaneous equations", titleBn: "ও লেভেল: সহসমীকরণ", subject: "Math", level: "O Level", durationMin: 20, views: 3200 },
  { id: "v5", teacherId: "t-rafi", title: "Vectors for HSC, part 1", titleBn: "এইচএসসি ভেক্টর, পর্ব ১", subject: "Physics", level: "HSC", durationMin: 25, views: 12800 },
  { id: "v6", teacherId: "t-nusrat", title: "Periodic table tricks", titleBn: "পর্যায় সারণি মনে রাখার কৌশল", subject: "Chemistry", level: "Class 9-10", durationMin: 14, views: 30500 },
];
