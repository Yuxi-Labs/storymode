import { app, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track colour mode (auto/dark/light) independent from custom theme choice
let colorModePreference: 'auto' | 'dark' | 'light' = 'auto';
let themeChoice: 'none' | 'narnia' | 'oldenglish' | 'bleu' = 'none';

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
  { label: 'Preview Story', accelerator: 'Ctrl+P', click: () => win.webContents.send('storymode:menu', { command: 'preview-story' }) },
  { label: 'Validate Story', click: () => win.webContents.send('storymode:menu', { command: 'validate-story' }) },
  { label: 'Print Story', click: () => win.webContents.send('storymode:menu', { command: 'print-story' }) },
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
        {
          label: 'Appearance',
          submenu: [
            {
              label: 'Colour Mode',
              submenu: [
                { label: 'Auto', type: 'radio', checked: colorModePreference === 'auto', click: () => { colorModePreference = 'auto'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-auto' }); } },
                { label: 'Dark', type: 'radio', checked: colorModePreference === 'dark', click: () => { colorModePreference = 'dark'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-dark' }); } },
                { label: 'Light', type: 'radio', checked: colorModePreference === 'light', click: () => { colorModePreference = 'light'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-light' }); } }
              ]
            },
            {
              label: 'Themes',
              submenu: [
                { label: 'None', type: 'radio', checked: themeChoice === 'none', click: () => { themeChoice = 'none'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-clear' }); } },
                { label: 'Narnia', type: 'radio', checked: themeChoice === 'narnia', click: () => { themeChoice = 'narnia'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-narnia' }); } },
                { label: 'Old English', type: 'radio', checked: themeChoice === 'oldenglish', click: () => { themeChoice = 'oldenglish'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-oldenglish' }); } },
                { label: 'Bleu', type: 'radio', checked: themeChoice === 'bleu', click: () => { themeChoice = 'bleu'; buildMenu(win); win.webContents.send('storymode:menu', { command: 'theme-bleu' }); } }
              ]
            }
          ]
        }
      ]
    },
    { role: 'window', submenu: [
      { role: 'minimize' },
      { label: 'Maximize', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) { if (w.isMaximized()) w.unmaximize(); else w.maximize(); } } },
      { role: 'close' }
    ] },
    {
      label: 'Tools',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
  { label: 'About StoryMode', click: () => openAboutWindow(win) },
  { type: 'separator' },
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

// Theme preference update from renderer
ipcMain.on('storymode:set-theme-pref', (_e, pref: any) => {
  if (['auto','dark','light'].includes(pref)) {
    colorModePreference = pref;
  } else if (['narnia','oldenglish','bleu','none'].includes(pref)) {
    themeChoice = pref === 'none' ? 'none' : pref;
  }
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  if (win) buildMenu(win);
});

function ensureGeneratedPreload(): string {
  const genDir = path.join(app.getPath('userData'), 'generated');
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
  const preloadPath = path.join(genDir, 'preload.cjs');
  if (!fs.existsSync(preloadPath)) {
  fs.writeFileSync(preloadPath, `const { contextBridge, ipcRenderer } = require('electron');\nconsole.log('[storymode][preload] generated preload loaded');\ncontextBridge.exposeInMainWorld('storymodeAPI',{onMenu:(h)=>{ipcRenderer.removeAllListeners('storymode:menu');ipcRenderer.on('storymode:menu',(_,d)=>h(d));},openFilesDialog:()=>ipcRenderer.invoke('storymode:open-files'),saveFile:(n,c,p)=>ipcRenderer.invoke('storymode:save-file',{name:n,content:c,suggestedPath:p}),saveFileAs:(n,c)=>ipcRenderer.invoke('storymode:save-file-as',{name:n,content:c}),setThemePreference:(pref)=>ipcRenderer.send('storymode:set-theme-pref',pref)});`,'utf8');
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

// ABOUT WINDOW
let aboutWindow: BrowserWindow | null = null;
function openAboutWindow(parent: BrowserWindow) {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }
  const logoCandidates = [
    path.join(process.cwd(), 'assets', 'images', 'logos', 'storymode-logo.png'),
    path.join(process.cwd(), 'assets', 'images', 'logos', 'storymode-logo-char.png')
  ];
  let logoPath = logoCandidates.find(p => fs.existsSync(p));
  let logoDataUri = '';
  try {
    if (logoPath) {
      const buf = fs.readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
    }
  } catch (err) {
    console.warn('[storymode][about] unable to read logo', err);
  }
  const sys = {
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch
  };
  const sysRows = Object.entries(sys).map(([k,v]) => `<tr><td style="padding:4px 8px;text-align:right;font-weight:400;color:#aaa;font-size:11px;">${k}</td><td style="padding:4px 8px;color:#ccc;font-size:11px;">${v}</td></tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><title>About StoryMode</title>
  <style>
  body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif; background:#1e1e1e; color:#ddd; }
  .wrapper { padding:24px 28px 32px; max-width:760px; position:relative; }
  h2 { margin:16px 0 6px; font-size:13px; font-weight:400; letter-spacing:.2px; color:#bbb; }
  table { border-collapse:collapse; width:100%; background:#252526; border:1px solid #333; border-radius:6px; overflow:hidden; font-size:12px; }
  tr:nth-child(even){ background:#2a2a2a; }
  footer { margin-top:18px; font-size:12px; color:#888; line-height:1.5; }
  .logo { width:100%; height:auto; display:block; image-rendering:-webkit-optimize-contrast; margin:0 0 14px; }
    a { color:#4fa3ff; text-decoration:none; }
    a:hover { text-decoration:underline; }
    button.copy { background:#333; border:1px solid #444; color:#ddd; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px; }
    button.copy:hover { background:#3a3a3a; }
    pre { user-select:all; font-size:11px; line-height:1.3; background:#111; padding:8px 10px; border:1px solid #333; border-radius:4px; overflow:auto; }
  </style></head><body>
  <div class='wrapper'>
  ${logoDataUri ? `<img class='logo' src='${logoDataUri}' alt='StoryMode Logo'/>` : ''}
  <div style='margin:0 0 12px; font-size:14px; color:#aaa;'>An environment for writing stories for video games</div>
  <div style='font-size:12px; color:#888; margin:0 0 16px;'>© 2025 William Sawyerr. All rights reserved.</div>
    <h2>System Information</h2>
    <table>${sysRows}</table>
  <footer>This application uses Electron, Chromium, and Node.js.</footer>
  </div>
  <script>
  // (Copy button removed intentionally)
  </script>
  </body></html>`;
  aboutWindow = new BrowserWindow({
    width: 700,
    height: 520,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'About StoryMode',
    backgroundColor: '#1e1e1e',
    parent,
    modal: true,
    show: false,
    webPreferences: { devTools: false }
  });
  aboutWindow.removeMenu();
  aboutWindow.on('closed', () => { aboutWindow = null; });
  const dataUrl = 'data:text/html;base64,' + Buffer.from(html,'utf8').toString('base64');
  aboutWindow.loadURL(dataUrl).finally(()=>{
    if (aboutWindow) aboutWindow.show();
  });
}