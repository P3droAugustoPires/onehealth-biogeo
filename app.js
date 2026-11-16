'use strict';
// ---------- fontes ----------
const OBIS = 'https://api.obis.org/v3', GBIF = 'https://api.gbif.org/v1', INDE = 'https://geoservicos.inde.gov.br/geoserver/';
const MB = 'https://prd.plataforma.mapbiomas.org/api/v1/brazil/', MB_GEO = 'https://shared-geoserver.mapbiomas.org/geoserver/wms';
const MB_SUB = 'coverage_coverage-30m-droufo', MB_LEG = 'coverage-bypu14'; // Coleção 11, 1985–2025; a chave da legenda é redescoberta em mbLegend() se mudar
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c';
const $ = id => document.getElementById(id), $$ = s => [...document.querySelectorAll(s)];
const S = {recs: [], total: 0, params: {}, view: 'mapa', charts: {}, taxon: null, info: null, lc: null, air: null, token: 0, fv: 0, recSrc: 'obis'};
// filtros: reino (sugestões e busca) e refinamentos aplicados no navegador sobre os registros carregados
const F = {king: '', basis: new Set(), unc: 0, sp: '', drop: true, dedup: true, mon: new Set(), ds: '', uc: '', yr: null, box: null, eco: ''}; // yr [a,b] · box [s,w,n,e] · eco: nome // padrão: sem duplicatas e sem erros graves de coordenada

const KINGDOMS = [
  {key: 1, sci: 'Animalia', pt: 'Animais', ic: 'paw', txt: 'Eucariontes multicelulares heterótrofos que obtêm alimento por ingestão. A maioria tem tecidos especializados e se locomove em alguma fase da vida. Vai de esponjas e corais a peixes, aves e mamíferos.'},
  {key: 6, sci: 'Plantae', pt: 'Plantas', ic: 'plant-2', txt: 'Eucariontes fotossintetizantes com cloroplastos de origem primária e parede celular de celulose. No sistema do GBIF inclui algas verdes e vermelhas, musgos, samambaias, gimnospermas e plantas com flor.'},
  {key: 5, sci: 'Fungi', pt: 'Fungos', ic: 'mushroom', txt: 'Eucariontes heterótrofos que absorvem nutrientes do meio e têm parede celular de quitina. São decompositores, simbiontes (micorrizas, liquens) ou parasitas: leveduras, bolores e cogumelos.'},
  {key: 4, sci: 'Chromista', pt: 'Cromistas', ic: 'droplets', txt: 'Grupo diverso de eucariontes, muitos com plastídios vindos de endossimbiose secundária: algas pardas, diatomáceas, dinoflagelados, foraminíferos e oomicetos. Sustentam boa parte das teias alimentares marinhas.'},
  {key: 7, sci: 'Protozoa', pt: 'Protozoários', ic: 'microscope', txt: 'Eucariontes em geral unicelulares e heterótrofos, como amebas, flagelados e parasitas como o Trypanosoma, causador da doença de Chagas.'},
  {key: 3, sci: 'Bacteria', pt: 'Bactérias', ic: 'cell', txt: 'Procariontes (sem núcleo) de enorme diversidade metabólica: fixam nitrogênio, fazem fotossíntese (cianobactérias), decompõem matéria orgânica e formam microbiomas.'},
  {key: 2, sci: 'Archaea', pt: 'Arqueias', ic: 'hexagons', txt: 'Procariontes que diferem das bactérias na química da membrana e na maquinaria genética. Famosas em ambientes extremos, mas comuns também em oceanos e solos; incluem os metanogênicos.'},
  {key: 8, sci: 'Viruses', pt: 'Vírus', ic: 'virus', txt: 'Não formam um reino biológico formal: são agentes acelulares que só se replicam dentro de células. O GBIF os agrupa à parte para registrar suas ocorrências.'},
];
const KBY = Object.fromEntries(KINGDOMS.map(k => [k.sci, k]));
const IUCN = {CR: 'Criticamente em Perigo', EN: 'Em Perigo', VU: 'Vulnerável', NT: 'Quase Ameaçada', LC: 'Menos Preocupante', DD: 'Dados Insuficientes', EW: 'Extinta na Natureza', EX: 'Extinta', NE: 'Não Avaliada'};
const BIOMES = { // biomas WWF (Olson et al. 2001)
  1: ['Florestas tropicais úmidas', '#00796b'], 2: ['Florestas tropicais secas', '#8bc34a'], 3: ['Florestas tropicais de coníferas', '#4e8b3a'],
  4: ['Florestas temperadas mistas', '#26a69a'], 5: ['Florestas temperadas de coníferas', '#2e6b5e'], 6: ['Taiga', '#5f8f86'],
  7: ['Savanas e campos tropicais', '#c6d93b'], 8: ['Campos temperados', '#d9c86a'], 9: ['Campos inundáveis', '#4db6ac'],
  10: ['Campos de montanha', '#a5b89a'], 11: ['Tundra', '#b2dfdb'], 12: ['Matas mediterrâneas', '#e0a458'],
  13: ['Desertos e arbustais xéricos', '#e8c48a'], 14: ['Manguezais', '#004d40'], 98: ['Lagos', '#64b5f6'], 99: ['Rocha e gelo', '#cfd8dc']};
const REALM_PT = {NT: 'Neotropical', NA: 'Neártico', PA: 'Paleártico', AT: 'Afrotropical', IM: 'Indo-Malaio', AA: 'Australasiano', OC: 'Oceânico', AN: 'Antártico'};
const GBIF_SERIOUS = new Set(['ZERO_COORDINATE', 'COORDINATE_OUT_OF_RANGE', 'COORDINATE_INVALID', 'COUNTRY_COORDINATE_MISMATCH', 'PRESUMED_SWAPPED_COORDINATE',
  'PRESUMED_NEGATED_LATITUDE', 'PRESUMED_NEGATED_LONGITUDE', 'SUSPECTED_NEGATED_LATITUDE', 'SUSPECTED_NEGATED_LONGITUDE', 'SUSPECTED_SWAPPED_COORDINATE', 'COORDINATE_REPROJECTION_FAILED', 'RECORDED_DATE_INVALID', 'RECORDED_DATE_UNLIKELY', 'COORDINATE_UNCERTAINTY_METERS_INVALID', 'TAXON_MATCH_FUZZY', 'TAXON_MATCH_HIGHERRANK']);
const FLAG_PT = {ON_LAND: 'coordenada em terra (espécie marinha)', DEPTH_EXCEEDS_BATH: 'profundidade maior que a do local', NO_DEPTH: 'sem profundidade informada',
  DEPTH_OUT_OF_RANGE: 'profundidade fora da faixa', MIN_DEPTH_EXCEEDS_MAX: 'profundidade mínima > máxima', ZERO_COORD: 'coordenada 0,0', NO_MATCH: 'táxon sem correspondência',
  ZERO_COORDINATE: 'coordenada 0,0', COUNTRY_COORDINATE_MISMATCH: 'país não bate com a coordenada', COORDINATE_ROUNDED: 'coordenada arredondada',
  PRESUMED_SWAPPED_COORDINATE: 'latitude e longitude trocadas?', SUSPECTED_SWAPPED_COORDINATE: 'latitude e longitude trocadas?',
  SUSPECTED_NEGATED_LATITUDE: 'sinal da latitude invertido?', SUSPECTED_NEGATED_LONGITUDE: 'sinal da longitude invertido?', PRESUMED_NEGATED_LATITUDE: 'sinal da latitude invertido?', PRESUMED_NEGATED_LONGITUDE: 'sinal da longitude invertido?', RECORDED_DATE_INVALID: 'data inválida', RECORDED_DATE_UNLIKELY: 'data improvável',
  TAXON_MATCH_FUZZY: 'nome do táxon aproximado', TAXON_MATCH_HIGHERRANK: 'identificado só em nível superior', GEODETIC_DATUM_ASSUMED_WGS84: 'datum assumido WGS84',
  CONTINENT_DERIVED_FROM_COORDINATES: 'continente deduzido da coordenada', COORDINATE_UNCERTAINTY_METERS_INVALID: 'incerteza da coordenada inválida',
  INSTITUTION_MATCH_FUZZY: 'instituição aproximada', COLLECTION_MATCH_NONE: 'coleção não encontrada', TAXON_ID_NOT_FOUND: 'ID do táxon não encontrado', GEODETIC_DATUM_INVALID: 'datum inválido'};
// Relevância One Health (Saúde Única) por grupo taxonômico
const ONE_HEALTH = [
  {t: x => x.order === 'Chiroptera', n: 'Morcegos são reservatórios naturais de vírus como os da raiva e coronavírus. Mudanças no uso da terra que os aproximam de pessoas e animais domésticos aumentam o risco de transbordamento (spillover).',
    q: sp => `A perda de habitat está aproximando ${sp} de áreas habitadas e de rebanhos, aumentando o risco de transbordamento viral?`,
    m: 'cruzar os registros com as transições de vegetação nativa para uso antrópico (MapBiomas) e com os casos de raiva em herbívoros (MAPA) e em pessoas (SINAN); GLMM espaço-temporal com a distância a áreas urbanas como covariável.'},
  {t: x => x.order === 'Rodentia', n: 'Roedores são reservatórios de hantavírus, leptospirose e arenavírus; a expansão agrícola e urbana tende a favorecer as espécies generalistas.',
    q: sp => `A expansão agropecuária favorece ${sp} e eleva o risco de hantavirose e leptospirose?`,
    m: 'relacionar a ocorrência com a proporção de lavoura e pastagem no entorno (MapBiomas) e com os casos humanos por município (SINAN); regressão de Poisson com defasagem anual.'},
  {t: x => x.order === 'Primates', n: 'Primatas não humanos são sentinelas da febre amarela silvestre: mortes de macacos antecedem casos humanos e orientam a vacinação.',
    q: sp => `Onde ${sp} vive perto de cidades e fora de Unidades de Conservação, servindo de sentinela da febre amarela?`,
    m: 'sobrepor registros, epizootias notificadas (Ministério da Saúde) e cobertura vacinal; modelo de risco espacial (INLA) com distância à mancha urbana.'},
  {t: x => x.order === 'Carnivora', n: 'Carnívoros silvestres compartilham patógenos com cães domésticos (raiva, cinomose, parvovírus); áreas de contato com assentamentos merecem vigilância.',
    q: sp => `A proximidade entre ${sp} e assentamentos humanos aumenta o compartilhamento de patógenos com cães domésticos?`,
    m: 'distância dos registros a áreas urbanas e rurais (MapBiomas), sorologia de cinomose, parvovírus e raiva quando disponível; modelos de ocupação com covariáveis de pressão humana.'},
  {t: x => x.family === 'Culicidae', n: 'Mosquitos vetores de dengue, zika, chikungunya, febre amarela e malária. Temperatura, chuva e urbanização determinam sua distribuição.',
    q: sp => `Temperatura, chuva e ilhas de calor urbanas explicam onde e quando ${sp} aparece?`,
    m: 'temperatura e chuva no dia do registro (ERA5, já calculado no Painel) e ilha de calor (UrbVerde, tema do mapa) como covariáveis; GAM ou GLMM com defasagem de 1–3 meses; comparar com casos de arboviroses (SINAN).'},
  {t: x => x.family === 'Psychodidae', n: 'Flebotomíneos transmitem as leishmanioses; desmatamento e expansão urbana alteram sua distribuição.',
    q: sp => `O desmatamento e a expansão urbana estão mudando a distribuição de ${sp} e o risco de leishmaniose?`,
    m: 'comparar a cobertura da terra (MapBiomas) nos locais com registro antes e depois de 2000; cruzar com casos de leishmaniose visceral e tegumentar por município (SINAN).'},
  {t: x => x.family === 'Reduviidae', n: 'Triatomíneos (barbeiros) transmitem o Trypanosoma cruzi, causador da doença de Chagas.',
    q: sp => `${sp} está ocupando ambientes ao redor das casas à medida que a vegetação nativa é convertida?`,
    m: 'proporção de registros em áreas antrópicas por década (MapBiomas); comparar com dados de vigilância entomológica do programa de Chagas.'},
  {t: x => x.family === 'Ixodidae', n: 'Carrapatos transmitem riquétsias (febre maculosa) e outros patógenos entre fauna silvestre, animais domésticos e pessoas.',
    q: sp => `Onde fauna silvestre, animais domésticos e pessoas compartilham o habitat de ${sp}, com risco de febre maculosa?`,
    m: 'sobrepor registros, matas ciliares e pastagens (MapBiomas) e casos de febre maculosa (SINAN); modelo de nicho com umidade e temperatura (ERA5).'},
  {t: x => x.class === 'Aves', n: 'Aves, sobretudo aquáticas e migratórias, participam da circulação dos vírus da influenza aviária e do Nilo Ocidental.',
    q: sp => `As áreas usadas por ${sp} coincidem com rotas migratórias e criações de aves, com risco de influenza aviária?`,
    m: 'sazonalidade dos registros (Painel) comparada a rotas migratórias e à localização de granjas; vigilância de influenza aviária (MAPA).'},
  {t: x => ['Cheloniidae', 'Dermochelyidae'].includes(x.family), n: 'Tartarugas marinhas são sentinelas da saúde do oceano: fibropapilomatose, ingestão de plástico e contaminantes refletem a qualidade ambiental costeira.',
    q: sp => `A qualidade ambiental da costa (temperatura do mar, urbanização, esgoto) está ligada à saúde de ${sp}?`,
    m: 'comparar a prevalência de fibropapilomatose e de encalhes (redes de monitoramento de praias) com a urbanização costeira (MapBiomas) e a temperatura do mar.'},
  {t: x => ['Cetacea', 'Sirenia'].includes(x.order) || ['Delphinidae', 'Trichechidae'].includes(x.family), n: 'Mamíferos marinhos acumulam contaminantes e sofrem com morbilivírus; são sentinelas da saúde dos ecossistemas costeiros e de quem depende deles.',
    q: sp => `As áreas de maior ocorrência de ${sp} coincidem com fontes de contaminação e tráfego de embarcações?`,
    m: 'sobrepor registros, desembocaduras de rios, portos e áreas urbanas costeiras; comparar com encalhes e surtos de morbilivírus.'},
  {t: x => ['Bacteria', 'Protozoa', 'Fungi', 'Viruses'].includes(x.kingdom), n: 'Este reino inclui patógenos de pessoas, animais e plantas, e também espécies essenciais à saúde dos ecossistemas (decomposição, ciclagem de nutrientes, microbiomas).',
    q: sp => `Em que ambientes ${sp} é registrado e que papel tem ali: patógeno, simbionte ou decompositor?`,
    m: 'classificar os registros por cobertura da terra e ecorregião; revisar a literatura sobre o papel ecológico e sanitário do táxon.'},
  {t: x => x.class === 'Bivalvia', n: 'Bivalves filtradores concentram toxinas de algas, bactérias e metais: são indicadores da qualidade da água e um risco para quem os consome.',
    q: sp => `Os locais de ocorrência de ${sp} coincidem com florações de algas e áreas de cultivo, com risco para quem consome?`,
    m: 'cruzar registros, clorofila-a (tema do mapa) e áreas de maricultura; monitoramento de toxinas (programas estaduais).'},
];
const ohRules = t => t ? ONE_HEALTH.filter(o => o.t(t)) : [], ohNotes = t => ohRules(t).map(o => o.n);

// ---------- utilidades ----------
const qs = o => Object.entries(o).flatMap(([k, v]) => v === '' || v == null ? [] : [].concat(v).map(x => k + '=' + encodeURIComponent(x))).join('&');
async function getJSON(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(`${r.status} em ${new URL(url, location.href).hostname}`);
  return r.json();
}
async function pool(items, n, fn) { // executa fn com no máximo n requisições simultâneas
  const out = []; let i = 0;
  await Promise.all(Array.from({length: Math.min(n, items.length)}, async () => {
    while (i < items.length) { const j = i++; out[j] = await fn(items[j], j).catch(() => null); }
  }));
  return out;
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const fmt = (x, d = 1) => x == null || isNaN(x) || !isFinite(x) ? '—' : (+x).toLocaleString('pt-BR', {maximumFractionDigits: d});
const pct = (a, b) => b ? fmt(100 * a / b, 0) + '%' : '—';
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
function quantile(a, q) {
  if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, i = Math.floor(p);
  return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i);
}
const countBy = (a, f) => a.reduce((m, x) => { const k = f(x); if (k != null) m[k] = (m[k] || 0) + 1; return m; }, {});
const sortDesc = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
// tipo de registro (Darwin Core basisOfRecord): OBIS usa "HumanObservation", GBIF "HUMAN_OBSERVATION"
const BASIS_PT = {humanobservation: 'Observação humana', machineobservation: 'Sensor ou telemetria', preservedspecimen: 'Espécime de museu', occurrence: 'Ocorrência (genérica)',
  materialsample: 'Amostra de material', materialcitation: 'Citação em publicação', livingspecimen: 'Espécime vivo', fossilspecimen: 'Fóssil', observation: 'Observação', literature: 'Literatura'};
const basisPt = b => BASIS_PT[String(b || '').replace(/_/g, '').toLowerCase()] || (b ? String(b).replace(/_/g, ' ').toLowerCase() : 'não informado');
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// ícones (Tabler): grupo do táxon pela ordem, classe ou reino
const ti = n => `<i class="ti ti-${n}"></i>`;
const TAXIC = {Lepidoptera: 'butterfly', Chiroptera: 'bat', Araneae: 'spider', Testudines: 'shield-half', Aves: 'feather', Mammalia: 'paw', Insecta: 'bug', Arachnida: 'spider',
  Actinopterygii: 'fish', Elasmobranchii: 'fish', Chondrichthyes: 'fish', Amphibia: 'droplet-half-2', Magnoliopsida: 'flower', Liliopsida: 'plant', Polypodiopsida: 'leaf-2',
  Pinopsida: 'tree', Bryopsida: 'leaf', Anthozoa: 'ripple', Bivalvia: 'ripple', Gastropoda: 'spiral', Cephalopoda: 'ripple', Cheloniidae: 'shield-half', Dermochelyidae: 'shield-half'};
const taxIc = t => t && (TAXIC[t.order] || TAXIC[t.family] || TAXIC[t.class] || KBY[t.kingdom]?.ic) || 'dna-2';
const tx = t => `<span class="tx">${gi(grpIc(t))}</span>`; // grupos.js
let busy = 0;
function setBusy(on, msg) {
  busy += on ? 1 : -1; $('progress').classList.toggle('on', busy > 0);
  if (!busy) { $('progress').style.width = '100%'; setTimeout(() => $('progress').style.width = '', 300); }
  if (msg) status(msg);
}
const status = t => $('status').innerHTML = t;
let toastT;
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 3500); }
const badge = c => c ? `<span class="badge ${['CR', 'EX', 'EW'].includes(c) ? 'dark' : ''}" style="background:var(--${c})">${c}</span>` : '<span class="badge" style="background:var(--NE)">—</span>';
const howto = t => `<details class="howto"><summary>Como ler este gráfico</summary><p>${t}</p></details>`;

// ---------- geometria e estatística ----------
function convexHull(pts) { // cadeia monótona; pts = [[lon,lat]]
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function ringAreaKm2(ring) { // área geodésica (fórmula esférica, como turf.area)
  const R = 6378137, rad = Math.PI / 180; let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [l1, p1] = ring[i], [l2, p2] = ring[(i + 1) % ring.length];
    s += (l2 - l1) * rad * (2 + Math.sin(p1 * rad) + Math.sin(p2 * rad));
  }
  return Math.abs(s * R * R / 2) / 1e6;
}
const cellKey = (lon, lat, cell = 2000) => { const R = 6371008.8, rad = Math.PI / 180; return Math.floor(R * lon * rad / cell) + ',' + Math.floor(R * Math.sin(lat * rad) / cell); };
const aooKm2 = pts => new Set(pts.map(([lon, lat]) => cellKey(lon, lat))).size * 4; // células 2×2 km, projeção cilíndrica de áreas iguais
function catB(eoo, aoo) { // limiares do critério B (IUCN), sem subcritérios a–c
  const r = (v, cr, en, vu) => v < cr ? 3 : v < en ? 2 : v < vu ? 1 : 0;
  return ['LC/NT', 'VU', 'EN', 'CR'][Math.max(r(eoo, 100, 5000, 20000), r(aoo, 10, 500, 2000))];
}
function ols(x, y) {
  const n = x.length, mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return {slope: sxy / sxx, r: sxy / Math.sqrt(sxx * syy), n};
}
// ponto em polígono (ray casting) com filtro por bbox; GeoJSON MultiPolygon
function inRing(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const inPoly = (x, y, p) => inRing(x, y, p[0]) && !p.slice(1).some(h => inRing(x, y, h));
function prepGeo(fc) {
  for (const f of fc.features) {
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
    for (const p of f.geometry.coordinates) for (const [x, y] of p[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    f.bbox = [x0, y0, x1, y1];
  }
  return fc;
}
function locate(fc, x, y) {
  for (const f of fc.features) { const b = f.bbox; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && f.geometry.coordinates.some(p => inPoly(x, y, p))) return f.properties; }
  return null;
}
if (location.hash === '#teste') { // autoverificação: abra index.html#teste e veja o console
  const sq = [[0, 0], [1, 0], [1, 1], [0, 1], [.5, .5]];
  console.assert(Math.abs(ringAreaKm2(convexHull(sq)) - 12364) < 50, 'EOO 1°x1° no equador ≈ 12.364 km²');
  console.assert(convexHull(sq).length === 4, 'casco convexo ignora ponto interno');
  console.assert(aooKm2([[0, 0], [0.001, 0.001], [5, 5]]) === 8, 'AOO: 2 células de 4 km²');
  console.assert(catB(50, 600) === 'CR' && catB(30000, 400) === 'EN' && catB(30000, 3000) === 'LC/NT', 'limiares do critério B');
  console.assert(qs({a: [1, 2], b: ''}) === 'a=1&a=2', 'qs repete arrays e ignora vazios');
  const donut = prepGeo({features: [{properties: {id: 1}, geometry: {coordinates: [[[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]]}}]});
  console.assert(locate(donut, .5, .5)?.id === 1 && locate(donut, 2, 2) === null && locate(donut, 5, 5) === null, 'ponto em polígono respeita buracos');
  console.log('autoverificação concluída');
}

// ---------- mapa ----------
const map = L.map('map', {preferCanvas: true, worldCopyJump: true, zoomControl: false}).setView([-15, -50], 4);
L.control.zoom({position: 'topright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar'}).addTo(map);
map.attributionControl.setPosition('bottomleft');
// ordem fixa das camadas (de baixo para cima): mapa-base · tema · limites · densidade · pontos
const pane = (n, z, click = true) => { const p = map.createPane(n); p.style.zIndex = z; if (!click) p.style.pointerEvents = 'none'; return p; };
pane('tema', 250, false); pane('eco', 260); pane('clima', 270, false); pane('limites', 300, false); pane('grade', 380);
const ecoRenderer = L.canvas({pane: 'eco'}), gridRenderer = L.canvas({pane: 'grade'});
const BASEMAPS = {
  Oceano: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {maxZoom: 13, attribution: 'Esri, GEBCO, NOAA'}),
  Satélite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 18, attribution: 'Esri, Maxar'}),
  Ruas: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}),
};
let base = 'Oceano'; BASEMAPS[base].addTo(map);
const ptsLayer = L.layerGroup().addTo(map), gridLayer = L.layerGroup();
let gbifDensity = null, ecoLayer = null;
const wmsLayers = {}, OP = {wms: {}};

// limites e territórios: vários ao mesmo tempo, sempre acima do tema
const wmsUrl = c => c.dataset.url === 'MB' ? MB_GEO : INDE + c.dataset.url.split(':')[1] + '/wms';
$$('.wms').forEach(c => c.onchange = () => {
  wmsLayers[c.value] ||= L.tileLayer.wms(wmsUrl(c), {layers: c.value, format: 'image/png', transparent: true, opacity: OP.wms[c.value] ?? .6, pane: 'limites', attribution: c.dataset.url === 'MB' ? 'MapBiomas' : 'MMA/ICMBio (INDE)'});
  c.checked ? wmsLayers[c.value].addTo(map) : map.removeLayer(wmsLayers[c.value]);
  renderDetails();
});
const lblOf = input => input.closest('label').textContent.trim();
function renderWmsOp() { // transparência de cada limite ligado
  const on = $$('.wms:checked');
  $('wmsOp').innerHTML = on.length ? '<p class="hint">Transparência</p>' + on.map(c => `<label class="wmsop"><span>${esc(lblOf(c))}</span><input type="range" min="0.15" max="1" step="0.05" value="${OP.wms[c.value] ?? .6}" data-l="${esc(c.value)}"></label>`).join('') : '';
  $$('#wmsOp input').forEach(r => r.oninput = () => wmsLayers[r.dataset.l].setOpacity(OP.wms[r.dataset.l] = +r.value));
}

// ---------- ecorregiões (WWF terrestres e MEOW marinhas, simplificadas em data/) ----------
const ECO = {};
const ecoData = k => ECO[k] ||= getJSON(`data/${k}.json`).then(prepGeo);
const ecoKey = (kind, p) => kind === 'teow' ? p.ECO_ID : p.ECO_CODE;
const ecoName = p => p ? p.ECO_NAME || p.ECOREGION : null;
async function assignEco(recs) {
  const [t, m] = await Promise.all([ecoData('teow'), ecoData('meow')]);
  for (const r of recs) { r._eco = locate(t, r.lon, r.lat); r._meco = r._eco ? null : locate(m, r.lon, r.lat); }
}
function ecoStats(kind) { // registros e riqueza por ecorregião, como compute_species_richness.R do gbif-ecoregions
  const out = {}, f = kind === 'teow' ? '_eco' : '_meco';
  for (const r of used()) {
    const p = r[f]; if (!p) continue;
    const k = ecoKey(kind, p); (out[k] ||= {p, n: 0, sp: new Set()}).n++; out[k].sp.add(r.sci);
  }
  return out;
}
async function showEco(th) {
  const kind = th.eco, rich = th.rich, fc = await ecoData(kind).catch(() => null);
  if (!fc) return toast('Não consegui carregar as ecorregiões (pasta data/).');
  if (ecoLayer) map.removeLayer(ecoLayer);
  const st = rich ? ecoStats(kind) : null, multi = rich && new Set(used().map(r => r.sci)).size > 1;
  const val = p => { const e = st?.[ecoKey(kind, p)]; return e ? (multi ? e.sp.size : e.n) : 0; };
  const mx = rich ? Math.max(1, ...Object.values(st).map(e => multi ? e.sp.size : e.n)) : 1;
  const realmCol = r => rampColor(['#c9d4fb', '#04123f'], ([...r].reduce((s, c) => s + c.charCodeAt(0), 0) % 7) / 7);
  ecoLayer = L.geoJSON(fc, {renderer: ecoRenderer, pane: 'eco',
    style: f => {
      const p = f.properties;
      if (rich) { const x = val(p); return {weight: .4, color: '#0056ff', fillOpacity: x ? .75 : .05, fillColor: x ? rampColor(['#e3e7fc', '#2277ff', '#04123f'], Math.log(1 + x) / Math.log(1 + mx)) : '#e3e7fc'}; }
      return {weight: .4, color: '#ffffff', fillOpacity: .55, fillColor: kind === 'teow' ? (BIOMES[p.BIOME]?.[1] || '#ccc') : realmCol(p.REALM)};
    },
    onEachFeature: (f, l) => l.bindTooltip(() => {
      const p = f.properties, x = rich ? val(p) : null;
      return `<b>${esc(ecoName(p))}</b><br>${kind === 'teow' ? esc(BIOMES[p.BIOME]?.[0] || '') + ' · ' + esc(REALM_PT[p.REALM] || p.REALM) : esc(p.PROVINCE) + ' · ' + esc(p.REALM)}${rich ? `<br>${x} ${multi ? 'espécies' : 'registros'} do táxon` : ''}`;
    }, {sticky: true})}).addTo(map);
  ecoLayer.legend = rich ? {mx, multi} : kind;
  map.getPane('eco').style.opacity = TH.op[TH.cur] ?? 1;
}

// ---------- MapBiomas: legenda oficial e tiles do Earth Engine via API pública da plataforma ----------
async function mbLegend() {
  if (S.mbLeg) return S.mbLeg;
  // a plataforma troca as chaves das legendas entre versões: pergunta qual é a atual do subtema (ordem 0) e usa a constante só se falhar
  const list = await getJSON(MB + 'legends?' + qs({subthemeKey: MB_SUB, tenantId: 'mapbiomas'})).then(r => r.legends).catch(() => []);
  const key = (list.find(l => l.order === 0) || list[0])?.key || MB_LEG;
  const {legend} = await getJSON(MB + 'legends/by/key/' + key + '?' + qs({tenantId: 'mapbiomas', aggregated: true}));
  const byVal = {}, leaves = [], l1 = [];
  const walk = (items, top) => items.forEach(it => {
    if (it.pixelValue === 999) return;
    const t = top || {name: it.name['pt-BR'], color: it.color, v: it.pixelValue, kids: []};
    if (!top) l1.push(t); else t.kids.push(it.name['pt-BR']);
    byVal[it.pixelValue] = {name: it.name['pt-BR'], color: it.color, l1: t};
    it.children?.length ? walk(it.children, t) : leaves.push(it.pixelValue);
  });
  walk(legend.items);
  return S.mbLeg = {byVal, leaves, l1, key};
}
const mbParams = leg => ({tenantId: 'mapbiomas', subthemeKey: MB_SUB, legendKey: leg.key, pixelValue: leg.leaves});
const mbUrl = {};
async function pixelHistory(lon, lat) {
  const leg = await mbLegend();
  return (await getJSON(MB + 'maps/pixel-history?' + qs({...mbParams(leg), latitude: lat, longitude: lon}))).history;
}
const histStrip = (h, leg) => `<div class="hist">${h.map(x => `<span title="${x.year}: ${esc(leg.byVal[x.pixelValue]?.name || 'sem dado')}" style="background:${leg.byVal[x.pixelValue]?.color || '#e3e7fc'}"></span>`).join('')}</div>
  <div class="grad-l"><span>${h[0]?.year}</span><span>${h[h.length - 1]?.year}</span></div>`;

