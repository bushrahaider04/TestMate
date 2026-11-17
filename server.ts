import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = "gemini-3.8-flash";
const MAX_SESSIONS = 200;
const MIN_NOTES_LENGTH = 40;
const MAX_NOTES_LENGTH = 30000;

interface StoredQuestion {
  index: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  correctExplanation: string;
  keyConcept: string;
}

interface FollowUpTurn {
  role: "tutor" | "student";
  text: string;
}

interface QuestionSessionState {
  status: "unanswered" | "awaiting_followup" | "resolved_direct" | "resolved_socratic";
  wrongSelectedIndex: number | null;
  whyIncorrect: string | null;
  activeGuidingQuestion: string | null;
  turns: FollowUpTurn[];
}

interface QuizSession {
  id: string;
  createdAt: number;
  notes: string;
  topicTitle: string;
  questions: StoredQuestion[];
  states: QuestionSessionState[];
}

const quizSessions = new Map<string, QuizSession>();

function pruneSessions() {
  if (quizSessions.size <= MAX_SESSIONS) return;
  const oldestKey = quizSessions.keys().next().value;
  if (oldestKey) {
    quizSessions.delete(oldestKey);
  }
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const errObj = error as { status?: number; message?: string };
      const status = errObj?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }
      if (attempt < maxAttempts) {
        const delayMs = 400 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

function formatApiError(error: unknown): { status: number; message: string } {
  if (error instanceof Error && error.message === "MISSING_API_KEY") {
    return {
      status: 500,
      message:
        "Gemini API key is not configured. Please check your key in the Settings > Secrets panel.",
    };
  }
  const errObj = error as { status?: number; message?: string };
  const msg = errObj?.message || "An unexpected error occurred while contacting Gemini.";
  if (errObj?.status === 403 || msg.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message:
        "Gemini API access was denied. Please verify your API key in the Settings > Secrets panel.",
    };
  }
  if (errObj?.status === 400 || msg.includes("API_KEY_INVALID")) {
    return {
      status: 400,
      message:
        "The configured Gemini API key appears invalid. Please update it in the Settings > Secrets panel.",
    };
  }
  if (errObj?.status === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message:
        "Rate limit reached on the Gemini API. Please wait a moment and try again.",
    };
  }
  return {
    status: 500,
    message: msg,
  };
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const rawNotes = typeof req.body?.notes === "string" ? req.body.notes : "";
      const notes = rawNotes.trim();

      if (notes.length < MIN_NOTES_LENGTH) {
        return res.status(400).json({
          error: `Please paste at least ${MIN_NOTES_LENGTH} characters of study notes so Socratic Tutor can build a meaningful 5-question quiz.`,
        });
      }

      const trimmedNotes =
        notes.length > MAX_NOTES_LENGTH ? notes.slice(0, MAX_NOTES_LENGTH) : notes;

      const ai = getGenAIClient();

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Create a 5-question multiple-choice quiz strictly grounded in the following study notes:\n\n"""\n${trimmedNotes}\n"""`,
          config: {
            systemInstruction: `You are an expert academic educator designing a diagnostic multiple-choice quiz.
