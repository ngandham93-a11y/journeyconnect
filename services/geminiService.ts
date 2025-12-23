
import { Type } from "@google/genai";

// Helper to reliably extract JSON from markdown or conversational text
const extractJSON = (text: string): any => {
    try {
        if (!text) return null;
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        if (cleanText.toLowerCase() === 'null') return null;

        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }

        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Extraction Failed:", e, "Input:", text);
        return null;
    }
};

/**
 * Generic caller for our Vercel Serverless Function proxy
 */
const callAiProxy = async (payload: { model: string, contents: any, config?: any }) => {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || 'AI request failed');
    }
    
    return await response.json();
};

export const parseTicketIntent = async (text: string): Promise<any> => {
  if (!text || text.trim().length < 5) return null;

  try {
    const result = await callAiProxy({
      model: "gemini-3-flash-preview",
      contents: `Extract railway ticket details from the following text. 
      Text: "${text}"
      Return a JSON object with trainNumber, trainName, fromStation, toStation, date (YYYY-MM-DD), classType (1A, 2A, 3A, SL, CC), type (OFFER/REQUEST), price, departureTime (HH:mm).`,
      config: {
        responseMimeType: "application/json",
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

    return extractJSON(result.text || "");
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};

export const findMatchesAI = async (query: string, availableTickets: any[]): Promise<string[]> => {
  try {
    const result = await callAiProxy({
      model: "gemini-3-flash-preview",
      contents: `I have a list of tickets: ${JSON.stringify(availableTickets)}.
      The user is searching for: "${query}".
      Return a JSON object with 'matchedIds' (array of strings). 
      Rules: Treat city stations as identical (e.g., Mumbai CSMT = PNVL), handle typos, and check route relevance.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedIds: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    
    const parsed = extractJSON(result.text || "{}");
    return parsed?.matchedIds || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export const analyzeRouteMatches = async (userFrom: string, userTo: string, tickets: any[]): Promise<{ exact: string[], partial: string[] }> => {
  try {
     const simplifiedTickets = tickets.map(t => ({
         id: t.id,
         trainNumber: t.trainNumber,
         from: t.fromStation,
         to: t.toStation
     }));

     const result = await callAiProxy({
        model: "gemini-3-flash-preview",
        contents: `User Request: Travel from "${userFrom}" to "${userTo}".
          Available Tickets: ${JSON.stringify(simplifiedTickets)}
          Return JSON: { "exact": ["id1"], "partial": ["id3"] } based on route geography.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    exact: { type: Type.ARRAY, items: { type: Type.STRING } },
                    partial: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
     });
     
     const res = extractJSON(result.text || "{}") || {};
     return {
        exact: res.exact || [],
        partial: res.partial || []
     };
  } catch (e) {
      console.error("Route Analysis Error", e);
      return { exact: [], partial: [] };
  }
}

export const lookupTrainInfo = async (trainNumber: string): Promise<any> => {
    try {
      const result = await callAiProxy({
        model: "gemini-3-flash-preview", 
        contents: `Find official schedule for Indian Railway Train "${trainNumber}".
        Return JSON: { "trainName", "fromStation", "toStation", "departureTime" (HH:mm), "arrivalTime" (HH:mm) }.`,
        config: {
            responseMimeType: "application/json"
        }
      });
      
      return extractJSON(result.text || "");
    } catch (e) {
      console.error("Train Lookup Error:", e);
      return null;
    }
}

export const getUpdatedTrainTimings = async (trainNumber: string, fromStation: string, toStation: string): Promise<{ departureTime?: string, arrivalTime?: string } | null> => {
  try {
    const result = await callAiProxy({
      model: "gemini-3-flash-preview", 
      contents: `Find schedule for Train "${trainNumber}" between "${fromStation}" and "${toStation}".
      Return JSON: { "departureTime": "HH:mm", "arrivalTime": "HH:mm" }.`,
      config: {
          responseMimeType: "application/json"
      }
    });

    return extractJSON(result.text || "");
  } catch (o) {
    console.error("Timing Update Error:", o);
    return null;
  }
}
