// Copies the app files (no build step needed) into www/ for Capacitor.
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const APP_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'icons', 'styles', 'src'];

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const path of APP_FILES) cpSync(path, `www/${path}`, { recursive: true });
console.log(`www/: ${APP_FILES.join(', ')}`);
