import { STATES } from './states';

export interface TicketDraft {
  category?: string;
  description?: string;
  address?: string;
}

export interface Ticket {
  id: number;
  category: string;
  description: string;
  address: string;
  status: string;
  resident_id: number;
  created_at: string;
}

export interface Session {
  state: STATES;
  ticket: {
    category?: string;
    description?: string;
    address?: string;
    status?: string;
  };
  selectedTicketId?: number;
  password?: string;
  userId?: number;
}

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  role?: string | null;
}
