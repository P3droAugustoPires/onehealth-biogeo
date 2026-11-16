// One Health BioGeo — ícones de silhueta dos grupos de organismos (SVG próprio, 24×24, cor = currentColor)
// e a lista de grupos usada na listagem de espécies (chaves do backbone do GBIF, conferidas na API).
// Carregado antes do app.js: só define constantes.
const GI = (() => {
  const st = (d, w = 1.6) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const el = (cx, cy, rx, ry, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
  const ci = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  const hole = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const pt = (cx, cy, r, a) => [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)].join(' ');
  // estrela-do-mar: 5 braços arredondados
  const star = (() => { let d = ''; for (let i = 0; i < 10; i++) d += (i ? 'L' : 'M') + pt(12, 12.6, i % 2 ? 3.6 : 9.6, -Math.PI / 2 + i * Math.PI / 5); return `<path d="${d}Z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>`; })();
  // vírus: capsídeo hexagonal com espículas
  const virus = (() => {
    let hex = ''; for (let i = 0; i < 6; i++) hex += (i ? 'L' : 'M') + pt(12, 12, 5.6, Math.PI / 6 + i * Math.PI / 3);
    let sp = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; sp += st(`M${pt(12, 12, 5.4, a)} L${pt(12, 12, 8.6, a)}`, 1.4) + ci(...pt(12, 12, 9.4, a).split(' ').map(Number), 1.3); }
    return `<path fill-rule="evenodd" d="${hex}Z${hole(12, 12, 2)}"/>${sp}`;
  })();
  // samambaia: raque curva com folíolos que diminuem para a ponta
  const fern = (() => {
    let s = st('M12 22 C12 16 12.4 9 15 3', 1.4);
    for (let i = 0; i < 7; i++) {
      const f = i / 6, y = 19.6 - i * 2.55, x = 12 + f * f * 2.6, L = 5.4 - i * .62;
      s += el((x - L / 2 - .2).toFixed(2), (y - .4).toFixed(2), (L / 2).toFixed(2), .95, -22) + el((x + L / 2 + .2).toFixed(2), (y - .4).toFixed(2), (L / 2).toFixed(2), .95, 22);
    }
    return s;
  })();
  // concha de bivalve: leque com costelas (frestas finas)
  const shell = (() => {
    let d = 'M12 20.2L3.2 10.4C4.6 4.6 19.4 4.6 20.8 10.4Z';
    for (const a of [-2.2, -1.88, -1.57, -1.26, -.94]) d += `M12 17.6L${pt(12, 19.4, 11.4, a - .045)}L${pt(12, 19.4, 11.4, a + .045)}Z`;
    return `<path fill-rule="evenodd" d="${d}"/><path d="M9.2 19H14.8L14 21.4H10Z"/>`;
  })();
  return {
    pata: `<path d="M12 12.4c-3 0-5.9 3.3-5.9 5.7 0 1.7 1.3 2.6 2.9 2.6 1.2 0 1.9-.6 3-.6s1.8.6 3 .6c1.6 0 2.9-.9 2.9-2.6 0-2.4-2.9-5.7-5.9-5.7z"/>${el(6.9, 9.7, 1.7, 2.2, -22)}${el(10.1, 6.2, 1.8, 2.4, -8)}${el(13.9, 6.2, 1.8, 2.4, 8)}${el(17.1, 9.7, 1.7, 2.2, 22)}`,
    felino: `<path d="M5.2 9.2C6.5 8.4 8.5 8.2 10.5 8.4L15.2 8.6C15.9 7.6 16.6 6.7 17.4 6.3L17.6 5.1L18.7 5.9C19.7 5.9 20.6 6.5 21.2 7.6C21.6 8.3 21.5 9.1 20.8 9.4C20 9.8 19 9.8 18.4 10.3C18 11 17.8 12 17.7 13L18.6 19.6L17 19.6L16 14.2L15.3 14.4L15.8 19.6L14.3 19.6L13.4 14.6C11.6 14.9 9.8 14.8 8.6 14.4L8 19.6L6.5 19.6L6.6 14.2L6 13.6L5 19.6L3.6 19.6L4.4 12.8C4.2 11.8 4.4 10.4 5.2 9.2Z"/>${st('M5.4 9.6C3.2 10 2.4 12 2.6 14.2C2.7 15.4 2.2 16.4 1.6 16.8', 1.5)}`,
    morcego: `<path d="M12 7.6L12.9 5.9L13.4 8C15 7 18 6 22.2 5.6C20.7 7 20.4 9 20.6 11.2C19.1 10.1 17.6 10.3 16.6 11.6C15.6 10.8 14.1 11.2 13.2 12.7L12 15.4L10.8 12.7C9.9 11.2 8.4 10.8 7.4 11.6C6.4 10.3 4.9 10.1 3.4 11.2C3.6 9 3.3 7 1.8 5.6C6 6 9 7 10.6 8L11.1 5.9Z"/>`,
    primata: `${ci(9, 5.6, 2.8)}${ci(6.1, 5.4, 1.1)}<path d="M6.8 9.2C4.4 11 4.3 16 5.8 18.6L13.6 18.6C14.6 16.2 13.8 11.2 11.2 9.2Z"/><path d="M5.9 18.4L5 21.2L8.3 21.2L8.2 18.4ZM11.4 18.4L12.4 21.2L15.6 21.2L13.6 18.4Z"/>${st('M10.4 11.4C12.2 13.4 14 13.6 15.4 12.4', 1.6)}${st('M13.4 17.6C18 18.8 21.4 15.4 19.8 11.6C19 9.8 17 10.4 17.6 12.2', 1.5)}`,
    roedor: `<path d="M3.6 16.4C3.6 11.6 7.6 8.6 12.3 8.6C15.4 8.6 17.5 10 18.8 11.8L21.6 13.2C22 14 21.4 14.8 20.4 15L18.6 15.4C17.6 16.5 15.2 17 12 17Z"/>${ci(15.8, 9, 2)}<path d="M8.4 16.6h2l-.3 1.8H8.2zM14 16.6h2l.2 1.8h-2.3z"/>${st('M4 15.8C1.8 15.4 1.4 18.2 2.9 19.5C4.4 20.8 7 20.4 9 19.4', 1.2)}`,
    cetaceo: `<path d="M2.4 15.6C5 10 10 7 15.5 7.5C17.5 6 19 5.5 20.6 6C19.9 6.8 19.4 7.6 19.4 8.5C20.8 9.2 21.8 10.4 22 11.6L19.6 11.2C19 12 18 12.4 17 12.4C13 12 9 13.6 6.5 16.6L7.6 19.6L5.2 17.7L1.9 18.3Z"/><path d="M12.6 7.7L14.4 4.4L15.6 7.6Z M13.8 12.3L12.8 15.2L15.6 12.7Z"/>`,
    ave: `<path fill-rule="evenodd" d="M15.6 5C17.6 5 19 6.4 19 8.2L21.6 9L19 9.8C18.6 13.2 16 16 12.4 16.6L9.5 17L4 21L6.6 16.4C4.6 15.4 4.2 13.2 5.2 11.6C7 9.5 10.4 9.4 12.6 8.8C12.6 6.6 13.8 5 15.6 5Z${hole(16.3, 7.7, .85)}"/>${st('M12 16.6L11.4 20.2M14 16.2L14 20.2', 1.2)}`,
    serpente: `${st('M4.6 19.4C1.8 17.4 3 13.6 7 13.6L15.4 13.6C19.6 13.6 19.8 8.6 16 8.6L11.6 8.6', 2.8)}${el(9.4, 8.6, 2.6, 1.9)}${st('M6.9 8.6H5.4M5.4 8.6L4.7 7.9M5.4 8.6L4.7 9.3', .7)}`,
    lagarto: `${el(12, 4.4, 2, 2.6)}${el(12, 10.8, 2.6, 4.6)}${st('M12 15C12 19 14.6 20.2 17.2 21.4', 2.2)}${st('M10 8.4L6.6 6.6L6 4.8M14 8.4L17.4 6.6L18 4.8M10 13.4L6.6 15L6 16.8M14 13.4L17.4 15L18.2 16.8', 1.6)}`,
    tartaruga: `${ci(12, 4.2, 2.1)}${el(6.6, 8.6, 1.4, 2.8, -50)}${el(17.4, 8.6, 1.4, 2.8, 50)}${el(7.4, 17.6, 1.3, 2.3, 40)}${el(16.6, 17.6, 1.3, 2.3, -40)}<path d="M12 18.2L12.9 21.2L11.1 21.2Z"/><path fill-rule="evenodd" d="M12 6.4C16 6.4 18.4 9.2 18.4 12.8C18.4 16.4 16 19 12 19C8 19 5.6 16.4 5.6 12.8C5.6 9.2 8 6.4 12 6.4ZM12 9.6L14.8 11.2L14.8 14.4L12 16L9.2 14.4L9.2 11.2Z M12 10.8L13.7 11.8L13.7 13.8L12 14.8L10.3 13.8L10.3 11.8Z"/>`,
    jacare: `<path d="M12 1.5C13 1.5 13.3 3 13.3 5L13.6 8C15 9 15.2 11 15 13.5C14.8 16 13.5 18 12.8 20L12 22.6L11.2 20C10.5 18 9.2 16 9 13.5C8.8 11 9 9 10.4 8L10.7 5C10.7 3 11 1.5 12 1.5Z"/>${st('M9.8 9.5L7 8L6.2 6.4M14.2 9.5L17 8L17.8 6.4M9.5 14L6.8 15.5L6.3 17.4M14.5 14L17.2 15.5L17.7 17.4', 1.5)}`,
    sapo: `${el(12, 13.4, 4.6, 5.4)}${ci(9.2, 7.6, 2)}${ci(14.8, 7.6, 2)}${st('M8.2 11.6L4.6 10L3.2 11.8M15.8 11.6L19.4 10L20.8 11.8M8.6 17.2L4.6 18.6L4.4 21.4M15.4 17.2L19.4 18.6L19.6 21.4', 1.7)}`,
    peixe: `<path fill-rule="evenodd" d="M1.8 12C4.8 7.2 10.8 6.2 15 8.6L21.4 5L19.8 12L21.4 19L15 15.4C10.8 17.8 4.8 16.8 1.8 12Z${hole(6.4, 11.2, .95)}"/>`,
    tubarao: `<path d="M1.4 13.2C5 10.2 9.8 9.6 12 9.6L14.6 5L15.6 9.9C17.5 10.3 19 10.6 20 10L23 6.4L22 12.4L23 17.2L19.8 14C16 15.6 11 16 7 15L8.6 18.4L5.4 15.4C3.8 14.9 2.4 14.1 1.4 13.2Z"/>`,
    besouro: `${el(12, 14.2, 5, 6.4)}${ci(12, 6.4, 2.4)}${st('M7.6 11L4 9M7 14.4L3.4 14.4M7.6 17.6L4 19.8M16.4 11L20 9M17 14.4L20.6 14.4M16.4 17.6L20 19.8M11 4.6L9.2 2.2M13 4.6L14.8 2.2', 1.3)}`,
    borboleta: `<path d="M11.2 7.2C9 3 3.2 2.2 2.6 5.6C2.2 8.6 5 11 11.2 11.6Z M12.8 7.2C15 3 20.8 2.2 21.4 5.6C21.8 8.6 19 11 12.8 11.6Z M11 12.6C6 12.6 3.6 15 4.5 18C5.5 20.6 9 19.6 11.2 15.2Z M13 12.6C18 12.6 20.4 15 19.5 18C18.5 20.6 15 19.6 12.8 15.2Z"/><rect x="11.3" y="6.4" width="1.4" height="12.4" rx=".7"/>${st('M11.6 6.8L9.6 3M12.4 6.8L14.4 3', .8)}`,
    mosquito: `${el(14.2, 14, 5.4, 1.5, 35)}${ci(8.2, 9.6, 1.6)}${el(13.6, 7.4, 4.2, 1.6, -28)}${st('M7.2 8.6L3.4 4.8', 1)}${st('M10.6 12L6 20.6M12.4 13.2L11.6 21.6M14.4 14.6L19.4 21.4M10 11L3.6 13.6', 1)}`,
    abelha: `${ci(5.6, 13.4, 2.2)}${el(9.4, 13.6, 2.2, 2.6)}${el(12.6, 14.4, 1.3, 3.3)}${el(15.6, 14.4, 1.5, 3.4)}<path d="M17.8 11.2C19.5 12 20.8 13.2 21.6 14.4C20.8 15.6 19.5 16.8 17.8 17.6C18.6 15.9 18.6 12.9 17.8 11.2Z"/>${el(9.4, 7.8, 1.9, 3.8, -18)}${el(12.8, 8.4, 1.7, 3.4, 18)}${st('M4.8 11.4L3.4 8.6M6 11.3L6.2 8.4', .9)}`,
    aranha: `${ci(12, 14.6, 4)}${ci(12, 8.8, 2.4)}${st('M10.4 8L6.4 4.6L3.6 6.4M10 9.6L5 8.6L2.4 11M10.2 10.8L5.4 13L3.6 16.6M10.8 11.6L7.6 16.6L7.4 20.6M13.6 8L17.6 4.6L20.4 6.4M14 9.6L19 8.6L21.6 11M13.8 10.8L18.6 13L20.4 16.6M13.2 11.6L16.4 16.6L16.6 20.6', 1.3)}`,
    carrapato: `<path d="M12 7.4C15.6 7.4 17.4 10.6 17.4 14C17.4 17.8 15 20.6 12 20.6C9 20.6 6.6 17.8 6.6 14C6.6 10.6 8.4 7.4 12 7.4Z"/><path d="M10.4 7.6L11 4.8H13L13.6 7.6Z"/>${st('M7.4 10.6L4 8.6L3 6.2M7 12.6L3.2 12.4L2 10.6M7 14.8L3.4 16L2.6 18.2M7.6 16.8L5 19.6L5.4 21.6M16.6 10.6L20 8.6L21 6.2M17 12.6L20.8 12.4L22 10.6M17 14.8L20.6 16L21.4 18.2M16.4 16.8L19 19.6L18.6 21.6', 1.2)}`,
    escorpiao: `${el(12, 12.6, 2.6, 3.8)}${st('M12 16C12 18.8 12.6 20.6 14.8 20.8C17 21 17.8 18.6 16.4 17.2', 1.8)}<path d="M16.6 16.2L18.6 16.8L16.8 18Z"/>${st('M10.2 9.8L7.4 7.4L6.6 5.2M13.8 9.8L16.6 7.4L17.4 5.2M9.6 12L6.2 12.6M9.6 13.8L6.4 15.6M14.4 12L17.8 12.6M14.4 13.8L17.6 15.6', 1.3)}${el(6.2, 4.2, 1.5, 1.9, -20)}${el(17.8, 4.2, 1.5, 1.9, 20)}`,
    caranguejo: `${el(12, 14, 6.2, 4)}${st('M7.4 11.2L5 7.6M16.6 11.2L19 7.6M6.4 15.6L2.6 17M6.8 17.2L3.6 19.6M17.6 15.6L21.4 17M17.2 17.2L20.4 19.6M10.4 10.4L10 7.6M13.6 10.4L14 7.6', 1.5)}<path d="M5.6 8.2C3 8 2 5.6 3.4 3.8C4 5.4 5.2 5.8 6.4 5.4C6.8 6.6 6.6 7.6 5.6 8.2ZM18.4 8.2C21 8 22 5.6 20.6 3.8C20 5.4 18.8 5.8 17.6 5.4C17.2 6.6 17.4 7.6 18.4 8.2Z"/>${ci(10, 7.2, .9)}${ci(14, 7.2, .9)}`,
    caracol: `<path fill-rule="evenodd" d="M13 4.6A6.4 6.4 0 1 1 13 17.4A6.4 6.4 0 1 1 13 4.6Z${hole(13.4, 11.2, 3.6)}"/>${ci(13.6, 11.4, 1.7)}<path d="M2.6 19.4C2.6 17.4 4.4 16.4 6.6 16.8L19.4 16.8C20.8 16.8 21.8 17.8 21.8 19.4Z"/>${st('M4.4 16.8L3 12.6M5.8 16.8L5.8 12.8', 1.1)}`,
    concha: shell,
    polvo: `<path d="M6.4 11C6.4 4.4 17.6 4.4 17.6 11C17.6 13.6 15 15.2 12 15.2C9 15.2 6.4 13.6 6.4 11Z"/>${st('M8 13.4C6 16 4 16.2 2.8 19M10 14.6C9.4 17.4 8 19.2 6.4 21.2M12 15C12 18 12.2 19.6 11.2 21.8M14 14.6C14.6 17.4 16 19.2 17.6 21.2M16 13.4C18 16 20 16.2 21.2 19', 1.8)}`,
    coral: `${st('M12 21L12 13M12 15.4L8 11.4L8 6M8 9L5 7L5 3.8M12 13L15.6 9.4L15.6 4.4M15.6 8L19 5.6L19 3M12 17.4L17 14.4L19.2 11.2M6.6 21L17.4 21', 2.3)}`,
    aguaviva: `<path d="M3.6 11.6C3.6 6.6 7.4 3.6 12 3.6C16.6 3.6 20.4 6.6 20.4 11.6C17.6 12.8 6.4 12.8 3.6 11.6Z"/>${st('M6.4 12.6C6 15 7.6 16.4 6.6 19M9.6 13.2C9.2 16 10.8 17.6 9.8 21M14.4 13.2C14.8 16 13.2 17.6 14.2 21M17.6 12.6C18 15 16.4 16.4 17.4 19', 1.4)}`,
    estrela: star,
    minhoca: st('M2.6 15.4C5.6 9.2 9 9.2 11 13.2C13 17.2 16.2 17.2 18.2 12.4C19.2 10 21 9.8 21.6 11.2', 3),
    esponja: `<path fill-rule="evenodd" d="M7 21L5.8 9C5.8 6.4 8 4.6 9.6 4.6L14.4 4.6C16 4.6 18.2 6.4 18.2 9L17 21Z M9 6.6C9 7.6 10.4 8 12 8S15 7.6 15 6.6S13.6 5.4 12 5.4S9 5.6 9 6.6Z${hole(9.4, 12.4, 1.1)}${hole(14.2, 11.4, .9)}${hole(11.8, 15.6, 1.2)}${hole(14.8, 17.6, .8)}${hole(9.2, 18, .8)}"/>`,
    folha: `<path fill-rule="evenodd" d="M4 20C4 10.4 10 4 20.2 3.8C20.2 14 14 20 4 20Z M5.4 18.6L16.8 7.2L17.4 7.8L6 19.2Z"/>`,
    flor: `${ci(12, 4.6, 2.4)}${ci(15.5, 7.1, 2.4)}${ci(14.2, 11.2, 2.4)}${ci(9.8, 11.2, 2.4)}${ci(8.5, 7.1, 2.4)}${st('M12 12L12 22', 1.6)}<path d="M12 18.4C9 18.4 7 16.4 6.4 13.8C9.4 13.8 11.4 15.8 12 18.4Z M12 16.4C14.6 16.4 16.4 14.8 17 12.6C14.4 12.6 12.6 14.2 12 16.4Z"/>`,
    capim: st('M12 21.4C12 15 11.4 9 9 3.4M12 21.4C12.4 15.6 14 10 17.6 5.4M12 21.4C10.6 17 7.6 13.6 3.6 11.4M12 21.4C13.6 17.6 16.6 14.8 20.6 13.6M12 21.4C11.4 17.4 9.6 13.4 6.2 7.4M12 21.4C12.8 17.4 13.6 12 13.2 2.6', 1.6),
    palmeira: `${st('M12.6 22C13 17 13 13 11.8 8.8', 2)}<path d="M11.8 8.6C9.4 5.4 5.4 5 2.6 7.2C5.6 7 8.4 7.8 11.8 8.6Z M11.8 8.6C12.6 4.6 16.2 2.6 19.8 3.8C16.8 4.6 14.2 6.2 11.8 8.6Z M11.8 8.6C15.6 7.2 19.6 8.6 21.4 12C18.6 10.4 15.4 9.4 11.8 8.6Z M11.8 8.6C8.2 9 5.2 11.4 4.6 15.2C6.6 12.8 9 10.6 11.8 8.6Z M11.8 8.6C11.2 5.6 9.4 3 6.6 1.8C8.6 3.8 10.4 6 11.8 8.6Z"/>`,
    conifera: `<path d="M12 1.8L17.2 8.4L14.6 8.4L19.2 14L15.8 14L20.4 19.6L3.6 19.6L8.2 14L4.8 14L9.4 8.4L6.8 8.4Z"/><rect x="11" y="19" width="2" height="3.4" rx=".4"/>`,
    samambaia: fern,
    musgo: `<path d="M2.6 20.4C2.6 16.6 5.4 15 7.8 15.8C8.8 13.2 12 12.6 13.6 14.6C15.2 12.6 18.6 13.2 19.2 15.9C21.2 16.2 21.8 18.6 21.4 20.4Z"/>${st('M7.8 15.4L6.8 7.4M13.4 13.6L13.8 5.2M18 14.4L19.4 8.2', 1.1)}${el(6.7, 6.4, .9, 1.5, -8)}${el(13.8, 4.2, .9, 1.5, 4)}${el(19.6, 7.2, .9, 1.5, 14)}`,
    cogumelo: `<path fill-rule="evenodd" d="M2.8 12.2C2.8 6.6 7 2.8 12 2.8C17 2.8 21.2 6.6 21.2 12.2C18 13.4 6 13.4 2.8 12.2Z${hole(8, 8.2, 1.2)}${hole(13.4, 6, 1)}${hole(16.4, 9.4, 1.1)}"/><path d="M9.4 13.4C9.4 16.4 9 19 8.4 21.2L15.6 21.2C15 19 14.6 16.4 14.6 13.4Z"/>`,
    alga: `<path d="M7.6 22C5.4 18 8.4 15 6.4 11C4.8 7.8 6.2 4.8 7.4 2.6C9.6 5.8 9 9 10 12C11 15 9 18 9.6 22Z M12.4 22C11 18.6 13.8 16.2 12.6 12.8C11.6 10.4 12.6 7.6 13.8 5.6C15.6 8.6 15 11 15.8 13.6C16.6 16.4 14.6 19 15 22Z M16.8 22C16.4 19.6 18.4 18 17.8 15.6C17.4 14 18 12 19.2 10.8C20.4 13 20.2 15 20.4 16.8C20.6 18.8 19.2 20.4 19 22Z"/>`,
    ameba: `<path fill-rule="evenodd" d="M5 10C4 6 8 3.4 11 5.4C13 3 17.6 3.4 18 7C21 7.6 21.6 11.6 19 13C20.6 16 18 19.6 14.6 18C13 21 8 21 7.6 17.6C4.6 17.6 3 13.6 5 10Z${hole(12, 11.4, 2.6)}"/>${ci(12, 11.4, 1.2)}`,
    bacteria: `<rect x="3.6" y="8.8" width="13.2" height="6.4" rx="3.2" transform="rotate(-30 10.2 12)"/>${st('M15.8 7.2C17.6 5.4 18.8 8 20.6 6.2C21.6 5.2 22 4 22.6 3', 1.2)}${st('M4.4 16.8C3.6 18.6 5.4 19.6 4.4 21.6', 1.2)}`,
    arqueia: `<path d="M12 4C15 4 16 6 18.5 6.5C20.5 8.5 19.5 11 20 13C20 16 17.5 17.5 16 19C13.5 20.5 10.5 20 8 18.5C5.5 17.5 4 15 4.3 12C4.5 9 5.5 6.5 8.5 5.5C9.5 4.5 10.8 4 12 4Z"/>${st('M6 17.8C4 19 2.4 18.2 1.8 20.2M8.6 19.6C8 21.4 6.2 21.6 6 23', 1.1)}`,
    virus,
  };
})();
const gi = (k, cls = '') => `<svg class="gi ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${GI[k] || GI.pata}</svg>`;

