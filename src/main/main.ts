import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { initDatabase, closeDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { registerIpcHandlers } from './ipc/handlers';
import { startPriceScheduler, stopPriceScheduler } from './services/priceScheduler';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.webContents.openDevTools();
};

// Load .env from project root (works in dev; in production the .env should be alongside the app)
const appRoot = app.getAppPath().replace(/[\\/]\.vite[\\/].*$/, '');
loadEnv({ path: path.join(appRoot, '.env') });

app.whenReady().then(() => {
  // Initialize database and schema
  initDatabase();
  runMigrations();

  // Register IPC handlers before creating the window
  registerIpcHandlers();

  // Create the main window
  createWindow();

  // Start background price refresh (every 5 min)
  startPriceScheduler(() => mainWindow);
});

app.on('window-all-closed', () => {
  stopPriceScheduler();
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});
