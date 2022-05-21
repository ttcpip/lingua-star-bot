import { User } from './User';
import { Settings } from './Settings';
import { StudyGroup } from './StudyGroup';
import { HomeWorkEntry } from './HomeWorkEntry';

export * from './User';
export * from './Settings';
export * from './StudyGroup';
export * from './HomeWorkEntry';

export const models = [User, Settings, StudyGroup, HomeWorkEntry];
