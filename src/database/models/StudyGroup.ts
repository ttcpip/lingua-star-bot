import {
  AutoIncrement,
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { HomeWorkEntry } from './HomeWorkEntry';
import { User } from './User';

export interface StudyGroupAttrs {
  id?: number;
  name: string;
}

@Table({ tableName: 'study_groups', timestamps: false })
export class StudyGroup
  extends Model<StudyGroupAttrs, StudyGroupAttrs>
  implements StudyGroupAttrs
{
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  name!: string;

  @HasMany(() => User)
  users?: User[];

  @HasMany(() => HomeWorkEntry)
  homeWorkEntries?: HomeWorkEntry[];
}
