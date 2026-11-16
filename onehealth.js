// ---------- Interface One Health: pessoas, floresta, anomalias e co-ocorrência nos locais da espécie ----------
// Usa as globais do app.js (S, F, THEMES, used, pxValue, pixelAt, resolveTaxon, fetchGBIF, chart…) e o XF do analise.js.
(() => {
const Y = new Date().getFullYear();
const okey = () => `${S.taxon?.name}|${S.fv}`;
function rng(seed) { let x = seed || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
const km = (a, b) => { const dx = (a[1] - b[1]) * 111.32 * Math.cos((a[0] + b[0]) * Math.PI / 360), dy = (a[0] - b[0]) * 110.57; return Math.hypot(dx, dy); };
const POPC = [[0, 5, '< 5'], [5, 25, '5–25'], [25, 100, '25–100'], [100, 1000, '100–1.000'], [1000, Infinity, '≥ 1.000']]; // hab./km²: rural, rural habitado, periurbano, urbano, denso
const popClass = v => POPC.findIndex(([a, b]) => (v ?? 0) >= a && (v ?? 0) < b);
const LOSS9 = L.tileLayer('https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.12/loss_year_alpha/{z}/{x}/{y}.png', {maxNativeZoom: 9});
const PARES = [['Aedes aegypti', 'dengue, zika, chikungunya'], ['Haemagogus janthinomys', 'febre amarela silvestre'], ['Desmodus rotundus', 'raiva'],
  ['Lutzomyia longipalpis', 'leishmaniose visceral'], ['Amblyomma sculptum', 'febre maculosa'], ['Necromys lasiurus', 'hantavirose']];

// ---------- exposição: pessoas e floresta nos locais (amostra) × pontos sorteados na região ----------
// ponytail: amostra de até 400 locais distintos (~1 km) e 200 pontos de fundo; perda de floresta lida no zoom 9 (pixel ~300 m), não nos 30 m originais.
let EX = null;
function sampleLocs(n) {
  const m = new Map();
  used().forEach(r => { const k = r.lat.toFixed(2) + ',' + r.lon.toFixed(2); (m.get(k) || m.set(k, {lat: r.lat, lng: r.lon, recs: []}).get(k)).recs.push(r); });
  const a = [...m.values()], R = rng(a.length * 7 + 5);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
async function probe(p, sea) { // pessoas (GPW 2020), luz (Black Marble 2016) e, em terra, perda de floresta no entorno
  const [pop, lux, loss] = await Promise.all([pxValue(THEMES.pop, 2020, p.lat, p.lng).catch(() => null), pxValue(THEMES.lights, '2016-01-01', p.lat, p.lng).catch(() => null),
    sea ? null : pixelAt(LOSS9, p.lat, p.lng).catch(() => null)]);
  return {pop: pop?.v ?? 0, lux: lux?.v ?? 0, loss: loss && loss[3] >= 13 ? 2001 + Math.round((255 - loss[1]) / 255 * 23) : null};
}
const tileOrder = (a, b) => (Math.floor((a.lng + 180) / 0.7) - Math.floor((b.lng + 180) / 0.7)) || (b.lat - a.lat); // vizinhos seguidos reaproveitam os tiles em cache
async function calcExposure() {
  const sea = S.recSrc === 'obis', pres = sampleLocs(400);
  if (pres.length < 5) return toast('Poucos locais distintos (mínimo 5).');
  const la = pres.map(p => p.lat), lo = pres.map(p => p.lng), pad = Math.max(1, (Math.max(...la) - Math.min(...la)) * .1);
  const box = [Math.max(-80, Math.min(...la) - pad), Math.min(...lo) - pad, Math.min(80, Math.max(...la) + pad), Math.max(...lo) + pad], R = rng(pres.length * 31 + 7);
  EX = {key: okey(), busy: true, done: 0, n: pres.length}; renderOH();
  try {
    const fc = await ecoData(sea ? 'meow' : 'teow'); // fundo só no mesmo meio da espécie (terra ou mar)
    const bg = [];
    for (let i = 0; i < 1500 && bg.length < 200; i++) { const p = {lat: box[0] + R() * (box[2] - box[0]), lng: box[1] + R() * (box[3] - box[1])}; if (locate(fc, p.lng, p.lat)) bg.push(p); }
    const all = [...pres.map(p => ({p, k: 'pres'})), ...bg.map(p => ({p, k: 'bg'}))].sort((a, b) => tileOrder(a.p, b.p)); EX.tot = all.length;
    await pool(all, 8, async x => { Object.assign(x.p, await probe(x.p, sea)); EX.done++; if (EX.done % 40 === 0) renderOH(); });
    EX = {key: okey(), sea, pres, bg, n: pres.length};
  } catch (e) { EX = {key: okey(), err: e.message}; }
  renderOH();
}
const pct = (a, f) => a.length ? 100 * a.filter(f).length / a.length : NaN;
function exposureHTML() {
  const {pres: P, bg: B, sea} = EX, near = p => p.pop >= 100, lit = p => p.lux >= 25;
  const pp = pct(P, near), pb = pct(B, near), ratio = pb > 0 ? pp / pb : null;
  const people = `<div><h4>${ti('users')} Pessoas por perto</h4><canvas id="oh_pop" height="130"></canvas>
    <p class="niche-t"><b>${fmt(pp, 0)}%</b> dos locais têm ≥ 100 hab./km² (região: ${fmt(pb, 0)}%)${ratio ? ` → ${ratio > 1.5 ? `<b>${fmt(ratio, 1)}× mais perto de gente</b> que o acaso` : ratio < .67 ? '<b>mais longe de gente</b> que o acaso' : 'parecido com o acaso'}` : ''}.
    ${fmt(pct(P, lit), 0)}% em áreas iluminadas à noite (região: ${fmt(pct(B, lit), 0)}%).</p>
    <button class="btn soft" data-mk="near">${ti('map-pin')} Marcar no mapa (≥ 100 hab./km²)</button></div>`;
  if (sea) return people + `<div><h4>${ti('axe')} Floresta</h4><p class="muted">Espécie marinha (OBIS): a perda de floresta não se aplica.</p></div>`;
  const L0 = P.filter(p => p.loss), after = L0.filter(p => p.recs.some(r => r.year && r.year < p.loss)), before = L0.filter(p => p.recs.every(r => !r.year || r.year >= p.loss));
  return people + `<div><h4>${ti('axe')} Perda de floresta no entorno</h4><canvas id="oh_loss" height="130"></canvas>
    <p class="niche-t"><b>${fmt(pct(P, p => p.loss), 0)}%</b> dos locais perderam floresta entre 2001 e 2024 (região: ${fmt(pct(B, p => p.loss), 0)}%).
    Em <b>${after.length}</b> o desmatamento veio <b>depois</b> do registro (habitat perdido desde então); em ${before.length} a espécie foi vista <b>já na área desmatada</b>.</p>
    <button class="btn soft" data-mk="loss">${ti('map-pin')} Marcar no mapa</button></div>`;
}
function exposureCharts() {
  const {pres: P, bg: B, sea} = EX, h = a => POPC.map((_, i) => pct(a, p => popClass(p.pop) === i));
  chart('oh_pop', {type: 'bar', data: {labels: POPC.map(c => c[2]), datasets: [{label: 'locais da espécie', data: h(P), backgroundColor: '#0056ff'}, {label: 'região', data: h(B), backgroundColor: 'rgba(79,91,125,.35)'}]},
    options: {plugins: {legend: {position: 'bottom'}, tooltip: {callbacks: {label: c => `${c.dataset.label}: ${fmt(c.raw, 0)}%`}}}, scales: {x: {grid: {display: false}, title: {display: true, text: 'hab./km²'}}, y: {ticks: {callback: v => v + '%'}}}}});
  if (sea) return;
  const yrs = Array.from({length: 24}, (_, i) => 2001 + i), cnt = yrs.map(y => P.filter(p => p.loss === y).length);
  chart('oh_loss', {type: 'bar', data: {labels: yrs, datasets: [{label: 'locais', data: cnt, backgroundColor: yrs.map(y => `rgb(255,${Math.round(255 - (y - 2001) / 23 * 255)},0)`)}]},
    options: {plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `${c.raw} locais perderam floresta em ${c.label}`}}}, scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 6}}, y: {ticks: {precision: 0}}}}});
}

