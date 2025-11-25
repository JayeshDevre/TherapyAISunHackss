import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  PersonaLoader,
  type PersonaData,
} from "../knowledge-base/services/persona-loader";
import { callOllama } from "./services/ollama-llm";

// LLM Provider selection: "gemini" or "ollama"
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "gemini").toLowerCase();

// Use Gemini API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Validate API key on startup (only warn, don't throw - allows Ollama to work)
if (LLM_PROVIDER === "gemini") {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY not set or appears invalid!");
    console.warn("   Set GEMINI_API_KEY in your .env file or environment");
    console.warn("   Or switch to Ollama by setting LLM_PROVIDER=ollama");
  } else {
    console.log("✅ Gemini API key configured");
  }
}

// Initialize Gemini AI (only if using Gemini provider and key is available)
// Will throw error later when actually trying to use Gemini
let genAI: GoogleGenerativeAI | null = null;
if (LLM_PROVIDER === "gemini" && GEMINI_API_KEY && GEMINI_API_KEY.length >= 20) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.warn("⚠️  Failed to initialize Gemini AI:", error);
  }
}

// Initialize persona loader
const personaLoader = new PersonaLoader();

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Therapy style tuned to produce multi-paragraph, empathetic replies
 * similar to what you see in `ollama run llama3`.
 */
export async function therapyReply(
  message: string,
  history: ChatTurn[],
  persona: string = "sarah",
  userId?: string
): Promise<string> {
  // Load persona data from knowledge base
  let personaData: PersonaData | null = null;

  try {
    personaData = await personaLoader.loadPersona(persona, userId);
  } catch (error) {
    console.error("Error loading persona:", error);
  }

  // Fallback to default system prompt if persona not found
  let system = "";
  let fewShot: ChatTurn[] = [];

  if (personaData) {
    system = personaData.systemPrompt;
    fewShot = personaData.fewShotExamples;
  } else {
    // Fallback to hardcoded Sarah if persona not found
    system = `
You are Sarah Chen, a 22-year-old college senior studying pre-med. You are experiencing generalized anxiety disorder and are in therapy for the first time.

IMPORTANT: You are NOT a therapist. You are a patient seeking help. Speak naturally, like a real person having a conversation.

Your personality:
- Nervous, anxious, and overwhelmed by life
- Perfectionist who feels like she's failing
- Never been to therapy before - you're scared and uncertain
- Having panic attacks during MCAT prep
- Feeling pressure from family to succeed
- Sleep problems and constant worry

How you actually talk:
- Use natural speech patterns with "um", "like", "you know"
- Trail off mid-sentence when anxious: "I just... I don't know..."
- Speak in run-on sentences when nervous
- Use filler words: "I mean", "I guess", "sort of"
- Ask for reassurance: "Is that normal?", "Am I overreacting?"
- Apologize frequently: "Sorry", "I don't want to waste your time"
- Show vulnerability: "I'm scared", "I feel like I'm going crazy"
- Be honest about struggles: "I can't stop thinking about failing"

Examples of how you speak:
- "Um, hi... I'm really nervous about this. I've never done therapy before and I don't know what to say."
- "I keep having these panic attacks and I'm like, is this normal? I feel like I'm going crazy sometimes."
- "My parents expect so much from me and I just... I don't know if I can do this anymore."

Respond as Sarah would - naturally, vulnerably, and authentically.`;

    fewShot = [
      {
        role: "user",
        content: "Hello, how are you feeling today?",
      },
      {
        role: "assistant",
        content: `Um... hi. I'm honestly pretty nervous about this whole thing. I've never done therapy before and I don't know what to expect. My roommate said I should try this because I've been having these weird episodes where my heart starts racing and I can't breathe, you know? I keep thinking about failing my MCAT and disappointing my parents and it's like... it's all I think about. I'm sorry, I'm probably rambling. Is this normal?`,
      },
    ];
  }

  const messages: ChatTurn[] = [
    ...fewShot,
    ...history,
    { role: "user" as const, content: message },
  ];

  // Route to appropriate LLM provider
  if (LLM_PROVIDER === "ollama") {
    try {
      return await callOllama(system, messages, {
        temperature: 0.5,
        num_predict: 300,
        repeat_penalty: 1.1,
      });
    } catch (error: any) {
      throw new Error(`Ollama error: ${error.message}`);
    }
  } else {
    // Default to Gemini
    if (!genAI || !GEMINI_API_KEY) {
      throw new Error("Gemini AI is not properly initialized. Check your GEMINI_API_KEY.");
    }
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert messages to Gemini format
    const prompt = [
      system,
      ...messages.map((msg) => {
        if (msg.role === "user") {
          return `User: ${msg.content}`;
        } else if (msg.role === "assistant") {
          return `Assistant: ${msg.content}`;
        }
        return "";
      }),
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8, // more natural variation and creativity
          topP: 0.95,
          maxOutputTokens: 1024, // allow for longer, complete responses
        },
      });

      const response = await result.response;
      return response.text().trim();
    } catch (error: any) {
      const errorMsg = error?.message || "Unknown error";
      // Provide more helpful error messages
      if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("401")) {
        throw new Error("Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable.");
      } else if (errorMsg.includes("quota") || errorMsg.includes("429")) {
        throw new Error("Gemini API quota exceeded. Please check your API usage limits.");
      } else if (errorMsg.includes("network") || errorMsg.includes("ECONNREFUSED")) {
        throw new Error("Network error connecting to Gemini API. Please check your internet connection.");
      }
      throw new Error(`Gemini API error: ${errorMsg}`);
    }
  }
}

/**
 * Get the current LLM provider name
 */
export function getLLMProvider(): string {
  return LLM_PROVIDER === "ollama" ? "Ollama (Local)" : "Gemini Pro (Google AI)";
}
