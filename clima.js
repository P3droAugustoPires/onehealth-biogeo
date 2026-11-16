// One Health BioGeo — Explorar · Clima dos lugares: capitais, biomas, ecorregiões e UCs lado a lado (Open-Meteo, várias coordenadas por consulta).
// Polígonos viram um ponto representativo (UC: centro do retângulo envolvente; ecorregião: ponto interno perto do centroide); biomas: média de 4–5 pontos de amostra.
(() => {
  const CAP = [['Brasília', 'DF', -15.794, -47.882, 1], ['Rio Branco', 'AC', -9.975, -67.81], ['Maceió', 'AL', -9.665, -35.735], ['Macapá', 'AP', .034, -51.069],
    ['Manaus', 'AM', -3.119, -60.022], ['Salvador', 'BA', -12.971, -38.511], ['Fortaleza', 'CE', -3.732, -38.527], ['Vitória', 'ES', -20.315, -40.312],
    ['Goiânia', 'GO', -16.686, -49.264], ['São Luís', 'MA', -2.53, -44.303], ['Cuiabá', 'MT', -15.601, -56.097], ['Campo Grande', 'MS', -20.469, -54.62],
    ['Belo Horizonte', 'MG', -19.917, -43.935], ['Belém', 'PA', -1.456, -48.49], ['João Pessoa', 'PB', -7.115, -34.865], ['Curitiba', 'PR', -25.429, -49.271],
    ['Recife', 'PE', -8.048, -34.877], ['Teresina', 'PI', -5.089, -42.802], ['Rio de Janeiro', 'RJ', -22.907, -43.173], ['Natal', 'RN', -5.795, -35.209],
    ['Porto Alegre', 'RS', -30.035, -51.218], ['Porto Velho', 'RO', -8.762, -63.904], ['Boa Vista', 'RR', 2.82, -60.672], ['Florianópolis', 'SC', -27.595, -48.548],
    ['São Paulo', 'SP', -23.551, -46.633], ['Aracaju', 'SE', -10.947, -37.073], ['Palmas', 'TO', -10.184, -48.333]];
  const BIO = [['Amazônia', [[-3.5, -62.5], [-7.5, -55], [-1.5, -52.5], [-9.5, -66], [-4.5, -69]]], ['Cerrado', [[-15.8, -47.9], [-12.5, -46], [-18.5, -50.5], [-10, -48.3], [-17.5, -44.5]]],
    ['Mata Atlântica', [[-24.3, -48.4], [-22.4, -42.5], [-19.5, -40.2], [-27, -49.5], [-15, -39.5]]], ['Caatinga', [[-8.5, -39.5], [-6.5, -37.5], [-10.5, -41], [-7.5, -41.5], [-9, -37]]],
    ['Pampa', [[-30.5, -54.5], [-31.5, -53], [-29.8, -56], [-30.2, -52]]], ['Pantanal', [[-18, -57], [-19, -56.5], [-17, -56.8], [-19.8, -57.2]]]];
  // contorno simplificado do Brasil (lon, lat), só para dizer se o ponto de uma ecorregião cai no país
  const BR = [[-51.6, 4.2], [-50, 1.8], [-48.4, -.8], [-44.5, -2.3], [-41.5, -2.9], [-38.5, -3.7], [-35.2, -5.3], [-34.8, -7.5], [-35.3, -9.5], [-37, -11], [-38.5, -13], [-39, -15.5], [-39.3, -18],
    [-40.3, -20.5], [-41, -22], [-43.2, -23], [-45.5, -23.8], [-48, -25.5], [-48.6, -27.5], [-49.5, -29], [-50.5, -31], [-52.2, -32.5], [-53.4, -33.75], [-55.5, -30.9], [-57.6, -30.2],
    [-55.6, -27.5], [-54.6, -25.5], [-54.3, -24], [-55.4, -23.9], [-55.6, -22.6], [-57.8, -22.1], [-57.7, -19], [-58.2, -17.4], [-60.2, -16.3], [-61.8, -13.5], [-65.4, -10.8],
    [-66.6, -9.9], [-69.5, -11], [-70.6, -11], [-70.5, -9.5], [-72.2, -10], [-73.9, -7.4], [-73, -5], [-69.9, -4.2], [-69.4, -1.2], [-69.9, 1.1], [-66.8, 1.2], [-64, 1.8], [-64.2, 4],
    [-62.9, 4], [-60.7, 5.2], [-59.8, 4.5], [-60, 2], [-59.3, 1.4], [-56.5, 1.9], [-54, 2.2], [-52.9, 2.2], [-51.6, 4.2]];
  const TYPES = {cap: ['building-community', 'Capitais'], bio: ['trees', 'Biomas'], eco: ['map-2', 'Ecorregiões'], uc: ['shield-check', 'Unidades de conservação']};
  const CL = {type: 'cap', cache: {}, sort: 'nome', dir: 1, esf: 'Federal'};
  const inView = (lat, lng) => mapBounds().contains([lat, lng]);
  const mean = a => { const v = a.filter(x => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const sum = a => a.reduce((s, x) => s + (x || 0), 0);

  // ---------- os lugares de cada tipo: [{nome, sub, pts: [[lat, lng]...]}] ----------
  async function places(type, area) {
    if (type === 'cap') return CAP.filter(c => area === 'br' || inView(c[2], c[3])).map(([n, uf, la, lo, fed]) => ({nome: n, sub: `${uf}${fed ? ' · capital federal' : ''}`, pts: [[la, lo]]}));
    if (type === 'bio') return BIO.map(([n, pts]) => ({nome: n, sub: `bioma (IBGE) · média de ${pts.length} pontos`, pts}));
    if (type === 'eco') {
      const fc = await ecoData('teow');
      return fc.features.map(f => ({f, p: ecoPt(f)})).filter(({p}) => p && (area === 'br' ? inRing(p[1], p[0], BR) : inView(...p)))
        .map(({f, p}) => ({nome: ecoName(f.properties), sub: BIOMES[f.properties.BIOME]?.[0] || '', pts: [p], area: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])}))
        .sort((a, b) => b.area - a.area).slice(0, 60);
    }
    // UCs: o geoserviço do MMA devolve o retângulo envolvente de cada UC mesmo sem a geometria (leve)
    CL.ucs ||= getJSON(INDE + 'MMA/ows?' + qs({service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'MMA:cnuc_2026_03', count: 5000, outputFormat: 'application/json',
      propertyName: 'nome_uc,categoria,esfera,uf,ha_total,grupo,cd_cnuc'})).then(j => j.features.filter(f => f.bbox).map(f => {
      const b = f.bbox, lonFirst = b[0] < b[1], [x0, y0, x1, y1] = lonFirst ? b : [b[1], b[0], b[3], b[2]], p = f.properties;
      return {nome: p.nome_uc, sub: [p.categoria, p.esfera, p.uf].filter(Boolean).join(' · '), esf: p.esfera, grupo: p.grupo, ha: +p.ha_total || 0, pts: [[(y0 + y1) / 2, (x0 + x1) / 2]]};
    })).catch(e => { CL.ucs = null; throw e; });
    const all = await CL.ucs;
    return all.filter(u => (CL.esf === 'all' || u.esf === CL.esf) && (area === 'br' || inView(...u.pts[0]))).sort((a, b) => b.ha - a.ha).slice(0, 50);
  }
  function ecoPt(f) { // ponto interno da maior parte da ecorregião, perto do centroide
    const parts = f.geometry.coordinates, big = parts.reduce((m, p) => p[0].length > m[0].length ? p : m, parts[0]), r = big[0];
    let x = 0, y = 0; r.forEach(([a, b]) => { x += a; y += b; }); x /= r.length; y /= r.length;
    if (inPoly(x, y, big)) return [y, x];
    let x0 = 180, y0 = 90, x1 = -180, y1 = -90; r.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); });
    let best = null, bd = Infinity;
    for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const px = x0 + (x1 - x0) * i / 12, py = y0 + (y1 - y0) * j / 12, d = (px - x) ** 2 + (py - y) ** 2; if (d < bd && inPoly(px, py, big)) { bd = d; best = [py, px]; } }
    return best;
  }

  // ---------- clima: uma consulta para até 50 coordenadas ----------
  async function weather(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i += 50) {
      const ch = pts.slice(i, i + 50);
      const url = 'https://api.open-meteo.com/v1/forecast?' + qs({latitude: ch.map(p => p[0].toFixed(3)).join(','), longitude: ch.map(p => p[1].toFixed(3)).join(','), timezone: 'auto',
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', past_days: 30, forecast_days: 7});
      let r;
      for (let k = 0; ; k++) { try { r = [].concat(await getJSON(url)); break; } catch (e) { if (k > 1 || !/429/.test(e.message)) throw e; toast('Limite por minuto da Open-Meteo; tentando de novo em 20 s…'); await new Promise(f => setTimeout(f, 20000)); } }
      out.push(...r);
    }
    return out.map(w => {
      const d = w.daily, c = w.current || {}, i0 = d.time.length - 7;
      return {now: c.temperature_2m, sens: c.apparent_temperature, um: c.relative_humidity_2m, vento: c.wind_speed_10m, t30: mean(d.time.slice(0, i0).map((_, i) => (d.temperature_2m_max[i] + d.temperature_2m_min[i]) / 2)),
        p30: sum(d.precipitation_sum.slice(0, i0)), min7: Math.min(...d.temperature_2m_min.slice(i0).filter(x => x != null)), max7: Math.max(...d.temperature_2m_max.slice(i0).filter(x => x != null)), p7: sum(d.precipitation_sum.slice(i0))};
    });
  }
  async function load(type, area, force) {
    const key = type + area + (type === 'uc' ? CL.esf : '') + (area === 'view' ? mapBounds().toBBoxString() : '');
    if (!force && CL.cache[key]) return CL.cache[key];
    const pl = await places(type, area);
    if (!pl.length) return CL.cache[key] = [];
    const w = await weather(pl.flatMap(p => p.pts));
    let k = 0;
    const rows = pl.map(p => { const ws = p.pts.map(() => w[k++]), m = f => mean(ws.map(x => x[f]));
      return {nome: p.nome, sub: p.sub, lat: mean(p.pts.map(x => x[0])), lng: mean(p.pts.map(x => x[1])), n: p.pts.length,
        now: m('now'), sens: m('sens'), um: m('um'), vento: m('vento'), t30: m('t30'), p30: m('p30'), min7: m('min7'), max7: m('max7'), p7: m('p7')}; });
    return CL.cache[key] = {rows, at: new Date()};
  }

  // ---------- tela ----------
  const COLS = [['nome', 'Lugar'], ['now', 'Agora', '°C'], ['sens', 'Sensação', '°C'], ['um', 'Umidade', '%', 0], ['vento', 'Vento', 'km/h', 0],
    ['t30', 'Média 30 dias', '°C'], ['p30', 'Chuva 30 dias', 'mm', 0], ['max7', 'Próximos 7 dias', '°C'], ['p7', 'Chuva 7 dias', 'mm', 0]];
  const tCol = t => t == null ? 'var(--soft)' : `hsl(${Math.round(225 - Math.max(0, Math.min(1, (t + 5) / 45)) * 225)} 85% ${t > 30 ? 46 : 52}%)`;
  window.renderClima = async function (force) {
    $('clType').innerHTML = Object.entries(TYPES).map(([k, [ic, n]]) => `<button data-c="${k}" class="${k === CL.type ? 'on' : ''}" role="tab" aria-selected="${k === CL.type}">${ti(ic)}<span>${n}</span></button>`).join('');
    $$('#clType [data-c]').forEach(b => b.onclick = () => { CL.type = b.dataset.c; renderClima(); });
    const el = $('clRes'), area = $('clArea').value, type = CL.type;
    el.innerHTML = `<p class="muted"><span class="spin"></span> Consultando o clima ${type === 'uc' ? 'das maiores UCs' : type === 'eco' ? 'das ecorregiões' : ''} ${area === 'br' ? 'do Brasil' : 'da área do mapa'}…</p>`;
    let res;
    try { res = await load(type, area, force); } catch (e) { return el.innerHTML = `<div class="empty">${ti('cloud-off')}Não deu para consultar agora (${esc(e.message)}). <button class="btn soft" id="clRetry">${ti('refresh')} Tentar de novo</button></div>`, $('clRetry').onclick = () => renderClima(true); }
    if (CL.type !== type) return;
    const rows = [...(res.rows || [])];
    if (!rows.length) return el.innerHTML = `<div class="empty">${ti('map-search')}Nenhum lugar deste tipo na área do mapa. Afaste o mapa ou escolha Brasil.</div>`;
    const s = CL.sort, d = CL.dir; rows.sort((a, b) => s === 'nome' ? d * a.nome.localeCompare(b.nome, 'pt') : d * ((b[s] ?? -1e9) - (a[s] ?? -1e9)));
    const lo = Math.min(...rows.map(r => r.min7)), hi = Math.max(...rows.map(r => r.max7)), X = v => ((v - lo) / (hi - lo || 1) * 100).toFixed(1);
    const top = (f, t) => { const r = rows.reduce((m, x) => (x[f] ?? -1e9) > (m[f] ?? -1e9) ? x : m); return `<span>${t} <b>${esc(r.nome)}</b> (${fmt(r[f], f[0] === 'p' ? 0 : 1)}${f[0] === 'p' ? ' mm' : ' °C'})</span>`; };
    el.innerHTML = `<div class="cl-sum">${top('now', 'Mais quente agora:')}${top('p30', 'Mais chuva em 30 dias:')}${top('p7', 'Mais chuva prevista:')}</div>
      <div class="cl-tools">${type === 'uc' ? `<label>Esfera <select id="clEsf">${[['Federal', 'Federais'], ['Estadual', 'Estaduais'], ['Municipal', 'Municipais'], ['all', 'Todas']].map(([v, n]) => `<option value="${v}" ${v === CL.esf ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
        <div class="search-big soft sm"><i class="ti ti-filter"></i><input id="clFind" placeholder="Filtrar lugares…" autocomplete="off"></div>
        <button class="btn soft" id="clCsv">${ti('file-spreadsheet')} CSV</button><button class="btn soft" id="clJson">${ti('braces')} JSON</button><button class="icon-btn" id="clRef" title="Atualizar">${ti('refresh')}</button></div>
      <div class="cl-wrap"><table class="cl"><thead><tr>${COLS.map(([k, n, u]) => `<th data-s="${k}" class="${k === s ? 'on' : ''}" aria-sort="${k === s ? (d > 0 ? 'descending' : 'ascending') : 'none'}">${n}${u ? ` <small>${u}</small>` : ''}${k === s ? ti(d > 0 ? 'arrow-down' : 'arrow-up') : ''}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr data-f="${esc(slug(r.nome + ' ' + r.sub))}"><td><b>${esc(r.nome)}</b><small>${esc(r.sub)}</small></td>
        <td><span class="tchip" style="background:${tCol(r.now)}">${fmt(r.now)}</span></td><td>${fmt(r.sens)}</td><td>${fmt(r.um, 0)}</td><td>${fmt(r.vento, 0)}</td><td>${fmt(r.t30)}</td>
        <td><span class="rbar" style="--w:${Math.min(100, r.p30 / 4).toFixed(0)}%">${fmt(r.p30, 0)}</span></td>
        <td><div class="trange" title="mínima ${fmt(r.min7)} °C · máxima ${fmt(r.max7)} °C"><span>${fmt(r.min7, 0)}</span><i><b style="left:${X(r.min7)}%;right:${100 - X(r.max7)}%"></b></i><span>${fmt(r.max7, 0)}</span></div></td>
        <td><span class="rbar" style="--w:${Math.min(100, r.p7 * 2).toFixed(0)}%">${fmt(r.p7, 0)}</span></td>
        <td class="cl-act"><button class="icon-btn" data-m="${i}" title="Ver no mapa">${ti('map-pin')}</button><button class="icon-btn" data-p="${i}" title="Ambiente deste lugar no Painel">${ti('chart-dots')}</button></td></tr>`).join('')}</tbody></table></div>
      <p class="muted cl-note">${ti('info-circle')} ${type === 'bio' ? 'Biomas: média de pontos de amostra no interior de cada bioma.' : type === 'eco' ? 'Ecorregiões terrestres (WWF): um ponto no interior de cada uma; até as 60 maiores.' : type === 'uc' ? 'UCs (CNUC/MMA): centro do retângulo que envolve cada UC; as 50 maiores da área. Em UCs de formato irregular o ponto pode cair fora delas.' : 'Capitais: o ponto central de cada cidade.'}
        Consulta às ${res.at.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}. Para séries longas ou médias na área, use o script ERA5 em Análise › Exportar.</p>`;
    $$('#clRes th[data-s]').forEach(th => th.onclick = () => { CL.dir = CL.sort === th.dataset.s ? -CL.dir : 1; CL.sort = th.dataset.s; renderClima(); });
    $('clFind').oninput = () => { const q = slug($('clFind').value.trim()); $$('#clRes tbody tr').forEach(tr => tr.hidden = !!q && !tr.dataset.f.includes(q)); };
    $('clEsf') && ($('clEsf').onchange = () => { CL.esf = $('clEsf').value; renderClima(); });
    $('clRef').onclick = () => renderClima(true);
    $$('#clRes [data-m]').forEach(b => b.onclick = () => { const r = rows[b.dataset.m]; showView('mapa'); setTimeout(() => { map.invalidateSize(); map.flyTo([r.lat, r.lng], type === 'cap' ? 10 : 7); }, 60); });
    $$('#clRes [data-p]').forEach(b => b.onclick = () => { const r = rows[b.dataset.p]; S.envPt = {lat: r.lat, lng: r.lng}; showView('stats'); });
    const cols = ['lugar', 'detalhe', 'lat', 'lon', 'n_pontos', 'temp_agora_c', 'sensacao_c', 'umidade_pct', 'vento_kmh', 'temp_media_30d_c', 'chuva_30d_mm', 'min_7d_c', 'max_7d_c', 'chuva_7d_mm'];
    const data = rows.map(r => [r.nome, r.sub, r.lat.toFixed(4), r.lng.toFixed(4), r.n, r.now, r.sens, r.um, r.vento, r.t30?.toFixed(1), r.p30?.toFixed(1), r.min7, r.max7, r.p7?.toFixed(1)]);
    $('clCsv').onclick = () => download(`clima_${type}_${area}.csv`, toCSV(cols, data), 'text/csv');
    $('clJson').onclick = () => download(`clima_${type}_${area}.json`, JSON.stringify({fonte: 'Open-Meteo', consulta: res.at.toISOString(), lugares: data.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])))}, null, 1), 'application/json');
  };
  $('clArea').onchange = () => renderClima();
})();
