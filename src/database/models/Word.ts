import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Optional } from 'sequelize/types';
import { WordsCollection } from './WordsCollection';

export interface WordAttrs {
  id?: number;
  wordsCollectionId: number;
  photo: string;
  word: string;
  hint: string;
  repeatedCount: number;
  repeating: boolean;
  created: Date;
}

@Table({ tableName: 'words', timestamps: false })
export class Word
  extends Model<
    WordAttrs,
    Optional<WordAttrs, 'repeatedCount' | 'repeating' | 'created'>
  >
  implements WordAttrs
{
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

  @Default(0)
  @Column(DataType.INTEGER)
  repeatedCount!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  repeating!: boolean;

  @Default(() => new Date())
  @Column(DataType.DATE)
  created!: Date;
}