// ---------- tema do mapa: UMA camada temática por vez, com tempo e animação próprios ----------
// (pontos e limites ficam sempre por cima; antes várias camadas cheias se sobrepunham e escondiam umas às outras)
const UV = 'https://urbverde.iau.usp.br/geoserver/urbverde/wms', UVAPI = 'https://api.urbverde.com.br/v1/';
const yrs = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const daysBack = (n, lag = 2) => Array.from({length: n}, (_, i) => new Date(Date.now() - (n - 1 - i + lag) * 864e5).toISOString().slice(0, 10));
const monthsBack = n => Array.from({length: n}, (_, i) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (n - i + 1)); return d.toISOString().slice(0, 8) + '01'; });
const gibs = (layer, date, level, ext = 'png') => L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${ext}`,
  {maxNativeZoom: level, maxZoom: 18, attribution: 'NASA GIBS'});
const uvWms = layer => L.tileLayer.wms(UV, {layers: 'urbverde:' + layer, format: 'image/png', transparent: true, maxZoom: 18, attribution: 'UrbVerde (IAU/USP)'});
const uvLegend = layer => `<img alt="" class="leg-img" src="${UV}?${qs({service: 'WMS', version: '1.1.1', request: 'GetLegendGraphic', format: 'image/png', layer: 'urbverde:' + layer, legend_options: 'fontName:Inter;fontAntiAliasing:true;fontSize:11'})}">`;
const fmtDay = d => new Date(d + 'T12:00Z').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'});
// Copernicus Marine (análise e previsão globais, diárias): WMTS público com CORS, valor no ponto por GetFeatureInfo
const CM = 'https://wmts.marine.copernicus.eu/teroWmts', CMP = 'GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy_anfc_0.083deg_', CMB = 'GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-';
const today = () => new Date().toISOString().slice(0, 10);
const cmDays = () => Array.from({length: 15}, (_, i) => new Date(Date.now() + (i - 7) * 864e5).toISOString().slice(0, 10)); // 7 dias atrás a 7 à frente
const cmLbl = d => fmtDay(d) + (d === today() ? ' · hoje' : d > today() ? ' · previsão' : '');
const cmT = (th, d) => d + (th.h ? 'T12:00:00Z' : 'T00:00:00Z');
const cmQ = (th, extra) => CM + '?' + qs({SERVICE: 'WMTS', VERSION: '1.0.0', LAYER: th.cm, STYLE: th.cs, ...extra});
const cmTiles = th => d => L.tileLayer(cmQ(th, {REQUEST: 'GetTile', TILEMATRIXSET: 'EPSG:3857', FORMAT: 'image/png', time: cmT(th, d)}) + '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
  {maxNativeZoom: 8, maxZoom: 18, attribution: 'Copernicus Marine Service'});
const cmTheme = (n, ic, s, cm, cs, u, dec, sub, h = 0) => {
  const th = {g: 'mar', sub, n, ic, s, src: 'Copernicus Marine · análise e previsão', cm, cs, h, u, dec, times: cmDays, lbl: cmLbl};
  th.tiles = cmTiles(th); return th;
};
async function cmValue(th, lat, lng, d) {
  const z = Math.min(8, Math.max(2, map.getZoom())), p = map.project([lat, lng], z), x = Math.floor(p.x / 256), y = Math.floor(p.y / 256);
  const j = await getJSON(cmQ(th, {REQUEST: 'GetFeatureInfo', TILEMATRIXSET: 'EPSG:3857', TILEMATRIX: z, TILEROW: y, TILECOL: x, I: Math.floor(p.x - x * 256), J: Math.floor(p.y - y * 256),
    INFOFORMAT: 'application/json', time: cmT(th, d)})).catch(() => null);
  const v = j?.features?.[0]?.properties?.value; return v == null || isNaN(v) ? null : +v;
}
const IGBP = {1: 'Floresta perene de coníferas', 2: 'Floresta perene latifoliada', 3: 'Floresta decídua de coníferas', 4: 'Floresta decídua latifoliada', 5: 'Floresta mista',
  6: 'Arbustal fechado', 7: 'Arbustal aberto', 8: 'Savana arborizada', 9: 'Savana', 10: 'Campo', 11: 'Área úmida permanente', 12: 'Agricultura', 13: 'Área urbana',
  14: 'Mosaico de agricultura e vegetação natural', 15: 'Neve e gelo', 16: 'Solo exposto', '0,17': 'Água', 255: 'Não classificado'};
const fmtMon = d => new Date(d + 'T12:00Z').toLocaleDateString('pt-BR', {month: 'short', year: 'numeric'});
const gibsLeg = n => `https://gibs.earthdata.nasa.gov/legends/${n}_H.svg`;
const soilWms = (map, layer) => L.tileLayer.wms(`https://maps.isric.org/mapserv?map=/map/${map}.map`, {layers: layer, format: 'image/png', transparent: true, maxZoom: 18, attribution: 'ISRIC SoilGrids 2.0'});
const T_STOPS = [[-30, '#8e3fb5'], [-20, '#5b4ccf'], [-10, '#3f7fd6'], [0, '#3fb6d6'], [10, '#5fd07a'], [20, '#e5e04a'], [30, '#f29a38'], [40, '#e04a3a'], [50, '#7a1530']];
const THEMES = {
  mb: {g: 'terra', ic: 'trees', s: 'MapBiomas · 1985–2025, anual', yr: 1, n: 'Cobertura e uso da terra', src: 'MapBiomas Coleção 11 · 30 m', times: () => yrs(1985, 2025), lbl: String,
    tiles: async y => { const leg = await mbLegend(); mbUrl[y] ||= getJSON(MB + 'maps/map?' + qs({...mbParams(leg), year: y})); return L.tileLayer((await mbUrl[y]).url, {maxZoom: 18, attribution: 'MapBiomas Coleção 11'}); }},
  igbp: {g: 'terra', ic: 'world', s: 'MODIS · 2001–2024, anual, global', yr: 1, n: 'Cobertura da terra (mundo)', src: 'NASA GIBS · MODIS MCD12Q1 (IGBP), 500 m', times: () => yrs(2001, 2024), lbl: String,
    tiles: y => gibs('MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual', y + '-01-01', 8), legImg: gibsLeg('MODIS_IGBP_Land_Cover_Type'), cmap: 'MODIS_IGBP_Land_Cover_Type', classes: IGBP, leg: 'Fora do Brasil, use esta no lugar do MapBiomas.'},
  teow: {g: 'terra', ic: 'map-2', s: 'WWF · biomas e ecorregiões', n: 'Biomas e ecorregiões terrestres', src: 'WWF (Olson et al. 2001)', eco: 'teow'},
  teowR: {g: 'terra', ic: 'chart-dots', s: 'riqueza do táxon por ecorregião', n: 'Ecorregiões terrestres com registros do táxon', src: 'WWF + ocorrências carregadas', eco: 'teow', rich: 1},
  loss: {g: 'terra', sub: 'Floresta e vegetação', ic: 'axe', s: 'Hansen/UMD · 2001–2024, global', n: 'Perda de floresta', src: 'Hansen et al. · Global Forest Change v1.12, 30 m',
    tiles: () => L.tileLayer('https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.12/loss_year_alpha/{z}/{x}/{y}.png', {maxNativeZoom: 12, maxZoom: 18, attribution: 'Hansen/UMD/Google/USGS/NASA'}),
    gl: {c: ['#ffff00', '#ffb000', '#ff5a00', '#e00000'], l: ['2001', '2024']}, pxf: px => ({v: null, t: px[3] ? 'floresta perdida em ' + (2001 + Math.round((255 - px[1]) / 255 * 23)) : 'sem perda registrada de 2001 a 2024'}), leg: 'Cor pelo ano em que a floresta foi derrubada ou queimou (copa > 30%). Aproxime: o dado tem 30 m.'},
  ndvi: {g: 'terra', sub: 'Floresta e vegetação', ic: 'plant-2', s: 'satélite · mensal, 3 anos', n: 'Verdor da vegetação (NDVI)', src: 'NASA GIBS · VIIRS SNPP NDVI mensal', times: () => monthsBack(36), lbl: fmtMon,
    tiles: d => gibs('VIIRS_SNPP_L3_NDVI_Monthly', d, 7), legImg: gibsLeg('MODIS_L3_NDVI'), cmap: 'MODIS_L3_NDVI', dec: 2, none: 'sem dado (água, nuvem ou gelo)', leg: 'Aperte ▶ para ver a vegetação secar e rebrotar ao longo das estações.'},
  soc: {g: 'terra', sub: 'Solo', ic: 'shovel', s: 'SoilGrids · 0–5 cm, global', n: 'Carbono orgânico do solo', src: 'ISRIC SoilGrids 2.0 · 250 m', tiles: () => soilWms('soc', 'soc_0-5cm_mean'), soil: 'soc', pu: 'g/kg',
    gl: {c: ['#fbf8f6', '#e3d2c9', '#c5a495', '#9a6d5c', '#6b3a2a', '#3a160c'], l: ['pouco', '> 200 g/kg']}, leg: 'Média prevista por aprendizado de máquina; mais escuro, mais matéria orgânica (turfeiras, florestas frias e úmidas).'},
  soilph: {g: 'terra', sub: 'Solo', ic: 'flask', s: 'SoilGrids · 0–5 cm, global', n: 'pH do solo', src: 'ISRIC SoilGrids 2.0 · 250 m', tiles: () => soilWms('phh2o', 'phh2o_0-5cm_mean'), soil: 'phh2o',
    gl: {c: ['#f2e33a', '#9fd04a', '#3fae4a', '#26948a', '#1fb5c8'], l: ['ácido 3,5', 'neutro 7', 'básico 9']}, leg: 'pH em água, camada de 0–5 cm.'},
  uvIcus: {g: 'cidade', ic: 'temperature-sun', s: '2025 · todo o Brasil', n: 'Ilhas de calor de superfície (2025)', src: 'UrbVerde · Landsat, todo o Brasil', layer: 'raster_temperatura_icus_nacional_2025', gfi: 1, unit: '°C em relação ao entorno', tiles: () => uvWms('raster_temperatura_icus_nacional_2025')},
  uvTrend: {g: 'cidade', ic: 'chart-line', s: '2014–2025 · todo o Brasil', n: 'Tendência das ilhas de calor (2014–2025)', src: 'UrbVerde · todo o Brasil', layer: 'raster_temperatura_tendencia_icus_nacional_2014_2025', gfi: 1, unit: '°C por ano', tiles: () => uvWms('raster_temperatura_tendencia_icus_nacional_2014_2025')},
  uvIcu: {g: 'cidade', ic: 'temperature-plus', s: 'SP · 2015–2024, anual', yr: 1, n: 'Ilha de calor ano a ano (estado de SP)', src: 'UrbVerde · 2015–2024', times: () => yrs(2015, 2024), lbl: String, layer: y => 'icu_' + y, gfi: 1, unit: '°C', tiles: y => uvWms('icu_' + y), box: [-53.1, -25.3, -44.2, -19.8]},
  uvPcv: {g: 'cidade', ic: 'tree', s: 'SP · 2016–2021, anual', yr: 1, n: 'Cobertura vegetal (estado de SP)', src: 'UrbVerde · Sentinel, 2016–2021', times: () => yrs(2016, 2021), lbl: String, layer: y => 'PCV-30m-8bits-' + y, tiles: y => uvWms('PCV-30m-8bits-' + y), box: [-53.1, -25.3, -44.2, -19.8]},
  uvTst: {g: 'cidade', ic: 'temperature', s: 'SP · 2016–2021, anual', yr: 1, n: 'Temperatura de superfície (estado de SP)', src: 'UrbVerde · Landsat, 2016–2021', times: () => yrs(2016, 2021), lbl: String, layer: y => 'TST-30m-8bits-' + y, tiles: y => uvWms('TST-30m-8bits-' + y), box: [-53.1, -25.3, -44.2, -19.8]},
  pop: {g: 'gente', ic: 'users', s: 'GPW v4 · 2000–2020, a cada 5 anos', yr: 1, n: 'Densidade populacional', src: 'NASA SEDAC · GPW v4 (via GIBS), ~1 km', times: () => [2000, 2005, 2010, 2015, 2020], lbl: String,
    tiles: y => gibs('GPW_Population_Density_' + y, 'default', 7), legImg: gibsLeg('GPW_Population_Density_2020'), cmap: y => 'GPW_Population_Density_' + y, pu: 'hab./km²', dec: 0, leg: 'Pessoas por km². Cruze com as ocorrências para ver espécies perto de gente (risco de zoonoses, atropelamento, conflito).'},
  lights: {g: 'gente', ic: 'bulb', s: 'VIIRS · 2012 e 2016', n: 'Luzes noturnas', src: 'NASA Black Marble · VIIRS', times: () => ['2012-01-01', '2016-01-01'], lbl: d => d.slice(0, 4),
    tiles: d => gibs('VIIRS_Black_Marble', d, 8), pxf: px => ({v: Math.round((px[0] + px[1] + px[2]) / 7.65), t: Math.round((px[0] + px[1] + px[2]) / 7.65) + '% do brilho máximo'}), leg: 'Cidades, estradas, portos e plataformas acesas à noite: um retrato da presença humana e da poluição luminosa.'},
  aod: {g: 'gente', ic: 'mist', s: 'satélite · diário, 2 semanas', n: 'Fumaça e poeira no ar (aerossóis)', src: 'NASA GIBS · MODIS Terra+Aqua AOD', times: () => daysBack(14, 2), lbl: fmtDay,
    tiles: d => gibs('MODIS_Combined_Value_Added_AOD', d, 6), legImg: gibsLeg('MODIS_Combined_Value_Added_AOD'), cmap: 'MODIS_Combined_Value_Added_AOD', dec: 2, none: 'sem medição (nuvem ou fora da passagem do satélite)', leg: 'Profundidade óptica de aerossóis: alto em queimadas, poeira e poluição. Áreas sem cor tinham nuvem.'},
  feel: {g: 'tempo', ic: 'temperature-sun', s: 'horária · ontem a +3 dias', n: 'Sensação térmica', src: 'Open-Meteo (modelos ICON/GFS)', wx: ['apparent_temperature'], u: '°C', stops: T_STOPS},
  temp: {g: 'tempo', ic: 'temperature', s: 'horária · ontem a +3 dias', n: 'Temperatura do ar (2 m)', src: 'Open-Meteo (modelos ICON/GFS)', wx: ['temperature_2m'], u: '°C', stops: T_STOPS},
  rain: {g: 'tempo', ic: 'cloud-rain', s: 'horária · ontem a +3 dias', n: 'Precipitação', src: 'Open-Meteo (modelos ICON/GFS)', wx: ['precipitation'], u: 'mm/h', dec: 1,
    stops: [[0, '#00000000'], [.1, '#a6e3ffb0'], [1, '#3fa9f5'], [4, '#2f5fd0'], [10, '#9b4fd1'], [30, '#e04ad1']]},
  wind: {g: 'tempo', ic: 'wind', s: 'animado · ontem a +3 dias', n: 'Vento (10 m)', src: 'Open-Meteo (modelos ICON/GFS)', wx: ['wind_speed_10m', 'wind_direction_10m'], u: 'km/h',
    stops: [[0, '#3f5fbf'], [10, '#3fa9c9'], [20, '#5fd07a'], [40, '#e5e04a'], [60, '#f29a38'], [90, '#e04a3a'], [120, '#8a1f3a']]},
  hum: {g: 'tempo', ic: 'droplet-half-2', s: 'horária · ontem a +3 dias', n: 'Umidade relativa', src: 'Open-Meteo (modelos ICON/GFS)', wx: ['relative_humidity_2m'], u: '%', stops: [[0, '#c98a3a'], [30, '#e5c46a'], [60, '#5fd07a'], [80, '#3fa9c9'], [100, '#1f5fbf']]},
  press: {g: 'tempo', ic: 'gauge', s: 'horária · ontem a +3 dias', n: 'Pressão ao nível do mar', src: 'Open-Meteo (modelos ICON/GFS)', wx: ['pressure_msl'], u: 'hPa', stops: [[980, '#5b4ccf'], [1000, '#3fb6d6'], [1013, '#5fd07a'], [1025, '#e5e04a'], [1040, '#e04a3a']]},
  radar: {g: 'tempo', ic: 'radar-2', s: 'a cada 10 min · últimas 2 h', n: 'Radar de chuva (últimas 2 h)', src: 'RainViewer', leg: 'Azul: chuva fraca · amarelo: moderada · vermelho: forte. Quadros a cada 10 min.', times: async () => { const j = await getJSON('https://api.rainviewer.com/public/weather-maps.json'); TH.rv = j.host; return j.radar.past.map(f => f.time + '|' + f.path); },
    lbl: v => new Date(+v.split('|')[0] * 1000).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
    tiles: v => L.tileLayer(`${TH.rv}${v.split('|')[1]}/256/{z}/{x}/{y}/2/1_1.png`, {maxNativeZoom: 7, maxZoom: 18, attribution: 'RainViewer'})},
  sat: {g: 'tempo', ic: 'satellite', s: 'diário · últimos 10 dias', n: 'Satélite em cor real (diário)', src: 'NASA GIBS · VIIRS NOAA-20', times: () => daysBack(10, 1), lbl: fmtDay, tiles: d => gibs('VIIRS_NOAA20_CorrectedReflectance_TrueColor', d, 9, 'jpg'), leg: 'Imagem do dia: nuvens em branco, fumaça em cinza. Aperte ▶ para ver os dias anteriores.'},
  imerg: {g: 'tempo', sub: 'Satélite (global)', ic: 'cloud-storm', s: 'satélite · diário, 2 semanas', n: 'Chuva por satélite (GPM)', src: 'NASA GIBS · GPM IMERG', times: () => daysBack(14, 2), lbl: fmtDay,
    tiles: d => gibs('IMERG_Precipitation_Rate', d, 6), legImg: gibsLeg('GPM_Precipitation_Rate'), cmap: 'GPM_Precipitation_Rate', pu: 'mm/h', dec: 1, none: 'sem chuva (menos de 0,1 mm/h)', leg: 'Chuva medida (não prevista) em todo o mundo, inclusive no mar.'},
  lst: {g: 'tempo', sub: 'Satélite (global)', ic: 'sun-high', s: 'satélite · mensal, 1 ano', n: 'Temperatura da superfície (dia)', src: 'NASA GIBS · MODIS Terra LST mensal', times: () => monthsBack(12), lbl: fmtMon,
    tiles: d => gibs('MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day', d, 6), legImg: gibsLeg('MODIS_Land_Surface_Temp'), cmap: 'MODIS_Land_Surface_Temp', pconv: k => k - 273.15, pu: '°C', dec: 1, leg: 'Temperatura do chão (não do ar) à tarde; cidades e áreas desmatadas aparecem mais quentes.'},
  cur: {g: 'mar', sub: 'Física', ic: 'ripple', s: 'animado · ontem a +3 dias', n: 'Correntes marinhas', src: 'Open-Meteo Marine', api: 'marine', wx: ['ocean_current_velocity', 'ocean_current_direction'], to: 1, pf: 10, u: 'km/h', dec: 1,
    stops: [[0, '#0b2d5b'], [.5, '#1f5fbf'], [1, '#3fa9c9'], [2, '#5fd07a'], [3, '#e5e04a'], [5, '#f29a38'], [7, '#e04a3a']]},
  curM: cmTheme('Correntes em alta resolução', 'arrows-move', 'modelo 1/12° com setas · ±7 dias', CMP + 'PT1H-m_202406/sea_water_velocity', 'cmap:speed,range:0/1.5,vectorStyle:solidAndVector', 'm/s', 2, 'Física', 1),
  wave: {g: 'mar', sub: 'Física', ic: 'wave-sine', s: 'animado · ontem a +3 dias', n: 'Altura das ondas', src: 'Open-Meteo Marine', api: 'marine', wx: ['wave_height', 'wave_direction'], pf: 6, u: 'm', dec: 1,
    stops: [[0, '#1f3f8f'], [1, '#3fa9c9'], [2, '#5fd07a'], [3, '#e5e04a'], [5, '#f29a38'], [8, '#e04a3a'], [12, '#8a1f3a']]},
  thetao: cmTheme('Temperatura do mar', 'temperature-plus', 'modelo 1/12° · ±7 dias', CMP + 'PT1H-m_202406/thetao', 'cmap:thermal,range:-2/32', '°C', 1, 'Física', 1),
  sst: {g: 'mar', sub: 'Física', ic: 'temperature', s: 'satélite · diário', n: 'Temperatura do mar (satélite)', src: 'NASA GIBS · GHRSST MUR', leg: 'Roxo e azul: águas frias · amarelo e vermelho: quentes. Clique no mar para o valor exato.', times: () => daysBack(14), lbl: fmtDay, tiles: d => gibs('GHRSST_L4_MUR_Sea_Surface_Temperature', d, 7), cmap: 'GHRSST_Sea_Surface_Temperature', pu: '°C', dec: 1},
  tob: cmTheme('Temperatura no fundo', 'temperature-snow', 'modelo 1/12° · ±7 dias', CMP + 'P1D-m_202406/tob', 'cmap:thermal,range:-2/30', '°C', 1, 'Física'),
  so: cmTheme('Salinidade', 'droplets', 'modelo 1/12° · ±7 dias', CMP + 'PT1H-m_202406/so', 'cmap:haline,range:30/38', 'PSU', 1, 'Física', 1),
  zos: cmTheme('Altura do nível do mar', 'wave-square', 'modelo 1/12° · ±7 dias', CMP + 'P1D-m_202406/zos', 'cmap:balance,range:-1/1', 'm', 2, 'Física'),
  mlotst: cmTheme('Camada de mistura', 'stack', 'profundidade · ±7 dias', CMP + 'P1D-m_202406/mlotst', 'cmap:deep,range:0/200', 'm', 0, 'Física'),
  ph: cmTheme('pH (acidificação)', 'flask', 'modelo 1/4° · ±7 dias', CMB + 'car_anfc_0.25deg_P1D-m_202311/ph', 'cmap:viridis,range:7.9/8.2', 'pH', 2, 'Química'),
  o2: cmTheme('Oxigênio dissolvido', 'bubble', 'modelo 1/4° · ±7 dias', CMB + 'bio_anfc_0.25deg_P1D-m_202311/o2', 'cmap:oxy,range:150/350', 'mmol/m³', 0, 'Química'),
  spco2: cmTheme('Pressão de CO₂ na superfície', 'atom', 'modelo 1/4° · ±7 dias', CMB + 'co2_anfc_0.25deg_P1D-m_202311/spco2', 'cmap:matter,range:30/50', 'Pa', 1, 'Química'),
  no3: cmTheme('Nitrato', 'test-pipe', 'modelo 1/4° · ±7 dias', CMB + 'nut_anfc_0.25deg_P1D-m_202311/no3', 'cmap:matter,logScale,range:0.05/30', 'mmol/m³', 2, 'Química'),
  po4: cmTheme('Fosfato', 'flask-2', 'modelo 1/4° · ±7 dias', CMB + 'nut_anfc_0.25deg_P1D-m_202311/po4', 'cmap:matter,range:0/2.5', 'mmol/m³', 2, 'Química'),
  chlM: cmTheme('Clorofila (modelo)', 'leaf-2', 'modelo 1/4° · ±7 dias', CMB + 'pft_anfc_0.25deg_P1D-m_202311/chl', 'cmap:algae,logScale,range:0.01/10', 'mg/m³', 2, 'Vida'),
  nppv: cmTheme('Produção primária', 'plant', 'modelo 1/4° · ±7 dias', CMB + 'bio_anfc_0.25deg_P1D-m_202311/nppv', 'cmap:algae,logScale,range:1/500', 'mg C/m³/dia', 0, 'Vida'),
  chl: {g: 'mar', sub: 'Vida', ic: 'leaf', s: 'satélite · diário', n: 'Clorofila-a (satélite)', src: 'NASA GIBS · PACE OCI', leg: 'Azul: pouca clorofila (água pobre) · verde e amarelo: muita (alta produtividade ou florações).', times: () => daysBack(14), lbl: fmtDay, tiles: d => gibs('OCI_PACE_Chlorophyll_a', d, 7), cmap: 'MODIS_Chlorophyll', pu: 'mg/m³', dec: 2, none: 'sem medição (nuvem ou terra)'},
  sal: {g: 'mar', sub: 'Física', ic: 'droplet', s: 'satélite · mensal', n: 'Salinidade (satélite, mensal)', src: 'NASA GIBS · SMAP', leg: 'Azul: água menos salgada (rios, chuva) · vermelho: mais salgada.', times: () => monthsBack(12), lbl: d => new Date(d + 'T12:00Z').toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}), tiles: d => gibs('SMAP_L3_Sea_Surface_Salinity_CAP_Monthly', d, 6), cmap: 'SMAP_Sea_Surface_Salinity', pu: 'PSU', dec: 1},
  bat: {g: 'mar', sub: 'Fundo e regiões', ic: 'mountain', s: 'GEBCO · profundidade', n: 'Batimetria', src: 'GEBCO', leg: 'Tons de azul pela profundidade. Clique no mar para a profundidade exata.', tiles: () => L.tileLayer.wms('https://wms.gebco.net/mapserv', {layers: 'GEBCO_LATEST', format: 'image/png', attribution: 'GEBCO'})},
  meow: {g: 'mar', sub: 'Fundo e regiões', ic: 'map-2', s: 'MEOW · ecorregiões', n: 'Ecorregiões marinhas', src: 'MEOW (Spalding et al. 2007)', eco: 'meow'},
  meowR: {g: 'mar', sub: 'Fundo e regiões', ic: 'chart-dots', s: 'riqueza do táxon por ecorregião', n: 'Ecorregiões marinhas com registros do táxon', src: 'MEOW + ocorrências carregadas', eco: 'meow', rich: 1},
};
const TH = {cur: '', times: null, i: 0, layer: null, all: new Set(), op: {}, timer: null, model: 'best_match'};
const loaded = l => new Promise(ok => { l.once('load', ok); setTimeout(ok, 5000); });
function clearTheme() {
  TH.all.forEach(l => map.removeLayer(l)); TH.all.clear(); TH.layer = null;
  if (ecoLayer) { map.removeLayer(ecoLayer); ecoLayer = null; }
  wxStop();
}
async function setTheme(k) {
  thStop(); clearTheme(); TH.cur = k; TH.times = null;
  const th = THEMES[k];
  if (th?.times || th?.wx) S.dock = 'th';
  renderThemeLists();
  if (th) {
    setBusy(true);
    try {
      TH.times = th.times ? await th.times() : null;
      TH.i = !TH.times ? 0 : th.cm ? Math.max(0, TH.times.indexOf(today())) : TH.times.length - 1; // previsões abrem em hoje
      if (th.eco) await showEco(th); else if (th.wx) await wxLoad(); else await thShow(TH.i);
      if (th.box && !map.getBounds().intersects(L.latLngBounds([th.box[1], th.box[0]], [th.box[3], th.box[2]]))) toast('Esta camada cobre só o estado de São Paulo.');
    } catch (e) { toast(`${th.n}: indisponível agora (${e.message})`); }
    setBusy(false);
  }
  renderDetails(); renderDock(); writeHash();
}
// camadas anuais (MapBiomas, UrbVerde) levam junto os registros da espécie do mesmo ano
function syncYear() {
  const th = THEMES[TH.cur]; if (!th?.yr || !$('sync').checked || TL.y0 == null) return;
  if (TL.mode === 'all') { TL.mode = 'win'; $('tlMode').value = 'win'; }
  tlSet(+TH.times[TH.i]);
}
async function thShow(i) {
  const k = TH.cur, th = THEMES[k]; TH.i = i; ttLabel(); syncYear();
  if (th.wx) return wxDraw();
  const l = await th.tiles(TH.times?.[i]); if (TH.cur !== k) return;
  l.options.pane = 'tema'; l.setOpacity(TH.op[k] ?? .85); TH.all.add(l); TH.layer = l; l.addTo(map);
  await loaded(l);
  TH.all.forEach(x => { if (x !== TH.layer) { map.removeLayer(x); TH.all.delete(x); } }); // troca sem piscar durante a animação
}
function thOpacity(v) {
  TH.op[TH.cur] = v; const th = THEMES[TH.cur];
  if (th?.eco) map.getPane('eco').style.opacity = v; else if (th?.wx) map.getPane('clima').style.opacity = v; else TH.all.forEach(l => l.setOpacity(v));
}
function thStop() { clearTimeout(TH.timer); TH.playing = false; $('ttPlay').innerHTML = ti('player-play-filled'); }
function thPlay() {
  if (TH.playing) return thStop();
  const k = TH.cur, wx = THEMES[k].wx; TH.playing = true;
  $('ttPlay').innerHTML = ti('player-pause-filled');
  const tick = async () => {
    if (!TH.playing || TH.cur !== k) return;
    const i = (TH.i + 1) % TH.times.length; $('ttRange').value = i; await thShow(i); // espera a camada carregar antes do próximo quadro
    if (TH.playing) TH.timer = setTimeout(tick, wx ? 350 : 700);
  };
  tick();
}
function ttLabel() {
  const th = THEMES[TH.cur]; if (!th) return;
  $('ttLbl').textContent = th.wx ? wxTimeLbl(TH.i) : th.lbl ? th.lbl(TH.times?.[TH.i]) : '';
  $('ttSub').textContent = th.n; $('ttRange').value = TH.i; rangeP($('ttRange'));
}
// preenchimento do trilho até o ponto atual (o CSS lê --p)
function rangeP(el) { const a = +el.min || 0, b = +el.max || 0; el.style.setProperty('--p', (b > a ? (el.value - a) / (b - a) * 100 : 0) + '%'); }
document.addEventListener('input', e => e.target.matches?.('.dock input[type=range]') && rangeP(e.target));
function ttTicks() { // 5 marcas: começo, meio e fim do tempo da camada
  const th = THEMES[TH.cur], n = TH.times.length, lb = i => (th.wx ? wxTimeLbl(i) : th.lbl ? th.lbl(TH.times[i]) : '').split(' · ')[0];
  $('ttTicks').innerHTML = [...new Set([0, .25, .5, .75, 1].map(f => Math.round(f * (n - 1))))].map(i => `<span>${esc(lb(i))}</span>`).join('');
}
let ttT;
$('ttRange').oninput = () => { thStop(); TH.i = +$('ttRange').value; ttLabel(); clearTimeout(ttT); ttT = setTimeout(() => thShow(TH.i), THEMES[TH.cur]?.wx ? 0 : 250); };
$('ttPlay').onclick = thPlay;

