// ---------- Análises: atalhos de filtro, filtro cruzado (gráficos ↔ mapa), área desenhada, perfil ambiental (nicho),
// adequabilidade climática e comparador antes/depois. Usa as globais do app.js (F, S, TH, THEMES, used, refineChanged…).
(() => {
const Y = new Date().getFullYear(), WET = [10, 11, 12, 1, 2, 3], DRY = [4, 5, 6, 7, 8, 9];
const sameSet = (s, a) => s.size === a.length && a.every(x => s.has(x));
const isObs = b => /human|observa/i.test(b || '');

// ---------- atalhos no topo (mapa e páginas) ----------
const QUICK = [
  {ic: 'calendar-time', t: 'Últimos 10 anos', on: () => F.yr?.[0] === Y - 9 && F.yr[1] === Y, set: on => { F.yr = on ? null : [Y - 9, Y]; }},
  {ic: 'shield-check', t: 'Dentro de UCs', on: () => F.uc === 'in', set: on => { F.uc = on ? '' : 'in'; }},
  {ic: 'cloud-rain', t: 'Out–mar', tip: 'Meses de outubro a março (estação chuvosa em boa parte do Brasil central e Sudeste)', on: () => sameSet(F.mon, WET), set: on => { F.mon = new Set(on ? [] : WET); }},
  {ic: 'sun', t: 'Abr–set', tip: 'Meses de abril a setembro (estação seca em boa parte do Brasil central e Sudeste)', on: () => sameSet(F.mon, DRY), set: on => { F.mon = new Set(on ? [] : DRY); }},
  {ic: 'eye', t: 'Só observações', tip: 'Só registros de observação humana (tira espécimes de museu, telemetria e amostras)', on: () => F.basis.size > 0 && [...F.basis].every(isObs),
    set: on => { F.basis.clear(); if (!on) S.recs.forEach(r => isObs(r.basis) && F.basis.add(r.basis)); }},
];
// os atalhos já cobrem estes filtros; os outros filtros cruzados aparecem como chips removíveis ao lado
const covered = f => f.t === 'área desenhada' || (F.yr && QUICK[0].on() && /^anos /.test(f.t)) || (F.uc === 'in' && f.t === 'dentro de UCs') || (/^meses/.test(f.t) && (QUICK[2].on() || QUICK[3].on())) || (QUICK[4].on() && F.basis.has(f.t) === false && [...F.basis].map(basisPt).includes(f.t));
let boxL = null;
window.renderQchips = c => {
  const el = $('qchips'); if (!el) return;
  if (!S.recs.length) { el.innerHTML = ''; el.hidden = true; drawBoxLayer(); return; }
  const extra = c.filter(f => f.cl && f.x && !/sem erros graves|sem duplicatas/.test(f.t) && !covered(f));
  el.hidden = false;
  el.innerHTML = QUICK.map((q, i) => `<button class="qc ${q.on() ? 'on' : ''}" data-q="${i}" title="${esc(q.tip || q.t)}">${ti(q.ic)}${q.t}</button>`).join('')
    + `<button class="qc ${F.box ? 'on' : ''}" data-q="box" title="Desenhe um retângulo no mapa: o painel e os gráficos passam a contar só o que está dentro">${ti('crop')}${F.box ? 'Área desenhada' : 'Analisar uma área'}</button>`
    + extra.map(f => `<span class="qc x">${ti(f.ic)}${esc(f.t)}<button data-x="${c.indexOf(f)}" title="Remover" aria-label="Remover ${esc(f.t)}">${ti('x')}</button></span>`).join('');
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    if (b.dataset.q === 'box') return F.box ? (F.box = null, refineChanged()) : drawBox();
    const q = QUICK[+b.dataset.q]; q.set(q.on()); refineChanged();
  });
  el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => c[+b.dataset.x].x());
  drawBoxLayer();
};
function drawBoxLayer() {
  if (boxL) { map.removeLayer(boxL); boxL = null; }
  if (F.box) boxL = L.rectangle([[F.box[0], F.box[1]], [F.box[2], F.box[3]]], {color: '#5c9bff', weight: 2, dashArray: '6 5', fill: false, interactive: false}).addTo(map);
}

