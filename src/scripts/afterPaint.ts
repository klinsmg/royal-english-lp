// Carrega o script só depois da primeira pintura: o conteúdo aparece antes do JS (GSAP, Alpine) rodar
export const afterPaint = <T>(load: () => Promise<T>) =>
  new Promise<T>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => load().then(resolve))));