// ---------- tempo e clima no estilo zoom.earth: grade do Open-Meteo interpolada, horária, com animação ----------
// ponytail: grade de até 14×14 pontos da área visível (1 requisição); refaz ao mover o mapa. Resolução real dos modelos: 2–25 km
const WX = {grid: null, key: '', parts: null, raf: 0};
const wxCanvas = L.DomUtil.create('canvas', 'wx-canvas', map.getPane('clima')), wxPart = L.DomUtil.create('canvas', 'wx-canvas', map.getPane('clima'));
const hex2rgba = h => [1, 3, 5, 7].map(i => i < h.length ? parseInt(h.substr(i, 2), 16) : 255);
function scaleRGBA(stops, v) {
  if (v <= stops[0][0]) return hex2rgba(stops[0][1]);
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
    const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (v - a) / (b - a), x = hex2rgba(ca), y = hex2rgba(cb);
    return x.map((c, j) => c + (y[j] - c) * f);
  }
  return hex2rgba(stops[stops.length - 1][1]);
}
const wrapLon = x => ((x + 540) % 360) - 180;
async function wxLoad() {
  const th = THEMES[TH.cur]; if (!th?.wx) return;
  const b = map.getBounds().pad(.2), s = Math.max(b.getSouth(), -80), n = Math.min(b.getNorth(), 80), w = b.getWest(), e = Math.min(b.getEast(), w + 359);
  const nx = 14, ny = Math.max(5, Math.min(14, Math.round(14 * (n - s) / (e - w) * 1.3)));
  const key = [TH.cur, TH.model, s.toFixed(1), n.toFixed(1), w.toFixed(1), e.toFixed(1)].join();
  if (WX.key === key && WX.grid) return wxDraw();
  const lats = [], lons = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { lats.push((s + (n - s) * j / (ny - 1)).toFixed(2)); lons.push(wrapLon(w + (e - w) * i / (nx - 1)).toFixed(2)); }
  setBusy(true);
  try {
    const q = {latitude: lats.join(), longitude: lons.join(), hourly: th.wx.join(), past_days: 1, forecast_days: 3, timezone: 'GMT'};
    const r = await getJSON(th.api === 'marine' ? `https://marine-api.open-meteo.com/v1/marine?${qs(q)}` : `https://api.open-meteo.com/v1/forecast?${qs({...q, models: TH.model})}`);
    if (!THEMES[TH.cur]?.wx) return;
    const arr = [].concat(r), times = arr[0].hourly.time.map(t => Date.parse(t + 'Z')), now = Date.now();
    const get = (v, t) => arr.map(p => p.hourly[v]?.[t] ?? NaN);
    WX.grid = {s, n, w, e, nx, ny, times, vals: times.map((_, t) => get(th.wx[0], t)), dir: th.wx[1] ? times.map((_, t) => get(th.wx[1], t)) : null};
    WX.key = key;
    TH.times = times; TH.i = TH.i && TH.i < times.length && WX.keep ? TH.i : times.findIndex(t => t >= now - 18e5);
    if (TH.i < 0) TH.i = 0;
    renderDetails(); renderDock();
    wxDraw();
  } catch (err) { toast('Open-Meteo indisponível: ' + err.message); }
  finally { setBusy(false); }
}
const wxTimeLbl = i => {
  const t = TH.times?.[i]; if (!t) return '';
  const d = new Date(t), now = Math.abs(t - Date.now()) < 36e5;
  return d.toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'}) + ' · ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) + (now ? ' · agora' : t > Date.now() ? ' · previsão' : '');
};
function wxSample(field, lat, lon) { // interpolação bilinear na grade regular
  const g = WX.grid, fx = (lon - g.w) / (g.e - g.w) * (g.nx - 1), fy = (lat - g.s) / (g.n - g.s) * (g.ny - 1);
  if (fx < 0 || fy < 0 || fx > g.nx - 1 || fy > g.ny - 1) return NaN;
  const i = Math.min(g.nx - 2, Math.floor(fx)), j = Math.min(g.ny - 2, Math.floor(fy)), a = fx - i, b = fy - j, at = (x, y) => field[y * g.nx + x];
  return at(i, j) * (1 - a) * (1 - b) + at(i + 1, j) * a * (1 - b) + at(i, j + 1) * (1 - a) * b + at(i + 1, j + 1) * a * b;
}
function wxPlace(c) { const sz = map.getSize(); c.width = sz.x; c.height = sz.y; c.style.width = sz.x + 'px'; c.style.height = sz.y + 'px'; L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0])); }
function wxDraw() {
  const g = WX.grid, th = THEMES[TH.cur]; if (!g || !th?.wx) return;
  wxPlace(wxCanvas);
  if (!wxCanvas.width || !wxCanvas.height) return; // mapa escondido (outra aba)
  const W = wxCanvas.width, H = wxCanvas.height, st = 4, cw = Math.ceil(W / st), ch = Math.ceil(H / st), img = new ImageData(cw, ch), f = g.vals[TH.i];
  const west = map.containerPointToLatLng([0, 0]).lng, east = map.containerPointToLatLng([W, 0]).lng;
  for (let py = 0; py < ch; py++) {
    const lat = map.containerPointToLatLng([0, py * st]).lat;
    for (let px = 0; px < cw; px++) {
      const v = wxSample(f, lat, west + (east - west) * px * st / W); if (isNaN(v)) continue;
      const c = scaleRGBA(th.stops, v), o = 4 * (py * cw + px);
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = c[3] * .82;
    }
  }
  const off = document.createElement('canvas'); off.width = cw; off.height = ch; off.getContext('2d').putImageData(img, 0, 0);
  const ctx = wxCanvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, W, H);
  // rótulos com o valor, como no zoom.earth (um a cada dois pontos da grade)
  ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let j = 1; j < g.ny - 1; j += 2) for (let i = 1; i < g.nx - 1; i += 2) {
    const lat = g.s + (g.n - g.s) * j / (g.ny - 1), lon = g.w + (g.e - g.w) * i / (g.nx - 1), v = f[j * g.nx + i]; if (isNaN(v)) continue;
    const p = map.latLngToContainerPoint([lat, lon]); if (p.x < 20 || p.y < 20 || p.x > W - 20 || p.y > H - 20) continue;
    const t = fmt(v, th.dec || 0) + (th.u === '°C' ? '°' : ''), tw = ctx.measureText(t).width + 12;
    ctx.fillStyle = 'rgba(3,12,46,.74)'; ctx.beginPath(); ctx.roundRect(p.x - tw / 2, p.y - 9, tw, 18, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(t, p.x, p.y + .5);
  }
  if (g.dir) wxWind(); else wxPartStop();
}
// partículas animadas: vento e ondas usam a direção de onde vêm; correntes, a direção para onde vão (th.to)
function wxWind() {
  wxPartStop(); wxPlace(wxPart);
  const g = WX.grid, sp = g.vals[TH.i], dr = g.dir[TH.i], ctx = wxPart.getContext('2d'), W = wxPart.width, H = wxPart.height;
  const th = THEMES[TH.cur], sg = th.to ? 1 : -1, f = .06 * (th.pf || 1);
  const U = sp.map((v, k) => sg * v * Math.sin(dr[k] * Math.PI / 180)), V = sp.map((v, k) => sg * v * Math.cos(dr[k] * Math.PI / 180));
  const P = Array.from({length: Math.round(W * H / 900)}, () => ({x: Math.random() * W, y: Math.random() * H, a: Math.random() * 80}));
  const step = () => {
    ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const p of P) {
      const ll = map.containerPointToLatLng([p.x, p.y]), u = wxSample(U, ll.lat, ll.lng), v = wxSample(V, ll.lat, ll.lng);
      if (isNaN(u) || p.a-- < 0) { Object.assign(p, {x: Math.random() * W, y: Math.random() * H, a: 40 + Math.random() * 60}); continue; }
      const nx = p.x + u * f, ny = p.y - v * f;
      ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); p.x = nx; p.y = ny;
      if (nx < 0 || ny < 0 || nx > W || ny > H) p.a = -1;
    }
    ctx.stroke(); WX.raf = requestAnimationFrame(step);
  };
  WX.raf = requestAnimationFrame(step);
}
function wxPartStop() { cancelAnimationFrame(WX.raf); wxPart.getContext('2d').clearRect(0, 0, wxPart.width, wxPart.height); }
function wxStop() { wxPartStop(); WX.grid = null; WX.key = ''; WX.keep = false; wxCanvas.getContext('2d').clearRect(0, 0, wxCanvas.width, wxCanvas.height); }
let wxT;
map.on('movestart', () => { if (THEMES[TH.cur]?.wx) { wxPartStop(); wxCanvas.style.visibility = 'hidden'; } });
map.on('moveend', () => {
  if (!THEMES[TH.cur]?.wx) return;
  wxCanvas.style.visibility = ''; wxDraw();
  clearTimeout(wxT); WX.keep = true; wxT = setTimeout(wxLoad, 500); // recarrega a grade para a nova área
});

// ---------- clique no mapa: tudo o que se sabe do local ----------
const inBRbox = (lon, lat) => lon > -74 && lon < -28.5 && lat > -34 && lat < 5.5;
const uvValue = (layer, lng, lat) => getJSON(UV + '?' + qs({service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo', layers: 'urbverde:' + layer, query_layers: 'urbverde:' + layer,
  srs: 'EPSG:4326', bbox: [lng - .0005, lat - .0005, lng + .0005, lat + .0005].join(), width: 3, height: 3, x: 1, y: 1, info_format: 'application/json'}))
  .then(j => { const v = j.features?.[0]?.properties?.GRAY_INDEX; return v == null || v <= -9998 || v >= 99 ? null : v; }).catch(() => null);
// valor no ponto das camadas em imagem (GIBS, Hansen): lê o pixel do tile na resolução nativa e procura a cor na paleta oficial
const pxTiles = new Map(), cmaps = {};
function tileCtx(url) {
  let p = pxTiles.get(url);
  if (!p) {
    p = new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => { const c = Object.assign(document.createElement('canvas'), {width: im.naturalWidth, height: im.naturalHeight}), g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(im, 0, 0); ok(g); };
      im.onerror = () => no(new Error('tile')); im.src = url; });
    p.catch(() => pxTiles.delete(url));
    pxTiles.set(url, p); if (pxTiles.size > 150) pxTiles.delete(pxTiles.keys().next().value);
  }
  return p;
}
async function pixelAt(layer, lat, lng) { // [r, g, b, a]
  const z = layer.options.maxNativeZoom ?? 8, p = map.project([lat, lng], z), x = Math.floor(p.x / 256), y = Math.floor(p.y / 256);
  layer._tileZoom = z; // getTileUrl usa o zoom da camada, não o de coords
  return [...(await tileCtx(layer.getTileUrl({x, y, z}))).getImageData(Math.floor(p.x) - x * 256, Math.floor(p.y) - y * 256, 1, 1).data];
}
const gibsCmap = n => cmaps[n] ||= fetch(`https://gibs.earthdata.nasa.gov/colormaps/v1.3/${n}.xml`).then(r => r.text()).then(t =>
  [...new DOMParser().parseFromString(t, 'text/xml').querySelectorAll('ColorMapEntry')].filter(e => e.getAttribute('transparent') !== 'true')
    .map(e => ({rgb: e.getAttribute('rgb').split(',').map(Number), v: e.getAttribute('value') ?? e.getAttribute('sourceValue')})).filter(e => e.v))
  .catch(e => { delete cmaps[n]; throw e; });
const infNum = s => s === '+INF' ? Infinity : s === '-INF' ? -Infinity : +s;
function pxText(th, e) { // entrada da paleta → {v: número para o gráfico, t: texto}
  if (th.classes) return {v: null, t: th.classes[e.v] || e.v, c: e.rgb};
  let [a, b = a] = e.v.replace(/[[\]()]/g, '').split(',').map(x => (th.pconv || (y => y))(infNum(x.trim()))), d = th.dec ?? 1;
  if (a > 0 && b > a * 20) b = Infinity; // última classe aberta (ex.: 1.000 a 1.000.000 hab./km²)
  return {v: isFinite(a) && isFinite(b) ? (a + b) / 2 : isFinite(a) ? a : b,
    t: !isFinite(b) ? '≥ ' + fmt(a, d) : !isFinite(a) ? '< ' + fmt(b, d) : fmt(a, d) === fmt(b, d) ? '≈ ' + fmt((a + b) / 2, d) : `${fmt(a, d)}–${fmt(b, d)}`};
}
async function pxValue(th, t, lat, lng) {
  const layer = await th.tiles(t);
  if (!th.cmap) return th.pxf(await pixelAt(layer, lat, lng));
  const [px, cm] = await Promise.all([pixelAt(layer, lat, lng), gibsCmap(typeof th.cmap === 'function' ? th.cmap(t) : th.cmap)]);
  if (!px[3]) return null;
  let best = null, bd = 1e9;
  for (const e of cm) { const dd = (e.rgb[0] - px[0]) ** 2 + (e.rgb[1] - px[1]) ** 2 + (e.rgb[2] - px[2]) ** 2; if (dd < bd) { bd = dd; best = e; if (!dd) break; } }
  return bd > 300 ? null : pxText(th, best); // cor longe da paleta: borda suavizada ou outro dado
}
const pxSeries = (th, lat, lng) => pool(TH.times || [null], 6, t => pxValue(th, t, lat, lng));
const soilValue = (prop, lat, lng) => getJSON('https://rest.isric.org/soilgrids/v2.0/properties/query?' + qs({lon: lng.toFixed(4), lat: lat.toFixed(4), property: prop, depth: '0-5cm', value: 'mean'}))
  .then(j => { const l = j.properties.layers[0], v = l.depths[0].values.mean; return v == null ? null : v / l.unit_measure.d_factor; }).catch(() => null);
// minigráfico de linha (série no tempo do local), com marcador do instante mostrado no mapa
function spark(vals, o = {}) {
  const v = vals.map(x => x == null || isNaN(x) ? null : +x), ok = v.filter(x => x != null); if (ok.length < 2) return '';
  const lo = Math.min(...ok), hi = Math.max(...ok), W = 240, H = 46, X = i => (i / (v.length - 1) * W).toFixed(1), Y = x => (H - 4 - (x - lo) / (hi - lo || 1) * (H - 10)).toFixed(1);
  const d = v.map((x, i) => x == null ? '' : (i && v[i - 1] != null ? 'L' : 'M') + X(i) + ' ' + Y(x)).join('');
  return `<svg class="spk" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${o.c || '#0056ff'}" stroke-width="2" vector-effect="non-scaling-stroke"/>${o.now != null
    ? `<line x1="${X(o.now)}" x2="${X(o.now)}" y1="0" y2="${H}" stroke="#5c9bff" stroke-width="2" vector-effect="non-scaling-stroke"/>` : ''}</svg>
    <div class="spk-l"><span>${o.a || ''}</span><span>mín ${fmt(lo, o.dec ?? 1)} · máx ${fmt(hi, o.dec ?? 1)} ${o.u || ''}</span><span>${o.b || ''}</span></div>`;
}
map.on('click', async e => {
  if (Date.now() - (window.cutAt || 0) < 600) return; // fim do desenho do recorte 3D
  const {lat, lng} = e.latlng.wrap();
  const pop = L.popup({maxWidth: 340, maxHeight: 430, autoPanPaddingTopLeft: [100, 90], autoPanPaddingBottomRight: [340, 110]}).setLatLng(e.latlng).setContent('<span class="muted">Consultando o local…</span>').openOn(map);
  const d = .002, br = inBRbox(lng, lat), th = THEMES[TH.cur];
  const cmIdx = Math.floor(TH.i / 2), cmSel = th?.cm ? TH.times.filter((_, i) => i % 2 === TH.i % 2) : null; // 8 dias, incluindo o mostrado
  const pxP = Promise.all([th?.cmap || th?.pxf ? pxSeries(th, lat, lng) : null, th?.soil ? soilValue(th.soil, lat, lng) : null]); // camadas em imagem e solo
  const [xy, ucs, hist, teow, meow, met, icus, thv, cms] = await Promise.all([
    getJSON(`https://api.obis.org/xylookup?x=${lng}&y=${lat}`).then(r => r[0]).catch(() => null),
    br ? getJSON(INDE + 'MMA/wms?' + qs({service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo', layers: 'MMA:cnuc_2026_03', query_layers: 'MMA:cnuc_2026_03',
      srs: 'EPSG:4326', bbox: [lng - d, lat - d, lng + d, lat + d].join(), width: 3, height: 3, x: 1, y: 1, info_format: 'application/json', feature_count: 5,
      propertyName: 'nome_uc,categoria,esfera,grupo'})).then(j => j.features.map(f => f.properties)).catch(() => []) : [],
    br ? pixelHistory(lng, lat).catch(() => null) : null,
    ecoData('teow').then(fc => locate(fc, lng, lat)).catch(() => null), ecoData('meow').then(fc => locate(fc, lng, lat)).catch(() => null),
    getJSON(`https://api.open-meteo.com/v1/forecast?${qs({latitude: lat.toFixed(3), longitude: lng.toFixed(3), current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m',
      hourly: 'temperature_2m', past_days: 1, forecast_days: 3, timezone: 'GMT'})}`).catch(() => null),
    br ? uvValue('raster_temperatura_icus_nacional_2025', lng, lat) : null,
    th?.gfi && TH.cur !== 'uvIcus' ? uvValue(typeof th.layer === 'function' ? th.layer(TH.times[TH.i]) : th.layer, lng, lat) : null,
    cmSel ? pool(cmSel, 8, dd => cmValue(th, lat, lng, dd)) : null]);
  const [pxs, soilv] = await pxP;
  const leg = S.mbLeg, g = xy?.grids || {}, land = xy && xy.shoredistance < 0, eco = teow || meow, now = met?.current;
  const row = (ic, html, cls = '') => `<div class="pp ${cls}">${ti(ic)}<div>${html}</div></div>`;
  let h = `<b>${lat.toFixed(4)}, ${lng.toFixed(4)}</b>`;
  // a camada ligada vem primeiro, com a série no tempo do local
  if (th?.wx && WX.grid) {
    const ser = WX.grid.vals.map(f => wxSample(f, lat, lng)), v = ser[TH.i];
    h += isNaN(v) ? row(th.ic, `${esc(th.n)}: sem dado neste ponto`, 'muted')
      : row(th.ic, `${esc(th.n)}: <b>${fmt(v, th.dec ?? 1)} ${th.u}</b><br><span class="muted">${wxTimeLbl(TH.i)}</span>${spark(ser, {now: TH.i, u: th.u, dec: th.dec ?? 1, a: 'ontem', b: '+3 dias'})}`);
  }
  if (cms) h += cms.some(v => v != null)
    ? row(th.ic, `${esc(th.n)}: <b>${fmt(cms[cmIdx], th.dec ?? 1)} ${th.u}</b><br><span class="muted">${cmLbl(TH.times[TH.i])}</span>${spark(cms, {now: cmIdx, u: th.u, dec: th.dec ?? 1, a: '−7 dias', b: '+7 dias'})}`)
    : row(th.ic, `${esc(th.n)}: sem dado do modelo aqui (terra ou fora da área coberta)`, 'muted');
  if (pxs) {
    const i = TH.times ? TH.i : 0, cur = pxs[i], when = TH.times ? ` (${esc(th.lbl(TH.times[i]))})` : '', ends = TH.times ? [th.lbl(TH.times[0]), th.lbl(TH.times.at(-1))] : [];
    const series = pxs.length < 2 ? '' : th.classes
      ? `<div class="hist">${pxs.map((x, j) => `<span title="${esc(th.lbl(TH.times[j]))}: ${esc(x?.t || 'sem dado')}" style="background:${x ? `rgb(${x.c})` : '#e3e7fc'}"></span>`).join('')}</div><div class="grad-l"><span>${ends[0]}</span><span>${ends[1]}</span></div>`
      : spark(pxs.map(x => x?.v ?? null), {now: i, u: th.pu || '', dec: th.dec ?? 1, a: ends[0], b: ends[1]});
    h += cur ? row(th.ic, `${esc(th.n)}${when}: <b>${esc(cur.t)}${th.pu ? ' ' + esc(th.pu) : ''}</b>${series}`)
      : row(th.ic, `${esc(th.n)}${when}: ${th.none || 'sem dado neste ponto'}${series}`, 'muted');
  }
  if (th?.soil) h += soilv == null ? row(th.ic, `${esc(th.n)}: sem dado neste ponto (água, gelo ou cidade)`, 'muted')
    : row(th.ic, `${esc(th.n)} (0–5 cm): <b>${fmt(soilv, 1)}${th.pu ? ' ' + esc(th.pu) : ''}</b><br><span class="muted">previsão do SoilGrids 2.0 (250 m)</span>`);
  if (thv != null) h += row(th.ic, `${esc(th.n)} ${TH.times ? '(' + esc(th.lbl(TH.times[TH.i])) + ')' : ''}: <b>${fmt(thv, 2)} ${esc(th.unit || '')}</b>`);
  if (eco) h += row('map-2', `<b>${esc(ecoName(eco))}</b><br><span class="muted">${teow ? esc(BIOMES[teow.BIOME]?.[0] || '') : esc(meow.PROVINCE)}</span>`);
  if (now) {
    const ht = met.hourly?.time.map(t => Date.parse(t + 'Z')) || [], ni = ht.findIndex(t => t >= Date.now() - 18e5);
    h += row('temperature', `Agora: <b>${fmt(now.temperature_2m)} °C</b> · sensação <b>${fmt(now.apparent_temperature)} °C</b><br><span class="muted">umidade ${fmt(now.relative_humidity_2m, 0)}% · vento ${fmt(now.wind_speed_10m, 0)} km/h · chuva ${fmt(now.precipitation)} mm</span>
      ${met.hourly ? spark(met.hourly.temperature_2m, {now: ni < 0 ? null : ni, u: '°C', c: '#e04a3a', a: 'ontem', b: '+3 dias'}) : ''}`);
  }
  if (icus != null) h += row('building-community', `Ilha de calor de superfície (UrbVerde 2025): <b>${icus > 0 ? '+' : ''}${fmt(icus)} °C</b> em relação ao entorno`);
  if (hist?.length && leg && !(xy && !land)) { // no mar o MapBiomas não tem classe
    const yr = TH.cur === 'mb' ? TH.times[TH.i] : 2025, cur = hist.find(x => x.year === yr) || hist[hist.length - 1];
    h += row('trees', `<b>Cobertura em ${cur.year}:</b> ${esc(leg.byVal[cur.pixelValue]?.name || 'sem dado')}${histStrip(hist, leg)}`);
  }
  if (xy && !land) h += row('ripple', `Mar: <b>${fmt(g.sstemperature)} °C</b> · salinidade <b>${fmt(g.sssalinity)}</b><br>Profundidade <b>${fmt(g.bathymetry, 0)} m</b> · costa a <b>${fmt(xy.shoredistance / 1000)} km</b>`);
  else if (xy) h += row('mountain', `Em terra, a ${fmt(-xy.shoredistance / 1000)} km da costa · altitude ≈ ${fmt(-g.bathymetry, 0)} m`, 'muted');
  if (br) h += ucs.length ? ucs.map(u => row('shield-check', `<b>${esc(u.nome_uc)}</b><br><span class="muted">${esc(u.esfera)} · ${esc(u.grupo)}</span>`)).join('')
    : row('shield', 'Fora de Unidade de Conservação', 'muted');
  h += `<div class="pop-acts"><button class="btn soft" data-env>${ti('chart-dots')} Ambiente deste ponto no Painel</button></div>`;
  pop.setContent(h);
  pop.getElement()?.querySelector('[data-env]')?.addEventListener('click', () => { S.envPt = {lat, lng}; showView('stats'); });
});

// ---------- ir para um município (busca de endereços do UrbVerde) ----------
let plT;
$('place').oninput = () => {
  clearTimeout(plT); const q = $('place').value.trim();
  if (q.length < 3) return $('placeAc').hidden = true;
  plT = setTimeout(async () => {
    const r = await getJSON(UVAPI + 'address/suggestions?' + qs({query: q})).catch(() => []);
    if (q !== $('place').value.trim()) return;
    $('placeAc').innerHTML = r.length ? r.slice(0, 8).map(m => `<button data-c="${m.cd_mun}">${esc(m.display_name)}</button>`).join('') : '<span class="muted">Nenhum município encontrado</span>';
    $('placeAc').hidden = false;
    $$('#placeAc button').forEach(b => b.onmousedown = async ev => {
      ev.preventDefault(); $('placeAc').hidden = true; $('place').value = b.textContent;
      const m = await getJSON(UVAPI + 'address/data?' + qs({code: b.dataset.c})).catch(() => null), c = m?.center_options?.default;
      if (c) map.setView([c.lat, c.lng], 12); else toast('Não encontrei o centro do município.');
    });
  }, 250);
};
$('place').onblur = () => setTimeout(() => { $('placeAc').hidden = true; if (!$('place').value) $('placeBox').classList.remove('open'); }, 150);
$('placeBtn').onclick = () => { $('placeBox').classList.add('open'); $('place').focus(); };
$('place').onkeydown = e => { if (e.key === 'Enter') document.querySelector('#placeAc button')?.dispatchEvent(new MouseEvent('mousedown')); };

// ---------- consulta ----------
const AREAS = {br: {obis: {areaid: 26}, gbif: {country: 'BR'}, label: 'no Brasil'}, zee: {obis: {areaid: 25}, gbif: {country: 'BR'}, label: 'na ZEE do Brasil'},
  lme: {obis: {areaid: 40015}, gbif: {country: 'BR'}, label: 'na Plataforma Sul do Brasil'}, world: {obis: {}, gbif: {}, label: 'no mundo'}, view: {label: 'na área visível'}};
const src = () => $('src').value; // auto | obis | gbif
// limites do mapa; com o mapa escondido (tamanho 0) vale o último enquadramento visto, ou o Brasil
let lastB = null;
const mapBounds = () => map.getSize().x > 0 ? (lastB = map.getBounds()) : lastB || L.latLngBounds([[-34, -74], [5.3, -34]]);
map.on('moveend', mapBounds);
function viewWKT() {
  const b = mapBounds(), f = v => v.toFixed(4), w = f(Math.max(b.getWest(), -180)), e = f(Math.min(b.getEast(), 180)), s = f(Math.max(b.getSouth(), -90)), n = f(Math.min(b.getNorth(), 90));
  return `POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`;
}
function buildParams(s = S.recSrc) {
  const a = $('area').value, p = {}, y0 = $('y0').value, y1 = $('y1').value;
  if (a === 'view') p.geometry = viewWKT();
  else Object.assign(p, AREAS[a][s]);
  if (s === 'obis') { if (y0) p.startdate = y0 + '-01-01'; if (y1) p.enddate = y1 + '-12-31'; }
  else if (y0 || y1) p.year = `${y0 || 1600},${y1 || new Date().getFullYear()}`;
  return p;
}
const monthOf = d => +(/^\d{4}-(\d{2})/.exec(d || '') || [])[1] || null;
const normO = r => ({id: r.id, lon: r.decimalLongitude, lat: r.decimalLatitude, year: r.date_year, month: r.month ? +r.month : monthOf(r.eventDate), date: r.eventDate,
  sci: r.species || r.scientificName, kingdom: r.kingdom, phylum: r.phylum, class: r.class, order: r.order, family: r.family, dataset: r.datasetName || r.dataset_id,
  url: `https://obis.org/dataset/${r.dataset_id}`, flags: r.flags || [], sst: r.sst, sss: r.sss, bathymetry: r.bathymetry, shoredistance: r.shoredistance,
  unc: r.coordinateUncertaintyInMeters, basis: r.basisOfRecord, category: r.category, depth: r.depth});
const normG = r => ({id: r.key, lon: r.decimalLongitude, lat: r.decimalLatitude, year: r.year, month: r.month, date: r.eventDate, sci: r.species || r.scientificName,
  kingdom: r.kingdom, phylum: r.phylum, class: r.class, order: r.order, family: r.family, dataset: r.datasetName || r.datasetKey,
  url: `https://www.gbif.org/occurrence/${r.key}`, flags: r.issues || [], cc: r.countryCode, unc: r.coordinateUncertaintyInMeters, basis: r.basisOfRecord, category: r.iucnRedListCategory, depth: r.depth});
const OBIS_SERIOUS = new Set(['ZERO_COORD', 'NO_MATCH', 'ON_LAND']); // como check_onland do obistools; alertas só de profundidade não descartam o registro
const serious = r => r.flags.some(f => (S.recSrc === 'obis' ? OBIS_SERIOUS : GBIF_SERIOUS).has(f));
const usedMemo = {};
const dupKey = r => [r.lon.toFixed(4), r.lat.toFixed(4), (r.date || r.year || '').slice(0, 10), r.sci].join();
// incerteza não informada é mantida; duplicata = mesmo local, data e espécie (comum entre conjuntos de dados).
// used('yr') ignora o filtro de ano: cada gráfico do Painel conta com todos os filtros menos o dele (filtro cruzado), e destaca a seleção
function used(x = '') {
  const m = usedMemo[x]; if (m?.v === S.fv) return m.r;
  const seen = new Set(), b = F.box;
  const ucOK = r => !F.uc || x === 'uc' || (F.uc === 'in' ? r._uc > 0 : F.uc === 'pi' ? r._uc === 2 : F.uc === 'us' ? r._uc === 1 : r._uc === 0);
  const r = S.recs.filter(r => (!F.drop || !serious(r)) && (!F.basis.size || x === 'basis' || F.basis.has(r.basis)) && (!F.mon.size || x === 'mon' || F.mon.has(r.month))
    && (!F.ds || x === 'ds' || r.dataset === F.ds) && ucOK(r) && (!F.unc || r.unc == null || r.unc <= F.unc) && (!F.sp || x === 'sp' || r.sci === F.sp)
    && (!F.yr || x === 'yr' || (r.year >= F.yr[0] && r.year <= F.yr[1])) && (!b || (r.lat >= b[0] && r.lat <= b[2] && r.lon >= b[1] && r.lon <= b[3]))
    && (!F.eco || x === 'eco' || ecoName(r._eco || r._meco) === F.eco) && (!F.dedup || (k => !seen.has(k) && seen.add(k))(dupKey(r))));
  usedMemo[x] = {v: S.fv, r};
  return r;
}
function refineChanged() { S.fv++; tlInit(); renderPts(); renderRefine(); renderFchips(); renderView(); }