Generate exactly 5 multiple-choice questions that test genuine comprehension (not trivial word-matching) of the provided study notes.
Rules:
1. Every question must be answerable directly from the study notes.
2. Each question must have exactly 4 distinct options. Do NOT include letter prefixes like "A)", "B.", or "1." inside the option strings.
3. Vary the position of correctIndex across 0, 1, 2, and 3 naturally so the correct choice isn't always in the same spot.
4. Make the distractors (wrong options) plausible misconceptions a student might actually choose.
5. Provide a concise 1-2 sentence 'correctExplanation' grounded in the notes, and a short 2-4 word 'keyConcept' label.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topicTitle: {
                  type: Type.STRING,
                  description: "A concise 2 to 6 word title summarizing the study notes.",
                },
                questions: {
                  type: Type.ARRAY,
                  description: "Exactly 5 multiple-choice questions.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Exactly 4 answer choices without A/B/C/D prefixes.",
                      },
                      correctIndex: {
                        type: Type.INTEGER,
                        description: "Zero-based index (0, 1, 2, or 3) of the single correct option.",
                      },
                      correctExplanation: {
                        type: Type.STRING,
                        description: "1-2 sentences explaining why the correct option is accurate according to the notes.",
                      },
                      keyConcept: {
                        type: Type.STRING,
                        description: "Short 2-4 word concept name tested by this question.",
                      },
                    },
                    required: [
                      "question",
                      "options",
                      "correctIndex",
                      "correctExplanation",
                      "keyConcept",
                    ],
                  },
                },
              },
              required: ["topicTitle", "questions"],
            },
          },
        })
      );

      const rawJson = (response.text ?? "").trim();
      if (!rawJson) {
        return res.status(502).json({
          error: "Gemini returned an empty response. Please try again.",
        });
      }

      const parsed = JSON.parse(rawJson) as {
        topicTitle?: string;
        questions?: Array<{
          question?: string;
          options?: string[];
          correctIndex?: number;
          correctExplanation?: string;
          keyConcept?: string;
        }>;
      };

      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : [];
      if (rawQuestions.length !== 5) {
        return res.status(502).json({
          error: "Could not generate a complete 5-question quiz from those notes. Please try adding a bit more detail.",
        });
      }

      const normalizedQuestions: StoredQuestion[] = rawQuestions.map((q, idx) => {
        const opts = Array.isArray(q.options) ? q.options.slice(0, 4).map((o) => String(o).trim()) : [];
        while (opts.length < 4) {
          opts.push(`Option ${opts.length + 1}`);
        }
        const rawIdx = typeof q.correctIndex === "number" ? Math.round(q.correctIndex) : 0;
        const safeCorrectIndex = Math.max(0, Math.min(3, rawIdx));

        return {
          index: idx,
          question: String(q.question || `Question ${idx + 1}`).trim(),
          options: [opts[0], opts[1], opts[2], opts[3]],
          correctIndex: safeCorrectIndex,
          correctExplanation: String(
            q.correctExplanation || "This aligns directly with the concepts in your study notes."
          ).trim(),
          keyConcept: String(q.keyConcept || "Core Concept").trim(),
        };
      });

      const sessionId = crypto.randomUUID();
      const topicTitle = String(parsed.topicTitle || "Study Notes Quiz").trim();

      const session: QuizSession = {
        id: sessionId,
        createdAt: Date.now(),
        notes: trimmedNotes,
        topicTitle,
        questions: normalizedQuestions,
        states: normalizedQuestions.map(() => ({
          status: "unanswered",
          wrongSelectedIndex: null,
          whyIncorrect: null,
          activeGuidingQuestion: null,
          turns: [],
        })),
      };

      quizSessions.set(sessionId, session);
      pruneSessions();

      return res.json({
        sessionId,
        topicTitle,
        questions: normalizedQuestions.map((q) => ({
          index: q.index,
          question: q.question,
          options: q.options,
          keyConcept: q.keyConcept,
        })),
      });
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post("/api/quiz/answer", async (req, res) => {
    try {
      const { sessionId, questionIndex, selectedIndex } = req.body ?? {};
      const session = typeof sessionId === "string" ? quizSessions.get(sessionId) : undefined;

      if (!session) {
        return res.status(404).json({
          error: "Quiz session expired or not found. Please generate a new quiz from your notes.",
          code: "SESSION_EXPIRED",
        });
      }

      if (
        typeof questionIndex !== "number" ||
        questionIndex < 0 ||
        questionIndex >= session.questions.length
      ) {
        return res.status(400).json({ error: "Invalid question index." });
      }

      if (typeof selectedIndex !== "number" || selectedIndex < 0 || selectedIndex > 3) {
        return res.status(400).json({ error: "Invalid option selected." });
      }

      const q = session.questions[questionIndex];
      const qState = session.states[questionIndex];

      if (qState.status === "resolved_direct" || qState.status === "resolved_socratic") {
        return res.json({
          isCorrect: true,
          correctIndex: q.correctIndex,
          correctExplanation: q.correctExplanation,
        });
      }

      if (qState.status === "awaiting_followup") {
        return res.json({
          isCorrect: false,
          wrongSelectedIndex: qState.wrongSelectedIndex,
          whyIncorrect: qState.whyIncorrect,
          guidingQuestion: qState.activeGuidingQuestion,
        });
      }

      if (selectedIndex === q.correctIndex) {
        qState.status = "resolved_direct";
        return res.json({
          isCorrect: true,
          correctIndex: q.correctIndex,
          correctExplanation: q.correctExplanation,
        });
      }

      const ai = getGenAIClient();
      const optionsList = q.options
        .map((opt, idx) => `${OPTION_LETTERS[idx]}. ${opt}`)
        .join("\n");

      const prompt = `Study Notes:
"""
${session.notes}
"""

Original Multiple-Choice Question:
${q.question}

Options:
${optionsList}

Student's Selected (Incorrect) Option:
${OPTION_LETTERS[selectedIndex]}. ${q.options[selectedIndex]}

[FOR TUTOR INTERNAL CONTEXT ONLY — NEVER REVEAL THIS TO THE STUDENT]:
The actual correct option is ${OPTION_LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}
Explanation of truth: ${q.correctExplanation}`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction: `You are Socratic Tutor, a warm and incisive educator.
The student just selected an INCORRECT answer to a multiple-choice question.
CRITICAL RULES:
1. NEVER reveal, quote, name, or hint directly at which letter (A, B, C, or D) or text is the correct choice.
2. 'whyIncorrect': In 2-3 clear, respectful sentences grounded in the study notes, explain WHY the student's chosen answer is incorrect or misunderstands the text.
3. 'guidingQuestion': Ask ONE simpler, focused, guiding follow-up question that helps the student recall the key fact or relationship from the study notes so they can rethink their choice. Make it answerable in a short phrase or 1 sentence.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                whyIncorrect: {
                  type: Type.STRING,
                  description:
                    "Clear explanation of why the chosen option is wrong, without revealing the correct option.",
                },
                guidingQuestion: {
                  type: Type.STRING,
                  description:
                    "A simpler guiding follow-up question to help the student reason toward the concept.",
                },
              },
              required: ["whyIncorrect", "guidingQuestion"],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? "{}").trim()) as {
        whyIncorrect?: string;
        guidingQuestion?: string;
      };

      const whyIncorrect =
        parsed.whyIncorrect?.trim() ||
        "That option does not align with what your study notes describe for this concept.";
      const guidingQuestion =
        parsed.guidingQuestion?.trim() ||
        "Looking back at your notes on this topic, what key mechanism or cause actually drives this process?";

      qState.status = "awaiting_followup";
      qState.wrongSelectedIndex = selectedIndex;
      qState.whyIncorrect = whyIncorrect;
      qState.activeGuidingQuestion = guidingQuestion;
      qState.turns.push({ role: "tutor", text: guidingQuestion });

      return res.json({
        isCorrect: false,
        wrongSelectedIndex: selectedIndex,
        whyIncorrect,
        guidingQuestion,
      });
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.post("/api/quiz/followup", async (req, res) => {
    try {
      const { sessionId, questionIndex, studentResponse } = req.body ?? {};
      const session = typeof sessionId === "string" ? quizSessions.get(sessionId) : undefined;

      if (!session) {
        return res.status(404).json({
          error: "Quiz session expired or not found. Please generate a new quiz from your notes.",
          code: "SESSION_EXPIRED",
        });
      }

      if (
        typeof questionIndex !== "number" ||
        questionIndex < 0 ||
        questionIndex >= session.questions.length
      ) {
        return res.status(400).json({ error: "Invalid question index." });
      }

      const trimmedAnswer = typeof studentResponse === "string" ? studentResponse.trim() : "";
      if (!trimmedAnswer) {
        return res.status(400).json({
          error: "Please enter a brief answer to the guiding question before submitting.",
        });
      }

      const q = session.questions[questionIndex];
      const qState = session.states[questionIndex];

      if (qState.status === "resolved_direct" || qState.status === "resolved_socratic") {
        return res.json({
          isFollowUpCorrect: true,
          feedback: "You have already resolved this question.",
          correctIndex: q.correctIndex,
          correctExplanation: q.correctExplanation,
        });
      }

      if (qState.status !== "awaiting_followup" || !qState.activeGuidingQuestion) {
        return res.status(400).json({
          error: "Please select an answer to the multiple-choice question first.",
        });
      }

      const ai = getGenAIClient();
      const turnHistory = qState.turns
        .map((t) => `${t.role === "tutor" ? "Tutor Question" : "Student Answer"}: ${t.text}`)
        .join("\n");

      const prompt = `Study Notes:
"""
${session.notes}
"""

Original Multiple-Choice Question:
${q.question}

Student's Earlier Wrong Choice:
${qState.wrongSelectedIndex !== null ? `${OPTION_LETTERS[qState.wrongSelectedIndex]}. ${q.options[qState.wrongSelectedIndex]}` : "Unknown"}

[FOR TUTOR INTERNAL CONTEXT ONLY]:
Correct MCQ Option: ${OPTION_LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}
Core Explanation: ${q.correctExplanation}

Guiding Dialogue So Far:
${turnHistory}

Current Guiding Question:
${qState.activeGuidingQuestion}

Student's Latest Response:
"${trimmedAnswer}"`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction: `You are Socratic Tutor evaluating a student's response to your guiding follow-up question.
Evaluate fairly:
- Set 'isFollowUpCorrect' to true if the student's response accurately answers the guiding question (accept concise, paraphrased, or informal phrasing as long as the core concept is right).
- Set 'isFollowUpCorrect' to false if the response is factually wrong based on the notes, repeats the misconception, says "I don't know", or misses the key point of the guiding question.

When 'isFollowUpCorrect' is TRUE:
- 'feedback': Write 1-2 encouraging sentences confirming their reasoning and explicitly connecting it to why "${q.options[q.correctIndex]}" is the right answer to the original question.
- 'nextGuidingQuestion': Set to empty string "".

When 'isFollowUpCorrect' is FALSE:
- CRITICAL RULE: Do NOT reveal which multiple-choice option is correct.
- 'feedback': Gently explain in 1-2 sentences what is still off or missing in their response based on the notes.
- 'nextGuidingQuestion': Ask an even simpler, clearer guiding question (or give a strong contextual clue followed by a simple question) so the student can succeed on the next try.`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isFollowUpCorrect: {
                  type: Type.BOOLEAN,
                  description: "True if the student answered the guiding question accurately.",
                },
                feedback: {
                  type: Type.STRING,
                  description: "Tutor feedback on the student's follow-up response.",
                },
                nextGuidingQuestion: {
                  type: Type.STRING,
                  description:
                    "Simpler guiding follow-up question if isFollowUpCorrect is false; empty string if true.",
                },
              },
              required: ["isFollowUpCorrect", "feedback", "nextGuidingQuestion"],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? "{}").trim()) as {
        isFollowUpCorrect?: boolean;
        feedback?: string;
        nextGuidingQuestion?: string;
      };

      const isFollowUpCorrect = Boolean(parsed.isFollowUpCorrect);
      const feedback =
        parsed.feedback?.trim() ||
        (isFollowUpCorrect
          ? "Exactly right — that reasoning points directly to the correct answer."
          : "Not quite yet — take another look at how your study notes describe this step.");

      qState.turns.push({ role: "student", text: trimmedAnswer });

      if (isFollowUpCorrect) {
        qState.status = "resolved_socratic";
        return res.json({
          isFollowUpCorrect: true,
          feedback,
          correctIndex: q.correctIndex,
          correctExplanation: q.correctExplanation,
        });
      }

      const nextGuidingQuestion =
        parsed.nextGuidingQuestion?.trim() ||
        "Let's narrow it down further: according to your notes, what happens right before this step?";

      qState.activeGuidingQuestion = nextGuidingQuestion;
      qState.turns.push({ role: "tutor", text: nextGuidingQuestion });

      return res.json({
        isFollowUpCorrect: false,
        feedback,
        nextGuidingQuestion,
      });
    } catch (error) {
      const { status, message } = formatApiError(error);
      return res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Socratic Tutor server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Socratic Tutor server:", err);
  process.exit(1);
});
