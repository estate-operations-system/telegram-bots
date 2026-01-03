export interface TicketDraft {
  category?: string;
  description?: string;
  address?: string;
}

export interface Session {
  state: string;
  ticket: TicketDraft;
}

export interface BackendUser {
  id: number;
  name: string;
  email: string;
}