// peixes ósseos não têm classe no backbone do GBIF: usamos as ordens (35 ordens, ~1,3 mi de registros no Brasil)
const FISH = [537, 708, 587, 1165, 547, 538, 588, 590, 772, 495, 498, 1067, 773, 496, 889, 1305, 1306, 1153, 1069, 1106, 497, 549, 1308, 1162, 499, 774, 1104, 1167, 1313, 548, 1103, 1311, 1164, 1068, 888];
// grupos para a listagem: id, nome, chaves de táxon (OR), ícone, seção
const GROUPS = [
  ['vert', 'Vertebrados', [
    ['mam', 'Mamíferos', [359], 'felino'], ['morc', 'Morcegos', [734], 'morcego'], ['prim', 'Primatas', [798], 'primata'], ['roed', 'Roedores', [1459], 'roedor'],
    ['cet', 'Baleias e golfinhos', [733], 'cetaceo'], ['ave', 'Aves', [212], 'ave'], ['squa', 'Serpentes e lagartos', [11592253], 'serpente'],
    ['test', 'Tartarugas e cágados', [11418114], 'tartaruga'], ['croc', 'Jacarés', [11493978], 'jacare'], ['anf', 'Anfíbios', [131], 'sapo'],
    ['peix', 'Peixes ósseos', FISH, 'peixe'], ['elas', 'Tubarões e raias', [121], 'tubarao']]],
  ['inv', 'Invertebrados', [
    ['ins', 'Insetos', [216], 'besouro'], ['lep', 'Borboletas e mariposas', [797], 'borboleta'], ['dip', 'Moscas e mosquitos', [811], 'mosquito'],
    ['hym', 'Abelhas, vespas e formigas', [1457], 'abelha'], ['col', 'Besouros', [1470], 'besouro'], ['ara', 'Aranhas', [1496], 'aranha'],
    ['ixo', 'Carrapatos', [1425], 'carrapato'], ['esc', 'Escorpiões', [872], 'escorpiao'], ['crus', 'Caranguejos e camarões', [229], 'caranguejo'],
    ['gas', 'Caramujos e lesmas', [225], 'caracol'], ['biv', 'Mariscos e ostras', [137], 'concha'], ['cef', 'Polvos e lulas', [136], 'polvo'],
    ['ant', 'Corais e anêmonas', [206], 'coral'], ['cif', 'Águas-vivas', [352], 'aguaviva'], ['equ', 'Estrelas e ouriços', [50], 'estrela'],
    ['ver', 'Vermes', [42, 5967481, 108], 'minhoca'], ['por', 'Esponjas', [105], 'esponja']]],
  ['plan', 'Plantas', [
    ['dic', 'Plantas com flor (eudicotiledôneas)', [220], 'flor'], ['mon', 'Monocotiledôneas', [196], 'capim'], ['palm', 'Palmeiras', [7681], 'palmeira'],
    ['con', 'Coníferas', [194], 'conifera'], ['sam', 'Samambaias', [7228684], 'samambaia'], ['mus', 'Musgos', [35], 'musgo']]],
  ['out', 'Fungos e microrganismos', [
    ['fun', 'Fungos', [5], 'cogumelo'], ['cro', 'Algas e cromistas', [4], 'alga'], ['pro', 'Protozoários', [7], 'ameba'],
    ['bac', 'Bactérias', [3], 'bacteria'], ['arq', 'Arqueias', [2], 'arqueia'], ['vir', 'Vírus', [8], 'virus']]],
].map(([id, n, gs]) => ({id, n, gs: gs.map(([gid, pt, keys, ic]) => ({id: gid, pt, keys, ic}))}));
const GBYID = Object.fromEntries(GROUPS.flatMap(s => s.gs).map(g => [g.id, g]));

