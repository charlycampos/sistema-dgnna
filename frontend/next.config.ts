import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Con middleware activo, Next.js recorta el cuerpo de las peticiones a 10 MB.
    // La base Access de la DSLD (DNA.mdb) pesa ~31 MB. Igual al límite de nginx (50M).
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
