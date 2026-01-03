import axios from 'axios';
import { BackendUser, TicketDraft } from './types';

const api = axios.create({
  baseURL: process.env.BACKEND_URL
});

export async function findOrCreateUser(
  telegramUser: { id: number; first_name?: string }
): Promise<BackendUser> {
  const email = `${telegramUser.id}@telegram.local`;

  try {
    const res = await api.post('/api/users', {
      name: telegramUser.first_name || 'Telegram User',
      email,
      age: null
    });

    return res.data.data;
  } catch (err: any) {
    if (err.response && err.response.status === 409) {
      const res = await api.get('/api/users');
      const existingUser = res.data.data.find((u: BackendUser) => u.email === email);
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
