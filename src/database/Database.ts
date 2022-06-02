import { PoolOptions } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import logger from '../logger';
import { models } from './models';

export interface DatabaseConfig
  extends Pick<
    SequelizeOptions,
    'host' | 'port' | 'username' | 'password' | 'database'
  > {
  pool?: PoolOptions;
  logging: boolean;
}

export class Database {
  private sequelize: Sequelize;

  constructor(config: DatabaseConfig) {
    const options: SequelizeOptions = {
      dialect: 'mysql',
      ...config,

      models,

      logging: config.logging
        ? (sql: string, durationMs?: number) =>
            logger.verbose(sql || '', {
              sequelize: true,
              durationMs: Number.isFinite(durationMs) ? durationMs : NaN,
            })
        : false,

      benchmark: config.logging ? true : false,

      timezone: '+00:00',
    };

    this.sequelize = new Sequelize(options);
  }

  async init() {
    await this.sequelize.authenticate();
  }

  getSequelize() {
    return this.sequelize;
  }
}
