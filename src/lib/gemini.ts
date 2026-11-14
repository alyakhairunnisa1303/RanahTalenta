import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

let client: GoogleGenAI | null = null;
let clientApiKey: string | null = null;

function getClient(apiKey: string): GoogleGenAI {
  if (!client || clientApiKey !== apiKey) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
    clientApiKey = apiKey;
  }

  return client;
}

function extractJsonObject(rawText: string): unknown {
  const text = rawText.replace(/```(?:json)?/gi, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain a JSON object");
  }

  return JSON.parse(text.slice(start, end + 1));
}

export interface GenerateJsonOptions<T> {
  prompt: string;
  schema: z.ZodType<T>;
  fallback: T;
}

export async function generateJson<T>({
  prompt,
  schema,
  fallback,
}: GenerateJsonOptions<T>): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[gemini] GEMINI_API_KEY is not set; returning fallback");
    return fallback;
  }

  try {
    const response = await getClient(apiKey).models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const parsed = schema.safeParse(extractJsonObject(text));
    if (!parsed.success) {
      console.error(
        "[gemini] Response failed schema validation",
        parsed.error.issues,
      );
      return fallback;
    }

    return parsed.data;
  } catch (error) {
    console.error("[gemini] Request failed", error);
    return fallback;
  }
}
