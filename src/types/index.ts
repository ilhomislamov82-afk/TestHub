export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  password?: string;
  groupIds?: string[];
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdByTeacherId: string;
}

export type QuestionType = 'single' | 'boolean';

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D' or '1', '2'
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer: string; // id of option: 'A', 'B', 'true', 'false', etc.
  points: number;
  explanation?: string;
}

export interface TestSettings {
  id: string;
  title: string;
  description: string;
  assignedGroupId: string; // group id or 'all'
  timeLimitMinutes: number; // in minutes (0 means no limit)
  allowedAttempts: number; // 0 means unlimited
  passingPercentage: number; // e.g. 60%
  startDate?: string; // YYYY-MM-DDTHH:mm
  endDate?: string; // YYYY-MM-DDTHH:mm
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  isPublished: boolean;
  createdByTeacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestWithQuestions extends TestSettings {
  questions: Question[];
}

export interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentPhone: string;
  groupId: string;
  groupName: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  tabExitCount: number;
  answers: Record<string, string>; // questionId -> selected answer key
  submittedAt: string;
  attemptNumber: number;
}

export interface ActiveTestProgress {
  testId: string;
  studentId: string;
  startTime: number; // timestamp ms
  durationSeconds: number;
  answers: Record<string, string>;
  tabExitCount: number;
  lastSavedAt: number;
  isCompleted: boolean;
  shuffledQuestionOrder?: string[]; // question IDs in shuffled order
  shuffledOptionsOrder?: Record<string, string[]>; // questionId -> option IDs in shuffled order
}

export interface QuestionParseError {
  questionNumber?: number;
  message: string;
  type: 'missing_question' | 'missing_options' | 'no_correct_answer' | 'multiple_correct_answers' | 'invalid_format';
}

export interface ParsedQuestionItem {
  number: number;
  rawText: string;
  question: Question;
  errors: QuestionParseError[];
  isValid: boolean;
}
