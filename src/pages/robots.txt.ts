import type { APIRoute } from 'astro';

// Crawlers de busca e de IA (GEO) liberados. Sem Disallow de pastas internas: listá-las no robots.txt as revelaria.
const bots = [
  'Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot', 'Twitterbot', 'facebookexternalhit', 'LinkedInBot',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot',
];

export const GET: APIRoute = ({ site }) => {
  const origin = site!.origin;
  const body = [
    ...bots.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']),
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
