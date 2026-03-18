const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getLocalCertificates: () => ipcRenderer.invoke('get-local-certificates'),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    openExplorer: (path) => ipcRenderer.invoke('open-explorer', path)
});
