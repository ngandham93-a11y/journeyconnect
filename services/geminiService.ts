
import { GoogleGenAI, Type } from "@google/genai";

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

export const parseTicketIntent = async (text: string): Promise<any> => {
  if (!text || text.trim().length < 5) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract railway ticket details from the following text. 
      The text could be:
      1. Raw text copied from a ticket or status page.
      2. An SMS or WhatsApp message.
      3. A conversational request.

      Text: "${text}"
      
      Return a JSON object. 
      - Ensure dates are in YYYY-MM-DD format.
      - Extract Train Number, Name, Source, Destination, Date, Class.
      - If multiple dates/times are present, prefer the 'Departure' or 'Journey' date.
      - Infer standard IRCTC station codes if possible.
      - IMPORTANT: Times MUST be in HH:mm (24-hour) format.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trainNumber: { type: Type.STRING, description: "Train number if mentioned" },
            trainName: { type: Type.STRING, description: "Train name" },
            fromStation: { type: Type.STRING, description: "Origin station" },
            toStation: { type: Type.STRING, description: "Destination station" },
            date: { type: Type.STRING, description: "Date of travel YYYY-MM-DD" },
            classType: { type: Type.STRING, description: "Class like 1A, 2A, 3A, SL, CC" },
            type: { type: Type.STRING, description: "OFFER or REQUEST based on context" },
            price: { type: Type.NUMBER, description: "Price if mentioned" },
            departureTime: { type: Type.STRING, description: "Departure time in HH:mm (24h) format" }
          }
        }
      }
    });

    return extractJSON(response.text || "");
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};

export const findMatchesAI = async (query: string, availableTickets: any[]): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `I have a list of tickets: ${JSON.stringify(availableTickets)}.
      
      The user is searching for: "${query}".
      
      Task: Return a JSON object containing an array of 'matchedIds' (strings) that are the best matches. 
      
      CRITICAL MATCHING RULES:
      1. City Equivalence (Strict): Treat all stations in the same city as IDENTICAL.
         - Mumbai: CSMT = MMCT = BDTS = LTT = DR = PNVL = KYN
         - Delhi: NDLS = NZM = ANVT = DLI = DEE
         - Hyderabad: HYB = SC = KCG = LPI
         - Bangalore: SBC = YPR = SMVB
         - Kolkata: HWH = SDAH = KOAA
      2. Fuzzy Matching: Handle typos (e.g. "hyderabads" -> "Hyderabad", "bmbay" -> "Mumbai").
      3. Route Relevance: If user says "To Goa", tickets to Madgaon (MAO) or Thivim (THVM) are matches.
      
      Return ALL tickets that match the Origin City and Destination City, even if the specific station code is different.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    const result = extractJSON(response.text || "{}");
    return result?.matchedIds || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export const analyzeRouteMatches = async (userFrom: string, userTo: string, tickets: any[]): Promise<{ exact: string[], partial: string[] }> => {
  try {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     const simplifiedTickets = tickets.map(t => ({
         id: t.id,
         trainNumber: t.trainNumber,
         from: t.fromStation,
         to: t.toStation
     }));

     const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          User Request: Travel from "${userFrom}" to "${userTo}".
          Available Tickets: ${JSON.stringify(simplifiedTickets)}
          Task: Identify which tickets are valid based on Indian Railways network geography.
          Return JSON: { "exact": ["id1"], "partial": ["id3"] }
        `,
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
     
     const res = extractJSON(response.text || "{}") || {};
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: `Find the official schedule for Indian Railway Train Number "${trainNumber}".
        I need the exact Train Name, Source Station Name & Code, Destination Station Name & Code, Departure Time from Source, and Arrival Time at Destination.
        
        Return ONLY a JSON object:
        {
          "trainName": "Train Name",
          "fromStation": "Station Name (Code)",
          "toStation": "Station Name (Code)",
          "departureTime": "HH:mm", 
          "arrivalTime": "HH:mm"
        }
        
        CRITICAL: All times must be in HH:mm (24-hour format).
        `
      });
      
      return extractJSON(response.text || "");
    } catch (e) {
      console.error("Train Lookup Error:", e);
      return null;
    }
}

export const getUpdatedTrainTimings = async (trainNumber: string, fromStation: string, toStation: string): Promise<{ departureTime?: string, arrivalTime?: string } | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `Find the specific schedule for Indian Railway Train "${trainNumber}" between "${fromStation}" and "${toStation}".
      Return ONLY a JSON object: { "departureTime": "HH:mm", "arrivalTime": "HH:mm" }.
      Times must be strictly 24-hour HH:mm format.
      If data is not found, return null.
      `
    });

    return extractJSON(response.text || "");
  } catch (o) {
    console.error("Timing Update Error:", o);
    return null;
  }
}
