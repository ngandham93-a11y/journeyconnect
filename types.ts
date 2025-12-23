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
  SL = 'SL',
  CC = 'CC',
  AC_3 = '3A',
  AC_2 = '2A',
  AC_1 = '1A'
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
  price: number;
  status: TicketStatus;
  userContact: string; 
  sellerName?: string;
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