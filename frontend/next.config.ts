import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // URL del backend FastAPI — cambiar en producción al hostname del servidor
    BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:8000',
  },
};

export default nextConfig;
