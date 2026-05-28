# Sistema de Gestión de Apelaciones - DGNNA

## Descripción
Este es un proyecto [Next.js](https://nextjs.org) diseñado para la gestión de apelaciones de la DGNNA (Dirección General de Niñas, Niños y Adolescentes). Permite registrar, asignar y dar seguimiento a los expedientes de apelación, incluyendo la generación de reportes y exportación de datos.

## Tecnologías
- **Framework Web**: [Next.js 15](https://nextjs.org/) (React)
- **Base de Datos**: Oracle (vía SQLAlchemy en el Backend)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI**: [Radix UI](https://www.radix-ui.com/) / Lucide Icons

## Requisitos Previos
- [Node.js](https://nodejs.org/) (LTS recomendado, v18 o superior)
- Python 3.11+
- Cliente de Oracle (Instant Client si es necesario) e instanciar `oracledb`.
- Git

## Instalación y Ejecución (Desarrollo)

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/usuario/sistema-apelaciones.git
    cd sistema-apelaciones
    ```

2.  **Configurar Backend:**
    - Ve a la carpeta `backend/`.
    - Crea un archivo `.env` basado en `.env.example`.
    - Configura `DATABASE_URL` con tu cadena de conexión a Oracle:
      `DATABASE_URL=oracle+oracledb://usuario:password@host:1521/?service_name=ORCL`

3.  **Instalar dependencias y ejecutar:**
    - Ejecuta `iniciar.bat` en la raíz para iniciar tanto el Frontend como el Backend.

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo de Next.js.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia la aplicación compilada.
- `npm run electron`: Inicia la aplicación en modo desarrollo de escritorio (Electron).
- `npm run electron:build`: Compila y empaqueta la aplicación de escritorio para Windows.
- `npm run db:studio`: Abre una interfaz web para inspeccionar la base de datos.
- `npm run lint`: Ejecuta el linter (ESLint).

## Estructura de Archivos Clave
- `src/app`: Rutas y páginas de la aplicación (App Router).
- `src/components`: Componentes reutilizables.
- `src/lib`: Utilidades y configuraciones.
- `prisma/schema.prisma`: Definición del esquema de la base de datos.
- `electron-main.js`: Punto de entrada para la aplicación Electron.

## Documentación Adicional
Revisa la carpeta `docs/` para más información:
- [Guía de Inicio Rápido / Usuario Final](docs/COMO_INICIAR.md)
- [Empaquetado y Distribución](docs/EMPAQUETADO.md)
- [Readme de Electron](docs/ELECTRON_README.md)
- [Análisis del Sistema](docs/analisis_sistema_triaje.md)

## Autor
Desarrollado para DGNNA - Ministerio de la Mujer y Poblaciones Vulnerables.
