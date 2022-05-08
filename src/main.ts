import 'source-map-support/register';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import logger from './logger';
import { Database, SettingsManager } from './database';
import { TgBotManager } from './tgbot';

async function main() {
  logger.info(`↓↓↓ Starting the app... ↓↓↓`);

  logger.info(`Database initialization...`);
  const db = new Database({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB,
    pool: {
      min: Number(process.env.DATABASE_POOL_MIN),
      max: Number(process.env.DATABASE_POOL_MAX),
      acquire: Number(process.env.DATABASE_POOL_ACQUIRE),
      idle: Number(process.env.DATABASE_POOL_IDLE),
      evict: Number(process.env.DATABASE_POOL_IDLE),
    },
    logging: process.env.SEQUELIZE_LOGGER === 'true',
  });
  await db.init();
  logger.info(`Database initialization done`);

  logger.info(`SettingsManager initialization...`);
  const settingsManager = new SettingsManager();
  await settingsManager.load();
  logger.info(`SettingsManager initialization done`);

  logger.info(`TgBotManager initialization...`);
  const tgBotManager = new TgBotManager(
    settingsManager.get().mainTgBotToken,
    db,
    settingsManager,
  );
  await tgBotManager.start();
  logger.info(`TgBotManager bot: @${tgBotManager.getBotUsername()}`);
  logger.info(`TgBotManager initialization done`);

  logger.info(`↑↑↑ The app started! ↑↑↑`);
}

main().catch((err) => {
  logger.error(`Error at main fn:`, err);
  logger.error(`Terminating the app...`);
  process.exit(1);
});
