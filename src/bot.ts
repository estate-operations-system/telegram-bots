import 'dotenv/config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { STATES } from './states';
import { Session } from './types';
import {
  findOrCreateUser,
  createTicket,
  getUserByTelegramId,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  getDashboardStats,
} from './api';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN не задан');
}

const bot = new TelegramBot(token, { polling: true });

const sessions: Record<number, Session> = {};

bot.onText(/\/start/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from!.id;

  sessions[chatId] = {
    state: STATES.NONE,
    ticket: {},
  };

  let user = await getUserByTelegramId(telegramId);

  if (!user) {
    user = await findOrCreateUser(msg.from!);
  }

  const keyboard = [
    [{ text: 'Создать заявку' }, { text: 'Мои заявки' }],
    [{ text: 'Дешборд' }, { text: 'Профиль' }],
  ];

  if (user.role === 'администратор') {
    keyboard.push([{ text: 'Админ панель' }]);
  }

  return bot.sendMessage(chatId, 'Добро пожаловать! \n\nВыберите действие.', {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
    },
  });
});

bot.on('message', async (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || !sessions[chatId]) return;

  const session = sessions[chatId];

  // TODO(ipigin): add category to tickets
  if (text === 'Создать заявку') {
    session.state = STATES.CATEGORY;
    return bot.sendMessage(chatId, 'Введите категорию заявки:');
  }

  if (text === 'Мои заявки') {
    const user = await getUserByTelegramId(msg.from!.id);
    if (!user) return bot.sendMessage(chatId, 'Пользователь не найден.');

    const tickets = await getMyTickets(user.id);
    if (tickets.length === 0) {
      return bot.sendMessage(chatId, 'У вас нет заявок.');
    }

    const message = tickets.map((t) => `№${t.id}: ${t.category} - ${t.status}`).join('\n');
    const inlineKeyboard = tickets.map((t) => [
      { text: `Закрыть №${t.id}`, callback_data: `close_${t.id}` },
    ]);

    return bot.sendMessage(chatId, `Ваши заявки:\n${message}`, {
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  }

  if (text === 'Дешборд') {
    const stats = await getDashboardStats();
    return bot.sendMessage(
      chatId,
      `Дешборд:\nВсего заявок: ${stats.total}\nВ работе: ${stats.inProgress}`
    );
  }

  if (text === 'Профиль') {
    const user = await getUserByTelegramId(msg.from!.id);
    if (!user) return bot.sendMessage(chatId, 'Пользователь не найден.');
    return bot.sendMessage(
      chatId,
      `Профиль:\nИмя: ${user.name}\nEmail: ${user.email}\nРоль: ${user.role || 'жилец'}`
    );
  }

  if (text === 'Админ панель') {
    const user = await getUserByTelegramId(msg.from!.id);
    if (user?.role !== 'администратор') return bot.sendMessage(chatId, 'Доступ запрещен.');

    const tickets = await getAllTickets();
    const message = tickets.map((t) => `№${t.id}: ${t.category} - ${t.status}`).join('\n');
    const inlineKeyboard = tickets.map((t) => [
      { text: `Изменить №${t.id}`, callback_data: `admin_update_${t.id}` },
    ]);

    return bot.sendMessage(chatId, `Все заявки:\n${message}`, {
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  }

  if (session.state === STATES.CATEGORY) {
    session.ticket.category = text;
    session.state = STATES.DESCRIPTION;
    return bot.sendMessage(chatId, 'Опишите проблему:');
  }

  if (session.state === STATES.DESCRIPTION) {
    session.ticket.description = text;
    session.state = STATES.PHOTO;
    return bot.sendMessage(chatId, 'Отправьте фото (или напишите "нет"):');
  }

  if (session.state === STATES.PHOTO) {
    session.ticket.address = 'Дом 1, кв 1';
    session.ticket.status = 'Новая';

    const user = await getUserByTelegramId(msg.from!.id);

    if (!user) {
      session.state = STATES.NONE;
      return bot.sendMessage(chatId, 'Ошибка: пользователь не найден.');
    }

    const ticket = await createTicket({
      category: session.ticket.category!,
      description: session.ticket.description!,
      address: session.ticket.address!,
      status: session.ticket.status,
      resident_id: user.id,
    });

    session.state = STATES.NONE;

    return bot.sendMessage(chatId, `Заявка создана!\n\n№ ${ticket.id}\nСтатус: ${ticket.status}`);
  }

  if (session.state === STATES.ADMIN_UPDATE_STATUS) {
    const ticketId = session.selectedTicketId!;
    await updateTicketStatus(ticketId, text);
    session.state = STATES.NONE;
    return bot.sendMessage(chatId, `Статус заявки №${ticketId} изменен на ${text}.`);
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message!.chat.id;
  const data = query.data!;

  if (data.startsWith('close_')) {
    const ticketId = parseInt(data.split('_')[2]);
    await updateTicketStatus(ticketId, 'Закрыта');
    return bot.sendMessage(chatId, `Заявка №${ticketId} закрыта.`);
  }

  if (data.startsWith('admin_update_')) {
    const ticketId = parseInt(data.split('_')[2]);
    console.log('data', data);
    console.log('Selected ticket for admin update:', ticketId);
    sessions[chatId] = {
      ...sessions[chatId],
      state: STATES.ADMIN_UPDATE_STATUS,
      selectedTicketId: ticketId,
    };
    return bot.sendMessage(chatId, 'Введите новый статус для заявки:');
  }
});

console.log('Telegram бот запущен');
