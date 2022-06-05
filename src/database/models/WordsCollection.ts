import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Optional } from 'sequelize/types';
import { User } from './User';
import { Word } from './Word';

export interface WordsCollectionAttrs {
  id?: number;
  name: string;
  userId?: number;
  isCommon: boolean;
}

@Table({ tableName: 'words_collections', timestamps: false })
export class WordsCollection
  extends Model<
    WordsCollectionAttrs,
    Optional<WordsCollectionAttrs, 'isCommon'>
  >
  implements WordsCollectionAttrs
{
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  name!: string;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId?: number;
  @BelongsTo(() => User)
  user?: User;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isCommon!: boolean;

  @HasMany(() => Word)
  words?: Word[];
}
