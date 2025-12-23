
/**
 * JourneyConnect AI Service
 * All logic has been moved to the Node.js backend for security and production-readiness.
 */

// Base URL for the backend server
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

/**
 * Shared helper for backend API calls
 */
const callBackend = async (endpoint: string, payload: any) => {
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Server error');
  }

  return await response.json();
};

export const parseTicketIntent = async (text: string): Promise<any> => {
  if (!text || text.trim().length < 5) return null;
  try {
    return await callBackend('parse-ticket', { text });
  } catch (error) {
    console.error("Parse Error:", error);
    return null;
  }
};

export const findMatchesAI = async (query: string, availableTickets: any[]): Promise<string[]> => {
  if (!query) return [];
  try {
    const result = await callBackend('find-matches', { query, tickets: availableTickets });
    return result?.matchedIds || [];
  } catch (e) {
    console.error("Match Error:", e);
    return [];
  }
};

export const analyzeRouteMatches = async (userFrom: string, userTo: string, tickets: any[]): Promise<{ exact: string[], partial: string[] }> => {
  if (!userFrom || !userTo) return { exact: [], partial: [] };
  try {
    return await callBackend('analyze-route', { from: userFrom, to: userTo, tickets });
  } catch (e) {
    console.error("Route Error:", e);
    return { exact: [], partial: [] };
  }
};

export const lookupTrainInfo = async (trainNumber: string): Promise<any> => {
  if (trainNumber.length !== 5) return null;
  try {
    return await callBackend('lookup-train', { trainNumber });
  } catch (e) {
    console.error("Lookup Error:", e);
    return null;
  }
};

export const getUpdatedTrainTimings = async (trainNumber: string, fromStation: string, toStation: string): Promise<{ departureTime?: string, arrivalTime?: string } | null> => {
  if (!trainNumber || !fromStation || !toStation) return null;
  try {
    return await callBackend('get-train-timings', { trainNumber, from: fromStation, to: toStation });
  } catch (e) {
    console.error("Timings Error:", e);
    return null;
  }
};
