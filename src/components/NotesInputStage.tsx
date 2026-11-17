import { FormEvent } from "react";
import { AlertCircle, ArrowRight, Eraser, Loader2 } from "lucide-react";
import { SAMPLE_NOTES, SampleNotePreset } from "../data/sampleNotes";

interface NotesInputStageProps {
  notes: string;
  onChangeNotes: (value: string) => void;
  onGenerateQuiz: () => void;
  isGenerating: boolean;
  errorMessage: string | null;
}

const MIN_CHARS = 40;

export function NotesInputStage({
  notes,
  onChangeNotes,
  onGenerateQuiz,
  isGenerating,
  errorMessage,
}: NotesInputStageProps) {
  const trimmedLength = notes.trim().length;
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const canSubmit = trimmedLength >= MIN_CHARS && !isGenerating;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onGenerateQuiz();
    }
  };

  const handleSelectSample = (preset: SampleNotePreset) => {
    onChangeNotes(preset.content);
    const editor = document.getElementById("notes-textarea");
    editor?.focus();
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Main Column: Study Notes Textarea & Submission */}
        <section id="notes-editor" className="lg:col-span-8 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-blue-700 tracking-wide">
              Active Recall · Guided Comprehension
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
              Test what you actually understand from your notes.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Paste your lecture notes, textbook summary, or reading below. Socratic Tutor will
              create a 5-question multiple-choice quiz and guide you through any missed concepts
              without giving away the answers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-100">
                <label
                  htmlFor="notes-textarea"
                  className="text-sm font-semibold text-slate-900"
                >
                  Study Notes
                </label>
                {notes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeNotes("")}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <textarea
                id="notes-textarea"
                value={notes}
                onChange={(e) => onChangeNotes(e.target.value)}
                disabled={isGenerating}
                rows={13}
                placeholder="Paste your study notes here (at least a short paragraph—for example, class notes on photosynthesis, historical causes, or an economic principle)..."
                className="w-full min-h-[320px] resize-y bg-transparent text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
              />

              <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono tabular-nums">
                <div className="flex items-center gap-2">
                  <span>{wordCount} words</span>
                  <span aria-hidden="true">·</span>
                  <span>{trimmedLength} characters</span>
                </div>
                <span>
                  {trimmedLength < MIN_CHARS
                    ? `${MIN_CHARS - trimmedLength} more characters needed`
                    : "Ready for 5-question quiz"}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Unable to generate quiz</p>
                  <p className="text-red-800 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-xs text-slate-500">
                Generates 5 multiple-choice questions strictly from your text.
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Generating 5-Question Quiz...</span>
                  </>
                ) : (
                  <>
                    <span>Generate 5-Question Quiz</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Socratic Method Overview & Sample Presets */}
        <aside className="lg:col-span-4 space-y-8 lg:pt-2">
          <section
            id="how-it-works"
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900">
              How Socratic Tutoring Works
            </h2>

            <ol className="space-y-4 text-sm">
              <li className="space-y-1">
                <p className="font-semibold text-slate-900">01. Five Focused Questions</p>
                <p className="text-slate-600 leading-relaxed">
                  Gemini reads your notes and builds a 5-question multiple-choice check around the
                  key ideas.
                </p>
              </li>
              <li className="pt-4 border-t border-slate-100 space-y-1">
                <p className="font-semibold text-slate-900">02. No Instant Spoilers</p>
                <p className="text-slate-600 leading-relaxed">
                  If you miss a question, the tutor withholds the right option, explains why your
                  pick fell short, and asks a simpler guiding question.
                </p>
              </li>
              <li className="pt-4 border-t border-slate-100 space-y-1">
                <p className="font-semibold text-slate-900">03. Earn the Confirmation</p>
                <p className="text-slate-600 leading-relaxed">
                  Once you answer the guiding question accurately, the tutor confirms the right
                  answer and unlocks the next question.
                </p>
              </li>
            </ol>
          </section>

          <section
            id="sample-notes"
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Try With Sample Notes
              </h2>
              <p className="text-xs text-slate-500">
                Load an example passage into the editor to test a quiz right away.
              </p>
            </div>

            <div className="space-y-2.5">
              {SAMPLE_NOTES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleSelectSample(preset)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 min-h-[44px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{preset.title}</span>
                    <span className="text-xs text-slate-500">{preset.subject}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
