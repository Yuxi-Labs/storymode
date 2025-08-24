import { app, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildMenu(win: BrowserWindow) {
  const template: (Electron.MenuItemConstructorOptions)[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Story', accelerator: 'Ctrl+N', click: () => win.webContents.send('storymode:menu', { command: 'new-story' }) },
        { label: 'New Narrative', click: () => win.webContents.send('storymode:menu', { command: 'new-narrative' }) },
        { type: 'separator' },
        { label: 'Open...', accelerator: 'Ctrl+O', click: () => win.webContents.send('storymode:menu', { command: 'open' }) },
        { label: 'Save', accelerator: 'Ctrl+S', click: () => win.webContents.send('storymode:menu', { command: 'save' }) },
        { label: 'Save As...', accelerator: 'Ctrl+Shift+S', click: () => win.webContents.send('storymode:menu', { command: 'save-as' }) },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'Selection',
      submenu: [
        { label: 'Select Line', accelerator: 'Ctrl+L', click: () => win.webContents.send('storymode:menu', { command: 'select-line' }) },
        { label: 'Select Block', accelerator: 'Ctrl+Shift+L', click: () => win.webContents.send('storymode:menu', { command: 'select-block' }) }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    { role: 'window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    {
      role: 'help',
      submenu: [
        { label: 'Learn More', click: () => win.webContents.send('storymode:menu', { command: 'help-learn-more' }) }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let mainWindow: BrowserWindow | null = null;

// IPC handlers (registered once; use focused or main window reference)
ipcMain.handle('storymode:new-story', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win) return { ok: false };
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    message: 'Create a new story in memory? Unsaved changes remain.',
    buttons: ['Create', 'Cancel'],
    defaultId: 0,
    cancelId: 1
  });
  if (response === 0) return { ok: true };
  return { ok: false };
});
ipcMain.handle('storymode:new-narrative', async () => ({ ok: true }));
ipcMain.handle('storymode:open-files', async () => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win) return { canceled: true };
  console.log('[storymode][ipc] open-files invoked');
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Story/Narrative', extensions: ['story', 'narrative'] }]
  });
  if (res.canceled) return { canceled: true };
  console.log('[storymode][ipc] open-files selected', res.filePaths);
  const files = res.filePaths.map(p => ({ path: p, name: path.basename(p), content: fs.readFileSync(p, 'utf8') }));
  return { canceled: false, files };
});
ipcMain.handle('storymode:save-file', async (_e, { name, content, suggestedPath }) => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win) return { saved: false };
  if (suggestedPath && fs.existsSync(suggestedPath)) {
    fs.writeFileSync(suggestedPath, content, 'utf8');
    return { saved: true, path: suggestedPath };
  }
  const saveRes = await dialog.showSaveDialog(win, {
    defaultPath: name,
    filters: [{ name: 'Story/Narrative', extensions: ['story', 'narrative'] }]
  });
  if (saveRes.canceled || !saveRes.filePath) return { saved: false };
  fs.writeFileSync(saveRes.filePath, content, 'utf8');
  return { saved: true, path: saveRes.filePath };
});
ipcMain.handle('storymode:save-file-as', async (_e, { name, content }) => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win) return { saved: false };
  const saveRes = await dialog.showSaveDialog(win, {
    defaultPath: name,
    filters: [{ name: 'Story/Narrative', extensions: ['story', 'narrative'] }]
  });
  if (saveRes.canceled || !saveRes.filePath) return { saved: false };
  fs.writeFileSync(saveRes.filePath, content, 'utf8');
  return { saved: true, path: saveRes.filePath };
});

