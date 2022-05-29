import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { WordsCollection } from './WordsCollection';

export interface WordAttrs {
  id?: number;
  wordsCollectionId: number;
  photo: string;
  word: string;
  hint: string;
}

@Table({ tableName: 'words', timestamps: false })
export class Word extends Model<WordAttrs, WordAttrs> implements WordAttrs {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => WordsCollection)
  @Column(DataType.INTEGER)
  wordsCollectionId!: number;
  @BelongsTo(() => WordsCollection)
  wordsCollection?: WordsCollection;

  @Column(DataType.STRING)
  photo!: string;

  @Column(DataType.STRING)
  word!: string;

  @Column(DataType.STRING)
  hint!: string;
}
