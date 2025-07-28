const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let backendProcess = null;
let mainWindow = null;

// Start the backend server
function startBackend() {
    const backendPath = path.join(__dirname, '..', 'backend');
    const backendScript = isDev ? 'npm run dev' : 'npm start';

    console.log('Starting backend server from:', backendPath);
    console.log('Backend script:', backendScript);

    backendProcess = spawn(backendScript, [], {
        cwd: backendPath,
        shell: true,
        stdio: 'pipe'
    });

    backendProcess.stdout.on('data', (data) => {
        console.log('Backend:', data.toString());
    });

    backendProcess.stderr.on('data', (data) => {
        console.error('Backend Error:', data.toString());
    });

    backendProcess.on('close', (code) => {
        console.log('Backend process exited with code:', code);
    });

    backendProcess.on('error', (error) => {
        console.error('Backend process error:', error);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        title: 'KMU Discipline Desk',
        icon: path.join(__dirname, 'public', 'kmu_logo.ico'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false // Don't show until ready
    });

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Load the app
    if (isDev) {
        // Development: load from Next.js dev server
        const startUrl = 'http://localhost:3000';
        console.log('Loading app from:', startUrl);
        mainWindow.loadURL(startUrl);
    } else {
        // Production: load from backend server
        setTimeout(() => {
            const startUrl = 'http://localhost:5000';
            console.log('Loading app from:', startUrl);
            mainWindow.loadURL(startUrl);
        }, 5000); // Give backend 5 seconds to start
    }

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (backendProcess) {
        console.log('Shutting down backend...');
        backendProcess.kill();
    }
});

app.on('quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});