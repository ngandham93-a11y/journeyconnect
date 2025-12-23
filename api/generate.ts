
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
    const { model, contents, config } = (await req.json());

    // Create a new GoogleGenAI instance for every request to ensure fresh state
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Default to gemini-3-flash-preview if no model specified
    const targetModel = model || 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: contents,
      config: config || {}
    });

    // Directly access .text property as per guidelines
    return new Response(JSON.stringify({ text: response.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Gemini Proxy Error:', err);
    return new Response(JSON.stringify({ 
      error: 'Generation failed', 
      details: err.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