// ---------- filtro cruzado: clique no gráfico ----------
const tog = (set, k) => { set.has(k) ? set.delete(k) : set.add(k); };
const say = t => toast(`${t} · o mapa e o painel mostram o mesmo recorte`);
window.XF = {
  cYear: (y, e) => {
    if (!S.st?.byYear[y]) return toast(`Nenhum registro em ${y} com os outros filtros.`);
    if (e?.shiftKey && F.yr) F.yr = [Math.min(F.yr[0], y), Math.max(F.yr[1], y)];
    else F.yr = F.yr && F.yr[0] === y && F.yr[1] === y ? null : [y, y];
    refineChanged(); if (F.yr) say(F.yr[0] === F.yr[1] ? `Ano ${y}` : `Anos ${F.yr[0]}–${F.yr[1]}`);
  },
  cMonth: m => { tog(F.mon, m); refineChanged(); },
  cEco: k => { F.eco = F.eco === k ? '' : k; refineChanged(); if (F.eco) say(k); },
  cUC: k => { F.uc = F.uc === k ? '' : k; refineChanged(); },
  cBasis: k => { tog(F.basis, k); refineChanged(); },
  cDs: k => { F.ds = F.ds === k ? '' : k; refineChanged(); },
  cSp: k => { F.sp = F.sp === k ? '' : k; refineChanged(); },
};

// ---------- desenhar uma área no mapa ----------
let drawing = null;
function drawBox() {
  if (S.view !== 'mapa') showView('mapa');
  drawing = {start: null, rect: null}; document.body.classList.add('cutting'); $('boxHint').hidden = false; map.dragging.disable(); map.boxZoom.disable();
}
function endDraw() {
  if (drawing?.rect) map.removeLayer(drawing.rect);
  drawing = null; document.body.classList.remove('cutting'); $('boxHint').hidden = true; map.dragging.enable(); map.boxZoom.enable();
}
function setBox(b) {
  F.box = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(v => +v.toFixed(4)); refineChanged();
  toast(`Área aplicada: ${fmt(used().length, 0)} registros dentro. Veja os gráficos no Painel.`);
}
map.on('mousedown', e => { if (!drawing) return; drawing.start = e.latlng; drawing.rect = L.rectangle([e.latlng, e.latlng], {color: '#5c9bff', weight: 2, dashArray: '6 4', fillOpacity: .08, interactive: false}).addTo(map); });
map.on('mousemove', e => { if (drawing?.start) drawing.rect.setBounds([drawing.start, e.latlng]); });
map.on('mouseup', e => {
  if (!drawing?.start) return;
  const b = L.latLngBounds(drawing.start, e.latlng), a = map.latLngToContainerPoint(b.getNorthWest()), c = map.latLngToContainerPoint(b.getSouthEast());
  window.cutAt = Date.now(); endDraw();
  if (c.x - a.x < 20 || c.y - a.y < 20) return toast('Área pequena demais: arraste um retângulo maior.');
  setBox(b);
});
$('boxView').onclick = () => { endDraw(); setBox(map.getBounds()); };
$('boxCancel').onclick = endDraw;
addEventListener('keydown', e => { if (e.key === 'Escape' && drawing) endDraw(); });

// ---------- perfil ambiental: onde a espécie vive × o que existe na região ----------
// ponytail: amostra de até 60 locais e 60 pontos sorteados na região (fundo). Terra: ERA5 do último ano completo (Open-Meteo); mar: OBIS xylookup.
// É um retrato do nicho realizado, não um modelo: para MaxEnt/biomod2 use o script R de Análise › Exportar.
const NV = {land: [['t', 'Temperatura média anual', '°C', 1], ['p', 'Chuva anual', 'mm', 0], ['e', 'Altitude', 'm', 0]],
  sea: [['t', 'Temperatura da superfície do mar', '°C', 1], ['s', 'Salinidade', '', 1], ['e', 'Profundidade', 'm', 0], ['d', 'Distância da costa', 'km', 0]]};
