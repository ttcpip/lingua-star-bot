import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

export interface UserAttrs {
  id?: number;
}

@Table({ tableName: 'users', timestamps: false })
export class User extends Model<UserAttrs, UserAttrs> implements UserAttrs {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;
}
