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
    const bnum = guia.querySelector('.guia__bnum');
    const btit = guia.querySelector('.guia__btit');
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
      if (bnum) bnum.textContent = String(i + 1).padStart(2, '0');
      if (btit) btit.textContent = (filas[i].querySelector('.gi__t')?.textContent || '').split(':')[0];
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

/* ---------- buscador (25/11): sin servicios externos, todo en el navegador */
(() => {
  'use strict';
  const quita = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const VACIAS = new Set('el la los las lo de del al en y o u a un una unos unas por para con sin que como donde estan esta son es se mi tu su todos todas todo toda hay ver quiero buscar encontrar cuales cual cuantos cuantas'.split(' '));
  const SIN = { cromo: ['carta', 'coleccion'], cromos: ['cartas', 'coleccion'], carta: ['cromo'], cartas: ['cromos'], bichos: ['animales'], bicho: ['animal'], fauna: ['animales'], coche: ['vehiculo', 'coches'], coches: ['vehiculos'], carro: ['coche'], auto: ['coche'], vehiculos: ['coches'], moto: ['motos'], avion: ['aviones'], barco: ['barcos'], heli: ['helicoptero'], dinero: ['dolares', 'efectivo'], pasta: ['dinero'], logro: ['trofeo'], logros: ['trofeos'], platino: ['trofeo'], flamenco: ['flamencos'], coleccionable: ['coleccionables', 'coleccion'], secreto: ['secretos', 'easter'], secretos: ['easter', 'eggs'], truco: ['trucos', 'codigos'], tanque: ['bunker'], pajaro: ['ave', 'aves'], pajaros: ['aves'], pez: ['peces'], peces: ['pez'], perro: ['perros'], gato: ['gatos'] };
  const terminos = (q) => quita(q).split(/[^a-z0-9ñ]+/).filter((t) => t && !VACIAS.has(t) && (t.length > 1 || /\d/.test(t)));
  const alternativas = (t) => [t, ...(SIN[t] || [])];

  // 1) Caja de búsqueda global: capítulos, apartados, artículos, animales y vehículos.
  document.querySelectorAll('[data-buscar]').forEach((caja) => {
    const entrada = caja.querySelector('input');
    const lista = caja.querySelector('[data-resultados]');
    const estado = caja.querySelector('[data-estado]');
    const borrar = caja.querySelector('[data-limpiar]');
    const raiz = caja.dataset.raiz || './';
    let indice = null;
    let cargando = null;
    const cargar = () => cargando || (cargando = fetch(caja.dataset.idx).then((r) => r.json()).then((j) => {
      indice = j.map((x) => ({ ...x, nt: quita(x.t), nx: quita(x.x + ' ' + x.k) }));
    }).catch(() => { estado.textContent = 'No se pudo cargar el buscador. Recarga la página.'; }));
    const puntua = (x, ts) => {
      let total = 0;
      for (const t of ts) {
        let mejor = 0;
        for (const a of alternativas(t)) {
          if (x.nt.includes(a)) mejor = Math.max(mejor, x.nt.startsWith(a) || x.nt.includes(' ' + a) ? 12 : 8);
          else if (x.nx.includes(a)) mejor = Math.max(mejor, 3);
        }
        if (!mejor) return 0;
        total += mejor;
      }
      if (/^(Lista|Buscador)/.test(x.k)) total += 2; // las listas completas, por delante en empates
      return total;
    };
    const pinta = (res) => {
      lista.replaceChildren(...res.map((x) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = raiz + x.u;
        const k = document.createElement('span'); k.className = 'busca__k'; k.textContent = x.k;
        const t = document.createElement('span'); t.className = 'busca__t'; t.textContent = x.t;
        a.append(k, t);
        if (x.x) { const d = document.createElement('span'); d.className = 'busca__x'; d.textContent = x.x.length > 150 ? x.x.slice(0, 150).replace(/\s\S*$/, '') + '…' : x.x; a.append(d); }
        li.append(a);
        return li;
      }));
    };
    const busca = async () => {
      const q = entrada.value;
      borrar.hidden = !q;
      const ts = terminos(q);
      if (!ts.length) { lista.replaceChildren(); estado.textContent = q.trim() ? 'Escribe alguna palabra más concreta.' : ''; return; }
      await cargar();
      if (!indice || entrada.value !== q) return;
      let res = indice.map((x) => ({ x, p: puntua(x, ts) })).filter((r) => r.p > 0).sort((a, b) => b.p - a.p).map((r) => r.x);
      let parcial = false;
      if (!res.length && ts.length > 1) {
        // sin coincidencia con todas las palabras: enseña lo que acierta con alguna, mejor que nada
        res = indice.map((x) => ({ x, p: Math.max(...ts.map((t) => puntua(x, [t]))) })).filter((r) => r.p > 0).sort((a, b) => b.p - a.p).map((r) => r.x);
        parcial = res.length > 0;
      }
      estado.textContent = res.length ? `${res.length > 30 ? 'Más de 30' : res.length} resultado${res.length === 1 ? '' : 's'}${parcial ? ' (coinciden con alguna de tus palabras)' : ''}` : 'Sin resultados. Prueba con otra palabra: «tanque», «cartas», «animales»…';
      pinta(res.slice(0, 30));
    };
    let t0;
    entrada.addEventListener('input', () => { clearTimeout(t0); t0 = setTimeout(busca, 120); });
    entrada.addEventListener('focus', cargar, { once: true });
    borrar.addEventListener('click', () => { entrada.value = ''; busca(); entrada.focus(); });
    const q0 = new URLSearchParams(location.search).get('q');
    if (q0 && caja.closest('.p-buscar')) { entrada.value = q0; busca(); }
  });

  // 2) Catálogos (animales, vehículos, listas): filtro por texto, grupo y zona sobre fichas ya escritas en el HTML.
  //    Se enseñan de 24 en 24 para que la página no sea interminable; sin JavaScript se ven todas.
  document.querySelectorAll('[data-cat]').forEach((cat) => {
    const fichas = [...cat.querySelectorAll('.ficha')].map((li) => ({ li, t: quita(li.dataset.t), g: li.dataset.g, s: li.dataset.s }));
    const q = cat.querySelector('[data-q]');
    const sel = cat.querySelector('select[data-s]');
    const gsel = cat.querySelector('select[data-gs]');
    const chips = [...cat.querySelectorAll('.chip[data-g]')];
    const n = cat.querySelector('[data-n]');
    const vacio = cat.querySelector('[data-vacio]');
    const mas = cat.querySelector('[data-mas]');
    const sufijo = n.textContent.replace(/^\d+ /, '');
    const PASO = 24;
    let grupo = '';
    let limite = PASO;
    let coinciden = [];
    const pinta = () => {
      const visibles = new Set(coinciden.slice(0, limite));
      for (const f of fichas) f.li.hidden = !visibles.has(f);
      const quedan = coinciden.length - visibles.size;
      if (mas) {
        mas.hidden = quedan <= 0;
        mas.textContent = `Mostrar ${Math.min(PASO, quedan)} más (quedan ${quedan})`;
      }
    };
    const aplica = (reinicia = true) => {
      const ts = terminos(q.value);
      const z = sel ? sel.value : '';
      if (gsel) grupo = gsel.value;
      coinciden = fichas.filter((f) => (!grupo || f.g === grupo) && (!z || f.s.split('|').includes(z)) && ts.every((t) => alternativas(t).some((a) => f.t.includes(a))));
      if (reinicia) limite = PASO;
      n.textContent = coinciden.length === fichas.length ? `${coinciden.length} ${sufijo}` : `${coinciden.length} de ${fichas.length} ${sufijo}`;
      vacio.hidden = coinciden.length > 0;
      pinta();
    };
    q.addEventListener('input', () => aplica());
    if (sel) sel.addEventListener('change', () => aplica());
    if (gsel) gsel.addEventListener('change', () => aplica());
    chips.forEach((c) => c.addEventListener('click', () => {
      grupo = c.dataset.g;
      chips.forEach((o) => o.setAttribute('aria-pressed', String(o === c)));
      aplica();
    }));
    if (mas) mas.addEventListener('click', () => { limite += PASO; pinta(); });
    // enlace directo a una ficha (#id): se abre aunque haya filtros o quede más abajo del límite
    const ir = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const i = id ? coinciden.findIndex((x) => x.li.id === id) : -1;
      if (i >= 0) { limite = Math.max(limite, i + 1); pinta(); fichas.find((x) => x.li.id === id).li.scrollIntoView({ block: 'center' }); }
    };
    addEventListener('hashchange', ir);
    aplica();
    ir();
  });
})();
