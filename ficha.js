// ---------- ficha individual: qualquer organismo, de qualquer lista (mapa, Explorar, busca, Painel, Análise) ----------
// GBIF (táxon, nomes, IUCN, perfis, descrições, fotos, contagens), WoRMS/OBIS (habitat) e Wikipédia. Botões com data-ficha data-n="nome" data-k="chave GBIF".
document.body.insertAdjacentHTML('beforeend', `<dialog id="ficha" class="ficha-dlg"><form method="dialog"><button class="icon-btn close" title="Fechar">${ti('x')}</button></form><div id="fichaBody"></div></dialog>`);
const FC = new Map(); // ficha em cache por nome
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const small = u => u.replace(/\/original\.(jpe?g|png)$/i, '/medium.$1'); // iNaturalist tem versões menores
async function fichaData(name, key) {
  if (!key) key = (await getJSON(`${GBIF}/species/match?${qs({name})}`).catch(() => ({}))).usageKey;
  const n = (q = {}) => key ? getJSON(`${GBIF}/occurrence/search?${qs({taxonKey: key, limit: 0, ...q})}`).catch(() => null) : null;
  const [sp, vern, iucn, desc, wiki, hab, photos, world, br, yrs] = await Promise.all([
    key ? getJSON(`${GBIF}/species/${key}`).catch(() => ({})) : {},
    key ? getJSON(`${GBIF}/species/${key}/vernacularNames?limit=100`).then(r => r.results).catch(() => []) : [],
    key ? getJSON(`${GBIF}/species/${key}/iucnRedListCategory`).catch(() => null) : null,
    key ? getJSON(`${GBIF}/species/${key}/descriptions?limit=60`).then(r => r.results).catch(() => []) : [],
    wikiSummary(name), habitat(name, key),
    key ? getJSON(`${GBIF}/occurrence/search?${qs({taxonKey: key, mediaType: 'StillImage', limit: 12})}`).then(r => r.results).catch(() => []) : [],
    n(), n({country: 'BR'}), n({facet: 'year', facetLimit: 400})]);
  const ys = (yrs?.facets?.[0]?.counts || []).map(c => +c.name);
  const sea = hab.mar ? await getJSON(`${OBIS}/occurrence?${qs({scientificname: name, size: 0})}`).then(r => r.total).catch(() => null) : null;
  const pick = ['biology_ecology', 'description', 'habitat', 'food_feeding', 'breeding', 'distribution', 'conservation'];
  const texts = desc.filter(d => ['por', 'eng', ''].includes(d.language || '') && strip(d.description).length > 60)
    .sort((a, b) => (pick.indexOf(a.type) + 1 || 99) - (pick.indexOf(b.type) + 1 || 99) || (a.language === 'por' ? -1 : 1));
  const seen = new Set(), pics = photos.flatMap(o => (o.media || []).filter(m => m.identifier && /image/i.test(m.type || m.format || 'image')).slice(0, 1).map(m => ({u: small(m.identifier), by: m.rightsHolder || m.creator || o.recordedBy || '', lic: m.license || '', url: `https://www.gbif.org/occurrence/${o.key}`})))
    .filter(p => !seen.has(p.u) && seen.add(p.u)).slice(0, 8);
  return {name: sp.canonicalName || name, key, sp, iucn, wiki, hab, pics, texts: texts.slice(0, 3),
    pt: [...new Set(vern.filter(v => ['por', 'pt'].includes(v.language)).map(v => v.vernacularName.toLowerCase()))].slice(0, 8),
    en: [...new Set(vern.filter(v => v.language === 'eng').map(v => v.vernacularName))].slice(0, 3),
    world: world?.count, br: br?.count, sea, y0: ys.length ? Math.min(...ys) : null, y1: ys.length ? Math.max(...ys) : null};
}
let fMap = null;
async function openFicha(name, key) {
  const dlg = $('ficha'), body = $('fichaBody');
  body.innerHTML = `<p class="muted"><span class="spin"></span> Montando a ficha de <i>${esc(name)}</i>…</p>`;
  if (!dlg.open) dlg.showModal();
  const ck = name + '|' + (key || '');
  if (!FC.has(ck)) FC.set(ck, fichaData(name, key));
  let d; try { d = await FC.get(ck); } catch (e) { FC.delete(ck); body.innerHTML = `<p>Não deu para montar a ficha: ${esc(e.message)}</p>`; return; }
  if (!dlg.open) return;
  const sp = d.sp, w = d.wiki, cat = d.iucn?.code, k = KBY[sp.kingdom], h = d.hab, oh = ohNotes(sp);
  const realms = ['mar', 'doce', 'terra'].filter(x => h[x]);
  const crumb = [k?.pt || sp.kingdom, sp.phylum, sp.class, sp.order, sp.family, sp.genus].filter(Boolean).map(esc).join(' <span>›</span> ');
  const img = d.pics[0]?.u || w?.thumbnail?.source;
  const links = [d.key && [`https://www.gbif.org/species/${d.key}`, 'GBIF'], h.mar && [`https://obis.org/taxon/${encodeURIComponent(d.name)}`, 'OBIS'],
    w && [w.content_urls?.desktop?.page, `Wikipédia (${w.lang})`], [`https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(d.name)}`, 'iNaturalist'],
    d.iucn?.iucnTaxonID && [`https://www.iucnredlist.org/species/${d.iucn.iucnTaxonID}/0`, 'IUCN'], ['https://salve.icmbio.gov.br/#/', 'SALVE / ICMBio']].filter(Boolean);
  body.innerHTML = `<div class="fi-head">
      ${img ? `<img class="fi-img" src="${esc(img)}" alt="${esc(d.name)}" loading="lazy">` : `<div class="fi-img fi-ph">${gi(grpIc(sp))}</div>`}
      <div class="fi-id"><div class="crumbs">${ti(k?.ic || 'dna-2')} ${crumb}</div>
        <h2><i>${esc(d.name)}</i></h2><div class="muted">${esc(sp.authorship || '')} · ${esc((sp.rank || '').toLowerCase())}${sp.taxonomicStatus && sp.taxonomicStatus !== 'ACCEPTED' ? ' · ' + esc(sp.taxonomicStatus.toLowerCase()) : ''}</div>
        ${d.pt.length ? `<div class="fi-tags">${d.pt.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : d.en.length ? `<div class="muted">em inglês: ${esc(d.en.join(', '))}</div>` : ''}
        <div class="fi-facts">
          <div><small>Lista Vermelha (IUCN)</small>${badge(cat)} ${esc(IUCN[cat] || 'sem avaliação')}</div>
          <div><small>Ambiente</small>${realms.length ? realms.map(x => `<span class="realm-tag" style="--c:${REALM[x][2]}">${ti(REALM[x][1])} ${REALM[x][0]}</span>`).join(' ') : '<span class="muted">sem informação</span>'}${h.src ? `<small>fonte: ${h.src}</small>` : ''}</div>
          <div><small>Registros no GBIF</small><b>${d.world != null ? fmt(d.world, 0) : '—'}</b> no mundo · <b>${d.br != null ? fmt(d.br, 0) : '—'}</b> no Brasil${d.sea != null ? `<br><b>${fmt(d.sea, 0)}</b> no OBIS (mar)` : ''}</div>
          <div><small>Período dos registros</small>${d.y0 ? `${d.y0}–${d.y1}` : '—'}</div>
        </div></div></div>
    <div class="fi-grid">
      <div class="fi-txt">
        ${w?.extract ? `<h4>Resumo</h4><p>${esc(w.extract)}</p>` : ''}
        ${d.texts.length ? `<details class="fold" ${w?.extract ? '' : 'open'}><summary>Descrições publicadas no GBIF <small>${d.texts.length} trecho(s), às vezes de listas regionais</small></summary>
          ${d.texts.map(t => `<h4>${esc(DESC_PT[t.type] || t.type || 'Descrição')}</h4><p>${esc(strip(t.description).slice(0, 700))}${strip(t.description).length > 700 ? '…' : ''}</p><div class="src">${esc(t.source || '')}</div>`).join('')}</details>` : ''}
        ${!w?.extract && !d.texts.length ? '<p class="muted">Sem descrição publicada no GBIF nem na Wikipédia. Veja os links abaixo.</p>' : ''}
        ${oh.length ? `<h4>${ti('heartbeat')} Relevância One Health</h4>${oh.map(x => `<p>${esc(x)}</p>`).join('')}` : ''}
      </div>
      <div><h4>Onde já foi registrada <small class="muted">densidade no GBIF</small></h4><div id="fiMap" class="fi-map"></div>
        ${d.pics.length ? `<h4>Fotos de registros</h4><div class="fi-pics">${d.pics.map(p => `<a href="${esc(p.url)}" target="_blank" rel="noopener" title="${esc(p.by)}${p.lic ? ' · ' + esc(p.lic.replace(/^https?:\/\/creativecommons\.org\/licenses\//, 'CC ').replace(/\/$/, '')) : ''}"><img src="${esc(p.u)}" alt="" loading="lazy"></a>`).join('')}</div><div class="src">Fotos dos registros no GBIF; passe o mouse para ver autor e licença.</div>` : ''}
      </div>
    </div>
    <div class="fi-acts">
      <button class="btn" data-go="mapa">${ti('map-pin')} Analisar no mapa</button><button class="btn soft" data-go="stats">${ti('chart-dots')} Painel</button>
      <span class="fi-links">${links.map(([u, n]) => `<a class="btn-out" target="_blank" rel="noopener" href="${esc(u)}">${n} ${ti('external-link')}</a>`).join('')}</span>
    </div>`;
  body.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { dlg.close(); openTaxon(d.name, null, b.dataset.go, d.key); });
  if (fMap) { fMap.remove(); fMap = null; }
  fMap = L.map('fiMap', {zoomControl: false, attributionControl: false, worldCopyJump: true}).setView([-14, -52], 2);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {maxZoom: 10}).addTo(fMap);
  if (d.key) L.tileLayer(`https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?${qs({taxonKey: d.key, bin: 'hex', hexPerTile: 35, style: 'classic.poly'})}`, {opacity: .9}).addTo(fMap);
  setTimeout(() => fMap?.invalidateSize(), 60);
}
const DESC_PT = {biology_ecology: 'Biologia e ecologia', description: 'Descrição', habitat: 'Habitat', food_feeding: 'Alimentação', breeding: 'Reprodução', distribution: 'Distribuição',
  conservation: 'Conservação', activity: 'Atividade', diagnostic_description: 'Diagnose', life_cycle: 'Ciclo de vida', behaviour: 'Comportamento', uses: 'Usos'};
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-ficha]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  openFicha(b.dataset.n, b.dataset.k || null);
}, true);
window.openFicha = openFicha;
