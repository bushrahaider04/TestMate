import { CheckCircle2, HelpCircle, RefreshCw, RotateCcw } from "lucide-react";
import { PublicQuestion, QuestionProgress } from "../types/quiz";

interface QuizSummaryProps {
  topicTitle: string;
  questions: PublicQuestion[];
  progress: QuestionProgress[];
  onRetakeSameNotes: () => void;
  onStartNewNotes: () => void;
  isRegenerating: boolean;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export function QuizSummary({
  topicTitle,
  questions,
  progress,
  onRetakeSameNotes,
  onStartNewNotes,
  isRegenerating,
}: QuizSummaryProps) {
  const directCount = progress.filter((p) => p.status === "resolved_direct").length;
  const socraticCount = progress.filter((p) => p.status === "resolved_socratic").length;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-medium text-emerald-700">
          Session Complete · {topicTitle}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          All 5 concepts resolved.
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Here is a breakdown of what you knew immediately and what you reasoned through with
          Socratic guidance.
        </p>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Answered on First Try</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {directCount} / {questions.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Mastered via Follow-Up</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {socraticCount} / {questions.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
          <p className="text-xs font-medium text-slate-500">Total Completed</p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-emerald-700">
            {questions.length} / {questions.length}
          </p>
        </div>
      </div>

      {/* Breakdown List */}
      <section
        id="quiz-summary-breakdown"
        className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200"
      >
        {questions.map((q, idx) => {
          const p = progress[idx];
          const wasGuided = p.status === "resolved_socratic";
          const correctLetter =
            p.correctIndex !== null ? OPTION_LETTERS[p.correctIndex] : "—";
          const correctText =
            p.correctIndex !== null ? q.options[p.correctIndex] : "";

          return (
            <div key={q.index} className="p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    Question 0{idx + 1}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{q.keyConcept}</span>
                </div>

                {wasGuided ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                    <span>Resolved via Socratic Follow-Up</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Answered Directly</span>
                  </span>
                )}
              </div>

              <h2 className="font-display text-lg font-semibold text-slate-900">
                {q.question}
              </h2>

              <p className="text-sm font-medium text-emerald-900">
                <span className="font-mono mr-1.5">{correctLetter}.</span>
                {correctText}
              </p>

              {p.correctExplanation && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {p.correctExplanation}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onStartNewNotes}
          disabled={isRegenerating}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[44px]"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Paste New Notes</span>
        </button>

        <button
          type="button"
          onClick={onRetakeSameNotes}
          disabled={isRegenerating}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px]"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>
            {isRegenerating ? "Generating New Quiz..." : "Generate Fresh Quiz on These Notes"}
          </span>
        </button>
      </div>
    </main>
  );
}