// ---------- anomalias: picos de registros e registros isolados (sem rede, recalcula com os filtros) ----------
let AN = null;
function anomalies() {
  if (AN?.key === okey()) return AN;
  const recs = used(), by = countBy(recs, r => r.year), ys = Object.keys(by).map(Number).sort((a, b) => a - b), spikes = [];
  for (const y of ys) {
    const w = []; for (let k = y - 3; k <= y + 3; k++) if (k !== y && k >= ys[0] && k <= ys.at(-1)) w.push(by[k] || 0);
    const med = quantile(w, .5), mad = quantile(w.map(x => Math.abs(x - med)), .5), c = by[y];
    if (c >= 10 && c >= 2 * med && (c - med) / (1.4826 * Math.max(mad, 1)) > 4) {
      const [ds, n] = sortDesc(countBy(recs.filter(r => r.year === y), r => r.dataset))[0] || [];
      spikes.push({y, c, x: med ? c / med : null, ds, share: n / c});
    }
  }
  const cells = new Map(); // locais distintos a ~10 km; isolado = vizinho mais próximo muito mais longe que o normal
  recs.forEach(r => { const k = r.lat.toFixed(1) + ',' + r.lon.toFixed(1); (cells.get(k) || cells.set(k, {p: [r.lat, r.lon], recs: []}).get(k)).recs.push(r); });
  const C = [...cells.values()];
  if (C.length > 2 && C.length <= 4000) C.forEach(a => { let d = Infinity; for (const b of C) if (b !== a) d = Math.min(d, km(a.p, b.p)); a.nn = d; });
  const nn = C.map(c => c.nn).filter(isFinite), thr = nn.length ? Math.max(200, quantile(nn, .75) + 3 * (quantile(nn, .75) - quantile(nn, .25))) : Infinity;
  const iso = C.filter(c => c.nn > thr);
  return AN = {key: okey(), spikes: spikes.sort((a, b) => b.c - a.c).slice(0, 5), iso, thr, recent: iso.filter(c => c.recs.some(r => r.year >= Y - 10)).length};
}
function anomalyHTML() {
  const A = anomalies();
  const sp = A.spikes.length ? `<ul class="oh-list">${A.spikes.map(s => `<li><button class="link" data-yr="${s.y}">${s.y}</button>: ${fmt(s.c, 0)} registros${s.x ? ` (${fmt(s.x, 1)}× os anos vizinhos)` : ''}${s.share >= .4 ? `, ${fmt(100 * s.share, 0)}% de <i>${esc(String(s.ds).slice(0, 60))}</i>` : ''}</li>`).join('')}</ul>`
    : '<p class="muted">Nenhum ano com pico fora do padrão dos anos vizinhos.</p>';
  return `<div><h4>${ti('chart-arrows-vertical')} Picos de registros</h4>${sp}
      <p class="niche-t">Picos costumam ser campanhas de coleta, BioBlitz ou um conjunto grande publicado (veja a fonte); quando não são, podem indicar surto, mortandade ou explosão populacional.</p></div>
    <div><h4>${ti('radar')} Registros isolados</h4>
      <p class="niche-t"><b>${A.iso.length}</b> locais a mais de ${fmt(A.thr, 0)} km do registro mais próximo${A.iso.length ? `, ${A.recent} deles com registro nos últimos 10 anos` : ''}.
      Podem ser erro de coordenada, indivíduo errante ou <b>expansão da área</b>: vale vigiar em vetores, reservatórios e espécies invasoras.</p>
      ${A.iso.length ? `<button class="btn soft" data-mk="iso">${ti('map-pin')} Marcar no mapa</button>` : ''}</div>`;
}

