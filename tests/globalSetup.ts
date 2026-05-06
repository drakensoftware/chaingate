import fs from 'node:fs';
import path from 'node:path';

export const TRACKING_FILE = path.resolve(__dirname, '.recordings-tracking.log');

export default function setup(): void {
  fs.writeFileSync(TRACKING_FILE, '');
}
