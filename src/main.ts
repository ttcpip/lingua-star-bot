import 'source-map-support/register';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import logger from './logger';
import { Database } from './database/Database';

async function main() {
  logger.info(`↓↓↓ Starting the app... ↓↓↓`);

  logger.info(`Database initialisation...`);
  const db = new Database({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB,
    pool: {
      min: Number(process.env.DATABASE_POOL_MIN),
      max: Number(process.env.DATABASE_POOL_MAX),
      acquire: Number(process.env.DATABASE_POOL_ACQUIRE), // сколько ждать освобождения нового коннета из пула, если сейчас нет свободных
      idle: Number(process.env.DATABASE_POOL_IDLE),
      evict: Number(process.env.DATABASE_POOL_IDLE),
    },
    logging: process.env.SEQUELIZE_LOGGER === 'true',
  });
  await db.init();
  logger.info(`Database initialisation done`);

  logger.info(`↑↑↑ The app started! ↑↑↑`);
}

main().catch((err) => {
  logger.error(`Error at main fn:`, err);
  logger.error(`Terminating the app...`);
  process.exit(1);
});
