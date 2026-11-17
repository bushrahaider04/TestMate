import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Send,
} from "lucide-react";
import { PublicQuestion, QuestionProgress } from "../types/quiz";

interface QuizStageProps {
  topicTitle: string;
  notes: string;
  questions: PublicQuestion[];
  progress: QuestionProgress[];
  currentIndex: number;
  onSelectQuestionIndex: (index: number) => void;
  onSubmitMcqOption: (questionIndex: number, optionIndex: number) => Promise<void>;
  onSubmitFollowUp: (questionIndex: number, answer: string) => Promise<boolean>;
  onAdvanceNext: () => void;
  isSubmittingAnswer: boolean;
  isSubmittingFollowUp: boolean;
  errorMessage: string | null;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function QuizStage({
  topicTitle,
  notes,
  questions,
  progress,
  currentIndex,
  onSelectQuestionIndex,
  onSubmitMcqOption,
  onSubmitFollowUp,
  onAdvanceNext,
  isSubmittingAnswer,
  isSubmittingFollowUp,
  errorMessage,
}: QuizStageProps) {
  const [followUpInput, setFollowUpInput] = useState("");
  const [showNotesOnMobile, setShowNotesOnMobile] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentProgress = progress[currentIndex];

  const isResolved =
    currentProgress.status === "resolved_direct" ||
    currentProgress.status === "resolved_socratic";
  const isAwaitingFollowUp = currentProgress.status === "awaiting_followup";
  const isLastQuestion = currentIndex === questions.length - 1;

  // Determine the furthest unlocked question index
  const firstUnresolvedIndex = progress.findIndex(
    (p) => p.status !== "resolved_direct" && p.status !== "resolved_socratic"
  );
  const maxUnlockedIndex =
    firstUnresolvedIndex === -1 ? questions.length - 1 : firstUnresolvedIndex;

  const statusLabel =
    currentProgress.status === "unanswered"
      ? "Choose an answer"
      : currentProgress.status === "awaiting_followup"
      ? "Guided reflection"
      : currentProgress.status === "resolved_socratic"
      ? "Confirmed after reflection"
      : "Confirmed on first try";

  const handleFollowUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = followUpInput.trim();
    if (!trimmed || isSubmittingFollowUp) return;
    const ok = await onSubmitFollowUp(currentIndex, trimmed);
    if (ok) {
      setFollowUpInput("");
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Main Quiz Stage */}
        <section id="quiz-question-card" className="lg:col-span-8 space-y-6">
          {/* Unboxed Quiz Progress Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{topicTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>{statusLabel}</span>
              </div>
              <span className="text-slate-600 font-medium">{currentQuestion.keyConcept}</span>
            </div>

            {/* 5-step interactive progress segments */}
            <div
              className="grid grid-cols-5 gap-2"
              role="tablist"
              aria-label="Quiz question progress"
            >
              {questions.map((q, idx) => {
                const qProg = progress[idx];
                const resolved =
                  qProg.status === "resolved_direct" || qProg.status === "resolved_socratic";
                const reflecting = qProg.status === "awaiting_followup";
                const isCurrent = idx === currentIndex;
                const isLocked = idx > maxUnlockedIndex;

                let barStyle = "bg-slate-200 text-slate-500";
                if (resolved) {
                  barStyle = "bg-emerald-600 text-white";
                } else if (reflecting) {
                  barStyle = "bg-amber-500 text-white";
                } else if (isCurrent) {
                  barStyle = "bg-blue-700 text-white";
                }

                return (
                  <button
                    key={q.index}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) onSelectQuestionIndex(idx);
                    }}
                    className={`group flex flex-col items-start gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded p-1 -m-1 transition-opacity ${
                      isLocked ? "opacity-45 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <div
                      className={`h-1.5 w-full rounded-full transition-colors ${barStyle} ${
                        isCurrent ? "ring-2 ring-blue-600/30 ring-offset-1" : ""
                      }`}
                    />
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isCurrent ? "font-semibold text-slate-900" : "text-slate-500"
                      }`}
                    >
                      Q{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Question Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 leading-snug">
              {currentQuestion.question}
            </h1>

            {/* Multiple-Choice Options */}
            <div className="space-y-3" role="radiogroup" aria-label="Answer choices">
              {currentQuestion.options.map((optionText, optIdx) => {
                const isWrongSelected = currentProgress.wrongSelectedIndex === optIdx;
                const isConfirmedCorrect =
                  isResolved && currentProgress.correctIndex === optIdx;
                const isDisabled =
                  isSubmittingAnswer || isAwaitingFollowUp || isResolved;

                let containerClasses =
                  "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-slate-900";
                let letterClasses = "bg-slate-100 text-slate-700 border-slate-200";

                if (isConfirmedCorrect) {
                  containerClasses =
                    "border-emerald-500 bg-emerald-50/80 text-slate-900";
                  letterClasses = "bg-emerald-600 text-white border-emerald-600";
                } else if (isWrongSelected) {
                  containerClasses =
                    "border-amber-400 bg-amber-50/70 text-slate-900";
                  letterClasses = "bg-amber-600 text-white border-amber-600";
                } else if (isDisabled) {
                  containerClasses =
                    "border-slate-200 bg-slate-50/60 text-slate-500";
                  letterClasses = "bg-slate-100 text-slate-400 border-slate-200";
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onSubmitMcqOption(currentIndex, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${containerClasses} ${
                      isDisabled ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className={`w-7 h-7 rounded-md border font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${letterClasses}`}
                      >
                        {OPTION_LETTERS[optIdx]}
                      </span>
                      <span className="text-[15px] leading-relaxed font-medium">
                        {optionText}
                      </span>
                    </div>

                    {isConfirmedCorrect && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        <span>Correct</span>
                      </span>
                    )}

                    {isWrongSelected && !isConfirmedCorrect && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 whitespace-nowrap shrink-0 mt-1">
                        <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                        <span>Needs Rethinking</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isSubmittingAnswer && (
              <div className="flex items-center gap-2.5 text-sm text-slate-600 pt-1">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" aria-hidden="true" />
                <span>Checking your answer...</span>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Critical Socratic Reflection Flow (shown when wrong option picked) */}
            {currentProgress.whyIncorrect && (
              <div className="pt-6 border-t border-slate-200 space-y-6">
                {/* 1. Explanation of why the chosen answer is incorrect (without revealing the right choice) */}
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                    <span>Why your chosen answer isn&apos;t quite right</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {currentProgress.whyIncorrect}
                  </p>
                </div>

                {/* 2. Guiding follow-up question dialogue */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
                    <HelpCircle className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                    <span>Guiding Follow-Up</span>
                  </div>

                  <div className="space-y-3">
                    {currentProgress.dialogue.map((entry) => {
                      if (entry.role === "tutor") {
                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5"
                          >
                            {entry.feedback && (
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {entry.feedback}
                              </p>
                            )}
                            {entry.question && (
                              <p className="text-[15px] font-semibold text-slate-900 leading-relaxed">
                                {entry.question}
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={entry.id}
                          className="ml-6 rounded-xl bg-blue-50/60 border border-blue-200 px-4 py-3"
                        >
                          <p className="text-xs font-medium text-blue-800 mb-0.5">Your answer</p>
                          <p className="text-sm text-slate-900">{entry.answer}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Follow-up input form (only while awaiting follow-up) */}
                  {isAwaitingFollowUp && (
                    <form onSubmit={handleFollowUpSubmit} className="space-y-3 pt-1">
                      <label htmlFor="followup-input" className="sr-only">
                        Your answer to the guiding question
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          id="followup-input"
                          type="text"
                          value={followUpInput}
                          onChange={(e) => setFollowUpInput(e.target.value)}
                          disabled={isSubmittingFollowUp}
                          placeholder="Type your answer to the guiding question..."
                          className="flex-1 px-4 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 outline-none min-h-[44px]"
                        />
                        <button
                          type="submit"
                          disabled={!followUpInput.trim() || isSubmittingFollowUp}
                          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
                        >
                          {isSubmittingFollowUp ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                              <span>Evaluating...</span>
                            </>
                          ) : (
                            <>
                              <span>Check Reasoning</span>
                              <Send className="w-4 h-4" aria-hidden="true" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation & Next Question (ONLY after answering directly OR answering follow-up correctly) */}
            {isResolved && currentProgress.correctExplanation && (
              <div className="pt-4 border-t border-slate-200 space-y-5">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>
                      {currentProgress.status === "resolved_socratic"
                        ? "Well reasoned — Correct Answer Confirmed"
                        : "Correct Answer Confirmed"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {currentProgress.correctExplanation}
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onAdvanceNext}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px]"
                  >
                    <span>{isLastQuestion ? "View Quiz Summary" : "Next Question"}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Reference Rail: Concept Checklist & Study Notes Reference */}
        <aside className="lg:col-span-4 space-y-6">
          {/* 5-Question Concept Checklist */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Quiz Roadmap
            </h2>
            <ul className="divide-y divide-slate-100">
              {questions.map((q, idx) => {
                const p = progress[idx];
                const isCurrent = idx === currentIndex;
                const isLocked = idx > maxUnlockedIndex;
                let stateText = "Pending";
                let stateColor = "text-slate-400";

                if (p.status === "resolved_direct") {
                  stateText = "First Try";
                  stateColor = "text-emerald-700";
                } else if (p.status === "resolved_socratic") {
                  stateText = "Guided";
                  stateColor = "text-emerald-700";
                } else if (p.status === "awaiting_followup") {
                  stateText = "Reflecting";
                  stateColor = "text-amber-700";
                } else if (isCurrent) {
                  stateText = "Active";
                  stateColor = "text-blue-700";
                }

                return (
                  <li key={q.index}>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) onSelectQuestionIndex(idx);
                      }}
                      className={`w-full py-2.5 flex items-center justify-between gap-3 text-left text-xs transition-colors ${
                        isCurrent ? "font-semibold text-slate-900" : "text-slate-600"
                      } ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:text-slate-900"}`}
                    >
                      <span className="truncate">
                        <span className="font-mono tabular-nums mr-2 text-slate-400">
                          0{idx + 1}
                        </span>
                        {q.keyConcept}
                      </span>
                      <span className={`font-medium shrink-0 ${stateColor}`}>{stateText}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Study Notes Reference */}
          <div
            id="study-notes-reference"
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Your Study Notes
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesOnMobile((prev) => !prev)}
                className="lg:hidden inline-flex items-center gap-1 text-xs font-medium text-blue-700"
              >
                <span>{showNotesOnMobile ? "Hide" : "Show"}</span>
                {showNotesOnMobile ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <div
              className={`${
                showNotesOnMobile ? "block" : "hidden lg:block"
              } max-h-[380px] overflow-y-auto pr-1 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-3`}
            >
              {notes}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
