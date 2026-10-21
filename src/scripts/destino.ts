import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function initDestino() {
  const root = document.querySelector<HTMLElement>('[data-destino]');
  if (root) {
    const items = gsap.utils.toArray<HTMLElement>('[data-s]', root);
    const glow = root.querySelector<HTMLElement>('[data-glow]')!;
    gsap.set(items, { opacity: 0, y: 16 });
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    items.forEach((el, i) => {
      const turn = el.hasAttribute('data-turn');
      const at = el.hasAttribute('data-q') ? i * 0.25 + 0.05 : i * 0.25;
      tl.to(el, { opacity: 1, y: 0, duration: turn ? 0.8 : 0.5 }, at);
      if (turn) tl.fromTo(glow, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.9 }, at).to(glow, { opacity: 0.5, duration: 1.2 }, '>');
    });
    ScrollTrigger.create({ trigger: root, start: 'top 60%', once: true, onEnter: () => tl.play() });
  }
}
