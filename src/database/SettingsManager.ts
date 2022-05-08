import { Settings } from './models';

export class SettingsManager {
  private instance?: Settings;

  async load() {
    const row = await Settings.findOne();
    if (!row) throw new Error(`No settings row found`);
    this.instance = row;
  }

  get() {
    if (!this.instance) throw new Error(`No instance were initialized`);
    return this.instance;
  }
}