async function fetchOBIS(name, p, max) {
  // ponytail: carrega no máximo `max` registros no navegador; acima disso use o script R exportado
  let out = [], after, total = 0;
  while (out.length < max) {
    const size = Math.min(5000, max - out.length);
    const r = await getJSON(`${OBIS}/occurrence?${qs({scientificname: name, ...p, size, after})}`);
    total = r.total; out = out.concat(r.results);
    status(`Carregando ${out.length.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros do OBIS…`);
    if (r.results.length < size) break;
    after = r.results[r.results.length - 1].id;
  }
  return {recs: out.filter(r => r.decimalLatitude != null && !r.absence).map(normO), total};
}
async function fetchGBIF(key, p, max) {
  const base = {taxonKey: key, ...p, hasCoordinate: true, occurrenceStatus: 'PRESENT'};
  const first = await getJSON(`${GBIF}/occurrence/search?${qs({...base, limit: 300, offset: 0, facet: 'year', facetLimit: 400})}`);
  const n = Math.min(first.count, max);
  let jobs = [];
  if (first.count > n) {
    // amostra estratificada por década, proporcional aos registros de cada uma: as primeiras páginas do GBIF concentram poucos
    // conjuntos de dados e anos recentes, e deslocamentos grandes (offset) levam minutos. Registros sem ano ficam de fora.
    const [ya, yb] = (p.year || '1600,3000').split(',').map(Number), dec = {};
    (first.facets?.[0]?.counts || []).forEach(c => { const d = Math.floor(+c.name / 10) * 10; dec[d] = (dec[d] || 0) + c.count; });
    const tot = Object.values(dec).reduce((x, y) => x + y, 0);
    for (const [d, c] of Object.entries(dec)) {
      const k = Math.round(n * c / tot), yr = `${Math.max(+d, ya)},${Math.min(+d + 9, yb)}`;
      for (let o = 0; o < k; o += 300) jobs.push({year: yr, offset: o, limit: Math.min(300, k - o)});
    }
  } else for (let o = 300; o < n; o += 300) jobs.push({offset: o, limit: 300});
  let done = jobs.length && first.count > n ? 0 : first.results.length;
  const pages = await pool(jobs, 8, async j => { // ponytail: GBIF entrega 300 por página (~2–9 s cada); acima de ~10 mil, prefira o download do GBIF
    const r = await getJSON(`${GBIF}/occurrence/search?${qs({...base, ...j})}`);
    done += r.results.length; S.onPage?.(r.results); status(`Carregando ${done.toLocaleString('pt-BR')} de ${n.toLocaleString('pt-BR')} registros do GBIF${first.count > n ? ' (amostra por década)' : ''}…`);
    return r.results;
  });
  const lost = pages.filter(x => !x).length;
  if (lost) toast(`${lost} página(s) do GBIF não responderam: até ${fmt(lost * 300, 0)} registros a menos.`);
  const recs = (first.count > n && jobs.length ? pages : [first.results, ...pages]).filter(Boolean).flat();
  return {recs: recs.map(normG), total: first.count, strat: first.count > n};
}
const taxonOf = (m, name) => ({name: m.canonicalName || name, key: m.usageKey ?? m.key, rank: m.rank, kingdom: m.kingdom, phylum: m.phylum, class: m.class,
  order: m.order, family: m.family, genus: m.genus, full: m.scientificName});
// resolve o nome digitado: chave escolhida na lista (evita homônimos), nome científico, ou nome popular; sinônimos viram o nome aceito
async function resolveTaxon(name, key) {
  const kingdom = KINGDOMS.find(k => String(k.key) === F.king)?.sci; // o reino escolhido desfaz homônimos (Morus planta × Morus ave)
  let m = key ? await getJSON(`${GBIF}/species/${key}`) : await getJSON(`${GBIF}/species/match?${qs({name, kingdom, verbose: true})}`), how = '';
  if (!key && m.matchType === 'NONE' && /multiple/i.test(m.note || '')) // nome científico válido em mais de um grupo
    return {name, key: null, alts: (m.alternatives || []).filter(x => slug(x.canonicalName) === slug(name)).slice(0, 4).map(x => `${x.scientificName} (${KBY[x.kingdom]?.pt || x.kingdom})`)};
  if (!key && (m.matchType === 'NONE' || m.matchType === 'HIGHERRANK')) {
    // nome popular: só aceita quando o nome bate de verdade (igual ou começo), a busca do GBIF é aproximada demais
    const nq = slug(name), sc = t => Math.max(0, ...(t.vernacularNames || []).filter(v => ['por', 'pt', 'eng', 'en', 'spa', 'es'].includes(v.language)).map(v => { const x = slug(v.vernacularName); return x === nq ? 3 : x.startsWith(nq) ? 2 : 0; }));
    const vs = await getJSON(`${GBIF}/species/search?${qs({q: name, qField: 'VERNACULAR', status: 'ACCEPTED', datasetKey: BACKBONE, highertaxonKey: F.king, limit: 20})}`).then(r => r.results).catch(() => []);
    const v = vs.map(t => [sc(t), t]).filter(x => x[0] >= 2).sort((a, b) => b[0] - a[0])[0]?.[1];
    if (v) { m = v; how = `“${name}” é nome popular de`; }
    else if (m.matchType === 'NONE') return {name, key: null};
    else how = `Nome não encontrado; usando o nível superior`;
  } else if (!key && m.matchType === 'FUZZY') how = 'Interpretado como';
  const acc = m.acceptedUsageKey || (m.taxonomicStatus && m.taxonomicStatus !== 'ACCEPTED' && m.acceptedKey);
  if (acc) { const a = await getJSON(`${GBIF}/species/${acc}`); how = `“${m.canonicalName || name}” é sinônimo; usando o nome aceito`; m = a; }
  const t = taxonOf(m, name);
  if (how) t.note = `${how} “${t.name}”.`;
  return t;
}
async function autoSource(t) { // OBIS quando ele tem pelo menos metade dos registros do GBIF (vida marinha, com dados do oceano)
  if (['zee', 'lme'].includes($('area').value)) return 'obis';
  const [o, g] = await Promise.all([
    getJSON(`${OBIS}/occurrence?${qs({scientificname: t.name, ...buildParams('obis'), size: 1})}`).then(r => r.total).catch(() => 0),
    t.key ? getJSON(`${GBIF}/occurrence/search?${qs({taxonKey: t.key, ...buildParams('gbif'), hasCoordinate: true, occurrenceStatus: 'PRESENT', limit: 0})}`).then(r => r.count).catch(() => 0) : 0]);
  return o > 0 && o >= .5 * g ? 'obis' : 'gbif';
}

async function run() {
  const name = $('sp').value.trim(); if (!name) return toast('Digite o nome de um táxon.');
  const tok = ++S.token; tlStop();
  $('go').disabled = true; setBusy(true, 'Identificando o táxon…');
  try {
    const t = await resolveTaxon(name, S.pick?.name === name ? S.pick.key : null);
    if (tok !== S.token) return;
    if (t.alts) { status(`“${esc(name)}” existe em mais de um grupo: ${esc(t.alts.join('; '))}. Escolha na lista ou marque o reino.`); openAc(); suggest(); return; }
    if (!t.key && src() !== 'obis') throw new Error(`“${name}” não foi encontrado no catálogo do GBIF. Confira a grafia ou escolha um nome da lista.`);
    if (t.note) toast(t.note);
    $('sp').value = t.name;
    if (S.taxon?.name !== t.name && !S.keepF) { F.basis.clear(); F.sp = ''; F.ds = ''; } // projeto aberto: mantém os refinamentos salvos
    if (F.king && t.kingdom && KINGDOMS.find(k => String(k.key) === F.king)?.sci !== t.kingdom) { F.king = ''; renderKChips(); }
    S.taxon = t; S.info = null; S.lc = null; S.air = null; S.ecoDone = false; closeAc(); remember(t);
    // troca já: título da nova espécie e mapa sem os pontos da anterior; os pontos do GBIF entram página a página
    $('title').innerHTML = `Ocorrências de <i>${esc(t.name)}</i> ${AREAS[$('area').value].label}`;
    S.recs = []; S.fv++; tlInit(); renderPts(); writeHash();
    let shown = 0;
    S.onPage = rs => { if (tok !== S.token) return; S.recs = S.recs.concat(rs.map(normG)); S.fv++; if (S.recs.length - shown >= 600 || !shown) { shown = S.recs.length; renderPts(); } };
    let eff = src() === 'auto' ? (status('Escolhendo a melhor fonte de dados…'), await autoSource(t)) : src(), res;
    if (tok !== S.token) return;
    const max = () => eff === 'gbif' && !S.maxTouched ? 3000 : +$('max').value; // páginas do GBIF são bem mais lentas que as do OBIS
    if (eff === 'obis') {
      res = await fetchOBIS(t.name, buildParams('obis'), max());
      if (!res.recs.length && t.key) { toast('Sem registros no OBIS (é uma espécie marinha?). Buscando no GBIF…'); eff = 'gbif'; }
    }
    if (eff === 'gbif') { S.recSrc = 'gbif'; res = await fetchGBIF(t.key, buildParams('gbif'), max()); }
    S.onPage = null;
    if (tok !== S.token) return;
    S.recSrc = eff; S.params = buildParams(eff);
    S.recs = res.recs; S.total = res.total; S.strat = res.strat; S.fv++; S.qView = mapBounds(); $('searchHere').hidden = true; syncSrc();
    $('title').innerHTML = `Ocorrências de <i>${esc(t.name)}</i> ${AREAS[$('area').value].label}`;
    S.part = S.recs.length < S.total * .98;
    status(`${S.recs.length.toLocaleString('pt-BR')} registros carregados de ${S.total.toLocaleString('pt-BR')} · fonte: ${S.recSrc.toUpperCase()}${src() === 'auto' ? ' (escolha automática)' : ''}${S.part ? ' · <b class="warn">amostra parcial</b>' : ''}`);
    writeHash();
    if (used().length && !S.keepView) map.fitBounds(L.latLngBounds(used().map(r => [r.lat, r.lon])), {maxZoom: 8, padding: [40, 40], animate: false});
    S.keepF = S.keepView = false;
    tlInit(); renderPts(); loadGrid(); renderView(); renderRefine(); renderFchips(); renderNext();
    const recs = S.recs, again = () => { if (S.recs === recs) { S.fv++; renderPts(); renderView(); renderRefine(); } };
    loadInfo(t).then(() => tok === S.token && renderView());
    ucMask(recs).then(again).catch(e => toast('Unidades de Conservação: ' + e.message));
    assignEco(recs).then(() => { S.ecoDone = true; again(); if (THEMES[TH.cur]?.rich) setTheme(TH.cur); }).catch(() => toast('Ecorregiões indisponíveis (pasta data/).'));
    landCover(recs, tok); airClimate(recs, tok);
  } catch (e) { status('Erro: ' + esc(e.message)); toast(e.message); }
  finally { $('go').disabled = false; setBusy(false); renderFchips(); }
}
let runT;
const runSoon = () => { clearTimeout(runT); runT = setTimeout(() => S.taxon || $('sp').value.trim() ? run() : null, 350); };
$('go').onclick = run;
$('spClear').onclick = () => { $('sp').value = ''; $('sp').focus(); openAc(); };
function syncSrc() {
  const o = S.recSrc === 'obis', g = src() === 'gbif';
  $$('[name=srcR]').forEach(r => r.checked = r.value === src());
  $$('#colorBy [data-obis]').forEach(x => x.disabled = !o); // variáveis do oceano só existem nos registros do OBIS
  if (!o && $('colorBy').selectedOptions[0].dataset.obis !== undefined) $('colorBy').value = 'year';
  $$('#area option').forEach(x => { if (x.value === 'zee' || x.value === 'lme') x.disabled = g; });
  if (g && ['zee', 'lme'].includes($('area').value)) $('area').value = 'br';
}
function setSrc(v) { $('src').value = v; syncSrc(); }
$$('[name=srcR]').forEach(r => r.onchange = () => { setSrc(r.value); if (S.recs.length) run(); });


// ---------- sugestões de nomes (combobox) ----------
// junta nomes científicos (species/suggest) e populares (species/search, campo VERNACULAR), ignora sinônimos
// e ordena pelo número de registros na área escolhida (contagens em cache)
const RANK_PT = {KINGDOM: 'reino', PHYLUM: 'filo', CLASS: 'classe', ORDER: 'ordem', FAMILY: 'família', GENUS: 'gênero', SPECIES: 'espécie', SUBSPECIES: 'subespécie', VARIETY: 'variedade'};
const EXAMPLES = [['Chelonia mydas', 'tartaruga-verde', 'Animalia', 'Testudines'], ['Panthera onca', 'onça-pintada', 'Animalia', 'Carnivora', 'Mammalia'], ['Aedes aegypti', 'mosquito-da-dengue', 'Animalia', 'Diptera', 'Insecta'],
  ['Rhizophora mangle', 'mangue-vermelho', 'Plantae', '', 'Magnoliopsida'], ['Euterpe oleracea', 'açaí', 'Plantae', '', 'Liliopsida'], ['Trichechus manatus', 'peixe-boi-marinho', 'Animalia', 'Sirenia', 'Mammalia'], ['Desmodus rotundus', 'morcego-vampiro', 'Animalia', 'Chiroptera']];
const countCache = new Map(), AC = {items: [], i: -1, tok: 0, q: ''};
const acCountry = () => ['br', 'zee', 'lme'].includes($('area').value) ? 'BR' : '';
const getRecent = () => { try { return JSON.parse(localStorage.getItem('ohb-recent') || '[]'); } catch { return []; } };
function remember(t) {
  if (!t.key) return;
  const r = [{name: t.name, kingdom: t.kingdom, family: t.family, rank: t.rank, class: t.class, order: t.order}, ...getRecent().filter(x => x.name !== t.name)].slice(0, 6);
  try { localStorage.setItem('ohb-recent', JSON.stringify(r)); } catch { /* armazenamento indisponível: só não lembra */ }
}
const hl = (s, q) => { const i = s.toLowerCase().indexOf(q.toLowerCase()); return i < 0 || !q ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
async function countOf(key) {
  const ck = key + ':' + acCountry();
  if (!countCache.has(ck)) countCache.set(ck, getJSON(`${GBIF}/occurrence/count?${qs({taxonKey: key, country: acCountry(), isGeoreferenced: true})}`).catch(() => null));
  return countCache.get(ck);
}
function acRow(it, i, q) {
  const k = KBY[it.kingdom], vern = it.vern?.length ? it.vern.slice(0, 2).join(', ') : '';
  const sub = [vern && `<b>${hl(vern, q)}</b>`, RANK_PT[it.rank] || (it.rank || '').toLowerCase(), it.family, k?.pt || it.kingdom].filter(Boolean).join(' · ');
  const n = it.n === undefined ? '<span class="spin"></span>' : it.n == null ? '' : `${fmt(it.n, 0)}<small>registros${acCountry() ? ' no BR' : ''}</small>`;
  return `<div class="ac-i ${i === AC.i ? 'on' : ''}" role="option" id="ac${i}" aria-selected="${i === AC.i}" data-i="${i}">
    ${tx(it)}
    <div style="min-width:0"><div class="nm"><i>${hl(it.name, q)}</i></div><div class="sub">${sub}</div></div><div class="n">${n}</div></div>`;
}
function drawAc() {
  const q = $('sp').value.trim(), box = $('ac');
  let h = '';
  if (!q) {
    const rec = getRecent();
    AC.items = [...rec, ...EXAMPLES.filter(e => !rec.some(r => r.name === e[0])).map(([name, v, kingdom, order, cls]) => ({name, vern: [v], kingdom, order, class: cls, n: null}))].map(x => ({...x, n: x.n ?? null}));
    if (rec.length) h += `<div class="ac-h">Pesquisas recentes <button data-clear>limpar</button></div>` + rec.map((it, i) => acRow(AC.items[i], i, '')).join('');
    h += `<div class="ac-h">Experimente</div>` + AC.items.slice(rec.length).map((it, j) => acRow(it, j + rec.length, '')).join('');
  } else if (AC.loading && !AC.items.length) h = '<div class="ac-load"><span class="spin"></span> Buscando nomes…</div>';
  else if (!AC.items.length) h = `<div class="ac-empty">Nenhum nome encontrado para “${esc(q)}”${F.king ? ' neste reino' : ''}. Confira a grafia ou tente o nome científico.</div>`;
  else h = `<div class="ac-h">Sugestões ${F.king ? '· ' + esc(KINGDOMS.find(k => String(k.key) === F.king)?.pt) : ''}<span>↑↓ e Enter</span></div>` + AC.items.map((it, i) => acRow(it, i, q)).join('');
  $('acList').innerHTML = h;
  box.querySelectorAll('.ac-i').forEach(e => e.onmousedown = ev => { ev.preventDefault(); pickAc(+e.dataset.i); });
  box.querySelector('[data-clear]')?.addEventListener('mousedown', ev => { ev.preventDefault(); try { localStorage.removeItem('ohb-recent'); } catch { /* ignora */ } drawAc(); });
  $('sp').setAttribute('aria-activedescendant', AC.i >= 0 ? 'ac' + AC.i : '');
}
function placeAc() { // posição fixa junto ao campo: o painel lateral rola e cortaria a lista
  const r = $('combo').getBoundingClientRect(), ac = $('ac');
  Object.assign(ac.style, {left: Math.max(8, Math.min(r.left, innerWidth - 468)) + 'px', top: r.bottom + 6 + 'px', maxHeight: Math.max(200, innerHeight - r.bottom - 24) + 'px'});
}
function openAc() { placeAc(); $('ac').hidden = false; $('combo').classList.add('open'); $('sp').setAttribute('aria-expanded', 'true'); if (!$('sp').value.trim()) { AC.i = -1; drawAc(); } }
addEventListener('resize', () => !$('ac').hidden && placeAc());
function closeAc() { $('ac').hidden = true; $('combo').classList.remove('open'); $('sp').setAttribute('aria-expanded', 'false'); AC.i = -1; }
function pickAc(i) { const it = AC.items[i]; if (!it) return; $('sp').value = it.name; S.pick = {name: it.name, key: it.key}; closeAc(); run(); }
let acT;
async function suggest() {
  const q = $('sp').value.trim(), tok = ++AC.tok;
  if (q.length < 2) { AC.items = []; return drawAc(); }
  AC.loading = true; drawAc();
  const base = {datasetKey: BACKBONE, highertaxonKey: F.king};
  const [sci, vern] = await Promise.all([
    getJSON(`${GBIF}/species/suggest?${qs({q, ...base, limit: 20})}`).catch(() => []),
    q.length >= 3 ? getJSON(`${GBIF}/species/search?${qs({q, qField: 'VERNACULAR', status: 'ACCEPTED', ...base, limit: 50})}`).then(r => r.results).catch(() => []) : []]);
  if (tok !== AC.tok) return;
  // pontuação do texto, sem acentos: igual (3) > começa com (2) > contém (1)
  const nq = slug(q), score = s => { const n = slug(s); return n === nq ? 3 : n.startsWith(nq) ? 2 : n.includes(nq) ? 1 : 0; };
  const seen = new Map();
  for (const t of [...sci, ...vern]) {
    if (t.status && t.status !== 'ACCEPTED') continue;
    const name = t.canonicalName || t.scientificName; if (!name) continue;
    const v = [...new Set((t.vernacularNames || []).filter(x => ['por', 'pt'].includes(x.language)).map(x => x.vernacularName.toLowerCase()))];
    const sc = Math.max(score(name), ...v.map(score), 0), prev = seen.get(name);
    if (!prev || sc > prev.sc) seen.set(name, {key: t.key, name, rank: t.rank, kingdom: t.kingdom, family: t.family, order: t.order, class: t.class, vern: v.sort((a, b) => score(b) - score(a)), n: undefined, sc});
  }
  AC.items = [...seen.values()].sort((a, b) => b.sc - a.sc).slice(0, 14); AC.loading = false; AC.q = q; AC.i = AC.items.length ? 0 : -1; drawAc();
  await pool(AC.items, 8, async it => { it.n = await countOf(it.key); });
  if (tok !== AC.tok) return;
  const sel = AC.items[AC.i]; // mantém a seleção ao reordenar
  AC.items.sort((a, b) => b.sc - a.sc || (b.n || 0) - (a.n || 0) || (a.name.length - b.name.length));
  AC.items = AC.items.filter((it, i) => it.n || i < 3).slice(0, 8);
  AC.i = sel && AC.i > 0 ? AC.items.indexOf(sel) : 0; drawAc();
}
$('sp').addEventListener('focus', openAc);
$('sp').addEventListener('input', () => { openAc(); clearTimeout(acT); acT = setTimeout(suggest, 220); });
$('sp').addEventListener('blur', () => setTimeout(closeAc, 150));
$('sp').addEventListener('keydown', e => {
  const n = AC.items.length, open = !$('ac').hidden;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) openAc(); if (!n) return; AC.i = (AC.i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; drawAc(); $('ac' + AC.i)?.scrollIntoView({block: 'nearest'}); }
  else if (e.key === 'Enter') { // só usa a sugestão se ela corresponde ao texto atual (evita escolher uma lista antiga)
    e.preventDefault(); const fresh = open && AC.i >= 0 && AC.items[AC.i] && AC.q === $('sp').value.trim();
    fresh ? pickAc(AC.i) : (closeAc(), run());
  }
  else if (e.key === 'Escape') closeAc();
});

// ---------- reino (vale para as sugestões e para a aba Busca) ----------
const H = {grp: '', key: '', rows: [], more: false, cKey: '', cnt: {}}; // Explorar · Espécies por grupo
function renderKChips() {
  const all = [{key: '', pt: 'Todos', ic: 'world', sci: 'Todos os reinos'}, ...KINGDOMS];
  const html = cur => all.map(k => `<button class="${String(k.key) === cur ? 'on' : ''}" data-k="${k.key}" title="${k.sci}" role="radio" aria-checked="${String(k.key) === cur}">${KGI[k.sci] ? gi(KGI[k.sci]) : ti(k.ic)}<span>${k.pt}</span></button>`).join('');
  $('kChips').innerHTML = $('qKingdoms').innerHTML = html(F.king);
  $('kIco').className = 'ti ti-' + (KINGDOMS.find(k => String(k.key) === F.king)?.ic || 'search');
  // mousedown: escolher o grupo não tira o foco do campo de pesquisa (a lista continua aberta)
  $$('#kChips button').forEach(b => b.onmousedown = e => { e.preventDefault(); F.king = b.dataset.k; renderKChips(); $('sp').value.trim() ? suggest() : drawAc(); });
  $$('#qKingdoms button').forEach(b => b.onclick = () => { F.king = b.dataset.k; renderKChips(); search(); });
}

// ---------- filtros de onde e quando ----------
$('area').onchange = () => { renderFchips(); runSoon(); };
$('max').onchange = () => { S.maxTouched = true; runSoon(); };
['y0', 'y1'].forEach(id => $(id).addEventListener('change', () => { markPreset(); runSoon(); }));
function markPreset() {
  const y0 = $('y0').value, y1 = $('y1').value, now = new Date().getFullYear();
  const cur = !y0 && !y1 ? '' : y0 == now - 9 && !y1 ? '10' : y0 === '2000' && !y1 ? '2000-' : !y0 && y1 === '1999' ? '-1999' : null;
  $$('#yPresets button').forEach(b => b.classList.toggle('on', b.dataset.y === cur));
}
$$('#yPresets button').forEach(b => b.onclick = () => {
  const v = b.dataset.y, now = new Date().getFullYear();
  [$('y0').value, $('y1').value] = v === '' ? ['', ''] : v === '10' ? [now - 9, ''] : v === '2000-' ? ['2000', ''] : ['', '1999'];
  markPreset(); runSoon();
});
map.on('moveend', () => { if ($('area').value === 'view' && S.qView && !S.qView.equals(map.getBounds())) $('searchHere').hidden = false; });
$('searchHere').onclick = () => { $('area').value = 'view'; run(); };

// ---------- refinar (no navegador, instantâneo) ----------
function renderRefine() {
  const el = $('refine');
  if (!S.recs.length) return el.innerHTML = '<p class="hint">Disponível depois da consulta.</p>';
  const basis = sortDesc(countBy(S.recs, r => r.basis)), sp = sortDesc(countBy(S.recs, r => r.sci)), ds = sortDesc(countBy(S.recs, r => r.dataset)), bad = S.recs.filter(serious).length;
  el.innerHTML = `
    <div class="rgroup"><b>Tipo de registro</b><div class="rchips">${basis.map(([k, n]) => `<button data-b="${esc(k)}" class="${F.basis.has(k) ? 'on' : ''}">${esc(basisPt(k))}<small>${fmt(n, 0)}</small></button>`).join('')}</div></div>
    <div class="rgroup"><b>Precisão da coordenada</b><select id="fUnc">
      <option value="0">Qualquer precisão</option><option value="10000">Até 10 km de incerteza</option><option value="1000">Até 1 km de incerteza</option><option value="100">Até 100 m de incerteza</option></select></div>
    ${sp.length > 1 ? `<div class="rgroup"><b>Espécie</b><select id="fSp"><option value="">Todas (${sp.length})</option>${sp.slice(0, 80).map(([k, n]) => `<option value="${esc(k)}">${esc(k)} (${fmt(n, 0)})</option>`).join('')}</select></div>` : ''}
    <div class="rgroup"><b>Meses do registro</b><div class="months">${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => `<button data-m="${i + 1}" class="${F.mon.has(i + 1) ? 'on' : ''}">${m}</button>`).join('')}</div></div>
    <div class="rgroup"><b>Unidades de Conservação</b><select id="fUc"><option value="">Dentro e fora</option><option value="in">Só dentro de UCs (${fmt(S.recs.filter(r => r._uc > 0).length, 0)})</option>
      <option value="pi">Só em Proteção Integral (${fmt(S.recs.filter(r => r._uc === 2).length, 0)})</option><option value="us">Só em Uso Sustentável (${fmt(S.recs.filter(r => r._uc === 1).length, 0)})</option><option value="out">Só fora de UCs (${fmt(S.recs.filter(r => r._uc === 0).length, 0)})</option></select></div>
    ${ds.length > 1 ? `<div class="rgroup"><b>Conjunto de dados</b><select id="fDs"><option value="">Todos (${ds.length})</option>${ds.slice(0, 60).map(([k, n]) => `<option value="${esc(k)}">${esc(String(k).slice(0, 60))} (${fmt(n, 0)})</option>`).join('')}</select></div>` : ''}
    <label class="sw"><input type="checkbox" id="fDup" ${F.dedup ? 'checked' : ''}><span></span>Remover duplicatas: mesmo local, data e espécie (${fmt(S.recs.length - new Set(S.recs.map(dupKey)).size, 0)})</label>
    <label class="sw"><input type="checkbox" id="fDrop" ${F.drop ? 'checked' : ''}><span></span>Ocultar erros graves de coordenada, data ou nome (${fmt(bad, 0)})</label>
    <p class="hint">${used().length.toLocaleString('pt-BR')} de ${S.recs.length.toLocaleString('pt-BR')} registros passam nos filtros.</p>`;
  $('fUnc').value = F.unc; $('fUc').value = F.uc; if ($('fSp')) $('fSp').value = F.sp; if ($('fDs')) $('fDs').value = F.ds;
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const m = +b.dataset.m; F.mon.has(m) ? F.mon.delete(m) : F.mon.add(m); refineChanged(); });
  $('fUc').onchange = () => { F.uc = $('fUc').value; refineChanged(); };
  if ($('fDs')) $('fDs').onchange = () => { F.ds = $('fDs').value; refineChanged(); };
  el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { F.basis.has(b.dataset.b) ? F.basis.delete(b.dataset.b) : F.basis.add(b.dataset.b); refineChanged(); });
  $('fUnc').onchange = () => { F.unc = +$('fUnc').value; refineChanged(); };
  if ($('fSp')) $('fSp').onchange = () => { F.sp = $('fSp').value; refineChanged(); };
  $('fDrop').onchange = () => { F.drop = $('fDrop').checked; refineChanged(); };
  $('fDup').onchange = () => { F.dedup = $('fDup').checked; refineChanged(); };
}

