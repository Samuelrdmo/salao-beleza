import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Cada cliente vive em clients/<slug>/ (client.json, tokens.css e public/).
 * O cliente é escolhido pelo "mode" do Vite:  npm run dev -- --mode tharsy
 * Sem mode, abre a apresentação (clients/demo).
 */
export default defineConfig(({ mode }) => {
  const slug = mode === 'development' || mode === 'production' ? 'demo' : mode;
  const dir = path.resolve(import.meta.dirname, 'clients', slug);
  if (!fs.existsSync(path.join(dir, 'client.json'))) throw new Error(`Cliente "${slug}" não encontrado em clients/${slug}/client.json`);
  const client = JSON.parse(fs.readFileSync(path.join(dir, 'client.json'), 'utf8'));
  const escape = (text: string) => String(text ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return {
    plugins: [react(), tailwindcss(), {
      name: 'client-html',
      transformIndexHtml: html => html
        .replaceAll('%TITLE%', escape(client.seo.title))
        .replaceAll('%DESCRIPTION%', escape(client.seo.description))
        .replaceAll('%THEME_COLOR%', escape(client.seo.themeColor))
        .replaceAll('%FONTS_URL%', escape(client.seo.fontsUrl)),
    }],
    publicDir: path.join(dir, 'public'),
    resolve: { alias: { '@client': dir, '@': path.resolve(import.meta.dirname, 'src') } },
    build: { target: 'es2022' },
  };
});
