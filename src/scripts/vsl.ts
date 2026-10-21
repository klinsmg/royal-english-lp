import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// a barra de endereço do celular não deve refazer o cálculo da sessão fixa
ScrollTrigger.config({ ignoreMobileResize: true });

const WEIGHTS_ALL = [3, 3, 3, 3, 4, 4, 3]; // unidades de timeline por cena
const MENU: Record<string, number> = { '#vsl': 0 };

export function initVsl() {
  const root = document.querySelector<HTMLElement>('[data-vsl]');
  if (!root) return;
  const q = <T extends Element>(s: string) => gsap.utils.toArray<T>(s, root);
  const scenes = q<HTMLElement>('[data-scene]');
  const bgs = q<HTMLElement>('[data-bg]');
  const tags = q<HTMLElement>('[data-tag]');
  const chapters = q<HTMLElement>('[data-chapter]');
  const ticks = q<HTMLElement>('.vsl-tick');
  const bar = root.querySelector<HTMLElement>('[data-progress]')!;
  const stage = root.querySelector<HTMLElement>('.vsl-scenes')!;
  let goTo: ((i: number) => void) | null = null;

  // Em tela fixa, cada cena é reduzida (zoom) até caber na área do palco
  const fit = () => {
    const on = root.classList.contains('is-pinned');
    const inners = scenes.filter((s) => stage.contains(s)).map((s) => s.firstElementChild as HTMLElement);
    inners.forEach((i) => (i.style.zoom = ''));
    if (!on) return;
    // no celular, reserva folga embaixo para o conteúdo não encostar na linha de progresso
    const pad = innerWidth < 1024 ? 10 : 0;
    // leituras juntas, depois escritas: um único recálculo de layout
    const measure = () => inners.map((i) => Math.min(1, (stage.clientHeight - pad) / i.offsetHeight, stage.clientWidth / i.offsetWidth));
    const k = measure();
    inners.forEach((i, n) => { if (k[n] < 1) i.style.zoom = String(k[n]); });
  };

  // Sessão fixa com as n primeiras cenas em sequência; devolve a limpeza
  const pinned = (n: number, mobile: boolean) => {
    const W = WEIGHTS_ALL.slice(0, n);
    const TOTAL = W.reduce((a, b) => a + b, 0);
    const STARTS = W.map((_, i) => W.slice(0, i).reduce((a, b) => a + b, 0));
    // instante de cada cena em que o conteúdo já entrou por inteiro (ponto de parada do snap)
    const HOLDS = STARTS.map((s, i) => (i === 0 ? 0 : s + Math.min(1.8, W[i] - 0.9)));
    // instante de cada nó da barra: nó k acende quando a cena correspondente chega ao ponto de parada
    const NODES = [0, HOLDS[2], HOLDS[3], HOLDS[4], HOLDS[5], HOLDS[6]];
    const SNAPS = [...HOLDS.map((h) => h / TOTAL), 1];
    const S = scenes.slice(0, n);

    root.classList.add('is-pinned');
    fit();
    gsap.set(S.slice(1), { autoAlpha: 0 });
    gsap.set(tags.slice(1), { autoAlpha: 0 });
    gsap.set(bgs.slice(1), { autoAlpha: 0 });
    const counts = q<HTMLElement>('[data-count]');
    counts.forEach((el) => (el.textContent = '00'));

    let active = -1;
    let lastF = -1;
    const setActive = (i: number) => {
      // animações em laço só rodam na cena visível
      S.forEach((sc, k) => sc.classList.toggle('is-off', k !== i));
      chapters.forEach((c) => c.toggleAttribute('data-active', i >= Number(c.dataset.from) && i <= Number(c.dataset.to)));
    };
    setActive(0);

    const tl: gsap.core.Timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 0.9 * n,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        refreshPriority: 1,
        snap: { snapTo: (p: number) => SNAPS.reduce((best, s) => (Math.abs(s - p) < Math.abs(best - p) ? s : best), SNAPS[0]), directional: false, inertia: false, duration: { min: 0.2, max: 0.6 }, delay: 0.08 },
        onUpdate: (self) => {
          root.classList.toggle('is-scrolled', self.progress > 0.01);
          const t = self.progress * tl.duration();
          const k = Math.min(NODES.findIndex((m) => t < m) - 1, NODES.length - 2);
          const seg = k < 0 ? NODES.length - 2 : k;
          const f = Math.min(1, Math.max(0, (seg + (t - NODES[seg]) / (NODES[seg + 1] - NODES[seg])) / (NODES.length - 1)));
          const fx = Math.round(f * 1000) / 1000;
          if (fx !== lastF) { lastF = fx; bar.style.transform = `scaleX(${fx})`; }
          const reached = Math.round(f * (NODES.length - 1) * 1000) / 1000;
          // só escreve o atributo quando o estado do nó muda (evita recálculo de estilo a cada quadro)
          ticks.forEach((m, i) => {
            const st = i > reached + 0.001 ? '' : i > reached - 1 + 0.001 ? 'on' : 'past';
            if (m.dataset.s !== st) m.dataset.s = st;
          });
          let idx = 0, acc = 0;
          W.forEach((w, i) => { if (t >= acc - 0.3) idx = i; acc += w; });
          if (idx !== active) { active = idx; setActive(idx); }
        },
      },
    });

    let t = 0;
    S.forEach((scene, i) => {
      const w = W[i];
      tl.addLabel(`s${i}`, t);
      if (i > 0) {
        tl.set(scene, { autoAlpha: 1 }, t);
        tl.to(tags[i], { autoAlpha: 1, duration: 0.4 }, t);
        tl.from(scene.querySelectorAll('[data-in]'), { opacity: 0, y: 24, duration: 0.8, stagger: 0.08 }, t);
      }
      if (i < n - 1) {
        tl.to(scene, { autoAlpha: 0, y: -24, duration: 0.5, ease: 'power2.in' }, t + w - 0.5);
        tl.to(tags[i], { autoAlpha: 0, duration: 0.3 }, t + w - 0.5);
      }
      t += w;
    });
    tl.set({}, {}, TOTAL); // garante a duração total (a última cena não tem saída)
    tl.addLabel('end', TOTAL);

    // fundos: cross-fade 3→4 e 4→5 (cena 4 começa em t=9, cena 5 em t=12)
    tl.to(bgs[1], { autoAlpha: 1, duration: 0.8, ease: 'none' }, 9 - 0.8);
    tl.to(bgs[1], { autoAlpha: 0, duration: 0.8, ease: 'none' }, 12 - 0.8);
    tl.to(bgs[2], { autoAlpha: 1, duration: 0.8, ease: 'none' }, 12 - 0.8);

    // microanimações de cada cena
    counts.forEach((el) => {
      const o = { v: 0 };
      tl.to(o, { v: Number(el.dataset.count), duration: 1.1, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(o.v)).padStart(2, '0')) }, 's2+=0.2');
    });
    tl.fromTo('[data-ring]', { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 's2+=0.2');
    const horizontal = !mobile || matchMedia('(min-width: 768px)').matches;
    tl.fromTo('[data-trail-line-method]', horizontal ? { scaleX: 0 } : { scaleY: 0 }, { ...(horizontal ? { scaleX: 1 } : { scaleY: 1 }), duration: 1.4, ease: 'none' }, 's3+=0.3');
    q<HTMLElement>('[data-step]').forEach((s, k) => {
      const at = 0.4 + k * 0.3;
      tl.call(() => s.classList.add('is-lit'), undefined, `s3+=${at}`);
      tl.call(() => s.classList.remove('is-lit'), undefined, `s3+=${at - 0.05}`);
    });
    tl.fromTo('[data-stroke]', { scaleY: 0 }, { scaleY: 1, duration: 0.5, stagger: 0.08 }, 's5+=0.5');

    goTo = (i) => {
      const st = tl.scrollTrigger!;
      const y = st.start + (HOLDS[i] / tl.duration()) * (st.end - st.start);
      window.scrollTo({ top: y, behavior: 'smooth' });
    };

    return () => {
      root.classList.remove('is-pinned');
      scenes.forEach((sc) => sc.classList.remove('is-off'));
      counts.forEach((el) => (el.textContent = '0' + el.dataset.count));
      bar.style.transform = '';
      ticks.forEach((m) => delete m.dataset.s);
      goTo = null;
      fit();
    };
  };

  // Celular em pé: mesma sessão fixa, mas as cenas trocam por classe (transição CSS), sem timeline presa à rolagem: leve em aparelhos simples
  const pinnedLite = () => {
    const n = scenes.length;
    const W = WEIGHTS_ALL.slice(0, n);
    const TOTAL = W.reduce((a, b) => a + b, 0);
    const STARTS = W.map((_, i) => W.slice(0, i).reduce((a, b) => a + b, 0));
    const counts = q<HTMLElement>('[data-count]');
    const steps = q<HTMLElement>('[data-step]');
    const done = new Set<number>();
    root.classList.add('is-pinned', 'is-lite');
    fit();
    counts.forEach((el) => (el.textContent = '00'));
    gsap.set('[data-stroke]', { scaleY: 0 });
    gsap.set('[data-trail-line-method]', { scaleY: 0 });
    gsap.set('[data-ring]', { strokeDashoffset: 100 });

    // microanimações disparam uma vez, quando a cena entra
    const enter = (i: number) => {
      if (done.has(i)) return;
      done.add(i);
      if (i === 2) {
        counts.forEach((el) => {
          const o = { v: 0 };
          gsap.to(o, { v: Number(el.dataset.count), duration: 1.1, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(o.v)).padStart(2, '0')) });
        });
        gsap.to('[data-ring]', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
      }
      if (i === 3) {
        gsap.to('[data-trail-line-method]', { scaleY: 1, duration: 1.4, ease: 'none' });
        steps.forEach((s, k) => gsap.delayedCall(0.4 + k * 0.3, () => s.classList.add('is-lit')));
      }
      if (i === 5) gsap.to('[data-stroke]', { scaleY: 1, duration: 0.5, stagger: 0.08, delay: 0.5 });
    };

    let active = -1;
    const show = (i: number) => {
      scenes.forEach((sc, k) => { sc.classList.toggle('is-on', k === i); sc.classList.toggle('is-off', k !== i); });
      tags.forEach((tg, k) => tg.classList.toggle('is-on', k === i));
      bgs.forEach((b, k) => b.classList.toggle('is-on', k === 0 || (k === 1 ? i === 3 : i >= 4)));
      chapters.forEach((c) => c.toggleAttribute('data-active', i >= Number(c.dataset.from) && i <= Number(c.dataset.to)));
      const reached = i <= 1 ? 0 : i - 1;
      ticks.forEach((m, j) => { m.dataset.s = j > reached ? '' : j === reached ? 'on' : 'past'; });
      bar.style.transform = `scaleX(${reached / (ticks.length - 1)})`;
      enter(i);
    };
    show(0);

    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => '+=' + window.innerHeight * 0.8 * n,
      pin: true,
      anticipatePin: 1,
      refreshPriority: 1,
      onUpdate: (self) => {
        root.classList.toggle('is-scrolled', self.progress > 0.01);
        const t = self.progress * TOTAL;
        let idx = 0;
        STARTS.forEach((s, i) => { if (t >= s) idx = i; });
        if (idx !== active) { active = idx; show(idx); }
      },
    });

    goTo = (i) => window.scrollTo({ top: st.start + ((STARTS[i] + 0.5) / TOTAL) * (st.end - st.start), behavior: 'smooth' });

    return () => {
      root.classList.remove('is-pinned', 'is-lite', 'is-scrolled');
      [...scenes, ...tags, ...bgs].forEach((e) => e.classList.remove('is-on', 'is-off'));
      steps.forEach((s) => s.classList.remove('is-lit'));
      counts.forEach((el) => (el.textContent = '0' + el.dataset.count));
      bar.style.transform = '';
      ticks.forEach((m) => delete m.dataset.s);
      goTo = null;
      fit();
    };
  };

  const mm = gsap.matchMedia();

  // ---------- Desktop: sessão fixa com as 7 cenas ----------
  mm.add('(min-width: 1024px)', () => pinned(WEIGHTS_ALL.length, false));

  // ---------- Tablet em pé: a mesma sessão fixa, com as 7 cenas ----------
  mm.add('(min-width: 768px) and (max-width: 1023px) and (min-height: 560px)', () => pinned(WEIGHTS_ALL.length, true));

  // ---------- Celular em pé: sessão fixa leve ----------
  mm.add('(max-width: 767px) and (min-height: 560px)', () => pinnedLite());

  // ---------- Celular deitado (pouca altura): cenas empilhadas, rolagem normal ----------
  mm.add('(max-width: 1023px) and (max-height: 559px)', () => {
    const ins = q<HTMLElement>('[data-in]');
    gsap.set(ins, { opacity: 0, y: 24 });
    ScrollTrigger.batch(ins, {
      start: 'top 88%',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'opacity,transform', overwrite: true }),
    });
    const counts = q<HTMLElement>('[data-count]');
    counts.forEach((el) => {
      const o = { v: 0 };
      el.textContent = '00';
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: Number(el.dataset.count), duration: 1.1, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(o.v)).padStart(2, '0')) }),
      });
    });
    gsap.fromTo('[data-ring]', { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: '[data-ring]', start: 'top 88%', once: true } });
    const horizontal = matchMedia('(min-width: 768px)').matches;
    gsap.fromTo('[data-trail-line-method]', horizontal ? { scaleX: 0 } : { scaleY: 0 }, {
      ...(horizontal ? { scaleX: 1 } : { scaleY: 1 }), ease: 'none',
      scrollTrigger: { trigger: '[data-trail]', start: 'clamp(top 70%)', end: 'clamp(bottom 55%)', scrub: 0.6 },
    });
    q<HTMLElement>('[data-step]').forEach((s) =>
      ScrollTrigger.create({ trigger: s, start: 'top 65%', onEnter: () => s.classList.add('is-lit'), onLeaveBack: () => s.classList.remove('is-lit') }));
    gsap.set('[data-stroke]', { scaleY: 0 });
    ScrollTrigger.batch('[data-stroke]', { start: 'top 88%', once: true, onEnter: (els) => gsap.to(els, { scaleY: 1, duration: 0.5, stagger: 0.08 }) });
    return () => counts.forEach((el) => (el.textContent = '0' + el.dataset.count));
  });

  // capítulos e menu
  chapters.forEach((b) => b.addEventListener('click', () => goTo?.(Number(b.dataset.goto))));
  document.querySelectorAll<HTMLAnchorElement>('header a[href^="#"]').forEach((a) => {
    const idx = MENU[a.getAttribute('href')!];
    if (idx === undefined) return;
    a.addEventListener('click', (e) => { if (goTo) { e.preventDefault(); goTo(idx); } });
  });

  // "O que você recebe": clique expande o card (só em tela fixa/desktop)
  const cards = q<HTMLElement>('[data-rec-card]');
  const close = () => cards.forEach((c) => c.removeAttribute('data-open'));
  const desktop = matchMedia('(min-width: 1024px)');
  const syncTab = () => cards.forEach((c) => (c.tabIndex = desktop.matches ? 0 : -1));
  syncTab();
  desktop.addEventListener('change', syncTab);
  cards.forEach((c) => {
    c.addEventListener('click', () => {
      if (!root.classList.contains('is-pinned') || matchMedia('(max-width: 1023px)').matches) return;
      const open = !c.hasAttribute('data-open');
      close();
      if (open) c.setAttribute('data-open', '');
    });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
  });
  document.addEventListener('click', (e) => { if (!(e.target as Element).closest('[data-rec-card]')) close(); });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  window.addEventListener('resize', fit);
  document.fonts.ready.then(() => { fit(); ScrollTrigger.refresh(); });
  document.addEventListener('astro:before-swap', () => mm.revert());
}