// ---------- resumo dos filtros ativos (cabeçalho) ----------
function fList() {
  const c = [], y0 = $('y0').value, y1 = $('y1').value;
  c.push({ic: S.recSrc === 'obis' ? 'ripple' : 'world', t: !S.recs.length && src() === 'auto' ? 'Fonte automática' : (src() === 'auto' ? 'Auto · ' : '') + S.recSrc.toUpperCase(), x: src() !== 'auto' && (() => { setSrc('auto'); run(); })});
  if (S.part) c.push({ic: 'alert-triangle', t: `amostra: ${fmt(S.recs.length, 0)} de ${fmt(S.total, 0)}`});
  c.push({ic: 'map-pin', t: $('area').selectedOptions[0].text, x: $('area').value !== 'br' && (() => { $('area').value = 'br'; runSoon(); })});
  if (y0 || y1) c.push({ic: 'calendar', t: y0 && y1 ? `${y0}–${y1}` : y0 ? `desde ${y0}` : `até ${y1}`, x: () => { $('y0').value = $('y1').value = ''; markPreset(); runSoon(); }});
  F.basis.forEach(b => c.push({ic: 'filter', cl: 1, t: basisPt(b), x: () => { F.basis.delete(b); refineChanged(); }}));
  if (F.unc) c.push({ic: 'target', cl: 1, t: `incerteza ≤ ${F.unc >= 1000 ? F.unc / 1000 + ' km' : F.unc + ' m'}`, x: () => { F.unc = 0; refineChanged(); }});
  if (F.sp) c.push({ic: 'tag', cl: 1, t: F.sp, x: () => { F.sp = ''; refineChanged(); }});
  if (F.mon.size) c.push({ic: 'calendar-event', cl: 1, t: 'meses: ' + [...F.mon].sort((a, b) => a - b).join(', '), x: () => { F.mon.clear(); refineChanged(); }});
  if (F.uc) c.push({ic: 'shield-check', cl: 1, t: {in: 'dentro de UCs', pi: 'Proteção Integral', us: 'Uso Sustentável', out: 'fora de UCs'}[F.uc], x: () => { F.uc = ''; refineChanged(); }});
  if (F.yr) c.push({ic: 'calendar-stats', cl: 1, t: F.yr[0] === F.yr[1] ? `ano ${F.yr[0]}` : `anos ${F.yr[0]}–${F.yr[1]}`, x: () => { F.yr = null; refineChanged(); }});
  if (F.box) c.push({ic: 'crop', cl: 1, t: 'área desenhada', x: () => { F.box = null; refineChanged(); }});
  if (F.eco) c.push({ic: 'map-2', cl: 1, t: F.eco.slice(0, 34), x: () => { F.eco = ''; refineChanged(); }});
  if (F.ds) c.push({ic: 'stack-2', cl: 1, t: String(F.ds).slice(0, 30), x: () => { F.ds = ''; refineChanged(); }});
  if (F.drop && S.recs.length) c.push({ic: 'shield-check', cl: 1, t: 'sem erros graves', x: () => { F.drop = false; refineChanged(); }});
  if (F.dedup && S.recs.length) c.push({ic: 'layers-intersect', cl: 1, t: 'sem duplicatas', x: () => { F.dedup = false; refineChanged(); }});
  const tl = TL.mode !== 'all' && TL.y0 != null && {ic: 'clock', cl: 1, t: 'mapa: ' + $('tlLbl').textContent, x: () => { TL.mode = 'all'; $('tlMode').value = 'all'; tlSet(TL.year); }};
  if (tl) c.push(tl);
  return c;
}
function renderFchips() {
  const c = fList(), nx = c.filter(f => f.x).length; $('fCount').hidden = !nx; $('fCount').textContent = nx;
  $('fchips').innerHTML = c.map((f, i) => `<span class="fchip ${f.cl ? 'client' : ''}" title="${f.cl ? 'Filtro aplicado nos registros carregados' : 'Filtro da consulta'}"><i class="ti ti-${f.ic}"></i>${esc(f.t)}${f.x ? `<button data-i="${i}" title="Remover filtro" aria-label="Remover filtro ${esc(f.t)}"><i class="bi bi-x-lg"></i></button>` : '<span style="width:4px"></span>'}</span>`).join('');
  $$('#fchips button').forEach(b => b.onclick = () => c[+b.dataset.i].x());
  window.renderQchips?.(c); // atalhos e filtros cruzados no topo do mapa e das páginas (analise.js)
}
$('resetF').onclick = () => {
  F.basis.clear(); F.unc = 0; F.sp = ''; F.drop = true; F.dedup = true; F.king = ''; F.mon.clear(); F.ds = ''; F.uc = ''; F.yr = F.box = null; F.eco = ''; renderKChips();
  $('y0').value = $('y1').value = ''; markPreset(); TL.mode = 'all'; $('tlMode').value = 'all';
  const changedArea = $('area').value !== 'br'; $('area').value = 'br';
  changedArea || S.params.startdate || S.params.year ? run() : refineChanged();
  toast('Filtros limpos.');
};

// ---------- linha do tempo do mapa ----------
const TL = {mode: 'all', year: null, y0: null, y1: null, timer: null};
const timeOK = r => TL.mode === 'all' || (r.year && (TL.mode === 'cum' ? r.year <= TL.year : TL.mode === 'win' ? r.year > TL.year - 5 && r.year <= TL.year : r.year === TL.year));
const mapRecs = () => used().filter(timeOK);
function tlInit() {
  const ys = S.recs.map(r => r.year).filter(Boolean);
  if (!ys.length) { TL.y0 = null; return renderDock(); }
  TL.y0 = Math.min(...ys); TL.y1 = Math.max(...ys); TL.year = TL.y1; TL.counts = countBy(S.recs, r => r.year);
  Object.assign($('tlYear'), {min: TL.y0, max: TL.y1, value: TL.y1}); rangeP($('tlYear'));
  $('tlTicks').innerHTML = [...new Set([0, .25, .5, .75, 1].map(f => Math.round(TL.y0 + f * (TL.y1 - TL.y0))))].map(y => `<span>${y}</span>`).join('');
  tlLabel(); renderDock();
}
function tlLabel() {
  const y = TL.year;
  $('tlLbl').textContent = TL.mode === 'all' ? 'Todos os anos' : TL.mode === 'cum' ? `até ${y}` : TL.mode === 'win' ? `${y - 4}–${y}` : String(y);
  $('tlCount').textContent = `${mapRecs().length.toLocaleString('pt-BR')} registros no mapa`;
}
function drawSpark() {
  const c = $('tlSpark'), w = c.clientWidth, h = c.clientHeight; if (!w || TL.y0 == null) return;
  const dpr = devicePixelRatio || 1; c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const n = TL.y1 - TL.y0 + 1, bw = w / n, mx = Math.max(...Object.values(TL.counts));
  for (let i = 0; i < n; i++) {
    const y = TL.y0 + i, v = TL.counts[y] || 0, bh = v ? Math.max(2, Math.sqrt(v / mx) * h) : 0;
    g.fillStyle = timeOK({year: y}) ? '#9cc0ff' : 'rgba(255,255,255,.16)';
    g.fillRect(i * bw + .5, h - bh, Math.max(1, bw - 1), bh);
  }
}
function tlSet(year) { TL.year = year; $('tlYear').value = year; rangeP($('tlYear')); tlLabel(); drawSpark(); renderPts(); renderFchips(); }
$('tlYear').oninput = () => { if (TL.mode === 'all') { TL.mode = 'cum'; $('tlMode').value = 'cum'; } tlSet(+$('tlYear').value); };
$('tlMode').onchange = () => { TL.mode = $('tlMode').value; tlSet(TL.year); };
function tlStop() { clearInterval(TL.timer); TL.timer = null; $('tlPlay').innerHTML = ti('player-play-filled'); }
$('tlPlay').onclick = () => {
  if (TL.timer) return tlStop();
  if (TL.mode === 'all') { TL.mode = 'cum'; $('tlMode').value = 'cum'; }
  let y = TL.year >= TL.y1 ? TL.y0 : TL.year;
  const step = Math.max(1, Math.round((TL.y1 - TL.y0) / 60)); // ~60 quadros no máximo
  $('tlPlay').innerHTML = ti('player-pause-filled');
  tlSet(y);
  TL.timer = setInterval(() => { y = Math.min(TL.y1, y + step); tlSet(y); if (y >= TL.y1) tlStop(); }, 350);
};
addEventListener('resize', () => requestAnimationFrame(drawSpark));

// ---------- camadas de ocorrência ----------
const RAMPS = {
  year: ['#04123f', '#0047e0', '#2277ff', '#5c9bff', '#9cc0ff'], sst: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
  sss: ['#e0f2f1', '#80cbc4', '#00897b', '#004d40'], bathymetry: ['#b2dfdb', '#4db6ac', '#00695c', '#002b24'], shoredistance: ['#f0f4c3', '#c6d93b', '#558b2f'],
};
function rampColor(ramp, t) {
  t = Math.max(0, Math.min(1, t)); const i = Math.min(ramp.length - 2, Math.floor(t * (ramp.length - 1))), f = t * (ramp.length - 1) - i;
  const c = k => [1, 3, 5].map(j => parseInt(ramp[k].substr(j, 2), 16)), a = c(i), b = c(i + 1);
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * f))})`;
}
// _uc: 2 Proteção Integral · 1 Uso Sustentável · 0 fora de UC · -1 fora do Brasil (o CNUC só cobre o Brasil) · null calculando
const UCCOL = ['#e5533d', '#f2b134', '#1e9e5a', '#a3abc4', '#cfd8dc'], UCLBL = ['Fora de UC', 'Uso Sustentável', 'Proteção Integral', 'Calculando…', 'Fora do Brasil (sem dado)'];
const ucIdx = r => r._uc == null ? 3 : r._uc < 0 ? 4 : r._uc;
let scale = null;
function renderPts() {
  ptsLayer.clearLayers(); scale = null;
  if ($('lPts').checked) {
    const v = $('colorBy').value, recs = mapRecs();
    if (RAMPS[v]) { const vals = used().map(r => r[v]).filter(x => x != null); scale = {v, lo: quantile(vals, .02), hi: quantile(vals, .98)}; }
    for (const r of recs) {
      const x = r[v];
      const col = v === 'flag' ? (serious(r) ? '#e5533d' : '#0056ff') : v === 'uc' ? UCCOL[ucIdx(r)]
        : x == null ? '#a3abc4' : rampColor(RAMPS[v], (x - scale.lo) / (scale.hi - scale.lo || 1));
      L.circleMarker([r.lat, r.lon], {radius: 4.5, weight: .8, color: '#ffffff', fillColor: col, fillOpacity: .92})
        .bindPopup(() => `<b><i>${esc(r.sci)}</i></b><br>${esc(r.date || r.year || 'sem data')} · ${esc(basisPt(r.basis))}
          ${r._eco || r._meco ? `<br>${ti('map-2')} ${esc(ecoName(r._eco || r._meco))}` : ''}
          ${r.sst != null ? `<br>Mar: ${fmt(r.sst)} °C · salinidade ${fmt(r.sss)} · prof. ${fmt(r.bathymetry, 0)} m` : ''}
          ${r._t2m != null ? `<br>Ar no dia (ERA5): ${fmt(r._t2m)} °C · chuva ${fmt(r._pr)} mm` : ''}
          ${r._uc != null ? `<br>${UCLBL[ucIdx(r)]}` : ''}
          ${r.unc ? `<br>Incerteza da coordenada: ${fmt(r.unc / 1000)} km` : ''}
          ${r.flags.length ? `<br><span class="muted">Alertas: ${r.flags.map(f => esc(FLAG_PT[f] || f)).join('; ')}</span>` : ''}
          <br><span class="muted">${esc(r.dataset)}</span><br><a target="_blank" rel="noopener" href="${r.url}">abrir registro original ↗</a>`)
        .addTo(ptsLayer);
    }
  }
  if (TL.y0 != null) $('tlCount').textContent = `${mapRecs().length.toLocaleString('pt-BR')} registros no mapa`;
  renderDetails();
}
async function loadGrid() {
  gridLayer.clearLayers(); if (gbifDensity) { map.removeLayer(gbifDensity); gbifDensity = null; }
  if (!$('lGrid').checked || !S.taxon) { map.removeLayer(gridLayer); return renderDetails(); }
  if (S.recSrc === 'gbif') {
    const {country, year} = S.params;
    gbifDensity = L.tileLayer(`https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?${qs({taxonKey: S.taxon.key, country, year, style: 'green2.poly', bin: 'hex', hexPerTile: 40})}`,
      {pane: 'grade', opacity: .85, attribution: 'GBIF'}).addTo(map);
    return renderDetails();
  }
  const prec = map.getZoom() < 4 ? 2 : map.getZoom() < 6 ? 3 : 4, {areaid, geometry, startdate, enddate} = S.params;
  const gj = await getJSON(`${OBIS}/occurrence/grid/${prec}?${qs({scientificname: S.taxon.name, areaid, geometry, startdate, enddate})}`).catch(() => null);
  if (!gj) return toast('Grade de densidade indisponível');
  const mx = Math.log10(Math.max(...gj.features.map(f => f.properties.n), 10));
  L.geoJSON(gj, {renderer: gridRenderer, pane: 'grade', style: f => ({weight: 0, fillOpacity: .72, fillColor: rampColor(['#e3e7fc', '#2277ff', '#04123f'], Math.log10(f.properties.n) / mx)}),
    onEachFeature: (f, l) => l.bindTooltip(f.properties.n.toLocaleString('pt-BR') + ' registros')}).addTo(gridLayer);
  gridLayer.addTo(map); renderDetails();
}
$('lPts').onchange = $('colorBy').onchange = renderPts;
$('lGrid').onchange = loadGrid;

// ---------- menu de camadas (estilo zoom.earth): grupos à esquerda, lista do grupo ao lado ----------
const GRP = {esp: 'Espécies', tempo: 'Tempo e clima', mar: 'Oceano', terra: 'Terra e biomas', cidade: 'Cidades e calor · UrbVerde', gente: 'Pessoas e exposição',limites: 'Limites e territórios', base: 'Mapa-base'};
let flyG = '';
const thItem = k => { const th = THEMES[k]; return `<button class="th-i ${TH.cur === k ? 'on' : ''}" data-t="${k}" title="${esc(th.src)}"><span class="tx">${ti(th.ic)}</span>
  <span><b>${esc(th.n)}</b><small>${esc(th.s || th.src)}</small></span>${th.times || th.wx ? ti('player-play') : '<span></span>'}</button>`; };
function themeGroups(g) { // itens do grupo, separados por subgrupo na ordem em que aparecem
  const subs = new Map();
  Object.keys(THEMES).filter(k => THEMES[k].g === g).forEach(k => { const s = THEMES[k].sub || ''; subs.has(s) || subs.set(s, []); subs.get(s).push(k); });
  return [...subs].map(([s, ks]) => (s ? `<div class="th-sub">${esc(s)}</div>` : '') + ks.map(thItem).join('')).join('');
}
function renderThemeLists() {
  $$('.th-list').forEach(el => {
    const g = el.dataset.tg;
    el.innerHTML = themeGroups(g) + (THEMES[TH.cur]?.g === g ? `<button class="th-off" data-t="">${ti('eye-off')} Desligar esta camada</button>` : '');
  });
  $$('.th-list [data-t]').forEach(b => b.onclick = () => setTheme(b.dataset.t === TH.cur ? '' : b.dataset.t));
  renderFly();
}
function renderRail() {
  const th = THEMES[TH.cur], act = {esp: S.recs.length && ($('lPts').checked || $('lGrid').checked), limites: $$('.wms:checked').length, [th?.g]: !!th};
  $$('#lrail [data-g]').forEach(b => { b.classList.toggle('act', !!act[b.dataset.g]); b.classList.toggle('open', b.dataset.g === flyG); });
}
function renderFly() {
  $('fly').hidden = !flyG;
  if (flyG) {
    $('flyTtl').textContent = GRP[flyG];
    $$('.fly-panel').forEach(p => p.classList.toggle('on', p.dataset.g === flyG));
    const th = THEMES[TH.cur];
    $('flyOp').hidden = th?.g !== flyG;
    if (th) $('thOp').value = TH.op[TH.cur] ?? (th.eco ? 1 : .85);
  }
  renderRail();
}
const setFly = g => { flyG = g; renderFly(); if (g) setSb(false); };
$$('#lrail [data-g]').forEach(b => b.onclick = () => setFly(flyG === b.dataset.g ? '' : b.dataset.g));
$('flyClose').onclick = () => setFly('');
$('thOp').oninput = () => thOpacity(+$('thOp').value);
function renderModel() {
  $('wxModel').innerHTML = [['best_match', 'Melhor'], ['icon_seamless', 'ICON'], ['gfs_seamless', 'GFS']].map(([v, n]) => `<button data-m="${v}" class="${TH.model === v ? 'on' : ''}">${n}</button>`).join('');
  $$('#wxModel [data-m]').forEach(b => b.onclick = () => { TH.model = b.dataset.m; renderModel(); if (THEMES[TH.cur]?.wx && !THEMES[TH.cur].api) { WX.key = ''; WX.keep = true; wxLoad(); } });
}
const BASE_THUMB = {Oceano: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/3/4/2',
  Satélite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/3/4/2', Ruas: 'https://tile.openstreetmap.org/3/2/4.png'};
function renderBasemaps() {
  $('basemaps').innerHTML = Object.keys(BASEMAPS).map(k => `<button data-b="${k}" class="${k === base ? 'on' : ''}"><img src="${BASE_THUMB[k]}" alt="">${k}</button>`).join('');
  $$('#basemaps button').forEach(b => b.onclick = () => { map.removeLayer(BASEMAPS[base]); base = b.dataset.b; BASEMAPS[base].addTo(map).bringToBack(); renderBasemaps(); });
}

// ---------- tocador de tempo (embaixo): a camada ou os registros da espécie ----------
function renderDock() {
  const hasT = TH.times?.length > 1, hasS = TL.y0 != null && S.recs.length > 0;
  if (!hasT) S.dock = 'sp'; else if (!hasS) S.dock = 'th';
  $('dock').hidden = !hasT && !hasS;
  $('dockTabs').hidden = !(hasT && hasS);
  $('syncBox').hidden = !(hasT && hasS && THEMES[TH.cur]?.yr);
  $('tt').hidden = !(hasT && S.dock === 'th');
  $('tl').hidden = !(hasS && S.dock === 'sp');
  $$('#dockTabs [data-d]').forEach(b => b.classList.toggle('on', b.dataset.d === S.dock));
  if (hasT) { $('ttRange').max = TH.times.length - 1; ttLabel(); ttTicks(); }
  if (!$('tl').hidden) requestAnimationFrame(drawSpark);
}
$$('#dockTabs [data-d]').forEach(b => b.onclick = () => { S.dock = b.dataset.d; renderDock(); });
$('sync').onchange = () => { if ($('sync').checked) syncYear(); };

// ---------- legenda (embaixo à direita): só o que está ligado ----------
const gradBar = (stops, dec = 0) => `<div class="grad" style="background:linear-gradient(90deg,${stops.map(s => s[1]).join()})"></div>
  <div class="grad-l">${stops.filter((_, i) => i % Math.ceil(stops.length / 5) === 0 || i === stops.length - 1).map(s => `<span>${fmt(s[0], dec)}</span>`).join('')}</div>`;
const cmLeg = {};
function cmLegend(k, th) { // a legenda do Copernicus vem em JSON (mapa de cores + faixa), desenhada aqui no mesmo estilo das outras
  const L0 = cmLeg[k];
  if (L0 === undefined) {
    cmLeg[k] = 'loading';
    getJSON(cmQ(th, {REQUEST: 'GetLegend', FORMAT: 'application/json'})).then(j => { cmLeg[k] = j.continuous || null; if (TH.cur === k) renderDetails(); }).catch(() => { cmLeg[k] = null; });
  }
  if (!L0 || L0 === 'loading') return '<span class="muted">Carregando a escala…</span>';
  const c = L0.cmap.colorMap, lo = L0.valueMin, hi = L0.valueMax, tick = i => L0.logScale ? lo * (hi / lo) ** (i / 4) : lo + (hi - lo) * i / 4;
  return `<div class="grad" style="background:linear-gradient(90deg,${Array.from({length: 9}, (_, i) => `rgb(${c[Math.round(i * (c.length - 1) / 8)]})`).join()})"></div>
    <div class="grad-l">${[0, 1, 2, 3, 4].map(i => `<span>${fmt(tick(i), th.dec ?? 1)}</span>`).join('')}</div>`;
}
function themeLegend(th) {
  const lg = ecoLayer?.legend;
  if (th.eco && lg === 'teow') {
    const seen = new Set(S.recs.map(r => r._eco?.BIOME).filter(Boolean));
    return `<div class="leg-cats">${Object.entries(BIOMES).filter(([k]) => !seen.size || seen.has(+k)).map(([, [n, c]]) => `<div class="leg-row"><span class="sq" style="background:${c}"></span><span>${n}</span></div>`).join('')}</div>` + (seen.size ? '<span class="muted">biomas onde há registros</span>' : '');
  }
  if (th.eco && lg === 'meow') return '<span class="muted">Cores por reino biogeográfico. Passe o mouse para ver o nome.</span>';
  if (th.eco && lg?.mx) return `<div class="grad" style="background:linear-gradient(90deg,#e3e7fc,#2277ff,#04123f)"></div><div class="grad-l"><span>1</span><span>${lg.mx} ${lg.multi ? 'espécies' : 'registros'}</span></div>`;
  if (TH.cur === 'mb' && S.mbLeg) return `<div class="leg-cats">${S.mbLeg.l1.map(c => `<div class="leg-row" title="${esc(c.kids.join(', '))}"><span class="sq" style="background:${c.color}"></span><span>${esc(c.name)}</span></div>`).join('')}</div>`;
  if (th.wx) return gradBar(th.stops, th.dec || 0);
  if (th.cm) return cmLegend(TH.cur, th);
  const note = th.leg ? `<span class="muted">${th.leg}</span>` : '';
  if (th.legImg) return `<img alt="" class="leg-img" src="${th.legImg}">${note}`;
  if (th.gl) return `<div class="grad" style="background:linear-gradient(90deg,${th.gl.c.join()})"></div><div class="grad-l">${th.gl.l.map(t => `<span>${t}</span>`).join('')}</div>${note}`;
  if (th.layer) return uvLegend(typeof th.layer === 'function' ? th.layer(TH.times[TH.i]) : th.layer);
  return `<span class="muted">${th.leg || 'Clique no mapa para ver o valor no local.'}</span>`;
}
function renderDetails() {
  renderRail(); renderWmsOp();
  const v = $('colorBy').value, o = [], th = THEMES[TH.cur];
  if (th) o.push(`<div><h4>${ti(th.ic)} ${esc(th.n)}${th.u || th.unit ? `<small>${esc(th.u || th.unit)}</small>` : ''}</h4>${themeLegend(th)}<div class="src">${esc(th.src)}</div></div>`);
  if (S.recs.length && $('lPts').checked) {
    const lbl = $('colorBy').selectedOptions[0].text;
    o.push(scale ? `<div><h4>${ti('paw')} Pontos · ${lbl}</h4><div class="grad" style="background:linear-gradient(90deg,${RAMPS[v]})"></div><div class="grad-l"><span>${fmt(scale.lo, 0)}</span><span>${fmt(scale.hi, 0)}</span></div></div>`
      : v === 'flag' ? `<div><h4>${ti('paw')} Pontos · ${lbl}</h4><div class="leg-row"><span class="dot" style="background:#0056ff"></span><span>sem problemas graves</span></div><div class="leg-row"><span class="dot" style="background:#e5533d"></span><span>com alerta de qualidade</span></div></div>`
      : `<div><h4>${ti('paw')} Pontos · ${lbl}</h4><div class="leg-cats">${UCLBL.map((t, i) => `<div class="leg-row"><span class="dot" style="background:${UCCOL[i]}"></span><span>${t}</span></div>`).join('')}</div></div>`);
  }
  if ($('lGrid').checked) o.push(`<div><h4>${ti('hexagons')} Densidade de registros</h4><div class="grad" style="background:linear-gradient(90deg,#e3e7fc,#2277ff,#04123f)"></div><div class="grad-l"><span>poucos</span><span>muitos</span></div></div>`);
  const wms = $$('.wms:checked'); // legendas oficiais dos GeoServers (MMA/ICMBio/MapBiomas), recolhidas para não ocupar o mapa
  if (wms.length) o.push(`<details><summary>${ti('shield-check')} Limites ligados (${wms.length}): ${esc(wms.map(lblOf).join(', '))}</summary>${wms.map(c => `<img alt="" class="leg-img" src="${wmsUrl(c)}?${qs({service: 'WMS', version: '1.1.1', request: 'GetLegendGraphic', format: 'image/png', layer: c.value, legend_options: 'fontName:Inter;fontAntiAliasing:true;fontSize:11;dx:4'})}">`).join('')}</details>`);
  $('detailsBody').innerHTML = o.join('');
  $('details').hidden = !o.length;
}

// ---------- Unidades de Conservação ----------
// estilo só com preenchimento: o estilo padrão tem contorno/rótulos que "engordam" as UCs na máscara
const FILL_SLD = '<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>MMA:cnuc_2026_03</Name>' +
  '<UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#000000</CssParameter></Fill></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>';
// ponytail: 1 imagem WMS por grupo lida pixel a pixel (~1 km/pixel na costa do Brasil); pontos a ~1 px da borda podem errar
const inBR = r => (!r.cc || r.cc === 'BR') && inBRbox(r.lon, r.lat); // país do GBIF (quando há) e caixa do Brasil + ZEE (evita coordenadas com sinal trocado)
async function ucMask(recsAll) {
  recsAll.forEach(r => { if (!inBR(r)) r._uc = -1; });
  const recs = recsAll.filter(inBR);
  if (!recs.length) return;
  const lons = recs.map(r => r.lon), lats = recs.map(r => r.lat);
  const x0 = Math.min(...lons) - .01, x1 = Math.max(...lons) + .01, y0 = Math.min(...lats) - .01, y1 = Math.max(...lats) + .01;
  const k = 3000 / Math.max(x1 - x0, y1 - y0), w = Math.ceil((x1 - x0) * k), h = Math.ceil((y1 - y0) * k);
  const img = filter => new Promise((ok, err) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0); ok(g.getImageData(0, 0, w, h).data); };
    im.onerror = () => err(new Error('serviço de UCs indisponível'));
    im.src = INDE + 'MMA/wms?' + qs({service: 'WMS', version: '1.1.1', request: 'GetMap', layers: 'MMA:cnuc_2026_03', SLD_BODY: FILL_SLD, srs: 'EPSG:4326',
      bbox: [x0, y0, x1, y1].join(), width: w, height: h, format: 'image/png', transparent: true, format_options: 'antialiasing:none', CQL_FILTER: filter});
  });
  const [all, pi] = await Promise.all([img(''), img("grupo='Proteção Integral'")]);
  for (const r of recs) {
    const i = 4 * (Math.min(h - 1, Math.floor((y1 - r.lat) * k)) * w + Math.min(w - 1, Math.floor((r.lon - x0) * k))) + 3;
    r._uc = pi[i] ? 2 : all[i] ? 1 : 0; // 2 = Proteção Integral, 1 = Uso Sustentável, 0 = fora
  }
}

// ---------- cobertura MapBiomas nos locais de ocorrência ----------
// ponytail: amostra até 30 locais (1 requisição cada) para não sobrecarregar a API pública; use o script do Earth Engine para todos
async function landCover(recs, tok) {
  const uni = [...new Map(recs.filter(r => r.lon > -75 && r.lon < -28 && r.lat > -35 && r.lat < 6).map(r => [r.lon.toFixed(3) + ',' + r.lat.toFixed(3), [r.lon, r.lat]])).values()];
  if (!uni.length) { S.lc = {n: 0}; return renderView(); }
  S.lc = 'loading'; renderView();
  const step = Math.max(1, uni.length / 30), sample = Array.from({length: Math.min(30, uni.length)}, (_, i) => uni[Math.floor(i * step)]);
  const leg = await mbLegend().catch(() => null);
  if (!leg) { S.lc = {n: 0, err: true}; return renderView(); }
  const hists = (await pool(sample, 5, p => pixelHistory(p[0], p[1]))).filter(h => h?.length);
  if (tok !== S.token) return;
  const years = [...new Set(hists.flatMap(h => h.map(x => x.year)))].sort();
  const names = [...leg.l1.map(c => c.name), 'Sem dado'];
  const series = Object.fromEntries(names.map(n => [n, years.map(() => 0)]));
  hists.forEach(h => h.forEach(x => series[leg.byVal[x.pixelValue]?.l1.name || 'Sem dado'][years.indexOf(x.year)]++));
  const nat = i => (series['Floresta']?.[i] || 0) + (series['Vegetação Herbácea e Arbustiva']?.[i] || 0);
  const lost = hists.filter(h => { const a = leg.byVal[h[0].pixelValue]?.l1.v, b = leg.byVal[h[h.length - 1].pixelValue]?.l1.v; return [1, 10].includes(a) && [14, 22].includes(b); }).length;
  const last = years.length - 1, water = Object.entries(series).filter(([n]) => /água|Sem dado/i.test(n)).reduce((s, [, d]) => s + d[last], 0);
  const water0 = Object.entries(series).filter(([n]) => /água|Sem dado/i.test(n)).reduce((s, [, d]) => s + d[0], 0);
  S.lc = {n: hists.length, land: hists.length - water, land0: hists.length - water0, years, series, colors: Object.fromEntries([...leg.l1.map(c => [c.name, c.color]), ['Sem dado', '#d5e6e2']]), nat0: nat(0), nat1: nat(last), lost};
  renderView();
}

// ---------- clima do ar no dia de cada registro: ERA5 via Open-Meteo (sem conta no Copernicus) ----------
// ponytail: amostra de até 40 registros datados (1 requisição cada); para todos, use o script ERA5 de Análise › Exportar
async function airClimate(recs, tok) {
  const lim = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), day = r => (r.date || '').slice(0, 10);
  const cand = recs.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(day(r)) && day(r) >= '1940-01-01' && day(r) <= lim);
  if (!cand.length) { S.air = {n: 0}; return renderView(); }
  S.air = 'loading'; renderView();
  const step = cand.length / Math.min(40, cand.length), sample = Array.from({length: Math.min(40, cand.length)}, (_, i) => cand[Math.floor(i * step)]);
  await pool(sample, 4, r => getJSON(`https://archive-api.open-meteo.com/v1/archive?${qs({latitude: r.lat.toFixed(3), longitude: r.lon.toFixed(3), start_date: day(r), end_date: day(r), daily: 'temperature_2m_mean,precipitation_sum', timezone: 'GMT'})}`)
    .then(j => { r._t2m = j.daily.temperature_2m_mean[0]; r._pr = j.daily.precipitation_sum[0]; }));
  if (tok !== S.token) return;
  const ok = sample.filter(r => r._t2m != null);
  S.air = {n: ok.length, t: ok.map(r => r._t2m), p: ok.map(r => r._pr).filter(v => v != null)};
  renderView();
}

