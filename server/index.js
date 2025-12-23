
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// Helper to extract JSON object text from arbitrary text
const extractJSONFromText = (text) => {
  if (!text) return null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (e) {
    console.error('Failed to parse JSON from text:', e, text);
    return null;
  }
};

app.post('/api/lookup-train', async (req, res) => {
  const { trainNumber } = req.body || {};
  if (!trainNumber) return res.status(400).json({ success: false, error: 'trainNumber required' });

  try {
    // Fix: Create a new GoogleGenAI instance for each request to ensure fresh configuration
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Fix: Use gemini-3-flash-preview as per guidelines for text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the official schedule and route for Indian Railway Train Number "${trainNumber}".\nI need the exact Train Name, Source Station Name & Code, Destination Station Name & Code, Departure Time from Source, and Arrival Time at Destination.\n\nReturn ONLY a JSON object:\n{\n  "trainName": "Train Name",\n  "fromStation": "Station Name (Code)",\n  "toStation": "Station Name (Code)",\n  "departureTime": "HH:mm", \n  "arrivalTime": "HH:mm"\n}\n`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // Fix: Use .text property directly for generated content
    const text = response.text || '';
    const parsed = extractJSONFromText(text);

    if (!parsed) {
      return res.status(200).json({ success: false, error: 'no_parsed_json', raw: text });
    }

    // Always include grounding metadata when using googleSearch tool
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    return res.json({ success: true, data: parsed, grounding: groundingMetadata });
  } catch (e) {
    console.error('Server lookup error:', e);
    return res.status(500).json({ success: false, error: String(e) });
  }
});

app.listen(port, () => console.log(`GenAI proxy server listening on http://localhost:${port}`));
