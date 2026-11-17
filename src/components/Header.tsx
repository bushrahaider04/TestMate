import { BookOpen, RotateCcw } from "lucide-react";

interface HeaderProps {
  stage: "input" | "quiz" | "summary";
  onReturnToNotes: () => void;
  onJumpToSection: (sectionId: string) => void;
}

export function Header({ stage, onReturnToNotes, onJumpToSection }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={onReturnToNotes}
          className="font-display text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          Socratic Tutor
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {stage === "input" ? (
            <>
              <button
                type="button"
                onClick={() => onJumpToSection("notes-editor")}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Study Notes
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection("how-it-works")}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection("sample-notes")}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Sample Notes
              </button>
            </>
          ) : stage === "quiz" ? (
            <>
              <button
                type="button"
                onClick={() => onJumpToSection("quiz-question-card")}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Active Question
              </button>
              <button
                type="button"
                onClick={() => onJumpToSection("study-notes-reference")}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Your Notes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onJumpToSection("quiz-summary-breakdown")}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Concept Breakdown
            </button>
          )}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {stage === "input" ? (
            <button
              type="button"
              onClick={() => onJumpToSection("notes-editor")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <BookOpen className="w-4 h-4 text-slate-600" aria-hidden="true" />
              <span>Paste Notes</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReturnToNotes}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>New Study Notes</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
