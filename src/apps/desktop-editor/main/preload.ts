import { contextBridge, ipcRenderer } from 'electron';

console.log('[storymode][preload] exposing API v1');
contextBridge.exposeInMainWorld('storymodeAPI', {
  onMenu: (handler: (payload: any) => void) => {
    ipcRenderer.removeAllListeners('storymode:menu');
    ipcRenderer.on('storymode:menu', (_e, data) => handler(data));
  },
  newStoryDialog: () => ipcRenderer.invoke('storymode:new-story'),
  newNarrativeDialog: () => ipcRenderer.invoke('storymode:new-narrative'),
  openFilesDialog: () => ipcRenderer.invoke('storymode:open-files'),
  saveFile: (name: string, content: string, suggestedPath?: string) => ipcRenderer.invoke('storymode:save-file', { name, content, suggestedPath }),
  saveFileAs: (name: string, content: string) => ipcRenderer.invoke('storymode:save-file-as', { name, content })
});