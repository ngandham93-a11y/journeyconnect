
import { Ticket, TicketType, TicketStatus, TrainClass } from "../types";
import { GOOGLE_SCRIPT_URL } from "./constants";

const STORAGE_KEY = 'journeyconnect_tickets_v3';

/**
 * Calculates duration between two HH:mm strings
 */
export const calculateDuration = (dep: string, arr: string): string => {
    if (!dep || !arr || !dep.includes(':') || !arr.includes(':')) return "0h 00m";
    try {
        const [h1, m1] = dep.split(':').map(Number);
        const [h2, m2] = arr.split(':').map(Number);
        
        let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Overnight
        
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    } catch (e) {
        return "0h 00m";
    }
};

const formatTimeStr = (val: any): string => {
    if (!val) return '--:--';
    const str = String(val).trim();
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'Asia/Kolkata'
            });
        }
    }
    const timeMatch = str.match(/^(\d{1,2}:\d{2})/);
    if (timeMatch) {
        const parts = timeMatch[1].split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1]}`;
    }
    return str === 'undefined' || str === 'null' ? '--:--' : str;
};

const getFlexValue = (obj: any, targetKey: string) => {
    if (!obj) return undefined;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTarget = normalize(targetKey);
    if (obj[targetKey] !== undefined) return obj[targetKey];
    const foundKey = Object.keys(obj).find(k => normalize(k) === normalizedTarget);
    if (foundKey) return obj[foundKey];
    const aliases: Record<string, string[]> = {
        trainNumber: ['trainno', 'no', 'number', 'trainnumber', 'slno', 'trainnum'],
        fromStation: ['source', 'from', 'origin', 'start', 'boarding', 'src'],
        toStation: ['destination', 'to', 'dest', 'end', 'arrival', 'dst'],
        classType: ['class', 'coach', 'berth', 'classtype', 'cl'],
        userContact: ['phone', 'contact', 'mobile', 'whatsapp', 'phone_number'],
        sellerName: ['name', 'seller', 'user', 'postedby', 'name_of_seller'],
        price: ['price', 'fare', 'cost', 'amount', 'rate'],
        departureTime: ['dep', 'deptime', 'departure', 'start_time'],
        arrivalTime: ['arr', 'arrtime', 'arrival', 'end_time'],
        duration: ['dur', 'traveltime', 'time', 'totaltime']
    };
    if (aliases[targetKey]) {
        const aliasKey = Object.keys(obj).find(k => aliases[targetKey].includes(normalize(k)));
        if (aliasKey) return obj[aliasKey];
    }
    return undefined;
};

const callSheetAPI = async (action: string, data?: any): Promise<any> => {
    if (GOOGLE_SCRIPT_URL.includes("INSERT_YOUR_ID") || !GOOGLE_SCRIPT_URL.startsWith("http")) return null;
    try {
        const url = new URL(GOOGLE_SCRIPT_URL);
        url.searchParams.set('action', action); 
        let response = await fetch(url.toString(), {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...data })
        });
        const result = await response.json();
        if (action === 'getTickets' && result && result.success === false) {
            const getResponse = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
            return await getResponse.json();
        }
        return result;
    } catch (e) {
        return null;
    }
};

export const getStoredTickets = async (): Promise<Ticket[]> => {
  let serverTickets: Ticket[] = [];
  let apiSuccess = false;

  const todayIST = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  const result = await callSheetAPI('getTickets');
  
  if (result) {
      apiSuccess = true; // Any non-null response from API is success (prevents stale local fallback)
      let rawData: any[] = [];
      if (Array.isArray(result)) rawData = result;
      else if (result.success && Array.isArray(result.data)) rawData = result.data;
      else if (Array.isArray(result.tickets)) rawData = result.tickets;

      serverTickets = rawData.map((t: any, index: number) => {
          const trainNumber = String(getFlexValue(t, 'trainNumber') || '');
          const rawDate = getFlexValue(t, 'date');
          let date = (typeof rawDate === 'string' && rawDate.includes('T')) 
            ? new Date(rawDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
            : String(rawDate || '').split('T')[0];

          const dep = formatTimeStr(getFlexValue(t, 'departureTime'));
          const arr = formatTimeStr(getFlexValue(t, 'arrivalTime'));
          const dur = String(getFlexValue(t, 'duration') || calculateDuration(dep, arr));

          return {
              ...t,
              id: String(getFlexValue(t, 'id') || `gen_${trainNumber}_${date}_${index}`),
              userId: String(getFlexValue(t, 'userId') || 'system'),
              type: String(getFlexValue(t, 'type')).toUpperCase().includes('REQ') ? TicketType.REQUEST : TicketType.OFFER,
              trainName: String(getFlexValue(t, 'trainName') || 'Unknown'),
              trainNumber,
              fromStation: String(getFlexValue(t, 'fromStation') || ''),
              toStation: String(getFlexValue(t, 'toStation') || ''),
              date,
              departureTime: dep,
              arrivalTime: arr,
              duration: dur === '6h 00m' ? calculateDuration(dep, arr) : dur,
              classType: (getFlexValue(t, 'classType') || TrainClass.SL) as TrainClass,
              price: Number(String(getFlexValue(t, 'price') || 0).replace(/[^\d.]/g, '')),
              status: (getFlexValue(t, 'status') || TicketStatus.OPEN) as TicketStatus,
              createdAt: Number(getFlexValue(t, 'createdAt')) || Date.now(),
              userContact: String(getFlexValue(t, 'userContact') || ''),
              sellerName: String(getFlexValue(t, 'sellerName') || 'Anonymous'),
              isFlexibleDate: String(getFlexValue(t, 'isFlexibleDate')).toLowerCase() === 'true',
              isFlexibleClass: String(getFlexValue(t, 'isFlexibleClass')).toLowerCase() === 'true'
          };
      }).filter(t => t.trainNumber !== '');
  }

  if (apiSuccess) {
      // If API succeeded, use ONLY server data. Local storage is strictly a cache of server.
      const activeTickets = serverTickets.filter(t => t.date >= todayIST);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeTickets));
      return activeTickets;
  } else {
      // If API failed, use local cache as backup
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored).filter((t: any) => t.date >= todayIST) : [];
      } catch (e) { return []; }
  }
};

export const saveTicket = async (ticket: Ticket): Promise<boolean> => {
  const result = await callSheetAPI('addTicket', { ticket });
  if (result?.success) await getStoredTickets();
  return result?.success || false;
};

export const deleteTicket = async (id: string): Promise<boolean> => {
  const result = await callSheetAPI('deleteTicket', { id });
  if (result?.success) await getStoredTickets();
  return result?.success || false;
};

export const getTicketById = async (id: string): Promise<Ticket | undefined> => {
  const tickets = await getStoredTickets();
  return tickets.find(t => t.id === id);
};
