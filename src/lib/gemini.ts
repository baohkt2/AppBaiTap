import "server-only";
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "./env";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: serverEnv().GEMINI_API_KEY });
  }
  return _client;
}

/**
 * Call Gemini with structured JSON output.
 */
export async function callGemini<T>(options: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
}): Promise<T> {
  const client = getClient();
  const model = serverEnv().GEMINI_MODEL;

  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
    config: {
      systemInstruction: options.systemPrompt,
      temperature: options.temperature ?? 0.4,
      responseMimeType: "application/json",
      responseSchema: options.responseSchema as never,
    },
  });

  const text = response.text ?? "";
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
