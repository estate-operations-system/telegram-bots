import { describe, expect, it, beforeEach, jest } from '@jest/globals';

let mockOnText: Array<{ regex: RegExp; cb: Function }> = [];
let mockOn: Array<{ event: string; cb: Function }> = [];
let mockSendMessage: any;
let MockTelegramBot: jest.Mock;

const mockApi: any = {
  __esModule: true,
  findOrCreateUser: jest.fn() as any,
  getUserByTelegramId: jest.fn() as any,
  createTicket: jest.fn() as any,
  getMyTickets: jest.fn() as any,
  getAllTickets: jest.fn() as any,
  updateTicketStatus: jest.fn() as any,
  getDashboardStats: jest.fn() as any,
};

jest.mock('node-telegram-bot-api', () => {
  MockTelegramBot = jest.fn().mockImplementation(() => {
    mockSendMessage = jest.fn() as any;
    mockSendMessage.mockResolvedValue(undefined);
    return {
      onText: (regex: RegExp, cb: Function) => {
        mockOnText.push({ regex, cb });
        return undefined;
      },
      on: (event: string, cb: Function) => {
        mockOn.push({ event, cb });
        return undefined;
      },
      sendMessage: mockSendMessage,
    };
  });
  return MockTelegramBot;
});

jest.mock('../api', () => mockApi);