NV.land.push(['m', 'Meses secos (< 60 mm)', 'meses', 0]);
let NI = null; // {key, kind, box, vars: {t: {pres, bg}}, n}
const nkey = () => `${S.taxon?.name}|${S.fv}`;
function rng(seed) { let x = seed || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; } // sorteio repetível
function locs(n) { // o filtro No mar / Em terra do Painel já vem em used()
  const m = new Map(); used().forEach(r => m.set(r.lat.toFixed(1) + ',' + r.lon.toFixed(1), r));
  const a = [...m.values()], R = rng(a.length * 7 + 3);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n).map(r => [r.lat, r.lon]);
}
async function climate(pts) { // [lat, lon] → [{t, p, e}] em lotes de 50
  const yr = Y - 1, out = [];
  for (let i = 0; i < pts.length; i += 50) {
    const b = pts.slice(i, i + 50);
    const url = `https://archive-api.open-meteo.com/v1/archive?${qs({latitude: b.map(p => p[0].toFixed(3)).join(), longitude: b.map(p => p[1].toFixed(3)).join(),
      start_date: `${yr}-01-01`, end_date: `${yr}-12-31`, daily: 'temperature_2m_mean,precipitation_sum', timezone: 'GMT'})}`;
    let r;
    for (let k = 0; ; k++) { // limite por minuto da API gratuita: espera e tenta de novo
      try { r = [].concat(await getJSON(url)); break; }
      catch (e) { if (k > 2 || !/429/.test(e.message)) throw e;
        toast(`Limite por minuto da Open-Meteo atingido; tentando de novo em ${20 * (k + 1)} s…`);
        await new Promise(f => setTimeout(f, 20000 * (k + 1))); }
    }
    r.forEach(x => { const t = x.daily.temperature_2m_mean.filter(v => v != null), p = x.daily.precipitation_sum.filter(v => v != null), ms = Array(12).fill(0);
      x.daily.time.forEach((d, i) => { ms[+d.slice(5, 7) - 1] += x.daily.precipitation_sum[i] || 0; });
      out.push({t: t.length ? mean(t) : NaN, p: p.length ? p.reduce((s, v) => s + v, 0) : NaN, e: x.elevation, m: p.length ? ms.filter(v => v < 60).length : NaN}); });
  }
  return out;
}
async function ocean(pts) { // OBIS xylookup aceita muitos pontos num POST
  const r = await fetch('https://api.obis.org/xylookup', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({points: pts.map(p => [p[1], p[0]])})}).then(x => { if (!x.ok) throw new Error('OBIS ' + x.status); return x.json(); });
  return r.map(x => x.shoredistance > 0 ? {t: x.grids?.sstemperature ?? NaN, s: x.grids?.sssalinity ?? NaN, e: x.grids?.bathymetry ?? NaN, d: x.shoredistance / 1000} : {t: NaN, s: NaN, e: NaN, d: NaN});
}
async function calcNiche() {
  const kind = nicheKind(), pres = locs(60);
  if (pres.length < 5) return toast('Poucos locais distintos para um perfil (mínimo 5).');
  const la = pres.map(p => p[0]), lo = pres.map(p => p[1]), pad = Math.max(1, (Math.max(...la) - Math.min(...la)) * .1);
  const box = [Math.max(-80, Math.min(...la) - pad), Math.min(...lo) - pad, Math.min(80, Math.max(...la) + pad), Math.max(...lo) + pad], R = rng(pres.length * 13 + 1);
  const bgPts = Array.from({length: 90}, () => [box[0] + R() * (box[2] - box[0]), box[1] + R() * (box[3] - box[1])]);
  NI = {key: nkey(), kind, box, busy: true}; renderNiche();
  try {
    const get = kind === 'sea' ? ocean : climate, [a, b] = await Promise.all([get(pres), get(bgPts)]);
    const bg = b.filter(x => kind === 'sea' ? !isNaN(x.t) : x.e > 0 && !isNaN(x.t)).slice(0, 60); // fundo no mesmo meio (terra ou mar) da espécie
    NI = {key: nkey(), kind, box, n: pres.length, nb: bg.length, vars: Object.fromEntries(NV[kind].map(([k]) => [k, {pres: a.map(x => x[k]).filter(v => !isNaN(v)), bg: bg.map(x => x[k]).filter(v => !isNaN(v))}]))};
  } catch (e) { NI = {key: nkey(), err: e.message}; }
  renderNiche();
}
const ecdf = (a, v) => { let n = 0; for (const x of a) if (x <= v) n++; return n / a.length; };
function nicheText([k, n, u, dec], v) {
  const P = v.pres, B = v.bg; if (P.length < 3 || B.length < 3) return '';
  const f = x => fmt(x, dec), pm = quantile(P, .5), bm = quantile(B, .5), sh = ecdf(B, pm);
  const pos = sh > .7 ? 'a parte <b>mais alta</b> da região' : sh < .3 ? 'a parte <b>mais baixa</b> da região' : 'o <b>meio</b> da faixa da região';
  const wid = (quantile(P, .9) - quantile(P, .1)) / ((quantile(B, .9) - quantile(B, .1)) || 1);
  return `<b>${f(quantile(P, .1))}–${f(quantile(P, .9))} ${u}</b> em 80% dos locais (região: ${f(quantile(B, .1))}–${f(quantile(B, .9))}). Ocupa ${pos}; ${wid < .5 ? 'faixa <b>estreita</b>: possível especialista' : wid > .9 ? 'faixa <b>larga</b>: tolera quase tudo o que a região oferece' : 'faixa intermediária'}.`;
}
window.renderNiche = () => {
  const el = $('nicheCard'); if (!el) return;
  const kind = nicheKind(), fresh = NI?.key === nkey() && NI.kind === kind;
  const head = `<h3>${ti('chart-histogram')} Perfil ambiental <span class="sub">onde a espécie vive × o que existe na região</span></h3>`;
  if (!fresh || (!NI.vars && !NI.busy && !NI.err)) {
    el.innerHTML = `${head}<div class="niche-intro"><p>Compara até 60 locais da espécie com pontos sorteados na mesma região, nas variáveis
      ${NV[kind].map(v => `<b>${v[1].toLowerCase()}</b>`).join(', ')} (${kind === 'sea' ? 'OBIS' : 'ERA5, ano de ' + (Y - 1)}). Mostra a faixa que ela ocupa, se prefere a parte quente/fria ou alta/baixa da região
      e dá um mapa de <b>adequabilidade</b>: onde o ambiente se parece com o dos locais conhecidos.</p>
      <button class="btn" id="nicheGo">${ti('player-play')} Calcular perfil (${fmt(Math.min(60, locs(60).length), 0)} locais)</button></div>`;
    return $('nicheGo').onclick = calcNiche;
  }
  if (NI.busy) return el.innerHTML = `${head}<p class="muted"><span class="spin"></span> Consultando ${NI.kind === 'sea' ? 'o OBIS' : 'o ERA5 (Open-Meteo)'} para os locais e a região…</p>`;
  if (NI.err) { el.innerHTML = `${head}<p class="muted">Não deu para calcular: ${esc(NI.err)}</p><button class="btn soft" id="nicheGo">Tentar de novo</button>`; return $('nicheGo').onclick = calcNiche; }
  const V = NV[NI.kind];
  el.innerHTML = `${head}<div class="niche-grid">${V.map(v => `<div><h4>${v[1]}${v[2] ? ` <small>${v[2]}</small>` : ''}</h4><canvas id="nc_${v[0]}" height="120"></canvas><p class="niche-t">${nicheText(v, NI.vars[v[0]])}</p></div>`).join('')}</div>
    <div class="niche-acts"><span class="muted">${NI.n} locais da espécie × ${NI.nb} pontos da região${NI.kind === 'land' ? ' (só em terra)' : ' (só no mar)'}.</span>
      <button class="btn" id="suitGo">${ti('map-2')} Ver adequabilidade no mapa</button><button class="btn soft" id="nicheGo">${ti('refresh')} Recalcular</button></div>
    ${howto('Barras verdes: proporção dos locais da espécie em cada faixa; cinza: proporção dos pontos sorteados na região. Se as verdes se concentram num canto, a espécie escolhe esse ambiente; se acompanham as cinzas, ocupa o que houver. A adequabilidade segue a lógica do BIOCLIM: cada ponto do mapa recebe nota alta quando todas as variáveis caem no meio da faixa ocupada e zero quando alguma sai dela. Viés de amostragem (estradas, cidades, praias) também aparece aqui: interprete junto com o mapa de registros.')}`;
  for (const [k] of V) {
    const {pres: P, bg: B} = NI.vars[k]; if (!P.length) continue;
    const all = P.concat(B), lo = quantile(all, .02), hi = quantile(all, .98), nb = 14, w = (hi - lo) / nb || 1;
    const h = a => { const c = Array(nb).fill(0); a.forEach(v => { if (v >= lo && v <= hi) c[Math.min(nb - 1, Math.floor((v - lo) / w))]++; }); return c.map(x => 100 * x / (a.length || 1)); };
    chart('nc_' + k, {type: 'bar', data: {labels: Array.from({length: nb}, (_, i) => fmt(lo + (i + .5) * w, k === 't' || k === 's' ? 1 : 0)), datasets: [
      {label: 'locais da espécie', data: h(P), backgroundColor: '#1baf7a', barPercentage: 1, categoryPercentage: .9},
      {label: 'região', data: h(B), backgroundColor: 'rgba(79,91,125,.35)', barPercentage: 1, categoryPercentage: .9}]},
      options: {plugins: {legend: {position: 'bottom'}, tooltip: {callbacks: {label: c => `${c.dataset.label}: ${fmt(c.raw, 0)}%`}}}, scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 5}}, y: {ticks: {callback: v => v + '%'}}}}});
  }
  $('nicheGo').onclick = calcNiche; $('suitGo').onclick = suitability;
};

