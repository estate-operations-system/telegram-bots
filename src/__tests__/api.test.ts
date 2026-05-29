import { describe, it, expect, beforeEach, jest } from '@jest/globals';

let mockApi = {
  get: jest.fn<any>(),
  post: jest.fn<any>(),
  put: jest.fn<any>(),
};

let api: typeof import('../api');

beforeEach(() => {
  jest.resetModules();

  mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };

  jest.doMock('axios', () => ({
    __esModule: true,
    default: {
      create: jest.fn(() => mockApi),
      isAxiosError: (err: unknown) =>
        typeof err === 'object' &&
        err !== null &&
        (err as { isAxiosError?: boolean }).isAxiosError === true,
    },
  }));

  api = require('../api');
});

describe('api module', () => {
  it('getUserByTelegramId returns data when backend responds', async () => {
    const user = { id: 1, name: 'Ivan', email: 'ivan@example.com', role: 'жилец' };
    mockApi.get.mockResolvedValue({ data: { data: user } });

    const result = await api.getUserByTelegramId(10);

    expect(mockApi.get).toHaveBeenCalledWith('/api/users/telegram/10');
    expect(result).toEqual(user);
  });

  it('getUserByTelegramId returns undefined on 404 error', async () => {
    const error = Object.assign(new Error('Not found'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mockApi.get.mockRejectedValue(error);

    const result = await api.getUserByTelegramId(11);

    expect(result).toBeUndefined();
  });

  it('findOrCreateUser reuses existing user', async () => {
    const user = { id: 2, name: 'Existing', email: 'existing@example.com', role: null };
    mockApi.get.mockResolvedValue({ data: { data: user } });

    const result = await api.findOrCreateUser({ id: 10, username: 'user' });

    expect(mockApi.get).toHaveBeenCalledWith('/api/users/telegram/10');
    expect(result).toEqual(user);
  });

  it('findOrCreateUser creates a new user when none exists', async () => {
    const newUser = { id: 3, name: 'Telegram User', email: 'new@example.com', role: null };
    mockApi.get.mockRejectedValue(
      Object.assign(new Error('Not found'), { isAxiosError: true, response: { status: 404 } })
    );
    mockApi.post.mockResolvedValue({ data: { data: newUser } });

    const result = await api.findOrCreateUser({ id: 12, first_name: 'John', last_name: 'Doe' });

    expect(mockApi.post).toHaveBeenCalledWith('/api/users', {
      name: 'John Doe',
      telegram_id: 12,
      telegram_username: undefined,
    });
    expect(result).toEqual(newUser);
  });

  it('createTicket posts ticket data and returns created ticket', async () => {
    const ticket = {
      id: 5,
      category: 'test',
      description: 'x',
      address: 'y',
      status: 'Новая',
      resident_id: 1,
    };
    mockApi.post.mockResolvedValue({ data: { data: ticket } });

    const result = await api.createTicket({
      category: 'test',
      description: 'x',
      address: 'y',
      status: 'Новая',
      resident_id: 1,
    });

    expect(mockApi.post).toHaveBeenCalledWith('/api/tickets', {
      category: 'test',
      description: 'x',
      address: 'y',
      status: 'Новая',
      resident_id: 1,
    });
    expect(result).toEqual(ticket);
  });

  it('getMyTickets returns ticket list', async () => {
    const tickets = [
      {
        id: 1,
        category: 'a',
        description: '',
        address: '',
        status: 'Новая',
        resident_id: 3,
        created_at: '',
      },
    ];
    mockApi.get.mockResolvedValue({ data: { data: tickets } });

    const result = await api.getMyTickets(3);

    expect(mockApi.get).toHaveBeenCalledWith('/api/tickets/resident/3');
    expect(result).toEqual(tickets);
  });

  it('getAllTickets returns all tickets', async () => {
    const tickets = [
      {
        id: 1,
        category: 'a',
        description: '',
        address: '',
        status: 'Новая',
        resident_id: 3,
        created_at: '',
      },
    ];
    mockApi.get.mockResolvedValue({ data: { data: tickets } });

    const result = await api.getAllTickets();

    expect(mockApi.get).toHaveBeenCalledWith('/api/tickets');
    expect(result).toEqual(tickets);
  });

  it('updateTicketStatus updates ticket status', async () => {
    const ticket = {
      id: 9,
      category: 'x',
      description: '',
      address: '',
      status: 'В работе',
      resident_id: 1,
      created_at: '',
    };
    mockApi.put.mockResolvedValue({ data: { data: ticket } });

    const result = await api.updateTicketStatus(9, 'В работе');

    expect(mockApi.put).toHaveBeenCalledWith('/api/tickets/9', { status: 'В работе' });
    expect(result).toEqual(ticket);
  });

  it('getDashboardStats returns stats payload', async () => {
    const stats = { total: 10, inProgress: 4 };
    mockApi.get.mockResolvedValue({ data: { data: stats } });

    const result = await api.getDashboardStats();

    expect(mockApi.get).toHaveBeenCalledWith('/api/tickets/stats');
    expect(result).toEqual(stats);
  });
});
