import 'dotenv/config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { STATES } from './states';
import { Session } from './types';
import { findOrCreateUser, createTicket, getUserByTelegramId } from './api';

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
    state: STATES.PASSWORD,
    ticket: {}
  };

  const existingUser = await getUserByTelegramId(telegramId);

  sessions[chatId] = {
    state: existingUser ? STATES.NONE : STATES.PASSWORD,
    ticket: {}
  };

  if (!existingUser) {
    return bot.sendMessage(
      chatId,
      'Добро пожаловать \n\nПридумайте пароль для регистрации:'
    );
  }

  return bot.sendMessage(
    chatId,
    'С возвращением \n\nНажмите кнопку ниже, чтобы создать заявку.',
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

  if (session.state === STATES.PASSWORD) {
    await findOrCreateUser({
      ...msg.from!,
      password: text
    });

    session.state = STATES.NONE;

    return bot.sendMessage(
      chatId,
      'Регистрация завершена\n\nТеперь вы можете создавать заявки.',
      {
        reply_markup: {
          keyboard: [[{ text: 'Создать заявку' }]],
          resize_keyboard: true
        }
      }
    );
  }

  // TODO(ipigin): add category to tickets
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
    
    const user = await getUserByTelegramId(msg.from!.id);

    if (!user) {
      session.state = STATES.PASSWORD;
      return bot.sendMessage(chatId, 'Пожалуйста, зарегистрируйтесь.');
    }

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
