import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundledServer = path.join(__dirname, 'dist', 'server.js');
const isDev = process.env.NODE_ENV !== 'production' && !process.env.AIS_PROD;
console.log('--------------------------------------------------');
console.log('🚀 SAI Ethio • SeeraAI Boot Loader Starting');
console.log(`📂 Environment: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`📁 Bundle Found: ${fs.existsSync(bundledServer)}`);
console.log(`🕒 Time: ${new Date().toISOString()}`);
console.log('--------------------------------------------------');

if (!isDev && fs.existsSync(bundledServer)) {
  console.log('📦 Executing production server bundle...');
  await import(bundledServer);
} else if (!process.execArgv.some((arg) => arg.includes('tsx')) && !process.env.TSX_LOADED) {
  console.log('⚡ Respawning with tsx loader for development...');
  process.env.TSX_LOADED = '1';
  const child = spawn(process.execPath, ['--import', 'tsx', __filename], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
} else {
  console.log('🔧 Importing development server application...');
  await import('./server-app.ts');
}