// ---------- informações da espécie ----------
async function loadInfo(t) {
  if (!t.key) return;
  const [sp, vern, iucn, wiki] = await Promise.all([
    getJSON(`${GBIF}/species/${t.key}`).catch(() => ({})),
    getJSON(`${GBIF}/species/${t.key}/vernacularNames?limit=100`).then(r => r.results).catch(() => []),
    getJSON(`${GBIF}/species/${t.key}/iucnRedListCategory`).catch(() => null),
    wikiSummary(t.name)]);
  const pt = [...new Set(vern.filter(v => ['por', 'pt'].includes(v.language)).map(v => v.vernacularName.toLowerCase()))];
  S.info = {sp, pt, iucn, wiki};
}
async function wikiSummary(name) {
  for (const lang of ['pt', 'en']) {
    const r = await getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`).catch(() => null);
    if (r?.extract && r.type !== 'disambiguation') return {...r, lang};
  }
  return null;
}

// ---------- estatísticas ----------
function stats() {
  const recs = used(), pts = recs.map(r => [r.lon, r.lat]);
  const uni = [...new Map(pts.map(p => [p.join(), p])).values()];
  const lats = uni.map(p => p[1]), lons = uni.map(p => p[0]);
  const aoo = aooKm2(uni), eooRaw = uni.length >= 3 ? ringAreaKm2(convexHull(uni)) : 0, eoo = eooRaw || aoo; // como no IUCNN
  const yrs = recs.map(r => r.year).filter(Boolean), withY = recs.filter(r => r.year);
  const latTrend = withY.length > 20 ? ols(withY.map(r => r.year), withY.map(r => Math.abs(r.lat))) : null;
  const sstY = withY.filter(r => r.sst != null);
  const sstTrend = sstY.length > 20 ? ols(sstY.map(r => r.year), sstY.map(r => r.sst)) : null;
  const br = used('uc').filter(r => r._uc !== -1);
  const uc = recs.length && br.every(r => r._uc != null) ? {n: br.length, pi: br.filter(r => r._uc === 2).length, us: br.filter(r => r._uc === 1).length,
    aooIn: aooKm2(br.filter(r => r._uc > 0).map(r => [r.lon, r.lat])), aooBR: aooKm2(br.map(r => [r.lon, r.lat]))} : null;
  const byYear = countBy(used('yr'), r => r.year), now = new Date().getFullYear();
  const dec = (a, b) => Object.entries(byYear).reduce((s, [y, n]) => s + (y > now - a && y <= now - b ? n : 0), 0);
  const cum = []; { const cells = new Set(); let y0 = Math.min(...yrs); const byY = {}; withY.forEach(r => (byY[r.year] ||= []).push(r));
    for (let y = y0; y <= Math.max(...yrs); y++) { (byY[y] || []).forEach(r => cells.add(cellKey(r.lon, r.lat))); cum.push(cells.size * 4); } }
  const yset = new Set(yrs);
  return {recs, uni, aoo, eoo, uc, latTrend, sstTrend, byYear, cum, last10: dec(10, 0), prev10: dec(20, 10), nYears: yset.size,
    byMonth: countBy(used('mon'), r => r.month), basis: countBy(used('basis'), r => r.basis), ds: countBy(used('ds'), r => r.dataset), species: countBy(used('sp'), r => r.sci),
    ym: countBy(recs.filter(r => r.year && r.month), r => r.year * 100 + r.month),
    eco: countBy(used('eco'), r => ecoName(r._eco || r._meco)), biome: countBy(recs, r => r._eco?.BIOME), mprov: countBy(recs, r => r._meco?.PROVINCE),
    flags: countBy(S.recs.flatMap(r => r.flags), f => f), dups: S.recs.length - new Set(S.recs.map(r => [r.lon, r.lat, r.date].join())).size,
    catSrc: S.recs.find(r => r.category)?.category, cat: S.info?.iucn?.code || S.recs.find(r => r.category)?.category,
    env: k => recs.map(r => r[k]).filter(v => v != null), yr: yrs.length ? [Math.min(...yrs), Math.max(...yrs)] : ['—', '—'], noYear: recs.length - yrs.length,
    bigUnc: S.recs.filter(r => r.unc > 10000).length, bad: S.recs.filter(serious).length,
    iucnn: {tot_occ: recs.length, uni_occ: uni.length, mean_lat: mean(lats), mean_lon: mean(lons), lat_range: quantile(lats, .95) - quantile(lats, .05),
      lon_range: quantile(lons, .95) - quantile(lons, .05), eoo, aoo, lat_hemisphere: mean(lats) < 0 ? 0 : 1}};
}

// ---------- navegação ----------
function showView(v) {
  if (AN[v]) { S.an = v; v = 'analise'; } // Espécie, Perguntas e Exportar vivem na aba Análise
  S.view = v;
  $$('#tabs [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  document.body.classList.toggle('on-mapa', v === 'mapa');
  if (v === 'mapa') setTimeout(() => { map.invalidateSize(); drawSpark(); }, 50); else setFly('');
  setSb(false); renderView(); renderNext();
}
// próximo passo sugerido: o caminho espécie → mapa → painel → perguntas → exportar
const NEXT = {stats: ['perg', 'bulb', 'Gerar perguntas'], ficha: ['stats', 'chart-dots', 'Ver o painel'],
  perg: ['exp', 'file-export', 'Exportar para testar'], exp: ['mapa', 'map-2', 'Voltar ao mapa'], busca: ['mapa', 'map-2', 'Ver no mapa']};
const AN = {ficha: ['id', 'Espécie'], perg: ['bulb', 'Perguntas'], exp: ['file-export', 'Exportar']};
function renderNext() {
  const n = NEXT[S.view === 'analise' ? S.an : S.view], b = $('next');
  b.hidden = !n || !S.recs.length;
  if (n) { b.innerHTML = `${ti(n[1])}<span> ${n[2]}</span> ${ti('arrow-right')}`; b.onclick = () => showView(n[0]); }
}
addEventListener('keydown', e => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('sp').focus(); }
  if (e.key === 'Escape') { setSb(false); setFly(''); }
});
$$('#tabs [data-v]').forEach(b => b.onclick = () => showView(b.dataset.v));
$('home').onclick = e => { e.preventDefault(); showView('mapa'); };
function setSb(open) { document.body.classList.toggle('sb-open', open); $('sbOpen').setAttribute('aria-expanded', open); if (open) setFly(''); }
$('sbOpen').onclick = () => setSb(!document.body.classList.contains('sb-open'));
$('sbClose').onclick = () => setSb(false);
$('openMethod').onclick = () => $('method').showModal();
$('share').onclick = () => { writeHash(); navigator.clipboard.writeText(location.href).then(() => toast('Link da consulta copiado.'), () => prompt('Copie o link:', location.href)); };

function chart(id, cfg, keys) { // keys: chave de cada barra/fatia; com elas o gráfico vira filtro (analise.js → XF)
  S.charts[id]?.destroy();
  const el = $(id); if (!el) return;
  const xf = keys && window.XF?.[id];
  if (xf) {
    cfg.options ||= {};
    cfg.options.onClick = (e, els) => els.length && xf(keys[els[0].index], e.native);
    cfg.options.onHover = (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : ''; };
    el.closest('.card')?.classList.add('xf');
  }
  S.charts[id] = new Chart(el, cfg);
}
Object.assign(Chart.defaults, {color: '#4f5b7d', borderColor: 'rgba(4,18,63,.08)'});
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.plugins.legend.labels.boxWidth = 10; Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#04123f'; Chart.defaults.plugins.tooltip.cornerRadius = 10; Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.elements.bar.borderRadius = 6; Chart.defaults.elements.line.tension = .4;
const CAT = ['#0056ff', '#2277ff', '#5c9bff', '#2db87a', '#04123f', '#9cc0ff', '#f2b134', '#8e24aa'];
const grad = (top, bottom = 'rgba(0,150,136,0)') => c => { const a = c.chart.chartArea; if (!a) return top; const g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, top); g.addColorStop(1, bottom); return g; };
const noLegend = {plugins: {legend: {display: false}}, scales: {x: {grid: {display: false}}}};
const emptyView = (ic, t) => `<div class="wrap"><div class="card empty">${ti(ic)}${t}</div></div>`;

function renderView() {
  let v = S.view, el = $('v-' + v);
  if (v === 'mapa') return renderDetails();
  if (v === 'busca') { renderKChips(); return xShow(S.xtab || 'lugar'); }
  if (v === 'proj') return renderProj(el); // projetos.js
  const none = S.taxon ? 'Nenhum registro para esta consulta. Tente outra área, outro período ou a fonte GBIF nos <b>Filtros</b>.' : 'Pesquise uma espécie na barra do topo ou use <b>Explorar</b>.';
  if (v === 'stats') { // o ambiente do local aparece sempre; os gráficos da espécie, quando há registros
    el.innerHTML = `<div class="wrap">${envCard()}<div id="spStats">${S.recs.length ? '' : `<div class="card empty">${ti('search')}${none}</div>`}</div></div>`;
    envLoad();
    if (S.recs.length) renderStats($('spStats'), S.st = stats());
    return;
  }
  if (v === 'analise') {
    v = S.an ||= 'ficha';
    el.innerHTML = `<nav class="seg mini an-nav" aria-label="Seções da análise">${Object.entries(AN).map(([k, [ic, t]]) => `<button data-an="${k}" class="${k === v ? 'on' : ''}">${ti(ic)} ${t}</button>`).join('')}</nav><div id="anBody"></div>`;
    el.querySelectorAll('[data-an]').forEach(b => b.onclick = () => showView(b.dataset.an));
    el = $('anBody');
  }
  if (!S.recs.length) return el.innerHTML = emptyView('search', none);
  const s = S.st = stats();
  ({stats: renderStats, ficha: renderFicha, perg: renderQuestions, exp: renderExport})[v](el, s);
}

const kpi = (icon, val, lbl, delta = '') => `<div class="kpi s3"><span class="ico">${ti(icon)}</span><b title="${esc(String(val))}">${val}</b><span>${lbl}</span>${delta}</div>`;
const pbar = (lbl, a, b, col) => `<div class="bar-l"><span>${lbl}</span><b>${pct(a, b)}</b></div><div class="bar"><i style="width:${b ? 100 * a / b : 0}%;background:${col}"></i></div>`;
function heatmap(s) {
  const [y0, y1] = s.yr; if (typeof y0 !== 'number') return '<p class="muted">Sem datas.</p>';
  const vals = Object.values(s.ym); if (!vals.length) return '<p class="muted">Os registros não informam o mês.</p>';
  const mx = Math.max(...vals), cells = [];
  for (let y = y0; y <= y1; y++) for (let m = 1; m <= 12; m++) {
    const v = s.ym[y * 100 + m] || 0;
    cells.push(`<i title="${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m - 1]}/${y}: ${v} registros" style="background:${v ? rampColor(['#e3e7fc', '#2277ff', '#04123f'], Math.log(1 + v) / Math.log(1 + mx)) : 'var(--soft)'}"></i>`);
  }
  return `<div class="heat"><div class="heat-rows">${['jan', '', 'mar', '', 'mai', '', 'jul', '', 'set', '', 'nov', ''].map(m => `<span>${m}</span>`).join('')}</div>
    <div class="heat-grid">${cells.join('')}</div><div class="heat-years"><span>${y0}</span><span>${Math.round((y0 + y1) / 2)}</span><span>${y1}</span></div></div>
    <div class="heat-leg">menos ${['#e3e7fc', '#9cc0ff', '#2277ff', '#0056ff', '#04123f'].map(c => `<i style="background:${c}"></i>`).join('')} mais</div>`;
}

function renderStats(el, s) {
  const yrs = Object.keys(s.byYear).map(Number).sort((a, b) => a - b), top = sortDesc(s.ds).slice(0, 8), sp = sortDesc(s.species), lc = S.lc, obis = S.recSrc === 'obis';
  const d = s.prev10 ? (s.last10 - s.prev10) / s.prev10 : null;
  const delta = d == null ? '' : `<span class="delta ${d >= 0 ? 'up' : 'down'}"><i class="bi bi-arrow-${d >= 0 ? 'up' : 'down'}-right"></i> ${fmt(Math.abs(100 * d), 0)}% na última década</span>`;
  const ecoTop = sortDesc(s.eco).slice(0, 10), biomes = sortDesc(s.biome), prov = sortDesc(s.mprov).slice(0, 8), ok = S.recs.length - s.bad;
  el.innerHTML = `<div class="wrap"><div class="card hero"><h2>${gi(grpIc(S.taxon))} <i>${esc(S.taxon.name)}</i></h2><p class="lead">Gráficos dos ${fmt(s.recs.length, 0)} registros que passam nos filtros. <b>Clique numa barra ou fatia</b> para filtrar o mapa e todo o painel (clique de novo para soltar; Shift+clique no ano marca um intervalo).</p></div><div class="dash">
    ${kpi('database', s.recs.length.toLocaleString('pt-BR'), 'registros analisados', delta)}
    ${kpi('map-pins', s.uni.length.toLocaleString('pt-BR'), 'locais distintos')}
    ${kpi('calendar', s.yr.join('–'), 'período dos registros')}
    ${kpi(sp.length > 1 ? 'dna-2' : 'stack-2', sp.length > 1 ? sp.length : Object.keys(s.ds).length, sp.length > 1 ? 'espécies no táxon' : 'conjuntos de dados')}
    ${kpi('compass', s.eoo >= 1e6 ? fmt(s.eoo / 1e6, 2) + ' mi km²' : s.eoo >= 1e4 ? fmt(s.eoo / 1e3, 0) + ' mil km²' : fmt(s.eoo, 0) + ' km²', 'extensão de ocorrência (EOO)')}
    ${kpi('grid-dots', fmt(s.aoo, 0) + ' km²', 'área de ocupação (AOO)')}
    ${kpi('map-2', S.ecoDone ? Object.keys(s.eco).length : '…', 'ecorregiões ocupadas')}
    ${kpi('alert-triangle', catB(s.eoo, s.aoo), 'triagem pelo critério B')}

    <div class="card s8"><h3>Linha do tempo <span class="sub">registros por ano e área de ocupação acumulada</span></h3><canvas id="cYear" height="120"></canvas>
      ${howto('As barras mostram quantos registros foram feitos a cada ano. A linha mostra a área de ocupação (AOO) acumulada: se ainda sobe forte nos anos recentes, cada nova coleta revela lugares novos e a distribuição conhecida ainda depende do esforço de amostragem. Se estabilizou, a distribuição está bem amostrada.')}</div>
    <div class="card s4"><h3>Indicadores</h3>
      ${pbar('Registros no Brasil em Unidades de Conservação', s.uc ? s.uc.pi + s.uc.us : 0, s.uc?.n || 0, '#1e9e5a')}
      ${pbar('… em Proteção Integral', s.uc?.pi || 0, s.uc?.n || 0, '#2277ff')}
      ${pbar('Locais em terra com vegetação nativa hoje', lc?.land ? lc.nat1 : 0, lc?.land || 0, '#2db87a')}
      ${pbar('Registros sem alerta de qualidade', ok, S.recs.length, '#5c9bff')}
      ${pbar('Coordenadas com incerteza ≤ 10 km', S.recs.length - s.bigUnc, S.recs.length, '#9cc0ff')}
      <p class="muted">${!s.uc ? 'Calculando proteção… ' : s.uc.n < s.recs.length ? `${fmt(s.recs.length - s.uc.n, 0)} registros fora do Brasil não entram na conta de UCs. ` : ''}${lc === 'loading' ? 'Consultando o MapBiomas…' : ''}</p></div>
    ${S.part ? `<div class="card s12 warnbox"><i class="bi bi-exclamation-triangle"></i> <div><b>Amostra parcial:</b> foram carregados ${fmt(S.recs.length, 0)} dos ${fmt(S.total, 0)} registros (${S.strat ? 'amostra proporcional por década' : 'na ordem da fonte, não aleatória'}). Contagens, EOO e AOO ficam subestimados. Aumente o limite em <b>Filtros</b> ou use o script R de Análise › Exportar.</div></div>` : ''}

    <div class="card s12 niche" id="nicheCard"></div>
    <div class="card s12 niche" id="ohCard"></div>
    <div class="card s8"><h3>Calendário de registros <span class="sub">ano × mês</span></h3>${heatmap(s)}
      ${howto('Cada quadradinho é um mês de um ano; quanto mais escuro, mais registros. Faixas horizontais escuras indicam sazonalidade constante; colunas escuras isoladas, campanhas pontuais de coleta.')}</div>
    <div class="card s4"><h3>Sazonalidade</h3><canvas id="cMonth" height="230"></canvas>
      ${howto('Registros por mês, somando todos os anos. Pode indicar reprodução, migração ou só a época em que os pesquisadores vão a campo.')}</div>

    <div class="card s6"><h3>Ecorregiões com mais registros</h3>${S.ecoDone ? (ecoTop.length ? `<canvas id="cEco" height="${70 + ecoTop.length * 24}"></canvas>` : '<p class="muted">Nenhum registro dentro das ecorregiões.</p>') : '<p class="muted">Cruzando com as ecorregiões…</p>'}
      ${howto('Ecorregiões terrestres do WWF e marinhas MEOW (Spalding et al. 2007), como no fluxo do gbif-ecoregions. Ecorregiões agrupam comunidades com história e ambiente parecidos: são a escala natural para comparar riqueza e lacunas de amostragem.')}</div>
    <div class="card s6"><h3>${biomes.length ? 'Biomas (WWF)' : 'Províncias marinhas (MEOW)'}</h3>${S.ecoDone && (biomes.length || prov.length) ? '<canvas id="cBiome" height="220"></canvas>' : '<p class="muted">…</p>'}
      ${howto('Distribuição dos registros entre os grandes biomas terrestres do WWF (Olson et al. 2001) ou, para espécies marinhas, entre as províncias biogeográficas do MEOW.')}</div>

    <div class="card s7"><h3>Cobertura da terra nos locais de ocorrência <span class="sub">MapBiomas 1985–2025</span></h3>${
      lc === 'loading' ? '<p class="muted">Consultando o histórico MapBiomas de até 30 locais…</p>'
      : !lc?.n ? `<p class="muted">${lc?.err ? 'A API do MapBiomas não respondeu.' : 'Sem locais em território brasileiro para consultar.'}</p>`
      : `<canvas id="cLC" height="150"></canvas><p class="muted">Amostra de ${lc.n} locais, ${lc.land} em terra. Vegetação nativa nos locais em terra: ${pct(lc.nat0, lc.land0)} em ${lc.years[0]} → ${pct(lc.nat1, lc.land)} em ${lc.years[lc.years.length - 1]}. ${lc.lost} local(is) trocaram vegetação nativa por uso agropecuário ou área não vegetada.</p>`}
      ${howto('Para cada local sorteado, o MapBiomas informa a classe do pixel de 30 m em cada ano desde 1985. As faixas mostram quantos locais estavam em cada classe. Em espécies marinhas, a maioria aparece como “Corpo d’água” ou sem dado.')}</div>
    <div class="card s5"><h3>Proteção em Unidades de Conservação <span class="sub">registros no Brasil</span></h3>${!s.uc ? '<p class="muted">Calculando…</p>' : s.uc.n ? '<canvas id="cUC" height="190"></canvas>' : '<p class="muted">Nenhum registro no Brasil: o cadastro de UCs (CNUC) só cobre o território brasileiro.</p>'}
      ${howto('Proteção Integral: parques, reservas biológicas, estações ecológicas. Uso Sustentável: APAs, RESEX, FLONAs. Só UCs brasileiras do CNUC.')}</div>

    <div class="card s12"><h3>Clima no dia do registro <span class="sub">ERA5 via Open-Meteo · temperatura média do ar e chuva do dia</span></h3>${airCard()}
      ${howto('Para uma amostra de até 40 registros com data completa, a reanálise ERA5 (0,25°, ~28 km) informa a temperatura média do ar a 2 m e a chuva acumulada no dia da observação. A faixa entre 5% e 95% aproxima o nicho climático realizado; compare com o clima disponível na região antes de concluir. O clima de todos os registros, mês a mês, sai do script ERA5 de Análise › Exportar.')}</div>
    <div class="card s4"><h3>Distribuição por latitude</h3><canvas id="cLat" height="230"></canvas>${howto('Registros por faixa de 1° de latitude: mostra limites norte–sul e lacunas de amostragem.')}</div>
    <div class="card s4"><h3>Tipo de registro</h3><canvas id="cBasis" height="230"></canvas>${howto('Observação humana, espécime de museu, sensor/telemetria, amostra de material… Telemetria concentra muitos pontos de poucos indivíduos.')}</div>
    <div class="card s4"><h3>Principais conjuntos de dados</h3><canvas id="cDs" height="230"></canvas>${howto('Quando um único conjunto domina, os padrões podem refletir o desenho daquele estudo.')}</div>
    ${sp.length > 1 ? `<div class="card s12"><h3>Espécies no táxon consultado</h3><canvas id="cSp" height="${50 + Math.min(12, sp.length) * 20}"></canvas></div>` : ''}
    </div>
    ${obis ? `<details class="fold" open><summary>Ambiente nos locais de ocorrência <small>dados do OBIS</small></summary><div class="fold-body"><div class="dash">
      ${[['sst', 'Temperatura da superfície do mar (°C)'], ['sss', 'Salinidade'], ['bathymetry', 'Profundidade do local (m)'], ['shoredistance', 'Distância da costa (km)']].map(([k, n]) => {
        const a = s.env(k);
        return `<div class="s6"><h3>${n}</h3><div class="kv"><span>mín · 5% · mediana · 95% · máx</span><span>${[0, .05, .5, .95, 1].map(q => fmt(quantile(a, q) / (k === 'shoredistance' ? 1000 : 1))).join(' · ')}</span></div><canvas id="h_${k}" height="110"></canvas></div>`;
      }).join('')}</div>${howto('A faixa entre 5% e 95% estima o nicho realizado. Profundidade ou distância da costa negativas indicam ponto em terra.')}</div></details>` : ''}
    <details class="fold"><summary>Qualidade dos dados <small>${pct(s.bad, S.recs.length)} com alerta grave</small></summary><div class="fold-body">
      <div class="kv" style="margin-bottom:12px"><span>Registros com alerta grave</span><span>${s.bad}</span><span>Possíveis duplicatas (mesmo local e data)</span><span>${s.dups}</span>
        <span>Sem ano</span><span>${s.noYear}</span><span>Incerteza da coordenada maior que 10 km</span><span>${s.bigUnc}</span></div>
      <table><tr><th>Alerta</th><th>Registros</th><th>%</th></tr>${sortDesc(s.flags).map(([f, n]) => `<tr><td><code>${esc(f)}</code><br><span class="muted">${esc(FLAG_PT[f] || '')}</span></td><td>${n}</td><td>${pct(n, S.recs.length)}</td></tr>`).join('') || '<tr><td colspan="3">Nenhum alerta</td></tr>'}</table>
      <p class="muted">Os erros graves já ficam fora das análises por padrão. Para incluí-los, desligue “Ocultar erros graves” em <b>Filtros</b>.</p></div></details>
  </div>`;
  s.air = S.air;
  const y0 = yrs[0], years = yrs.length ? Array.from({length: yrs[yrs.length - 1] - y0 + 1}, (_, i) => y0 + i) : [];
  chart('cYear', {data: {labels: years, datasets: [
    {type: 'bar', label: 'registros', data: years.map(y => s.byYear[y] || 0), yAxisID: 'y', order: 2,
      backgroundColor: F.yr ? years.map(y => y >= F.yr[0] && y <= F.yr[1] ? '#0056ff' : 'rgba(34,119,255,.22)') : grad('#2277ff', 'rgba(34,119,255,.25)')},
    {type: 'line', label: 'AOO acumulada (km²)', data: s.cum, borderColor: '#5c9bff', backgroundColor: grad('rgba(92,155,255,.35)', 'rgba(92,155,255,0)'), fill: true, pointRadius: 0, borderWidth: 2.5, yAxisID: 'y2', order: 1}]},
    options: {interaction: {mode: 'index', intersect: false}, scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 12}}, y: {title: {display: true, text: 'registros'}},
      y2: {position: 'right', grid: {display: false}, title: {display: true, text: 'AOO km²'}}}}}, years);
  const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  chart('cMonth', {type: 'radar', data: {labels: M, datasets: [{data: M.map((_, i) => s.byMonth[i + 1] || 0), borderColor: '#0056ff', backgroundColor: 'rgba(34,119,255,.28)',
      pointBackgroundColor: M.map((_, i) => F.mon.has(i + 1) ? '#04123f' : '#5c9bff'), pointRadius: M.map((_, i) => F.mon.has(i + 1) ? 7 : 4), pointHoverRadius: 8}]},
    options: {interaction: {mode: 'nearest', intersect: false}, plugins: {legend: {display: false}}, scales: {r: {ticks: {display: false}, grid: {color: 'rgba(4,18,63,.1)'}, angleLines: {color: 'rgba(4,18,63,.1)'}}}}}, M.map((_, i) => i + 1));
  if (S.ecoDone && ecoTop.length) chart('cEco', {type: 'bar', data: {labels: ecoTop.map(([k]) => k.length > 34 ? k.slice(0, 32) + '…' : k), datasets: [{data: ecoTop.map(([, n]) => n), backgroundColor: F.eco ? ecoTop.map(([k]) => k === F.eco ? '#04123f' : 'rgba(0,86,255,.28)') : grad('#0056ff', '#2277ff')}]}, options: {...noLegend, indexAxis: 'y'}}, ecoTop.map(([k]) => k));
  if (S.ecoDone && (biomes.length || prov.length)) {
    const src2 = biomes.length ? biomes.map(([k, n]) => [BIOMES[k]?.[0] || k, n, BIOMES[k]?.[1]]) : prov.map(([k, n], i) => [k, n, CAT[i % CAT.length]]);
    chart('cBiome', {type: 'doughnut', data: {labels: src2.map(x => x[0]), datasets: [{data: src2.map(x => x[1]), backgroundColor: src2.map(x => x[2]), borderColor: '#ffffff', borderWidth: 3}]},
      options: {cutout: '62%', plugins: {legend: {position: 'right'}}}});
  }
  if (lc?.n) chart('cLC', {type: 'line', data: {labels: lc.years, datasets: Object.entries(lc.series).filter(([, dd]) => dd.some(Boolean)).map(([n, dd]) => ({label: n, data: dd, fill: true, backgroundColor: lc.colors[n] + 'd0', borderColor: lc.colors[n], pointRadius: 0, borderWidth: 1}))},
    options: {interaction: {mode: 'index', intersect: false}, scales: {y: {stacked: true, title: {display: true, text: 'locais'}}, x: {grid: {display: false}, ticks: {maxTicksLimit: 9}}}}});
  if (s.air?.n) { const a = S.air.t, lo = Math.floor(Math.min(...a)), hi = Math.ceil(Math.max(...a)), bins = hi > lo ? Array.from({length: hi - lo + 1}, (_, i) => lo + i) : [lo];
    chart('cAir', {type: 'bar', data: {labels: bins.map(b => b + '°'), datasets: [{data: bins.map(b => a.filter(v => Math.floor(v) === b).length), backgroundColor: bins.map(b => rgbOf(scaleRGBA(T_STOPS, b)))}]}, options: {...noLegend, scales: {x: {grid: {display: false}, title: {display: true, text: 'temperatura média do ar no dia (°C)'}}}}}); }
  if (s.uc?.n) chart('cUC', {type: 'doughnut', data: {labels: ['Proteção Integral', 'Uso Sustentável', 'Fora de UC'], datasets: [{data: [s.uc.pi, s.uc.us, s.uc.n - s.uc.pi - s.uc.us], backgroundColor: [UCCOL[2], UCCOL[1], UCCOL[0]].map((c, i) => !['pi', 'us', 'out'].includes(F.uc) || ['pi', 'us', 'out'][i] === F.uc ? c : c + '40'), borderColor: '#ffffff', borderWidth: 3}]},
    options: {cutout: '62%', plugins: {legend: {position: 'right'}}}}, ['pi', 'us', 'out']);
  const lb = countBy(s.recs, r => Math.floor(r.lat)), lk = Object.keys(lb).map(Number).sort((a, b) => b - a);
  chart('cLat', {type: 'bar', data: {labels: lk.map(l => `${Math.abs(l)}°${l < 0 ? 'S' : 'N'}`), datasets: [{data: lk.map(l => lb[l]), backgroundColor: '#5c9bff'}]}, options: {...noLegend, indexAxis: 'y'}});
  const bs = sortDesc(s.basis);
  chart('cBasis', {type: 'doughnut', data: {labels: bs.map(([k]) => basisPt(k)), datasets: [{data: bs.map(([, n]) => n), backgroundColor: bs.map(([k], i) => !F.basis.size || F.basis.has(k) ? CAT[i % CAT.length] : CAT[i % CAT.length] + '40'), borderColor: '#ffffff', borderWidth: 3}]}, options: {cutout: '62%', plugins: {legend: {position: 'bottom'}}}}, bs.map(([k]) => k));
  chart('cDs', {type: 'bar', data: {labels: top.map(([k]) => k.length > 28 ? k.slice(0, 26) + '…' : k), datasets: [{data: top.map(([, n]) => n), backgroundColor: top.map(([k]) => !F.ds || k === F.ds ? '#0056ff' : 'rgba(0,86,255,.28)')}]}, options: {...noLegend, indexAxis: 'y'}}, top.map(([k]) => k));
  window.renderNiche?.(); window.renderOH?.(); // perfil ambiental (analise.js) e interface One Health (onehealth.js)
  if (sp.length > 1) chart('cSp', {type: 'bar', data: {labels: sp.slice(0, 12).map(([k]) => k), datasets: [{data: sp.slice(0, 12).map(([, n]) => n), backgroundColor: F.sp ? sp.slice(0, 12).map(([k]) => k === F.sp ? '#2db87a' : 'rgba(45,184,122,.28)') : grad('#2db87a', '#5c9bff')}]}, options: {...noLegend, indexAxis: 'y'}}, sp.slice(0, 12).map(([k]) => k));
  if (obis) for (const k of ['sst', 'sss', 'bathymetry', 'shoredistance']) {
    const a = s.env(k).map(v => k === 'shoredistance' ? v / 1000 : v); if (!a.length) continue;
    const lo = quantile(a, .01), hi = quantile(a, .99), nb = 24, w = (hi - lo) / nb || 1, h = Array(nb).fill(0);
    a.forEach(v => { if (v >= lo && v <= hi) h[Math.min(nb - 1, Math.floor((v - lo) / w))]++; });
    chart('h_' + k, {type: 'bar', data: {labels: h.map((_, i) => fmt(lo + (i + .5) * w)), datasets: [{data: h, backgroundColor: rampColor(RAMPS[k], .65)}]}, options: {...noLegend, scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 6}}}}});
  }
}

const rgbOf = c => `rgb(${c.slice(0, 3).map(Math.round)})`;
function airCard() {
  const a = S.air;
  if (a === 'loading') return '<p class="muted">Consultando a reanálise ERA5 para os registros…</p>';
  if (!a?.n) return '<p class="muted">Sem registros com data completa (dia, mês e ano) a partir de 1940.</p>';
  const q = (x, k) => fmt(quantile(x, k));
  return `<div class="dash"><div class="s4"><div class="kv"><span>Registros consultados</span><span>${a.n}</span><span>Temperatura do ar: 5% · mediana · 95%</span><span>${q(a.t, .05)} · ${q(a.t, .5)} · ${q(a.t, .95)} °C</span>
    <span>Chuva no dia: mediana · 95%</span><span>${q(a.p, .5)} · ${q(a.p, .95)} mm</span><span>Dias com chuva (≥ 1 mm)</span><span>${pct(a.p.filter(v => v >= 1).length, a.p.length)}</span></div></div>
    <div class="s8"><canvas id="cAir" height="110"></canvas></div></div>`;
}
function renderFicha(el, s) {
  const t = S.taxon, i = S.info, w = i?.wiki, k = KBY[t.kingdom], oh = ohNotes(t);
  const cb = catB(s.eoo, s.aoo), links = [
    t.key && [`https://www.gbif.org/species/${t.key}`, 'GBIF'], [`https://obis.org/taxon/${encodeURIComponent(t.name)}`, 'OBIS'],
    w && [w.content_urls?.desktop?.page, `Wikipédia (${w.lang})`], ['https://salve.icmbio.gov.br/#/', 'SALVE / ICMBio'],
    i?.iucn?.iucnTaxonID && [`https://www.iucnredlist.org/species/${i.iucn.iucnTaxonID}/0`, 'Lista Vermelha IUCN']].filter(Boolean);
  const crumb = [k?.pt || t.kingdom, t.phylum, t.class, t.order, t.family].filter(Boolean).map(esc).join(' <span>›</span> ');
  el.innerHTML = `<div class="wrap">
    <div class="card sp-head">
      ${w?.thumbnail ? `<img class="sp-img" src="${esc(w.originalimage?.source || w.thumbnail.source)}" alt="${esc(t.name)}">` : `<div class="sp-img" style="display:grid;place-items:center;font-size:84px;color:var(--e700)">${gi(grpIc(t))}</div>`}
      <div>
        <div class="crumbs">${ti(k?.ic || 'dna-2')} ${crumb}</div>
        <h2 class="sp-name">${esc(t.name)}</h2>
        <div class="muted">${esc(t.full || '')} · ${esc((t.rank || '').toLowerCase())}</div>
        ${i?.pt?.length ? `<div style="margin-top:6px">${i.pt.slice(0, 8).map(n => `<span class="tag">${esc(n)}</span>`).join('')}</div>` : i ? '' : '<p class="muted">Carregando informações…</p>'}
        <div class="status-row">
          <div>Lista Vermelha IUCN (via GBIF)<br>${badge(i?.iucn?.code)} ${esc(IUCN[i?.iucn?.code] || 'sem avaliação')}</div>
          ${S.recSrc === 'obis' ? `<div>Categoria nos registros do OBIS<br>${badge(s.catSrc)} ${esc(IUCN[s.catSrc] || 'sem dado')}</div>` : ''}
          <div>Triagem pelo critério B<br>${badge(cb.slice(0, 2))} ${cb}</div>
        </div>
        ${w?.extract ? `<p>${esc(w.extract)}</p>` : ''}
        <div class="links">${links.map(([u, n]) => `<a class="btn-out" target="_blank" rel="noopener" href="${esc(u)}">${n} <i class="bi bi-box-arrow-up-right"></i></a>`).join('')}</div>
        ${i?.iucn && s.catSrc && i.iucn.code !== s.catSrc ? `<p class="muted"><i class="bi bi-exclamation-triangle"></i> As categorias divergem: o OBIS pode trazer uma avaliação mais antiga. Confira a data na IUCN.</p>` : ''}
      </div>
    </div>
    ${oh.length ? `<div class="card oh"><h3>${ti('heartbeat')} Relevância One Health</h3>${oh.map(n => `<p>${esc(n)}</p>`).join('')}<p class="muted">Cruze com a cobertura da terra (MapBiomas) e o clima (ERA5, Análise › Exportar) para investigar risco de transmissão e sentinelas ambientais.</p></div>` : ''}
    <details class="fold" open><summary>Avaliação preliminar de risco <small>critério B da IUCN</small></summary><div class="fold-body">
      <div class="kv"><span>Extensão de ocorrência (EOO)</span><span>${fmt(s.eoo, 0)} km²</span><span>Área de ocupação (AOO)</span><span>${fmt(s.aoo, 0)} km²</span>
        <span>Categoria pelos limiares de área</span><span>${badge(cb.slice(0, 2))} ${cb}</span></div>
      <p class="muted">Considera só os limiares de área. Para uma avaliação real faltam os subcritérios: (a) fragmentação severa ou poucas localidades, (b) declínio contínuo e (c) flutuações extremas. “No Brasil” gera uma avaliação regional.</p></div></details>
    <details class="fold" open><summary>Proteção em Unidades de Conservação <small>CNUC/MMA · registros no Brasil</small></summary><div class="fold-body">${!s.uc ? '<p class="muted">Calculando…</p>' : !s.uc.n ? '<p class="muted">Nenhum registro no Brasil.</p>' : `
      <div class="kv"><span>Registros no Brasil</span><span>${s.uc.n}</span><span>Em Proteção Integral</span><span>${s.uc.pi} (${pct(s.uc.pi, s.uc.n)})</span><span>Em Uso Sustentável</span><span>${s.uc.us} (${pct(s.uc.us, s.uc.n)})</span>
        <span>Fora de UC</span><span>${s.uc.n - s.uc.pi - s.uc.us} (${pct(s.uc.n - s.uc.pi - s.uc.us, s.uc.n)})</span><span>Área de ocupação protegida</span><span>${fmt(s.uc.aooIn, 0)} de ${fmt(s.uc.aooBR, 0)} km² (${pct(s.uc.aooIn, s.uc.aooBR)})</span></div>`}</div></details>
    <details class="fold"><summary>Ecorregiões ocupadas <small>WWF / MEOW</small></summary><div class="fold-body">${S.ecoDone ? `<table><tr><th>Ecorregião</th><th>Registros</th></tr>${sortDesc(s.eco).map(([n, c]) => `<tr><td>${esc(n)}</td><td>${c}</td></tr>`).join('')}</table>` : '<p class="muted">Calculando…</p>'}</div></details>
    <details class="fold"><summary>Variáveis geográficas do IUCNN <small>entrada do modelo de rede neural</small></summary><div class="fold-body">
      <table>${Object.entries(s.iucnn).map(([k2, v]) => `<tr><td><code>${k2}</code></td><td>${fmt(v, 3)}</td></tr>`).join('')}</table>
      <p class="muted">Mesmas variáveis de <code>iucnn_geography_features()</code>. O script R de Análise › Exportar treina o modelo e prevê a categoria.</p></div></details>
  </div>`;
}

