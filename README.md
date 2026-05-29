# Telegram Bot Service

Сервис `telegram-bot` реализует Telegram-бота для Estate Operations System. Он служит интерфейсом между жителями и backend-системой управления заявками, позволяя создавать запросы, отслеживать статус и управлять ими прямо в Telegram.

Доступ к Telegram-bot осуществляется по данному Telegram-username:
```bash
@estate_resident_bot
```

## Что делает проект

- подключается к Telegram через `node-telegram-bot-api`
- запускается в `polling` режиме и обрабатывает команды и сообщения
- создает пользователей во backend по Telegram ID
- позволяет жильцам создавать заявки из мессенджера
- показывает список заявок пользователя
- предоставляет простую админ-панель в Telegram для управляющих
- обновляет статус заявок через backend API
- запрашивает статистику заявок и отображает ее в виде краткого дашборда

## Технологии

- Node.js
- TypeScript
- `node-telegram-bot-api`
- `axios`
- `dotenv`
- Jest
- ESLint
- Prettier

## Структура проекта

- `src/bot.ts` — основной код Telegram-бота
- `src/api.ts` — API-клиент для обращения к backend
- `src/types.ts` — типы данных TypeScript
- `src/states.ts` — состояния сеансов взаимодействия с пользователем
- `src/__tests__/` — модульные тесты для компонентов бота

## Запуск локально

1. Установите зависимости:

```bash
cd telegram-bot
npm install
```

2. Запустите в режиме разработки:

```bash
npm run dev
```

3. Сборка и запуск production-версии:

```bash
npm run build
npm start
```

## Переменные окружения

- `BOT_TOKEN` — токен Telegram-бота, выдаваемый BotFather
- `BACKEND_URL` — URL backend-сервиса, `https://backend-pl4x.onrender.com`

## Docker и развертывание на Render

Для Render используется `Dockerfile` из этого каталога.

### Docker-образ

Dockerfile выполняет следующие шаги:

1. копирует `package*.json`
2. устанавливает зависимости и собирает TypeScript
3. копирует артефакты сборки в runtime-образ
4. запускает `npm start`
