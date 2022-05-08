import { config } from 'dotenv';
import { cleanEnv, num, str, bool, port } from 'envalid';

config();

const env = cleanEnv(process.env, {
  NODE_ENV: str(),

  LOG_LEVEL: str(),

  SEQUELIZE_LOGGER: bool(),

  DATABASE_HOST: str(),
  DATABASE_USER: str(),
  DATABASE_DB: str(),
  DATABASE_PASSWORD: str(),
  DATABASE_PORT: port(),
  DATABASE_POOL_MIN: num(),
  DATABASE_POOL_MAX: num(),
  DATABASE_POOL_ACQUIRE: num(),
  DATABASE_POOL_IDLE: num(),
});

export default env;