// ---------- reinos ----------
function openTaxon(name, s2, view = 'mapa', key) { $('sp').value = name; S.pick = key ? {name, key: +key} : null; if (s2) setSrc(s2); showView(view); return run(); }

// ---------- busca ----------
let qT;
async function search() {
  const q = $('q').value.trim(), out = $('qRes');
  if (q.length < 2) return out.innerHTML = '';
  out.innerHTML = '<div class="card muted">Buscando…</div>';
  const r = await getJSON(`${GBIF}/species/search?${qs({q, datasetKey: BACKBONE, status: 'ACCEPTED', rank: $('qRank').value, highertaxonKey: F.king, limit: 24})}`).catch(() => null);
  if (q !== $('q').value.trim()) return;
  let res = r?.results || [];
  if (!res.length) return out.innerHTML = `<div class="card empty">${ti('mood-empty')}Nada encontrado para “${esc(q)}”.</div>`;
  const counts = await pool(res, 6, t => getJSON(`${GBIF}/occurrence/search?${qs({taxonKey: t.key, country: $('qBR').checked ? 'BR' : '', limit: 0})}`).then(x => x.count));
  res = res.map((t, i) => ({...t, n: counts[i] ?? 0})).filter(t => !$('qBR').checked || t.n > 0).sort((a, b) => b.n - a.n);
  if (q !== $('q').value.trim()) return;
  out.innerHTML = res.map(t => {
    const pt = [...new Set((t.vernacularNames || []).filter(v => v.language === 'por').map(v => v.vernacularName.toLowerCase()))].slice(0, 3), k = KBY[t.kingdom], oh = ohNotes(t).length;
    return `<div class="card res"><div class="muted" style="display:flex;gap:6px;align-items:center">${tx(t)}${esc(k?.pt || t.kingdom || '')} · ${esc((t.rank || '').toLowerCase())}${oh ? ` · <span class="tag">${ti('heartbeat')} One Health</span>` : ''}</div>
      <div><i style="font-size:17px;font-weight:700;color:var(--e900)">${esc(t.canonicalName || t.scientificName)}</i> <span class="muted">${esc(t.authorship || '')}</span></div>
      ${pt.length ? `<div>${pt.map(n => `<span class="tag">${esc(n)}</span>`).join('')}</div>` : ''}
      <div class="muted">${esc([t.phylum, t.class, t.order, t.family].filter(Boolean).join(' › '))}</div>
      <div class="muted"><b style="color:var(--e700)">${fmt(t.n, 0)}</b> registros ${$('qBR').checked ? 'no Brasil' : 'no mundo'}</div>
      <div class="acts"><button class="btn" data-sp="${esc(t.canonicalName)}">${ti('map-pin')} Ver no mapa</button>
        <button class="btn soft" data-st="${esc(t.canonicalName)}">${ti('chart-dots')} Painel</button></div></div>`;
  }).join('') || `<div class="card empty">${ti('mood-empty')}Nenhum resultado com registros no Brasil. Desmarque o filtro para ver todos.</div>`;
  out.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => openTaxon(b.dataset.sp, 'gbif'));
  out.querySelectorAll('[data-st]').forEach(b => b.onclick = () => openTaxon(b.dataset.st, 'gbif', 'stats'));
}
$('q').oninput = () => { clearTimeout(qT); qT = setTimeout(search, 350); };
$('qRank').onchange = $('qBR').onchange = search;

// ---------- Explorar: o que vive aqui, busca por nome, dados ambientais, reinos ----------
function xShow(x) {
  S.xtab = x;
  $$('#xtabs [data-x]').forEach(b => b.classList.toggle('on', b.dataset.x === x));
  $$('.xpane').forEach(p => p.classList.toggle('on', p.dataset.x === x));
  if (x === 'lugar') { hTiles(); here(); } else if (x === 'dados') renderDados(); else if (x === 'clima') window.renderClima?.(); else setTimeout(() => $('q').focus(), 50);
}
$$('#xtabs [data-x]').forEach(b => b.onclick = () => xShow(b.dataset.x));
$('hArea').onchange = $('hThr').onchange = () => { hTiles(); here(); };
$('hFind').oninput = () => hFilter();
const spInfoC = new Map();
function spInfo(key) { // nome, grupo, nomes populares e categoria IUCN de uma espécie do GBIF (em cache)
  if (!spInfoC.has(key)) spInfoC.set(key, Promise.all([
    getJSON(`${GBIF}/species/${key}`).catch(() => ({})),
    getJSON(`${GBIF}/species/${key}/vernacularNames?limit=60`).then(r => r.results).catch(() => []),
    getJSON(`${GBIF}/species/${key}/iucnRedListCategory`).then(r => r.code).catch(() => null)])
    .then(([sp, vn, cat]) => ({key, sci: sp.canonicalName || sp.scientificName || String(key), kingdom: sp.kingdom, phylum: sp.phylum, class: sp.class, order: sp.order, family: sp.family, cat,
      pt: [...new Set(vn.filter(v => ['por', 'pt'].includes(v.language)).map(v => v.vernacularName.toLowerCase()))].slice(0, 2)})));
  return spInfoC.get(key);
}
// ---------- Explorar · Espécies por grupo (grupos e ícones em grupos.js) ----------
const hBase = () => { const a = $('hArea').value; return {country: a === 'br' ? 'BR' : '', geometry: a === 'view' ? viewWKT() : '',
  iucnRedListCategory: $('hThr').checked ? ['CR', 'EN', 'VU'] : '', hasCoordinate: true, occurrenceStatus: 'PRESENT'}; };
const hAreaTxt = () => ({view: 'na área do mapa', br: 'no Brasil', world: 'no mundo'})[$('hArea').value];
function hTiles() { // grade de grupos com ícone; as contagens chegam depois, uma consulta leve por grupo
  const tile = g => `<button class="${H.grp === g.id ? 'on' : ''}" data-g="${g.id}" title="${esc(g.pt)}">${gi(g.ic)}<span>${esc(g.pt)}</span><small id="hc_${g.id}">${H.cnt[g.id] != null ? fmtK(H.cnt[g.id]) : ''}</small></button>`;
  const all = `<button class="${H.grp ? '' : 'on'}" data-g="">${gi('pata')}<span>Todos os grupos</span><small></small></button>`;
  $('hGrp').innerHTML = GROUPS.map((s, i) => `<div class="gsec"><h5>${esc(s.n)}</h5><div class="gtiles">${i ? '' : all}${s.gs.map(tile).join('')}</div></div>`).join('');
  $$('#hGrp [data-g]').forEach(b => b.onclick = () => { H.grp = b.dataset.g; $$('#hGrp [data-g]').forEach(x => x.classList.toggle('on', x === b)); here(); $('hRes').closest('.card').scrollIntoView({behavior: 'smooth', block: 'start'}); });
  const key = qs(hBase()); if (H.cKey === key) return;
  H.cKey = key; H.cnt = {};
  pool(GROUPS.flatMap(s => s.gs), 6, async g => {
    const n = await getJSON(`${GBIF}/occurrence/search?${qs({...hBase(), taxonKey: g.keys, limit: 0})}`).then(r => r.count).catch(() => null);
    if (H.cKey !== key || n == null) return;
    H.cnt[g.id] = n; const e = $('hc_' + g.id); if (e) { e.textContent = fmtK(n); e.closest('button').classList.toggle('zero', !n); }
  });
}
const fmtK = n => n >= 1e6 ? fmt(n / 1e6, 1) + ' mi' : n >= 1e3 ? fmt(n / 1e3, n >= 1e4 ? 0 : 1) + ' mil' : fmt(n, 0);
async function here(more) {
  const out = $('hRes'), g = GBYID[H.grp], p = {...hBase(), taxonKey: g?.keys || ''}, key = qs(p);
  if (!more && H.key === key) return;
  if (!more) { H.key = key; H.rows = []; H.total = null; }
  const off = H.rows.length, k = g && g.keys.length === 1 && KINGDOMS.find(x => x.key === g.keys[0]);
  if (!more) out.innerHTML = `<div class="muted"><span class="spin"></span> Contando as espécies ${hAreaTxt()}…</div>`;
  else $('hMore').innerHTML = '<span class="spin"></span> Carregando…';
  const r = await getJSON(`${GBIF}/occurrence/search?${qs({...p, limit: 0, facet: 'speciesKey', facetLimit: 30, facetOffset: off})}`).catch(() => null), counts = r?.facets?.[0]?.counts || [];
  if (H.key !== key) return;
  H.total = r?.count ?? H.total;
  if (!r) { if (more) $('hMore').innerHTML = `${ti('refresh')} O GBIF não respondeu; tentar de novo`; else { H.key = ''; out.innerHTML = `<div class="empty">${ti('cloud-off')}O GBIF não respondeu. <button class="btn soft" id="hRetry">${ti('refresh')} Tentar de novo</button></div>`; $('hRetry').onclick = () => here(); } return; }
  if (!counts.length && !off) return out.innerHTML = `<div class="empty">${ti('mood-empty')}Nenhuma espécie registrada aqui com esses filtros. Afaste o mapa, escolha o Brasil ou outro grupo.</div>`;
  const sp = await pool(counts, 8, c => spInfo(c.name));
  if (H.key !== key) return;
  H.rows.push(...counts.map((c, i) => ({...(sp[i] || {sci: c.name, key: c.name}), n: c.count})));
  H.more = counts.length === 30;
  const max = H.rows[0]?.n || 1, gbifUrl = 'https://www.gbif.org/occurrence/taxonomy?' + qs({taxon_key: p.taxonKey, country: p.country, geometry: p.geometry, iucn_red_list_category: p.iucnRedListCategory, has_coordinate: true, occurrence_status: 'present'});
  out.innerHTML = `<div class="sl-head"><span class="sl-ic">${gi(g?.ic || 'pata')}</span><div><h2>${esc(g?.pt || 'Todos os grupos')} <span class="muted">${hAreaTxt()}</span></h2>
      <p class="muted">${fmt(H.total || 0, 0)} registros · ${fmt(H.rows.length, 0)} espécies listadas, das que têm mais registros${$('hThr').checked ? ' · só ameaçadas' : ''}</p></div>
      <div class="sl-acts"><button class="btn soft" id="hCsv">${ti('file-spreadsheet')} Baixar CSV</button><a class="btn soft" target="_blank" rel="noopener" href="${esc(gbifUrl)}">${ti('external-link')} Lista completa no GBIF</a></div></div>
    ${k ? `<p class="sl-desc">${esc(k.txt)}</p>` : ''}
    <ol class="sl">${H.rows.map((s, i) => `<li data-f="${esc(slug([s.sci, ...(s.pt || []), s.family, s.order, s.class].join(' ')))}"><span class="sl-n">${i + 1}</span>${tx(s)}
      <div class="sl-nm"><i>${esc(s.sci)}</i> ${s.cat ? badge(s.cat) : ''}<small>${esc([s.pt?.join(', '), s.family].filter(Boolean).join(' · ') || s.kingdom || '')}</small></div>
      <div class="sl-bar" title="${fmt(s.n, 0)} registros"><i style="width:${(Math.sqrt(s.n / max) * 100).toFixed(1)}%"></i><span>${fmt(s.n, 0)}</span></div>
      <div class="sl-act"><button class="icon-btn" data-sp="${esc(s.sci)}" data-k="${s.key || ''}" title="Ver no mapa">${ti('map-pin')}</button><button class="icon-btn" data-st="${esc(s.sci)}" data-k="${s.key || ''}" title="Abrir no painel">${ti('chart-dots')}</button></div></li>`).join('')}</ol>
    ${H.more ? `<button class="btn soft sl-more" id="hMore">${ti('chevrons-down')} Mostrar mais 30 espécies</button>` : ''}`;
  out.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => openTaxon(b.dataset.sp, null, 'mapa', b.dataset.k));
  out.querySelectorAll('[data-st]').forEach(b => b.onclick = () => openTaxon(b.dataset.st, null, 'stats', b.dataset.k));
  $('hMore')?.addEventListener('click', () => here(true));
  $('hCsv').onclick = () => download(`especies_${g?.id || 'todos'}_${$('hArea').value}.csv`, toCSV(['posicao', 'nome_cientifico', 'nomes_populares', 'familia', 'ordem', 'classe', 'reino', 'iucn', 'registros', 'gbif_species_key', 'grupo', 'area'],
    H.rows.map((s, i) => [i + 1, s.sci, s.pt?.join('|'), s.family, s.order, s.class, s.kingdom, s.cat, s.n, s.key, g?.pt || 'Todos', hAreaTxt()])), 'text/csv');
  hFilter();
  // fotos da Wikipédia depois, sem segurar a lista
  const boxes = [...out.querySelectorAll('.sl .tx')];
  pool(H.rows, 4, async (s, i) => { const w = s && await wikiSummary(s.sci); if (w?.thumbnail && H.key === key && boxes[i]) boxes[i].innerHTML = `<img src="${esc(w.thumbnail.source)}" alt="" loading="lazy">`; });
}
function hFilter() { const q = slug($('hFind').value.trim()); $$('#hRes .sl li').forEach(li => li.hidden = !!q && !li.dataset.f.includes(q)); }
// CSV genérico: cabeçalho + linhas (aspas quando preciso)
const toCSV = (head, rows) => [head, ...rows].map(r => r.map(v => v == null ? '' : /[",\n;]/.test(v = String(v)) ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n');
const D = {cat: '', list: null};
const DCAT_IC = {Brasil: 'flag', Biologia: 'dna-2', 'Saúde': 'heartbeat', 'Geografia e SIG': 'map-2', 'Clima e tempo': 'cloud', Agricultura: 'plant', 'Ciências da Terra': 'mountain', 'Séries temporais': 'chart-line'};
async function renderDados() {
  $('thCat').innerHTML = Object.entries(GRP).filter(([g]) => Object.values(THEMES).some(t => t.g === g))
    .map(([g, n]) => `<h5>${esc(n)}</h5>` + Object.keys(THEMES).filter(k => THEMES[k].g === g).map(thItem).join('')).join('');
  $$('#thCat [data-t]').forEach(b => b.onclick = () => { showView('mapa'); setTheme(b.dataset.t); setFly(THEMES[b.dataset.t].g); });
  D.list ||= await getJSON('data/catalogo.json').catch(() => []);
  const q = slug($('dq').value), cats = countBy(D.list, x => x.c);
  $('dCats').innerHTML = [['', D.list.length], ...Object.entries(cats)].map(([c, n]) => `<button data-c="${esc(c)}" class="${c === D.cat ? 'on' : ''}">${ti(DCAT_IC[c] || 'database')} ${esc(c || 'Todas')} <small>${n}</small></button>`).join('');
  $$('#dCats [data-c]').forEach(b => b.onclick = () => { D.cat = b.dataset.c; renderDados(); });
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const res = D.list.filter(x => (!D.cat || x.c === D.cat) && (!q || slug(x.n + ' ' + x.d + ' ' + x.c).includes(q)));
  $('dRes').innerHTML = res.map(x => `<a class="ds" href="${esc(x.u)}" target="_blank" rel="noopener"><span class="tx">${ti(DCAT_IC[x.c] || 'database')}</span><b>${esc(x.n)}</b><span>${esc(x.d)}</span><small>${esc(x.c)} · ${esc(host(x.u))} ${ti('external-link')}</small></a>`).join('')
    || `<p class="muted">Nada no catálogo para “${esc($('dq').value)}”.</p>`;
}
$('dq').oninput = () => renderDados();

// ---------- Painel: ambiente do local (sempre) ----------
const EV = {key: '', data: null};
const envPt = () => S.envPt || {lat: map.getCenter().lat, lng: map.getCenter().wrap().lng, auto: 1};
function envCard() {
  const p = envPt();
  return `<div class="card"><h3>${ti('world-pin')} Ambiente ${p.auto ? 'no centro do mapa' : 'no ponto escolhido'} <span class="sub">${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}${p.auto ? '' : ' · <a href="#" id="envReset">usar o centro do mapa</a>'}</span></h3>
    <div class="envnow" id="envNow"><span class="muted"><span class="spin"></span> Consultando o Open-Meteo…</span></div>
    <div class="envgrid"><div><canvas id="cEnvAir" height="170"></canvas></div><div id="envSea"><canvas id="cEnvSea" height="170"></canvas></div></div>
    ${howto('Temperatura máxima e mínima e chuva por dia, da semana passada à próxima (Open-Meteo, melhor modelo disponível). No mar: altura das ondas, temperatura da superfície e velocidade da corrente, de hora em hora (Open-Meteo Marine). Para outro local, clique no mapa e use “Ambiente deste ponto no Painel”.')}</div>`;
}
async function envLoad() {
  const p = envPt(), key = p.lat.toFixed(2) + ',' + p.lng.toFixed(2);
  $('envReset')?.addEventListener('click', e => { e.preventDefault(); S.envPt = null; renderView(); });
  if (EV.key === key && EV.data) return envDraw();
  EV.key = key; EV.data = null;
  const c = {latitude: p.lat.toFixed(3), longitude: p.lng.toFixed(3), timezone: 'auto'};
  const [air, sea] = await Promise.all([
    getJSON(`https://api.open-meteo.com/v1/forecast?${qs({...c, current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', past_days: 7, forecast_days: 7})}`).catch(() => null),
    getJSON(`https://marine-api.open-meteo.com/v1/marine?${qs({...c, hourly: 'wave_height,sea_surface_temperature,ocean_current_velocity', past_days: 2, forecast_days: 5})}`).catch(() => null)]);
  if (EV.key !== key) return;
  EV.data = {air, sea: sea?.hourly?.wave_height?.some(v => v != null) ? sea : null};
  if (S.view === 'stats') envDraw();
}
function envDraw() {
  if (!$('envNow') || !EV.data) return;
  const {air, sea} = EV.data, n = air?.current;
  const utc = (j, t) => Date.parse(t + 'Z') - (j.utc_offset_seconds || 0) * 1000, si = sea ? sea.hourly.time.findIndex(t => utc(sea, t) >= Date.now() - 18e5) : -1;
  $('envNow').innerHTML = !n ? '<span class="muted">O Open-Meteo não respondeu.</span>' : [['temperature', `${fmt(n.temperature_2m)} °C`], ['temperature-sun', `sensação ${fmt(n.apparent_temperature)} °C`],
    ['droplet-half-2', `umidade ${fmt(n.relative_humidity_2m, 0)}%`], ['wind', `vento ${fmt(n.wind_speed_10m, 0)} km/h`], ['cloud-rain', `chuva agora ${fmt(n.precipitation)} mm`],
    ...(sea && si >= 0 ? [['wave-sine', `ondas ${fmt(sea.hourly.wave_height[si])} m`], ['temperature-plus', `mar ${fmt(sea.hourly.sea_surface_temperature[si])} °C`], ['ripple', `corrente ${fmt(sea.hourly.ocean_current_velocity[si])} km/h`]] : [])]
    .map(([i, t]) => `<span>${ti(i)} ${t}</span>`).join('');
  if (air?.daily) {
    const dl = air.daily;
    chart('cEnvAir', {data: {labels: dl.time.map((t, i) => i === 7 ? 'hoje' : t.slice(8, 10) + '/' + t.slice(5, 7)), datasets: [
      {type: 'line', label: 'máxima (°C)', data: dl.temperature_2m_max, borderColor: '#e04a3a', backgroundColor: '#e04a3a', pointRadius: dl.time.map((_, i) => i === 7 ? 5 : 2), yAxisID: 'y'},
      {type: 'line', label: 'mínima (°C)', data: dl.temperature_2m_min, borderColor: '#3f7fd6', backgroundColor: '#3f7fd6', pointRadius: dl.time.map((_, i) => i === 7 ? 5 : 2), yAxisID: 'y'},
      {type: 'bar', label: 'chuva (mm)', data: dl.precipitation_sum, backgroundColor: 'rgba(63,169,201,.45)', yAxisID: 'y2'}]},
      options: {interaction: {mode: 'index', intersect: false}, plugins: {title: {display: true, text: 'Ar: 7 dias atrás → 7 dias à frente'}},
        scales: {x: {grid: {display: false}}, y: {title: {display: true, text: '°C'}}, y2: {position: 'right', grid: {display: false}, beginAtZero: true, title: {display: true, text: 'mm'}}}}});
  }
  if (!sea) $('envSea').innerHTML = `<div class="empty muted">${ti('ripple')}Ponto em terra: sem dados do oceano aqui. Clique no mar e use “Ambiente deste ponto no Painel”.</div>`;
  else {
    const h = sea.hourly;
    chart('cEnvSea', {type: 'line', data: {labels: h.time.map(t => t.slice(8, 10) + '/' + t.slice(5, 7) + ' ' + t.slice(11, 13) + 'h'), datasets: [
      {label: 'ondas (m)', data: h.wave_height, borderColor: '#1f5fbf', backgroundColor: 'rgba(31,95,191,.12)', fill: true, pointRadius: 0, yAxisID: 'y'},
      {label: 'corrente (km/h)', data: h.ocean_current_velocity, borderColor: '#2277ff', pointRadius: 0, yAxisID: 'y'},
      {label: 'temperatura do mar (°C)', data: h.sea_surface_temperature, borderColor: '#f29a38', pointRadius: 0, yAxisID: 'y2'}]},
      options: {interaction: {mode: 'index', intersect: false}, plugins: {title: {display: true, text: 'Mar: 2 dias atrás → 5 dias à frente'}},
        scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 8}}, y: {beginAtZero: true, title: {display: true, text: 'm · km/h'}}, y2: {position: 'right', grid: {display: false}, title: {display: true, text: '°C'}}}}});
  }
}

