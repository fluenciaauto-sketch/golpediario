/* Golpe Diario · rediseño. JS mínimo y sin bibliotecas: la web se lee igual sin él. */
(() => {
  'use strict';

  // Móvil: deja a la vista la sección actual en la fila de secciones.
  const nav = document.querySelector('.nav');
  const actual = document.querySelector('.nav__a[aria-current="page"]');
  if (nav && actual && actual.offsetLeft + actual.offsetWidth > nav.clientWidth - 48) nav.scrollLeft = Math.max(0, actual.offsetLeft - 24);

  // Índice de la guía: el dial gira hasta dejar bajo el puntero el capítulo que miras (ratón, teclado o desplazamiento).
  const guia = document.querySelector('.guia');
  if (guia) {
    const filas = [...guia.querySelectorAll('.gi')];
    const num = guia.querySelector('.guia__num');
    const paso = 360 / filas.length;
    let activo = -1;
    let giro = 0;
    const poner = (i) => {
      if (i === activo) return;
      activo = i;
      const delta = (((-i * paso - giro) % 360) + 540) % 360 - 180; // por el camino corto, como al abrir una caja fuerte
      giro += delta;
      guia.style.setProperty('--giro', giro.toFixed(2));
      if (num) num.textContent = String(i + 1).padStart(2, '0');
      filas.forEach((f, k) => f.classList.toggle('es-activa', k === i));
    };
    const porDesplazamiento = () => {
      const ref = innerHeight * 0.42;
      let mejor = 0;
      let dist = Infinity;
      filas.forEach((f, i) => {
        const r = f.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - ref);
        if (d < dist) { dist = d; mejor = i; }
      });
      poner(mejor);
    };
    let pendiente = false;
    addEventListener('scroll', () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; porDesplazamiento(); });
    }, { passive: true });
    filas.forEach((f, i) => {
      f.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') poner(i); });
      const a = f.querySelector('a');
      if (a) a.addEventListener('focus', () => poner(i));
    });
    porDesplazamiento();
  }

  // Capítulo de la guía: marca en el índice lateral el apartado que estás leyendo.
  const enlaces = [...document.querySelectorAll('.indice__ol a')];
  if (enlaces.length && 'IntersectionObserver' in window) {
    const porId = new Map(enlaces.map((a) => [a.getAttribute('href').slice(1), a]));
    const bloques = [...document.querySelectorAll('.cap__b')].filter((b) => b.querySelector('h2[id]'));
    const visibles = new Set();
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) visibles.add(en.target); else visibles.delete(en.target); });
      const primero = bloques.find((b) => visibles.has(b));
      if (!primero) return;
      enlaces.forEach((a) => { a.classList.remove('es-activo'); a.removeAttribute('aria-current'); });
      const a = porId.get(primero.querySelector('h2[id]').id);
      if (a) { a.classList.add('es-activo'); a.setAttribute('aria-current', 'location'); }
    }, { rootMargin: '-18% 0px -55% 0px' });
    bloques.forEach((b) => io.observe(b));
  }

  // ---- versión 2: profundidad de la escena, inclinación de las fotos y el hilo del tablón
  const sinMov = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const hero = document.querySelector('.hero');
  if (hero && fino && !sinMov) {
    hero.addEventListener('pointermove', (ev) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', ((ev.clientX - r.left) / r.width - 0.5).toFixed(3));
      hero.style.setProperty('--py', ((ev.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
  }

  if (fino && !sinMov) {
    document.querySelectorAll('.mos .tj').forEach((tj) => {
      const foto = tj.querySelector('.tj__img');
      if (!foto) return;
      tj.addEventListener('pointermove', (ev) => {
        const r = foto.getBoundingClientRect();
        foto.style.setProperty('--ix', Math.max(-0.5, Math.min(0.5, (ev.clientX - r.left) / r.width - 0.5)).toFixed(3));
        foto.style.setProperty('--iy', Math.max(-0.5, Math.min(0.5, (ev.clientY - r.top) / r.height - 0.5)).toFixed(3));
      });
      tj.addEventListener('pointerleave', () => { foto.style.removeProperty('--ix'); foto.style.removeProperty('--iy'); });
    });
  }

  // El hilo rojo: une las chinchetas de las fotos en zigzag, bajando por los márgenes para no cruzar los textos.
  const tablon = document.querySelector('.tablon');
  if (tablon && 'ResizeObserver' in window) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hilo');
    svg.setAttribute('aria-hidden', 'true');
    tablon.appendChild(svg);
    const pos = (el) => {
      let x = 0; let y = 0; let n = el;
      while (n && n !== tablon) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return [x + el.offsetWidth / 2, y + 3];
    };
    const tender = () => {
      const ancho = tablon.offsetWidth;
      const alto = tablon.offsetHeight;
      const pts = [...tablon.querySelectorAll('.mos__i .tj__img')].map(pos);
      if (pts.length < 2) return;
      const filas = [];
      pts.forEach((p) => {
        const f = filas.find((q) => Math.abs(q[0][1] - p[1]) < 30);
        if (f) f.push(p); else filas.push([p]);
      });
      filas.forEach((f, i) => { f.sort((a, b) => a[0] - b[0]); if (i % 2) f.reverse(); });
      const unaColumna = filas.every((f) => f.length === 1);
      let d = '';
      filas.forEach((f, i) => {
        f.forEach((p, k) => {
          if (i === 0 && k === 0) { d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`; return; }
          if (k > 0) {
            const a = f[k - 1];
            const caida = Math.min(46, Math.abs(p[0] - a[0]) * 0.1 + 10);
            d += ` Q${((a[0] + p[0]) / 2).toFixed(1)} ${(Math.max(a[1], p[1]) + caida).toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
            return;
          }
          const a = filas[i - 1][filas[i - 1].length - 1];
          // margen por el que baja: en una sola columna (móvil) siempre el izquierdo, para no cruzar los titulares
          const gx = (unaColumna || i % 2 === 0) ? -9 : ancho + 9;
          d += ` C${gx} ${a[1].toFixed(1)} ${gx} ${a[1].toFixed(1)} ${gx} ${(a[1] + 60).toFixed(1)}`
             + ` L${gx} ${(p[1] - 60).toFixed(1)} C${gx} ${p[1].toFixed(1)} ${gx} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
        });
      });
      svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
      svg.innerHTML = `<path class="hilo__p" pathLength="1" d="${d}"/>`
        + pts.map((p) => `<circle class="hilo__c" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="8"/><circle class="hilo__b" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6"/>`).join('');
    };
    new ResizeObserver(tender).observe(tablon);
    tender();
  }

  // ---- versión 2b: cursor propio sobre lo que se puede leer (solo con ratón)
  if (fino && !sinMov) {
    const punt = document.createElement('div');
    punt.className = 'puntero';
    punt.setAttribute('aria-hidden', 'true');
    document.body.appendChild(punt);
    let x = 0; let y = 0; let cola = false;
    addEventListener('pointermove', (ev) => {
      x = ev.clientX; y = ev.clientY;
      const sobre = ev.target instanceof Element && ev.target.closest('.tj:not(.tj--mini), .lead');
      punt.classList.toggle('es-visible', Boolean(sobre));
      if (cola) return;
      cola = true;
      requestAnimationFrame(() => { cola = false; punt.style.transform = `translate(${x}px, ${y}px)`; });
    }, { passive: true });
    document.addEventListener('pointerleave', () => punt.classList.remove('es-visible'));
  }
})();
