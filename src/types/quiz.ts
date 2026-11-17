export type QuestionStatus =
  | "unanswered"
  | "awaiting_followup"
  | "resolved_direct"
  | "resolved_socratic";

export interface PublicQuestion {
  index: number;
  question: string;
  options: string[];
  keyConcept: string;
}

export interface GenerateQuizResponse {
  sessionId: string;
  topicTitle: string;
  questions: PublicQuestion[];
}

export interface AnswerQuizResponse {
  isCorrect: boolean;
  correctIndex?: number;
  correctExplanation?: string;
  wrongSelectedIndex?: number;
  whyIncorrect?: string;
  guidingQuestion?: string;
}

export interface FollowUpQuizResponse {
  isFollowUpCorrect: boolean;
  feedback: string;
  nextGuidingQuestion?: string;
  correctIndex?: number;
  correctExplanation?: string;
}

export interface DialogueEntry {
  id: string;
  role: "tutor" | "student";
  feedback?: string;
  question?: string;
  answer?: string;
}

export interface QuestionProgress {
  status: QuestionStatus;
  selectedIndex: number | null;
  wrongSelectedIndex: number | null;
  correctIndex: number | null;
  whyIncorrect: string | null;
  correctExplanation: string | null;
  dialogue: DialogueEntry[];
  activeGuidingQuestion: string | null;
}