// ---------- co-ocorrência com outra espécie (vetor, reservatório, hospedeiro) numa grade ----------
let CO = null;
async function calcCo(name) {
  name = name.trim(); if (!name) return toast('Digite o nome da outra espécie.');
  CO = {key: okey(), busy: true, name}; renderOH();
  try {
    const t = await resolveTaxon(name);
    if (!t.key) throw new Error(`“${name}” não foi encontrada no GBIF`);
    const st0 = $('status').innerHTML, B = (await fetchGBIF(t.key, buildParams('gbif'), 1500)).recs.filter(r => r.lat != null);
    $('status').innerHTML = st0; // o fetchGBIF escreve o progresso na linha de status da espécie principal
    const A = used(), all = A.concat(B), ext = Math.max(...all.map(r => r.lat)) - Math.min(...all.map(r => r.lat)) + Math.max(...all.map(r => r.lon)) - Math.min(...all.map(r => r.lon));
    const cs = Math.min(1, Math.max(.1, Math.round(ext / 60 * 10) / 10)), key = r => `${Math.floor(r.lat / cs)},${Math.floor(r.lon / cs)}`;
    const ca = new Set(A.map(key)), cb = new Set(B.map(key)), both = [...ca].filter(k => cb.has(k));
    CO = {key: okey(), name: t.name, nb: B.length, cs, ca, cb, both, j: both.length / (new Set([...ca, ...cb]).size || 1)};
  } catch (e) { CO = {key: okey(), err: e.message, name}; }
  renderOH();
}
function coHTML() {
  const res = !CO || CO.key !== okey() ? '' : CO.busy ? `<p class="muted"><span class="spin"></span> Baixando registros de <i>${esc(CO.name)}</i> no GBIF (até 1.500)…</p>`
    : CO.err ? `<p class="muted">Não deu: ${esc(CO.err)}.</p>`
    : `<p class="niche-t">Grade de ${fmt(CO.cs, 1)}° (~${fmt(CO.cs * 111, 0)} km): <b>${CO.both.length}</b> células com as duas espécies, de ${CO.ca.size} com <i>${esc(S.taxon.name)}</i> e ${CO.cb.size} com <i>${esc(CO.name)}</i>
       (${fmt(CO.nb, 0)} registros). <b>${fmt(100 * CO.both.length / (CO.ca.size || 1), 0)}%</b> das células da espécie têm também a outra · Jaccard <b>${fmt(CO.j, 2)}</b>.</p>
       <button class="btn soft" data-mk="co">${ti('map-2')} Ver sobreposição no mapa</button>`;
  return `<div class="oh-co"><h4>${ti('arrows-join')} Co-ocorrência com outra espécie</h4>
    <p class="niche-t">Onde a espécie divide o espaço com um vetor, reservatório ou hospedeiro? Compara as duas numa grade, com os mesmos filtros de área e período.</p>
    <div class="oh-co-f"><input id="ohCoName" placeholder="Nome científico, ex.: Aedes aegypti" value="${esc(CO?.name || '')}"><button class="btn" id="ohCoGo">${ti('player-play')} Comparar</button></div>
    <div class="oh-pares">${PARES.filter(([n]) => n !== S.taxon?.name).map(([n, d]) => `<button class="qc" data-par="${esc(n)}" title="${esc(d)}"><i>${esc(n)}</i></button>`).join('')}</div>${res}</div>`;
}

