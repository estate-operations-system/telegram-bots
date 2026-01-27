export interface TicketDraft {
  category?: string;
  description?: string;
  address?: string;
}

export interface Session {
  state: STATES;
  ticket: {
    category?: string;
    description?: string;
    address?: string;
  };
  password?: string;
  userId?: number;
}

export interface BackendUser {
  id: number;
  name: string;
  email: string;
}
