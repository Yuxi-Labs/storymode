import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  console.log('[storymode] creating main window');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (process.env.STORYMODE_DEV) {
    win.loadURL('http://localhost:5173');
  } else {
    const rendererIndex = path.resolve(__dirname, '../renderer/index.html');
    win.loadFile(rendererIndex);
  }
}

app.whenReady().then(() => {
  console.log('[storymode] electron app ready');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  console.error('[storymode] uncaught exception', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[storymode] unhandled rejection', reason);
});