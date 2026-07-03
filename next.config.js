/** @type {import('next').NextConfig} */

// Para publicar en GitHub Pages (hosting estático). `next build` genera la
// carpeta `out/`. Si el sitio se sirve bajo un subdirectorio
// (https://usuario.github.io/repositorio), definí NEXT_PUBLIC_BASE_PATH="/repositorio".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: {
    // Requerido por la exportación estática (no hay optimizador de imágenes en server).
    unoptimized: true
  }
};

module.exports = nextConfig;