describe('Telegram bot flow', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockOnText = [];
    mockOn = [];
    process.env.BOT_TOKEN = 'test-token';
    process.env.BACKEND_URL = 'http://backend.test';
  });

  function loadBot() {
    require('../bot');
    return { mockOnText, mockOn, mockSendMessage, MockTelegramBot };
  }

  it('starts bot and registers handlers', () => {
    const { mockOnText: onTextHandlers, mockOn: onHandlers, MockTelegramBot: BotConstructor } = loadBot();

    expect(BotConstructor).toHaveBeenCalledWith('test-token', { polling: true });
    expect(onTextHandlers.length).toBeGreaterThanOrEqual(1);
    expect(onHandlers.length).toBeGreaterThanOrEqual(2);
  });

  it('handle /start with existing user and shows welcome keyboard', async () => {
    mockApi.getUserByTelegramId.mockResolvedValue({ id: 77, name: 'Ivan', email: 'ivan@example.com', role: null });
    loadBot();
    const startHandler = mockOnText.find((handler) => handler.regex.source === '\\/start')!.cb;
    const msg = { chat: { id: 1 }, from: { id: 77, first_name: 'Ivan', last_name: 'Ivanov' } };

    await startHandler(msg);

    expect(mockSendMessage).toHaveBeenCalledWith(1, expect.stringContaining('Добро пожаловать'), expect.any(Object));
  });

  it('handle /start and creates user when missing', async () => {
    mockApi.getUserByTelegramId.mockResolvedValue(undefined);
    mockApi.findOrCreateUser.mockResolvedValue({ id: 77, name: 'Ivan', email: 'ivan@example.com', role: null });
    loadBot();
    const startHandler = mockOnText.find((handler) => handler.regex.source === '\\/start')!.cb;
    const msg = { chat: { id: 2 }, from: { id: 77, first_name: 'Ivan', last_name: 'Ivanov' } };

    await startHandler(msg);

    expect(mockApi.findOrCreateUser).toHaveBeenCalledWith(msg.from);
    expect(mockSendMessage).toHaveBeenCalledWith(2, expect.stringContaining('Добро пожаловать'), expect.any(Object));
  });

  it('shows empty tickets message when user has no tickets', async () => {
    mockApi.getUserByTelegramId.mockResolvedValue({ id: 77, name: 'Ivan', email: 'ivan@example.com', role: null });
    mockApi.getMyTickets.mockResolvedValue([]);
    loadBot();
    const startHandler = mockOnText.find((handler) => handler.regex.source === '\\/start')!.cb;
    const messageHandler = mockOn.find((handler) => handler.event === 'message')!.cb;
    const msg = { chat: { id: 3 }, from: { id: 77, first_name: 'Ivan', last_name: 'Ivanov' }, text: '/start' };

    await startHandler(msg);
    await messageHandler({ chat: { id: 3 }, from: { id: 77 }, text: 'Мои заявки' });

    expect(mockSendMessage).toHaveBeenLastCalledWith(3, 'У вас нет заявок.');
  });

  it('shows dashboard stats', async () => {
    mockApi.getDashboardStats.mockResolvedValue({ total: 10, inProgress: 2 });
    mockApi.getUserByTelegramId.mockResolvedValue({ id: 77, name: 'Ivan', email: 'ivan@example.com', role: 'жилец' });
    loadBot();
    const startHandler = mockOnText.find((handler) => handler.regex.source === '\\/start')!.cb;
    const messageHandler = mockOn.find((handler) => handler.event === 'message')!.cb;
    const msg = { chat: { id: 4 }, from: { id: 77, first_name: 'Ivan', last_name: 'Ivanov' }, text: '/start' };

    await startHandler(msg);
    await messageHandler({ chat: { id: 4 }, from: { id: 77 }, text: 'Дешборд' });

    expect(mockSendMessage).toHaveBeenLastCalledWith(4, expect.stringContaining('Дешборд'));
  });

  it('creates ticket flow from category to photo', async () => {
    const user = { id: 77, name: 'Ivan', email: 'ivan@example.com', role: null };
    const ticket = { id: 18, category: 'ЖКХ', description: 'Проблема', address: 'Дом 1, кв 1', status: 'Новая', resident_id: 77 };
    mockApi.getUserByTelegramId.mockResolvedValue(user);
    mockApi.createTicket.mockResolvedValue(ticket);
    loadBot();

    const startHandler = mockOnText.find((handler) => handler.regex.source === '\\/start')!.cb;
    const messageHandler = mockOn.find((handler) => handler.event === 'message')!.cb;
    const msg = { chat: { id: 5 }, from: { id: 77, first_name: 'Ivan', last_name: 'Ivanov' }, text: '/start' };

    await startHandler(msg);
    await messageHandler({ chat: { id: 5 }, from: { id: 77 }, text: 'Создать заявку' });
    await messageHandler({ chat: { id: 5 }, from: { id: 77 }, text: 'ЖКХ' });
    await messageHandler({ chat: { id: 5 }, from: { id: 77 }, text: 'Проблема' });
    await messageHandler({ chat: { id: 5 }, from: { id: 77 }, text: 'нет' });

    expect(mockApi.createTicket).toHaveBeenCalledWith({
      category: 'ЖКХ',
      description: 'Проблема',
      address: 'Дом 1, кв 1',
      status: 'Новая',
      resident_id: 77,
    });
    expect(mockSendMessage).toHaveBeenLastCalledWith(5, expect.stringContaining('Заявка создана!'));
  });

  it('handles callback_query close action', async () => {
    mockApi.updateTicketStatus.mockResolvedValue({ id: 7, status: 'Закрыта' });
    loadBot();
    const callbackHandler = mockOn.find((handler) => handler.event === 'callback_query')!.cb;

    await callbackHandler({ message: { chat: { id: 6 } }, data: 'close_7' });

    expect(mockApi.updateTicketStatus).toHaveBeenCalledWith(7, 'Закрыта');
    expect(mockSendMessage).toHaveBeenLastCalledWith(6, 'Заявка №7 закрыта.');
  });

  it('handles callback_query admin_update action', async () => {
    loadBot();
    const callbackHandler = mockOn.find((handler) => handler.event === 'callback_query')!.cb;
    mockOnText.find((handler) => handler.regex.source === '\\/start')!.cb({ chat: { id: 7 }, from: { id: 8, first_name: 'Ivan', last_name: 'Ivanov' } });
    mockSendMessage.mockClear();

    await callbackHandler({ message: { chat: { id: 7 } }, data: 'admin_update_7' });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith(7, 'Введите новый статус для заявки:');
  });
});
