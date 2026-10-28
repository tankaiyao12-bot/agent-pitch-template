/* agent-pitch-template engine.
   Reads the deck from <script type="application/json" id="deck"> (inlined by tools/build.py),
   renders chapters as an auto-played agent conversation, and every chapter's "page" from blocks.
   Playback, pausing and the demo view are carried over from the tradefons pitch (Claude Design). */
(function () {
const DECK = JSON.parse(document.getElementById('deck').textContent);
const root = document.documentElement;
const META = DECK.meta || {}, B = DECK.brand || {};
const LANGS = META.langs && META.langs.length ? META.langs : ['zh'];
let L = META.defaultLang || LANGS[0];
const t = o => o == null ? '' : typeof o === 'string' || typeof o === 'number' ? String(o) : (o[L] ?? o.zh ?? o.en ?? '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = (zh, en) => (L === 'en' ? en : zh);
const N = x => Number(x).toLocaleString('en-US');

/* ---------- theme ---------- */
if (B.accent) root.style.setProperty('--acc', B.accent);
if (B.accentDark) root.style.setProperty('--accd', B.accentDark);
if (B.logo) root.style.setProperty('--logo', `url("${B.logo}")`);
const BRAND = B.name || 'Pitch', AGENT = t(B.agentName) || BRAND + ' agent';
const PAL = ['#0a84d6', '#7a5cf0', '#d6409f', '#e08a00', '#0f9e93', '#4f7a00', '#8e8e93', '#c7c7cc'];
const col = (x, i) => (x && x.color) || PAL[i % PAL.length];

/* ---------- blocks: each chapter page is a list of these ---------- */
const STATUS = { live: { zh: '已上线', en: 'Live' }, main: { zh: '主网', en: 'Mainnet' }, prev: { zh: '预览', en: 'Preview' }, todo: { zh: '待开发', en: 'To build' }, plan: { zh: '规划', en: 'Planned' } };
const BL = {
  title: b => `${b.eyebrow ? `<div class="eb">${t(b.eyebrow)}</div>` : ''}<h2 class="h">${t(b.h)}</h2>${b.lede ? `<p class="lede">${t(b.lede)}</p>` : ''}`,
  text: b => `<p class="lede">${t(b.text)}</p>`,
  tiles: b => `<div class="tiles">${b.items.map(x => {
    const num = typeof x.count === 'number';
    return `<div class="tile${x.hl ? ' hl' : ''}"><small>${t(x.label)}</small><b class="${x.up ? 'up' : ''}">${t(x.prefix)}${num ? `<span data-count="${x.count}">0</span>` : t(x.value)}${t(x.suffix)}</b>${x.note ? `<em>${t(x.note)}</em>` : ''}</div>`;
  }).join('')}</div>`,
  bars: b => {
    const mx = Math.max(...b.items.map(x => +x.value || 0)) || 1;
    return `<div class="hb">${b.items.map(x => `<div class="hbr${x.hl ? ' now' : ''}"><span>${t(x.label)}</span><i><b style="width:${Math.max(1.5, (+x.value || 0) / mx * 100)}%"></b></i><strong>${x.display != null ? t(x.display) : N(x.value)}</strong></div>`).join('')}</div>`;
  },
  columns: b => {
    const it = b.items, mx = Math.max(...it.map(x => x[1])) || 1, W = 560, H = 200, bw = W / it.length, X = i => i * bw + bw / 2, Yb = v => H - v / mx * 150;
    let acc = 0; const cum = it.map(([, n]) => (acc += n)), total = acc, Yl = v => H - v / total * 170;
    const fmt = v => v >= 1e4 ? (v / 1e3).toFixed(1) + 'k' : N(v);
    return `<svg viewBox="0 0 ${W} ${H + 34}" class="chartv" role="img">${it.map(([d, n], i) => `<g><rect x="${X(i) - bw * .3}" y="${Yb(n)}" width="${bw * .6}" height="${H - Yb(n)}" rx="4" fill="${b.color || '#0a84d6'}" opacity="${b.partialLast && i === it.length - 1 ? .4 : .85}"><title>${esc(d)}: ${N(n)}</title></rect><text x="${X(i)}" y="${Yb(n) - 6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#1c1c1e">${fmt(n)}</text><text x="${X(i)}" y="${H + 18}" text-anchor="middle" font-size="10" fill="#8e8e93">${esc(d)}</text></g>`).join('')}
    ${b.cumulative ? `<polyline points="${cum.map((v, i) => X(i) + ',' + Yl(v)).join(' ')}" fill="none" stroke="${B.accentDark || '#4f7a00'}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${X(it.length - 1)}" cy="${Yl(total)}" r="4" fill="${B.accentDark || '#4f7a00'}"/><text x="${X(it.length - 1) - 6}" y="${Yl(total) - 8}" text-anchor="end" font-size="11" font-weight="800" fill="${B.accentDark || '#4f7a00'}">${UI('累计', 'total')} ${N(total)}</text>` : ''}
    <line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="rgba(28,28,30,.15)"/></svg>`;
  },
  donut: b => {
    const items = b.items, tot = items.reduce((s, x) => s + x.value, 0); let a = -Math.PI / 2; const R = 78, r = 50, c = 100;
    const seg = items.map((x, i) => { const da = x.value / tot * Math.PI * 2, a2 = a + da, lg = da > Math.PI ? 1 : 0, p = (rr, an) => [c + rr * Math.cos(an), c + rr * Math.sin(an)]; const [x1, y1] = p(R, a), [x2, y2] = p(R, a2 - .004), [x3, y3] = p(r, a2 - .004), [x4, y4] = p(r, a); a = a2;
      return `<path d="M${x1} ${y1}A${R} ${R} 0 ${lg} 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 ${lg} 0 ${x4} ${y4}Z" fill="${col(x, i)}"><title>${esc(t(x.label))} ${N(x.value)}</title></path>`; }).join('');
    const ce = b.center || {};
    return `<div class="donut"><svg viewBox="0 0 200 200" role="img">${seg}<text x="100" y="98" text-anchor="middle" font-size="22" font-weight="900" fill="#1c1c1e">${ce.value != null ? t(ce.value) : N(tot)}</text><text x="100" y="116" text-anchor="middle" font-size="10" fill="#6e6e73">${t(ce.label)}</text></svg>
    <div class="dleg">${items.map((x, i) => `<div><i style="background:${col(x, i)}"></i><b>${t(x.label)}</b><span>${x.display != null ? t(x.display) : N(x.value)}</span></div>`).join('')}</div></div>`;
  },
  rings: b => {
    /* concentric "position" map: rings outer → inner, the brand at the center, up to 4 chips around it */
    const cx = 200, cy = 200, rs = b.rings || [], step = rs.length > 1 ? 34 : 0, P = [[146, 132], [254, 132], [254, 268], [146, 268]];
    const hl = b.highlight == null ? 'all' : b.highlight, chips = b.chips || [];
    const ring = (x, i) => { const R = 192 - i * step, c = col(x, i === 0 ? 3 : 0); return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${c}" fill-opacity=".05" stroke="${c}" stroke-dasharray="${i === 0 ? '4 6' : ''}"/><text x="${cx}" y="${cy - R + 24}" text-anchor="middle" font-size="12" font-weight="800" fill="${c}">${esc(t(x.label))}</text>${x.sub ? `<text x="${cx}" y="${cy + R - 14}" text-anchor="middle" font-size="10.5" fill="#6e6e73">${esc(t(x.sub))}</text>` : ''}`; };
    const chip = (x, i) => { const [px, py] = P[i], c = col(x, i), on = hl === 'all' || hl === i, sel = hl === i; return `<g opacity="${on ? 1 : .28}"><rect x="${px - 46}" y="${py - 19}" width="92" height="38" rx="10" fill="${sel ? c : '#fff'}" stroke="${c}" stroke-width="${sel ? 2.5 : 1.4}"/><text x="${px}" y="${py - 2}" text-anchor="middle" font-size="11.5" font-weight="800" fill="${sel ? '#fff' : c}">${esc(t(x.label))}</text><text x="${px}" y="${py + 12}" text-anchor="middle" font-size="9" fill="${sel ? '#fff' : '#6e6e73'}">${esc(t(x.sub))}</text></g>`; };
    const arrows = b.flow && chips.length === 4 ? ['M194 132H206', 'M254 153V247', 'M206 268H194', 'M146 247V153'].map((d, i) => `<path d="${d}" fill="none" stroke="${col(chips[i], i)}" stroke-width="2.6" marker-end="url(#rar)" class="flowp"/>`).join('') : '';
    const ce = b.center || { label: BRAND };
    const svg = `<svg viewBox="0 0 400 400" class="ringv" role="img"><defs><marker id="rar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1c1c1e"/></marker></defs>${rs.map(ring).join('')}${arrows}
      <circle cx="${cx}" cy="${cy}" r="40" fill="${B.accent || '#a6f20b'}" fill-opacity=".45" stroke="${B.accentDark || '#4f7a00'}" stroke-width="2"/><text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="13.5" font-weight="900" fill="#1c1c1e">${esc(t(ce.label))}</text><text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="9" fill="#3a3a3c">${esc(t(ce.sub))}</text>${chips.slice(0, 4).map(chip).join('')}</svg>`;
    const leg = b.legend ? `<div class="legend">${b.legend.map((x, i) => `<div><i style="background:${col(x, i)}"></i><div><b>${t(x.label)}</b><p>${t(x.text)}</p></div></div>`).join('')}</div>` : '';
    return leg ? `<div class="ring">${svg}${leg}</div>` : svg;
  },
  kline: b => {
    const R = b.rows, W = 560, top = 12, ph = 170, vh = 46, pm = Math.max(...R.map(r => r[2])) * 1.1, bw = W / R.length, X = i => i * bw + bw / 2, Y = p => top + ph - p / pm * ph, vm = Math.max(...R.map(r => r[5] || 0)) || 1;
    const ticks = [0, pm / 3, pm * 2 / 3, pm], f = v => v === 0 ? '0' : v < .01 ? v.toFixed(5) : v < 1 ? v.toFixed(3) : N(+v.toFixed(2));
    return `<svg viewBox="0 0 ${W} ${top + ph + vh + 40}" class="chartv" role="img">${ticks.map(v => `<line x1="34" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(28,28,30,.07)"/><text x="30" y="${Y(v) + 4}" text-anchor="end" font-size="9.5" fill="#8e8e93">${f(v)}</text>`).join('')}
    ${R.map(([d, o, h, l, c, v], i) => { const up = c >= o, cl = up ? '#0ecb81' : '#f6465d'; return `<g><line x1="${X(i)}" x2="${X(i)}" y1="${Y(h)}" y2="${Y(l)}" stroke="${cl}" stroke-width="1.4"/><rect x="${X(i) - Math.min(12, bw * .3)}" y="${Y(Math.max(o, c))}" width="${Math.min(24, bw * .6)}" height="${Math.max(2, Math.abs(Y(o) - Y(c)))}" fill="${cl}" rx="2"><title>${esc(d)} O ${o} H ${h} L ${l} C ${c}</title></rect>${v ? `<rect x="${X(i) - Math.min(12, bw * .3)}" y="${top + ph + vh + 8 - v / vm * vh}" width="${Math.min(24, bw * .6)}" height="${v / vm * vh}" fill="${cl}" opacity=".35"/>` : ''}<text x="${X(i)}" y="${top + ph + vh + 24}" text-anchor="middle" font-size="10" fill="#8e8e93">${esc(d)}</text></g>`; }).join('')}</svg>`;
  },
  line: b => {
    const S = b.series, labels = S[0].points.map(p => p[0]), all = S.flatMap(s => s.points.map(p => p[1])), mx = Math.max(...all) * 1.1 || 1, mn = Math.min(0, ...all), W = 560, H = 190, X = i => 40 + i * (W - 60) / Math.max(1, labels.length - 1), Y = v => H - (v - mn) / (mx - mn) * 160;
    return `<svg viewBox="0 0 ${W} ${H + 30}" class="chartv" role="img">${S.map((s, k) => `<polyline points="${s.points.map((p, i) => X(i) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="${col(s, k)}" stroke-width="2.4" stroke-linejoin="round"/>${s.points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p[1])}" r="2.8" fill="${col(s, k)}"><title>${esc(t(s.name))} ${esc(p[0])}: ${N(p[1])}</title></circle>`).join('')}<text x="${X(s.points.length - 1) + 4}" y="${Y(s.points.at(-1)[1]) + 4}" font-size="10.5" font-weight="800" fill="${col(s, k)}">${esc(t(s.name))}</text>`).join('')}
    ${labels.map((d, i) => `<text x="${X(i)}" y="${H + 20}" text-anchor="middle" font-size="10" fill="#8e8e93">${esc(d)}</text>`).join('')}<line x1="30" x2="${W}" y1="${H}" y2="${H}" stroke="rgba(28,28,30,.15)"/></svg>`;
  },
  flow: b => `<div class="flow" style="grid-template-columns:repeat(${Math.min(b.steps.length, b.columns || 4)},minmax(0,1fr))">${b.steps.map((x, i) => `<div class="${x.hl ? 'hl' : ''}"><small>${String(i + 1).padStart(2, '0')}</small><b>${t(x.title)}</b><p>${t(x.desc)}</p></div>`).join('')}</div>`,
  cards: b => `<div class="cards">${b.items.map(x => `<div class="card${x.tone === 'risk' ? ' r' : x.tone === 'warn' ? ' w' : ''}">${x.no ? `<span class="no">${t(x.no)}</span>` : ''}<h4>${t(x.title)}</h4><p>${t(x.desc)}</p>${x.foot ? `<div class="rl">${t(x.foot)}</div>` : ''}</div>`).join('')}</div>`,
  scenes: b => `<div class="scns">${b.items.map(r => `<div class="scn ${r.status === 'plan' || r.status === 'todo' ? 'pl' : ''}" style="--bc:${b.color || B.accentDark || '#4f7a00'}"><div class="scnh"><b>${t(r.name)}</b>${r.status ? `<span class="stt ${r.status}">${r.status === 'live' || r.status === 'main' ? '<i></i>' : ''}${t(STATUS[r.status] || r.status)}</span>` : ''}</div>
    <dl><dt>${UI('谁', 'Who')}</dt><dd>${t(r.who)}</dd><dt>${UI('发生什么', 'What happens')}</dt><dd>${t(r.what)}</dd><dt>${UI('我们的位置', 'Our place')}</dt><dd class="pos">${t(r.place)}</dd></dl></div>`).join('')}</div>`,
  roadmap: b => `<div class="road4" style="grid-template-columns:repeat(${Math.min(b.phases.length, 4)},minmax(0,1fr))">${b.phases.map(p => `<div class="rc" style="${p.status === 'plan' ? 'border-style:dashed;border-color:rgba(28,28,30,.2);background:rgba(255,255,255,.5)' : ''}">${p.status ? `<span class="stt ${p.status}">${p.status === 'live' || p.status === 'main' ? '<i></i>' : ''}${t(STATUS[p.status] || p.status)}</span>` : ''}<b style="display:block;font:800 14px var(--round);margin-top:6px">${t(p.title)}</b>${p.when ? `<small style="color:var(--mute);font-size:11.5px">${t(p.when)}</small>` : ''}<ul>${(p.items || []).map(x => `<li>${t(x)}</li>`).join('')}</ul></div>`).join('')}</div>`,
  table: b => `<div class="tbl"><table><thead><tr>${b.columns.map(c => `<th>${t(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => c && typeof c === 'object' && 'v' in c ? `<td class="${c.hl ? 'hl' : ''}">${t(c.v)}</td>` : `<td>${t(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  image: b => `<figure class="imgb"><img src="${esc(b.src)}" alt="${esc(t(b.alt || b.caption))}" loading="lazy">${b.caption ? `<figcaption>${t(b.caption)}</figcaption>` : ''}</figure>`,
  quote: b => `<blockquote class="quote">${t(b.text)}${b.by ? `<cite>— ${t(b.by)}</cite>` : ''}</blockquote>`,
  compare: b => `<div class="cmp">${['before', 'after'].map(k => b[k] ? `<div class="${k}"><small>${t(b[k].label || (k === 'before' ? UI('以前', 'Before') : UI('现在', 'Now')))}</small><b style="display:block;font:800 15px var(--round);margin-top:2px">${t(b[k].title)}</b><ul>${(b[k].items || []).map(x => `<li>${t(x)}</li>`).join('')}</ul></div>` : '').join('')}</div>`,
  grid: b => `<div class="g2" style="grid-template-columns:repeat(${b.cols || 2},minmax(0,1fr))">${b.blocks.map(x => x.type === 'panel' ? R(x) : BL.panel({ blocks: [x] })).join('')}</div>`,
  panel: b => `<div class="panel">${b.heading ? `<div class="ph2"><b>${t(b.heading)}</b>${b.note ? `<small>${t(b.note)}</small>` : ''}</div>` : ''}${(b.blocks || []).map(R).join('')}</div>`,
  source: b => `<div class="src">${UI('来源', 'Source')}:${t(b.text)}${b.date ? ' · ' + esc(b.date) : ''}</div>`,
  html: b => t(b.html),
};
function R(b) { const f = BL[b.type]; if (!f) return `<div class="mini">unknown block: ${esc(b.type)}</div>`; try { return f(b); } catch (e) { return `<div class="mini">block ${esc(b.type)} failed: ${esc(e.message)}</div>`; } }
const CH = (DECK.chapters || []).map(c => ({ ...c, scene: () => `<div class="sc">${(c.blocks || []).map(R).join('')}</div>` }));

/* ---------- conversation playback ---------- */
const msgs = document.getElementById('msgs'), chips = document.getElementById('chips');
let cur = -1, busy = false, auto = false, paused = false, took = false, spd = 1, seq = 0; const seen = new Set();
const SPEEDS = [0.75, 1, 1.5, 2]; try { const v = +localStorage.getItem('tpl.spd'); if (SPEEDS.includes(v)) spd = v; } catch (e) {}
function pw(ms, my, tick, np) { return new Promise(res => { let left = ms, last = performance.now(); const step = () => { if (my !== seq) return res(false); const n = performance.now(); if (np || !paused) left -= (n - last) * spd * 1.5; last = n; if (tick) tick(1 - Math.max(0, left) / ms); if (left <= 0) return res(true); requestAnimationFrame(step); }; requestAnimationFrame(step); }); }
let why = null;
const WHY = { card: { zh: '已暂停 · 你在看展示页', en: 'Paused · viewing a page', s: { zh: '收起后自动继续', en: 'Resumes when you close it' } }, scroll: { zh: '已暂停 · 你在往回看', en: 'Paused · scrolling back', s: { zh: '回到底部自动继续', en: 'Resumes at the bottom' } }, demo: { zh: '已暂停 · 你在看项目演示', en: 'Paused · in the demo', s: { zh: '回到对话后点 ▶ 继续', en: 'Back in chat, press ▶ to resume' } }, user: { zh: '已暂停 · 你接管了', en: 'Paused · you took over', s: { zh: '点 ▶ 从这里接着自动讲', en: 'Press ▶ to auto-play from here' } }, btn: { zh: '已暂停', en: 'Paused', s: { zh: '点 ▶ 从停下的地方继续', en: 'Press ▶ to resume where it stopped' } } };
function drawPlayer() {
  const p = document.getElementById('player'), pp = document.getElementById('pp'), playing = auto && !paused;
  p.className = 'player ' + (auto ? (paused ? 'pause' : 'on') : 'idle');
  pp.innerHTML = playing ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
  pp.setAttribute('aria-label', playing ? 'pause' : 'play');
  const ch = cur >= 0 ? `${UI('第', 'Ch.')} ${cur + 1}/${CH.length}${UI(' 章', '')} · ${t(CH[cur].toc)}` : '';
  document.getElementById('pst').innerHTML = '<i></i>' + (playing ? UI('自动讲解中', 'Auto-playing') : auto ? t(WHY[why || 'btn']) : UI('点右侧 ▶ 开始观看', 'Press ▶ on the right to start'));
  document.getElementById('psub').textContent = playing ? ch : auto ? t(WHY[why || 'btn'].s) : UI(`自动讲解 ${CH.length} 章 · 随时可暂停`, `Auto-guided · ${CH.length} chapters · pause anytime`);
  document.getElementById('spd').innerHTML = SPEEDS.map(v => `<button data-spd="${v}" aria-pressed="${v === spd}">${v}×</button>`).join('');
}
function setTL(x) { document.getElementById('ptl').style.width = (Math.max(0, Math.min(1, x)) * 100) + '%'; }
function softPause(r) { if (auto && !paused) { paused = true; why = r; drawPlayer(); } }
function softResume(r) { if (auto && paused && why === r) { paused = false; why = null; drawPlayer(); } }
function takeOver() { if (auto && (!paused || why !== 'btn')) { paused = true; why = 'user'; took = true; drawPlayer(); } }
function day() { const d = new Date(); if (L === 'en') return d.toLocaleDateString('en', { weekday: 'long' }) + '<br>' + d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + '<br>' + d.toTimeString().slice(0, 5); const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]; return `周${w}<br>${d.getMonth() + 1}月${d.getDate()}日<br>${d.toTimeString().slice(0, 5)}`; }
function side() { document.getElementById('day').innerHTML = day(); const pg = document.getElementById('pg'), was = pg.dataset.c; pg.innerHTML = cur < 0 ? '' : `<span class="no${was !== String(cur) ? ' pop' : ''}"><b>${String(cur + 1).padStart(2, '0')}</b><span>/ ${CH.length}</span></span><span class="nm"><small>${UI('第 ' + (cur + 1) + ' 章', 'Chapter')}</small><strong>${t(CH[cur].toc)}</strong></span>`; pg.dataset.c = cur; document.getElementById('pgb').style.width = ((cur + 1) / CH.length * 100) + '%'; }
let progT = 0, prog = false, away = false;
function toBottom() { if (why === 'scroll' || away) return; prog = true; clearTimeout(progT); const go = () => { msgs.scrollTop = msgs.scrollHeight; }; go(); requestAnimationFrame(() => { go(); requestAnimationFrame(go); }); progT = setTimeout(() => { go(); prog = false; }, 450); }
function fitCard(cd, extra) { const b = cd.querySelector('.cardb'), h = cd.querySelector('.cardh'); if (!b) return; b.style.zoom = 1; const avail = msgs.clientHeight - (h ? h.offsetHeight : 60) - 100 - (extra || 0), need = b.scrollHeight; b.style.zoom = Math.max(.5, Math.min(1, avail / need)); }
addEventListener('resize', () => { msgs.querySelectorAll('.m.card').forEach(c => fitCard(c)); toBottom(); });
function add(cls, html) { const d = document.createElement('div'); d.className = 'm ' + cls; d.innerHTML = html; msgs.appendChild(d); if (cls === 'card') fitCard(d); toBottom(); return d; }
function count(el) { el.querySelectorAll('[data-count]').forEach(n => { const to = +n.dataset.count, dec = (String(n.dataset.count).split('.')[1] || '').length, t0 = performance.now(); const f = x => { const p = Math.min(1, (x - t0) / 900), v = to * (1 - Math.pow(1 - p, 3)); n.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
function cardHTML(i, full) { const c = CH[i]; return `<div class="cardh"><i class="logo lg" style="width:36px;height:36px;border-radius:10px"></i><div><b>${esc(BRAND)} · ${t(c.toc)}</b><small>${UI('展示页', 'Page')} · ${String(i + 1).padStart(2, '0')} / ${String(CH.length).padStart(2, '0')}</small></div><span class="sp"></span><button data-${full ? 'close' : 'open'}="${i}">${full ? UI('收起', 'Close') : UI('展开', 'Expand')}</button></div><div class="cardb">${c.scene()}</div>`; }
function pickHTML() { return `${UI('想先听哪一部分?也可以跟着我的顺序听。', 'Which part first? Or just follow my order.')}<div class="pick">${CH.map((c, i) => `<button data-go="${i}" class="${i === cur ? 'cur' : seen.has(i) ? 'done' : ''}"><i>${String(i + 1).padStart(2, '0')}</i>${t(c.toc)}</button>`).join('')}</div>`; }
const isNext = x => !x.jump && !x.reply && !x.restart;
function showChips(i) { chips.classList.remove('chin'); void chips.offsetWidth; chips.classList.add('chin'); const c = CH[i]; const a = (c.ask || []).filter(x => !(x.jump && !DEMO)).map((x, k) => `<button data-ask="${k}" class="${x.go ? 'go' : ''}">${t(x)}</button>`); if (i < CH.length - 1 && !(c.ask || []).some(isNext)) a.push(`<button data-next="1">${UI('继续', 'Continue')}</button>`); a.push(`<button data-menu="1">${UI('章节', 'Chapters')}</button>`); chips.innerHTML = a.join(''); }
function you(txt) { away = false; const w = document.createElement('div'); w.className = 'who mine'; w.innerHTML = `<span class="av2">${UI('你', 'Y')}</span>`; msgs.appendChild(w); add('u', txt); }
async function play(i, userText, byUser) {
  if (i < 0 || i >= CH.length) return; const my = ++seq; busy = true; chips.innerHTML = ''; cur = i; seen.add(i); side(); drawPlayer(); setTL(0);
  if (userText) { if (byUser) you(userText); else { const w = document.createElement('div'); w.className = 'who mine'; w.innerHTML = `<span class="av2">▶</span>${UI('自动讲解', 'Auto')}`; msgs.appendChild(w); add('u', userText); } }
  const w = document.createElement('div'); w.className = 'who'; w.innerHTML = `<i class="logo"></i>${esc(AGENT)}`; msgs.appendChild(w);
  const th = add('think', `<i><b></b><b></b><b></b></i>${UI('正在思考', 'Thinking')}`); if (!await pw(i === 0 ? 350 : 1100, my, null, byUser)) return;
  const c = CH[i]; let slot = th; const take = (cls, html) => { if (slot) { slot.className = 'm ' + cls; slot.innerHTML = html; const d = slot; slot = null; toBottom(); return d; } return add(cls, html); };
  if (c.tool) { take('tool', `▸ <em>${esc(t(c.tool))}</em>`); if (!await pw(600, my, null, byUser)) return; }
  for (let k = 0; k < (c.say || []).length; k++) { take('a', t(c.say[k])); if (k < c.say.length - 1 && !await pw(i === 0 ? 300 : 650, my, null, byUser)) return; }
  if (!await pw(350, my, null, byUser)) return;
  const cd = add('card', cardHTML(i)); cd.dataset.i = i; count(cd);
  if (!await pw(i === 0 && !auto ? 450 : 300, my, null, byUser)) return;
  if (i === 0) { if (!await pw(1100, my, null, byUser)) return; const pk = add('a', pickHTML()); pk.classList.add('pk'); toBottom(); if (!await pw(CH.length * 45 + 350, my, null, byUser)) return; }
  busy = false; showChips(i); toBottom(); setTimeout(toBottom, 320);
  if (auto && i < CH.length - 1) { if (!await pw(300, my)) return; toBottom(); const ok = await pw(6000, my, setTL); if (ok && auto && cur === i && my === seq) play(i + 1, t((CH[i].ask || []).find(isNext) || { zh: '继续', en: 'Continue' })); }
  else if (auto && i === CH.length - 1) { auto = false; paused = false; drawPlayer(); }
}
function restart() { away = false; seq++; why = null; paused = false; msgs.innerHTML = ''; seen.clear(); cur = -1; took = false; add('sep', day().split('<br>').slice(0, 2).join(' ')); play(0); }
const ov = document.getElementById('ov'), ovc = document.getElementById('ovc');
function openCard(i) { ovc.innerHTML = cardHTML(i, true) + (auto ? `<div class="ovtip">${UI('自动讲解已暂停 · 收起后继续', 'Auto-play paused · it resumes when you close this')}</div>` : ''); count(ovc); ov.hidden = false; }
function closeCard() { if (ov.hidden) return; ov.hidden = true; softResume('card'); }
ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeCard(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
let stT = 0; msgs.addEventListener('scroll', () => { if (prog) return; clearTimeout(stT); stT = setTimeout(() => { const far = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight > 140; away = far; if (far) softPause('scroll'); else softResume('scroll'); }, 120); }, { passive: true });
function userUp() { away = true; prog = false; clearTimeout(progT); }
msgs.addEventListener('touchmove', () => { if (msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight > 40) userUp(); }, { passive: true });
document.getElementById('vChat').addEventListener('wheel', e => { if (e.deltaY < 0) userUp(); if (msgs.contains(e.target) || e.ctrlKey) return; e.preventDefault(); msgs.scrollBy({ top: e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY, left: 0 }); }, { passive: false });
msgs.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (o) { softPause('card'); openCard(+o.dataset.open); return; } const g = e.target.closest('[data-go]'); if (g) { takeOver(); play(+g.dataset.go, t(CH[+g.dataset.go].toc), true); } });
chips.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; takeOver();
  if (b.dataset.menu) { you(UI('看章节', 'Show chapters')); add('a', pickHTML()); return; }
  if (b.dataset.next) { play(cur + 1, UI('继续', 'Continue'), true); return; }
  const x = (CH[cur].ask || []).filter(a => !(a.jump && !DEMO))[+b.dataset.ask]; if (!x) return;
  if (x.restart) { restart(); return; }
  if (x.jump) { you(t(x)); setView('demo', x.scene); why = 'demo'; drawPlayer(); return; }
  if (x.reply) { you(t(x)); add('a', t(x.reply)); b.remove(); return; }
  play(x.goto != null ? CH.findIndex(c => c.id === x.goto) : cur + 1, t(x), true); });
function jumpEnd() { away = false; prog = true; clearTimeout(progT); msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' }); progT = setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; prog = false; }, 700); }
document.getElementById('pp').addEventListener('click', () => { if (auto && !paused) { paused = true; why = 'btn'; took = false; drawPlayer(); return; }
  if (auto && paused) { paused = false; why = null; took = false; drawPlayer(); jumpEnd(); if (!busy && cur < CH.length - 1) play(cur + 1, UI('继续', 'Continue')); return; }
  auto = true; paused = false; why = null; took = false; drawPlayer(); jumpEnd(); if (cur >= CH.length - 1) { restart(); return; } if (!busy) play(cur + 1, UI('继续', 'Continue')); });
document.getElementById('spd').addEventListener('click', e => { const b = e.target.closest('[data-spd]'); if (!b) return; spd = +b.dataset.spd; try { localStorage.setItem('tpl.spd', spd); } catch (_) {} drawPlayer(); });
addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest('input')) { e.preventDefault(); document.getElementById('pp').click(); } });
document.getElementById('restart').addEventListener('click', restart);

/* ---------- demo view (optional): product screenshots, local HTML or a URL in a browser frame ---------- */
const DEMO = DECK.demo && DECK.demo.scenes && DECK.demo.scenes.length ? DECK.demo : null;
const SC = DEMO ? DEMO.scenes : [];
let dcur = SC.length ? SC[0].id : null;
const scr = document.getElementById('screen');
function fit() { const fr = scr.querySelector('iframe'); if (!fr) return; const W = scr.clientWidth, H = scr.clientHeight; if (!W || !H) return; let s = W / 1440, vw = 1440, vh = H / s; if (vh < 640) { s = H / 640; vh = 640; vw = W / s; } fr.style.width = Math.round(vw) + 'px'; fr.style.height = Math.round(vh) + 'px'; fr.style.transform = `scale(${s})`; }
if (scr) new ResizeObserver(fit).observe(scr);
function drawDemo() { if (!DEMO) return; document.getElementById('dtabs').innerHTML = SC.map((s, i) => `<button data-sc="${esc(s.id)}" aria-pressed="${s.id === dcur}"><span class="t"><i>${String(i + 1).padStart(2, '0')}</i>${t(s.title)}</span><small>${t(s.desc)}</small></button>`).join(''); const s = SC.find(x => x.id === dcur); document.getElementById('url').textContent = (t(s.addr) || t(s.title)) + (s.captured ? UI(` · 截于 ${s.captured}`, ` · captured ${s.captured}`) : ''); const lk = document.getElementById('openlive'); if (lk) { lk.hidden = !s.url; if (s.url) { lk.href = s.url; lk.textContent = UI('打开官网 ↗', 'Open live site ↗'); } } }
function goScene(id) { const s = SC.find(x => x.id === id); if (!s) return; scr.innerHTML = '';
  if (s.image) { const im = document.createElement('img'); im.src = s.image; im.alt = t(s.title); if (s.fit === 'scroll') { const box = document.createElement('div'); box.className = 'demo-scroll' + (s.mobile ? ' m' : ''); box.appendChild(im); scr.appendChild(box); } else { im.className = 'demo-img'; scr.appendChild(im); } return; }
  const fr = document.createElement('iframe'); fr.title = t(s.title); if (s.srcdoc) fr.srcdoc = s.srcdoc; else fr.src = s.url || s.file; scr.appendChild(fr); setTimeout(fit, 30); }
if (DEMO) document.getElementById('dtabs').addEventListener('click', e => { const b = e.target.closest('[data-sc]'); if (!b) return; dcur = b.dataset.sc; drawDemo(); goScene(dcur); });
let shown = null;
function setView(v, sc) { if (v === 'demo' && !DEMO) return; if (v === 'demo') softPause('demo'); document.querySelectorAll('.seg [data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); document.getElementById('vChat').classList.toggle('on', v === 'chat'); document.getElementById('vDemo').classList.toggle('on', v === 'demo');
  if (v === 'demo') { if (sc && SC.some(x => x.id === sc)) dcur = sc; drawDemo(); if (shown !== dcur) { shown = dcur; goScene(dcur); } } }
document.querySelectorAll('.seg [data-v]').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
if (!DEMO) { const s = document.querySelector('.seg'); if (s) s.style.visibility = 'hidden'; }

/* ---------- language ---------- */
function setLang(l) { L = l; root.lang = l; document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l))); try { localStorage.setItem('tpl.lang', l); } catch (e) {} side(); drawDemo(); drawPlayer(); if (cur >= 0 && !busy) showChips(cur); document.title = t(META.title) || BRAND; }
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
if (LANGS.length < 2) { const p = document.querySelector('.pill'); if (p) p.style.display = 'none'; }
let sv = null; try { sv = localStorage.getItem('tpl.lang'); } catch (e) {}
setLang(LANGS.includes(sv) ? sv : L);
setInterval(side, 20000);
restart();
})();
