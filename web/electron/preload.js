/* global require */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getLocalCertificates: () => ipcRenderer.invoke('get-local-certificates')
});
