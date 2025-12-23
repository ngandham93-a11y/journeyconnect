
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

// Necessary for ES modules to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Key Validation
const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY environment variable is not set on the server.');
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * AI API Endpoints
 */
app.post('/api/parse-ticket', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text input required' });
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract railway ticket details from: "${text}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trainNumber: { type: Type.STRING },
            trainName: { type: Type.STRING },
            fromStation: { type: Type.STRING },
            toStation: { type: Type.STRING },
            date: { type: Type.STRING },
            classType: { type: Type.STRING },
            type: { type: Type.STRING },
            price: { type: Type.NUMBER },
            departureTime: { type: Type.STRING }
          }
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ error: 'AI Parsing failed' });
  }
});

app.post('/api/find-matches', async (req, res) => {
  const { query, tickets } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Match query "${query}" against tickets: ${JSON.stringify(tickets)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ error: 'AI Matching failed' });
  }
});

app.post('/api/analyze-route', async (req, res) => {
  const { from, to, tickets } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find matches for route ${from} to ${to} in: ${JSON.stringify(tickets)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exact: { type: Type.ARRAY, items: { type: Type.STRING } },
            partial: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ error: 'Route analysis failed' });
  }
});

app.post('/api/lookup-train', async (req, res) => {
  const { trainNumber } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Get schedule for Train ${trainNumber}`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trainName: { type: Type.STRING },
            fromStation: { type: Type.STRING },
            toStation: { type: Type.STRING },
            departureTime: { type: Type.STRING },
            arrivalTime: { type: Type.STRING }
          }
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ error: 'Train lookup failed' });
  }
});

app.post('/api/get-train-timings', async (req, res) => {
  const { trainNumber, from, to } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Get timings for Train ${trainNumber} from ${from} to ${to}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            departureTime: { type: Type.STRING },
            arrivalTime: { type: Type.STRING }
          }
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err) {
    res.status(500).json({ error: 'Timing retrieval failed' });
  }
});

/**
 * Production Static File Serving
 */
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all route to serve index.html for SPA (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`\x1b[32m✔ JourneyConnect Production Server running on http://localhost:${port}\x1b[0m`);
});
