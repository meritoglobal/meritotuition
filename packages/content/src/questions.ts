/** Question bank types. Stored in Question.body (Json). */

export type QuestionType = 'MCQ' | 'MULTI_MCQ' | 'CQ' | 'SHORT' | 'WRITTEN' | 'FILL_BLANK' | 'TRUE_FALSE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface McqBody {
  stem: string;
  /** For MULTI_MCQ the statements (i, ii, iii) go here and options are combos like "i ও ii". */
  statements?: string[];
  options: string[];
  answer: number; // index into options
  explanation?: string;
}

export interface CqPart {
  label: 'ক' | 'খ' | 'গ' | 'ঘ';
  /** NCTB creative-question level: knowledge, comprehension, application, higher ability. */
  level: 'KNOWLEDGE' | 'COMPREHENSION' | 'APPLICATION' | 'HIGHER';
  prompt: string;
  marks: number;
  modelAnswer: string;
}

export interface CqBody {
  stem: string; // উদ্দীপক
  parts: CqPart[];
}

export interface TextBody {
  stem: string;
  modelAnswer: string;
  /** Rubric points the teacher ticks when grading. */
  rubric?: { point: string; marks: number }[];
}

export interface TrueFalseBody {
  stem: string;
  answer: boolean;
  explanation?: string;
}

export interface FillBlankBody {
  stem: string; // use ____ for the blank
  answers: string[]; // accepted answers, compared case/space-insensitively
  explanation?: string;
}

export type QuestionBody = McqBody | CqBody | TextBody | TrueFalseBody | FillBlankBody;

export interface BankQuestion {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  topicIds: string[];
  body: QuestionBody;
  sourceTag?: string;
}

/** Types the app can grade without a teacher. */
export const AUTO_GRADED: QuestionType[] = ['MCQ', 'MULTI_MCQ', 'TRUE_FALSE', 'FILL_BLANK'];
