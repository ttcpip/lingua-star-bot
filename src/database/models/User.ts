import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { StudyGroup } from './StudyGroup';
import { WordsCollection } from './WordsCollection';

export enum language {
  ru,
  en,
}

const langCodes = {
  [language.ru]: 'ru',
  [language.en]: 'en',
};

export interface UserAttrs {
  id?: number;
  lang: language;
  tgid: number;
  name: string;
  studyGroupId: number | null;
}

@Table({ tableName: 'users', timestamps: false })
export class User extends Model<UserAttrs, UserAttrs> implements UserAttrs {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.TINYINT)
  lang!: language;

  @Column(DataType.BIGINT)
  tgid!: number;

  @Column(DataType.STRING)
  name!: string;

  @ForeignKey(() => StudyGroup)
  @Column(DataType.INTEGER)
  studyGroupId!: number | null;
  @BelongsTo(() => StudyGroup)
  studyGroup?: StudyGroup;

  @HasMany(() => WordsCollection)
  wordsCollections?: WordsCollection[];

  getLangCode() {
    const code = langCodes[this.lang];
    if (!code)
      throw new Error(`Language code were not resolved by lang=${this.lang}`);
    return code;
  }
}
