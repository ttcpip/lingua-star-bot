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
  studyGroupId?: number;
  chatId: number;
  messageId: number;
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

  @ForeignKey(() => StudyGroup)
  @Column(DataType.INTEGER)
  studyGroupId?: number;
  @BelongsTo(() => StudyGroup)
  studyGroup?: StudyGroup;

  @Column(DataType.INTEGER)
  chatId!: number;

  @Column(DataType.INTEGER)
  messageId!: number;
}
