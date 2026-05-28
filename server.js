#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

console.log('\n' + colors.bright + colors.blue + '========================================' + colors.reset);
console.log(colors.bright + colors.blue + '   Sistema de Apelaciones DGNNA' + colors.reset);
console.log(colors.bright + colors.blue + '========================================' + colors.reset + '\n');

// Verificar que la base de datos existe, si no, crearla
const dbPath = path.join(__dirname, 'prisma', 'apelaciones.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
    console.log(colors.yellow + '⚠ Primera ejecución detectada. Inicializando base de datos...' + colors.reset);

    // Ejecutar prisma push para crear la base de datos
    const prismaProcess = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    prismaProcess.on('close', (code) => {
        if (code === 0) {
            console.log(colors.green + '✓ Base de datos creada correctamente' + colors.reset);

            // Ejecutar seed
            console.log(colors.yellow + '⚙ Cargando datos iniciales...' + colors.reset);
            const seedProcess = spawn('npm', ['run', 'db:seed'], {
                cwd: __dirname,
                stdio: 'inherit',
                shell: true
            });

            seedProcess.on('close', (seedCode) => {
                if (seedCode === 0) {
                    console.log(colors.green + '✓ Datos iniciales cargados' + colors.reset);
                    startServer();
                } else {
                    console.error('Error al cargar datos iniciales');
                    process.exit(1);
                }
            });
        } else {
            console.error('Error al crear la base de datos');
            process.exit(1);
        }
    });
} else {
    startServer();
}

function startServer() {
    console.log(colors.cyan + '🚀 Iniciando servidor...' + colors.reset);

    const PORT = process.env.PORT || 3000;

    // Iniciar el servidor Next.js
    const serverProcess = spawn('npm', ['start'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, PORT }
    });

    // Esperar 3 segundos y abrir el navegador
    setTimeout(() => {
        console.log('\n' + colors.green + '✓ Servidor iniciado en http://localhost:' + PORT + colors.reset);
        console.log(colors.cyan + '✓ Abriendo navegador...' + colors.reset + '\n');

        // Abrir navegador
        const open = require('open');
        open(`http://localhost:${PORT}`);

        console.log(colors.yellow + '📌 Mantén esta ventana abierta mientras uses el sistema.' + colors.reset);
        console.log(colors.yellow + '📌 Para cerrar, presiona Ctrl+C o cierra esta ventana.\n' + colors.reset);
    }, 3000);

    // Manejar cierre
    process.on('SIGINT', () => {
        console.log('\n' + colors.yellow + '⚠ Cerrando servidor...' + colors.reset);
        serverProcess.kill();
        process.exit(0);
    });

    serverProcess.on('close', (code) => {
        console.log(colors.yellow + '⚠ Servidor cerrado' + colors.reset);
        process.exit(code);
    });
}
