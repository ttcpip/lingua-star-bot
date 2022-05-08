import { PoolOptions } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import logger from '../logger';
import { User } from './models';

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

      models: [User],

      logging: config.logging
        ? (sql: string) => logger.verbose(sql || '', { sequelize: true })
        : false,
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
