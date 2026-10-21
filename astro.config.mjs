import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// URL final do site (canonical e og:image absolutos). Defina SITE_URL no build ou troque aqui.
const site = process.env.SITE_URL || undefined;

export default defineConfig({
  site,
  vite: { plugins: [tailwindcss()] },
});
