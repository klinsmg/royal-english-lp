import type { APIRoute } from 'astro';

// 404 fica de fora (noindex). Home tem prioridade máxima; páginas legais, baixa.
const pages = [
  { path: '/', priority: '1.0', freq: 'weekly' },
  { path: '/termos-de-uso', priority: '0.3', freq: 'yearly' },
  { path: '/politica-de-privacidade', priority: '0.3', freq: 'yearly' },
  { path: '/politica-de-cookies', priority: '0.3', freq: 'yearly' },
];

export const GET: APIRoute = ({ site }) => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map(
      (p) =>
        `  <url><loc>${new URL(p.path, site).href}</loc><lastmod>${lastmod}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
