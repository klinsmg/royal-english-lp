import type { APIRoute } from 'astro';
import { faq } from '../data/faq';

// GEO: resumo factual para LLMs (llmstxt.org). Fonte única: o mesmo FAQ exibido na página.
export const GET: APIRoute = ({ site }) => {
  const home = new URL('/', site).href;
  const body = `# Royal English — Fluent Speech

> Trilha de inglês do A1 ao B1+ com aulas gravadas de ~5 minutos e áudios de prática de até 3 minutos, criada pela professora Nágila (Teacher Najila). Estuda-se pelo celular, com acesso vitalício, certificado digital de conclusão e garantia de 7 dias.

- Oferta: R$ 747 (ou 12x de R$ 62,25 sem juros)
- Idioma do conteúdo: português (pt-BR)

## Páginas
- [Página oficial do Fluent Speech](${home}): apresentação, conteúdo, oferta e dúvidas frequentes
- [Termos de uso](${new URL('/termos-de-uso', site).href})
- [Política de privacidade](${new URL('/politica-de-privacidade', site).href})
- [Política de cookies](${new URL('/politica-de-cookies', site).href})

## Perguntas frequentes
${faq.map((f) => `- **${f.q}** ${f.a}`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
