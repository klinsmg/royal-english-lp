import Alpine from 'alpinejs';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
window.Alpine = Alpine;

// Contagem regressiva da oferta
Alpine.data('countdown', (deadline: string) => ({
  t: null as null | Record<string, number>,
  init() {
    const end = new Date(deadline).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      this.t = {
        dias: Math.floor(ms / 864e5),
        horas: Math.floor(ms / 36e5) % 24,
        minutos: Math.floor(ms / 6e4) % 60,
        segundos: Math.floor(ms / 1e3) % 60,
      };
    };
    tick();
    setInterval(tick, 1000);
  },
}));

// Reveal on scroll (mesmo gatilho do original: 12% visível, margem inferior de 60px)
document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    once: true,
    onEnter: () => (el.dataset.visible = 'true'),
  });
});

// Texto que acende palavra por palavra com a rolagem (damngoodbrands.com) + marca-texto que se desenha ao entrar
document.querySelectorAll<HTMLElement>('[data-words]').forEach((el) => {
  const words: HTMLElement[] = [];
  const split = (node: Node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (n.textContent ?? '').split(/(\s+)/).forEach((s) => {
          if (!s) return;
          if (/^\s+$/.test(s)) return void frag.append(s);
          const w = document.createElement('span');
          w.textContent = s;
          words.push(w);
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeName !== 'svg') split(n);
    });
  };
  split(el);
  gsap.fromTo(words, { opacity: 0.2 }, {
    opacity: 1,
    ease: 'none',
    duration: 0.5,
    stagger: 0.05,
    scrollTrigger: { trigger: el, start: 'clamp(top 90%)', end: `clamp(bottom ${el.dataset.words || 60}%)`, scrub: true },
  });
});

// Marca-texto à mão (círculo / sublinhado): traçado aleatório a cada carga, desenha quando ≥50% visível e desfaz ao sair
const NS = 'http://www.w3.org/2000/svg';
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ovalPath = (w: number, h: number, pad: number) => {
  const rx = (w - 2 * pad) / 2, ry = (h - 2 * pad) / 2, cx = w / 2, cy = h / 2, k = 0.5523;
  const j = Math.min(Math.max(Math.min(w, h) * 0.08, 3), 20);
  const pts: { x: number; y: number }[] = [];
  for (let lap = 0; lap < 3; lap++)
    pts.push(
      { x: cx, y: cy - ry + rnd(-0.6, 0.6) * j },
      { x: cx + rx + rnd(-0.5, 0.5) * j, y: cy + rnd(-0.6, 0.6) * j },
      { x: cx, y: cy + ry + rnd(-0.6, 0.6) * j },
      { x: cx - rx + rnd(-0.5, 0.5) * j, y: cy + rnd(-0.6, 0.6) * j },
    );
  pts.length -= 3;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], q = i % 4;
    const c1 = q === 0 ? [a.x + rx * k, a.y] : q === 1 ? [a.x, a.y + ry * k] : q === 2 ? [a.x - rx * k, a.y] : [a.x, a.y - ry * k];
    const c2 = q === 0 ? [b.x, b.y - ry * k] : q === 1 ? [b.x + rx * k, b.y] : q === 2 ? [b.x, b.y + ry * k] : [b.x - rx * k, b.y];
    d += `C${c1} ${c2} ${b.x} ${b.y}`;
  }
  return d;
};
const linePath = (w: number, h: number) => {
  const y = () => h / 2 + rnd(-30, 30) * (h / 100);
  return `M${rnd(-0.05 * w, 0.2 * w)} ${y()}L${w * 1.05 - rnd(0, 0.25 * w)} ${y()}L${rnd(-0.05 * w, 0.2 * w)} ${y()}L${w * 1.05 - rnd(0, 0.25 * w)} ${y()}`;
};
document.querySelectorAll<HTMLElement>('[data-hl]').forEach((host) => {
  const circle = host.dataset.hl === 'circle';
  const build = () => {
    host.querySelector('svg')?.remove();
    const { width, height } = host.getBoundingClientRect();
    const [w, h] = circle ? [width + 40, height + 40] : [width, 20];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', circle ? 'hl-circle' : 'hl-line');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', circle ? ovalPath(w, h, 20) : linePath(w, h));
    path.setAttribute('fill', 'none');
    svg.append(path);
    host.append(svg);
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    return gsap.to(path, { strokeDashoffset: 0, duration: circle ? 1.5 : 1.2, ease: circle ? 'power2.in' : 'power2.inOut', paused: true });
  };
  let tl = build();
  let inView = false;
  const go = () => (inView ? tl.play() : tl.reverse());
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; go(); }, { threshold: 0.5 }).observe(host);
  document.fonts.ready.then(() => { const p = tl.progress(); tl.kill(); tl = build(); tl.progress(p); go(); });
});

