import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({ tableName: 'settings', timestamps: false })
export class Settings extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id?: number;

  @Column(DataType.INTEGER)
  adminTgChatId!: number;

  @Column(DataType.STRING)
  mainTgBotToken!: string;
}