// ---------- perguntas ----------
// cada pergunta só aparece quando os dados sustentam o padrão (limiares explícitos) e diz em quantos dados se baseia
const force = n => n >= 300 ? ['forte', 'f3'] : n >= 60 ? ['moderada', 'f2'] : ['fraca', 'f1'];
function questions(s) {
  const q = [], sp = `<i>${esc(S.taxon.name)}</i>`, a = $('area').value, area = AREAS[a].label, lc = S.lc, air = S.air, part = S.part;
  const add = (o, n) => q.push({...o, n});
  const t = s.latTrend;
  if (t && Math.abs(t.r) > .15 && s.nYears >= 10 && s.yr[1] - s.yr[0] >= 15)
    add({t: `A distribuição de ${sp} está se deslocando ${t.slope > 0 ? 'em direção aos polos' : 'em direção ao equador'}?`,
      e: `a latitude dos registros muda ${fmt(Math.abs(t.slope) * 10 * 111, 0)} km por década (r = ${fmt(t.r, 2)}, ${s.nYears} anos com registro).`,
      m: 'modelo misto |latitude| ~ ano + (1 | conjunto de dados), para separar mudança real de mudança no esforço de coleta; comparar com a tendência regional de temperatura (ERA5).'}, t.n);
  if (s.cum.length > 10) {
    const c = s.cum, last = c[c.length - 1], tenAgo = c[Math.max(0, c.length - 11)];
    if (last && (last - tenAgo) / last > .3)
      add({t: `A distribuição conhecida de ${sp} ainda está subestimada?`, e: `${pct(last - tenAgo, last)} da área de ocupação foi registrada só nos últimos 10 anos.`,
        m: 'curvas de acumulação e estimadores de cobertura amostral; modelos de distribuição para prever áreas ainda não amostradas e priorizar expedições.'}, s.recs.length);
  }
  const st = s.sstTrend;
  if (st && Math.abs(st.r) > .15)
    add({t: `${sp} está sendo registrada em águas cada vez mais ${st.slope > 0 ? 'quentes' : 'frias'}?`,
      e: `a temperatura nos pontos de ocorrência muda ${fmt(st.slope * 10, 2)} °C por década (r = ${fmt(st.r, 2)}).`,
      m: 'comparar, ano a ano, a temperatura dos pontos com a de pontos aleatórios da mesma área (background), separando aquecimento do ambiente de rastreamento térmico.'}, st.n);
  const sst = s.env('sst');
  if (sst.length >= 30)
    add({t: `Qual é o nicho térmico de ${sp} no mar e quanto do seu habitat ${area} já está perto do limite superior?`,
      e: `90% dos registros estão em águas entre ${fmt(quantile(sst, .05))} e ${fmt(quantile(sst, .95))} °C (temperatura da superfície do mar no local).`,
      m: 'modelo de distribuição (MaxEnt ou GLM) com temperatura, salinidade e batimetria, projetado para cenários climáticos SSP.'}, sst.length);
  else if (air?.n >= 15)
    add({t: `Em que faixa de temperatura do ar ${sp} é registrada, e quão perto do limite está o clima da região?`,
      e: `nos ${air.n} registros consultados no ERA5, 90% foram feitos com temperatura média do dia entre ${fmt(quantile(air.t, .05))} e ${fmt(quantile(air.t, .95))} °C.`,
      m: 'extrair o ERA5 de todos os registros (script de Análise › Exportar) e comparar com o clima de pontos aleatórios da área (background); GLM da ocorrência por temperatura e chuva, com projeção para cenários SSP.'}, air.n);
  const eco = Object.keys(s.eco).length;
  if (S.ecoDone && eco > 1)
    add({t: `O nicho de ${sp} difere entre as ${eco} ecorregiões onde ocorre?`, e: `a ecorregião principal concentra ${pct(sortDesc(s.eco)[0][1], s.recs.length)} dos registros.`,
      m: 'comparar nichos entre ecorregiões (ecospat: sobreposição D de Schoener e testes de equivalência) e checar se a ecorregião dominante é só a mais amostrada.'}, s.recs.length);
  if (lc?.land >= 5 && lc.nat0 / lc.land0 - lc.nat1 / lc.land >= .1)
    add({t: `A perda de vegetação nativa nos locais onde ${sp} ocorre ameaça a persistência da espécie?`,
      e: `nos ${lc.land} locais em terra amostrados, a vegetação nativa caiu de ${pct(lc.nat0, lc.land0)} (${lc.years[0]}) para ${pct(lc.nat1, lc.land)} (${lc.years[lc.years.length - 1]}).`,
      m: 'relacionar presença ou abundância com a proporção de vegetação nativa num raio de 1–5 km (MapBiomas, Earth Engine) em vários anos; modelos de ocupação dinâmicos.'}, lc.land);
  if (lc?.land >= 5 && lc.nat1 / lc.land < .5) // só locais em terra: água e "sem dado" não contam como paisagem modificada
    add({t: `${sp} tolera paisagens modificadas pelo uso humano?`, e: `${pct(lc.land - lc.nat1, lc.land)} dos locais de ocorrência em terra estão hoje em uso agropecuário, área urbana ou outra classe não nativa.`,
      m: 'comparar a frequência de registros por classe de cobertura com a disponibilidade de cada classe na área (índices de seleção de Manly ou Jacobs).'}, lc.land);
  for (const o of ohRules(S.taxon)) add({oh: true, t: 'One Health: ' + o.q(sp), e: o.n, m: o.m}, s.recs.length);
  const top = sortDesc(s.ds)[0]?.[1] / s.recs.length;
  if (top > .5) add({t: `O padrão observado reflete a biologia de ${sp} ou o esforço de um único programa de coleta?`, e: `${pct(top, 1)} dos registros vêm de um único conjunto de dados.`, m: 'subamostragem espacial (thinning) e repetir as análises sem o conjunto dominante.'}, s.recs.length);
  const pb = catB(s.eoo, s.aoo), cat = s.cat;
  if (cat && pb !== 'LC/NT' && !['CR', 'EN', 'VU', 'EX', 'EW'].includes(cat) && s.uni.length >= 10)
    add({t: `${sp} pode estar mais ameaçada ${a === 'world' ? '' : area + ' '}do que indica sua categoria atual (${cat})?`,
      e: `a extensão (${fmt(s.eoo, 0)} km²) e a área de ocupação (${fmt(s.aoo, 0)} km²) ${a === 'world' ? '' : 'regionais '}levam a ${pb} pelo critério B${part ? '; atenção: amostra parcial, a área real é maior' : ''}.`,
      m: 'avaliação regional segundo as diretrizes da IUCN e o IUCNN com clima e pegada humana; comparar com a ficha do SALVE/ICMBio.'}, s.uni.length);
  if (s.uc?.n >= 5)
    add({t: `A rede de Unidades de Conservação protege bem ${sp}${['CR', 'EN', 'VU'].includes(cat) ? ` (${cat})` : ''}? Onde estão as lacunas?`,
      e: `dos ${s.uc.n} registros no Brasil, ${pct(s.uc.pi + s.uc.us, s.uc.n)} estão em UCs e ${pct(s.uc.pi, s.uc.n)} em Proteção Integral; ${pct(s.uc.aooIn, s.uc.aooBR)} da área de ocupação no país está protegida.`,
      m: 'análise de lacunas (gap analysis) contra a meta de 30% de Kunming-Montreal; priorização espacial com prioritizr ou Marxan usando as Áreas Prioritárias do MMA.'}, s.uc.n);
  const months = Array.from({length: 12}, (_, i) => s.byMonth[i + 1] || 0), nm = months.reduce((x, y) => x + y, 0), mm = nm / 12;
  if (nm >= 30 && Math.max(...months) > 2.5 * mm)
    add({t: `Existe um pico sazonal de ocorrência de ${sp}? Ele está ligado à reprodução ou à migração?`,
      e: `${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][months.indexOf(Math.max(...months))]} tem ${fmt(Math.max(...months) / mm, 1)} vezes a média mensal de registros.`,
      m: 'estatística circular (teste de Rayleigh) e comparação com o esforço amostral mensal de outras espécies do mesmo grupo.'}, nm);
  if (s.bad / S.recs.length > .05) add({t: 'Os erros de georreferenciamento mudam as conclusões?', e: `${pct(s.bad, S.recs.length)} dos registros têm alertas de qualidade.`, m: 'análise de sensibilidade: repetir tudo com e sem os registros problemáticos (opção no painel).'}, S.recs.length);
  return q.length ? q : [{t: 'Ainda há poucos dados para gerar hipóteses', e: `${s.recs.length} registros.`, m: 'amplie a área ou o período, troque a fonte para GBIF ou suba o nível taxonômico.', n: s.recs.length}];
}
function renderQuestions(el, s) {
  const pend = [!s.uc && 'Unidades de Conservação', !S.ecoDone && 'ecorregiões', S.lc === 'loading' && 'MapBiomas', S.air === 'loading' && 'clima ERA5'].filter(Boolean);
  el.innerHTML = `<div class="wrap"><div class="card hero"><h2>Perguntas científicas</h2>
    <p class="lead">Geradas a partir dos padrões nos dados carregados (${fmt(s.recs.length, 0)} registros depois dos filtros), incluindo a perspectiva One Health quando o grupo tem relevância sanitária. Cada pergunta só aparece quando o padrão passa de um limiar mínimo; a força indica quantos dados a sustentam. São pontos de partida: verifique o viés de amostragem antes de testar.</p>
    ${pend.length ? `<p class="lead"><span class="spin"></span> Ainda calculando: ${pend.join(', ')}. Novas perguntas podem aparecer.</p>` : ''}
    ${S.part ? `<p class="lead"><i class="bi bi-exclamation-triangle"></i> Amostra parcial: ${fmt(S.recs.length, 0)} de ${fmt(S.total, 0)} registros.</p>` : ''}
    <button class="btn" id="cpAI" style="background:var(--lime);color:var(--e900)"><i class="bi bi-clipboard"></i> Copiar resumo dos dados para usar com uma IA</button></div>
    ${questions(s).map((q, i) => { const [fl, fc] = force(q.n); return `<div class="q ${q.oh ? 'oh' : ''}"><h3>${i + 1}. ${q.t}</h3><p><b>O que os dados mostram:</b> ${q.e}</p><p><b>Como testar:</b> ${q.m}</p>
      <span class="force ${fc}" title="Baseada em ${fmt(q.n, 0)} dados">evidência ${fl} · n = ${fmt(q.n, 0)}</span></div>`; }).join('')}</div>`;
  $('cpAI').onclick = () => navigator.clipboard.writeText(aiPrompt(s)).then(() => toast('Resumo copiado.'), () => prompt('Copie:', aiPrompt(s)));
}
function aiPrompt(s) {
  const lc = S.lc;
  return `Sou pesquisador(a) e analisei dados de ocorrência do ${S.recSrc.toUpperCase()} numa abordagem One Health.
Táxon: ${S.taxon.name} (${[S.taxon.kingdom, S.taxon.phylum, S.taxon.order, S.taxon.family].filter(Boolean).join(' › ')}) | Área: ${AREAS[$('area').value].label} | Período: ${s.yr.join('-')}
Registros: ${s.recs.length} (total na fonte ${S.total}); locais distintos ${s.uni.length}; conjuntos de dados ${Object.keys(s.ds).length}
IUCN: ${s.cat || 'n/d'}; EOO ${fmt(s.eoo, 0)} km²; AOO ${fmt(s.aoo, 0)} km²; critério B preliminar: ${catB(s.eoo, s.aoo)}
Ecorregiões ocupadas: ${sortDesc(s.eco).slice(0, 5).map(([n, c]) => `${n} (${c})`).join('; ') || 'n/d'}
${S.recSrc === 'obis' ? `Temperatura do mar (5-95%): ${fmt(quantile(s.env('sst'), .05))}-${fmt(quantile(s.env('sst'), .95))} °C; profundidade mediana ${fmt(quantile(s.env('bathymetry'), .5), 0)} m\n` : ''}Tendência de latitude: ${s.latTrend ? fmt(s.latTrend.slope * 1110, 0) + ' km/década (r=' + fmt(s.latTrend.r, 2) + ')' : 'n/d'}
UCs (registros no Brasil: ${s.uc?.n ?? 'n/d'}): ${s.uc?.n ? `${s.uc.pi} em Proteção Integral, ${s.uc.us} em Uso Sustentável, ${s.uc.n - s.uc.pi - s.uc.us} fora` : 'n/d'}
MapBiomas (amostra de ${lc?.land || 0} locais em terra): vegetação nativa ${lc?.land ? `${pct(lc.nat0, lc.land0)} em ${lc.years[0]} → ${pct(lc.nat1, lc.land)} em ${lc.years[lc.years.length - 1]}` : 'n/d'}
Clima do ar no dia do registro (ERA5, ${S.air?.n || 0} registros): ${S.air?.n ? `temperatura 5-95% ${fmt(quantile(S.air.t, .05))}-${fmt(quantile(S.air.t, .95))} °C, chuva mediana ${fmt(quantile(S.air.p, .5))} mm` : 'n/d'}${S.part ? `\nATENÇÃO: amostra parcial (${S.recs.length} de ${S.total} registros), na ordem da fonte` : ''}
Relevância One Health: ${ohNotes(S.taxon).join(' ') || 'não identificada automaticamente'}
Alertas de qualidade: ${JSON.stringify(s.flags)}; duplicatas ${s.dups}
Proponha 5 perguntas científicas testáveis (inclua ao menos uma na perspectiva One Health), com hipótese, variáveis, método estatístico e possíveis vieses dos dados.`;
}

// ---------- exportação ----------
function renderExport(el) {
  el.innerHTML = `<div class="wrap">
    <div class="card hero"><h2>Exportar</h2><p class="lead">Leve a consulta atual para análise completa no R, no Google Earth Engine e no Copernicus (ERA5).</p>
      <div class="acts"><button class="btn" id="csv" style="background:#fff;color:var(--e700)"><i class="bi bi-filetype-csv"></i> Registros em CSV (${used().length.toLocaleString('pt-BR')})</button>
        <button class="btn" id="gjPts" style="background:rgba(255,255,255,.14);color:#fff"><i class="ti ti-map-pin"></i> Pontos em GeoJSON</button></div></div>
    <div class="card grp"><h3>${ti('table-options')} Agrupar e baixar</h3>
      <p class="muted">Resuma os registros filtrados numa tabela: escolha uma ou duas colunas para agrupar. Cada linha traz registros, espécies distintas, locais distintos (células de ~1 km) e o primeiro e o último ano. Agrupando por célula, o GeoJSON sai como grade pronta para o QGIS.</p>
      <div class="grp-f"><label>Agrupar por <select id="gA">${gOpts('eco')}</select></label><label>e depois por <select id="gB"><option value="">— nada —</option>${gOpts('')}</select></label></div>
      <div id="gOut"></div></div>
    <details class="fold" open><summary>Script R <small>${S.recSrc === 'obis' ? 'robis + obistools' : 'rgbif + CoordinateCleaner'} + IUCNN + sf + ecorregiões</small></summary><div class="fold-body">
      <button class="btn soft" id="rs"><i class="bi bi-download"></i> Baixar analise.R</button><pre>${esc(rScript())}</pre></div></details>
    <details class="fold"><summary>Clima · Copernicus ERA5 <small>Python + CDS API (Windows)</small></summary><div class="fold-body">
      <button class="btn soft" id="era"><i class="bi bi-download"></i> Baixar clima_era5.py</button><pre>${esc(era5Script())}</pre></div></details>
    <details class="fold"><summary>Script Google Earth Engine <small>MapBiomas, no estilo do user-toolkit</small></summary><div class="fold-body">
      <button class="btn soft" id="gee"><i class="bi bi-download"></i> Baixar mapbiomas_pontos.js</button><pre>${esc(geeScript())}</pre></div></details>
    <details class="fold"><summary>Consulta na API</summary><div class="fold-body"><pre>${esc(apiUrl())}</pre></div></details></div>`;
  $('csv').onclick = downloadCSV; $('rs').onclick = () => download('analise.R', rScript(), 'text/plain');
  $('gjPts').onclick = () => download('ocorrencias.geojson', JSON.stringify({type: 'FeatureCollection', features: used().map(r => ({type: 'Feature', geometry: {type: 'Point', coordinates: [r.lon, r.lat]},
    properties: Object.fromEntries(COLS.filter(c => !['lon', 'lat'].includes(c)).map(c => [c, c === 'ecoregion' ? ecoName(r._eco || r._meco) : c === 'biome' ? GDIM.biome[1](r) : r[c] ?? null]))}))}), 'application/geo+json');
  $('gA').onchange = $('gB').onchange = groupDraw; groupDraw();
  $('gee').onclick = () => download('mapbiomas_pontos.js', geeScript(), 'text/javascript');
  $('era').onclick = () => download('clima_era5.py', era5Script(), 'text/x-python');
}
// ---------- agrupar registros (Exportar) ----------
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const cellK = (r, s) => r.lat == null ? null : `${(Math.floor(r.lat / s) * s).toFixed(s < 1 ? 1 : 0)}; ${(Math.floor(r.lon / s) * s).toFixed(s < 1 ? 1 : 0)}`;
const GDIM = { // nome, valor do registro, ordem natural (senão: mais registros primeiro)
  eco: ['Ecorregião', r => ecoName(r._eco || r._meco)], biome: ['Bioma (WWF) ou província marinha', r => r._eco ? BIOMES[r._eco.BIOME]?.[0] : r._meco?.PROVINCE],
  uc: ['Situação em UC', r => UCLBL[ucIdx(r)]], year: ['Ano', r => r.year, 1], dec: ['Década', r => r.year ? Math.floor(r.year / 10) * 10 + 's' : null, 1],
  month: ['Mês', r => r.month ? String(r.month).padStart(2, '0') + ' ' + MES[r.month - 1] : null, 1], sci: ['Espécie', r => r.sci], family: ['Família', r => r.family],
  ds: ['Conjunto de dados', r => r.dataset], basis: ['Tipo de registro', r => r.basis], c1: ['Célula de 1°', r => cellK(r, 1)], c01: ['Célula de 0,1°', r => cellK(r, .1)]};
const gOpts = sel => Object.entries(GDIM).map(([k, [n]]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${n}</option>`).join('');
function groupRows() {
  const a = $('gA').value, b = $('gB').value, fa = GDIM[a][1], fb = b && GDIM[b][1], g = new Map();
  for (const r of used()) {
    const ka = fa(r) ?? '(sem dado)', kb = fb ? fb(r) ?? '(sem dado)' : '', k = ka + '' + kb;
    let x = g.get(k); if (!x) g.set(k, x = {a: ka, b: kb, n: 0, sp: new Set(), loc: new Set(), y0: Infinity, y1: -Infinity});
    x.n++; if (r.sci) x.sp.add(r.sci); x.loc.add(Math.round(r.lat * 100) + ',' + Math.round(r.lon * 100));
    if (r.year) { x.y0 = Math.min(x.y0, r.year); x.y1 = Math.max(x.y1, r.year); }
  }
  const nat = GDIM[a][2], rows = [...g.values()].map(x => ({...x, sp: x.sp.size, loc: x.loc.size, y0: isFinite(x.y0) ? x.y0 : '', y1: isFinite(x.y1) ? x.y1 : ''}));
  return rows.sort((p, q) => nat ? String(p.a).localeCompare(String(q.a), 'pt', {numeric: true}) || q.n - p.n : q.n - p.n || String(p.b).localeCompare(String(q.b), 'pt', {numeric: true}));
}
function groupDraw() {
  const a = $('gA').value, b = $('gB').value, rows = groupRows(), mx = Math.max(...rows.map(r => r.n), 1), cell = {c1: 1, c01: .1}[a];
  const head = [GDIM[a][0], ...(b ? [GDIM[b][0]] : []), 'registros', 'espécies', 'locais', 'primeiro ano', 'último ano'];
  const data = rows.map(r => [r.a, ...(b ? [r.b] : []), r.n, r.sp, r.loc, r.y0, r.y1]);
  $('gOut').innerHTML = `<div class="cl-wrap"><table class="cl grp-t"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 40).map(r => `<tr><td>${esc(r.a)}</td>${b ? `<td>${esc(r.b)}</td>` : ''}
      <td><span class="rbar" style="--w:${(r.n / mx * 100).toFixed(0)}%">${fmt(r.n, 0)}</span></td><td>${fmt(r.sp, 0)}</td><td>${fmt(r.loc, 0)}</td><td>${r.y0}</td><td>${r.y1}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted">${fmt(rows.length, 0)} grupos${rows.length > 40 ? ' · a tabela mostra os 40 primeiros; os arquivos levam todos' : ''}.</p>
    <div class="acts"><button class="btn soft" id="gCsv">${ti('file-spreadsheet')} Tabela em CSV</button><button class="btn soft" id="gJson">${ti('braces')} JSON</button>${cell ? `<button class="btn soft" id="gGeo">${ti('grid-dots')} Grade em GeoJSON</button>` : ''}</div>`;
  const name = `agrupado_${a}${b ? '_' + b : ''}`;
  $('gCsv').onclick = () => download(name + '.csv', toCSV(head, data), 'text/csv');
  $('gJson').onclick = () => download(name + '.json', JSON.stringify(data.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))), null, 1), 'application/json');
  if (cell) $('gGeo').onclick = () => download(name + '.geojson', JSON.stringify({type: 'FeatureCollection', features: rows.filter(r => r.a !== '(sem dado)').map(r => {
    const [y, x] = r.a.split('; ').map(Number);
    return {type: 'Feature', geometry: {type: 'Polygon', coordinates: [[[x, y], [x + cell, y], [x + cell, y + cell], [x, y + cell], [x, y]]]}, properties: {celula: r.a, ...(b ? {[GDIM[b][0]]: r.b} : {}), registros: r.n, especies: r.sp, locais: r.loc, primeiro_ano: r.y0, ultimo_ano: r.y1}};
  })}), 'application/geo+json');
}
const apiUrl = () => S.recSrc === 'obis' ? `${OBIS}/occurrence?${qs({scientificname: S.taxon.name, ...S.params})}` : `${GBIF}/occurrence/search?${qs({taxonKey: S.taxon.key, ...S.params})}`;
const COLS = ['id', 'sci', 'lon', 'lat', 'date', 'year', 'month', 'depth', 'sst', 'sss', 'bathymetry', 'shoredistance', 'flags', 'basis', 'unc', 'dataset', 'kingdom', 'family', '_uc', 'ecoregion', 'biome'];
function downloadCSV() {
  const e = v => v == null ? '' : /[",\n]/.test(v = Array.isArray(v) ? v.join('|') : String(v)) ? `"${v.replace(/"/g, '""')}"` : v;
  const row = r => ({...r, ecoregion: ecoName(r._eco || r._meco), biome: r._eco ? BIOMES[r._eco.BIOME]?.[0] : r._meco?.PROVINCE});
  download('ocorrencias.csv', [COLS.join(','), ...used().map(r => { const x = row(r); return COLS.map(c => e(x[c])).join(','); })].join('\n'), 'text/csv');
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function rScript() {
  const p = S.params, t = S.taxon, today = new Date().toISOString().slice(0, 10), ob = S.recSrc === 'obis';
  const get = ob
    ? `library(robis); library(obistools)
occ <- occurrence(${[`scientificname = "${t.name}"`, p.areaid && `areaid = ${p.areaid}`, p.geometry && `geometry = "${p.geometry}"`, p.startdate && `startdate = "${p.startdate}"`, p.enddate && `enddate = "${p.enddate}"`].filter(Boolean).join(', ')})

# Controle de qualidade (obistools)
report(occ)
terra <- check_onland(occ, report = TRUE)
prof  <- check_depth(occ, report = TRUE)
occ <- occ[!(seq_len(nrow(occ)) %in% c(terra$row, prof$row)), ]
occ <- bind_cols(occ, lookup_xy(occ, shoredistance = TRUE, grids = TRUE))  # temperatura, salinidade, batimetria`
    : `library(rgbif); library(CoordinateCleaner)
occ <- occ_search(${[`taxonKey = ${t.key}`, p.country && `country = "${p.country}"`, p.geometry && `geometry = "${p.geometry}"`, p.year && `year = "${p.year}"`].filter(Boolean).join(', ')}, hasCoordinate = TRUE, limit = 100000)$data
# Para artigos, prefira occ_download() (gera DOI citável)

# Controle de qualidade
occ <- clean_coordinates(occ, lon = "decimalLongitude", lat = "decimalLatitude", species = "species",
                         tests = c("capitals", "centroids", "equal", "gbif", "institutions", "zeros"), value = "clean")`;
  return `# Gerado pelo One Health BioGeo em ${today}
# install.packages(c("${ob ? 'robis' : 'rgbif", "CoordinateCleaner'}", "dplyr", "sf", "remotes"))
# remotes::install_github("${ob ? 'iobis/obistools' : 'ropensci/CoordinateCleaner'}"); remotes::install_github("IUCNN/IUCNN")
library(dplyr); library(sf); sf_use_s2(FALSE)

# 1. Ocorrências de ${t.name}
${get}
pts <- st_as_sf(occ, coords = c("decimalLongitude", "decimalLatitude"), crs = 4326, remove = FALSE)

# 2. Ecorregiões e riqueza (fluxo do PhenoFish/gbif-ecoregions)
teow <- st_read("data/wwf_terr_ecos.shp")          # zip oficial do WWF (TEOW)
meow <- st_read("vendor/gbif-ecoregions/data/MEOW/meow_ecos.shp")
pts$ecoregiao <- teow$ECO_NAME[sapply(st_intersects(pts, teow), \\(i) i[1])]
pts$eco_marinha <- meow$ECOREGION[sapply(st_intersects(pts, meow), \\(i) i[1])]
riqueza <- pts %>% st_drop_geometry() %>% group_by(ecoregiao) %>% summarise(registros = n(), especies = n_distinct(${ob ? 'scientificName' : 'species'}))

# 3. Variáveis e predição de categoria IUCN (IUCNN)
library(IUCNN)
x <- occ %>% transmute(species = "${t.name}", decimallongitude = decimalLongitude, decimallatitude = decimalLatitude)
feat <- iucnn_prepare_features(x, type = c("geographic", "biomes", "climate", "humanfootprint"))
# data("training_occ"); data("training_labels")
# feat_tr <- iucnn_prepare_features(training_occ); lab <- iucnn_prepare_labels(training_labels, feat_tr)
# m <- iucnn_train_model(feat_tr, lab); iucnn_predict_status(feat, m)

# 4. Sobreposição com Unidades de Conservação (CNUC/MMA)
uc <- st_read("WFS:https://geoservicos.inde.gov.br/geoserver/MMA/ows", "MMA:cnuc_2026_03")  # download completo, demora
table(st_join(st_transform(pts, st_crs(uc)), uc[, c("nome_uc", "grupo")])$grupo, useNA = "ifany")

# 5. Teste de exemplo: deslocamento latitudinal
summary(lm(abs(decimalLatitude) ~ ${ob ? 'date_year' : 'year'}, data = occ))
`;
}
function era5Script() {
  const r = used(), lons = r.map(x => x.lon), lats = r.map(x => x.lat), ys = r.map(x => x.year).filter(Boolean);
  const N = Math.min(90, Math.ceil(Math.max(...lats) + .5)), S0 = Math.max(-90, Math.floor(Math.min(...lats) - .5)), W = Math.max(-180, Math.floor(Math.min(...lons) - .5)), E = Math.min(180, Math.ceil(Math.max(...lons) + .5));
  const y0 = Math.max(1940, ys.length ? Math.min(...ys) : 1991), y1 = Math.min(new Date().getFullYear() - 1, ys.length ? Math.max(...ys) : 2020);
  return `# Gerado pelo One Health BioGeo — clima ERA5 nos locais de ocorrência de ${S.taxon.name}
#
# Instalação no Windows (Prompt de Comando):
#   1. Crie conta em https://cds.climate.copernicus.eu e faça login
#   2. Copie seu token em https://cds.climate.copernicus.eu/how-to-api
#   3. Crie o arquivo %USERPROFILE%\\.cdsapirc (ex.: C:\\Users\\<voce>\\.cdsapirc) com duas linhas:
#        url: https://cds.climate.copernicus.eu/api
#        key: <SEU-TOKEN>
#   4. pip install cdsapi xarray netCDF4 pandas
#   5. Aceite a licença do conjunto "ERA5 monthly averaged data on single levels from 1940 to present"
#      (botão "Accept terms" no fim do formulário de download do dataset)
#   6. Coloque o ocorrencias.csv (Análise › Exportar) na mesma pasta e rode:  python clima_era5.py
import cdsapi, xarray as xr, pandas as pd

AREA = [${N}, ${W}, ${S0}, ${E}]  # norte, oeste, sul, leste (caixa dos registros + 0,5°)
ANOS = [str(a) for a in range(${y0}, ${y1} + 1)]

cdsapi.Client().retrieve('reanalysis-era5-single-levels-monthly-means', {
    'product_type': ['monthly_averaged_reanalysis'],
    'variable': ['2m_temperature', 'total_precipitation'],
    'year': ANOS, 'month': [f'{m:02d}' for m in range(1, 13)], 'time': ['00:00'],
    'area': AREA, 'data_format': 'netcdf', 'download_format': 'unarchived',
}, 'era5_mensal.nc')

ds = xr.open_dataset('era5_mensal.nc')
t = 'valid_time' if 'valid_time' in ds.dims else 'time'
occ = pd.read_csv('ocorrencias.csv')
lat = xr.DataArray(occ['lat'].values, dims='p'); lon = xr.DataArray(occ['lon'].values, dims='p')
ponto = dict(latitude=lat, longitude=lon, method='nearest')

# Climatologia do período (resolução ERA5: 0,25° ≈ 28 km)
occ['t2m_media_C'] = (ds['t2m'].mean(t) - 273.15).sel(**ponto).values
occ['precip_mm_ano'] = (ds['tp'].mean(t) * 365.25 * 1000).sel(**ponto).values  # tp mensal = m/dia

# Clima no mês do registro (quando ano e mês existem)
ym = pd.to_datetime(dict(year=occ['year'], month=occ['month'].fillna(1), day=1), errors='coerce')
mes = ds.sel(**{t: xr.DataArray(ym.values, dims='p')}, method='nearest').sel(**ponto)
occ['t2m_mes_C'] = (mes['t2m'] - 273.15).values
occ['precip_mes_mm'] = (mes['tp'] * 1000 * 30.4).values
occ.loc[occ['month'].isna() | ~occ['year'].between(${y0}, ${y1}), ['t2m_mes_C', 'precip_mes_mm']] = None

occ.to_csv('ocorrencias_era5.csv', index=False)
print(occ[['t2m_media_C', 'precip_mm_ano', 't2m_mes_C', 'precip_mes_mm']].describe())
`;
}
function geeScript() {
  const uni = [...new Map(used().map(r => [r.lon.toFixed(5) + ',' + r.lat.toFixed(5), r])).values()].slice(0, 2000);
  return `// Gerado pelo One Health BioGeo — cole no Code Editor do Google Earth Engine
// Classe MapBiomas (1985–2023) ao redor de cada local de ocorrência de ${S.taxon.name}
// Asset público usado no mapbiomas-brazil/user-toolkit (Coleção 9; troque pela coleção mais recente quando publicada)
var lulc = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1');

var pontos = ee.FeatureCollection([
${uni.map(r => `  ee.Feature(ee.Geometry.Point([${r.lon.toFixed(5)}, ${r.lat.toFixed(5)}]), {id: '${r.id}', ano: ${r.year || 'null'}})`).join(',\n')}
]);${uni.length === 2000 ? '\n// (limitado aos primeiros 2000 locais distintos)' : ''}

// Classe mais frequente num raio de 1 km (ajuste à escala da espécie)
var amostra = lulc.reduceRegions({collection: pontos.map(function (f) { return f.buffer(1000); }), reducer: ee.Reducer.mode(), scale: 30});

Map.addLayer(lulc.select('classification_2023'), {min: 0, max: 69, palette: require('users/mapbiomas/modules:Palettes.js').get('classification9')}, 'MapBiomas 2023');
Map.addLayer(pontos, {color: 'red'}, 'Ocorrências');
Export.table.toDrive({collection: amostra, description: 'mapbiomas_${S.taxon.name.replace(/\W+/g, '_')}', fileFormat: 'CSV'});
`;
}

// ---------- estado na URL ----------
function writeHash() { if (location.hash !== '#teste') history.replaceState(null, '', '#' + qs({sp: $('sp').value.trim(), src: src(), area: $('area').value, y0: $('y0').value, y1: $('y1').value, th: TH.cur})); }
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1)); for (const k of ['sp', 'src', 'area', 'y0', 'y1']) if (h.has(k)) $(k).value = h.get(k);
  return h.has('th') ? h.get('th') : null;
}

// ---------- início ----------
const th0 = location.hash !== '#teste' ? readHash() : null;
syncSrc(); renderBasemaps(); renderModel(); renderThemeLists(); renderDetails(); renderKChips(); markPreset(); renderFchips(); renderDock();
S.th0p = setTheme(th0 ?? 'temp'); // abre com uma camada ambiental ao vivo, como o zoom.earth
if ($('sp').value.trim()) run(); // sem espécie na URL o mapa abre só com a camada; a busca fica no topo
