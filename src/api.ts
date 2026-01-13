import axios from 'axios';
import { BackendUser, TicketDraft } from './types';

const api = axios.create({
  baseURL: process.env.BACKEND_URL
});

export async function findOrCreateUser(
  telegramUser: { id:number; username?: string; first_name?: string; last_name?: string}
): Promise<BackendUser> {

  try {
    const res = await api.post('/api/users', {
      name: ((telegramUser.first_name || '') + (telegramUser.last_name || '')) || 'Telegram User',
      email: telegramUser.username,
      age: null
    });

    return res.data.data;
  } catch (err: any) {
    if (err.response && err.response.status === 409) {
      const res = await api.get('/api/users');
      const existingUser = res.data.data.find((u: BackendUser) => u.email === telegramUser.username);
      if (existingUser) return existingUser;
    }

    throw err;
  }
}

export async function createTicket(data: {
  category: string;
  description: string;
  address: string;
  resident_id: number;
}) {
  const res = await api.post('/api/tickets', data);
  return res.data.data;
}
