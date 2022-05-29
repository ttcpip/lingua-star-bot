import { User } from './User';
import { Settings } from './Settings';
import { StudyGroup } from './StudyGroup';
import { HomeWorkEntry } from './HomeWorkEntry';
import { WordsCollection } from './WordsCollection';
import { Word } from './Word';

export * from './User';
export * from './Settings';
export * from './StudyGroup';
export * from './HomeWorkEntry';
export * from './WordsCollection';
export * from './Word';

export const models = [
  User,
  Settings,
  StudyGroup,
  HomeWorkEntry,
  WordsCollection,
  Word,
];
