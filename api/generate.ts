
// api/generate.ts
// Fix: Use import instead of require as per guidelines
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server API key missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt } = (await req.json()) as { prompt: string };

    // Fix: Always create a new GoogleGenAI instance inside the handler to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey });
    // Fix: Use gemini-3-flash-preview instead of prohibited gemini-1.5-flash
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Use .text property directly instead of calling .text() method
    const text = response.text;

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
