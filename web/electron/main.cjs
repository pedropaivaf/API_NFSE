const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const os = require('os');

const isDev = !app.isPackaged;

let serverProcess;

function startServer() {
    let scriptPath;

    if (isDev) {
        // Define explicitamente o diretório do servidor no modo de desenvolvimento
        const serverDir = path.join(__dirname, '../../server');
        scriptPath = path.join(serverDir, 'src/index.js');

        console.log('Development mode: Iniciando servidor...');

        try {
            serverProcess = fork(scriptPath, [], {
                cwd: serverDir, // <-- CRUCIAL: Força o Node a rodar daqui, achando o .env
                env: { ...process.env, PORT: 3000 }
            });
            console.log('Backend server started (Dev) PID:', serverProcess.pid);
        } catch (e) {
            console.error('Failed to start server:', e);
        }
    } else {
        // Define explicitamente o diretório do servidor na versão compilada (Produção)
        const serverDirProd = path.join(process.resourcesPath, 'server');
        scriptPath = path.join(serverDirProd, 'src/index.js');
        const polyfillPath = path.join(serverDirProd, 'preload-polyfills.js');

        // Debug log para capturar erros do backend em produção
        const logPath = path.join(app.getPath('userData'), 'server-debug.log');
        const logStream = fs.createWriteStream(logPath, { flags: 'w' });
        logStream.write('--- STARTING BACKGROUND SERVER ---\n');
        logStream.write('Script path: ' + scriptPath + '\n');
        logStream.write('Polyfill path: ' + polyfillPath + '\n');

        console.log('Production mode: Iniciando servidor no path:', scriptPath);

        try {
            if (!fs.existsSync(scriptPath)) {
                console.error('CRITICAL ERROR: Server script not found at', scriptPath);
                return;
            }

            serverProcess = fork(scriptPath, [], {
                cwd: serverDirProd,
                env: { ...process.env, PORT: 3000, NODE_ENV: 'production' },
                execArgv: ['--require', polyfillPath],
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            });

            serverProcess.stdout.on('data', (data) => logStream.write('[stdout] ' + data));
            serverProcess.stderr.on('data', (data) => logStream.write('[stderr] ' + data));
            serverProcess.on('error', (err) => logStream.write('[error] ' + err.message + '\n'));
            serverProcess.on('exit', (code) => logStream.write('Worker process exited with code ' + code + '\n'));

            console.log('Backend server started (Prod) PID:', serverProcess.pid);
        } catch (e) {
            logStream.write('[FATAL] ' + e.message + '\n');
            console.error('Failed to start server:', e);
        }
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        title: 'API NFSe - Busca de Notas Fiscais e Conversão (XML)',
    });

    // ---> FORÇA A JANELA A ABRIR MAXIMIZADA (TELA CHEIA) <---
    win.maximize();

    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('get-local-certificates', async () => {
    const certDir = path.join(os.homedir(), 'Documents', 'Certificados');
    try {
        if (!fs.existsSync(certDir)) {
            return { path: certDir, files: [], error: 'Diretório não encontrado: ' + certDir };
        }
        const files = fs.readdirSync(certDir).filter(file => file.toLowerCase().endsWith('.pfx'));
        return { path: certDir, files };
    } catch (error) {
        return { path: certDir, files: [], error: error.message };
    }
});

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