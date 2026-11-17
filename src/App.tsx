import { useState } from "react";
import { Header } from "./components/Header";
import { NotesInputStage } from "./components/NotesInputStage";
import { QuizStage } from "./components/QuizStage";
import { QuizSummary } from "./components/QuizSummary";
import {
  AnswerQuizResponse,
  FollowUpQuizResponse,
  GenerateQuizResponse,
  PublicQuestion,
  QuestionProgress,
} from "./types/quiz";

type AppStage = "input" | "quiz" | "summary";

function createInitialProgress(count: number): QuestionProgress[] {
  return Array.from({ length: count }, () => ({
    status: "unanswered",
    selectedIndex: null,
    wrongSelectedIndex: null,
    correctIndex: null,
    whyIncorrect: null,
    correctExplanation: null,
    dialogue: [],
    activeGuidingQuestion: null,
  }));
}

export default function App() {
  const [stage, setStage] = useState<AppStage>("input");
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [progress, setProgress] = useState<QuestionProgress[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz from your study notes.");
      }

      const payload = data as GenerateQuizResponse;
      setSessionId(payload.sessionId);
      setTopicTitle(payload.topicTitle);
      setQuestions(payload.questions);
      setProgress(createInitialProgress(payload.questions.length));
      setCurrentIndex(0);
      setStage("quiz");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitMcqOption = async (questionIndex: number, optionIndex: number) => {
    if (!sessionId || isSubmittingAnswer) return;
    setErrorMessage(null);
    setIsSubmittingAnswer(true);

    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionIndex,
          selectedIndex: optionIndex,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not evaluate your answer.");
      }

      const result = data as AnswerQuizResponse;

      setProgress((prev) =>
        prev.map((item, idx) => {
          if (idx !== questionIndex) return item;

          if (result.isCorrect) {
            return {
              ...item,
              status: "resolved_direct",
              selectedIndex: optionIndex,
              correctIndex: result.correctIndex ?? optionIndex,
              correctExplanation: result.correctExplanation ?? null,
            };
          }

          return {
            ...item,
            status: "awaiting_followup",
            selectedIndex: optionIndex,
            wrongSelectedIndex: result.wrongSelectedIndex ?? optionIndex,
            whyIncorrect: result.whyIncorrect ?? null,
            activeGuidingQuestion: result.guidingQuestion ?? null,
            dialogue: result.guidingQuestion
              ? [
                  {
                    id: `tutor-init-${questionIndex}`,
                    role: "tutor",
                    question: result.guidingQuestion,
                  },
                ]
              : [],
          };
        })
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to check your answer. Please try again."
      );
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleSubmitFollowUp = async (
    questionIndex: number,
    studentAnswer: string
  ): Promise<boolean> => {
    if (!sessionId || isSubmittingFollowUp) return false;
    setErrorMessage(null);
    setIsSubmittingFollowUp(true);

    try {
      const response = await fetch("/api/quiz/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionIndex,
          studentResponse: studentAnswer,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not evaluate your follow-up response.");
      }

      const result = data as FollowUpQuizResponse;

      setProgress((prev) =>
        prev.map((item, idx) => {
          if (idx !== questionIndex) return item;

          const studentEntry = {
            id: `student-${Date.now()}-${item.dialogue.length}`,
            role: "student" as const,
            answer: studentAnswer,
          };

          if (result.isFollowUpCorrect) {
            return {
              ...item,
              status: "resolved_socratic",
              correctIndex: result.correctIndex ?? null,
              correctExplanation: result.correctExplanation ?? null,
              activeGuidingQuestion: null,
              dialogue: [
                ...item.dialogue,
                studentEntry,
                {
                  id: `tutor-confirm-${Date.now()}`,
                  role: "tutor" as const,
                  feedback: result.feedback,
                },
              ],
            };
          }

          return {
            ...item,
            status: "awaiting_followup",
            activeGuidingQuestion: result.nextGuidingQuestion ?? item.activeGuidingQuestion,
            dialogue: [
              ...item.dialogue,
              studentEntry,
              {
                id: `tutor-nudge-${Date.now()}`,
                role: "tutor" as const,
                feedback: result.feedback,
                question: result.nextGuidingQuestion,
              },
            ],
          };
        })
      );
      return true;
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to evaluate your response. Please try again."
      );
      return false;
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleAdvanceNext = () => {
    setErrorMessage(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStage("summary");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleReturnToNotes = () => {
    setErrorMessage(null);
    setStage("input");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJumpToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (sectionId === "notes-editor") {
        document.getElementById("notes-textarea")?.focus();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        stage={stage}
        onReturnToNotes={handleReturnToNotes}
        onJumpToSection={handleJumpToSection}
      />

      <div className="flex-1">
        {stage === "input" && (
          <NotesInputStage
            notes={notes}
            onChangeNotes={setNotes}
            onGenerateQuiz={handleGenerateQuiz}
            isGenerating={isGenerating}
            errorMessage={errorMessage}
          />
        )}

        {stage === "quiz" && questions.length > 0 && (
          <QuizStage
            topicTitle={topicTitle}
            notes={notes}
            questions={questions}
            progress={progress}
            currentIndex={currentIndex}
            onSelectQuestionIndex={(idx) => {
              setErrorMessage(null);
              setCurrentIndex(idx);
            }}
            onSubmitMcqOption={handleSubmitMcqOption}
            onSubmitFollowUp={handleSubmitFollowUp}
            onAdvanceNext={handleAdvanceNext}
            isSubmittingAnswer={isSubmittingAnswer}
            isSubmittingFollowUp={isSubmittingFollowUp}
            errorMessage={errorMessage}
          />
        )}

        {stage === "summary" && questions.length > 0 && (
          <QuizSummary
            topicTitle={topicTitle}
            questions={questions}
            progress={progress}
            onRetakeSameNotes={handleGenerateQuiz}
            onStartNewNotes={handleReturnToNotes}
            isRegenerating={isGenerating}
          />
        )}
      </div>
    </div>
  );
}