// ícone de um táxon a partir da classificação (família → ordem → classe → filo → reino)
const KGI = {Animalia: 'pata', Plantae: 'folha', Fungi: 'cogumelo', Chromista: 'alga', Protozoa: 'ameba', Bacteria: 'bacteria', Archaea: 'arqueia', Viruses: 'virus'};
const TGI = {
  Arecaceae: 'palmeira', Poaceae: 'capim', Culicidae: 'mosquito', Psychodidae: 'mosquito', Apidae: 'abelha', Formicidae: 'abelha', Ixodidae: 'carrapato', Argasidae: 'carrapato',
  Teiidae: 'lagarto', Iguanidae: 'lagarto', Tropiduridae: 'lagarto', Gekkonidae: 'lagarto', Phyllodactylidae: 'lagarto', Scincidae: 'lagarto', Gymnophthalmidae: 'lagarto', Polychrotidae: 'lagarto', Dactyloidae: 'lagarto', Anguidae: 'lagarto', Amphisbaenidae: 'minhoca',
  Chiroptera: 'morcego', Primates: 'primata', Rodentia: 'roedor', Cetacea: 'cetaceo', Lepidoptera: 'borboleta', Diptera: 'mosquito', Hymenoptera: 'abelha', Coleoptera: 'besouro',
  Araneae: 'aranha', Ixodida: 'carrapato', Scorpiones: 'escorpiao', Mammalia: 'felino', Aves: 'ave', Squamata: 'serpente', Testudines: 'tartaruga', Crocodylia: 'jacare',
  Amphibia: 'sapo', Elasmobranchii: 'tubarao', Holocephali: 'tubarao', Insecta: 'besouro', Arachnida: 'aranha', Malacostraca: 'caranguejo', Gastropoda: 'caracol', Bivalvia: 'concha',
  Cephalopoda: 'polvo', Anthozoa: 'coral', Scyphozoa: 'aguaviva', Hydrozoa: 'aguaviva', Cubozoa: 'aguaviva', Echinodermata: 'estrela', Annelida: 'minhoca', Nematoda: 'minhoca',
  Platyhelminthes: 'minhoca', Porifera: 'esponja', Magnoliopsida: 'flor', Liliopsida: 'capim', Pinopsida: 'conifera', Polypodiopsida: 'samambaia', Bryophyta: 'musgo', Marchantiophyta: 'musgo'};
function grpIc(t) {
  if (!t) return 'pata';
  for (const k of [t.family, t.order, t.class, t.phylum]) if (TGI[k]) return TGI[k];
  if (t.phylum === 'Chordata' && !t.class) return 'peixe'; // peixes ósseos (sem classe no backbone)
  return KGI[t.kingdom] || 'pata';
}
