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
import { StudyGroup } from './StudyGroup';

export interface HomeWorkEntryAttrs {
  id?: number;
  name: string;
  studyGroupId?: number;
}

@Table({ tableName: 'home_work_entries', timestamps: false })
export class HomeWorkEntry
  extends Model<HomeWorkEntryAttrs, HomeWorkEntryAttrs>
  implements HomeWorkEntryAttrs
{
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  name!: string;

  @ForeignKey(() => StudyGroup)
  studyGroupId?: number;
  @BelongsTo(() => StudyGroup)
  studyGroup?: StudyGroup;
}
