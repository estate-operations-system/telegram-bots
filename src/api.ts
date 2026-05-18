import axios from 'axios';
import { BackendUser, Ticket } from './types';

const api = axios.create({
  baseURL: process.env.BACKEND_URL,
  headers: {
    'x-bot-token': process.env.BOT_TOKEN,
  },
});

export async function findOrCreateUser(telegramUser: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}): Promise<BackendUser> {
  const existing = await getUserByTelegramId(telegramUser.id);
  if (existing) return existing;

  const res = await api.post('/api/users', {
    name:
      `${telegramUser.first_name ?? 'Telegram'} ${telegramUser.last_name ?? 'User'}`.trim() ||
      'Telegram User',
    telegram_id: telegramUser.id,
    telegram_username: telegramUser.username,
  });

  return res.data.data;
}

export async function getUserByTelegramId(telegramId: number): Promise<BackendUser | undefined> {
  try {
    const res = await api.get(`/api/users/telegram/${telegramId}`);
    return res.data.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return undefined;
    }
    throw err;
  }
}

export async function createTicket(data: {
  category: string;
  description: string;
  address: string;
  status: string;
  resident_id: number;
}) {
  const res = await api.post('/api/tickets', data);
  return res.data.data;
}

export async function getMyTickets(userId: number): Promise<Ticket[]> {
  const res = await api.get(`/api/tickets/resident/${userId}`);
  return res.data.data;
}

export async function getAllTickets(): Promise<Ticket[]> {
  const res = await api.get('/api/tickets');
  return res.data.data;
}

export async function updateTicketStatus(id: number, status: string): Promise<Ticket> {
  const res = await api.put(`/api/tickets/${id}`, { status });
  return res.data.data;
}

export async function getDashboardStats(): Promise<{ total: number; inProgress: number }> {
  const res = await api.get('/api/tickets/stats');
  return res.data.data;
}