// Depoimentos: arraste + deriva contínua com balanço (mesma mecânica de "Client Confessions", griflan.com)
document.querySelectorAll<HTMLElement>('[data-slides]').forEach((slides) => {
  const flat = 'flat' in slides.dataset; // FAQ: cards retos, só a deriva
  const swingK = flat ? 0.3 : 1;
  const dir = Number(slides.dataset.dir) || 1; // -1: anda no sentido oposto
  const row = slides.firstElementChild as HTMLElement;
  const wrap = gsap.utils.wrap;
  {
    const base = [...row.children] as HTMLElement[];
    while (row.children.length < 10)
      for (const c of base) {
        const k = c.cloneNode(true) as HTMLElement;
        k.removeAttribute('style');
        k.setAttribute('aria-hidden', 'true');
        row.appendChild(k);
      }
  }
  const cards = [...row.children] as HTMLElement[];
  type S = { el: HTMLElement; end: number; lag: number; rot: number };
  let st: S[] = [], snaps: number[] = [], E = 0, y = 2;
  let l = Number(slides.dataset.offset) || 0, b = 0, active = false, drag = false, V = 0;
  const v = [l, l, l];

  const layout = () => {
    y = innerWidth < 768 ? 3.5 : 2;
    const first = cards[0].offsetLeft;
    snaps = cards.map((c) => c.offsetLeft - first);
    st = cards.map((el, i) => {
      const r = flat ? 0 : Math.random() * 3 + 2;
      const rot = i % 2 ? r : -r;
      el.style.transform = `rotate(${rot}deg)`;
      return { el, end: el.offsetLeft + el.offsetWidth, lag: i % 3, rot };
    });
    const last = cards[cards.length - 1];
    E = last.offsetLeft + last.offsetWidth + parseInt(getComputedStyle(last).marginRight);
  };
  const render = () =>
    st.forEach(({ el, end, lag, rot }) => {
      const x = wrap(end - E, end, v[lag]);
      const u = b * 0.03;
      const swing = swingK * Math.sign(u) * 10 * (1 - Math.exp(-Math.abs(u) / 10));
      el.style.transform = `translate3d(${-x}px,0,0) rotate(${rot + swing}deg)`;
    });
  layout();

  {
    ScrollTrigger.create({ trigger: slides, start: 'top bottom', end: 'bottom top', onToggle: (s) => (active = s.isActive) });
    gsap.ticker.add((_, dt) => {
      if (!active) return;
      const k = Math.min(dt / 16.67, 3);
      l += dir * 0.5 * k;
      [0.09, 0.1, 0.11].forEach((f, i) => (v[i] += (l - v[i]) * Math.min(f * k, 1)));
      b = Math.round((v[0] - l) * 1e3) / 1e3;
      render();
    });
    if (!flat) addEventListener('wheel', (e) => active && (l += dir * e.deltaY * 0.5), { passive: true }); // FAQ: só o cursor mexe
    let t: number;
    addEventListener('resize', () => (clearTimeout(t), (t = window.setTimeout(layout, 150))));

    slides.addEventListener('pointerdown', (e) => ((drag = true), (V = l + e.clientX * y)));
    addEventListener('pointermove', (e) => drag && (l = V - e.clientX * y));
    const release = () => {
      if (!drag) return;
      drag = false;
      const e = wrap(0, E, l);
      l += gsap.utils.snap(snaps, e) - e;
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
  }
});

// Card de oferta (desktop): escala o card para ocupar a janela inteira (altura - header), sem recorte; o título pode ficar de fora
const offer = document.querySelector<HTMLElement>('.squishy');
if (offer) {
  const fit = () => {
    offer.style.zoom = '1';
    if (innerWidth < 1024) return;
    const z = Math.min((innerHeight - 110) / offer.offsetHeight, (innerWidth - 48) / offer.offsetWidth, 1.35) / 1.05; // folga p/ o hover (scale 1.05)
    offer.style.zoom = String(Math.max(0.5, z));
  };
  fit();
  addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
}

// Seções puladas pelo navegador mudam de altura ao serem desenhadas: reposiciona os gatilhos
let cvTimer: number;
document.querySelectorAll('#destino, #investimento, #depoimentos, #minha-historia, #duvidas, #rodape').forEach((el) =>
  el.addEventListener('contentvisibilityautostatechange', () => {
    clearTimeout(cvTimer);
    cvTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  }));

Alpine.start();

// Animações em laço (brilhos, ondas) só rodam nas seções visíveis; fora da tela só gastam recálculo de estilo
const io = new IntersectionObserver(
  (es) => es.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting)),
  { rootMargin: '120px 0px' },
);
document.querySelectorAll('body section, footer').forEach((s) => io.observe(s));