// ---------- marcas no mapa (uma por vez, com legenda) ----------
map.createPane('ohmk').style.zIndex = 450; map.createPane('ohgrid').style.zIndex = 290; map.getPane('ohgrid').style.pointerEvents = 'none';
let MK = null;
function mkOff() { if (MK) { map.removeLayer(MK.layer); MK = null; renderDetails(); } }
function mark(kind) {
  mkOff();
  const ring = (p, c, html) => L.circleMarker([p.lat ?? p.p[0], p.lng ?? p.p[1]], {pane: 'ohmk', radius: 9, color: c, weight: 3, fill: false}).bindPopup(html);
  const yrs = recs => [...new Set(recs.map(r => r.year).filter(Boolean))].sort().join(', ') || 'sem ano';
  let layers = [], t = '', c = '#8e24aa', note = '';
  if (kind === 'near') { const P = EX.pres.filter(p => p.pop >= 100); t = 'Registros perto de gente'; c = '#d81b60'; note = `${P.length} locais com ≥ 100 hab./km² (GPW 2020)`;
    layers = P.map(p => ring(p, c, `<b>${POPC[popClass(p.pop)][2]} hab./km²</b><br>brilho noturno ${fmt(p.lux, 0)}%<br>registros: ${yrs(p.recs)}`)); }
  if (kind === 'loss') { const P = EX.pres.filter(p => p.loss); t = 'Registros com perda de floresta no entorno'; c = '#e65100'; note = `${P.length} locais · Hansen/UMD, pixel ~300 m`;
    layers = P.map(p => ring(p, `rgb(255,${Math.round(255 - (p.loss - 2001) / 23 * 200)},0)`, `<b>Perda de floresta em ~${p.loss}</b><br>registros: ${yrs(p.recs)}${p.recs.some(r => r.year && r.year < p.loss) ? '<br><b>habitat perdido depois do registro</b>' : ''}`)); }
  if (kind === 'iso') { const A = anomalies(); t = 'Registros isolados'; c = '#8e24aa'; note = `${A.iso.length} locais a mais de ${fmt(A.thr, 0)} km do vizinho mais próximo`;
    layers = A.iso.map(x => ring(x, c, `<b>Isolado: ${fmt(x.nn, 0)} km do registro mais próximo</b><br>anos: ${yrs(x.recs)}<br>${esc([...new Set(x.recs.map(r => r.dataset))].slice(0, 2).join('; '))}`)); }
  if (kind === 'co') { const cs = CO.cs, cell = (k, col, op) => { const [i, j] = k.split(',').map(Number); return L.rectangle([[i * cs, j * cs], [(i + 1) * cs, (j + 1) * cs]], {pane: 'ohgrid', color: '#ffffff', weight: 1, opacity: .8, fillColor: col, fillOpacity: op, interactive: false}); };
    t = 'Co-ocorrência'; note = `<span class="sq" style="background:#8e24aa"></span> as duas · <span class="sq" style="background:#0056ff"></span> só <i>${esc(S.taxon.name)}</i> · <span class="sq" style="background:#f29a38"></span> só <i>${esc(CO.name)}</i>`;
    layers = [...CO.ca].filter(k => !CO.cb.has(k)).map(k => cell(k, '#0056ff', .3)).concat([...CO.cb].filter(k => !CO.ca.has(k)).map(k => cell(k, '#f29a38', .3)), CO.both.map(k => cell(k, '#8e24aa', .7))); }
  if (!layers.length) return toast('Nada para marcar.');
  MK = {layer: L.featureGroup(layers).addTo(map), t, c, note};
  showView('mapa'); renderDetails();
  setTimeout(() => { map.invalidateSize(); map.fitBounds(MK.layer.getBounds(), {padding: [40, 40], maxZoom: 9}); }, 60); // o mapa estava oculto (tamanho 0) na página do Painel
}
const _rd = renderDetails;
renderDetails = function () { // eslint-disable-line no-func-assign
  _rd();
  if (!MK) return;
  $('detailsBody').insertAdjacentHTML('afterbegin', `<div><h4>${ti('heart-rate-monitor')} ${MK.t}<button class="leg-x" id="ohMkOff" title="Tirar do mapa">${ti('x')}</button></h4><div class="src">${MK.note}</div></div>`);
  $('details').hidden = false; $('ohMkOff').onclick = mkOff;
};

