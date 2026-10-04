import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages serves a project site from /<repo>/, so every asset URL
    // needs that prefix. Applied in dev too, so path bugs show up locally
    // rather than only after a deploy.
    // Override with BASE_PATH=/ for a custom domain or a root-hosted deploy.
    base: process.env.BASE_PATH ?? '/fee-due/',
    plugins: [react(), tailwindcss()],
  };
});
