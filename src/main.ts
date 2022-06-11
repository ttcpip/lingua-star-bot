import 'source-map-support/register';
import env from './env';
import logger from './logger';
import { Database, SettingsManager } from './database';
import { TgBotManager } from './tgbot';
import { LocalizationManager, appLocales } from './localization';

async function main() {
  logger.info(`↓↓↓ Starting the app... ↓↓↓`);

  logger.info(`Database initialization...`);
  const db = new Database({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_DB,
    pool: {
      min: env.DATABASE_POOL_MIN,
      max: env.DATABASE_POOL_MAX,
      acquire: env.DATABASE_POOL_ACQUIRE,
      idle: env.DATABASE_POOL_IDLE,
      evict: env.DATABASE_POOL_IDLE,
    },
    logging: env.SEQUELIZE_LOGGER,
  });
  await db.init();
  logger.info(`Database initialization done`);

  logger.info(`SettingsManager initialization...`);
  const settingsManager = new SettingsManager();
  await settingsManager.load();
  logger.info(`SettingsManager initialization done`);

  logger.info(`LocalizationManager initialization...`);
  const localizationManager = new LocalizationManager(appLocales);
  await localizationManager.init();
  logger.info(`LocalizationManager initialization done`);

  logger.info(`TgBotManager initialization...`);
  const tgBotManager = new TgBotManager(
    settingsManager.get().mainTgBotToken,
    db,
    settingsManager,
    localizationManager,
  );
  await tgBotManager.start();
  logger.info(`TgBotManager bot: @${tgBotManager.getBotUsername()}`);
  await tgBotManager.notify();
  logger.info(`TgBotManager initialization done`);

  logger.info(`↑↑↑ The app started! ↑↑↑`);
}

main().catch((err) => {
  logger.error(`Error at main fn:`, err);
  logger.error(`Terminating the app...`);
  process.exit(1);
});
