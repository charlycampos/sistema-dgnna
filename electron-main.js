const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let serverProcess;
const PORT = 3000;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false,
        backgroundColor: '#f3f4f6',
        title: 'Sistema de Apelaciones DGNNA'
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.loadURL(`http://localhost:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        console.log('Iniciando servidor Next.js...');

        // Configurar ruta de base de datos en userData
        const dbPath = path.join(app.getPath('userData'), 'prisma', 'apelaciones.db');
        const dbDir = path.dirname(dbPath);

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Copiar schema si no existe
        const schemaTarget = path.join(app.getPath('userData'), 'prisma', 'schema.prisma');
        const schemaSource = path.join(__dirname, 'prisma', 'schema.prisma');

        if (!fs.existsSync(schemaTarget) && fs.existsSync(schemaSource)) {
            fs.copyFileSync(schemaSource, schemaTarget);
        }

        // Usar node.exe directamente para evitar problemas con cmd.exe
        const isPackaged = !__dirname.includes('node_modules');
        const nodePath = isPackaged
            ? process.execPath // En producción, usa el node.exe empaquetado
            : process.execPath; // En desarrollo, usa el node.exe del sistema

        const nextCliPath = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

        console.log('Node path:', nodePath);
        console.log('Next CLI path:', nextCliPath);
        console.log('Working directory:', __dirname);

        serverProcess = spawn(nodePath, [nextCliPath, 'start', '-p', PORT.toString()], {
            cwd: __dirname,
            env: {
                ...process.env,
                PORT: PORT.toString(),
                DATABASE_URL: `file:${dbPath}`,
                NODE_ENV: 'production'
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let serverStarted = false;

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Server: ${output}`);
            if (!serverStarted && (output.includes('Ready') || output.includes('started') || output.includes('Local:'))) {
                serverStarted = true;
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        serverProcess.on('error', (error) => {
            console.error('Error al iniciar servidor:', error);
            if (!serverStarted) {
                reject(error);
            }
        });

        serverProcess.on('exit', (code, signal) => {
            console.log(`Server process exited with code ${code} and signal ${signal}`);
        });

        // Timeout de seguridad más largo para primera ejecución
        setTimeout(() => {
            if (!serverStarted) {
                console.log('Timeout alcanzado, asumiendo que el servidor está listo');
                serverStarted = true;
                resolve();
            }
        }, 15000);
    });
}

app.whenReady().then(async () => {
    try {
        await startServer();
        createWindow();
    } catch (error) {
        console.error('Error al iniciar:', error);
        dialog.showErrorBox(
            'Error al Iniciar',
            'No se pudo iniciar el servidor.\n\nPor favor, contacte al soporte técnico.\n\nError: ' + error.message
        );
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    app.quit();
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
