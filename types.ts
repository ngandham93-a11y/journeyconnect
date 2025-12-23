
export enum TicketType {
  OFFER = 'OFFER',
  REQUEST = 'REQUEST'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  CLOSED = 'CLOSED',
  BOOKED = 'BOOKED'
}

export enum TrainClass {
  EA = 'EA',   // Anubhuti Class
  EC = 'EC',   // Executive Chair Car
  AC_1 = '1A', // First AC
  AC_2 = '2A', // Second AC
  AC_3 = '3A', // Third AC
  AC_3E = '3E',// Third AC Economy
  FC = 'FC',   // First Class
  CC = 'CC',   // AC Chair Car
  SL = 'SL',   // Sleeper
  S_2 = '2S'    // Second Sitting
}

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'USER' | 'ADMIN';
}

export interface Ticket {
  id: string;
  userId: string;
  type: TicketType;
  trainName: string;
  trainNumber: string;
  fromStation: string;
  toStation: string;
  date: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  duration: string;
  classType: TrainClass;
  berthType?: string;
  price: number;
  status: TicketStatus;
  userContact: string; 
  sellerName?: string;
  comment?: string;
  amenities?: string[];
  isFlexibleDate?: boolean;
  isFlexibleClass?: boolean;
  createdAt: number;
}

export interface AIParsedTicket {
  trainNumber?: string;
  trainName?: string;
  fromStation?: string;
  toStation?: string;
  date?: string;
  classType?: string;
  price?: number;
  departureTime?: string;
}