// ---------- adequabilidade (envelope, como o BIOCLIM) ----------
let SU = null; // {layer, box, n}
const SUIT = ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'];
map.createPane('suit').style.zIndex = 265; map.getPane('suit').style.pointerEvents = 'none';
async function suitability() {
  if (SU?.busy) return toast('A adequabilidade ainda está sendo calculada…');
  const box = NI.box, kind = NI.kind, nx = 16, ny = Math.max(6, Math.min(16, Math.round(16 * (box[2] - box[0]) / (box[3] - box[1]))));
  const y0 = map.project([box[2], box[1]], 0).y, y1 = map.project([box[0], box[1]], 0).y, pts = []; // linhas igualmente espaçadas na projeção do mapa
  for (let j = 0; j < ny; j++) { const lat = map.unproject([0, y0 + (y1 - y0) * (j + .5) / ny], 0).lat; for (let i = 0; i < nx; i++) pts.push([lat, box[1] + (box[3] - box[1]) * (i + .5) / nx]); }
  showView('mapa'); setBusy(true, 'Calculando a adequabilidade…'); toast(`Consultando ${pts.length} pontos da região${kind === 'land' ? ' (pode levar 1–2 min pelo limite da API gratuita)' : ''}…`);
  if (SU) map.removeLayer(SU.layer);
  SU = {busy: true};
  try {
    const env = await (kind === 'sea' ? ocean : climate)(pts), V = NV[kind].map(v => v[0]);
    const c = Object.assign(document.createElement('canvas'), {width: nx, height: ny}), im = new ImageData(nx, ny);
    env.forEach((x, n) => {
      if (kind === 'land' && !(x.e > 0)) return; // fora do meio da espécie: transparente
      const sc = Math.min(...V.map(k => { const P = NI.vars[k].pres, v = x[k]; if (isNaN(v) || !P.length) return 0; const p = ecdf(P, v); return p <= 0 || p >= 1 ? 0 : 2 * Math.min(p, 1 - p); }));
      if (!(sc > 0)) return;
      const rgb = rampColor(SUIT, sc).match(/\d+/g).map(Number);
      im.data.set([...rgb, Math.round(90 + 150 * sc)], 4 * n);
    });
    c.getContext('2d').putImageData(im, 0, 0);
    SU = {layer: L.imageOverlay(c.toDataURL(), [[box[0], box[1]], [box[2], box[3]]], {pane: 'suit', opacity: .85, className: 'suit-img'}).addTo(map), n: NI.n};
    map.fitBounds([[box[0], box[1]], [box[2], box[3]]], {padding: [30, 30]});
    renderDetails();
  } catch (e) { SU = null; toast('Adequabilidade: ' + e.message); }
  setBusy(false);
}
function suitOff() { if (SU?.layer) { map.removeLayer(SU.layer); SU = null; renderDetails(); } }
// legenda: acrescenta o bloco da adequabilidade e o botão de recolher
const _rd = renderDetails;
renderDetails = function () { // eslint-disable-line no-func-assign
  _rd();
  if (SU?.layer) {
    $('detailsBody').insertAdjacentHTML('afterbegin', `<div><h4>${ti('chart-histogram')} Adequabilidade climática <small>envelope</small><button class="leg-x" id="suitOff" title="Desligar">${ti('x')}</button></h4>
      <div class="grad" style="background:linear-gradient(90deg,${SUIT.join()})"></div><div class="grad-l"><span>parecido nas bordas</span><span>no centro do nicho</span></div>
      <div class="src">${S.taxon ? esc(S.taxon.name) + ' · ' : ''}${SU.n} locais · ${NI?.kind === 'sea' ? 'OBIS' : 'ERA5 ' + (Y - 1)}</div></div>`);
    $('details').hidden = false; $('suitOff').onclick = suitOff;
  }
  legHead();
};

