const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const isDev = !app.isPackaged;

let serverProcess;

function startServer() {
    let scriptPath;

    if (isDev) {
        scriptPath = path.join(__dirname, '../../server/src/index.js');
        console.log('Development mode: Server should be run manually via "npm run dev" in server folder to avoid port conflicts, or uncomment logic here if desired.');
        // For now, in dev we assume user runs server separately or we can spawn it.
        // Given the user request "automate this", let's spawn it but handle errors if port is busy.
        // Actually, let's try to spawn it.
        try {
            serverProcess = fork(scriptPath, [], {
                env: { ...process.env, PORT: 3000 }
            });
            console.log('Backend server started (Dev) PID:', serverProcess.pid);
        } catch (e) {
            console.error('Failed to start server:', e);
        }
    } else {
        // In production, resources are at process.resourcesPath
        scriptPath = path.join(process.resourcesPath, 'server/src/index.js');
        try {
            serverProcess = fork(scriptPath, [], {
                env: { ...process.env, PORT: 3000, NODE_ENV: 'production' }
            });
            console.log('Backend server started (Prod) PID:', serverProcess.pid);
        } catch (e) {
            console.error('Failed to start server:', e);
        }
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        autoHideMenuBar: true,
        title: 'API NFSe - Busca de Notas Fiscais e Conversão (XML)',
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    startServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