// ---------- o cartão ----------
window.renderOH = () => {
  const el = $('ohCard'); if (!el) return;
  const head = `<h3>${ti('heart-rate-monitor')} Interface One Health <span class="sub">pessoas, floresta, anomalias e co-ocorrência</span></h3>`;
  const fresh = EX?.key === okey(), n = Math.min(400, new Set(used().map(r => r.lat.toFixed(2) + ',' + r.lon.toFixed(2))).size);
  const ex = !fresh || (!EX.pres && !EX.busy && !EX.err)
    ? `<div class="niche-intro"><p>Quanto a espécie vive perto de <b>gente</b> (densidade populacional GPW e luzes noturnas) e em áreas que <b>perderam floresta</b> (Hansen 2001–2024),
       comparado com pontos sorteados na mesma região. É a pressão humana que as perguntas One Health pedem como covariável.</p>
       <button class="btn" id="ohGo">${ti('player-play')} Calcular (${fmt(n, 0)} locais)</button></div>`
    : EX.busy ? `<p class="muted"><span class="spin"></span> Lendo população, luzes e floresta: ${EX.done} de ${EX.tot || '…'} pontos…</p>`
    : EX.err ? `<p class="muted">Não deu para calcular: ${esc(EX.err)}</p><button class="btn soft" id="ohGo">Tentar de novo</button>`
    : `<div class="niche-grid oh2">${exposureHTML()}</div><div class="niche-acts"><span class="muted">${EX.n} locais (~1 km) × ${EX.bg.length} pontos da região.</span><button class="btn soft" id="ohGo">${ti('refresh')} Recalcular</button></div>`;
  el.innerHTML = `${head}${ex}<div class="niche-grid oh2">${anomalyHTML()}</div>${coHTML()}
    ${howto('Pessoas: densidade populacional de 2020 (GPW v4, ~1 km) e brilho noturno de 2016 (Black Marble) no local de cada registro, contra pontos sorteados na região da espécie (só em terra ou só no mar, como ela). O GPW espalha a população de cada setor censitário por igual, então áreas rurais grandes aparecem com 1–2 hab./km² uniformes. Se as barras verdes ficam à direita das cinzas, a espécie é registrada mais perto de gente do que o acaso, o que tanto pode ser contato real quanto viés de amostragem (as pessoas registram onde estão). Floresta: perda de cobertura arbórea (Hansen/UMD) no pixel de ~300 m do registro; "depois do registro" = habitat que existia quando a espécie foi vista. Picos: anos com registros muito acima da mediana dos 3 anos de cada lado. Isolados: locais cujo vizinho mais próximo está além do limite de Tukey das distâncias (mín. 200 km). Co-ocorrência: presença das duas espécies na mesma célula; Jaccard = células com as duas / células com qualquer uma.')}`;
  if (fresh && EX.pres) exposureCharts();
  el.querySelectorAll('#ohGo').forEach(b => b.onclick = calcExposure);
  el.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => mark(b.dataset.mk));
  el.querySelectorAll('[data-yr]').forEach(b => b.onclick = () => window.XF.cYear(+b.dataset.yr));
  el.querySelectorAll('[data-par]').forEach(b => b.onclick = () => { $('ohCoName').value = b.dataset.par; calcCo(b.dataset.par); });
  $('ohCoGo').onclick = () => calcCo($('ohCoName').value);
  $('ohCoName').onkeydown = e => { if (e.key === 'Enter') calcCo(e.target.value); };
};
})();
