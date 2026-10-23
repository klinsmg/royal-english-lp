import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// URL final do site (canonical e og:image absolutos). Defina SITE_URL no build ou troque aqui.
const site = process.env.SITE_URL || 'https://royal-english-lp.vercel.app';

export default defineConfig({
  site,
  build: { inlineStylesheets: 'always' },
  vite: { plugins: [tailwindcss()] },
});
