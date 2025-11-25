import "dotenv/config";
import fetch from "node-fetch";
import type { ChatTurn } from "../llm";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

export interface OllamaOptions {
  temperature?: number;
  num_predict?: number;
  repeat_penalty?: number;
}

/**
 * Call Ollama's chat API with therapy-tuned parameters
 */
export async function callOllama(
  systemPrompt: string,
  messages: ChatTurn[],
  options: OllamaOptions = {}
): Promise<string> {
  const {
    temperature = 0.5,
    num_predict = 300,
    repeat_penalty = 1.1,
  } = options;

  // Convert messages to Ollama format
  const ollamaMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));

  // Ollama expects system prompt in the messages array
  const requestBody = {
    model: OLLAMA_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...ollamaMessages,
    ],
    stream: false,
    options: {
      temperature,
      num_predict,
      repeat_penalty,
    },
  };

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    return data.message?.content?.trim() || "";
  } catch (error: any) {
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        `Cannot connect to Ollama at ${OLLAMA_BASE_URL}. Make sure Ollama is running: ollama serve`
      );
    }
    throw new Error(`Ollama error: ${error.message}`);
  }
}

/**
 * Check if Ollama is available and the model is installed
 */
export async function checkOllamaAvailability(): Promise<{
  available: boolean;
  modelInstalled: boolean;
  error?: string;
}> {
  try {
    // Check if Ollama service is running
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
    });

    if (!response.ok) {
      return {
        available: false,
        modelInstalled: false,
        error: `Ollama service returned ${response.status}`,
      };
    }

    const data = await response.json();
    const installedModels = data.models?.map((m: any) => m.name) || [];
    const modelInstalled = installedModels.some(
      (name: string) => name === OLLAMA_MODEL || name.startsWith(`${OLLAMA_MODEL}:`)
    );

    return {
      available: true,
      modelInstalled,
      error: modelInstalled
        ? undefined
        : `Model '${OLLAMA_MODEL}' not found. Run: ollama pull ${OLLAMA_MODEL}`,
    };
  } catch (error: any) {
    if (error.code === "ECONNREFUSED") {
      return {
        available: false,
        modelInstalled: false,
        error: `Ollama not running at ${OLLAMA_BASE_URL}. Start it with: ollama serve`,
      };
    }
    return {
      available: false,
      modelInstalled: false,
      error: error.message,
    };
  }
}

