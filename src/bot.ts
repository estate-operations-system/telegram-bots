import 'dotenv/config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { STATES } from './states';
import { Session } from './types';
import { findOrCreateUser, createTicket } from './api';

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN не задан');
}

const bot = new TelegramBot(token, { polling: true });

const sessions: Record<number, Session> = {};

bot.onText(/\/start/, async (msg: Message) => {
  const chatId = msg.chat.id;

  sessions[chatId] = {
    state: STATES.NONE,
    ticket: {}
  };

  await bot.sendMessage(
    chatId,
    'Добро пожаловать \n\nНажмите кнопку ниже, чтобы создать заявку.',
    {
      reply_markup: {
        keyboard: [[{ text: 'Создать заявку' }]],
        resize_keyboard: true
      }
    }
  );
});

bot.on('message', async (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || !sessions[chatId]) return;

  const session = sessions[chatId];

  if (text === 'Создать заявку') {
    session.state = STATES.CATEGORY;
    return bot.sendMessage(chatId, 'Введите категорию заявки:');
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
    console.log(msg);
    const user = await findOrCreateUser(msg.from!);

    const ticket = await createTicket({
      category: session.ticket.category!,
      description: session.ticket.description!,
      address: session.ticket.address!,
      resident_id: user.id
    });

    session.state = STATES.NONE;

    return bot.sendMessage(
      chatId,
      `Заявка создана!\n\n№ ${ticket.id}\nСтатус: ${ticket.status}`
    );
  }
});

console.log('Telegram бот запущен');