function ensureGeneratedPreload(): string {
  const genDir = path.join(app.getPath('userData'), 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
  const preloadPath = path.join(genDir, 'preload.cjs');
  if (!fs.existsSync(preloadPath)) {
    fs.writeFileSync(preloadPath, `const { contextBridge, ipcRenderer } = require('electron');\nconsole.log('[storymode][preload] generated preload loaded');\ncontextBridge.exposeInMainWorld('storymodeAPI',{onMenu:(h)=>{ipcRenderer.removeAllListeners('storymode:menu');ipcRenderer.on('storymode:menu',(_,d)=>h(d));},openFilesDialog:()=>ipcRenderer.invoke('storymode:open-files'),saveFile:(n,c,p)=>ipcRenderer.invoke('storymode:save-file',{name:n,content:c,suggestedPath:p}),saveFileAs:(n,c)=>ipcRenderer.invoke('storymode:save-file-as',{name:n,content:c})});`,'utf8');
  }
  return preloadPath;
}

function createWindow() {
  console.log('[storymode] creating main window');
  // Use the icons directory where favicon/tray icons live
  const assetBase = path.join(process.cwd(), 'assets', 'images', 'icons');
  const windowIcon = process.platform === 'linux'
    ? path.join(assetBase, 'favicon.png')
    : path.join(assetBase, 'favicon.ico');
  console.log('[storymode] window icon candidate', windowIcon, 'exists?', fs.existsSync(windowIcon));
  const preloadPath = ensureGeneratedPreload();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: windowIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    }
  });
  mainWindow = win;

  const devServerUrl = 'http://localhost:5173';
  const tryDev = () => {
    console.log('[storymode][main] attempting dev server', devServerUrl);
    win.loadURL(devServerUrl).catch(err => {
      console.warn('[storymode][main] initial dev load failed', err);
      fallbackToFile();
    });
  };
  const fallbackToFile = () => {
    const rendererIndex = path.resolve(__dirname, '../renderer/index.html');
    console.log('[storymode][main] loading file fallback', rendererIndex);
    win.loadFile(rendererIndex).catch(err => console.error('[storymode][main] loadFile error', err));
  };
  // Decide: if --dev flag passed or env hints, attempt dev server first
  const isDevFlag = process.argv.includes('--dev') || !!process.env['STORYMODE_DEV'];
  if (isDevFlag) tryDev(); else fallbackToFile();
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript('console.log("[storymode][main->renderer] window keys:", Object.keys(window)); typeof window.storymodeAPI === "undefined" && console.warn("[storymode][renderer] storymodeAPI missing - preload may not have loaded")').catch(()=>{});
  });
  buildMenu(win);
  ensureTray(win);

}

let tray: Tray | null = null;

function resolveAsset(...segments: string[]) {
  return path.join(__dirname, ...segments);
}

function existingPath(paths: string[]): string | null {
  for (const p of paths) if (fs.existsSync(p)) return p; return null;
}

function ensureTray(win: BrowserWindow) {
  if (tray) return tray;
  // Point to icons directory
  const iconsDir = resolveAsset('../../../../assets/images/icons');
  const faviconPng = path.join(iconsDir, 'favicon.png');
  const trayPng = path.join(iconsDir, 'tray-icon.png');
  // If tray copy missing but favicon exists, copy it (one-time)
  try {
    if (fs.existsSync(faviconPng) && !fs.existsSync(trayPng)) {
      fs.copyFileSync(faviconPng, trayPng);
      console.log('[storymode] created tray icon copy tray-icon.png');
    }
  } catch (err) {
    console.warn('[storymode] unable to copy tray icon', err);
  }
  const candidates = [trayPng, path.join(iconsDir, 'favicon.ico'), faviconPng];
  const iconPath = existingPath(candidates);
  if (!iconPath) {
    console.warn('[storymode] tray icon not found');
    return null;
  }
  console.log('[storymode] tray icon candidate', iconPath);
  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) {
    console.warn('[storymode] loaded empty tray image from', iconPath);
  }
  if (process.platform === 'darwin') {
    // Optionally provide template image if monochrome provided
    // img.setTemplateImage(true); // Uncomment if you convert to stencil style
  }
  tray = new Tray(img); // keep global reference
  tray.setToolTip('StoryMode');
  tray.on('click', () => {
    if (win.isVisible()) { win.hide(); } else { win.show(); }
  });
  return tray;
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