// ---------- comparador antes/depois (camadas com tempo em tiles: MapBiomas, UrbVerde, oceano, satélite) ----------
const CMP = {on: false, i: 0, l: null, x: .5};
map.createPane('cmp').style.zIndex = 251; map.getPane('cmp').style.pointerEvents = 'none';
const bar = L.DomUtil.create('div', 'cmp-bar', map.getContainer()); bar.hidden = true;
bar.innerHTML = `<span class="cmp-tag l" id="cmpL"></span><button class="cmp-h" id="cmpH" title="Arraste para comparar">${ti('arrows-horizontal')}</button><span class="cmp-tag r" id="cmpR"></span>`;
L.DomEvent.disableClickPropagation(bar); L.DomEvent.disableScrollPropagation(bar);
const canCmp = () => { const th = THEMES[TH.cur]; return !!(th && th.tiles && !th.wx && !th.eco && TH.times?.length > 1); };
const tlbl = i => { const th = THEMES[TH.cur], t = TH.times?.[i]; return th?.lbl ? th.lbl(t) : String(t ?? ''); };
function clip() {
  if (!CMP.on) return;
  const sz = map.getSize(), nw = map.containerPointToLayerPoint([0, 0]), se = map.containerPointToLayerPoint(sz), x = nw.x + sz.x * CMP.x;
  map.getPane('tema').style.clip = `rect(${nw.y}px, ${x}px, ${se.y}px, ${nw.x}px)`;
  map.getPane('cmp').style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${x}px)`;
  bar.style.left = sz.x * CMP.x + 'px';
  $('cmpL').textContent = tlbl(TH.i); $('cmpR').textContent = tlbl(CMP.i);
}
async function cmpShow() {
  const k = TH.cur, th = THEMES[k], l = await th.tiles(TH.times[CMP.i]); if (TH.cur !== k || !CMP.on) return;
  l.options.pane = 'cmp'; l.setOpacity(TH.op[k] ?? .85); l.addTo(map);
  const old = CMP.l; CMP.l = l; await ready(l); if (old && old !== CMP.l) map.removeLayer(old);
  $('ttLbl2').textContent = tlbl(CMP.i); clip();
}
function cmpStart() {
  if (!canCmp()) return toast('O comparador funciona nas camadas com anos ou dias em imagem (MapBiomas, UrbVerde, oceano, satélite).');
  CMP.on = true; CMP.i = TH.i ? 0 : TH.times.length - 1; CMP.x = .5;
  bar.hidden = false; $('cmpRow').hidden = false; $('ttCmp').classList.add('on');
  Object.assign($('ttRange2'), {max: TH.times.length - 1, value: CMP.i}); rangeP($('ttRange2'));
  cmpShow();
}
function cmpStop() {
  if (!CMP.on) return; CMP.on = false;
  if (CMP.l) map.removeLayer(CMP.l); CMP.l = null;
  map.getPane('tema').style.clip = map.getPane('cmp').style.clip = '';
  bar.hidden = true; $('cmpRow').hidden = true; $('ttCmp').classList.remove('on');
}
$('ttCmp').onclick = () => CMP.on ? cmpStop() : cmpStart();
$('cmpOff').onclick = cmpStop;
let r2T; $('ttRange2').oninput = () => { CMP.i = +$('ttRange2').value; $('ttLbl2').textContent = tlbl(CMP.i); clearTimeout(r2T); r2T = setTimeout(cmpShow, 250); };
map.on('move zoom resize viewreset', clip);
$('ttRange').addEventListener('input', () => setTimeout(clip, 300));
$('cmpH').addEventListener('pointerdown', e => {
  e.preventDefault(); map.dragging.disable(); const rect = map.getContainer().getBoundingClientRect();
  const mv = ev => { CMP.x = Math.max(.03, Math.min(.97, (ev.clientX - rect.left) / rect.width)); clip(); };
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); map.dragging.enable(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
const _st = setTheme;
setTheme = async function (k) { cmpStop(); return _st(k); }; // eslint-disable-line no-func-assign
const _thS = thShow;
thShow = async function (i) { await _thS(i); clip(); }; // eslint-disable-line no-func-assign
const _rdk = renderDock;
renderDock = function () { _rdk(); $('ttCmp').hidden = !canCmp(); }; // eslint-disable-line no-func-assign

// ---------- legenda recolhível (no celular começa recolhida) ----------
let legMin = matchMedia('(max-width: 900px)').matches;
function legHead() {
  const d = $('details'); if (d.hidden) return;
  if (!$('legTog')) d.insertAdjacentHTML('afterbegin', `<button class="leg-tog" id="legTog" aria-expanded="true">${ti('list-details')}<span>Legenda</span>${ti('chevron-down')}</button>`);
  $('legTog').onclick = () => { legMin = !legMin; legHead(); };
  d.classList.toggle('min', legMin); $('legTog').setAttribute('aria-expanded', !legMin);
}
renderDetails(); renderDock(); renderFchips();
})();
