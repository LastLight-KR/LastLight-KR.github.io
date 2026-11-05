/* 라스트라이트 HTML판 — 0단계(바탕)
   - 서버 연결은 지금 게임과 같은 브리지(bridge.js = 기존 index.html의 Firebase 코드 그대로)를 씁니다.
   - 게임 데이터(아이템 · 지역 · 퀘스트 …)는 Godot 원본에서 자동으로 내보낸 data.js를 씁니다.
   - 0.4부터 일부 동작(사용 · 장착 · 버리기 · 상점 · 가방 확장 · 능력치 확정 · 받은 물품함)만 저장합니다. 입장할 때 claimSession(지금 게임과 같음)을 먼저 합니다. */
const D = window.LLDATA;
const M = D.main, GD = D.game_data, BD = D.balance_data, WD = D.world_data, QD = D.quest_data, CL = D.city_light, CB = D.combat_balance;
const $ = (id) => document.getElementById(id);
/* main._build_data(): 게임이 켜질 때 반려동물 물품 · 확장 상점 품목을 합치는 것과 똑같이 */
(() => {
  const PET = D.pet_data.ITEMS, U21 = D.update21_items.SHOP || [];
  Object.assign(GD.ITEMS, JSON.parse(JSON.stringify(PET)));
  for (const it of Object.keys(PET)) if (!GD.SHOP.some((e) => String(e[0]) === it)) GD.SHOP.push([it, 1]);
  for (const e of U21) if (!GD.SHOP.some((c) => String(c[0]) === String(e[0]))) GD.SHOP.push(e.slice());
})();

const escJ = (s) => esc(josaFix(String(s ?? ''))); /* 화면 문구: '(으)로'·'이(가)' 같은 조사 표시를 받침에 맞게 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const comma = (n) => Number(n || 0).toLocaleString('ko-KR');
const svg = (d, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const ICON = { bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', chev: 'M9 18l6-6-6-6', chevd: 'M6 9l6 6 6-6', music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z' };

/* ── 브리지 호출 ── */
const bridge = () => window.LastLightAuth;
function call(name, ...args) {
  return new Promise((res) => {
    const b = bridge();
    if (!b || typeof b[name] !== 'function') return res({ ok: false, error: '연결 준비 중입니다.' });
    try { b[name](...args, (raw) => { let r; try { r = JSON.parse(raw); } catch (_) { r = { ok: false, error: String(raw) }; } res(r); }); }
    catch (e) { res({ ok: false, error: String(e && e.message || e) }); }
  });
}
function sub(name, args, fn) {
  const b = bridge(); if (!b || typeof b[name] !== 'function') return;
  try { b[name](...args, (raw) => { let r; try { r = JSON.parse(raw); } catch (_) { return; } fn(r); }); } catch (_) {}
}
async function waitBridge() {
  for (let i = 0; i < 300; i++) { const b = bridge(); if (b && (b.available || b.loadError)) return b; await new Promise((r) => setTimeout(r, 100)); }
  return bridge();
}

/* ── 상태 ── */
const S = { acct: null, P: null, mode: 'hub', openGroup: '생존', chatTab: 'world', world: [], online: [], city: null, theme: 'dark', mobile: false, admin: false };
try { S.theme = localStorage.getItem('ll_html_theme') || 'dark'; } catch (_) {}

/* ── 테마: 게임의 THEMES를 그대로 ── */
function hex(h) { h = String(h).replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
/* main.gd _tone(): 어두운 시안 색을 테마에 맞게(밝은 테마는 반전 + 색상 180° 회전, 다른 테마는 강조색 계열로) */
function toneHex(h, t, themeId) {
  const P = (x) => hex('#' + String(x).replace('#', '')).map((v) => v / 255);
  let [r, g, b] = P(h); const light = !!t.light;
  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const hsv = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0; if (d) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh /= 6; if (hh < 0) hh += 1; } return [hh, mx ? d / mx : 0, mx]; };
  const fromHsv = (hh, ss, vv) => { const i = Math.floor(hh * 6), f = hh * 6 - i, p = vv * (1 - ss), q = vv * (1 - f * ss), u = vv * (1 - (1 - f) * ss); return [[vv, u, p], [q, vv, p], [p, vv, u], [p, q, vv], [u, p, vv], [vv, p, q]][((i % 6) + 6) % 6]; };
  let c = [r, g, b];
  if (light) {
    const ir = 1 - r, ig = 1 - g, ib = 1 - b, cl = (v) => Math.max(0, Math.min(1, v));
    c = [cl(-0.574 * ir + 1.43 * ig + 0.144 * ib), cl(0.426 * ir + 0.43 * ig + 0.144 * ib), cl(0.426 * ir + 1.43 * ig - 0.856 * ib)];
    if (themeId !== 'light' && hsv(c)[1] < 0.06) { const pl = lum(P(t.PANEL)), p2 = lum(P(t.PANEL_2)), mid = (pl + p2) / 2, L = lum(c); let o = L > pl + 0.02 ? t.BG : L >= mid ? t.PANEL : t.PANEL_2; if (L < p2 - 0.06) o = t.LINE; c = P(o); }
  }
  if (!['dark', 'light', 'contrast'].includes(themeId)) { const [hh, ss, vv] = hsv(c); if (!(ss < 0.08 || hh < 0.30 || hh > 0.58)) { const ah = hsv(P(t.ACCENT))[0]; c = fromHsv(ah, Math.min(1, ss * (light ? 0.9 : 1)), vv); } }
  return '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
function applyTheme(id) {
  const t = M.THEMES[id] || M.THEMES.dark; S.theme = M.THEMES[id] ? id : 'dark';
  const r = document.documentElement.style, light = !!t.light;
  const set = (k, v) => r.setProperty(k, v.startsWith('#') ? v : '#' + v);
  set('--bg', t.BG); set('--panel', t.PANEL); set('--panel2', t.PANEL_2); set('--line', t.LINE); set('--text', t.TEXT);
  set('--muted', t.MUTED); set('--subtle', t.SUBTLE); set('--accent', t.ACCENT); set('--warning', t.WARNING); set('--danger', t.DANGER); set('--blue', t.BLUE);
  set('--morale', light ? '6a4cc0' : 'b9a2ff');
  set('--on-accent', light ? 'ffffff' : t.BG);
  /* 게임의 _tone(): 어두운 강조 바탕(17302c 등)을 테마에 맞게 — 강조색과 패널색을 섞어 같은 느낌으로 */
  set('--cta-bg', mix('#' + t.PANEL, '#' + t.ACCENT, light ? 0.16 : 0.13));
  set('--cta-line', mix('#' + t.PANEL, '#' + t.ACCENT, light ? 0.35 : 0.3));
  set('--sel', mix('#' + t.PANEL, '#' + t.ACCENT, light ? 0.2 : 0.16));
  set('--track', mix('#' + t.PANEL_2, '#' + t.LINE, 0.6));
  set('--note-bg', toneHex('131920', t, S.theme)); set('--dis-bg', toneHex('161b21', t, S.theme)); set('--on-warn', light ? t.BG : '1a1405'); set('--tone-sel', toneHex('17302c', t, S.theme)); set('--danger-bg', toneHex('3a1d1d', t, S.theme)); set('--danger-line', toneHex('6b2c2c', t, S.theme));
  set('--gold', light ? '7a5410' : 'f0c674'); set('--gold-bg', light ? mix('#' + t.PANEL, '#f0c674', 0.25) : '2a2414'); set('--gold-line', light ? mix('#' + t.PANEL, '#b58a2a', 0.45) : '4a3d1c');
  document.documentElement.style.colorScheme = light ? 'light' : 'dark';
  try { localStorage.setItem('ll_html_theme', S.theme); } catch (_) {}
}
applyTheme(S.theme);

/* ── 게임 계산(Godot 원본과 같은 식) ── */
let TNOW = 0; /* 시험용 고정 시각(0이면 실제 시각) */
const kstNow = () => (TNOW || Math.floor(Date.now() / 1000)) + 9 * 3600;
const clockText = () => { const t = kstNow() % 86400; return String(Math.floor(t / 3600)).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0') + ' KST'; };
const isNight = () => { const h = Math.floor((kstNow() % 86400) / 3600); return h >= 20 || h < 6; };
function xpNeed(level) { const base = 100 + (Math.max(1, level) - 1) * 65; let mul = 1; if (level >= 35) mul = Math.min(3.7, 1.7 + 0.08 * (level - 35)); else if (level >= 30) mul = 1.3 + 0.08 * (level - 29); else if (level >= 5) mul = 1 + 0.012 * (level - 4); return Math.round(base * mul); }
function calendarSync(p) { /* 화면 표시용으로만 계산합니다(저장하지 않음) */
  const today = Math.floor(kstNow() / 86400); const origin = Number(p.calendar_origin) > 0 ? Number(p.calendar_origin) : today - Math.max(0, Number(p.day || 1) - 1);
  const day = Math.max(1, today - origin + 1); const fieldDay = Math.floor((kstNow() - 6 * 3600) / 86400);
  return { day, fieldCount: Number(p.field_date) === fieldDay ? Number(p.field_count || 0) : 0 };
}
const region = () => GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, Number(S.P.region || 0)))];
const realmName = (r) => WD.REALMS[Number(r.realm)]?.name || '서울';
const hardOn = () => !!S.P.hard_mode;
const normalVisited = () => (hardOn() ? S.P.visited_normal : S.P.visited) || [];
const visitedSet = () => new Set(normalVisited().map(String));
const doneIn = (gi, vs) => { const r = GD.REGIONS[gi]; return r.spots.filter((s) => vs.has(r.name + ' ' + s)).length; };
const facility = (gi) => CL.FACILITIES[((gi % CL.FACILITIES.length) + CL.FACILITIES.length) % CL.FACILITIES.length];
function placeText() { const p = S.P; if (p.dead) return '사망'; if (p.travel && Object.keys(p.travel).length) return '이동 중'; if (p.long_expedition && Object.keys(p.long_expedition).length) return '장기 탐사 중'; if (p.auto_explore && p.auto_explore.started) return '자동 탐사 중'; return p.at_hub === false ? '탐사 구역' : '현지 거점'; }
const locationText = () => `${realmName(region())} › ${region().name} · ${placeText()}`;
function questDone(scope, q) {
  const qs = S.P.quests?.[scope] || {}; const prog = qs.progress || {};
  if (q.state) { const p = S.P, L = p.light || {}; const ok = { morale60: Number(p.morale) >= 60, full70: Number(p.hunger) >= 70 && Number(p.water) >= 70, light7: Number(L.cur || 0) >= 7, light_today: Number(L.last ?? -1) === Math.floor(kstNow() / 86400) }[q.state];
    if (ok && String(qs.key || '') === questKeys()[scope]) { if (!qs.progress || typeof qs.progress !== 'object') qs.progress = {}; qs.progress[q.kind] = Number(q.goal); prog[q.kind] = Number(q.goal); } }
  return Number(prog[q.kind] || 0) >= Number(q.goal);
}
function questList(scope) { const qs = S.P.quests?.[scope] || {}; const all = scope === 'daily' ? QD.DAILY : QD.WEEKLY; return (qs.picked || []).map((id) => all.find((q) => q.id === id)).filter(Boolean); }
function claimableCount() { return claimableItemsCount(); }
function nextTarget() { /* city_light.next_target: 지금 지역이 다 안 밝았으면 지금 지역 */ const vs = visitedSet(); const gi = Number(S.P.region || 0); if (doneIn(gi, vs) < GD.REGIONS[gi].spots.length) return gi; for (let i = 0; i < GD.REGIONS.length; i++) if (GD.REGIONS[i].realm === region().realm && doneIn(i, vs) < GD.REGIONS[i].spots.length) return i; return -1; }

/* ── 아바타(게임과 같은 그림 묶음 avatar_icons.png · 8칸 × 6줄) ── */
function avatarHtml(idx, size, photo, ring) {
  const a = M.AVATARS.find((x) => x[0] === Number(idx)) || M.AVATARS[0]; const col = '#' + (ring || a[1]);
  if (photo) return `<span class="avatar" style="width:${size}px;height:${size}px;--ring:${col}"><img alt="" src="data:image/jpeg;base64,${photo}"></span>`;
  const i = Number(a[0]), x = (i % 8) / 7 * 100, y = Math.floor(i / 8) / 5 * 100, s = Math.round(size * 0.62);
  return `<span class="avatar av" style="width:${size}px;height:${size}px;--ring:${col}"><i style="width:${s}px;height:${s}px;-webkit-mask-position:${x}% ${y}%;mask-position:${x}% ${y}%"></i></span>`;
}

/* ── 공통 ── */
/* main._toast_message: 한 줄에 다 안 들어가면 줄여 보여 주고, 전체 글은 알림함에 남김 */
function toast(msg) {
  msg = josaFix(String(msg ?? '')).replace(/\n/g, ' · '); let show = msg;
  try {
    const room = Math.min(980, window.innerWidth - 32) - 64, w = (x) => textW(x, 15, false);
    if (S.P && w(msg) > room) { const tail = ' · 알림함에서 확인', parts = msg.split(' · '); let short = parts[0], k = 1, cut = false;
      while (k < parts.length && w(short + ' · ' + parts[k] + tail) <= room) { short += ' · ' + parts[k]; k++; }
      while (short.length > 4 && w(short + '…' + tail) > room) { const sp = short.lastIndexOf(' '); short = sp > 4 ? short.slice(0, sp) : short.slice(0, -1); cut = true; }
      show = short + (cut ? '…' : '') + tail; if (typeof nhAdd === 'function') nhAdd('toast-' + Math.floor(performance.now() * 1000), '알림', msg, 'info'); }
  } catch (_) {}
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = show; document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function modal(title, html, buttons = [['확인 · 닫기', 'primary', null]]) {
  const root = $('modalRoot'), was = !!root.innerHTML; root.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="mcard"><div class="mhead"><h3>${escJ(title)}</h3><button class="mx" aria-label="닫기">${svg('M6 6l12 12M18 6L6 18')}</button></div>${html}<div style="display:grid;gap:8px" id="mBtns"></div></div></div>`; if (!was) sfx('open');
  josaDom(root.querySelector('.mcard'));
  root.querySelector('.mx').onclick = () => { root.innerHTML = ''; sfx('close'); };
  const box = root.querySelector('#mBtns');
  buttons.forEach(([label, cls, fn]) => { const b = document.createElement('button'); cls = cls || ''; b.className = 'btn ' + cls.replace(/\b(keep|disabled)\b/g, ''); b.disabled = /\bdisabled\b/.test(cls); b.textContent = label; b.onclick = () => { if (!/\bkeep\b/.test(cls)) { root.innerHTML = ''; sfx('close'); } if (fn) fn(); }; box.appendChild(b); });
  root.querySelector('.modal').addEventListener('click', (e) => { if (e.target.classList.contains('modal')) { root.innerHTML = ''; sfx('close'); } });
}
const ASSET = (f) => new URL(f, import.meta.url).href; /* app/ 폴더 기준 파일 주소 */
const NOT_YET = (name) => `<div class="panel soon"><b>${esc(name)}</b><span class="muted">화면을 불러오지 못했습니다. 거점으로 돌아가 다시 열어 주세요.</span><button class="btn primary" data-go="hub">거점으로</button></div>`;

/* ════════ 첫 화면 ════════ */
const ACTS = ['편의점 선반을 뒤지는 중…', '한강 다리를 건너는 중…', '통조림을 따는 중…', '무전기를 맞추는 중…', '등불 심지를 다듬는 중…'];
$('tAct').textContent = ACTS[Math.floor(Math.random() * ACTS.length)];
$('tVer').textContent = String(M.BUILD_VERSION || '');
let signUpMode = false;
function setSignUp(on) {
  signUpMode = on; $('tabIn').setAttribute('aria-selected', String(!on)); $('tabUp').setAttribute('aria-selected', String(on));
  $('fNick').hidden = !on; $('fPw2').hidden = !on; $('bSubmit').textContent = on ? '가입하고 시작하기' : '로그인'; $('bToUp').hidden = on; $('tErr').textContent = '';
  $('tNote').textContent = on ? '이메일 없이 아이디와 비밀번호만으로 가입합니다. 비밀번호를 잊으면 찾을 수 없으니 꼭 기억해 두세요.' : '기록은 계정에 저장되어 어느 기기에서든 이어서 할 수 있습니다.';
  $('inPw').autocomplete = on ? 'new-password' : 'current-password';
  if (on) { REG.required = true; $('fCode').hidden = false; call('registrationPolicy').then((r) => { if (r && r.ok) { REG.required = !!r.required; $('fCode').hidden = !REG.required; } }); }
  else $('fCode').hidden = true;
}
$('tabIn').onclick = () => setSignUp(false); $('tabUp').onclick = () => setSignUp(true); $('bToUp').onclick = () => setSignUp(true);
$('fLogin').addEventListener('submit', async (e) => {
  e.preventDefault(); $('tErr').textContent = ''; const b = $('bSubmit'); b.disabled = true;
  const id = $('inId').value.trim(), pw = $('inPw').value;
  if (signUpMode) { const why = REG.required && !$('inCode').value.trim() ? '관리자에게 받은 가입 코드를 입력하세요.' : pw !== $('inPw2').value ? '비밀번호 확인이 일치하지 않습니다.' : ''; if (why) { $('tErr').textContent = why; b.disabled = false; return; } }
  const r = signUpMode ? await call('signUp', id, pw, $('inNick').value.trim(), $('inCode').value.trim()) : await call('signIn', id, pw);
  b.disabled = false;
  if (!r.ok) { $('tErr').textContent = r.error || '로그인하지 못했습니다.'; return; }
  await afterAuth();
});
$('bSignOut').onclick = async () => { await call('signOut'); S.acct = null; showLogin(); };
function showLogin() { $('tLogin').hidden = false; $('tChars').hidden = true; $('title').hidden = false; $('app').hidden = true; $('saveBar').hidden = true; }
let pickChar = ''; const REG = { required: true };
function showChars() {
  const a = S.acct; $('tLogin').hidden = true; $('tChars').hidden = false;
  const list = a.chars && a.chars.length ? a.chars : [{ id: a.charId, name: a.nickname, level: a.level, age: a.charAge, active: true }];
  if (!list.some((c) => c.id === pickChar)) pickChar = (list.find((c) => c.active) || list[0]).id;
  const draw = () => {
    $('charList').innerHTML = list.map((c) => { const age = String(c.ageText || '') || (Number(c.age || 0) > 0 ? Number(c.age) + '세' : ''), lv = Number(c.level || 0); return `<button type="button" class="charrow" data-c="${esc(c.id)}" aria-pressed="${c.id === pickChar}">${avatarHtml(Number(c.avatar || 0), 40, String(c.photo || ''))}<span><b>${esc(c.name || '생존자')}</b><small>${lv > 0 ? 'Lv.' + lv : 'Lv. …'}${age ? ' · ' + esc(age) : ''}${c.active ? ' · 접속 중' : ''}</small></span></button>`; }).join('')
      + (list.length < 2 && Array.isArray(a.chars) ? '<button type="button" class="charrow charnew" id="bNewChar">+  새 캐릭터 만들기</button>' : '');
    { const nb = $('bNewChar'); if (nb) nb.onclick = () => charManager(); }
    $('charList').querySelectorAll('[data-c]').forEach((el) => { el.onclick = () => { pickChar = el.dataset.c; draw(); }; });
  };
  draw();
  $('bEnter').onclick = enterGame;
}
async function afterAuth() {
  const r = await call('whenReady');
  if (!r || !r.signedIn) { showLogin(); return; }
  S.acct = r; showChars(); { let res = false; try { res = sessionStorage.getItem('ll_html_resume') === '1'; sessionStorage.removeItem('ll_html_resume'); } catch (_) {} if (res) enterGame(); }
  call('charLevels').then((lv) => { if (!lv || !lv.ok || !isDict(lv.levels) || !Array.isArray(S.acct?.chars)) return; let ch = false; for (const c of S.acct.chars) if (isDict(c) && String(c.id) in lv.levels && Number(c.level || 0) !== Number(lv.levels[String(c.id)])) { c.level = Number(lv.levels[String(c.id)]); ch = true; } if (ch && !$('tChars').hidden) showChars(); });
}
async function enterGame() {
  $('tErr2').textContent = '';
  if (pickChar && pickChar !== S.acct.charId) {
    /* 캐릭터를 바꾸면 지금 게임과 같은 방식으로 서버의 '현재 캐릭터'가 바뀝니다 */
    const sw = await call('charSwitch', pickChar);
    if (!sw.ok) { $('tErr2').textContent = sw.error || '캐릭터를 바꾸지 못했습니다.'; return; }
    const again = await call('whenReady'); if (again && again.signedIn) S.acct = again;
  }
  $('bEnter').disabled = true; $('bEnter').textContent = '기록을 불러오는 중…';
  LIVE.lost = false; await claimThenLoad();
  const g = await call('loadGame');
  $('bEnter').disabled = false; $('bEnter').textContent = '입장';
  if (!g.ok) { $('tErr2').textContent = g.error || '기록을 불러오지 못했습니다.'; return; }
  const fresh = !g.found || !g.player;
  if (fresh) startNewGame(g.storyProgress || {}); else { S.P = normalizeLoaded(g.player); S.log = g.log || []; }
  LIVE.on = !LIVE.lost; setSaveBadge('');
  $('title').hidden = true; $('app').hidden = false; 
  call('isAdmin').then((r) => { S.admin = !!(r && r.admin); if (LIVE.on) socialStart(); coopCatchUp(); });
  S.mode = fresh ? 'create_character' : initialMode(); startFeeds(); render(); navArm(); if (checkUpdates()) LIFE.dirty = true; if (fresh) { LIFE.dirty = true; LIFE.lastSave = 0; } else setTimeout(entryWelcome, 400); bgmSync();
}

/* ════════ 실시간 정보(채팅 · 접속자 · 도시) — 읽기만 ════════ */
function startFeeds() {
  sub('subscribe', ['world'], (r) => { if (r.ok && r.channel === 'world') { const before = S.world.length; S.world = r.messages || []; if (FD.worldSeen) chatNew('world', before, S.world.length); FD.worldSeen = true; drawChat(); } });
  sub('watchOnline', [], (r) => { if (r.ok) { S.online = mergeOnlinePhotos(r.users || []); drawOnline(); } });
  sub('watchMerchant', [], (r) => { if (r.ok) { const e = r.event || {}; merchantOverride = e.key ? { key: e.key, start: Number(e.start) + 32400, end: Number(e.end) + 32400 } : {}; } });
  sub('watchInfectionRule', [], (r) => { if (r.ok) LIFE.infection = !!r.on; });
  sub('watchSurvivalRates', [], (r) => { if (r.ok) for (const k of ['hunger', 'water', 'morale']) LIFE.decay[k] = Math.max(25, Math.min(300, Math.trunc(Number(r[k] ?? 100)))); });
  cityPull(true);
}

/* 서버는 사진이 바뀐 사람만 사진을 보냅니다. 받은 사진은 uid별로 기억해 두고 다음 목록에 채워 넣습니다(_merge_online_photos) */
const PEER_PHOTOS = {};
function mergeOnlinePhotos(users) { for (const u of users) { if (!isDict(u)) continue; const uid = String(u.uid || '');
  if ('photo' in u) PEER_PHOTOS[uid] = { ph: String(u.ph || ''), photo: String(u.photo || '') }; else { const c = PEER_PHOTOS[uid] || {}; u.photo = String(c.ph || '') === String(u.ph || '') ? String(c.photo || '') : ''; } }
  return users; }
/* ════════ 화면 그리기 ════════ */
function render() {
  syncHardMode(); S.mobile = window.innerWidth < 760; S.narrow = isNarrow();
  document.body.classList.toggle('mob', S.mobile);
  document.body.classList.toggle('narrow', !!S.narrow);
  $('app').innerHTML = S.mobile ? mobileShell() : pcShell();
  bindShell(); drawCenter(); drawChat(); drawOnline(); badgesRefresh(); musicPaint(); if (NPOP.open) notifFill();
}
/* 채팅 칸을 붙여 두면 가운데 화면이 너무 좁아지는 PC 창(화면 배율 반영 가로 1000 미만)에서는 채팅을 가운데 화면으로 엽니다 */
function isNarrow() { if (window.innerWidth < 760) return false; const z = parseFloat(document.documentElement.style.zoom) || 1; return window.innerWidth / z < 1000; }
let lastMobile = null, lastNarrow = null;
window.addEventListener('resize', () => { const m = window.innerWidth < 760, nw = isNarrow(); if (S.P && !$('app').hidden && (m !== lastMobile || nw !== lastNarrow)) { lastMobile = m; lastNarrow = nw; if (S.mode === 'chat' && !m && !nw) S.mode = initialMode(); render(); } else if (S.P && S.mode === 'inventory' && !m) { const g = $('iGrid'), c = $('center'); if (g && c) g.style.gridTemplateColumns = `repeat(${Math.max(3, Math.floor((c.clientWidth - 360) / 104))}, minmax(0, 1fr))`; } });

function vitals() {
  const p = S.P;
  return [['체력', `${Number(p.hp)} / ${Number(p.max_hp)}`, Number(p.hp) / Math.max(1, Number(p.max_hp)), 'var(--danger)'],
    ['허기', Number(p.hunger), Number(p.hunger) / 100, 'var(--warning)'], ['수분', Number(p.water), Number(p.water) / 100, 'var(--blue)'], ['사기', Number(p.morale), Number(p.morale) / 100, 'var(--morale)']];
}
function statusText() { const n = Object.keys(S.P.conditions || {}).length; return n ? `상태 ${n}` : '상태'; }
function pcShell() {
  const p = S.P, cal = calendarSync(p), need = xpNeed(Number(p.level)), claim = claimableCount();
  return `
  <header class="panel hdr">
    <div class="hdr-top">
      <div class="hdr-id">
        <button class="hbtn-av" id="bAv" style="border:0;background:none;padding:0">${avatarHtml(p.avatar || 0, 56, p.photo)}</button>
        <div>
          <div class="hdr-name">${esc(S.acct.nickname || p.name || '생존자')} <span class="chip lv">Lv. ${Number(p.level)}</span></div>
          <div class="hdr-day">${cal.day}일차 · ${clockText()} · ${isNight() ? '밤' : '낮'}</div>
          <div class="xprow">경험치 <span class="bar"><i style="width:${Math.min(100, Number(p.xp) / need * 100)}%;background:var(--accent)"></i></span> <b>${comma(p.xp)} / ${comma(need)}</b></div>
        </div>
      </div>
      <div class="cash"><span class="gold">금액 ${comma(p.money)}</span><span class="gold">코인 ${comma(p.coins)}</span></div>
      <div class="vitals">${vitals().map(([n, v, r, c]) => `<div class="vital"><div class="t">${n}<b>${v}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, r * 100))}%;background:${c}"></i></div></div>`).join('')}</div>
      <div class="hdr-icons"><button class="icon-btn" id="bBell" aria-label="알림">${svg(ICON.bell)}</button><button class="icon-btn" id="bSet" aria-label="설정">${svg(ICON.gear)}</button></div>
    </div>
    <div class="hdr-row2">
      <span class="loc-pill" id="bLoc" role="button" style="cursor:pointer"><span class="dot"></span>${esc(locationText())}</span>
      <button class="btn sm" id="bInfo">정보</button><button class="btn sm" id="bState">${statusText()}</button><button class="btn sm" id="bDuel" style="color:var(--blue)" hidden>결투</button><button class="btn sm" id="bWork" hidden></button>
      <button class="claim-chip" data-claimall ${claim ? '' : 'hidden'}>${svg(ICON.gift)}<span>받을 것 ${claim} · 모두 받기</span></button>
      <span class="spacer"></span>
      <button class="btn sm" id="bChar">캐릭터 바꾸기</button><button class="btn sm" id="bTitle">타이틀로</button>
      <button class="btn sm outline-accent" data-music aria-label="배경음악" style="width:38px;padding:0">${svg(ICON.music)}</button>
      <button class="btn sm outline-accent" id="bChatT">채팅 ON</button>
    </div>
  </header>
  <div class="body${UI.chat && !S.narrow ? '' : ' nochat'}${S.narrow ? ' narrow' : ''}">
    <nav class="panel side" id="side">${sideNav()}</nav>
    <main class="center" id="center"></main>
    ${S.narrow ? '' : `<aside class="panel chatcol" id="chatcol" ${UI.chat ? '' : 'hidden'}>${chatCol()}</aside>`}
  </div>`;
}
function mobileShell() {
  const p = S.P, cal = calendarSync(p), need = xpNeed(Number(p.level)), claim = claimableCount();
  const bn = [['거점', 'hub', 'home'], ['탐사', 'explore', 'compass'], ['가방', 'inventory', '가방'], ['함께', 'friends', '함께'], ['채팅', 'chat', 'chat'], ['메뉴', 'menu', '기록']];
  return `
  <header class="panel mhdr">
    <div class="top">
      <button id="bAv" style="border:0;background:none;padding:0">${avatarHtml(p.avatar || 0, 38, p.photo)}</button>
      <div class="idc"><div class="nm">${esc(S.acct.nickname || '생존자')}</div><div class="day"><span class="chip lv">Lv.${Number(p.level)}</span>${cal.day}일차 ${clockText().replace(' KST', '')} ${isNight() ? '밤' : '낮'}</div></div>
      <button class="icon-btn outline-accent" data-music aria-label="배경음악" style="color:var(--accent)">${svg(ICON.music)}</button>
      <button class="icon-btn" id="bBell" aria-label="알림">${svg(ICON.bell)}</button>
      <div class="cash"><span class="gold">금액 ${comma(p.money)}</span><span class="gold">코인 ${comma(p.coins)}</span></div>
    </div>
    <div class="mvit" id="mvit">${vitals().map(([n, v, r, c], i) => `<div><div class="t">${n}<b>${i === 0 ? `${Number(p.hp)}/${Number(p.max_hp)}` : v}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, r * 100))}%;background:${c}"></i></div></div>`).join('')}</div>
    <div class="mxp">경험치 <span class="bar"><i style="width:${Math.min(100, Number(p.xp) / need * 100)}%;background:var(--accent)"></i></span><b>${comma(p.xp)} / ${comma(need)}</b><button class="btn outline-accent" id="bState">${Object.keys(p.conditions || {}).length ? '상태 ' + Object.keys(p.conditions).length + ' ›' : '상태 양호 ›'}</button></div>
    <button class="claim-chip" data-claimall ${claim ? '' : 'hidden'}>${svg(ICON.gift)}<span>받을 것 ${claim} · 모두 받기</span></button>
  </header>
  <div class="panel mloc" id="mloc" ${['hub', 'explore', 'worldmap', 'travel', 'exploring', 'long_wait', 'combat', 'dead'].includes(S.mode) ? '' : 'hidden'}><span class="loc"><span class="dot"></span>${esc(locationText())}</span><button class="btn sm" id="bMap">지도 · 이동</button></div>
  <div class="body"><main class="center" id="center"></main></div>
  <nav class="bnav" id="bnav">${bn.map(([l, m, ic]) => `<button data-m="${m}" aria-current="${navKey() === m ? 'page' : 'false'}">${svg(M.NAV_ICON_PATHS[ic] || M.NAV_ICON_PATHS['기록'])}${l}</button>`).join('')}</nav>`;
}
function sideNav() {
  const badge = (m) => { if (m === 'story_menu') return '<span class="r pill-badge">준비</span>'; if (m === 'stats' && Number(S.P.skill_points) > 0) return `<span class="r count-badge">${Number(S.P.skill_points)}</span>`; return ''; };
  return M.NAV_GROUPS.filter((g) => g[0] !== '기록' || true).map(([gname, items]) => {
    const open = S.openGroup === gname;
    const list = items.filter(([, m]) => (m !== 'admin' || S.admin) && (m !== 'casino' || Number(S.P.level || 1) >= 5));
    return `<div class="ngroup ${open ? 'open' : ''}"><button data-g="${esc(gname)}">${svg(M.NAV_ICON_PATHS[gname] || M.NAV_ICON_PATHS['기록'])}${esc(gname)}<span class="chev">${svg(open ? ICON.chevd : ICON.chev)}</span></button>
      ${open ? `<div class="nsub">${list.map(([lab, m]) => `<button data-m="${m}" aria-current="${navKey() === m ? 'page' : 'false'}">${esc(lab)}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
}
function chatCol() {
  const tabs = [['월드', 'world'], ['파티', 'party'], ['공지', 'notice'], ['쪽지', 'dm'], ['스토리', 'story'], ['전투', 'combat']];
  return `<div class="onl-head"><span class="dot"></span>접속 중 <span id="onlN"></span><span class="spacer"></span><button class="btn sm" id="cFold">${S.mobile ? '닫기' : '접기'}</button></div>
  <div class="onl-list" id="onlList"></div>
  <div class="ctabs">${tabs.map(([l, k]) => `<button data-ct="${k}" aria-pressed="${S.chatTab === k}">${l}</button>`).join('')}</div>
  <div class="msgs" id="msgs"></div>
  <form class="cinput" id="cForm"><input id="cIn" maxlength="200" placeholder="메시지를 입력하세요" autocomplete="off"><button class="btn primary">전송</button></form>`;
}
function bindShell() {
  const app = $('app');
  app.querySelectorAll('[data-g]').forEach((b) => { b.onclick = () => { S.openGroup = S.openGroup === b.dataset.g ? '' : b.dataset.g; $('side').innerHTML = sideNav(); bindShell(); }; });
  app.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => go(b.dataset.m); });
  app.querySelectorAll('[data-ct]').forEach((b) => { b.onclick = () => { chatSetTab(b.dataset.ct); app.querySelectorAll('[data-ct]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; });
  const f = $('cForm'); if (f) f.onsubmit = (e) => { e.preventDefault(); sendChatNow(); };
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('bSet', () => settingsOpen()); on('bDuel', () => go('duels')); on('bWork', () => go('craft')); on('bLoc', () => go('worldmap')); on('bChatT', chatToggle); on('cFold', () => { if (S.mobile) go('hub'); else chatToggle(); });
  app.querySelectorAll('[data-music]').forEach((b) => { b.onclick = musicToggle; }); app.querySelectorAll('[data-claimall]').forEach((b) => { b.onclick = claimAllInbox; }); on('bTitle', () => { if (LIVE.on) call('presenceOff'); $('app').hidden = true; $('saveBar').hidden = true; $('title').hidden = false; showChars(); bgmSync(); });
  on('bChar', charManager);
  on('bMap', () => go('worldmap'));
  on('bState', stateModal); on('mvit', stateModal); on('bInfo', infoModal);
  on('bBell', notifToggle); on('bAv', () => go('profile')); badgesRefresh(); musicPaint();
}
const navKey = () => ({ story: 'story_menu', long_explore: 'explore', worldmap: 'explore', travel: 'hub', exploring: 'explore', long_wait: 'explore', combat: 'explore', dead: 'hub', repair: 'shop', merchant: 'shop', hub_event: 'pets' }[S.mode] || S.mode);
function go(m, raw = false) {
  if (!raw) { const opener = { admin: openAdmin, party_list: openPartyList, registration_admin: openRegAdmin, admin_currency: openCurrency, settings: () => settingsOpen() }[m]; if (opener) { opener(); return; } }
  m = routeMode(m); { const why = modeBlock(m); if (why) { toast(why); return; } }
  if (m === 'chat' && !S.mobile && !S.narrow) { const i = $('cIn'); if (i) i.focus(); return; }
  if (m === 'room' && !roomGoHook()) return;
  if (m === 'create_character' && !CHD.d) { beginCharEdit(); return; }
  if (m === 'casino' && !casOk()) { toast('도박장은 5레벨부터 활동하지 않는 거점에서만 이용할 수 있습니다.'); return; }
  if (m !== 'casino') casCancel(); if (S.mode === 'chat' && m !== 'chat') dmStop(), (DM.subbed = '');
  S.mode = m; if ($('mloc')) $('mloc').hidden = !['hub', 'explore', 'worldmap', 'travel', 'exploring', 'long_wait', 'combat', 'dead'].includes(m);
  if (S.mobile) { $('app').querySelectorAll('#bnav [data-m]').forEach((b) => b.setAttribute('aria-current', b.dataset.m === navKey() ? 'page' : 'false')); }
  else { const g = M.NAV_GROUPS.find(([, items]) => items.some(([, x]) => x === navKey())); if (g) S.openGroup = g[0]; $('side').innerHTML = sideNav(); bindShell(); }
  drawCenter();
}
function drawCenter() {
  const c = $('center'); if (!c) return;
  if (S.mode === 'hub') { c.innerHTML = hubPage(); bindHub(); }
  else if (S.mode === 'menu') c.innerHTML = menuPage();
  else if (S.mode === 'inventory') { c.innerHTML = inventoryPage(); bindInventory(); }
  else if (S.mode === 'explore') { c.innerHTML = exploreGuPage(); bindExploreGu(); }
  else if (S.mode === 'worldmap') { c.innerHTML = worldMapPage(); bindWorldMap(); }
  else if (S.mode === 'stats') { c.innerHTML = statsPage(); bindStats(); }
  else if (S.mode === 'quests') { c.innerHTML = questsPage(); bindRO(c); bindAct(c); bindCoopBits(c); c.querySelectorAll('[data-qrr]').forEach((b) => { b.onclick = () => act(() => questReroll(b.dataset.qrr)); }); }
  else if (S.mode === 'shop') { c.innerHTML = shopPage(); bindShop(); }
  else if (S.mode === 'equipment') { c.innerHTML = equipmentPage(); bindEquipment(); }
  else if (S.mode === 'repair') { c.innerHTML = repairPage(); bindRepair(); }
  else if (S.mode === 'merchant') { c.innerHTML = merchantPage(); bindRO(c); bindAct(c); }
  else if (S.mode === 'travel') { c.innerHTML = travelPage(); bindProgress(); }
  else if (S.mode === 'exploring') { c.innerHTML = exploringPage(); bindProgress(); }
  else if (S.mode === 'long_wait') { c.innerHTML = longPage(); bindProgress(); bindCoopBits(c); }
  else if (S.mode === 'combat') { c.innerHTML = combatPage(); bindProgress(); }
  else if (S.mode === 'dead') { c.innerHTML = deadPage(); bindProgress(); }
  else if (S.mode === 'story_menu') { c.innerHTML = storyMenuPage(); bindStory(); }
  else if (S.mode === 'story') { c.innerHTML = storyPage(); bindStory(); }
  else if (S.mode === 'settings') { c.innerHTML = settingsPage(); bindSettings(); }
  else if (S.mode === 'notifications') { c.innerHTML = notificationsPage(); bindNotifications(); }
  else if (S.mode === 'journal') { c.innerHTML = journalPage(); bindJournal(); }
  else if (S.mode === 'light_log') { c.innerHTML = lightLogPage(); }
  else if (S.mode === 'updates') { c.innerHTML = updatesPage(); }
  else if (S.mode === 'guide') { c.innerHTML = guidePage(); bindGuide(); }
  else if (S.mode === 'craft') { c.innerHTML = craftPage(); bindCraft(); }
  else if (S.mode === 'stash') { c.innerHTML = stashPage(); bindStash(); }
  else if (S.mode === 'long_explore') { c.innerHTML = longPrepPage(); bindLongPrep(); }
  else if (S.mode === 'pets') { c.innerHTML = petsPage(); bindPets(); }
  else if (S.mode === 'hub_event') { c.innerHTML = hubEventPage(); bindHubEvent(); }
  else if (S.mode === 'casino') { c.innerHTML = casinoPage(); bindCasino(); }
  else if (S.mode === 'fishing') { c.innerHTML = fishingPage(); bindFishing(); }
  else if (S.mode === 'fishing_guide') { c.innerHTML = fishGuidePage(); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); }
  else if (S.mode === 'room') { c.innerHTML = roomPage(); bindRoom(); }
  else if (S.mode === 'room_shop') { c.innerHTML = roomShopPage(); bindRoomShop(); }
  else if (S.mode === 'friends') { c.innerHTML = friendsPage(); bindFriends(); }
  else if (S.mode === 'requests') { c.innerHTML = requestsPage(); bindRequests(); }
  else if (S.mode === 'trades') { c.innerHTML = tradesPage(); bindTrades(); }
  else if (S.mode === 'trade_form') { c.innerHTML = tradeFormPage(); bindTradeForm(); }
  else if (S.mode === 'party') { c.innerHTML = partyPage(); bindParty(); }
  else if (S.mode === 'party_list') { c.innerHTML = partyListPage(); bindPartyList(); }
  else if (S.mode === 'party_trips') { c.innerHTML = partyTripsPage(); bindPartyTrips(); }
  else if (S.mode === 'coop') { c.innerHTML = coopPage(); bindCoop(); }
  else if (S.mode === 'duels') { c.innerHTML = duelsPage(); bindDuels(); }
  else if (['reports', 'report_list', 'report_admin'].includes(S.mode)) { c.innerHTML = reportsPage(S.mode); bindReports(); }
  else if (S.mode === 'status') { c.innerHTML = statusPage(); bindStatus(); }
  else if (S.mode === 'use_items') { c.innerHTML = useItemsPage(); bindUseItems(); }
  else if (S.mode === 'profile') { c.innerHTML = profilePage(); bindProfile(); }
  else if (S.mode === 'create_character') { c.innerHTML = charEditPage(); bindCharEdit(); }
  else if (S.mode === 'admin') { c.innerHTML = adminPage(); bindAdmin(); }
  else if (S.mode === 'admin_player') { c.innerHTML = adminPlayerPage(); bindAdminPlayer(); }
  else if (S.mode === 'admin_grow') { c.innerHTML = adminGrowPage(); bindAdminGrow(); }
  else if (S.mode === 'admin_status') { c.innerHTML = adminStatusPage(); bindAdminStatus(); }
  else if (S.mode === 'admin_broadcast') { c.innerHTML = adminBroadcastPage(); bindAdminBroadcast(); }
  else if (S.mode === 'admin_currency') { c.innerHTML = currencyPage(); bindCurrency(); }
  else if (S.mode === 'registration_admin') { c.innerHTML = regAdminPage(); bindRegAdmin(); }
  else if (S.mode === 'repair_settings') { c.innerHTML = repairSettingsPage(); bindRepairSettings(); }
  else if (S.mode === 'chat') { c.innerHTML = chatPage(); bindChatPage(); }
  else if (S.mode === 'long_history') { c.innerHTML = longHistoryPage(); bindProgress(); const lh = $('lhLog'); if (lh) lh.onclick = () => longLogModal(); }
  else { const lab = (M.NAV_GROUPS.flatMap((g) => g[1]).find(([, m]) => m === S.mode) || [S.mode])[0]; c.innerHTML = `<div class="pagehead"><h2>${esc(lab)}</h2></div>` + NOT_YET(lab); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); }
  if (S.mode === 'menu') c.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { const m = b.dataset.m; if (m === 'chars') charManager(); else if (m === 'account') { if (LIVE.on) accountModal(); else toast('로그인 후 볼 수 있습니다.'); } else if (m === '@title') $('bTitle')?.click(); else go(m); }; });
  actTick(true); if (!['chat', 'reports', 'report_list', 'report_admin'].includes(S.mode)) josaDom(c);
  c.scrollTop = 0;
}

/* ── 거점 ── */
function hubPage() {
  const p = S.P, cal = calendarSync(p), r = region(), vs = visitedSet();
  const total = GD.REGIONS.length * 10, done = normalVisited().length;
  const left = Math.max(0, M.FIELD_DAILY_LIMIT - cal.fieldCount);
  const gi = nextTarget(); let goal = '들어갈 수 있는 모든 지역에 불을 밝혔습니다';
  if (gi === Number(p.region)) goal = `다음 불빛까지 ${GD.REGIONS[gi].spots.length - doneIn(gi, vs)}구역 · ${GD.REGIONS[gi].name} ${doneIn(gi, vs)}/${GD.REGIONS[gi].spots.length} · 밝히면 ${facility(gi).name}`;
  else if (gi >= 0) goal = `다음으로 밝힐 곳 ${GD.REGIONS[gi].name} ${doneIn(gi, vs)}/${GD.REGIONS[gi].spots.length}`;
  const head = S.mobile
    ? `<p class="crumb">${esc(realmName(r))} › ${esc(r.name)}</p><div class="pagehead"><h2>현지 거점</h2></div>`
    : `<p class="crumb">${esc(realmName(r))} › ${esc(r.name)}</p><div class="pagehead"><h2>현지 거점</h2><button class="btn" data-go="worldmap">지도 · 이동</button><button class="btn" data-go="duels">결투</button><button class="btn" data-go="party">파티</button></div>`;
  const allOk = !Object.keys(p.conditions || {}).length && p.hunger >= 30 && p.water >= 30 && p.morale >= 30;
  const pets = (p.pets || []).length;
  const cards = [
    ['상태', 'var(--accent)', '몸 살피기', `허기 ${p.hunger} · 수분 ${p.water} · 체력 ${p.hp}/${p.max_hp} · 사기 ${p.morale}`, allOk ? '<span class="okchip">모두 양호</span>' : '<span class="okchip" style="color:var(--warning);border-color:var(--warning)">살펴볼 것 있음</span>'],
    ['진행', 'var(--warning)', '스토리', '조건을 채우면 다음 이야기가 열립니다', ''],
    ['동료', petActive() ? 'var(--warning)' : 'var(--accent)', `반려동물 ${pets}`, petActive() ? '거점 사건 진행 중' : nonEmpty(p.wild_animal) ? '친해지는 중 · ' + String(p.wild_animal.name ?? '') : '교감 · 돌보기', ''],
    ['시설', 'var(--warning)', '거점 시설' + (merchantNow() ? ' · 행상인 방문 중' : ''), `상점 · 수리소 · 보관 상자 · 소지금 ${comma(p.money)}원`, ''],
    ['휴식', 'var(--blue)', '내 방', '가구 꾸미기 · 룸 상점 · 친구 방 방문', ''],
    ['회복', 'var(--morale)', '잠깐 눈 붙이기', '사기 +15 · 체력 회복 · 허기 -3 · 수분 -4 · 3분마다 1회', ''],
  ];
  const order = S.mobile ? [0, 1, 2, 3, 4, 5] : [0, 5, 1, 2, 3, 4];
  return head + autoCard() + `
  <section class="cta">
    <div class="l"><div class="kicker">지금 할 일</div><h3>탐사 나가기</h3>
      <div class="stats3"><div><small>탐사 완료 구역</small><b>${done}</b><span>/ ${total}</span></div><div><small>오늘 남은 횟수</small><b>${left}</b><span>/ ${M.FIELD_DAILY_LIMIT}회</span></div><div><small>초기화</small><b>06:00</b></div></div>
      <div class="goal"><i></i>${esc(goal)}</div></div>
    <div class="r"><div class="two"><button class="btn primary big" data-go="explore">단기 탐사 시작</button><button class="btn big" style="flex:1;font-size:15px" data-hub="long">장기 탐사</button></div>
      <button class="btn" data-hub="auto" ${left <= 0 ? 'disabled' : ''}>${left > 0 ? `자동 탐사 · 남은 ${left}회 · 40분` : '자동 탐사 · 오늘 횟수 없음'}</button></div>
  </section>
  ${todayCard(left)}
  <div class="cards">${order.map((i) => { const c = cards[i]; return `<button class="hcard" style="--cat:${c[1]}" ${i === 3 ? 'data-go="shop"' : `data-hub="card${i}"`}><small>${c[0]}</small><b>${esc(c[2])}${c[4]}</b><span>${esc(c[3])}</span></button>`; }).join('')}</div>
  ${cityCard()}`;
}
function todayCard(left) {
  const rows = [];
  for (const scope of ['daily', 'weekly']) {
    const list = questList(scope); if (!list.length) continue;
    const claimed = S.P.quests?.[scope]?.claimed || []; let dn = 0, cn = 0;
    list.forEach((q) => { if (questDone(scope, q)) { dn++; if (!claimed.includes(q.id)) cn++; } });
    rows.push([dn >= list.length && cn === 0, scope === 'daily' ? '일일 퀘스트' : '주간 퀘스트', cn ? `보상 ${cn}개 받기` : `${dn} / ${list.length} 완료`, 'quests']);
  }
  if (Number(S.P.skill_points) > 0) rows.push([false, '능력치 포인트', `${Number(S.P.skill_points)} 남음 · 올리기`, 'stats']);
  const cl = claimableCount(); if (cl) rows.push([false, '받을 것', `${cl}건 · 모두 받기`, '@claimall']);
  if (coopOnline() && COOP.state && bossActive() && Number(S.P.level) >= 5) { const blk = bossBlock(); rows.push([bossWait() > 0, '거대 감염체 토벌', blk === '' ? '지금 공격 가능' : blk.replace('다음 공격까지 ', '다음 공격 '), 'coop']); }
  if (S.city && finalActive() && Number(S.P.level) >= 5) { const fb = finalBlock(); rows.push([finalWait() > 0, '시즌 보스', fb === '' ? '지금 공격 가능' : fb.replace('다음 공격까지 ', '다음 공격 '), 'coop']); }
  rows.push([left <= 0, '오늘 단기 탐사', left > 0 ? `${left} / ${M.FIELD_DAILY_LIMIT}회 남음` : '오늘 횟수를 다 썼습니다', 'explore']);
  const sorted = rows.filter((r) => !r[0]).concat(rows.filter((r) => r[0])).slice(0, 5);
  const todo = sorted.filter((r) => !r[0]).length;
  return `<section class="panel todo"><div class="h">오늘 체크리스트<span style="${todo ? '' : 'color:var(--accent)'}">${todo ? '할 일 ' + todo : '오늘 할 일 끝'}</span></div>
    ${sorted.map((r) => `<button class="${r[0] ? 'done' : ''}" ${r[3] === '@claimall' ? 'data-todoclaim' : `data-go="${r[3]}"`}><span class="mk">${r[0] ? '✓' : '○'}</span><span class="tt">${esc(r[1])}</span><span class="nt">${esc(r[2])}  ›</span></button>`).join('')}</section>`;
}
/* ════════ 함께 밝히는 도시 · 시즌 보스(city_light.gd) ════════ */
const CITY = { loadAt: -999999, busy: false, off: 0 };
const cityMs = () => Date.now() + CITY.off;
const citySeason = () => Number(S.city?.season || 0);
const cityGoal = () => Math.max(1, Number(S.city?.goal ?? 3000));
const cityTotal = () => Math.max(Number(S.city?.total || 0), 0);
const cityPct = () => Math.max(0, Math.min(1, cityTotal() / cityGoal()));
function cityPoints() { const c = cityData(); let n = 0; for (const id in c.spots) n += spotWeight(id); return Math.min(Number(CL.MAX_POINTS ?? 1500), n + Number(c.boss || 0) * Number(CL.BOSS_POINT ?? 3)); }
function cityFinal() { const f = isDict(S.city?.final) ? S.city.final : {}; if (String(f.name || '').startsWith('최종 감염원')) f.name = String(f.name).replace('최종 감염원', '시즌 보스'); return f; }
const cityOnline = () => LIVE.on && !!S.P;
function finalActive() { const f = cityFinal(); return nonEmpty(f) && Number(f.season || 0) === citySeason() && !('defeatedAt' in f) && Number(f.endsAt || 0) > cityMs(); }
function cityWaiting() { const f = cityFinal(); return citySeason() > 0 && nonEmpty(f) && 'defeatedAt' in f && Number(f.season || 0) === citySeason(); }
function cityPull(force = false) { if (!cityOnline() || CITY.busy) return; if (!force && Date.now() - CITY.loadAt < 300000) return; CITY.loadAt = Date.now(); CITY.busy = true;
  call('cityState').then((r) => { CITY.busy = false; if (!r || !r.ok) return; CITY.off = Number(r.now ?? Date.now()) - Date.now(); S.city = clone(r); const c = cityData(); if (Number(c.season) !== citySeason()) { c.season = citySeason(); c.spots = {}; c.boss = 0; } cityAfterLoad(); }); }
function cityAfterLoad() { FD.cityReport = true; cityReport(true); cityApplyBuffs(); cityCheckEnding(); const f = cityFinal();
  /* 80%에 닿으면 누구든 처음 본 사람이 시즌 보스를 불러낸다(서버 규칙이 복구율을 다시 확인) */
  if (cityPct() >= 0.8 && (!nonEmpty(f) || Number(f.season || 0) !== citySeason() || (!('defeatedAt' in f) && Number(f.endsAt || 0) < cityMs())))
    call('cityFinalSpawn', false).then((r) => { if (r && r.spawned) { S.city.final = r.final || {}; cityFinalAlert(); } cityRefresh(); });
  if (finalActive()) cityFinalAlert(); cityRefresh(); }
function cityRefresh() { const el = document.querySelector('#cityCard'); if (el) el.outerHTML = cityCard(el.dataset.full === '1'); bindCityCard(); if (S.mode === 'hub') { const t = document.querySelector('#todoList'); if (t) redrawKeep(); } }
/* '시즌 보스 출현' 알림은 시즌마다 계정당 한 번만 */
function cityFinalAlert() { const f = cityFinal(), key = `final-s${citySeason()}`, lsKey = 'll_cityfinal_' + myUid(), c = cityData(), ns = isDict(S.P.notify_seen) ? S.P.notify_seen : {}; if (!isDict(c.seen)) c.seen = {};
  if (c.seen[key] || ('city-' + key) in ns) return; if (c.seen['final-' + String(f.id || '')] || `city-final-${String(f.id || '')}` in ns || `city-final-${citySeason()}` in ns) { c.seen[key] = true; return; }
  try { if (localStorage.getItem(lsKey) === key) { c.seen[key] = true; return; } localStorage.setItem(lsKey, key); } catch (_) {}
  const nm = String(f.name || ''), title = (nm.startsWith('시즌 보스') ? nm : '시즌 보스 ' + nm).trim() + ' 출현';
  actWhenFree(() => { cityData().seen[key] = true; notify('city-' + key, title, `Lv.${Number(f.level || 1)} · 72시간 안에 서버 전체가 쓰러뜨리면 이번 시즌이 마무리됩니다. 토벌 메뉴에서 10분마다 공격할 수 있습니다.`, 'party'); return true; }); }
function cityApplyBuffs() { let changed = false; const now = nowSec();
  for (const st of CL.STAGES) { if (!st.buff || cityPct() * 100 < Number(st.pct)) continue; const cur = isDict((S.P.positive || {})[st.buff]) ? S.P.positive[st.buff] : {}; if (!nonEmpty(cur) || Number(cur.until || 0) - now < 3 * 3600) changed = true; }
  if (!changed) return; actWhenFree(() => { let ch = false; for (const st of CL.STAGES) { if (!st.buff || cityPct() * 100 < Number(st.pct)) continue; const cur = isDict((S.P.positive || {})[st.buff]) ? S.P.positive[st.buff] : {}; if (!nonEmpty(cur) || Number(cur.until || 0) - nowSec() < 3 * 3600) if (grantPositiveId(st.buff, 12 * 3600)) ch = true; } return ch; }); }
function grantPositiveId(id, seconds) { const p = S.P; if (!BD.POSITIVES[id] || p.dead) return false; const q = clone(BD.POSITIVES[id]), now = nowSec(); q.until = now + seconds; q.tick = now; q.duration = seconds; if (!q.desc) q.desc = positiveDefText(q); if (!isDict(p.positive)) p.positive = {}; p.positive[id] = q; return true; }
const stageClaimable = (st) => !!st.claim && cityPct() * 100 >= Number(st.pct) && !cityData().claimed[`${citySeason()}-${Number(st.pct)}`];
function claimStage(pct) { const st = CL.STAGES.find((x) => Number(x.pct) === Number(pct)); if (!st || !stageClaimable(st)) return; const key = `${citySeason()}-${Number(st.pct)}`; cityData().claimed[key] = true;
  call('coopClaim', 'city-' + key).then((res) => { if (!res.ok) { toast(res.error || '이미 받은 보상입니다.'); rerender(); return; } const r = st.reward || {};
    coopGive({ coins: Number(r.coins || 0), items: r.items || {} }, `도시 복구 ${Number(st.pct)}% · ${st.title}`, () => { if (Number(r.money || 0) > 0) { S.P.money = Number(S.P.money) + Number(r.money); gLog('도시 복구 보급 · 금액 ' + won(Number(r.money))); } }); }); }
const finalWait = () => Math.max(0, Number(cityData().final_last || 0) + Number(CL.FINAL_GAP ?? 600) - nowSec());
function finalBlock() { const p = S.P; if (!cityOnline()) return '온라인 로그인 후 참여할 수 있습니다.'; if (!finalActive()) return '지금은 시즌 보스가 없습니다.'; if (Number(p.level) < 5) return 'Lv.5부터 참여할 수 있습니다.'; if (p.dead) return '사망 상태에서는 공격할 수 없습니다.'; if (nonEmpty(p.battle)) return '전투를 마친 뒤 공격하세요.';
  if (Number(p.hp) < Math.ceil(Number(p.max_hp) * 0.2)) return '체력이 20% 이상이어야 공격할 수 있습니다.'; if (Number(p.hunger) < 2 || Number(p.water) < 2) return '허기·수분이 각각 2 이상 필요합니다.'; if (finalWait() > 0) return '다음 공격까지 ' + leftText(finalWait() * 1000); return ''; }
function attackFinal() { const why = finalBlock(); if (why) { toast(why); return; } const f = cityFinal(), roll = bossDamage(f); cityData().final_last = nowSec();
  call('cityFinalAttack', String(f.id || ''), roll.dealt).then((res) => { if (!res.ok) { cityData().final_last = 'wait' in res ? nowSec() + Number(res.wait) - Number(CL.FINAL_GAP ?? 600) : 0; toast(res.error || '공격하지 못했습니다.'); return; }
    f.hp = Number(res.hp ?? f.hp ?? 0); S.city.final_mine = { dmg: Number(res.myDmg || 0), count: Number(res.myCount || 0) }; if (res.defeated) f.defeatedAt = cityMs();
    let line = `${f.name || ''}에게 ${Number(res.dealt || 0)} 피해${roll.crit ? ' · 치명타!' : ''}`; line += roll.evaded ? ' · 반격 회피' : ` · 반격으로 체력 -${roll.taken}`;
    let body = line + `\n남은 체력 ${comma(res.hp || 0)} · 내 누적 피해 ${comma(res.myDmg || 0)} (${Number(res.myCount || 0)}회)\n다음 공격은 10분 뒤에 할 수 있습니다.`; if (res.defeated) body += '\n\n마지막 일격! 시즌 보스가 쓰러졌습니다.';
    act(() => { const p = S.P, floor = guardActive() ? Math.max(1, guardHpFloor()) : 1; p.hp = Math.max(Math.min(Number(p.hp), floor), Number(p.hp) - roll.taken); p.hunger = Math.max(0, Number(p.hunger) - 1); p.water = Math.max(0, Number(p.water) - 1);
      const c = cityData(); c.boss = Number(c.boss) + 1; questEvent('city_points', Number(CL.BOSS_POINT ?? 3)); FD.cityReport = true; gLog('시즌 보스 · ' + line); return true; },
      () => { sfx(res.defeated ? 'complete' : 'notify'); modal('시즌 보스 공격', `<p style="white-space:pre-line;color:var(--text)">${esc(body)}</p>`); if (res.defeated) cityPull(true); else cityRefresh(); }); }); }
function finalReward(n) { const hits = Math.min(n, 12); return { xp: (80 + Number(S.P.level) * 3) * hits, coins: 10 * hits, money: 300 * hits, items: { '감염체 핵 정수': hits >= 3 ? 1 : 0, '토벌 경험의 서': hits >= 6 ? 1 : 0, '토벌 영웅의 각인': hits >= 10 ? 1 : 0, 부품: 2 * hits } }; }
function finalClaimable() { const f = cityFinal(); return nonEmpty(f) && 'defeatedAt' in f && Number(S.city?.final_mine?.count || 0) > 0 && !cityData().claimed['final-' + String(f.id || '')]; }
function claimFinal() { if (!finalClaimable()) return; const f = cityFinal(), id = String(f.id || ''), r = finalReward(Number(S.city.final_mine.count)); cityData().claimed['final-' + id] = true;
  call('coopClaim', 'final-' + id).then((res) => { if (!res.ok) { toast(res.error || '이미 받은 보상입니다.'); rerender(); return; } coopGive(r, `시즌 보스 토벌 보상 · 금액 ${won(r.money)} 포함`, () => { S.P.money = Number(S.P.money) + Number(r.money); }); }); }
function cityCheckEnding() { const f = cityFinal(); if (!nonEmpty(f) || !('defeatedAt' in f)) return; const key = `ending-${Number(f.season || 0)}`, c = cityData(); if (c.seen[key]) return;
  if (cityMs() - Number(f.defeatedAt) > 14 * 86400000) { c.seen[key] = true; return; }
  actWhenFree(() => { cityData().seen[key] = true; nhAdd(`city-ending-${Number(f.season || 0)}`, `시즌 ${Number(f.season || 0)} 보스 토벌 완료`, cityEndingText(Number(f.season || 0)), 'party'); return true; }); toast(`시즌 ${Number(f.season || 0)} 보스가 쓰러졌습니다 · 다음 시즌을 준비하고 있습니다`); }
function cityEndingText(sn) { let t = `시즌 ${sn} 보스가 쓰러졌습니다. 운영자가 다음 시즌을 열 때까지 '시즌 대기 중'입니다.\n· 다음 시즌이 열리면 도시 복구율이 0%에서 다시 시작합니다.\n· 밝힌 지도 · 불빛 일지 · 장비와 물품은 그대로 남습니다.`; if (finalClaimable()) t += '\n· 공격에 참여했다면 토벌 메뉴에서 보상을 받으세요.'; return t; }
function cityStageBar() { const p = cityPct(); return `<div class="stagebar"><div class="sbtrack"><i style="width:${p > 0 ? `max(10px, ${p * 100}%)` : '0'}"></i>${CL.STAGES.filter((st) => Number(st.pct) < 100).map((st) => `<em style="left:${st.pct}%" class="${p * 100 >= st.pct ? 'on' : ''}"></em>`).join('')}</div><div class="sblabels">${CL.STAGES.map((st) => `<span style="left:${st.pct}%" class="${p * 100 >= st.pct ? 'on' : ''} ${st.pct >= 100 ? 'end' : ''}">${st.pct}%${S.mobile ? '' : ' ' + esc(st.short)}</span>`).join('')}</div></div>`; }
function cityFinalHtml() { const f = cityFinal(); let h = '<hr class="csep">';
  if (finalActive()) { const mine = isDict(S.city.final_mine) ? S.city.final_mine : {}, why = finalBlock();
    h += `<b style="color:var(--danger);font-size:17px">${esc(f.name || '시즌 보스')}</b><p class="muted" style="font-size:12px;margin:0">Lv.${Number(f.level || 1)} · 남은 시간 ${leftText(Number(f.endsAt || 0) - cityMs())} · 모두가 같은 체력을 깎습니다</p>`;
    h += `<div class="bar" style="height:12px"><i style="width:${Math.max(0, Math.min(100, 100 * Number(f.hp || 0) / Math.max(1, Number(f.maxHp || 1))))}%;background:var(--danger)"></i></div><b style="font-size:13px">체력 ${comma(f.hp || 0)} / ${comma(f.maxHp || 0)}</b>`;
    if (Number(mine.count || 0) > 0) h += `<span class="muted" style="font-size:12px">내 누적 피해 ${comma(mine.dmg || 0)} · ${Number(mine.count)}회</span>`;
    h += `<button class="btn ${why ? '' : 'dangerfill'} big" data-cf="attack" ${why ? 'disabled' : ''} style="${why ? 'color:var(--danger)' : ''}">${esc(why || '공격하기')}</button>`; }
  else if (finalClaimable()) { const r = finalReward(Number(S.city.final_mine.count)); h += `<b style="color:var(--accent);font-size:17px">시즌 보스 토벌 완료</b><button class="btn warnfill big" data-cf="claim">토벌 보상 받기 · 경험치 ${r.xp} · 코인 ${r.coins} · 금액 ${won(r.money)}</button>`; }
  else { const left = Math.max(0, 80 - Math.floor(cityPct() * 100)); h += `<b style="font-size:15px">시즌 보스</b><p class="muted" style="font-size:12px;margin:0">${left > 0 ? `도시 복구율 80%가 되면 서버 전체 토벌이 열립니다. 쓰러뜨리면 이번 시즌이 마무리됩니다. 출현까지 복구율 ${left}% 남음` : '곧 시즌 보스가 나타납니다.'}</p>`; }
  if (S.admin) h += '<button class="btn sm" data-cf="gmspawn" style="color:var(--subtle)">GM · 시즌 보스 바로 소환(시험)</button>'; return h; }
const stageBtns = () => CL.STAGES.filter(stageClaimable).map((st) => `<button class="btn warnfill wrap" data-cs="${st.pct}">${st.pct}% 보상 받기 · ${esc(String(st.desc).replace('서버 전원 · ', ''))}</button>`).join('');
function cityCard(full = false) { const head = `<div class="h" style="color:var(--warning)">함께 밝히는 도시<span>서버 전체${citySeason() > 0 ? ' · 시즌 ' + citySeason() : ''}</span></div>`, open = `<section class="panel city" id="cityCard" data-full="${full ? 1 : 0}">`;
  if (!cityOnline()) return `${open}${head}<b style="font-size:20px">도시 복구율</b><span class="muted" style="font-size:12px">로그인하면 모든 생존자가 함께 밝힌 도시 복구율을 볼 수 있습니다. 내 탐사와 토벌이 조금씩 보태집니다.</span></section>`;
  cityPull(false); if (!S.city) return `${open}${head}<span class="muted">도시 복구율을 불러오는 중입니다…</span></section>`;
  if (cityWaiting()) { const f = cityFinal(); let h = `${open}${head}<b style="font-size:20px">시즌 ${citySeason()} 완료 · 다음 시즌 대기 중</b><span class="muted" style="font-size:12px">시즌 보스를 쓰러뜨렸습니다. 운영자가 다음 시즌을 열면 도시 복구율이 0%에서 다시 시작합니다. 그동안의 탐사와 토벌은 복구율에 보태지지 않습니다.</span>${cityStageBar()}`;
    h += `<b style="font-size:13px">이번 시즌 생존자들이 밝힌 정도 ${comma(cityTotal())} / ${comma(cityGoal())} · 내 기여 ${comma(S.city.mine || 0)}점</b>${stageBtns()}<hr class="csep"><b style="color:var(--accent);font-size:15px">${esc(f.name || '시즌 보스')} 토벌 완료</b>`;
    if (finalClaimable()) { const r = finalReward(Number(S.city.final_mine.count)); h += `<button class="btn warnfill big wrap" data-cf="claim">토벌 보상 받기 · 경험치 ${r.xp} · 코인 ${r.coins} · 금액 ${won(r.money)}</button>`; }
    if (S.admin) h += `<button class="btn warnfill" data-cf="gmnext">GM · 다음 시즌 열기 (시즌 ${citySeason() + 1})</button>`; return h + '</section>'; }
  const p100 = Math.floor(cityPct() * 100), nxt = CL.STAGES.find((st) => p100 < st.pct), c = cityData();
  let h = `${open}${head}<div class="cityhead"><b style="font-size:${S.mobile ? 20 : 22}px">도시 복구율 ${p100}%</b>${nxt ? `<span class="muted" style="font-size:12px">다음 ${nxt.pct}% · ${esc(nxt.title)}</span>` : ''}</div>${cityStageBar()}`;
  h += `<div class="cstats">${[['생존자들이 밝힌 정도', `${comma(cityTotal())} / ${comma(cityGoal())}`], ['이번 시즌 내 기여', `${comma(cityPoints())}점 · 구역 ${Object.keys(c.spots).length} · 토벌 ${Number(c.boss || 0)}회`], ['지금까지 밝힌 구역', `${comma(Object.keys(visitedSet()).length)}곳 · 다 밝힌 지역 ${GD.REGIONS.filter((_, gi) => regionLit(gi)).length}곳`]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;
  h += stageBtns();
  if (full) h += cityFinalHtml(); else { const fl = finalActive() ? '시즌 보스 출현 중 · 토벌 메뉴에서 함께 공격하세요' : finalClaimable() ? '시즌 보스 토벌 보상을 받을 수 있습니다 · 토벌 메뉴' : '복구율 80%가 되면 시즌 보스가 나타납니다'; h += `<button class="btn wrap cfin" data-go="coop" style="${finalActive() ? 'color:var(--danger)' : ''}">${fl}</button>`; }
  h += `<p class="subtle" style="font-size:11px;margin:0">이번 시즌에 탐사한 서로 다른 구역 1곳마다 Lv.1~29 구역 1점 · Lv.30~59 구역 2점 · Lv.60 이상 구역 3점, 토벌 공격 1회 ${CL.BOSS_POINT ?? 3}점을 보탭니다(전에 밝힌 곳도 시즌마다 새로 셈 · 1인 최대 ${comma(CL.MAX_POINTS ?? 1500)}점). 순위는 없습니다.</p>`;
  return h + '</section>'; }
function bindCityCard() { const el = $('cityCard'); if (!el) return; el.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); el.querySelectorAll('[data-cs]').forEach((b) => { b.onclick = () => claimStage(b.dataset.cs); });
  el.querySelectorAll('[data-cf]').forEach((b) => { const k = b.dataset.cf; b.onclick = () => { if (k === 'attack') attackFinal(); else if (k === 'claim') claimFinal();
    else if (k === 'gmspawn') call('cityFinalSpawn', true).then((r) => { toast(r.spawned ? '소환됨' : r.error || '소환하지 못했습니다.'); cityPull(true); });
    else if (k === 'gmnext') { if (!cityWaiting()) { toast('시즌 보스를 쓰러뜨린 뒤에 다음 시즌을 열 수 있습니다.'); return; } call('cityAdvanceGM', citySeason()).then((r) => { toast(r.ok ? josaFix(`시즌 ${Number(r.season ?? citySeason() + 1)}을(를) 열었습니다.`) : r.error || '다음 시즌을 열지 못했습니다.'); if (r.ok) cityPull(true); }); } }; }); }
function bindHub() {
  bindCityCard(); document.querySelectorAll('#center [data-todoclaim]').forEach((b) => { b.onclick = claimAllInbox; });
  { const l = $('autoLogB'), st = $('autoStopB'); if (l) l.onclick = autoLogModal; if (st) st.onclick = autoStopConfirm; }
  document.querySelectorAll('#center [data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  document.querySelectorAll('[data-hub]').forEach((b) => { const k = b.dataset.hub; if (HUB_ACT[k]) { b.onclick = HUB_ACT[k]; return; } b.onclick = () => go('hub'); });
}
function menuPage() { const claim = questClaimableN(), unread = nhUnread().length, sp = Number(S.P.skill_points || 0), badges = { quests: claim > 0 ? `보상 ${claim}` : '', stats: sp > 0 ? `+${sp}` : '' };
  const ic = (k) => svg((M.MENU_ICON_PATHS || {})[k] || (M.NAV_ICON_PATHS || {})[{ hub: 'home', explore: 'compass', inventory: '가방', friends: '함께', journal: '기록' }[k] || '생존'], 2);
  let h = headT('메뉴', '필요한 곳을 눌러 바로 가세요 · 진행은 자동 저장');
  h += `<div class="mquick">${[['settings', '설정', 'var(--accent)'], ['notifications', '알림' + (unread > 0 ? ' ' + unread : ''), unread > 0 ? 'var(--warning)' : 'var(--blue)'], ['guide', '게임 설명', 'var(--morale)']].map(([k, l, c]) => `<button class="mq" style="--c:${c}" data-m="${k}">${ic(k)}<b>${esc(l)}</b></button>`).join('')}</div>`;
  const groups = [['캐릭터 · 계정', [['캐릭터 바꾸기', 'chars'], ['캐릭터 설정', 'profile'], ['계정', 'account']]], ...M.NAV_GROUPS];
  for (const [g, items] of groups) { h += groupLab(g) + `<div class="mgrid">${items.filter(([, m]) => (m !== 'admin' || S.admin) && m !== 'guide' && (m !== 'casino' || Number(S.P.level || 1) >= 5)).map(([lab, m]) => { const col = m === 'admin' ? 'var(--danger)' : badges[m] ? 'var(--warning)' : 'var(--accent)';
    return `<button class="mtile" style="--c:${col}" data-m="${m}"><i>${ic(m)}</i><span><b>${esc(lab)}${badges[m] ? `<em>${esc(badges[m])}</em>` : ''}</b><small>${esc(M.MENU_DESC[m] || '')}</small></span></button>`; }).join('')}</div>`; }
  return h + choiceRow('', '타이틀로', '', 'var(--muted)', true, 'data-m="@title"'); }


/* ════════ 가방(인벤토리) — main.gd _render_inventory · _slot_tile · _slot_button 그대로 ════════ */
const IC = D.items_catalog, GEAR = D.gear_data, ED = D.expedition_data;
const INV = { tab: '소모품', tag: '전체', order: '태그', q: '', sel: '' };
const INV_GEAR_TAGS = ['무기', '방어구', '머리', '도구', '악세사리', '탈것'];
const FUNC_TAG_ORDER = ['의약품', '음식', '음료', '전투', '강화', '사기', '탄약', '미끼', '반려동물', '생선', '식재료', '의료 재료', '제작 재료', '희귀 재료', '기타'];
const TAG_ORDER = INV_GEAR_TAGS.concat(FUNC_TAG_ORDER);
const RO_MSG = '지금은 할 수 없는 동작입니다.';
const isLight = () => !!(M.THEMES[S.theme] || {}).light;
const cat = (it) => IC.items[it] || { tab: tabOfRaw(it), tag: '', ftag: '기타', slot: '', rank: 0, grade: 'F', effect: '', body: '', sell: 1, icon: 'box', heal: '' };
function tabOfRaw(it) { if (GEAR.ITEMS[it] || GD.WEAPONS[it] || GD.ARMORS[it] || BD.MOVE_ITEMS[it]?.move) return '장비'; return (GD.ITEMS[it]?.cat || '재료') === '재료' ? '재료' : '소모품'; }
const tabOf = (it) => cat(it).tab;
const count = (it) => Number(S.P.inventory?.[it] || 0);
const won = (n) => comma(n) + '원';
function gradeColor(it) { const r = cat(it).rank; return '#' + String((isLight() ? IC.grade_colors_light : IC.grade_colors)[r] || 'a3b8b3').replace('#', '').slice(0, 6); }
function catColorForTag(t) {
  const m = { '무기': 'var(--danger)', '방어구': 'var(--blue)', '머리': '#4fc3c7', '도구': '#e09a4f', '악세사리': '#d17fd8', '탈것': '#8fb86b', '회복': 'var(--accent)', '의약품': 'var(--accent)', '의료 재료': 'var(--accent)', '음식': 'var(--warning)', '식재료': 'var(--warning)', '음료': 'var(--blue)', '전투': 'var(--danger)', '탄약': 'var(--danger)', '강화': '#c297ff', '사기': '#e88fb4', '미끼': '#6cb6ff', '생선': '#6cb6ff', '유틸': '#c297ff', '희귀 재료': '#f0c674' };
  return m[t] || 'var(--muted)';
}
const slotCap = (tab) => Number((S.P.slots || {})[tab] ?? GD.START_SLOTS);
const tabItems = (tab) => Object.keys(S.P.inventory || {}).filter((it) => count(it) > 0 && tabOf(it) === tab);
const slotsUsed = (tab) => tabItems(tab).reduce((a, it) => a + Math.ceil(count(it) / 99), 0);
const mobility = () => (S.P.mobility && typeof S.P.mobility === 'object' ? S.P.mobility : {});
const isWorn = (it) => Object.values(S.P.equipment || {}).includes(it) || Object.values(mobility()).includes(it);
const equippedLast = (it) => isWorn(it) && count(it) <= 1;
function invItemTag(it) { if (INV.tab === '장비') { let sl = cat(it).slot; if (!sl) sl = BD.MOVE_ITEMS[it] ? '탈것' : '기타'; return sl; } return cat(it).ftag; }
function invTags() { const out = []; tabItems(INV.tab).forEach((it) => { const t = invItemTag(it); if (!out.includes(t)) out.push(t); }); const oi = (t) => (TAG_ORDER.includes(t) ? TAG_ORDER.indexOf(t) : 99); return out.sort((a, b) => oi(a) - oi(b)); }
function invSorted(list) {
  const out = list.filter((it) => INV.tag === '전체' || invItemTag(it) === INV.tag);
  const rk = (x) => cat(x).rank, lv = (x) => Number(GD.ITEMS[x]?.level ?? GD.ITEMS[x]?.found_level ?? 0), ti = (x) => { const t = invItemTag(x); return TAG_ORDER.includes(t) ? TAG_ORDER.indexOf(t) : 99; };
  const nm = (a, b) => (a < b ? -1 : a > b ? 1 : 0); /* Godot 문자열 비교(코드 순서)와 같게 */
  const by = { '등급': (a, b) => rk(b) - rk(a) || nm(a, b), '레벨': (a, b) => lv(b) - lv(a) || nm(a, b), '이름': nm, '태그': (a, b) => ti(a) - ti(b) || rk(b) - rk(a) || nm(a, b) }[INV.order];
  return out.sort(by);
}
const invKey = (t) => { let s = String(t).trim().toLowerCase().replace(/ /g, ''); if (s.startsWith('[')) s = s.slice(1); if (s.endsWith(']')) s = s.slice(0, -1); return s; };
const invKeyOf = (it) => { const c = cat(it); return `${it} [${c.tag}] ${c.tab} ${c.tag ? '[' + c.tag + '] ' : ''}${it} ${c.grade}급`.toLowerCase().replace(/ /g, ''); };

/* ── 능력치(balance_data.derived + main._derived + combat_balance.final_caps) ── */
const softStat = (v) => Math.min(Math.max(0, v), 30) + Math.max(0, v - 30) * 0.5;
const snap = (v, s = 0.1) => Math.round(v / s) * s;
const nowSec = () => TNOW || Math.floor(Date.now() / 1000);
const DUR_MAX = 100;
const durApplies = (it) => !!(GD.WEAPONS[it] || GD.ARMORS[it] || (GEAR.ITEMS[it] && ['무기', '방어구'].includes(String(GEAR.ITEMS[it].slot))));
const durValue = (it) => (durApplies(it) ? Math.max(0, Math.min(DUR_MAX, Number((S.P.durability || {})[it] ?? DUR_MAX))) : DUR_MAX);
function workingEq(eq) {
  const w = String(eq['무기'] || ''), a = String(eq['방어구'] || '');
  const wb = w && durApplies(w) && count(w) > 0 && durValue(w) <= 0, ab = a && durApplies(a) && count(a) > 0 && durValue(a) <= 0;
  if (!wb && !ab) return eq; const e = { ...eq }; if (wb) delete e['무기']; if (ab) delete e['방어구']; return e;
}
function gearMods(eq) { const r = {}; for (const slot of GEAR.SLOTS) { const g = GEAR.ITEMS[String(eq[slot] || '')]; if (!g) continue; for (const k in g.mods) r[k] = (r[k] || 0) + Number(g.mods[k]); } return r; }
function effStats(eq) { const st = { ...(S.P.stats || {}) }, mods = gearMods(workingEq(eq)); for (const k of BD.STATS) st[k] = Math.max(1, Math.trunc(Number(st[k] ?? 1)) + Math.trunc(Number(mods[k] || 0))); return st; }
function weaponDmg(eq) { const w = String(eq['무기'] || ''); if (w && durApplies(w) && count(w) > 0 && durValue(w) <= 0) return 4; return GD.WEAPONS[w] && count(w) > 0 ? Number(GD.WEAPONS[w].dmg) : 4; }
function armorDef(eq) { const a = String(eq['방어구'] || ''); if (a && durApplies(a) && count(a) > 0 && durValue(a) <= 0) return 0; return GD.ARMORS[a] && count(a) > 0 ? Number(GD.ARMORS[a].def) : 0; }
const maxHealth = (st) => 60 + Math.trunc(Number(st['체력'] ?? 3)) * 5 + Math.max(0, Math.trunc(Number(st['생존력'] ?? 0)) - BD.OVF_SV) * 2;
function derived(eq = S.P.equipment || {}) {
  const stats = effStats(eq), st = Number(stats['힘'] ?? 2), vit = Number(stats['체력'] ?? 3), ag = Number(stats['민첩'] ?? 2), it = Number(stats['지능'] ?? 2), sv = Number(stats['생존력'] ?? 2);
  const d = { attack: weaponDmg(eq) + Math.trunc(softStat(st) * 1.6), crit: 2 + 20 * ag / (ag + 50), crit_dmg: Math.min(CB.CRIT_DAMAGE_CAP, 125 + Math.trunc(st * 0.35)), evade: 2 + 20 * ag / (ag + 60), defense: snap(armorDef(eq) + vit * 0.25 + sv * 0.2),
    flee: Math.min(88, 35 + Math.min(42, ag * 0.5) + Math.min(10, sv * 0.25)), retreat: Math.min(90, 30 + ag * 0.5 + sv * 0.3 + it * 0.2), loot: Math.min(75, 40 + it * 0.35 + sv * 0.25), rare: Math.min(10, 1 + it * 0.08), recover: 100 + Math.min(50, sv * 0.65), xp_bonus: Math.min(70, it * 0.7), craft_bonus: Math.min(50, it) };
  const buffs = S.P.buffs || {}, now = nowSec();
  const pos = Object.keys(S.P.positive || {}).filter((id) => BD.POSITIVES[id] && Number(S.P.positive[id]?.until || 0) > now);
  if (!pos.includes('vigor')) d.attack += Math.trunc(Number(buffs.buff_atk || 0));
  if (!pos.includes('protected')) d.defense += Number(buffs.buff_def || 0);
  if (!pos.includes('focus')) d.evade += Number(buffs.buff_evade || 0);
  const comp = (id) => { const c = (S.P.companions || {})[id] || {}; return !!S.P.party_formed && !!c.active && !!c.joined; };
  if (comp('doyun')) { d.evade += 3; d.loot += 5; } if (comp('cheolmin')) d.defense += 2; if (comp('seoyeon')) d.recover += 8; if (comp('mirae')) d.craft_bonus += 12;
  for (const id of pos) { const p = S.P.positive[id]; d.attack += Math.trunc(Number(p.atk || 0)); d.crit += Number(p.crit || 0); d.evade += Number(p.evade || 0); d.defense += Number(p.def || 0); d.xp_bonus += Number(p.xp || 0); d.loot += Number(p.loot || 0); d.rare += Number(p.rare || 0); d.flee += Number(p.flee || 0); d.recover += Number(p.recover || 0); }
  const act = Object.keys(ED.CONDITIONS).filter((id) => S.P.conditions?.[id] && Number(S.P.conditions[id].until || 0) > now);
  if (act.includes('infection')) { d.attack = Math.max(1, Math.trunc(d.attack * 0.92)); d.evade = Math.max(0, d.evade - 3); }
  if (act.includes('sprain')) { d.evade = Math.max(0, d.evade - 5); d.flee = Math.max(0, d.flee - 7); d.retreat = Math.max(0, d.retreat - 7); }
  for (const id of act) { const mods = ED.CONDITIONS[id].mods || {}; if (mods.atk_pct != null) d.attack = Math.max(1, Math.trunc(d.attack * (1 + Number(mods.atk_pct) / 100))); if (mods.def != null) d.defense = Math.max(0, d.defense + Number(mods.def));
    for (const [a, b] of [['crit', 'crit'], ['evade', 'evade'], ['flee', 'flee'], ['retreat', 'retreat'], ['loot', 'loot'], ['rare', 'rare'], ['recover', 'recover'], ['xp', 'xp_bonus']]) if (mods[a] != null) d[b] = Math.max(0, d[b] + Number(mods[a])); }
  for (const k of ['crit', 'evade']) d[k] = snap(Math.min(60, d[k]));
  for (const k of ['flee', 'retreat', 'loot', 'rare', 'recover', 'xp_bonus', 'craft_bonus', 'defense']) d[k] = snap(d[k]);
  const g = gearMods(workingEq(eq)); for (const k of ['attack', 'defense', 'crit', 'evade', 'loot', 'recover']) d[k] = Number(d[k] || 0) + Number(g[k] || 0);
  d.xp_bonus += Number(g.xp || 0); d.rare += Number(g.rare || 0);
  /* final_caps */
  d.attack = Math.max(1, Math.trunc(d.attack)); d.defense = Math.max(0, d.defense);
  d.crit = snap(Math.min(Math.max(d.crit, 0), CB.CRIT_CAP)); d.evade = snap(Math.min(Math.max(d.evade, 0), CB.EVADE_CAP)); d.crit_dmg = Math.min(Math.max(Math.trunc(d.crit_dmg), 100), CB.CRIT_DAMAGE_CAP);
  for (const [k, cap] of [['loot', 90], ['rare', 15], ['flee', 88], ['retreat', 90], ['recover', CB.RECOVER_CAP], ['xp_bonus', 80], ['craft_bonus', 60]]) d[k] = snap(Math.min(Math.max(Number(d[k] || 0), k === 'recover' ? 100 : 0), cap));
  return d;
}
function gearCompare(it) {
  const c = cat(it), eq = S.P.equipment || {};
  if (!c.slot && c.move != null) {
    const ms = c.mcat === '탈것' ? '탈것' : '이동', cur = String(mobility()[ms] || '');
    if (cur === it) return { same: true, slot: ms, current: cur };
    const dv = (Number(c.move) - Number(BD.MOVE_ITEMS[cur]?.move ?? 1)) * 100;
    return { slot: ms, current: cur, rows: Math.abs(dv) >= 0.5 ? [`이동속도 ${dv >= 0 ? '+' : ''}${Math.round(dv)}%`] : [], score: dv / 10, verdict: dv > 0.5 ? '더 좋음' : dv < -0.5 ? '더 나쁨' : '비슷함', drawback: false };
  }
  if (!c.slot) return null;
  const cur = String(eq[c.slot] || ''); if (cur === it) return { same: true, slot: c.slot, current: cur };
  const before = derived(eq), hb = maxHealth(effStats(eq)), eq2 = { ...eq, [c.slot]: it }, after = derived(eq2), ha = maxHealth(effStats(eq2));
  const rows = []; let score = 0;
  for (const [k, lab, w, pct] of [['attack', '공격력', 1, false], ['defense', '방어력', 1.2, false], ['crit', '치명타', 0.8, true], ['evade', '회피', 0.8, true], ['loot', '획득률', 0.3, true], ['recover', '회복 효율', 0.2, true]]) {
    const dv = Number(after[k] || 0) - Number(before[k] || 0); if (Math.abs(dv) < 0.05) continue; score += dv * w;
    rows.push(pct ? `${lab} ${dv >= 0 ? '+' : ''}${dv.toFixed(1)}%` : `${lab} ${Math.round(dv) >= 0 ? '+' : ''}${Math.round(dv)}`);
  }
  if (ha !== hb) { score += (ha - hb) * 0.1; rows.push(`최대 체력 ${ha - hb >= 0 ? '+' : ''}${ha - hb}`); }
  return { slot: c.slot, current: cur, rows, score, verdict: score > 0.9 ? '더 좋음' : score < -0.9 ? '더 나쁨' : '비슷함', drawback: !!c.drawback };
}
function usePreview(it) {
  const d = GD.ITEMS[it] || {}, rows = [];
  for (const [k, lab, mx] of [['hp', '체력', 1], ['hunger', '허기', 0], ['water', '수분', 0], ['morale', '사기', 0]]) { if (d[k] == null) continue; const now = Number(S.P[k] || 0), cap = mx ? Number(S.P.max_hp) : 100; rows.push(`${lab} ${now} → ${Math.max(0, Math.min(cap, now + Number(d[k])))}`); }
  return rows.length ? '사용하면 · ' + rows.join(' · ') : '';
}
function shortEffect(it) {
  const c = cat(it); let body = String(c.body || ''); if (!body || body === '제작 재료') return '';
  if (!GEAR.ITEMS[it] && !GD.WEAPONS[it] && !GD.ARMORS[it] && String(GD.ITEMS[it]?.desc || '') === body) return '';
  body = body.replace('무기 · ', '').replace('방어구 · ', '').replace('전투: ', '');
  const cut = body.indexOf(' · 대가:'); if (cut > 0) body = body.slice(0, cut) + ' · 대가 있음';
  const lv = body.indexOf('Lv.'); if (lv >= 0) { const dot = body.indexOf(' · ', lv); if (dot > 0) body = body.slice(0, lv) + body.slice(dot + 3); }
  if (body.startsWith('[') && body.indexOf('] ') > 0) body = body.slice(body.indexOf('] ') + 2);
  return body.trim();
}
const autoFood = () => { const c = S.P.auto_food && typeof S.P.auto_food === 'object' ? S.P.auto_food : {}; return { on: c.on ?? true, off: c.off && typeof c.off === 'object' ? c.off : {} }; };
const itemIcon = (it, col, px = 26) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${IC.icons[cat(it).icon] || IC.icons.box}"/></svg>`;

function invStacks() { const out = []; for (const it of invSorted(tabItems(INV.tab))) { let left = count(it), i = 0; while (left > 0) { const n = Math.min(99, left); out.push({ it, n, i }); left -= n; i++; } } return out; }
function slotTile({ it, n, i }) {
  const col = gradeColor(it), sel = it === INV.sel && i === 0, worn = i === 0 && isWorn(it), heal = cat(it).heal;
  let badge = '';
  if (worn) badge = '<span class="t-worn">장착 중</span>';
  else if (i === 0 && tabOf(it) === '장비') { const c = gearCompare(it); if (c && !c.same && c.verdict !== '비슷함') badge = c.verdict === '더 좋음' ? '<span class="t-cmp up">▲ 좋음</span>' : '<span class="t-cmp dn">▼ 나쁨</span>'; }
  const hc = heal.startsWith('체력') ? 'var(--accent)' : heal.startsWith('허기') ? 'var(--warning)' : 'var(--blue)';
  return `<button class="tile${sel ? ' sel' : ''}${worn ? ' worn' : ''}" data-inv="${esc(it)}" data-k="${esc(invKeyOf(it))}">${badge}${itemIcon(it, col)}<b>${esc(it)}</b>${heal ? `<span class="t-heal" style="color:${hc}">${esc(heal)}</span>` : ''}<span class="t-n">×${n}</span></button>`;
}
function slotButton({ it, n, i }) {
  const col = gradeColor(it), sel = it === INV.sel, worn = i === 0 && isWorn(it), c = cat(it), light = isLight();
  const cmp = c.slot ? gearCompare(it) : null; let ct = '';
  if (cmp && !cmp.same && !worn) { if (cmp.verdict === '더 좋음') ct = ' · ▲ 더 좋음'; else if (cmp.verdict === '더 나쁨') ct = ' · ▼'; }
  const rest = light ? `color-mix(in srgb, ${col} 55%, transparent)` : mix(col, '#000000', 0.55);
  const edge = worn ? 'var(--accent)' : sel ? col : rest, bw = worn ? 3 : sel ? 2 : 1;
  const bg = sel ? `color-mix(in srgb, ${col} 12%, var(--panel2))` : light ? `color-mix(in srgb, ${col} 7%, var(--panel2))` : 'var(--panel2)';
  const fx = shortEffect(it);
  return `<button class="mslot" data-inv="${esc(it)}" data-k="${esc(invKeyOf(it))}" style="--c:${col};border:${bw}px solid ${edge};background:${bg};padding:${6 - (bw - 1)}px ${8 - (bw - 1)}px"><span class="h"><span class="ht" style="color:${ct.includes('▲') ? 'var(--accent)' : col}">${c.tag ? '[' + esc(c.tag) + '] · ' : '등급 · '}${esc(c.grade)} · ×${n}${ct}</span>${worn ? '<span class="wb">장착 중</span>' : ''}</span><b>${esc(it)}</b>${fx ? `<small>${esc(fx)}</small>` : ''}</button>`;
}
function compareCard(c) {
  if (c.same) return `<div class="cmpc same"><b style="color:var(--accent)">지금 [${esc(c.slot)}]에 장착 중</b></div>`;
  const v = c.verdict, cls = v === '더 좋음' ? 'up' : v === '더 나쁨' ? 'dn' : 'eq';
  return `<div class="cmpc ${cls}"><div class="hr"><span class="muted">[${esc(c.slot)}] ${esc(c.current || '비어 있음')}와(과) 비교</span><span class="vchip">${v === '더 좋음' ? '▲ ' : v === '더 나쁨' ? '▼ ' : '＝ '}${esc(v)}</span></div>
    ${c.rows.length ? `<div class="rows">${c.rows.map((r) => { const sp = r.lastIndexOf(' '), nm = r.slice(0, sp), val = r.slice(sp + 1), up = val.startsWith('+'); return `<span>${esc(nm)} <b style="color:${up ? 'var(--accent)' : 'var(--danger)'}">${up ? '▲' : '▼'} ${esc(val)}</b></span>`; }).join('')}</div>` : '<span class="muted">능력치 변화 없음</span>'}
    ${c.drawback ? '<span style="color:var(--warning);font-size:12px">이 장비에는 대가(부정 효과)가 있습니다.</span>' : ''}</div>`;
}
function invDetail() {
  if (!INV.sel) return `<div class="panel invhint"><p>같은 물품은 한 칸에 최대 99개입니다. 칸을 눌러 사용 · 장착 · 분해 · 버리기를 선택하세요.</p></div>`;
  const it = INV.sel, c = cat(it), eq = S.P.equipment || {};
  const desc = [c.effect]; if (isWorn(it)) desc.push('장착 중'); desc.push('판매가 ' + won(c.sell));
  let dur = ''; if (durApplies(it) && count(it) > 0) { const v = durValue(it); dur = v <= 0 && it === String(eq['무기'] || '') ? '내구도 0 / 100 · 수리 전까지 맨주먹' : v <= 0 && it === String(eq['방어구'] || '') ? '내구도 0 / 100 · 수리 전까지 맨몸' : `내구도 ${v} / 100`; }
  const up = usePreview(it), cmp = gearCompare(it);
  let main = '';
  if (GD.WEAPONS[it] || GD.ARMORS[it] || GEAR.ITEMS[it] || BD.MOVE_ITEMS[it]?.move != null) { const on = isWorn(it); main = `<button class="btn primary big" data-act="use" data-item="${esc(it)}" ${on ? 'disabled' : ''}>${on ? '장착 중' : '장착'}</button>`; }
  else if (c.usable && GD.ITEMS[it]?.pet_only && !GD.ITEMS[it]?.repair) main = `<button class="btn primary big" data-petgo>반려동물 메뉴에서 사용</button>`;
  else if (c.usable) main = `<button class="btn primary big" ${canUseHere(it) ? `data-act="use" data-item="${esc(it)}"` : 'disabled'}>사용</button>`;
  const last = equippedLast(it), af = autoFood();
  const small = [];
  if (c.afh || c.afw) { const off = !!af.off[it]; small.push(`<button class="btn sm" data-act="afitem" data-item="${esc(it)}" ${af.on ? '' : 'disabled'} style="color:${off || !af.on ? 'var(--muted)' : 'var(--accent)'}">${af.on ? (off ? '자동 사용 · 꺼짐' : '자동 사용 · 켜짐') : '자동 사용 · 전체 꺼짐'}</button>`); }
  if (c.mat) small.push(`<button class="btn sm" style="color:var(--blue)" data-act="craftmat" data-item="${esc(it)}">제작</button>`);
  small.push(`<button class="btn sm" data-act="discardall" data-item="${esc(it)}" ${last ? 'disabled' : ''}>모두 버리기</button>`);
  if (INV.tab === '소모품') small.push(`<button class="btn sm" data-act="afall">자동 먹고 마시기 · ${af.on ? '켜짐' : '꺼짐'}</button>`);
  return `<div class="panel invdet"><b class="nm">${esc(it)} × ${count(it)}</b><p class="muted">${esc(desc.join(' · '))}</p>${dur ? `<p style="color:var(--warning)">${esc(dur)}</p>` : ''}${up ? `<p style="color:var(--accent)">${esc(up)}</p>` : ''}${cmp ? compareCard(cmp) : ''}
    ${main}<div class="two">${c.dis ? `<button class="btn" data-act="dismantle" data-item="${esc(it)}" ${last ? 'disabled' : ''}>분해</button>` : ''}<button class="btn danger" data-act="discard" data-item="${esc(it)}" ${last ? 'disabled' : ''}>버리기</button></div><div class="smalls">${small.join('')}</div></div>`;
}
function giftsRow() {
  const st = S.P.stored_loot && typeof S.P.stored_loot === 'object' ? S.P.stored_loot : {}, n = Object.keys(st).length; if (!n) return '';
  const open = !!INV.giftOpen;
  return choiceRow(1, `받은 물품함 · ${n}건` + (open ? '  · 접기' : '  · 펼치기'), '관리자 지급 · 교환 · 가방이 꽉 차서 넘친 물품이 모입니다 · 누르면 ' + (open ? '접습니다.' : '펼칩니다.'), 'var(--warning)', true, 'id="gRow"') +
    (open ? choiceRow(2, `가방으로 모두 받기 · ${n}종`, Object.keys(st).map((k) => `${k} × ${Number(st[k])}`).join(', ').slice(0, 120) + ' · 가방이 꽉 차면 남은 것은 계속 보관', 'var(--accent)', true, 'data-act="claim"') : '');
}
function inventoryPage() {
  const d = derived(), eq = S.P.equipment || {};
  const sub = `무기 ${eq['무기'] || '맨손'} (공격력 ${Math.trunc(d.attack)}) · 방어구 ${eq['방어구'] || '없음'} (방어력 ${Math.trunc(d.defense)})`;
  if (INV.sel && (count(INV.sel) <= 0 || tabOf(INV.sel) !== INV.tab)) INV.sel = '';
  const stacks = invStacks();
  if (!INV.sel && stacks.length && !S.mobile) INV.sel = stacks[0].it;
  const tabs = `<div class="ptabs">${GD.TABS.map((t) => `<button data-itab="${t}" aria-pressed="${t === INV.tab}">${t} ${slotsUsed(t)}/${slotCap(t)}</button>`).join('')}</div>`;
  let sortbar = '';
  if (S.mobile) {
    const tags = ['전체', ...invTags()]; if (!tags.includes(INV.tag)) INV.tag = '전체';
    sortbar = `<div class="tagrow">${tags.map((t) => `<button data-itag="${esc(t)}" style="--c:${catColorForTag(t)}" aria-pressed="${INV.tag === t}">${esc(t)}</button>`).join('')}</div>
      <div class="tagrow sort"><span>정렬</span>${['태그', '등급', '레벨', '이름'].map((o) => `<button data-iord="${o}" style="--c:var(--muted)" aria-pressed="${INV.order === o}">${o}${o === '태그' ? '별' : '순'}</button>`).join('')}</div>`;
  }
  const search = `<div class="isearch"><input id="invQ" placeholder="가방 검색 · 이름 · 태그 · 등급 (예: 붕대, 의약, S급)" value="${esc(INV.q)}" autocomplete="off"><button id="invQx" aria-label="지우기" ${INV.q ? '' : 'hidden'}>×</button></div><p class="muted ifound" id="invFound" hidden></p>`;
  let grid;
  if (S.mobile) {
    const total = INV.tag === '전체' ? Math.max(slotCap(INV.tab), stacks.length) : stacks.length;
    grid = `<div class="igrid m" id="iGrid">${Array.from({ length: total }, (_, i) => (i < stacks.length ? slotButton(stacks[i]) : '<span class="eslot"></span>')).join('')}</div>`;
  } else grid = `<div class="igrid" id="iGrid">${stacks.map(slotTile).join('')}</div>`;
  const head = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>인벤토리</h2></div><p class="muted sec-sub">${esc(sub)}</p>` : `<p class="crumb">${esc(sub)}</p><div class="pagehead"><h2>인벤토리</h2></div>`;
  const body = S.mobile ? `${invDetail()}${grid}` : `<div class="iside">${grid}<div class="idet-hold">${invDetail()}</div></div>`;
  return `${head}${giftsRow()}${tabs}${sortbar}${search}${body}`;
}
function bindInventory() {
  const c = $('center');
  const cols = () => { const g = $('iGrid'); if (!g || S.mobile) return; const w = c.clientWidth; g.style.gridTemplateColumns = `repeat(${Math.max(3, Math.floor((w - 360) / 104))}, minmax(0, 1fr))`; };
  cols();
  const redraw = () => { const top = c.scrollTop; c.innerHTML = inventoryPage(); bindInventory(); c.scrollTop = top; };
  c.querySelectorAll('[data-itab]').forEach((b) => { b.onclick = () => { INV.tab = b.dataset.itab; INV.sel = ''; INV.tag = '전체'; redraw(); }; });
  c.querySelectorAll('[data-itag]').forEach((b) => { b.onclick = () => { INV.tag = b.dataset.itag; redraw(); }; });
  c.querySelectorAll('[data-iord]').forEach((b) => { b.onclick = () => { INV.order = b.dataset.iord; redraw(); }; });
  c.querySelectorAll('[data-inv]').forEach((b) => { b.onclick = () => { INV.sel = INV.sel === b.dataset.inv ? '' : b.dataset.inv; redraw(); }; });
  c.querySelectorAll('[data-ro]').forEach((b) => { b.onclick = () => toast(RO_MSG); }); bindAct(c); c.querySelectorAll('[data-petgo]').forEach((b) => { b.onclick = () => go('pets'); });
  const g = $('gRow'); if (g) g.onclick = () => { INV.giftOpen = !INV.giftOpen; redraw(); };
  const q = $('invQ'), x = $('invQx'), found = $('invFound');
  const apply = () => {
    INV.q = q.value; const k = invKey(q.value); let shown = 0; x.hidden = !q.value;
    c.querySelectorAll('#iGrid > *').forEach((el) => { const key = el.dataset.k; const vis = key == null ? !k : !k || key.includes(k); el.style.display = vis ? '' : 'none'; if (vis && key != null) shown++; });
    if (!k) { found.hidden = true; return; }
    const other = GD.TABS.filter((t) => t !== INV.tab).map((t) => [t, tabItems(t).filter((it) => invKeyOf(it).includes(k)).length]).filter(([, n]) => n > 0).map(([t, n]) => `${t} ${n}종`);
    found.textContent = `'${q.value.trim()}' · 이 칸에서 ${shown}종` + (other.length ? ' · 다른 칸: ' + other.join(', ') : ''); found.hidden = false;
  };
  q.oninput = apply; x.onclick = () => { q.value = ''; apply(); q.focus(); };
  if (INV.q) apply();
}


/* ════════ 탐사 — area_map.gd(소지역 지도) · world_map.gd(대지역 지도) 그대로 ════════ */
/* Godot 4 RandomNumberGenerator(PCG32)와 같은 수열 — 핀 · 건물 배치가 게임과 똑같이 나옵니다 */
class GRng {
  constructor(seed) { const M = (1n << 64n) - 1n; this.M = M; this.inc = ((1442695040888963407n << 1n) | 1n) & M; this.state = 0n; this.next(); this.state = (this.state + (BigInt(seed) & M)) & M; this.next(); }
  next() { const old = this.state; this.state = (old * 6364136223846793005n + this.inc) & this.M; const xs = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn); const rot = Number(old >> 59n); return ((xs >>> rot) | (xs << ((-rot) & 31))) >>> 0; }
  bounded(b) { const th = ((0x100000000 - b) % b) >>> 0; for (;;) { const r = this.next(); if (r >= th) return r % b; } }
  randiRange(a, b) { if (a === b) return a; return this.bounded(Math.abs(a - b) + 1) + Math.min(a, b); }
  randf() { const p = this.next(); if (p === 0) return 0; return Math.fround(Math.fround(((this.next() | 0x80000001) >>> 0)) * Math.pow(2, -32 - Math.clz32(p))); }
  randfRange(a, b) { return Math.fround(this.randf() * (b - a) + a); }
}
/* Godot 전역 무작위(randf · randi …)와 같은 수열 — 씨앗은 처음 한 번 아무 값으로 */
let GR = new GRng(Math.floor(Math.random() * 2 ** 32) * 2 ** 21 + Math.floor(Math.random() * 2 ** 21));
/* 색 계산(Godot Color) */
const C = {
  p: (h) => hex('#' + String(h).replace('#', '')).map((v) => v / 255),
  css: (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${+a.toFixed(3)})`,
  lerp: (a, b, t) => a.map((v, i) => v + (b[i] - v) * t),
  dark: (c, f) => c.map((v) => v * (1 - f)),
  lite: (c, f) => c.map((v) => v + (1 - v) * f),
};
const TH = () => M.THEMES[S.theme] || M.THEMES.dark;
const KIND_COLORS = { food: 'f2bb55', med: 'ff8070', tech: '6fb8ff', nature: '4fd1a5', urban: 'b9a2ff' };
const WATER_WORDS = ['한강', '강', '천', '항', '해안', '바다', '부두', '포구', '호수', '저수지', '갯벌', '섬'];
const HARD_REALM_MAX = 4;
let LOCS = null;
function locations() {
  syncHardMode(); if (LOCS) return LOCS; LOCS = [];
  GD.REGIONS.forEach((r, gi) => r.spots.forEach((spot, i) => {
    let kind = 'urban';
    if (/의료|병원|약재/.test(spot)) kind = 'med'; else if (/마트|시장|식량/.test(spot)) kind = 'food'; else if (/공원|산악|숲|습지/.test(spot)) kind = 'nature'; else if (/시설|연구|공항|창고|산업/.test(spot)) kind = 'tech';
    LOCS.push({ spot, gu_index: gi, level: Math.min(100, Number(r.min_level) + Math.floor(i / 2)), kind, realm: Number(r.realm) });
  }));
  return LOCS;
}
const regionDone = (gi) => { const v = new Set((S.P.visited || []).map(String)), r = GD.REGIONS[gi]; return r.spots.filter((s) => v.has(r.name + ' ' + s)).length; };
const canEnterField = (loc) => Number(S.P.level) >= Number(WD.REALMS[loc.realm].level) && Number(S.P.level) + 3 >= Number(loc.level);
const fieldWaitLeft = () => Math.max(0, Number(S.P.field_ready_at || 0) - nowSec());
const incapacitated = () => Number(S.P.morale ?? 50) <= 10 && !S.P.dead;
const nonEmpty = (o) => !!(o && typeof o === 'object' && Object.keys(o).length);
const activityBusy = () => !!((S.P.auto_explore && S.P.auto_explore.started) || nonEmpty(S.P.craft_job) || S.P.dead || nonEmpty(S.P.battle) || nonEmpty(S.P.long_expedition) || nonEmpty(S.P.travel) || nonEmpty(S.P.pending_explore));
const fieldOpen = () => Number(S.P.field_count || 0) < M.FIELD_DAILY_LIMIT && !incapacitated() && fieldWaitLeft() === 0;
const hereRegion = () => Math.max(0, Math.min(GD.REGIONS.length - 1, Number(S.P.region || 0)));
function fieldStatus() { const cal = calendarSync(S.P); return `${clockText()} ${isNight() ? '밤' : '낮'} · 오늘 ${cal.fieldCount} / 40회 · 남은 ${Math.max(0, M.FIELD_DAILY_LIMIT - cal.fieldCount)}회 · 06시 초기화`; }
function encounterThreshold(level, pl, night) { const gap = level - pl; let c = 40 + (gap > 0 ? gap * 4 : gap * 3) + (night ? 5 : 0); c = Math.max(10, Math.min(60, c)); return 100 - c; }
const resourceCost = (lv, night) => [1 + Math.floor(Math.max(1, lv) / 40) + (night ? 1 : 0), 2 + Math.floor(Math.max(1, lv) / 40) + (night ? 1 : 0)];
function moveSpeed() { let s = 1; const mob = mobility(); for (const k in mob) { const n = String(mob[k]); if (count(n) > 0 && BD.MOVE_ITEMS[n]) s *= Number(BD.MOVE_ITEMS[n].move ?? 1); } const now = nowSec(); for (const id in (S.P.positive || {})) if (BD.POSITIVES[id] && Number(S.P.positive[id].until || 0) > now) s *= Number(S.P.positive[id].move ?? 1); return Math.min(4, s); }
function travelDuration(target) {
  const cur = hereRegion(); if (target === cur) return 0;
  const a = GD.REGIONS[cur], b = GD.REGIONS[target], sp = moveSpeed(), TDM = D.travel_data.MINUTES; let sec;
  if (Number(a.realm) !== Number(b.realm)) sec = ['정비된 오토바이', '전동 스쿠터'].some((v) => count(v) > 0) ? 1200 : Math.max(1800, Math.ceil(TDM[a.realm][b.realm] * 60 / Math.min(1.25, Math.max(1, sp))));
  else sec = Math.ceil(300 / Math.max(1, sp));
  const ag = Math.max(0, Number(effStats(S.P.equipment || {})['민첩'] || 0) - BD.OVF_AG), trav = Math.min(25, ag * 0.3);
  return Math.max(1, Math.round(sec * (1 - trav / 100)));
}
function durationText(t) { t = Math.max(0, t); const p2 = (n) => String(n).padStart(2, '0'); if (t >= 86400) return `${Math.floor(t / 86400)}일 ${p2(Math.floor((t % 86400) / 3600))}시간`; if (t >= 3600) return `${Math.floor(t / 3600)}시간 ${p2(Math.floor((t % 3600) / 60))}분`; if (t >= 60) return `${Math.floor(t / 60)}분 ${p2(t % 60)}초`; return `${t}초`; }

/* 글자 폭 재기(이름표 자리 정하기용) */
const _mc = document.createElement('canvas').getContext('2d');
const textW = (t, px, bold) => { _mc.font = `${bold ? 700 : 400} ${px}px LastLightUI, system-ui, sans-serif`; return Math.ceil(_mc.measureText(t).width); };
const lineH = (px) => Math.ceil(px * 1.2);
/* map_labels.gd layout 그대로 */
const ML_PREF = [0, 1, 3, 3, 5, 5, 6, 6];
function mlCand(c, s, r, k) { const gap = 3; switch (k) { case 0: return [c[0] - s[0] * 0.5, c[1] + r + gap]; case 1: return [c[0] - s[0] * 0.5, c[1] - r - gap - s[1]]; case 2: return [c[0] + r + gap + 2, c[1] - s[1] * 0.5]; case 3: return [c[0] - r - gap - 2 - s[0], c[1] - s[1] * 0.5]; case 4: return [c[0] + r * 0.55, c[1] + r * 0.7]; case 5: return [c[0] - r * 0.55 - s[0], c[1] + r * 0.7]; case 6: return [c[0] + r * 0.55, c[1] - r * 0.7 - s[1]]; default: return [c[0] - r * 0.55 - s[0], c[1] - r * 0.7 - s[1]]; } }
const mlOv = (a, b) => { const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]); return w > 0 && h > 0 ? w * h : 0; };
const mlClamp = (r, B, m = 3) => [Math.round(Math.max(m, Math.min(r[0], Math.max(m, B[0] - r[2] - m)))), Math.round(Math.max(m, Math.min(r[1], Math.max(m, B[1] - r[3] - m)))), r[2], r[3]];
function mlLayout(points, sizes, B, pinR, avoid = []) {
  const n = points.length, pins = points.map((c) => [c[0] - pinR, c[1] - pinR, pinR * 2, pinR * 2]);
  const rects = points.map((c, i) => mlClamp([...mlCand(c, sizes[i], pinR, 0), ...sizes[i]], B));
  let unit = 0; sizes.forEach((s) => { unit += s[0] * s[1]; }); unit = unit / Math.max(1, n) * 0.02;
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) {
    let best = rects[i], bc = Infinity;
    for (let k = 0; k < 8; k++) {
      const raw = [...mlCand(points[i], sizes[i], pinR, k), ...sizes[i]], r = mlClamp(raw, B);
      let cost = ML_PREF[k] * unit + Math.hypot(raw[0] - r[0], raw[1] - r[1]) * 0.6 * Math.sqrt(unit);
      for (let j = 0; j < n; j++) { cost += mlOv(r, pins[j]) * (j !== i ? 8 : 12); if (j !== i) cost += mlOv(r, rects[j]) * 4; }
      for (const a of avoid) cost += mlOv(r, a) * 2;
      if (cost < bc - 0.001) { bc = cost; best = r; }
    }
    rects[i] = best;
  }
  return rects;
}
const f1 = (v) => +(+v).toFixed(2);
const circ = (c, r, fill, extra = '') => `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}" fill="${fill}"${extra}/>`;
const arcPath = (c, r, a0, a1) => { const p = (a) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; const s = p(a0), e = p(a1); return `M${f1(s[0])} ${f1(s[1])}A${f1(r)} ${f1(r)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f1(e[0])} ${f1(e[1])}`; };
function flame(c, r, col) { const b = [c[0], c[1] + r * 0.28], rad = r * 0.62, pts = [[c[0], c[1] - r]]; for (let i = 0; i < 17; i++) { const a = (-30 + 240 * i / 16) * Math.PI / 180; pts.push([b[0] + Math.cos(a) * rad, b[1] + Math.sin(a) * rad]); } return `<polygon points="${pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ')}" fill="${col}"/>`; }

/* ── 소지역 지도(SpotCanvas) ── */
const EXP = { sel: -1, region: -1, worldRealm: null, worldSel: -2 };
const spotsOf = (gi) => locations().filter((l) => l.gu_index === gi);
const spotVisited = (gi, loc) => (S.P.visited || []).includes(GD.REGIONS[gi].name + ' ' + loc.spot);
function autoPick(gi) {
  const list = spotsOf(gi); if (EXP.sel >= 0 && EXP.sel < list.length) return; EXP.sel = -1;
  for (let k = 0; k < list.length; k++) if (canEnterField(list[k]) && !spotVisited(gi, list[k])) { EXP.sel = k; return; }
  for (let k = 0; k < list.length; k++) if (canEnterField(list[k])) { EXP.sel = k; return; }
}
function spotMapSvg(gi, W, H) {
  const t = TH(), light = !!t.light, locs = spotsOf(gi), seed = 7919 * (gi + 1), rname = GD.REGIONS[gi].name;
  let water = locs.some((l) => WATER_WORDS.some((w) => l.spot.includes(w))) || [1, 4].includes(Number(GD.REGIONS[gi].realm)) || rname.includes('한강');
  const rng = new GRng(seed), grid = [];
  for (const yv of [0.20, 0.50, 0.77]) for (const xv of [0.12, 0.38, 0.62, 0.88]) grid.push([xv, yv]);
  for (let i = grid.length - 1; i > 0; i--) { const j = rng.randiRange(0, i); const tmp = grid[i]; grid[i] = grid[j]; grid[j] = tmp; }
  const cells = locs.map((_, k) => { const c = grid[k % grid.length]; const x = Math.max(0.08, Math.min(0.92, c[0] + rng.randfRange(-0.025, 0.025))); const y = Math.max(0.10, Math.min(0.84, c[1] + rng.randfRange(-0.03, 0.03))); return [x, y]; });
  const pad = S.mobile ? [46, 26] : [60, 30];
  const pts = cells.map((p) => { const n = [(p[0] - 0.08) / (0.92 - 0.08), (p[1] - 0.10) / (0.84 - 0.10)]; return [Math.round(pad[0] + n[0] * (W - pad[0] * 2)), Math.round(pad[1] + n[1] * (H - pad[1] * 2 - (water ? 30 : 0)))]; });
  const fs = S.mobile ? 11 : 12;
  const sizes = locs.map((l) => [Math.max(textW(l.spot, fs, true), textW('Lv.' + l.level, 11, true)), lineH(fs) + lineH(11)]);
  const rects = mlLayout(pts, sizes, [W, H], 17, [[W - 40, 6, 36, 56]]);
  const land = light ? 'ecebe2' : '0f1817', gridc = light ? 'e2e0d4' : '142120', street = light ? 'f8f7f1' : '1a2b2a', wa = light ? 'bcd9e8' : '12303a', wb = light ? 'a9cde0' : '0e2630';
  let s = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="#${land}" stroke="#${light ? 'd6d4c6' : '1f2e2e'}"/>`;
  for (let gx = 44; gx < W; gx += 44) s += `<line x1="${gx}" y1="1" x2="${gx}" y2="${H - 1}" stroke="#${gridc}"/>`;
  for (let gy = 44; gy < H; gy += 44) s += `<line x1="1" y1="${gy}" x2="${W - 1}" y2="${gy}" stroke="#${gridc}"/>`;
  const bottom = H - (water ? 33 : 0), xs = [0, 0.24, 0.56, 0.84, 1], ys = [0, 0.33, 0.66, 1];
  const ba = light ? 'dcdacb' : '15211f', bb = light ? 'd2d0c0' : '182624', park = light ? 'cfe3c4' : '12261c';
  const r2 = new GRng(seed + 7), parkCell = r2.randiRange(0, 11);
  const treeC = C.css(light ? C.dark(C.p(park), 0.12) : C.lite(C.p(park), 0.10));
  for (let yi = 0; yi < 3; yi++) for (let xi = 0; xi < 4; xi++) {
    const x0 = W * xs[xi] + (xi > 0 ? 14 : 0) + 6, x1 = W * xs[xi + 1] - 6, y0 = H * ys[yi] + (yi > 0 ? 14 : 0) + 6, y1 = Math.min(H * ys[yi + 1], bottom) - 6;
    if (x1 - x0 < 20 || y1 - y0 < 16) continue;
    const bw0 = x1 - x0, bh0 = y1 - y0;
    if (yi * 4 + xi === parkCell) {
      s += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(bw0)}" height="${f1(bh0)}" rx="10" fill="#${park}"/>`;
      for (let tr = 0; tr < 5; tr++) { const tx = r2.randfRange(x0 + 10, x1 - 10), ty = r2.randfRange(y0 + 10, y1 - 10); s += circ([tx, ty], r2.randfRange(4, 7), treeC); }
      continue;
    }
    const n = r2.randiRange(2, 4); let cx = x0;
    for (let bi = 0; bi < n; bi++) { const bw = (bw0 - 4 * (n - 1)) / n, bh = bh0 * r2.randfRange(0.55, 1), by = y0 + (bh0 - bh) * (r2.randf() < 0.5 ? 0 : 1); s += `<rect x="${f1(cx)}" y="${f1(by)}" width="${f1(bw)}" height="${f1(bh)}" rx="5" fill="#${(bi + xi + yi) % 2 === 0 ? ba : bb}"/>`; cx += bw + 4; }
  }
  for (const fy of [0.33, 0.66]) s += `<rect x="1" y="${f1(H * fy)}" width="${W - 2}" height="14" fill="#${street}"/>`;
  for (const fx of [0.24, 0.56, 0.84]) s += `<rect x="${f1(W * fx)}" y="1" width="14" height="${H - 2}" fill="#${street}"/>`;
  const dash = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'; let dp = '';
  for (const fy of [0.33, 0.66]) for (let dx = 6; dx < W; dx += 18) dp += `M${dx} ${f1(H * fy + 7)}h8`;
  for (const fx of [0.24, 0.56, 0.84]) for (let dy = 6; dy < bottom; dy += 18) dp += `M${f1(W * fx + 7)} ${dy}v8`;
  s += `<path d="${dp}" stroke="${dash}" stroke-width="1.5"/>`;
  if (water) {
    const wy = H - 33; s += `<defs><linearGradient id="wg${gi}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#${wa}"/><stop offset="1" stop-color="#${wb}"/></linearGradient></defs><rect x="1" y="${wy}" width="${W - 2}" height="${H - 1 - wy}" fill="url(#wg${gi})"/>`;
    const wc = light ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
    for (let wi = 0; wi < 3; wi++) { const wx = 20 + wi * W / 3; s += `<path d="${arcPath([wx, wy + 16], 6, Math.PI * 1.1, Math.PI * 1.9)}${arcPath([wx + 12, wy + 16], 6, Math.PI * 1.1, Math.PI * 1.9)}" stroke="${wc}" stroke-width="1.5" fill="none"/>`; }
  }
  const ink = light ? '#' + t.BG : '#06241b', amber = 'f2bb55';
  pts.forEach((c, k) => { if (spotVisited(gi, locs[k])) { s += circ(c, 34, C.css(C.p(amber), light ? 0.10 : 0.07)) + circ(c, 24, C.css(C.p(amber), light ? 0.14 : 0.10)); } });
  pts.forEach((c, k) => {
    const loc = locs[k], can = canEnterField(loc), done = spotVisited(gi, loc);
    let col = can ? '#' + (KIND_COLORS[loc.kind] || t.BLUE) : '#' + t.SUBTLE; if (done && can) col = '#' + amber;
    if (k === EXP.sel) { s += circ(c, 22, C.css(C.p(t.ACCENT), 0.22)) + circ(c, 15, col) + (done ? flame(c, 6.5, '#3a2408') : circ(c, 4.5, ink)); }
    else { s += circ([c[0], c[1] + 2], 13, `rgba(0,0,0,${light ? 0.18 : 0.35})`) + circ(c, 12, '#' + land); if (done) s += circ(c, 10.5, C.css(C.p(col), 0.9)); s += circ(c, 10.5, 'none', ` stroke="${col}" stroke-width="3"`); if (done) s += flame(c, 5.5, '#3a2408'); }
  });
  const cp = [W - 20, 18];
  s += `<path d="M${cp[0]} ${cp[1] + 9}V${cp[1] - 7}M${cp[0] - 5} ${cp[1] - 2}L${cp[0]} ${cp[1] - 8}L${cp[0] + 5} ${cp[1] - 2}" stroke="#${t.MUTED}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="${cp[0]}" y="${cp[1] + 24}" text-anchor="middle" font-size="11" font-weight="700" fill="#${t.MUTED}">N</text>`;
  const outline = light ? '#f4f3ec' : '#0d1413';
  locs.forEach((l, k) => {
    const r = rects[k], c = pts[k], bx = Math.min(r[0], c[0] - 17), by = Math.min(r[1], c[1] - 17), bx2 = Math.max(r[0] + r[2], c[0] + 17), by2 = Math.max(r[1] + r[3], c[1] + 17), mid = r[0] + r[2] / 2;
    s += `<g class="mpin" data-spot="${k}"><rect x="${bx}" y="${by}" width="${bx2 - bx}" height="${by2 - by}" rx="8" class="hit"/>` +
      `<text x="${mid}" y="${r[1] + lineH(fs) * 0.82}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#${t.TEXT}" stroke="${outline}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${esc(l.spot)}</text>` +
      `<text x="${mid}" y="${r[1] + lineH(fs) + lineH(11) * 0.82}" text-anchor="middle" font-size="11" font-weight="700" fill="#${t.MUTED}" stroke="${outline}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">Lv.${l.level}</text></g>`;
  });
  return `<svg class="mapsvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(rname)} 소지역 지도">${s}</svg>`;
}
const chipL = (text, col) => `<span class="cchip" style="--c:${col}">${esc(text)}</span>`;
function spotInfoCard(gi) {
  const list = spotsOf(gi);
  if (EXP.sel < 0 || EXP.sel >= list.length) return `<div class="spotinfo"><b style="font-size:17px">탐사할 곳을 고르세요</b><p class="muted">지도에서 핀을 누르면 권장 레벨 · 전투 확률 · 소모 · 남은 횟수와 시작 버튼이 여기에 나옵니다.</p>${fieldOpen() ? '' : '<p style="color:var(--warning);font-size:12px">오늘 탐사 한도(40회) · 전투 후 대기 · 사기를 확인하세요.</p>'}</div>`;
  const loc = list[EXP.sel], can = canEnterField(loc), lv = loc.level, night = isNight(), delta = lv - Number(S.P.level);
  const fight = Math.round(100 - encounterThreshold(lv, Number(S.P.level), night)), cost = resourceCost(lv, night), left = Math.max(0, M.FIELD_DAILY_LIMIT - calendarSync(S.P).fieldCount);
  const danger = can ? (delta <= 0 ? ['안전', 'var(--accent)'] : delta <= 2 ? ['보통', 'var(--warning)'] : ['위험', 'var(--danger)']) : ['레벨 부족', 'var(--subtle)'];
  const stat = (cap, val, col) => `<div><small>${cap}</small><b style="color:${col || 'var(--text)'}">${val}</b></div>`;
  let note = '';
  if (!can) note = `<p style="color:var(--warning)">Lv.${Math.max(1, lv - 3)}부터 들어갈 수 있는 구역입니다.</p>`;
  else if (delta >= 3) note = `<p style="color:var(--warning)">내 레벨보다 ${delta} 높은 구역입니다.${night ? ' 밤이라 더 위험합니다.' : ''}</p>`;
  else if (night) note = '<p class="muted">밤에는 전투가 더 자주 일어납니다.</p>';
  const busy = activityBusy();
  if (busy) note += '<p style="color:var(--warning);font-size:12px">진행 중인 이동 · 탐사 · 전투 · 제작을 마친 뒤 시작할 수 있습니다.</p>';
  else if (!fieldOpen()) note += '<p style="color:var(--warning);font-size:12px">오늘 탐사 한도(40회) · 전투 후 대기 · 사기를 확인하세요.</p>';
  return `<div class="spotinfo"><div class="col"><div class="hd"><b>${spotVisited(gi, loc) ? '✓ ' : ''}${esc(loc.spot)}</b>${chipL(danger[0], danger[1])}${chipL(GD.KIND_NAME[loc.kind] || '생활', '#' + (KIND_COLORS[loc.kind] || '6fb8ff'))}${night ? chipL('밤', 'var(--blue)') : ''}</div>
    <div class="st">${stat('권장 레벨', 'Lv.' + lv)}${stat('전투가 일어날 확률', fight + '%', fight >= 50 ? 'var(--danger)' : '')}${stat('허기 · 수분 소모', `-${cost[0]} · -${cost[1]}`)}${stat('오늘 남은 횟수', `${left} / ${M.FIELD_DAILY_LIMIT}회`, left > 0 ? '' : 'var(--danger)')}</div>${note}</div>
    <button class="btn primary go" data-fstart="${EXP.sel}" ${!can || !fieldOpen() || busy ? 'disabled' : ''}>이곳 탐사 시작</button></div>`;
}
function areaCard(gi) {
  const vs = visitedSet(), done = doneIn(gi, vs), n = GD.REGIONS[gi].spots.length, f = facility(gi), lit = done >= n, realm = Number(GD.REGIONS[gi].realm);
  let rl = 0, rn = 0; GD.REGIONS.forEach((r, i) => { if (Number(r.realm) !== realm) return; rn++; if (doneIn(i, vs) >= r.spots.length) rl++; });
  const claimed = !!(S.P.city?.realm_claimed || {})[String(realm)], rw = CL.REALM_REWARDS[realm], rwt = rw ? `코인 ${rw.coins} · ${rw.item} 1개` : '';
  return `<div class="areacard"><div class="h"><span class="lamp"></span><b>${lit ? '모든 구역에 불빛 · ' : '밝힌 구역 '}${done} / ${n}</b><span class="spacer"></span><span class="muted" style="font-size:12px">${esc(WD.REALMS[realm].name)} 불빛 ${rl} / ${rn} 지역</span></div>
    <div class="bar"><i style="width:${done / n * 100}%;background:var(--warning)"></i></div>
    <p style="color:${lit ? 'var(--text)' : 'var(--muted)'}">${esc(lit ? `거점에 '${f.name}' 가동 중 · ${f.desc} (이 지역에 머무는 동안)` : `다 밝히면 이 지역 거점에 '${f.name}' 가동 · ${f.desc}`)}</p>
    <p style="color:${claimed ? 'var(--muted)' : 'var(--warning)'}">${esc(claimed ? `${WD.REALMS[realm].name} 대지역 보상 받음 · ${rwt}` : `${WD.REALMS[realm].name}의 모든 지역을 밝히면 · ${rwt}`)}</p>${S.P.hard_mode ? '<p class="subtle" style="font-size:11px">불빛은 일반 탐사 기록으로 셉니다.</p>' : ''}</div>`;
}
function waitNote() { const w = fieldWaitLeft(); return w > 0 ? `<span class="waitnote" data-live="fwait">${String(S.P.field_rest_kind || '전투') === '탐사' ? '탐사 후' : '전투 후'} 휴식 · 다음 탐사까지 ${w}초</span>` : ''; }
function exploreGuPage() {
  const gi = hereRegion(); if (EXP.region !== gi) { EXP.sel = -1; EXP.region = gi; } autoPick(gi);
  const info = GD.REGIONS[gi], hard = !!S.P.hard_mode && Number(info.realm) <= HARD_REALM_MAX, n = info.spots.length, done = regionDone(gi), all = done >= n;
  const cc = all ? 'var(--accent)' : 'var(--blue)';
  const chip = `<span class="donechip" style="--c:${cc}">${S.mobile ? (all ? '✓ ' : '') + `완료 ${done}/${n}` : (all ? '✓ 모두 탐사 ' : '탐사 완료 ') + `${done} / ${n}`}</span>`;
  const longOk = fieldWaitLeft() === 0 && !incapacitated();
  const narrow = window.innerWidth < 380;
  const btns = S.mobile
    ? `<button class="btn xs" data-go="worldmap">${svg('M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14')}다른 지역</button><button class="btn xs" data-go="long_explore" ${longOk ? '' : 'disabled'}><span style="color:var(--accent);display:inline-flex">${svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2')}</span>장기 탐사</button>`
    : `<button class="btn" data-go="worldmap">다른 지역 · 지도</button><button class="btn" data-go="long_explore" ${longOk ? '' : 'disabled'}>장기 탐사 · 1~4시간</button>`;
  let h = `<p class="crumb" style="${hard ? 'color:var(--danger)' : ''}">${esc(WD.REALMS[info.realm].name)} › ${esc(info.name)}${hard ? ' · 하드 모드' : ''}</p>`;
  h += `<div class="pagehead gu"><h2>탐사</h2>${narrow ? '' : chip}<span class="spacer"></span>${btns}</div>${narrow ? `<div style="margin:-8px 0 12px">${chip}</div>` : ''}`;
  h += waitNote() ? `<div style="text-align:right;margin:-6px 0 8px">${waitNote()}</div>` : '';
  if (!fieldOpen()) h += '<div class="note">지금은 탐사할 수 없습니다 · 오늘 탐사 횟수(40회), 탐사·전투 후 휴식 시간, 사기를 확인하세요. 회복품은 가방에서 씁니다.</div>';
  h += areaCard(gi);
  h += `<div class="panel mapcard"><div class="maphold" id="spotMap"></div><div class="legend">${['food', 'med', 'tech', 'nature', 'urban'].map((k) => `<span style="color:#${KIND_COLORS[k]}">● ${GD.KIND_NAME[k]}</span>`).join('')}<span style="color:${isLight() ? 'var(--gold)' : '#f2bb55'}">● 불빛 · 탐사 완료</span><span class="subtle">● 레벨 부족</span></div></div>`;
  h += `<div id="spotInfo">${spotInfoCard(gi)}</div>`;
  return h;
}
function drawSpotMap() {
  const box = $('spotMap'); if (!box) return; const gi = hereRegion();
  const W = Math.max(S.mobile ? (window.innerWidth >= 380 ? 300 : 240) : 300, Math.floor(box.clientWidth)), H = Math.round(Math.max(250, Math.min(400, window.innerHeight * 0.44)));
  box.innerHTML = spotMapSvg(gi, W, H);
  box.querySelectorAll('[data-spot]').forEach((g) => { g.onclick = () => { EXP.sel = Number(g.dataset.spot); drawSpotMap(); $('spotInfo').innerHTML = spotInfoCard(gi); bindRO($('spotInfo')); bindFStart($('spotInfo')); }; });
}
const bindFStart = (root) => root.querySelectorAll('[data-fstart]').forEach((b) => { b.onclick = () => { const l = spotsOf(hereRegion())[Number(b.dataset.fstart)]; if (l) startExploreFlow(l); }; });
const bindRO = (root) => root.querySelectorAll('[data-ro]').forEach((b) => { b.onclick = () => toast(RO_MSG); });
const bindAct = (root) => root.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => runAct(b); });
function bindExploreGu() { const c = $('center'); bindRO(c); bindFStart(c); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); drawSpotMap(); }

/* ── 대지역 지도(MapCanvas) ── */
const WM_LAYOUT = [
  [[0.30, 0.36], [0.48, 0.40], [0.47, 0.20], [0.67, 0.38], [0.76, 0.18], [0.28, 0.74], [0.11, 0.52], [0.52, 0.76], [0.76, 0.72], [0.58, 0.07]],
  [[0.40, 0.50], [0.52, 0.44], [0.56, 0.60], [0.48, 0.80], [0.70, 0.70], [0.74, 0.46], [0.78, 0.24], [0.56, 0.24], [0.34, 0.08], [0.20, 0.36]],
  [[0.46, 0.70], [0.62, 0.56], [0.30, 0.26], [0.64, 0.78], [0.24, 0.48], [0.20, 0.70], [0.74, 0.30], [0.32, 0.88], [0.52, 0.93], [0.54, 0.09]],
  [[0.34, 0.26], [0.48, 0.20], [0.40, 0.07], [0.26, 0.44], [0.16, 0.26], [0.62, 0.62], [0.46, 0.64], [0.55, 0.80], [0.72, 0.46], [0.84, 0.74]],
  [[0.56, 0.28], [0.42, 0.30], [0.49, 0.42], [0.50, 0.15], [0.32, 0.18], [0.14, 0.68], [0.80, 0.84], [0.72, 0.64], [0.36, 0.54], [0.88, 0.58]],
  [[0.18, 0.30], [0.36, 0.15], [0.60, 0.14], [0.82, 0.28], [0.14, 0.68], [0.34, 0.84], [0.62, 0.86], [0.84, 0.66], [0.34, 0.50], [0.58, 0.50]],
];
const regionsOf = (r) => GD.REGIONS.map((x, i) => [x, i]).filter(([x]) => Number(x.realm) === r).map(([, i]) => i);
const canEnterRegion = (gi) => { const r = GD.REGIONS[gi]; return Number(S.P.level) >= Number(WD.REALMS[r.realm].level) && Number(S.P.level) + 3 >= Number(r.min_level); };
function smooth(pts, steps = 12) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let s = 0; s < steps; s++) { const t = s / steps, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); } }
  out.push(pts[pts.length - 1]); return out;
}
const poly = (pts) => pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');
function worldMapSvg(realm, W, H) {
  const t = TH(), light = !!t.light, ids = regionsOf(realm), lay = WM_LAYOUT[realm], here = hereRegion(), hard = !!S.P.hard_mode && realm <= HARD_REALM_MAX;
  const P = { BG: C.p(t.BG), PANEL: C.p(t.PANEL), P2: C.p(t.PANEL_2), LINE: C.p(t.LINE), BLUE: C.p(t.BLUE), ACCENT: C.p(t.ACCENT), SUBTLE: C.p(t.SUBTLE), MUTED: C.p(t.MUTED), DANGER: C.p(t.DANGER), WARNING: C.p(t.WARNING) };
  let mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
  for (let k = 0; k < Math.min(ids.length, lay.length); k++) { mn = [Math.min(mn[0], lay[k][0]), Math.min(mn[1], lay[k][1])]; mx = [Math.max(mx[0], lay[k][0]), Math.max(mx[1], lay[k][1])]; }
  if (mn[0] === Infinity) { mn = [0, 0]; mx = [1, 1]; } if (mx[0] - mn[0] < 0.3) { mn[0] = 0; mx[0] = 1; } if (mx[1] - mn[1] < 0.3) { mn[1] = 0; mx[1] = 1; }
  const pad = S.mobile ? [52, 28] : [70, 34];
  const px = (q) => [pad[0] + (q[0] - mn[0]) / (mx[0] - mn[0]) * (W - pad[0] * 2), pad[1] + (q[1] - mn[1]) / (mx[1] - mn[1]) * (H - pad[1] * 2)];
  const tx = (fx) => px([fx, mn[1]])[0], ty = (fy) => px([mn[0], fy])[1];
  const pts = ids.map((_, k) => { const p = k < lay.length ? lay[k] : [0.1 + 0.2 * (k % 5), 0.3 + 0.4 * Math.floor(k / 5)]; return px(p).map(Math.round); });
  const nfs = S.mobile ? 12 : 13;
  const lines = ids.map((gi) => { const r = GD.REGIONS[gi], L = [[r.name, nfs, true]]; if (!S.mobile) { const req = Number(r.min_level); L.push([`Lv.${req}–${Math.min(100, req + 4)}`, 11, false]); } return L; });
  const sizes = lines.map((L) => [Math.max(...L.map(([tx2, fs, b]) => textW(tx2, fs, b))) + 12, L.reduce((a, [, fs]) => a + lineH(fs), 0) - 2 * (L.length - 1) + 3]);
  const rects = mlLayout(pts, sizes, [W, H], 12, [[W - 44, 6, 40, 40]]);
  const land = light ? C.lerp(P.P2, C.p('e7e9dc'), 0.45) : C.lerp(P.P2, P.BG, 0.25);
  const land2 = light ? C.dark(land, 0.05) : C.lerp(P.BG, P.PANEL, 0.4);
  const water = light ? C.lerp(P.BLUE, [1, 1, 1], 0.62) : C.lerp(P.BLUE, P.BG, 0.72);
  let s = `<defs><linearGradient id="lg${realm}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.css(C.lerp(land, [1, 1, 1], light ? 0.2 : 0.04))}"/><stop offset="1" stop-color="${C.css(land2)}"/></linearGradient><linearGradient id="eg${realm}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,${light ? 0.06 : 0.18})"/></linearGradient></defs>`;
  s += `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${C.css(land)}" stroke="#${t.LINE}"/><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12" fill="url(#lg${realm})"/>`;
  const dotc = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)'; let dots = '';
  for (let i = 0; i < 140; i++) { const x = ((i * 73.13 + realm * 31) % (W - 12)) + 6, y = ((i * 41.71 + realm * 17) % (H - 12)) + 6; dots += circ([x, y], 1.2, dotc); }
  s += dots;
  /* 지형 */
  const mountain = C.p(light ? 'c9c3a8' : '26343a');
  const mountains = (c) => { c = [Math.max(40, Math.min(W - 40, c[0])), Math.max(18, Math.min(H - 18, c[1]))]; const shade = C.dark(mountain, 0.22), snow = light ? 'rgba(255,255,255,0.85)' : 'rgba(219,235,242,0.55)'; let o = '';
    for (const off of [[-22, 6], [22, 8], [0, 0]]) { const p = [c[0] + off[0], c[1] + off[1]], big = off[0] === 0 && off[1] === 0 ? 1.15 : 1, top = [p[0], p[1] - 13 * big];
      o += `<polygon points="${poly([[p[0] - 15 * big, p[1] + 10 * big], top, [p[0], p[1] + 10 * big]])}" fill="${C.css(mountain)}"/><polygon points="${poly([top, [p[0] + 15 * big, p[1] + 10 * big], [p[0], p[1] + 10 * big]])}" fill="${C.css(shade)}"/><polygon points="${poly([top, [top[0] - 4.5 * big, top[1] + 6 * big], [top[0], top[1] + 4 * big], [top[0] + 4.5 * big, top[1] + 6 * big]])}" fill="${snow}"/>`; }
    return o; };
  const river = (p, w) => { const l = smooth(p), d = 'M' + l.map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L'); return `<path d="${d}" fill="none" stroke="${C.css(C.dark(water, 0.25))}" stroke-width="${w + 4}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${C.css(water)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${C.css(C.lite(water, 0.18))}" stroke-width="${Math.max(1.5, w * 0.22)}" stroke-linejoin="round"/>`; };
  const sea = (coast, closing) => { const edge = smooth(coast), pl = edge.concat(closing); let o = `<polygon points="${poly(pl)}" fill="${C.css(water)}"/><polyline points="${poly(edge)}" fill="none" stroke="${C.css(C.lite(water, 0.35))}" stroke-width="3"/>`;
    let c0 = [0, 0]; pl.forEach((q) => { c0[0] += q[0]; c0[1] += q[1]; }); c0 = c0.map((v) => v / Math.max(1, pl.length));
    for (let k = 0; k < 6; k++) { const e = edge[Math.max(0, Math.min(edge.length - 1, Math.floor(edge.length * (k + 0.5) / 6)))], wp = [c0[0] + (e[0] - c0[0]) * 0.55 + Math.sin(k * 1.7) * 10, c0[1] + (e[1] - c0[1]) * 0.55 + Math.cos(k * 2.3) * 8];
      o += `<path d="${arcPath(wp, 6, Math.PI * 1.15, Math.PI * 1.85)}${arcPath([wp[0] + 10, wp[1]], 6, Math.PI * 1.15, Math.PI * 1.85)}" fill="none" stroke="${C.css(C.lite(water, 0.3))}" stroke-width="1.4"/>`; }
    return o; };
  if (realm === 0) s += river([[-10, ty(0.60)], [tx(0.18), ty(0.62)], [tx(0.35), ty(0.56)], [tx(0.52), ty(0.60)], [tx(0.70), ty(0.55)], [tx(0.86), ty(0.58)], [W + 10, ty(0.52)]], 15) + mountains([tx(0.35), ty(0.12)]) + mountains([tx(0.86), ty(0.36)]);
  else if (realm === 1) s += sea([[tx(0.24), 0], [tx(0.16), ty(0.22)], [tx(0.30), ty(0.46)], [tx(0.26), ty(0.70)], [tx(0.36), H]], [[0, H], [0, 0]]);
  else if (realm === 2) s += mountains([tx(0.70), ty(0.10)]) + mountains([tx(0.86), ty(0.56)]) + circ([tx(0.44), ty(0.44)], Math.min(W, H) * 0.10, C.css(water, 0.5));
  else if (realm === 3) s += river([[-10, ty(0.52)], [tx(0.20), ty(0.54)], [tx(0.34), ty(0.36)], [tx(0.50), ty(0.40)], [tx(0.62), ty(0.30)], [W + 10, ty(0.22)]], 13) + mountains([tx(0.86), ty(0.88)]);
  else if (realm === 4) s += sea([[0, ty(0.40)], [tx(0.08), ty(0.55)], [tx(0.22), ty(0.82)], [tx(0.45), ty(0.86)], [tx(0.62), ty(0.92)], [W, ty(0.96)]], [[W, H], [0, H]]) + mountains([tx(0.66), ty(0.34)]);
  else if (realm === 5) { const c = [tx(0.46), ty(0.50)], r = Math.min(W, H) * 0.28; s += circ(c, r, `rgba(217,77,64,${light ? 0.10 : 0.08})`) + circ(c, r, 'none', ' stroke="rgba(217,77,64,0.35)" stroke-width="2"'); }
  /* 구역 영역 */
  ids.forEach((gi, k) => { const all = regionDone(gi) >= GD.REGIONS[gi].spots.length; let zc = all ? C.p('f2bb55') : gi === here ? P.ACCENT : canEnterRegion(gi) ? P.BLUE : P.SUBTLE; if (hard && gi !== here) zc = P.DANGER; s += circ(pts[k], Math.min(W, H) * 0.13, C.css(zc, (light ? 0.08 : 0.06) * (all ? 2 : 1))); });
  /* 나무 */
  const tree = light ? C.p('9fbf8a') : C.lerp(C.p('6fae7f'), P.BG, 0.72), tree2 = light ? C.p('86ab72') : C.lerp(C.p('6fae7f'), P.BG, 0.62);
  for (let i = 0; i < 26; i++) { const tp = [((i * 97.7 + realm * 53) % (W - 40)) + 20, ((i * 59.3 + realm * 29) % (H - 36)) + 18]; if (pts.some((q) => Math.hypot(tp[0] - q[0], tp[1] - q[1]) < 46)) continue; s += circ([tp[0], tp[1] + 2], 5.5, 'rgba(0,0,0,0.12)') + circ(tp, 5, C.css(tree)) + circ([tp[0] + 5, tp[1] + 1.5], 4, C.css(tree2)); }
  /* 도로 */
  const roads = [], seen = {};
  pts.forEach((a, ai) => { const near = pts.map((b, bi) => [Math.hypot(a[0] - b[0], a[1] - b[1]), bi]).filter(([, bi]) => bi !== ai).sort((x, y) => x[0] - y[0]); for (const [, bi] of near.slice(0, 2)) { const key = Math.min(ai, bi) + '-' + Math.max(ai, bi); if (!seen[key]) { seen[key] = 1; roads.push([ai, bi]); } } });
  const casing = light ? C.p('a39d84') : C.dark(P.BG, 0.2), road = light ? C.p('d9d3b8') : C.lite(P.LINE, 0.08), dash = light ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)';
  const seg = (a, b) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
  s += `<path d="${roads.map(([a, b]) => seg(pts[a], pts[b])).join('')}" stroke="${C.css(casing)}" stroke-width="6" stroke-linecap="round"/><path d="${roads.map(([a, b]) => seg(pts[a], pts[b])).join('')}" stroke="${C.css(road)}" stroke-width="3.4" stroke-linecap="round"/>`;
  let dd = ''; roads.forEach(([ai, bi]) => { const a = pts[ai], b = pts[bi], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dir = [(b[0] - a[0]) / Math.max(1, L), (b[1] - a[1]) / Math.max(1, L)]; for (let d = 18; d < L - 18; d += 12) { const e = Math.min(d + 5, L - 18); dd += `M${f1(a[0] + dir[0] * d)} ${f1(a[1] + dir[1] * d)}L${f1(a[0] + dir[0] * e)} ${f1(a[1] + dir[1] * e)}`; } });
  s += `<path d="${dd}" stroke="${dash}" stroke-width="1"/>`;
  if (hard) s += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="rgba(217,64,51,0.06)"/>`;
  /* 핀 */
  ids.forEach((gi, k) => {
    const c = pts[k]; let col = gi === here ? P.ACCENT : canEnterRegion(gi) ? P.BLUE : P.SUBTLE; if (hard && gi !== here && canEnterRegion(gi)) col = P.DANGER;
    s += circ([c[0], c[1] + 3], 12, `rgba(0,0,0,${light ? 0.15 : 0.25})`);
    if (gi === here) s += circ(c, 15, C.css(col, 0.22)) + `<circle class="pulse" cx="${c[0]}" cy="${c[1]}" r="17.9" fill="none" stroke="${C.css(P.ACCENT)}" stroke-width="2" stroke-opacity="0.325"/>`;
    if (gi === EXP.worldSel) s += circ(c, 17, 'none', ` stroke="#${t.WARNING}" stroke-width="2.5"`);
    if (regionDone(gi) >= GD.REGIONS[gi].spots.length) { s += circ(c, 18, 'rgba(242,186,84,0.16)') + circ(c, 11, light ? C.css(land) : '#fff') + circ(c, 9.5, '#f2bb55'); const fb = [c[0], c[1] + 1.6], fp = [[c[0], c[1] - 5.6]]; for (let i = 0; i < 17; i++) { const a = (-30 + 240 * i / 16) * Math.PI / 180; fp.push([fb[0] + Math.cos(a) * 3.5, fb[1] + Math.sin(a) * 3.5]); } s += `<polygon points="${poly(fp)}" fill="#3a2408"/>`; }
    else s += circ(c, 10.5, light ? '#fff' : 'rgba(255,255,255,0.9)') + circ(c, 8.5, C.css(col)) + circ(c, 3.6, 'rgba(255,255,255,0.92)');
  });
  const cp = [W - 26, 28];
  s += circ(cp, 17, C.css(P.PANEL, 0.85), ` stroke="#${t.LINE}" stroke-width="1.2"`) + `<polygon points="${poly([[cp[0], cp[1] - 12], [cp[0] - 5, cp[1]], [cp[0] + 5, cp[1]]])}" fill="#${t.DANGER}"/><polygon points="${poly([[cp[0], cp[1] + 12], [cp[0] - 5, cp[1]], [cp[0] + 5, cp[1]]])}" fill="#${t.MUTED}"/>`;
  s += `<rect x="2" y="${H - 22}" width="${W - 4}" height="20" fill="url(#eg${realm})"/>`;
  const tagBg = light ? 'rgba(237,237,227,0.86)' : 'rgba(18,23,26,0.80)';
  ids.forEach((gi, k) => {
    const r = rects[k], c = pts[k], bx = Math.min(r[0], c[0] - 14), by = Math.min(r[1], c[1] - 14), bx2 = Math.max(r[0] + r[2], c[0] + 14), by2 = Math.max(r[1] + r[3], c[1] + 14), mid = r[0] + r[2] / 2;
    let y = r[1] + 1, tt = '';
    lines[k].forEach(([txt, fs, b], li) => { tt += `<text x="${mid}" y="${f1(y + lineH(fs) * 0.8)}" text-anchor="middle" font-size="${fs}" font-weight="${b ? 700 : 400}" fill="#${li ? t.MUTED : t.TEXT}">${esc(txt)}</text>`; y += lineH(fs) - 2; });
    s += `<g class="mpin" data-reg="${gi}"><rect x="${bx}" y="${by}" width="${bx2 - bx}" height="${by2 - by}" rx="8" class="hit"/><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="6" fill="${tagBg}"/>${tt}</g>`;
  });
  return `<svg class="mapsvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(WD.REALMS[realm].name)} 지도">${s}</svg>`;
}
function worldInfoCard(realm) {
  const here = hereRegion(), info = WD.REALMS[realm];
  if (EXP.worldSel < 0) return `<div class="panel winfo"><b style="font-size:16px">${esc(info.name)} · ${esc(info.subtitle)}</b><p class="muted">지도에서 대지역 핀을 누르면 정보와 이동 버튼이 나옵니다. Lv.${info.level}부터 들어갈 수 있습니다.</p></div>`;
  const gi = EXP.worldSel, r = GD.REGIONS[gi], req = Number(r.min_level), isHere = gi === here, ok = canEnterRegion(gi), sec = travelDuration(gi);
  let status = isHere ? '지금 여기 있습니다' : sec > 0 ? '이동 ' + durationText(sec) : '바로 이동'; if (!ok) status = `Lv.${Math.max(Number(info.level), req - 3)}부터 들어갈 수 있습니다`;
  const busy = activityBusy();
  const goB = isHere ? `<button class="btn primary" data-go="explore" ${!ok || busy || incapacitated() ? 'disabled' : ''}>탐사 구역 열기</button>` : `<button class="btn primary" data-move="${gi}" ${!ok || busy || incapacitated() ? 'disabled' : ''}>이 지역으로 이동</button>`;
  const area = isHere ? '<button class="btn" data-go="explore">소지역 지도</button>' : '';
  return `<div class="panel winfo"><b style="font-size:17px;color:${isHere ? 'var(--accent)' : 'var(--text)'}">${isHere ? '● 현재 위치 · ' : ''}${esc(r.name)}</b><p class="muted">${esc(info.name)} · 권장 Lv.${req}–${Math.min(100, req + 4)} · 탐사 완료 ${regionDone(gi)}/10 · ${esc(status)}</p>
    <div class="row">${goB}${S.mobile ? '' : area}</div>${S.mobile ? area : ''}${busy ? '<p style="color:var(--warning);font-size:12px">진행 중인 이동·탐사·전투·제작을 마친 뒤 이동할 수 있습니다.</p>' : ''}</div>`;
}
function worldMapPage() {
  const here = hereRegion();
  if (EXP.worldRealm == null) EXP.worldRealm = Number(GD.REGIONS[here].realm);
  const realm = EXP.worldRealm;
  if (EXP.worldSel === -2 || (EXP.worldSel >= 0 && Number(GD.REGIONS[EXP.worldSel].realm) !== realm)) EXP.worldSel = Number(GD.REGIONS[here].realm) === realm ? here : -1;
  const sub = fieldStatus();
  let h = '';
  if (!S.mobile) h += `<div class="panel locbar"><span class="loc"><span class="dot"></span>${esc(locationText())}</span><button class="btn sm" id="bMap">지도 · 이동</button></div>`;
  h += S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>탐사 · 지도에서 대지역 고르기</h2></div><p class="muted sec-sub">${esc(sub)}</p>` : `<p class="crumb">${esc(sub)}</p><div class="pagehead"><h2>탐사 · 지도에서 대지역 고르기</h2></div>`;
  h += waitNote() ? `<div style="text-align:right;margin:-6px 0 8px">${waitNote()}</div>` : '';
  const hardBtn = Number(S.P.level) >= 100 || S.admin || S.P.hard_mode ? `<button class="rtab" id="hardB" style="--c:${S.P.hard_mode ? 'var(--danger)' : hardUnlocked() ? 'var(--warning)' : 'var(--subtle)'}" aria-pressed="${!!S.P.hard_mode}">${S.P.hard_mode ? '하드 모드 ON' : hardUnlocked() ? '하드 모드' : '하드 모드 · 잠김'}</button>` : '';
  h += `<div class="rtabs">${hardBtn}${WD.REALMS.map((r, i) => `<button class="rtab" data-realm="${i}" aria-pressed="${i === realm}">${i === Number(GD.REGIONS[here].realm) ? '● ' : ''}${esc(r.name)}</button>`).join('')}</div>`;
  h += `<div class="maphold w" id="worldMap"></div><div class="legend wl"><span style="color:var(--accent)">● 현재 위치</span><span style="color:var(--blue)">● 이동 가능</span><span class="subtle">● 레벨 부족</span><span style="color:var(--warning)">○ 선택</span><span style="color:#f2bb55">● 불빛 · 모두 밝힘</span></div>`;
  h += `<div id="worldInfo">${worldInfoCard(realm)}</div>`;
  return h;
}
let pulseTimer = 0;
function drawWorldMap() {
  const box = $('worldMap'); if (!box) return; const c = $('center');
  const W = Math.round(Math.max(300, Math.min(720, c.clientWidth - 8 - (S.mobile ? 4 : 8)))), H = Math.round(Math.max(200, Math.min(W * 0.48, Math.min(400, Math.max(200, window.innerHeight - 300)))));
  box.innerHTML = worldMapSvg(EXP.worldRealm, W, H);
  box.querySelectorAll('[data-reg]').forEach((g) => { g.onclick = () => { EXP.worldSel = Number(g.dataset.reg); drawWorldMap(); $('worldInfo').innerHTML = worldInfoCard(EXP.worldRealm); bindWorldInfo(); }; });
  const pl = box.querySelector('.pulse'); clearTimeout(pulseTimer);
  if (pl && !matchMedia('(prefers-reduced-motion: reduce)').matches) { pl.classList.add('run'); pulseTimer = setTimeout(() => pl.classList.remove('run'), 6000); }
}
function bindWorldInfo() { const w = $('worldInfo'); bindRO(w); w.querySelectorAll('[data-move]').forEach((b) => { b.onclick = () => requestMove(Number(b.dataset.move)); }); w.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); }
function bindWorldMap() {
  const c = $('center'); bindRO(c); { const hb = $('hardB'); if (hb) hb.onclick = hardModal; }
  c.querySelectorAll('[data-realm]').forEach((b) => { b.onclick = () => { EXP.worldRealm = Number(b.dataset.realm); const here = hereRegion(); EXP.worldSel = Number(GD.REGIONS[here].realm) === EXP.worldRealm ? here : -1; drawCenter(); }; });
  c.querySelectorAll('.locbar .btn').forEach((b) => { b.onclick = () => drawCenter(); });
  drawWorldMap(); bindWorldInfo();
}


/* ════════ 능력치 — workshop_ui.render_stats · main._stat_effects ════════ */
const pctText = (v) => { const s = (Math.round(v * 10) / 10).toFixed(1); return s.endsWith('.0') ? s.slice(0, -2) : s; };
const statName = (k) => (k === '체력' ? '건강' : k);
const DERIVED_ORDER = [['attack', '공격력', ''], ['crit', '치명타 확률', '%'], ['crit_dmg', '치명타 피해', '%'], ['evade', '회피율', '%'], ['defense', '방어력', ''], ['flee', '도주 확률', '%'], ['retreat', '안전지대 이동', '%'], ['loot', '전리품 획득률', '%'], ['rare', '희귀 획득률', '%'], ['recover', '회복 효율', '%'], ['xp_bonus', '경험치 보너스', '%'], ['craft_bonus', '제작 추가 산출', '%']];
const INT_KEYS = new Set(['attack', 'crit_dmg']);
function fmtDerived(key, v, unit) {
  if (!INT_KEYS.has(key) && unit === '%') return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%';
  if (INT_KEYS.has(key)) return String(Math.trunc(v)) + unit;
  const r = Math.round(v * 1e6) / 1e6; return (Number.isInteger(r) ? r.toFixed(1) : String(r)) + unit;
}
function overflowOf(s) { const sv = Math.max(0, Math.trunc(Number(s['생존력'] || 0)) - BD.OVF_SV), it = Math.max(0, Math.trunc(Number(s['지능'] || 0)) - BD.OVF_IT), ag = Math.max(0, Math.trunc(Number(s['민첩'] || 0)) - BD.OVF_AG); return { sv, it, ag, hp: sv * 2, wear: Math.min(30, sv * 0.5), craft: Math.min(30, it * 0.5), sell: Math.min(15, it * 0.2), travel: Math.min(25, ag * 0.3) }; }
function statEffects(stat) {
  const s = effStats(S.P.equipment || {}), v = Number(s[stat] || 0), sv = Number(s['생존력'] || 0), it = Number(s['지능'] || 0), o = overflowOf(s), mx = (on) => (on ? '(최대)' : '');
  let t = '', over = '', n = 0, hint = '';
  if (stat === '체력') t = `최대 체력 +${Math.trunc(v) * 5} · 방어 +${pctText(v * 0.25)}`;
  else if (stat === '힘') { t = `공격력 +${Math.trunc(softStat(v) * 1.6)} · 치명타 피해 ${Math.min(175, 125 + Math.trunc(v * 0.35))}%${mx(v >= 143)}`; if (v < 143) hint = '(힘 143에서 최대)'; }
  else if (stat === '민첩') { t = `치명타 ${pctText(snap(2 + 20 * v / (v + 50)))}% · 회피 ${pctText(snap(2 + 20 * v / (v + 60)))}% · 도망 +${Math.trunc(Math.min(42, v * 0.5))}%${mx(v >= 84)}`; if (v < 84) hint = '(민첩 84에서 최대)'; n = o.ag; over = `이동 시간 ${pctText(o.travel)}% 단축`; }
  else if (stat === '지능') { const loot = 40 + it * 0.35 + sv * 0.25; t = `획득률 ${Math.trunc(Math.min(75, loot))}%${mx(loot >= 75)} · 희귀 ${pctText(snap(Math.min(10, 1 + it * 0.08)))}%${mx(it >= 112.5)} · 경험치 +${Math.trunc(Math.min(70, it * 0.7))}%${mx(it >= 100)} · 제작 추가 ${Math.trunc(Math.min(50, it))}%${mx(it >= 50)}`; n = o.it; over = `제작 시간 ${pctText(o.craft)}% 단축 · 상점 판매가 +${pctText(o.sell)}%`; }
  else if (stat === '생존력') { t = `회복 효율 ${100 + Math.trunc(Math.min(50, v * 0.65))}%${mx(v * 0.65 >= 50)} · 허기 ${Math.trunc(Math.min(45, v * 3))}%${mx(v >= 15)} · 수분 ${Math.trunc(Math.min(35, v * 2))}%${mx(v >= 17.5)} 덜 줄어듦 · 상태 이상 저항 ${Math.trunc(Math.min(65, v * 2))}%${mx(v * 2 >= 65)} · 방어 +${pctText(v * 0.2)}`; n = o.sv; over = `최대 체력 +${o.hp} · 장비 내구도 ${pctText(o.wear)}% 덜 닳음`; }
  return { text: t, over: n > 0 ? over : '', n, hint };
}
const STAT = { draft: {} };
const draftTotal = () => Object.values(STAT.draft).reduce((a, b) => a + b, 0);
function withStats(st, fn) { const keep = S.P.stats; S.P.stats = st; try { return fn(); } finally { S.P.stats = keep; } }
function draftStats() { const st = { ...(S.P.stats || {}) }; for (const k in STAT.draft) st[k] = Number(st[k] || 0) + STAT.draft[k]; return st; }
function statsPage() {
  if (draftTotal() > Number(S.P.skill_points || 0)) STAT.draft = {};
  const free = Math.max(0, Number(S.P.skill_points || 0) - draftTotal()), ds = draftStats();
  const head = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>능력치</h2></div><p class="muted sec-sub">사용 가능한 포인트 ${Number(S.P.skill_points || 0)}</p>` : `<p class="crumb">사용 가능한 포인트 ${Number(S.P.skill_points || 0)}</p><div class="pagehead"><h2>능력치</h2></div>`;
  const rows = BD.STATS.map((st) => {
    const fx = statEffects(st), add = STAT.draft[st] || 0, cur = Number(S.P.stats?.[st] || 0);
    return `<div class="srow"><div class="info"><b>${statName(st)}</b><p>${esc(fx.text + (fx.hint && !S.mobile ? ' ' + fx.hint : ''))}</p>${fx.over ? `<div class="over"><span class="ob">상한 넘김 ${fx.n}</span><span>${esc(fx.over)}</span></div>` : ''}</div>
      ${add > 0 ? `<button class="sbtn" data-sd="${st}|-1" aria-label="${statName(st)} 빼기">-</button>` : ''}<b class="sv" style="color:${add > 0 ? 'var(--accent)' : 'var(--text)'}">${add > 0 ? `${cur} → ${cur + add}` : cur}</b><button class="sbtn plus" data-sd="${st}|1" ${free <= 0 ? 'disabled' : ''} aria-label="${statName(st)} 올리기">+</button></div>`;
  }).join('');
  let extra = '';
  if (draftTotal() > 0) {
    const before = derived(), after = withStats(ds, () => derived());
    const hp = withStats(ds, () => maxHealth(effStats(S.P.equipment || {})) + Number(gearMods(workingEq(S.P.equipment || {})).hp || 0));
    const ob = overflowOf(effStats(S.P.equipment || {})), oa = overflowOf(withStats(ds, () => effStats(S.P.equipment || {}))), parts = [];
    if (oa.sv !== ob.sv) parts.push(`생존력 상한 넘김 ${ob.sv} → ${oa.sv} · 장비 내구도 ${pctText(ob.wear)}% → ${pctText(oa.wear)}% 덜 닳음`);
    if (oa.it !== ob.it) parts.push(`지능 상한 넘김 ${ob.it} → ${oa.it} · 제작 시간 ${pctText(ob.craft)}% → ${pctText(oa.craft)}% 단축 · 판매가 +${pctText(ob.sell)}% → +${pctText(oa.sell)}%`);
    if (oa.ag !== ob.ag) parts.push(`민첩 상한 넘김 ${ob.ag} → ${oa.ag} · 이동 시간 ${pctText(ob.travel)}% → ${pctText(oa.travel)}% 단축`);
    extra = `<p class="group">세부 능력 · 현재 → 확정 후</p><p class="muted" style="font-size:14px;margin:0 0 6px">최대 체력 ${Number(S.P.max_hp)} → ${hp}</p>${parts.length ? `<p style="color:var(--accent);font-size:14px;white-space:pre-line;margin:0 0 6px">${esc(parts.join('\n'))}</p>` : ''}
      <div class="dgrid">${DERIVED_ORDER.map(([k, lab, u]) => `<span>${lab} · ${fmtDerived(k, before[k], u)} → ${fmtDerived(k, after[k], u)}</span>`).join('')}</div>
      <div class="note">확정한 포인트는 되돌릴 수 없습니다.</div><div class="brow"><button class="btn" id="sReset">선택 초기화</button><button class="btn primary" data-act="stats">${draftTotal()}포인트 확정</button></div>`;
  }
  return `${head}<div class="panel slist">${rows}</div>${extra}`;
}
function bindStats() {
  const c = $('center'); bindRO(c); bindAct(c);
  const redraw = () => { const top = c.scrollTop; c.innerHTML = statsPage(); bindStats(); c.scrollTop = top; };
  c.querySelectorAll('[data-sd]').forEach((b) => { b.onclick = () => { const [st, d] = b.dataset.sd.split('|'); const old = STAT.draft[st] || 0, free = Math.max(0, Number(S.P.skill_points || 0) - draftTotal()); STAT.draft[st] = Math.max(0, Math.min(old + Number(d), old + free)); redraw(); }; });
  const r = $('sReset'); if (r) r.onclick = () => { STAT.draft = {}; redraw(); };
}

/* ════════ 퀘스트 — main._render_quests ════════ */
function questKeys() {
  const days = Math.floor((kstNow() - 6 * 3600) / 86400), monday = days - ((days + 3) % 7);
  const ds = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
  return { daily: ds(days), weekly: ds(monday) };
}
const QUEST_REROLLS = { daily: 3, weekly: 2 };
/* main._quest_sync · _quest_pick — 새 기간이면 기록을 비우고 조건이 맞는 퀘스트를 무작위로 뽑습니다 */
function gShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = GR.next() % (i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function questNeedOk(need) { const p = S.P; switch (need) { case '': return true; case 'companion': return Object.values(p.companions || {}).some((c) => c && c.joined); case 'pet': return (p.pets || []).length > 0;
  case 'unlit': return GD.REGIONS.some((r, gi) => !regionLit(gi)); case 'unlit10': return normalVisited().length + 10 <= locations().length; case 'gear': return !!(p.equipment?.['무기'] || p.equipment?.['방어구']);
  case 'friend': return (S.friends || []).length > 0; case 'stash': return nonEmpty(p.stash); case 'boss': return typeof coopBossActive === 'function' && coopBossActive(); case 'online': return !!LIVE.on;
  case 'merchant': return !!merchantNow(); case 'hub_event': { const e = p.hub_event || {}; return nonEmpty(e) && String(e.status || '') === 'pending' && (e.admin ? kstNow() < Number(e.until_kst || 0) : Number(e.day) === Math.floor(kstNow() / 86400)) && (e.admin || petWindow()); }
  case 'below100': return Number(p.level) < 100; case 'story': return Number(p.story || 0) < D.story_data.CHAPTERS.length; case 'facility': return GD.REGIONS.some((r, gi) => regionLit(gi)); case 'party': return (S.party || []).length > 0; case 'bag_room': return true; case 'realm2': return Number(p.level) >= 20; }
  return true; }
function questPick(scope) { const pool = gShuffle((scope === 'daily' ? QD.DAILY : QD.WEEKLY).filter((q) => questNeedOk(String(q.need || '')))), out = [], groups = {};
  for (const q of pool) { if (out.length >= QD.PICK[scope]) break; if (groups[String(q.group)]) continue; groups[String(q.group)] = true; out.push(String(q.id)); }
  for (const q of pool) { if (out.length >= QD.PICK[scope]) break; if (!out.includes(String(q.id))) out.push(String(q.id)); } return out; }
function questSync() { const p = S.P; if (!p) return; const keys = questKeys(); if (!p.quests || typeof p.quests !== 'object') p.quests = { daily: { key: '', progress: {}, claimed: [] }, weekly: { key: '', progress: {}, claimed: [] } };
  for (const sc of ['daily', 'weekly']) { let q = p.quests[sc]; if (!q || String(q.key || '') !== keys[sc]) { q = p.quests[sc] = { key: keys[sc], progress: {}, claimed: [], seen: {} }; LIFE.dirty = true; }
    if (!Array.isArray(q.picked) || !q.picked.length) { q.picked = questPick(sc); LIFE.dirty = true; } if (!q.seen || typeof q.seen !== 'object' || Array.isArray(q.seen)) q.seen = {}; } }
const rewardMoney = (r) => Number(r.money ?? Math.trunc(Number(r.xp || 0) / 2));
function rewardText(r) { const p = []; if (r.xp != null) p.push(`경험치 ${Number(r.xp)}`); if (rewardMoney(r) > 0) p.push(won(rewardMoney(r))); if (r.points != null) p.push(`능력치 포인트 ${Number(r.points)}`); if (r.items) for (const k in r.items) p.push(`${k} × ${Number(r.items[k])}`); return '보상: ' + p.join(', '); }
function questsPage() {
  questSync(); const keys = questKeys(); let on = 0, dn = 0; const stale = {};
  for (const sc of ['daily', 'weekly']) { const q = S.P.quests?.[sc] || {}; stale[sc] = String(q.key || '') !== keys[sc]; if (stale[sc]) continue; for (const x of questList(sc)) { if ((q.claimed || []).includes(x.id)) dn++; else if (Number(q.progress?.[x.kind] || 0) > 0) on++; } }
  const sub = `진행 중 ${on} · 완료 ${dn} · 일일 4개는 매일, 주간 5개는 월요일 오전 6시에 새로 뽑힙니다 · 완료하지 않은 퀘스트는 다시 뽑을 수 있습니다`;
  let h = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>퀘스트</h2></div><p class="muted sec-sub">${esc(sub)}</p>` : `<p class="crumb">${esc(sub)}</p><div class="pagehead"><h2>퀘스트</h2></div>`;
  for (const sc of ['daily', 'weekly']) {
    const qs = S.P.quests?.[sc] || {}, name = sc === 'daily' ? '일일 퀘스트' : '주간 퀘스트';
    if (stale[sc]) { h += `<p class="group">${name}</p><div class="note">새 ${sc === 'daily' ? '하루' : '한 주'}가 시작되어 퀘스트를 새로 뽑을 차례입니다. 잠시 뒤 새 퀘스트가 뽑힙니다.</div>`; continue; }
    const list = questList(sc), claimed = qs.claimed || [], nd = list.filter((q) => claimed.includes(q.id)).length, left = Math.max(0, QUEST_REROLLS[sc] - Number(qs.rerolls || 0));
    h += `<p class="group">${name} · ${nd}/${list.length} 완료</p><button class="btn reroll" data-qrr="${sc}" ${left <= 0 ? 'disabled' : ''} title="보상을 받았거나 완료한 퀘스트는 바뀌지 않습니다.">↻ 다시 뽑기 · 남은 ${left}번 (${sc === 'daily' ? '하루 3번' : '한 주 2번'})</button>`;
    for (const q of list) {
      const have = Math.min(Number(qs.progress?.[q.kind] || 0), Number(q.goal)), cl = claimed.includes(q.id), done = questDone(sc, q);
      const st = cl ? ['완료', 'var(--accent)'] : done ? ['보상 대기', 'var(--warning)'] : have > 0 ? ['진행 중', 'var(--accent)'] : ['새 퀘스트', 'var(--warning)'];
      let rw = rewardText(q.reward || {}); if (sc === 'daily' && q.id === 'd_explore' && !S.P.first_quest_bonus) rw += ' · 첫 완료 +500원';
      const shown = cl ? Number(q.goal) : (done ? Number(q.goal) : have);
      h += `<div class="panel qcard" style="${done && !cl ? 'border-color:var(--warning)' : ''}"><div class="h"><b style="color:${cl ? 'var(--muted)' : 'var(--text)'}">${esc(q.title)}</b><span style="color:${st[1]}">${st[0]}</span></div>
        <p class="muted">${esc(cl ? q.desc : `${q.desc} (${have}/${q.goal})`)}</p><div class="bar qb"><i style="width:${Math.min(100, (cl ? Number(q.goal) : have) / Math.max(1, Number(q.goal)) * 100)}%;background:${done && !cl ? 'var(--warning)' : 'var(--accent)'}"></i></div>
        <p class="rw">${esc(rw)}</p>${done && !cl ? `<button class="btn warnfill" data-act="claimq" data-scope="${sc}" data-id="${esc(q.id)}">보상 받기</button>` : ''}</div>`;
      void shown;
    }
  }
  h += groupQuests();
  return h;
}

/* ════════ 상점 — trade_ui.render ════════ */
const SHOP = { tab: 'buy', qty: {} };
const ghash = (s) => { let h = 5381; for (const ch of s) h = (Math.imul(h, 33) + ch.codePointAt(0)) >>> 0; return h; };
const SHOP_ALWAYS = ['물', '통조림', '붕대', '탄약'];
const tierLevel = (t) => Number(GD.TIER_LEVEL[String(t)] ?? GD.TIER_LEVEL[t] ?? 1);
let _stockKey = '', _stock = [];
function shopEntries() {
  const block = Math.floor(kstNow() / 21600), key = `${block}|${Number(S.P.level)}`; if (key === _stockKey) return _stock;
  const rng = new GRng(ghash(`lastlight-shop-${block}`)), out = [], bySlot = {};
  for (const e of GD.SHOP) {
    const n = String(e[0]);
    if (tabOf(n) !== '장비') { if (SHOP_ALWAYS.includes(n) || rng.randf() < 0.5) out.push(e); continue; }
    const sl = cat(n).slot || '기타'; if (!bySlot[sl]) bySlot[sl] = [[], []];
    bySlot[sl][Number(S.P.level) >= tierLevel(e[1]) ? 0 : 1].push(e);
  }
  for (const sl of Object.keys(bySlot)) {
    const want = rng.randiRange(2, 3), pick = [];
    for (const grp of bySlot[sl]) { let pool = grp.slice().sort((a, b) => Number(b[1]) - Number(a[1])); pool = pool.slice(0, Math.max(want * 2, 4)); while (pick.length < want && pool.length) { const i = rng.randiRange(0, pool.length - 1); pick.push(pool[i]); pool.splice(i, 1); } }
    out.push(...pick);
  }
  if (Number(S.P.level) >= 50 && rng.randf() < 0.35) { const di = D.deep_items.ITEMS, pool = Object.keys(di).filter((dn) => Number(di[dn].level ?? 50) <= Number(S.P.level) + 5); if (pool.length) out.push([pool[rng.randiRange(0, pool.length - 1)], 3]); }
  _stockKey = key; _stock = out; return out;
}
const shopListed = (it) => { const e = shopEntries().find((x) => String(x[0]) === it); return !!e && Number(S.P.level) >= tierLevel(e[1]); };
function shopState() { const day = String(Math.floor((kstNow() - 6 * 3600) / 86400)); const same = String(S.P.shop_day || '') === day; return { bought: same ? Math.max(0, Number(S.P.shop_bought || 0)) : 0, sold: same ? Math.max(0, Number(S.P.shop_sold || 0)) : 0, items: same && S.P.shop_bought_items && typeof S.P.shop_bought_items === 'object' ? S.P.shop_bought_items : {} }; }
const sellDaily = () => 4000 + 1000 * Math.floor(Math.max(1, Math.min(100, Number(S.P.level || 1))) / 10);
const isFish = (it) => !!GD.ITEMS[it]?.fish;
const priceOf = (it) => Number(cat(it).price || 5);
const sellPriceOf = (it) => Number(cat(it).sell || 1);
function fits(it, n) { if (n <= 0) return true; const extra = Math.ceil((count(it) + n) / 99) - Math.ceil(count(it) / 99); return extra === 0 || slotsUsed(tabOf(it)) + extra <= slotCap(tabOf(it)); }
function maxQty(it, sell) {
  const ss = shopState(); if (nonEmpty(S.P.travel) || S.P.dead) return 0;
  if (sell) { if (isFish(it)) return 0; let a = Math.min(99, count(it) - (isWorn(it) ? 1 : 0)); a = Math.min(a, Math.floor(Math.max(0, sellDaily() - ss.sold) / sellPriceOf(it))); return Math.max(0, a); }
  if (!shopListed(it)) return 0;
  const left = tabOf(it) === '장비' ? 3 - ss.bought : 99 - Number(ss.items[it] || 0);
  let a = Math.min(99, Math.min(Math.max(0, left), Math.floor(Number(S.P.money || 0) / priceOf(it)))); while (a > 0 && !fits(it, a)) a--; return Math.max(0, a);
}
const bagPrice = (cap) => { const n = Math.max(0, Math.trunc((cap - 20) / 5)); return 180 + 170 * n + 3 * n * n; };
function shopLine(title, desc, price, qtyItem, label, enabled, sell, actAttr = '') {
  let pick = '';
  if (qtyItem) { const top = Math.max(1, Math.min(99, maxQty(qtyItem, sell))); if (top > 1) { const opts = [1, 2, 3, 5, 10, 20, 50, 99].filter((n) => n < top).concat([top]); const want = Math.max(1, Math.min(top, SHOP.qty[qtyItem] || 1)); let idx = 0; opts.forEach((n, i) => { if (n <= want) idx = i; }); pick = `<select class="qsel" data-q="${esc(qtyItem)}" aria-label="수량">${opts.map((n, i) => `<option value="${n}" ${i === idx ? 'selected' : ''}>${n}개</option>`).join('')}</select>`; } }
  return `<div class="sline"><div class="tx"><b>${esc(title)}</b><p>${esc(desc)}</p></div>${price ? `<b class="pr">${esc(price)}</b>` : ''}${pick}<button class="btn ${enabled ? 'primary' : ''}" ${actAttr || (qtyItem ? `data-act="trade" data-item="${esc(qtyItem)}" data-sell="${sell ? 1 : 0}"` : 'data-ro')} ${enabled ? '' : 'disabled'}>${esc(label)}</button></div>`;
}
function shopPage() {
  const ss = shopState(), sell = SHOP.tab === 'sell';
  const sub = `소지금 ${won(S.P.money)} · 장비 오늘 ${ss.bought} / 3개 · 판매 수입 ${won(ss.sold)} / ${won(sellDaily())} · 진열 교체 ${durationText(21600 - kstNow() % 21600)} 뒤`;
  let h = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>상점</h2></div><p class="muted sec-sub">${esc(sub)}</p>` : `<p class="crumb">${esc(sub)}</p><div class="pagehead"><h2>상점</h2></div>`;
  h += `<div class="ptabs">${[['사기', 'buy'], ['팔기', 'sell'], ['가방 확장', 'bag'], ['수리소', 'repair']].map(([l, k]) => `<button data-stab="${k}" aria-pressed="${SHOP.tab === k}">${l}</button>`).join('')}</div>`;
  { const mv = merchantNow(); if (mv) h += `<div class="panel irow"><span class="tchip" style="color:var(--warning)">행상인</span><div class="tx"><b>행상인 · 특별 물품</b><span>남은 ${durationText(Math.max(0, mv.end - kstNow()))} · 레벨 제한 없이 구매</span></div><button class="btn" data-go="merchant">보기</button></div>`; }
  if (nonEmpty(S.P.travel)) h += '<div class="note">이동 중에는 가격과 목록만 볼 수 있습니다. 거래는 도착 후 가능합니다.</div>';
  if (SHOP.tab === 'bag') {
    h += `<div class="panel slistc">${GD.TABS.map((tab) => { const cap = slotCap(tab), price = bagPrice(cap), max = cap >= GD.MAX_SLOTS, ok = !max && Number(S.P.money) >= price && !nonEmpty(S.P.travel);
      return shopLine(`${tab} 가방`, max ? `최대 ${GD.MAX_SLOTS}칸입니다.` : `${cap}칸 → ${Math.min(GD.MAX_SLOTS, cap + GD.EXPAND_STEP)}칸`, max ? '' : won(price), null, Number(S.P.money) >= price || max ? '확장' : '소지금 부족', ok, false, `data-act="bag" data-tab="${tab}"`); }).join('')}</div>`;
    return h;
  }
  let found = false, fishHidden = 0;
  for (const tab of GD.TABS) {
    const rows = [];
    if (sell) { for (const it of tabItems(tab)) { if (isFish(it)) { fishHidden += count(it); continue; } rows.push([it, true]); } }
    else for (const e of shopEntries()) if (tabOf(String(e[0])) === tab) rows.push([String(e[0]), shopListed(String(e[0])), Number(e[1])]);
    if (!rows.length) continue; found = true;
    h += `<p class="tablab">${tab}</p><div class="panel slistc">${rows.map(([n, ok, tier]) => { const mq = maxQty(n, sell), price = sell ? sellPriceOf(n) : priceOf(n), lack = !sell && Number(S.P.money) < price;
      const desc = (sell || ok ? cat(n).effect : `Lv.${tierLevel(tier)}부터 구매할 수 있습니다.`) + ` · 보유 ${count(n)}개`;
      return shopLine(n, desc, won(price), mq > 0 ? n : null, sell ? '판매' : lack ? '소지금 부족' : '구매', mq > 0, sell); }).join('')}</div>`;
  }
  if (sell && fishHidden > 0) h += `<button class="btn" style="width:100%;color:var(--blue);margin-top:8px" data-go="fishing">낚은 생선 ${fishHidden}마리는 낚시 화면에서만 팔 수 있습니다 · 낚시로 가기 ›</button>`;
  if (!found) h += '<div class="note">거래할 물품이 없습니다.</div>';
  return h;
}
function bindShop() {
  const c = $('center'); bindRO(c); bindAct(c); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-stab]').forEach((b) => { b.onclick = () => { if (b.dataset.stab === 'repair') { go('repair'); return; } SHOP.tab = b.dataset.stab; c.innerHTML = shopPage(); bindShop(); }; });
  c.querySelectorAll('.qsel').forEach((s) => { s.onchange = () => { SHOP.qty[s.dataset.q] = Number(s.value); }; });
  c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
}

/* ════════ 장비 — feature_ui.render_equipment · EquipDoll ════════ */
const EQ = { sel: '무기' };
const DOLL_LAYOUT = { '머리': [1, 22, 30], '악세사리': [1, 10, 68], '방어구': [1, 24, 130], '도구': [1, 58, 214], '이동': [1, 45, 384], '낚싯대': [-1, -14, 110], '무기': [-1, -58, 214], '탈것': [-1, -45, 384] };
const DOLL_FIG = [[1.7, 237.8], [7.2, 244.4], [29.4, 380.0], [37.2, 388.9], [55.0, 390.0], [61.7, 382.2], [41.7, 217.8], [47.2, 213.3], [61.7, 222.2], [70.6, 216.7], [72.8, 206.7], [52.8, 122.2], [39.4, 91.1], [28.3, 78.9], [16.1, 72.2], [12.8, 65.6]];
const DOLL_HINTS = { '머리': '머리에 쓰는 장비', '악세사리': '목걸이 · 반지 등', '방어구': '몸에 입는 장비', '도구': '손에 드는 도구', '이동': '걷기', '낚싯대': '낚시에 필요', '무기': '손에 드는 무기', '탈것': '자전거 · 오토바이 등' };
const slotItem = (sl) => String((['탈것', '이동'].includes(sl) ? mobility() : (S.P.equipment || {}))[sl] || '');
function gearDescription(name) {
  const it = GEAR.ITEMS[name]; if (!it) return String(GEAR.SPECIAL?.[name]?.desc || '');
  if (String(it.slot) === '낚싯대') return `[${it.grade}] 낚싯대 · ${it.fish_desc || ''}`;
  const L = { attack: '공격력', defense: '방어력', crit: '치명타', evade: '회피', hp: '최대 체력', loot: '획득률', recover: '회복 효율', resist: '상태 저항', morale_guard: '사기 보호', '체력': '건강', xp: '경험치', rare: '희귀 발견' };
  const parts = [], dr = [], sg = (v) => (v >= 0 ? '+' : '') + v;
  for (const k in it.mods) { const v = Math.trunc(Number(it.mods[k])); if (k === 'hunger_drain') dr.push(`허기 -${v}/분`); else if (k === 'hp_drain') dr.push(`체력 -${v}/분`); else if (k === 'bleed_extra' || k === 'infection_extra') dr.push((k === 'bleed_extra' ? '출혈' : '감염') + ` 위험 +${v}%`); else if (v < 0) dr.push(`${L[k] || k} ${sg(v)}`); else parts.push(`${L[k] || k} ${sg(v)}`); }
  return `[${it.grade}] ${it.slot} · Lv.${Math.trunc(Number(it.level))} · ${parts.join(' / ')}${dr.length ? ' · 대가: ' + dr.join(' / ') : ''}`;
}
const itemDescription = (it) => { const d = [cat(it).effect]; if (isWorn(it)) d.push('장착 중'); d.push('판매가 ' + won(sellPriceOf(it))); return d.join(' · '); };
function chaikin(pts, iters) { let cur = pts; for (let i = 0; i < iters; i++) { const nx = []; for (let k = 0; k < cur.length; k++) { const a = cur[k], b = cur[(k + 1) % cur.length]; nx.push([a[0] + (b[0] - a[0]) * 0.25, a[1] + (b[1] - a[1]) * 0.25], [a[0] + (b[0] - a[0]) * 0.75, a[1] + (b[1] - a[1]) * 0.75]); } cur = nx; } return cur; }
function dollHtml(W, H) {
  const t = TH(), k = Math.min(H * 0.72 / 380, W * 0.30 / 150), pt = (dx, y) => [W * 0.5 + dx * k, (H - 380 * k) * 0.5 + (y - 10) * k];
  const base = C.css(C.lerp(C.p(t.PANEL_2), C.p(t.SUBTLE), 0.30)), shade = C.css(C.lerp(C.p(t.PANEL_2), C.p(t.SUBTLE), 0.45)), ink = C.css(C.p(t.SUBTLE), 0.7);
  const fig = DOLL_FIG.map((q) => pt(q[0], q[1])).concat(DOLL_FIG.slice().reverse().map((q) => pt(-q[0], q[1])));
  const body = chaikin(fig, 2), hc = pt(0, 38.3), clipY = pt(0, 36)[1];
  let s = `<defs><clipPath id="dollHeadTop"><rect x="0" y="0" width="${W}" height="${f1(clipY)}"/></clipPath></defs>`;
  s += `<polygon points="${poly([pt(-12, 52), pt(12, 52), pt(12, 74), pt(-12, 74)])}" fill="${base}"/><polygon points="${poly(body)}" fill="${base}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>`;
  s += `<ellipse cx="${f1(hc[0])}" cy="${f1(hc[1])}" rx="${f1(30 * k)}" ry="${f1(30.6 * k)}" fill="${base}"/><ellipse cx="${f1(hc[0])}" cy="${f1(hc[1])}" rx="${f1(30 * k)}" ry="${f1(30.6 * k)}" fill="${shade}" clip-path="url(#dollHeadTop)"/><ellipse cx="${f1(hc[0])}" cy="${f1(hc[1])}" rx="${f1(30 * k)}" ry="${f1(30.6 * k)}" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
  const cw = Math.min(130, W * 0.27), CH = 74; let cards = '';
  for (const side of [-1, 1]) {
    const slots = Object.keys(DOLL_LAYOUT).filter((x) => DOLL_LAYOUT[x][0] === side).sort((a, b) => DOLL_LAYOUT[a][2] - DOLL_LAYOUT[b][2]), n = slots.length;
    slots.forEach((sl, i) => {
      const y = side > 0 ? (H - CH) * i / Math.max(1, n - 1) : [H * 0.06, (H - CH) * 0.5, H * 0.70][Math.min(i, 2)], x = side < 0 ? 2 : W - cw - 2, name = slotItem(sl), on = sl === EQ.sel;
      cards += `<button class="dcard${on ? ' on' : ''}" data-eq="${sl}" style="left:${f1(x)}px;top:${f1(y)}px;width:${f1(cw)}px"><small>${sl}</small><b>${esc(name || '비어 있음')}</b><span>${esc(name ? shortEffect(name) : DOLL_HINTS[sl])}</span></button>`;
    });
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>${cards}`;
}
function equipmentPage() {
  if (!DOLL_LAYOUT[EQ.sel]) EQ.sel = '무기';
  const head = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>장비</h2></div><p class="muted sec-sub">칸을 누르면 자세히 보기와 해제를 할 수 있습니다</p>` : `<p class="crumb">칸을 누르면 자세히 보기와 해제를 할 수 있습니다</p><div class="pagehead"><h2>장비</h2></div>`;
  const name = slotItem(EQ.sel);
  let det = `<div class="panel eqdet"><small style="color:var(--accent);font-weight:700">${EQ.sel}</small>`;
  if (!name) det += '<b style="font-size:22px;color:var(--subtle)">비어 있음</b><p class="muted">가방 › 인벤토리의 장비 탭에서 물품을 눌러 장착하세요.</p>';
  else {
    det += `<b style="font-size:22px">${esc(name)}</b><p class="muted">${esc(GEAR.ITEMS[name] ? gearDescription(name) : itemDescription(name))}</p>`;
    if (['무기', '방어구'].includes(EQ.sel) && durApplies(name)) { const dv = durValue(name); det += `<div class="durrow"><span>내구도</span><span>${dv}%</span></div><div class="bar" style="height:8px"><i style="width:${dv}%;background:${dv > 30 ? 'var(--accent)' : 'var(--danger)'}"></i></div>`; }
    det += `<div class="brow"><button class="btn" id="eqMore">자세히 보기</button><button class="btn danger" data-act="unequip" data-slot="${EQ.sel}" ${S.P.dead ? 'disabled' : ''}>해제</button></div>`;
  }
  det += '</div>';
  const cands = [];
  for (const it of Object.keys(S.P.inventory || {})) {
    if (count(it) <= 0 || it === name || cands.includes(it)) continue;
    const fit = ['탈것', '이동'].includes(EQ.sel) ? !!(BD.MOVE_ITEMS[it]?.move != null && ((String(BD.MOVE_ITEMS[it].cat) === '탈것') === (EQ.sel === '탈것'))) : cat(it).slot === EQ.sel;
    if (fit) cands.push(it);
  }
  let sw = '<div class="panel eqsw"><b style="font-size:16px">가방에서 바꿔 끼우기</b>';
  if (!cands.length) sw += '<p class="subtle" style="margin:0;font-size:13px">이 칸에 맞는 물품이 가방에 없습니다.</p>';
  for (const it of cands.slice(0, 6)) {
    const cmp = cat(it).slot ? gearCompare(it) : null, txt = cmp && cmp.rows && cmp.rows.length ? cmp.rows.join(' · ') : itemDescription(it);
    const vc = cmp && cmp.verdict ? (cmp.verdict === '더 좋음' ? 'var(--accent)' : cmp.verdict === '더 나쁨' ? 'var(--danger)' : 'var(--warning)') : '';
    sw += `<div class="swrow"><div class="tx"><b>${esc(it)}</b><span>${esc(txt)}</span></div>${cmp && cmp.verdict ? chipL(cmp.verdict, vc) : ''}<button class="btn primary" data-act="use" data-item="${esc(it)}">장착</button></div>`;
  }
  sw += '</div>';
  const d = derived();
  const grid = `<div class="eqgrid">${[['공격력', String(Math.trunc(d.attack))], ['방어력', String(Math.trunc(d.defense))], ['치명타', fmtDerived('crit', d.crit, '%')], ['회피', fmtDerived('evade', d.evade, '%')]].map(([a, b]) => `<div class="panel"><small>${a}</small><b>${b}</b></div>`).join('')}</div>`;
  const wide = !S.mobile && $('center').clientWidth >= 660;
  let foot = '';
  if (S.mobile) foot = '<p class="group">내구도 · 사용과 수리</p><div class="note">수리는 상점 › 수리소에서 합니다. 수리소는 다음 단계에서 옮깁니다.</div><div class="note">전동 스쿠터/오토바이(탈것)는 광역 이동 20분. 자전거/운동화(이동) 같은 장비는 광역 이동을 단축합니다.</div>';
  return `${head}<div class="eqcols${wide ? ' wide' : ''}"><div class="panel dollcard"><div class="doll" id="doll"></div></div><div class="eqright">${det}${sw}${grid}</div></div>${foot}`;
}
function drawDoll() { const box = $('doll'); if (!box) return; const W = Math.max(280, Math.floor(box.clientWidth)), H = S.mobile ? 380 : 440; box.style.height = H + 'px'; box.innerHTML = dollHtml(W, H); box.querySelectorAll('[data-eq]').forEach((b) => { b.onclick = () => { EQ.sel = b.dataset.eq; const c = $('center'), top = c.scrollTop; c.innerHTML = equipmentPage(); bindEquipment(); c.scrollTop = top; }; }); }
function bindEquipment() {
  const c = $('center'); bindRO(c); bindAct(c); drawDoll();
  const m = $('eqMore'); if (m) m.onclick = () => { const n = slotItem(EQ.sel); modal(`${EQ.sel} 칸`, `<p style="font-size:18px;color:var(--text)">${esc((cat(n).tag ? '[' + cat(n).tag + '] ' : '') + n)}</p><p>${esc(GEAR.ITEMS[n] ? gearDescription(n) : itemDescription(n))}</p>${['무기', '방어구'].includes(EQ.sel) && durApplies(n) ? `<p style="color:var(--warning)">내구도 ${durValue(n)} / 100</p>` : ''}`, [['해제', '', () => runAct({ dataset: { act: 'unequip', slot: EQ.sel } })], ['닫기', 'primary', null]]); };
}


/* ════════ 거점 시설 공통 · 수리소 · 행상인 ════════ */
/* main._add_choice: 왼쪽 색 띠 · 번호 · 제목 · 설명 */
function choiceRow(num, title, desc, color, enabled = true, attrs = '') {
  return `<button class="choice2" style="--t:${color}" ${enabled ? '' : 'disabled'} ${attrs}><span class="n">${num && num <= 9 ? num : ''}</span><span class="c"><b>${escJ(title)}</b>${desc ? `<span>${escJ(desc)}</span>` : ''}</span></button>`;
}
const noteBox = (t) => `<div class="note">${escJ(t)}</div>`;
const groupLab = (t) => `<p class="group">${escJ(t)}</p>`;
function facilityTabs(cur) {
  return `<div class="ftabs">${[['shop', '상점', '#f0c674'], ['repair', '수리소', 'var(--blue)'], ['stash', '보관 상자', 'var(--accent)']].map(([k, l, c]) => `<button class="rtab" style="--c:${c}" data-fac="${k}" aria-pressed="${k === cur}">${l}</button>`).join('')}</div>`;
}
function bindFacTabs(root) { root.querySelectorAll('[data-fac]').forEach((b) => { b.onclick = () => { const k = b.dataset.fac; if (k !== S.mode) go(k); }; }); }
const busyReason = () => { const p = S.P; if (p.dead) return '쓰러진 상태입니다.'; if (nonEmpty(p.combat)) return '전투 중입니다.'; if (nonEmpty(p.pending_explore)) return '탐사(수색) 중입니다.'; if (nonEmpty(p.long_expedition)) return '장기 탐사 중입니다.'; if (nonEmpty(p.travel)) return '지역 이동 중입니다.'; if (p.at_hub === false) return "지금은 탐사 구역에 있습니다. 아래쪽 '거점' 메뉴로 현지 거점에 들어가 주세요."; return ''; };

/* 수리소 — gear_durability.render */
const REPAIR = { policy: { fee: 5, rate: 20 }, tab: '무기', sel: '', points: 100, subscribed: false };
const GRADE_PRICE_MULT = { F: 1, E: 1, D: 1.1, C: 1.2, B: 1.35, A: 1.5, S: 1.7 };
const damagedList = () => Object.keys(S.P.inventory || {}).filter((it) => durApplies(it) && count(it) > 0 && durValue(it) < 100);
function repairPrice(it, amount = 100) {
  if (!durApplies(it) || count(it) <= 0) return 0; const restored = Math.min(Math.max(0, amount), 100 - durValue(it)); if (restored <= 0) return 0;
  let base = priceOf(it); if (GEAR.ITEMS[it]) base = Math.round(Number(GEAR.ITEMS[it].price ?? base) * (GRADE_PRICE_MULT[cat(it).grade] || 1));
  return Number(REPAIR.policy.fee) + Math.ceil(Math.max(0, base) * Number(REPAIR.policy.rate) / 100 * restored / 100);
}
function durText(it) { if (!durApplies(it) || count(it) <= 0) return ''; const eq = S.P.equipment || {}, v = durValue(it); if (v <= 0 && it === String(eq['무기'] || '')) return '내구도 0 / 100 · 수리 전까지 맨주먹'; if (v <= 0 && it === String(eq['방어구'] || '')) return '내구도 0 / 100 · 수리 전까지 맨몸'; return `내구도 ${v} / 100`; }
const itemDisplay = (it) => (UI.tags && cat(it).tag ? `[${cat(it).tag}] ` : '') + it;
function repairPage() {
  if (!REPAIR.subscribed && bridge()?.watchRepairPolicy && S.acct?.uid) { REPAIR.subscribed = true; sub('watchRepairPolicy', [], (r) => { if (r.ok) { REPAIR.policy = { fee: Math.max(0, Math.min(1000, Number(r.fee ?? 5))), rate: Math.max(0, Math.min(100, Number(r.rate ?? 20))) }; if (S.mode === 'repair') drawCenter(); } }); }
  const allowed = busyReason() === '';
  let h = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>거점 시설 · 수리소</h2></div><p class="muted sec-sub">복구량과 금액을 확인한 뒤 확정하세요.</p>` : `<p class="crumb">복구량과 금액을 확인한 뒤 확정하세요.</p><div class="pagehead"><h2>거점 시설 · 수리소</h2></div>`;
  h += facilityTabs('repair');
  h += noteBox(`공임 ${won(REPAIR.policy.fee)} + 정가 × 복구량/100 × 수리율 ${REPAIR.policy.rate}%. 공임은 장비마다 1회입니다. 무기와 방어구는 내구도 0이 되어도 사라지지 않고, 수리하면 다시 쓸 수 있습니다(0인 동안 무기는 맨주먹, 방어구는 맨몸).`);
  if (!allowed) h += noteBox('현재는 견적만 확인할 수 있습니다. ' + (busyReason() || '현지 거점에서 이동·탐사·제작을 마쳐 주세요.'));
  h += `<div class="rprow">${['무기', '방어구'].map((k) => `<button class="btn" data-rtab="${k}" style="${k === REPAIR.tab ? 'color:var(--accent);border-color:var(--accent)' : ''}">${k}</button>`).join('')}</div>`;
  const list = damagedList(); let num = 0;
  for (const it of list) { const isW = !!(GD.WEAPONS[it] || (GEAR.ITEMS[it] && String(GEAR.ITEMS[it].slot) === '무기')); if ((REPAIR.tab === '무기') !== isW) continue; num++; h += choiceRow(num, itemDisplay(it), durText(it) + ' · 전체수리 ' + won(repairPrice(it)), REPAIR.sel === it ? 'var(--accent)' : 'var(--blue)', true, `data-rsel="${esc(it)}"`); }
  if (!list.length) h += noteBox('손상된 무기나 방어구가 없습니다.');
  if (REPAIR.sel && count(REPAIR.sel) > 0 && durValue(REPAIR.sel) < 100) {
    const it = REPAIR.sel, miss = 100 - durValue(it); REPAIR.points = Math.max(1, Math.min(REPAIR.points, miss)); const q = repairPrice(it, REPAIR.points);
    h += groupLab('선택 장비 · ' + itemDisplay(it));
    h += `<label class="spin"><span>복구</span><input type="number" id="rpPts" min="1" max="${miss}" value="${REPAIR.points}"><span>점</span></label><p id="rpPrev" style="font-size:15px;margin:6px 2px 8px">내구도 ${durValue(it)} → ${durValue(it) + REPAIR.points} / 100 · 비용${won(q)} · 보유${won(S.P.money)}</p><button class="btn primary" style="width:100%;min-height:44px;margin-bottom:8px" data-act="repair" data-item="${esc(it)}" ${allowed && Number(S.P.money) >= q ? '' : 'disabled'}>수리 확정</button>`;
    for (const tool of ['간이 수리 키트', '정밀 수리 키트']) { num++; h += choiceRow(num, tool + ' 사용', `보유 ${count(tool)}개 · 최대 ${Number(GD.ITEMS[tool]?.repair || 0)}복구 · 공임없음`, 'var(--blue)', !nonEmpty(S.P.battle) && !S.P.dead && count(tool) > 0, `data-act="kit" data-item="${esc(it)}" data-tool="${tool}"`); }
  }
  if (list.length) { const total = list.reduce((a, it) => a + repairPrice(it), 0); num++; h += choiceRow(num, '모든 손상 장비 수리', `${list.length}개 · 총${won(total)} · 장비별공임 포함`, 'var(--warning)', allowed && Number(S.P.money) >= total, `data-act="repairall" data-quote="${total}"`); }
  return h;
}
function bindRepair() {
  const c = $('center'); bindRO(c); bindAct(c); bindFacTabs(c);
  c.querySelectorAll('[data-rtab]').forEach((b) => { b.onclick = () => { REPAIR.tab = b.dataset.rtab; drawCenter(); }; });
  c.querySelectorAll('[data-rsel]').forEach((b) => { b.onclick = () => { REPAIR.sel = b.dataset.rsel; const top = c.scrollTop; drawCenter(); c.scrollTop = top; }; });
  const pi = $('rpPts'); if (pi) pi.oninput = () => { const it = REPAIR.sel, miss = 100 - durValue(it); REPAIR.points = Math.max(1, Math.min(miss, Math.trunc(Number(pi.value) || 1))); const q = repairPrice(it, REPAIR.points); $('rpPrev').textContent = `내구도 ${durValue(it)} → ${durValue(it) + REPAIR.points} / 100 · 비용${won(q)} · 보유${won(S.P.money)}`; };
}

/* 행상인 — main._merchant_* (하루 3번 · 같은 계산으로 모든 계정이 같은 시각 · 같은 물품) */
const MERCHANT_STAY = 3600, M_GRADE_W = { C: 45, B: 33, A: 17, S: 5 }, M_PRICE_RATE = { C: 1, B: 1.05, A: 1.1, S: 1.2 };
let merchantOverride = {}, _mPool = null;
function basePrice(it) { if (GD.WEAPONS[it]) return Number(GD.WEAPONS[it].price); if (GD.ARMORS[it]) return Number(GD.ARMORS[it].price); return Number(GD.ITEMS[it]?.price ?? 5); }
function merchantPool() {
  if (_mPool) return _mPool; const pool = { C: [], B: [], A: [], S: [] };
  for (const it of IC.order) { const g = cat(it).grade; if (!pool[g] || basePrice(it) <= 0 || tabOf(it) === '재료') continue; pool[g].push(it); }
  for (const g in pool) pool[g].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); return (_mPool = pool);
}
function merchantGoods(key) {
  const rng = new GRng(ghash('goods-v3610-' + key)), pool = merchantPool(), goods = [], used = {};
  for (let slot = 0; slot < 6; slot++) {
    let grade = slot === 0 && rng.randf() < 0.25 ? 'S' : slot === 0 ? 'A' : '';
    if (!grade) { const roll = rng.randf() * 100; let cur = 0; for (const g of ['C', 'B', 'A', 'S']) { cur += M_GRADE_W[g]; if (roll < cur) { grade = g; break; } } if (!grade) grade = 'C'; }
    const opts = (pool[grade] || []).filter((n) => !used[n]); if (!opts.length) continue;
    const it = opts[rng.randiRange(0, opts.length - 1)]; used[it] = 1;
    const base = Math.max(20, Math.round(basePrice(it) * M_PRICE_RATE[grade])), stock = { C: 3, B: 2, A: 1, S: 1 }[grade] + (tabOf(it) === '소모품' && ['C', 'B', 'A'].includes(grade) ? 1 : 0);
    goods.push([it, base, stock]);
  }
  return goods;
}
function merchantVisits(dk) { const rng = new GRng(ghash('lastlight-merchant-' + dk)), out = []; for (let i = 0; i < 3; i++) { const st = dk * 86400 + i * 28800 + rng.randiRange(7200, 28800 - MERCHANT_STAY), key = `${dk}-${i}`; out.push({ start: st, end: st + MERCHANT_STAY, key, goods: merchantGoods(key) }); } return out; }
/* 행상인 도착 · 1시간 전 예고 알림(_merchant_check · _merchant_alerts · 10초마다) */
let merchantSeenKey = '', merchantAt = 0;
function merchantAlerts() { const now = kstNow(), dk = Math.floor(now / 86400);
  for (const v of merchantVisits(dk - 1).concat(merchantVisits(dk), merchantVisits(dk + 1))) if (now >= v.start - 3600 && now < v.start) notify('merchant-pre-' + v.key, '행상인 · 1시간 전 예고', `도착 ${kstStamp(v.start - 32400)} · 1시간 영업합니다.`, 'merchant', { visit_key: v.key, arrival: v.start - 32400, departure: v.end - 32400 });
  const cur = merchantNow(); if (cur) notify('merchant-arrive-' + cur.key, '행상인 영업 중', `공통 특별 물품을 판매합니다. 떠날 시각 ${kstStamp(cur.end - 32400)}`, 'merchant', { visit_key: cur.key, arrival: cur.start - 32400, departure: cur.end - 32400 }); }
function merchantCheck() { if (!S.P || $('app').hidden || LIVE.saving || LIVE.lost || Date.now() - merchantAt < 10000) return; merchantAt = Date.now(); const v = merchantNow(), key = v ? String(v.key) : '';
  if (key !== merchantSeenKey) { if (key) gLog('행상인이 거점에 도착했습니다. 1시간 영업합니다.'); else if (S.mode === 'merchant') { toast('행상인이 떠났습니다.'); rerender(); } }
  merchantSeenKey = key; merchantAlerts(); }
function merchantNow() {
  const now = kstNow(); const o = merchantOverride;
  if (o && o.key && now >= o.start && now < o.end) return { ...o, goods: merchantGoods(String(o.key)) };
  const dk = Math.floor(now / 86400); for (const e of merchantVisits(dk - 1).concat(merchantVisits(dk))) if (now >= e.start && now < e.end) return e; return null;
}
const merchantPrice = (key, it, base) => { const id = String(S.acct?.uid || S.acct?.username || ''); const rng = new GRng(ghash(`merchant-price-v11|${id}|${key}|${it}`)); return Math.max(1, Math.round(base * rng.randfRange(0.75, 1.25))); };
function kstStamp(epoch) { const d = new Date((epoch + 32400) * 1000), p = (n) => String(n).padStart(2, '0'); return `${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} KST`; }
function merchantReason(v, it, price, stock) {
  const p = S.P; if (!v) return '행상인이 떠났습니다. 목록을 새로 확인하세요.'; if (!p.at_hub) return '행상인 물품은 현지 거점에서만 구매할 수 있습니다.'; if (nonEmpty(p.travel)) return '이동 중에는 행상인 물품을 구매할 수 없습니다. 도착 후 다시 시도하세요.';
  if (p.dead) return '행동불능 상태에서는 행상인 물품을 구매할 수 없습니다.'; if (nonEmpty(p.combat)) return '전투 중에는 행상인 물품을 구매할 수 없습니다.'; if (nonEmpty(p.long_expedition)) return '장기 탐사 중에는 행상인 물품을 구매할 수 없습니다.';
  if (nonEmpty(p.pending_explore)) return '수색이 끝난 뒤 행상인 물품을 구매할 수 있습니다.'; if (stock <= 0) return '이번 방문의 해당 물품 재고가 소진되었습니다.'; if (Number(p.money || 0) < price) return '소지금이 부족합니다.';
  if (!fits(it, 1)) return `${tabOf(it)} 가방에 빈 칸이 없습니다.`; return '';
}
function merchantPage() {
  const v = merchantNow();
  const head = (t, s) => (S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>${t}</h2></div><p class="muted sec-sub">${s}</p>` : `<p class="crumb">${s}</p><div class="pagehead"><h2>${t}</h2></div>`);
  if (!v) return head('행상인', '현재 영업 중인 행상인이 없습니다.') + noteBox('하루 3회 공통 방문 · 정확히 1시간 전 알림 · 도착 후 1시간 영업. 방문 예고와 잔여시간은 알림함에서 확인합니다.');
  let h = head('행상인 · 특별 물품', '방문마다 C~S등급 품목이 새로 바뀝니다 · 캐릭터별 할인/할증 · 전체 계정 공통');
  h += `<p id="mCount" style="color:var(--warning);font-size:16px;margin:0 2px 10px">떠날 시각 ${kstStamp(v.end - 32400)} · 남은 ${durationText(v.end - kstNow())}</p>`;
  h += noteBox(`보유 ${won(S.P.money)} · 거점에서 구매합니다. 구매 레벨 제한이 없는 것이며, 장비 장착 레벨은 별도로 유지됩니다.`);
  const bought = (S.P.merchant_bought || {})[String(v.key)] || {};
  v.goods.forEach(([it, base, st], i) => { const price = merchantPrice(String(v.key), it, base), stock = Math.max(0, st - Number(bought[it] || 0)), why = merchantReason(v, it, price, stock); h += choiceRow(i + 1, `[${cat(it).grade}] ${itemDisplay(it)}`, `${won(price)} · 재고 ${stock} · ${cat(it).effect}` + (why ? '\n' + why : ''), gradeColor(it), why === '', `data-act="merch" data-item="${esc(it)}" data-key="${esc(v.key)}" data-price="${price}" data-limit="${st}"`); });
  return h;
}


/* ════════ 진행 중 화면 — 이동 · 단기 탐사 수색 · 장기 탐사 · 전투 · 사망 (보기 전용) ════════ */
/* main._open_mode와 같은 규칙: 진행 중인 활동이 있으면 거점 · 탐사 탭이 그 화면으로 */
/* 진행 중에 열 수 있는 화면(_open_mode와 같은 목록) — 그 밖의 화면은 안내만 하고 열지 않습니다 */
const OPEN_COMMON = ['menu', 'guide', 'duels', 'coop', 'reports', 'report_list', 'report_admin', 'settings', 'journal', 'light_log', 'updates', 'long_history', 'status', 'profile', 'inventory', 'trades', 'trade_form', 'use_items', 'admin', 'admin_player', 'admin_grow', 'admin_status', 'registration_admin', 'admin_broadcast', 'admin_currency', 'notifications', 'notify_settings', 'friends', 'requests', 'peer', 'party_trips', 'pets', 'repair', 'repair_settings', 'create_character', 'chat'];
const OPEN_LONG = ['long_wait', 'stats', 'shop', 'fishing', ...OPEN_COMMON];
function modeBlock(m) { const p = S.P; if (!p || p.dead) return '';
  if (nonEmpty(p.long_expedition) && !OPEN_LONG.includes(m)) return '장기 탐사 중에는 다른 탐사나 거점 활동을 할 수 없습니다.';
  if (nonEmpty(p.battle) && !['combat', 'combat_item', ...OPEN_COMMON].includes(m)) return '전투를 마친 뒤 이용할 수 있습니다.';
  if (nonEmpty(p.pending_explore) && !['exploring', ...OPEN_COMMON].includes(m)) return '탐사가 진행 중입니다. 잠시 기다려 주세요.';
  return ''; }
function routeMode(m) {
  const p = S.P, base = ['hub', 'explore', 'worldmap'];
  if (p.dead) return ['dead', 'menu', 'friends', 'settings', 'notifications', 'quests', 'stats', 'duels', 'coop', 'reports', 'report_list', 'report_admin', 'admin', 'admin_player', 'admin_grow', 'admin_status', 'registration_admin', 'admin_broadcast', 'admin_currency', 'journal', 'light_log', 'updates', 'long_history', 'profile', 'status', 'requests', 'party_trips', 'pets', 'repair', 'repair_settings', 'create_character', 'chat', 'trades', 'trade_form', 'party', 'party_list'].includes(m) ? m : 'dead';
  if (nonEmpty(p.battle) && [...base, 'exploring'].includes(m)) return 'combat';
  if (nonEmpty(p.travel) && base.includes(m)) return 'travel';
  if (nonEmpty(p.long_expedition) && [...base, 'exploring', 'long_explore'].includes(m)) return 'long_wait';
  if (nonEmpty(p.battle) && m === 'long_explore') return 'combat';
  if (nonEmpty(p.pending_explore) && base.includes(m)) return 'exploring';
  return m;
}
function initialMode() {
  const p = S.P; let m = p.dead ? 'dead' : nonEmpty(p.long_expedition) ? 'long_wait' : nonEmpty(p.pending_explore) ? 'exploring' : 'hub';
  if (nonEmpty(p.travel) && !p.dead) m = 'travel';
  if (!p.dead && nonEmpty(p.battle)) m = 'combat';
  { const cur = p.story_cursor || {}; if (m === 'hub' && nonEmpty(cur) && Number(cur.chapter ?? -1) === Number(p.story || 0) && cur.event && cur.event.choices && !activityBusy()) { STORY.ev = clone(cur.event); STORY.kind = String(cur.kind || 'chapter'); m = 'story'; } }
  if (m === 'hub' && p.view_state && typeof p.view_state === 'object') { const v = String(p.view_state.mode || 'hub'); if (v === 'explore_gu') m = 'explore'; else if (v === 'explore') m = 'worldmap'; if (p.view_state.realm != null) EXP.worldRealm = Number(p.view_state.realm); }
  else if (m === 'hub' && p.at_hub === false) m = 'explore';
  return m;
}
const ROW = (tag, col, title, desc, btns) => `<div class="panel irow"><span class="tchip" style="color:${col}">${esc(tag)}</span><div class="tx"><b>${escJ(title)}</b>${desc ? `<span>${escJ(desc)}</span>` : ''}</div>${btns.map(([l, attrs, primary, c2]) => `<button class="btn ${primary ? 'primary' : ''}" style="${primary ? `background:${c2};border-color:${c2}` : ''}" ${attrs}>${esc(l)}</button>`).join('')}</div>`;
const roNote = '';
function headT(t, s) { return S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>${escJ(t)}</h2></div>${s ? `<p class="muted sec-sub">${escJ(s)}</p>` : ''}` : `${s ? `<p class="crumb">${escJ(s)}</p>` : ''}<div class="pagehead"><h2>${escJ(t)}</h2></div>`; }
/* 이동 */
function travelText() { const t = S.P.travel, total = Math.max(1, Number(t.duration ?? (t.ready - t.started))), left = Math.max(0, Number(t.ready) - nowSec()), done = Math.max(0, Math.min(total, total - left)); return [`총 ${durationText(total)} · 경과 ${durationText(done)} · 남은 ${durationText(left)}`, done / total]; }
function travelPage() {
  const t = S.P.travel; if (!nonEmpty(t)) return exploreGuPage();
  const [txt, r] = travelText(), canCancel = nowSec() - Number(t.started || 0) <= 300;
  return headT('지역 이동 중', `${GD.REGIONS[Number(t.from)]?.name || ''} → ${GD.REGIONS[Number(t.to)]?.name || ''}`) +
    `<p class="live" data-live="travel" style="color:var(--blue);font-size:18px;margin:0 2px 8px">${esc(txt)}</p><div class="bar" style="height:8px;margin-bottom:12px"><i data-livebar="travel" style="width:${r * 100}%;background:var(--accent)"></i></div>` +
    noteBox(`한국시간 도착 · ${kstStamp(Number(t.ready))}\n광역 이동 30~60분 · 차량 소지 시 20분. 같은 광역의 다른 레벨대는 기본 5분이며 이동속도를 반영합니다. 출발 시 계산한 시간이 저장됩니다.`) + actView('travel', t.started) +
    choiceRow(1, '가방 열기', '음식 · 음료 · 치료 · 소지품', 'var(--blue)', true, 'data-go="inventory"') + choiceRow(2, '이동 취소', '출발 후 5분 이내만 가능 · 출발 위치로 돌아갑니다.', 'var(--danger)', canCancel, 'id="tvCancel"');
}
/* 단기 탐사 수색 */
function exploringPage() {
  const p = S.P.pending_explore; if (!nonEmpty(p)) return exploreGuPage();
  const left = Math.max(0, Number(p.ready) - nowSec());
  return headT('탐사 진행 중', String(p.id || '')) + `<p class="live" data-live="explore" style="color:var(--accent);font-size:19px;font-weight:700;margin:0 2px 10px">주변을 수색하는 중…  ${left}초 남음</p>` + actView('search', p.started) +
    noteBox(`적과 조우하지 않았습니다. 발견한 장소를 10~20초 동안 수색합니다.\n오늘 사용 ${Number(S.P.field_count || 0)}/40회 · 대기 중 중복 탐사는 불가능합니다.\n${p.night ? '밤 탐사: 더 강한 감염자와 마주칠 수 있습니다.' : '낮 탐사: 주변 골목과 건물에서 물자를 찾습니다.'}`) + choiceRow(1, '가방 열기', '음식 · 음료 · 치료 · 소지품', 'var(--blue)', true, 'data-go="inventory"');
}
/* 장기 탐사(모바일 배치를 PC에서도 씁니다) */
function longText() { const t = S.P.long_expedition, left = Math.max(0, Number(t.ready) - nowSec()), total = Math.max(1, Number(t.ready) - Number(t.started)); return [left > 0 ? `${t.name || '지역'}을 살피는 중 · ${durationText(left)} 남음` : '탐사를 마쳤습니다. 복귀하고 보상을 받으세요.', Math.max(0, Math.min(1, 1 - left / total)), left]; }
function tripMates(t) { const names = t.member_names && typeof t.member_names === 'object' ? t.member_names : {}, me = String(S.acct?.uid || ''); return (t.member_uids || []).filter((u) => String(u) !== me).map((u) => String(names[String(u)] || '파티원')); }
function tripCompany(t) { const m = tripMates(t); return !m.length ? '혼자' : m.length === 1 ? `${m[0]} 동행` : `${m[0]} 외 ${m.length - 1}명 동행`; }
function longPage() {
  const t = S.P.long_expedition; if (!nonEmpty(t)) return hubPage();
  const [txt, r, left] = longText(), halted = !!t.halted;
  let h = headT(halted ? '장기 탐사 · 중단' : left === 0 ? '장기 탐사 완료' : '장기 탐사', `${t.name || ''} · ${Number(t.hours || 0)}시간 · 권장Lv.${Number(t.recommended ?? S.P.level)} · ${tripCompany(t)}`);
  h += `<div class="lwcard"><small>${left > 0 ? '탐사 진행 중' : '탐사 완료'}</small><b class="live" data-live="long">${esc(txt)}</b><div class="bar"><i data-livebar="long" style="width:${r * 100}%;background:var(--accent)"></i></div></div>` + actView('long', t.started);
  h += ROW('기록', 'var(--blue)', '진행 기록 열기', '20분 위험 구간별 행동·자동 전투 기록을 확인합니다.', [['열기', 'data-lw="log"']]);
  if (tripMates(t).length) h += ROW('동행', 'var(--accent)', `함께 탐사 중 · ${tripCompany(t)}`, '같이 탐사하는 생존자 목록을 봅니다.', [['보기', 'data-lw="mates"']]);
  h += noteBox(`위험 사건 ${Number(t.risk_step || 0)}회 확인 · 체력 ${Number(S.P.hp)}/${Number(S.P.max_hp)} · 준비한 식량/물을 쓰며 이동 중입니다.\n보상은 완료 시 1회 수령. 중간 복귀·중단 시 경과시간에 비례하고 2시간 미만이면 희귀 보상은 없습니다.`);
  if (halted) h += ROW('긴급', 'var(--danger)', `긴급 복귀 · 체력 ${Number(S.P.hp)}`, '추가 위험은 멈춥니다. 지난 시간만큼 보상을 정산합니다.', [['긴급 복귀', 'data-lw="abort"']]);
  h += ROW('완료', 'var(--warning)', '복귀하고 보상 받기', '정상 완료한 보상을 팝업에서 확인합니다.', [['보상 받기', `data-lw="claim" ${left === 0 ? '' : 'disabled'}`, left === 0, 'var(--warning)']]);
  if (left > 0 && !halted) h += ROW('복귀', 'var(--danger)', '중간 복귀', '지금 돌아옵니다 · 진행한 시간만큼만 보상을 받습니다', [['중간 복귀', `data-lw="early" ${nonEmpty(S.P.battle) ? 'disabled' : ''}`]]);
  { const sw = sosBlock(); if (!sw) h += ROW('구조', 'var(--danger)', '구조 신호 보내기', '같은 대지역 생존자에게 회복품을 부탁합니다 · 30분 유지', [['신호 보내기', 'data-soson']]); else if (nonEmpty(mySos())) h += ROW('구조', 'var(--warning)', '구조 신호 끄기', '신호가 켜져 있습니다 · 회복품이 도착하면 바로 체력이 회복됩니다', [['신호 끄기', 'data-sosoff']]); }
  h += ROW('요청', 'var(--blue)', '회복 요청/친구', '체력 70% 이하 상대 지정 치료 요청', [['열기', 'data-go="friends"']]);
  h += ROW('치료', 'var(--accent)', '인벤토리 · 치료', '소지한 회복품을 사용', [['열기', 'data-go="inventory"']]);
  h += ROW('능력', 'var(--accent)', '능력치', Number(S.P.skill_points) > 0 ? `포인트 ${Number(S.P.skill_points)} 사용 가능` : '기본 능력치와 세부 능력', [['열기', 'data-go="stats"']]);
  h += ROW('상점', '#f0c674', '상점', `사고팔기 · 가방 칸 늘리기 · 보유 ${won(S.P.money)}`, [['열기', 'data-go="shop"']]);
  return h;
}
/* 전투 — _render_combat(적 카드 · 전투 기록 · 2×2 행동 · 체력 20% 미만 안전지대 · 전투 상태) */
const CICON = { 공격: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2', 방어: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 아이템: 'M7 21V9a5 5 0 0 1 10 0v12zM9 13h6M10 4V3h4v1', 도망: 'M5 12h14M13 6l6 6-6 6' };
function combatPage() {
  const b = S.P.battle; if (!nonEmpty(b)) return exploreGuPage();
  liveEnsure();
  const turn = Number(S.P.battle_turn || 1), sp = String(b.species || 'zombie'), kind = sp === 'human' ? '생존자(NPC)' : sp === 'animal' ? '짐승' : '좀비', lv = Number(b.level || 0), intro = turn <= 1;
  const crumb = `${WD.REALMS[region().realm]?.name || ''} › ${region().name}`, why = battleUnsupported();
  let h = `<p class="muted" style="font-size:13px;margin:0 2px 2px">${esc(kind)} 전투 · ${turn}턴</p><div class="pagehead"><h2>전투</h2>${intro && !S.mobile ? `<span class="cnotice">${esc(josaFix(`${b.enemy}${Number(b.group_count || 1) > 1 ? ` 외 ${Number(b.group_count) - 1}명` : ''}와(과) 마주쳤다!`))}</span>` : ''}</div>`;
  const ico = sp === 'animal' ? '<circle cx="6" cy="11" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="19" cy="11" r="2"/><path d="M7 18c0-3 3-5 5-5s5 2 5 5c0 2-2 3-5 3s-5-1-5-3z"/>' : '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>';
  const ehp = Number(b.hp || 0), emax = Math.max(1, Number(b.max_hp || 1));
  let center = `<div class="enemy"><div class="top">${chipL(intro ? '마주쳤다!' : turn + '턴', 'var(--danger)')}<span class="muted" style="font-size:13px">${esc(crumb)} · ${esc(b.location || '')}${(b.night ?? isNight()) ? ' · 밤' : ''}</span></div>
    <div class="row"><span class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></span><div class="nm"><div><b>${esc(b.enemy || '적')}</b>${lv > 0 ? `<span>Lv.${lv}</span>` : ''}</div>
    <div class="meter"><div class="t">체력<b>${ehp} / ${emax}</b></div><div class="bar"><i style="width:${ehp / emax * 100}%;background:var(--danger)"></i></div></div></div></div></div>`;
  if (Number(b.group_count || 1) > 1) center += `<div class="panel info"><b>무리 전투 ${Number(b.group_index)} / ${Number(b.group_count)}</b><span class="muted">현재 상대를 쓰러뜨리면 다음 상대와 이어서 싸웁니다. 승리 보상은 마지막에 1회 지급.</span></div>`;
  const hist = FD.live || [], last = hist[hist.length - 1] || '';
  center += `<div class="panel clog" id="clog"><p style="color:${intro ? 'var(--danger)' : 'var(--muted)'}">${esc(String(b.description || (sp === 'animal' ? '짐승의 발톱과 이빨을 조심하세요.' : '감염자에게 물리지 않도록 주의하세요.')))}</p>${hist.length > 1 ? (hist.length > 2 ? hist.slice(0, -1).map((e) => `<p class="old">· ${esc(e)}</p>`).join('') : '') + `<p class="last">직전 행동 · ${esc(last)}</p>` : ''}${Number(b.stun_turns || 0) > 0 ? `<p style="color:var(--warning)">적이 ${Number(b.stun_turns)}턴 동안 묶여 있습니다.</p>` : ''}</div>`;
  const n = combatItems().length, acts = [['공격', 'var(--danger)', true, 'attack'], ['방어', 'var(--blue)', true, 'defend'], ['아이템', 'var(--accent)', n > 0, 'item'], ['도망', 'var(--warning)', true, 'flee']];
  center += `<div class="actgrid">${acts.map(([t, c, en, k]) => `<button class="btn cact" style="--c:${c}" data-cact="${k}" ${en && !why ? '' : 'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${CICON[t]}"/></svg>${t}</button>`).join('')}</div>`;
  const d = derived();
  if (Number(S.P.hp) * 5 < Number(S.P.max_hp)) center += choiceRow(1, '안전지대로 이동하기 (거점)', `체력 20% 미만일 때만 가능 · 성공 확률 ${Math.trunc(d.retreat)}% (민첩·생존력·지능) · 실패하면 공격을 받습니다`, '#7ee0c2', !why, 'data-cact="retreat"');
  if (why) center += `<div class="note">${esc(why)}</div>`;
  const wn = String(S.P.equipment?.['무기'] || ''), an = String(S.P.equipment?.['방어구'] || ''), conds = activeConds().map((id) => ED.CONDITIONS[id].name), bt = buffText();
  const comps = S.P.party_formed ? Object.keys(SDC).filter((k) => (S.P.companions || {})[k]?.joined && (S.P.companions || {})[k]?.active).map((k) => SDC[k].name) : [];
  const status = `<div class="panel cstat2"><small style="color:var(--danger)">전투 상태</small><div class="meter"><div class="t">나<b>${Number(S.P.hp)} / ${Number(S.P.max_hp)}</b></div><div class="bar"><i style="width:${Math.max(0, Number(S.P.hp)) / Math.max(1, Number(S.P.max_hp)) * 100}%;background:var(--danger)"></i></div></div>
    <div class="tiles"><div><small>공격</small><b>${Math.trunc(d.attack)}</b></div><div><small>방어</small><b>${Math.trunc(d.defense)}</b></div><div><small>회피</small><b>${fmtDerived('evade', d.evade, '%')}</b></div><div><small>도망 확률</small><b style="color:var(--warning)">${Math.trunc(d.flee)}%</b></div></div>
    <p>장비 · ${esc(wn && weaponDmg(S.P.equipment || {}) > 4 ? wn : '맨손')}(무기) · ${esc(an || '없음')}(방어구)</p><p>상태 이상 · ${esc(conds.length ? conds.join(', ') : '없음')}</p>${bt ? `<p style="color:#c297ff">강화 효과 · ${esc(bt)}</p>` : ''}${comps.length ? `<p>함께 싸우는 동료 · ${esc(comps.join(', '))}</p>` : ''}</div>`;
  const keys = `<div class="panel ckeys"><small>PC 단축 버튼</small>${[['A', '공격'], ['S', '방어'], ['D', '아이템'], ['F', '도망']].map(([k, t]) => `<div><kbd>${k}</kbd>${t}</div>`).join('')}<p class="subtle">숫자 1~4 키로도 고를 수 있습니다.</p></div>`;
  const three = !S.mobile && ($('center')?.clientWidth || window.innerWidth) >= 760;
  if (three) h += `<div class="c3"><div>${status}</div><div>${center}</div><div>${keys}</div></div>`;
  else h += center + status + (S.mobile ? '' : '<p class="subtle" style="font-size:12px">단축키 · A 공격 · S 방어 · D 아이템 · F 도망 (숫자 1~4도 됩니다)</p>');
  return h;
}
function buffText() { const parts = []; for (const id of activePos()) parts.push(String(S.P.positive[id].name) + ' ' + durationText(Number(S.P.positive[id].until) - nowSec())); const bf = S.P.buffs || {}; if (Number(bf.buff_atk || 0) > 0) parts.push(`공격력 +${Math.trunc(bf.buff_atk)}`); if (Number(bf.buff_def || 0) > 0) parts.push(`방어력 +${Math.trunc(bf.buff_def)}`); return parts.join(' · '); }
/* 사망 */
function exploreText() {
  const ids = locations().map((l) => GD.REGIONS[l.gu_index].name + ' ' + l.spot), seen = new Set(normalVisited().map(String)), nd = ids.filter((i) => seen.has(i)).length;
  if (!S.P.hard_mode) return `${nd} / ${ids.length}`;
  const hv = new Set((S.P.visited || []).map(String)), hl = locations().filter((l) => l.realm <= HARD_REALM_MAX);
  return `일반 ${nd}/${ids.length} · 하드 ${hl.filter((l) => hv.has(GD.REGIONS[l.gu_index].name + ' ' + l.spot)).length}/${hl.length}`;
}
function deadPage() {
  const p = S.P, left = Math.max(0, 86400 - (nowSec() - Number(p.dead_at || nowSec())));
  return headT('사망', String(p.death_cause || '당신은 쓰러졌다.')) +
    `<div class="story">당신의 기록은 ${Number(p.day || 1)}일차에서 멈췄다.\n레벨 ${Number(p.level)} · 처치 ${Number(p.kills || 0)} · 탐사한 구역 ${exploreText()} · 소지금 ${won(p.money)}\n\n체력이 0이 되면 사망합니다. 소생 주사나 제세동기를 가지고 있으면 한 번 되살아날 수 있습니다.</div>
    <div class="deadcard"><b>부활 대기 · 남은 ${durationText(left)}</b><div class="bar"><i style="width:${left / 86400 * 100}%;background:var(--danger)"></i></div><p>같은 대지역의 생존자가 '응급 부활'로 살릴 수 있습니다. 24시간 안에 살아나지 못하면 레벨 1부터 다시 시작합니다.\n가방 · 장비 · 보관 상자 · 소지금은 그대로 남고, 레벨 · 경험치 · 능력치는 처음으로 돌아갑니다.</p></div>` +
    (S.admin ? choiceRow('', '관리자 권한으로 부활', '체력을 모두 회복하고 기록을 이어갑니다.', 'var(--accent)', true, 'id="deadAdm"') : '') + choiceRow(1, '기다리지 않고 레벨 1부터 다시 시작', '아이템 · 소지금은 유지 · 레벨 · 능력치 초기화', 'var(--warning)', true, 'id="deadReset"') + choiceRow(2, '타이틀로', '', 'var(--muted)', true, 'id="deadTitle"');
}
/* 진행 중 묘사(activity_view.gd · action_scripts.lines) — 세 줄: 가운데가 가장 최근 줄 */
function asLines(kind, started, now, night, companion = '', vehicle = false) { const p = S.P;
  if (kind === 'search') { const SP = ASC.SEARCH_PASSAGES, phase = Math.max(0, Math.trunc((now - started) / 5)), initial = posmod(started, SP.length), extra = [];
    if (night) extra.push('불빛을 아래로 향해 바깥으로 새지 않게 한다. 어두워서 이미 살핀 자리도 각도를 바꾸어 다시 확인하고, 가까이서 소리가 들리면 잠시 걸음을 멈춘다.');
    if (companion) extra.push(companion + '와(과) 눈을 맞추고 서로 살필 방향을 나눈다. 확인한 곳은 손짓으로 알려 주고, 한 사람은 들어온 길을 계속 지켜본다.');
    if (Number(p.hp ?? 75) < Number(p.max_hp ?? 75) * 0.7) extra.push('상처에 무리가 가지 않도록 몸을 천천히 움직인다. 남은 회복품을 떠올리며 무거운 잔해는 억지로 들어 올리지 않는다.');
    if (!extra.length) extra.push('잠깐 발을 멈추고 출입구 쪽을 돌아본다. 아직 무엇을 얻을지는 알 수 없다. 지금은 이곳을 안전하게 확인하는 데 집중한다.');
    const out = []; for (let i = Math.max(0, phase - 2); i <= phase; i++) { if (i === 0) out.push('찾아낸 장소를 서두르지 않고 차례로 살펴본다. 물건의 상태와 돌아갈 길을 확인하며 수색을 이어 간다.'); else if (i % 4 === 3) out.push(extra[Math.trunc(i / 4) % extra.length]); else out.push(SP[posmod(initial + i - 1 - Math.trunc(i / 4), SP.length)]); } return out; }
  const src = asPool(vehicle && kind === 'travel' ? 'vehicle' : kind, night); if (['search', 'travel', 'long'].includes(kind) && companion && !(p.long_expedition || {}).halted) for (const l of ASC.POOLS.npc) src.push(josaFix(String(l).replace('{companion}', companion)));
  const iv = kind === 'search' ? 4 : ['craft', 'cook', 'medicine'].includes(kind) ? 10 : kind === 'long' ? 60 : 12, step = Math.max(0, Math.trunc((now - started) / iv)), seed = Math.abs(started * 31 + ghash(kind)), out = [];
  for (let o = Math.max(0, step - 2); o <= step; o++) out.push(src[posmod(seed + o, src.length)]); return out; }
function actLines(kind, started) { if (['craft', 'cook', 'medicine'].includes(kind) && !craftActive()) return ['작업을 마쳤습니다. 알림에서 완성품을 확인하세요.'];
  let comp = ''; if (kind !== 'long' && S.P.party_formed) { const ids = Object.keys(SDC).filter((k) => (S.P.companions || {})[k]?.joined && (S.P.companions || {})[k]?.active); if (ids.length) comp = String(SDC[ids[0]].name); }
  if (kind === 'long') { const m = tripMates(S.P.long_expedition || {}); if (m.length) comp = m[Math.trunc(nowSec() / 36) % m.length]; }
  const veh = count('전동 스쿠터') > 0 || count('정비된 오토바이') > 0 || String((S.P.mobility || {})['탈것'] || '') === '접이식 자전거';
  return asLines(kind, Number(started), nowSec(), isNight(), comp, veh); }
const actView = (kind, started) => `<div class="actview" data-av="${kind}" data-st="${Number(started) || 0}"><p></p><p class="mid"></p><p></p></div>`;
function actTick(force) { document.querySelectorAll('.actview').forEach((el) => { const ls = actLines(el.dataset.av, Number(el.dataset.st)), n = ls.length, sig = ls.join('\n'); if (!force && el.dataset.sig === sig) return; const changed = el.dataset.last !== (n ? ls[n - 1] : ''); el.dataset.sig = sig; el.dataset.last = n ? ls[n - 1] : '';
  const slots = [n >= 2 ? ls[n - 2] : '', n >= 1 ? ls[n - 1] : '', n >= 3 ? ls[n - 3] : ''], ps = el.children; for (let i = 0; i < 3; i++) { ps[i].textContent = josaFix(slots[i]); ps[i].hidden = !slots[i]; }
  if (changed && UI.motion !== false) { const m = ps[1]; m.classList.remove('fade'); void m.offsetWidth; m.classList.add('fade'); } }); }
/* 남은 시간 1초마다(화면을 다시 그리지 않고 글자만) */
setInterval(() => {
  if (!S.P || $('app').hidden) return;
  const lt = document.querySelector('[data-live="travel"]'); if (lt && nonEmpty(S.P.travel)) { const [t, r] = travelText(); lt.textContent = t; const b = document.querySelector('[data-livebar="travel"]'); if (b) b.style.width = r * 100 + '%'; }
  const le = document.querySelector('[data-live="explore"]'); if (le && nonEmpty(S.P.pending_explore)) le.textContent = `주변을 수색하는 중…  ${Math.max(0, Number(S.P.pending_explore.ready) - nowSec())}초 남음`;
  const ll = document.querySelector('[data-live="long"]'); if (ll && nonEmpty(S.P.long_expedition)) { const [t, r] = longText(); ll.textContent = t; const b = document.querySelector('[data-livebar="long"]'); if (b) b.style.width = r * 100 + '%'; }
  actTick(false); merchantCheck();
  fieldTick(); travelTick(); longTick(); craftTick(); autoTick(); petCdTick(); duelTick(); sdTick(); fishLiveTick();
  { const lc = document.querySelector('[data-live="craft"]'); if (lc && craftActive()) { const j = S.P.craft_job, left = Math.max(0, Number(j.ready) - nowSec()); lc.textContent = `남은 ${durationText(left)} · 완료 ${kstStamp(Number(j.ready)).slice(6)}`; const b = document.querySelector('[data-livebar="craft"]'); if (b) b.style.width = (Number(j.duration) <= 0 ? 100 : Math.max(0, Math.min(100, 100 * (1 - left / Number(j.duration))))) + '%'; } }
  const llt = $('llTime'); if (llt && nonEmpty(S.P.long_expedition)) { const t = S.P.long_expedition; llt.textContent = `${t.name || ''} · ${t.halted ? '중단 · 긴급 복귀 대기' : '남은 ' + durationText(Math.max(0, Number(t.ready) - nowSec()))} · 체력 ${S.P.hp} / ${S.P.max_hp}`; }
  const fw = document.querySelector('[data-live="fwait"]'); if (fw) { const w = fieldWaitLeft(); if (w > 0) fw.textContent = `${String(S.P.field_rest_kind || '전투') === '탐사' ? '탐사 후' : '전투 후'} 휴식 · 다음 탐사까지 ${w}초`; else if (!$('modalRoot').innerHTML && !LIVE.saving) rerender(); }
  const mc = $('mCount'); if (mc) { const v = merchantNow(); if (v) mc.textContent = `떠날 시각 ${kstStamp(v.end - 32400)} · 남은 ${durationText(v.end - kstNow())}`; }
}, 1000);
function bindProgress() { const c = $('center'); bindRO(c); const tc = $('tvCancel'); if (tc) tc.onclick = () => act(() => cancelMove(), afterField);
  c.querySelectorAll('[data-lw]').forEach((x) => { x.onclick = () => { const k = x.dataset.lw; if (k === 'log') longLogModal(); else if (k === 'mates') tripCompanyModal(); else if (k === 'early') confirmLongEarly(); else if (k === 'abort') act(() => abortLongTrip(true), afterField); else if (k === 'claim') act(() => claimLongExplore(), afterField); }; }); c.querySelectorAll('[data-cact]').forEach((x) => { x.onclick = () => (x.dataset.cact === 'item' ? combatItemModal() : combatAct(x.dataset.cact)); }); const cl = $('clog'); if (cl) cl.scrollTop = cl.scrollHeight; c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); const dr = $('deadReset'); { const da = $('deadAdm'); if (da) da.onclick = () => { if (S.admin) adminApplyAction('revive', String(S.acct?.nickname || '관리자')); }; } if (dr) dr.onclick = () => confirmModal('레벨 1부터 다시 시작하시겠습니까?', '<p>레벨 · 경험치 · 능력치가 처음으로 돌아갑니다. 가방 · 장비 · 보관 상자 · 소지금은 그대로 남습니다.</p>', '다시 시작', 'danger', () => act(() => deathReset(false), () => go('hub'))); const dt = $('deadTitle'); if (dt) dt.onclick = () => { $('app').hidden = true; $('saveBar').hidden = true; $('title').hidden = false; showChars(); }; }


/* ════════ 단체 퀘스트 — coop.render_group_quests(거점 보수 · 서버 주간 목표) ════════ */
const COOP = { state: null, weekly: {}, weeklyAt: 0, sub: false };
const CO = D.coop;
const coopOnline = () => !!(S.acct?.uid && bridge()?.watchCoop);
function coopWeekKey() { const days = Math.floor((kstNow() - 6 * 3600) / 86400), monday = days - ((days + 3) % 7); return new Date(monday * 86400000).toISOString().slice(0, 10); }
/* 서버 상태 받기(coop._on_state) — 관리자 반려동물 출현 이벤트도 여기로 옵니다 */
function coopSub() { if (!coopOnline() || COOP.sub) return; COOP.sub = true;
  sub('watchCoop', [], (r) => { if (!r || !r.ok) return; const first = !COOP.state; COOP.state = r; COOP.off = Number(r.now ?? Date.now()) - Date.now();
    const ev = r.events && typeof r.events === 'object' ? r.events : {}; if (S.P && ev.pet && typeof ev.pet === 'object' && petAdminEvent(ev.pet, Date.now() + COOP.off)) { LIFE.dirty = true; LIFE.lastSave = 0; }
    coopOnState(); if (S.mode === 'quests' && first) redrawKeep(); });
  sub('watchCoopAid', [], coopOnAid); }
function coopEnsure() {
  if (!coopOnline()) return;
  coopSub();
  if (Date.now() - COOP.weeklyAt > 60000) { COOP.weeklyAt = Date.now(); call('coopWeekly', coopWeekKey()).then((r) => { if (r && r.ok) { COOP.weekly = r; if (S.mode === 'quests') redrawKeep(); } }); }
}
function redrawKeep() { const c = $('center'); if (!c) return; const top = c.scrollTop; drawCenter(); c.scrollTop = top; }
const coopPending = () => { const c = S.P.coop || {}; return String(c.week || '') === coopWeekKey() && c.pending && typeof c.pending === 'object' ? c.pending : {}; };
const weeklyTotal = (id) => Number((COOP.weekly.total || {})[id] || 0) + Number(coopPending()[id] || 0);
const weeklyMine = (id) => Number((COOP.weekly.mine || {})[id] || 0) + Number(coopPending()[id] || 0);
function goalOf(q) { const base = Number(q.goal), n = Number(COOP.weekly.accounts || 0); if (n <= 0) return base; const sc = Math.ceil(base * Math.max(0.1, Math.min(2, n / CO.WEEKLY_BASE_ACCOUNTS)) / 10) * 10; return Math.max(sc, Number(q.min || 1) * 5); }
const cbar = (cur, goal, col) => `<div class="cbar"><i style="width:${Math.max(0, Math.min(1, cur / Math.max(1, goal))) * 100}%;background:${col}"></i></div>`;
function groupQuests() {
  let h = groupLab('단체 퀘스트 · 서버 전체');
  if (!coopOnline()) return h + noteBox('로그인 후 이용할 수 있습니다.');
  coopEnsure();
  if (!COOP.state) return h + noteBox('서버 정보를 불러오는 중입니다…');
  const r = COOP.state.repair || {};
  h += groupLab('거점 보수');
  if (!r || !r.project) h += noteBox('보수 정보를 불러오는 중입니다…');
  else {
    const pj = r.project, goal = r.goal || {}, prog = r.progress || {}; let sc = 0, sg = 0;
    let rows = ''; for (const m of Object.keys(goal)) { const cur = Number(prog[m] || 0), need = Number(goal[m]); sc += Math.min(cur, need); sg += need; rows += `<div class="cline"><span>${esc(m)}  ${cur} / ${need}</span>${cbar(cur, need, cur >= need ? 'var(--accent)' : 'var(--warning)')}</div>`; }
    h += `<div class="ccard"><b style="font-size:17px">${Number(r.stage || 0) + 1}단계 · ${esc(pj.name || '')}</b><p class="muted">${esc(pj.desc || '')} 완료하면 서버 전원에게 '${esc(BD.POSITIVES[pj.buff]?.name || pj.buff || '')}' 효과가 3일 동안 적용됩니다.</p>${rows}
      <p class="subtle" style="font-size:12px">전체 ${Math.trunc(100 * sc / Math.max(1, sg))}% · 내 가방: ${esc(Object.keys(goal).map((m) => `${m} ${count(m)}`).join(' · '))}</p><div class="brow"><button class="btn primary" data-codn>재료 기부하기</button><button class="btn" data-codo>참여자 보기</button></div></div>`;
  }
  h += groupLab('서버 주간 목표 · 매주 월요일 06시 초기화');
  const acc = Number(COOP.weekly.accounts || 0), claimed = ((S.P.coop || {}).claimed || {})[coopWeekKey()] || [];
  let w = `<p class="muted">모든 생존자의 기록이 합산됩니다. 목표를 채우면 조금이라도 참여한 사람은 보상을 받습니다. (진행도는 몇 분 간격으로 모아서 반영됩니다)${acc > 0 ? ` · 목표는 최근 2주 접속 계정 ${acc}개에 맞춰 조절됩니다.` : ''}</p>`;
  for (const q of CO.WEEK_QUESTS) {
    const total = weeklyTotal(q.id), mine = weeklyMine(q.id), g = goalOf(q), done = total >= g, ok = mine >= Number(q.min), got = claimed.includes(q.id), rw = q.reward || {}, rr = [];
    if (rw.xp != null) rr.push(`경험치 ${rw.xp}`); if (rw.coins != null) rr.push(`코인 ${rw.coins}`); if (rw.points != null) rr.push(`능력치 포인트 ${rw.points}`); if (rw.items) for (const k in rw.items) rr.push(`${k} ${rw.items[k]}`);
    w += `<b style="font-size:14px">${esc(q.title)}  ${Math.min(total, g)} / ${g}</b>${cbar(total, g, done ? 'var(--accent)' : 'var(--blue)')}<p class="muted" style="font-size:12px">${esc(q.desc)} · 내 기여 ${mine} (보상 조건 ${q.min} 이상) · ${esc(rr.join(', '))}</p>`;
    if (done) w += `<div class="brow"><button class="btn ${ok && !got ? 'warnfill' : ''}" data-wkc="${q.id}" ${ok && !got ? '' : 'disabled'}>${got ? '보상 받음' : ok ? '보상 받기' : `참여 기록 ${q.min} 필요`}</button></div>`;
  }
  return h + `<div class="ccard">${w}</div>` + (sosList().length ? sosBox(false) : '');
}


/* ════════ 저장하는 동작(1차) — main.gd의 같은 함수를 줄 단위로 옮김 ════════
   켠 동작: 사용 · 장착 · 해제 · 버리기 · 모두 버리기 · 자동 먹고 마시기 · 상점 사고팔기 · 가방 확장 · 능력치 확정 · 받은 물품함 받기
   저장: 동작마다 바로 bridge.saveGame(지금 게임과 같은 거래 · socialRevision 규칙). 실패 · 충돌이면 서버 기록으로 되돌림. */
const LIVE = { on: false, lost: false, saving: false };
const clone = (o) => JSON.parse(JSON.stringify(o));
/* josa.gd fix */
const JOSA_PAIRS = { '이(가)': ['이', '가'], '가(이)': ['이', '가'], '은(는)': ['은', '는'], '는(은)': ['은', '는'], '을(를)': ['을', '를'], '를(을)': ['을', '를'], '과(와)': ['과', '와'], '와(과)': ['과', '와'], '(이)라': ['이라', '라'], '(이)나': ['이나', '나'], '(이)랑': ['이랑', '랑'], '(이)여': ['이여', '여'], '(아)야': ['아', '야'], '이(여)': ['이여', '여'], '(으)로': ['으로', '로'], '으로(로)': ['으로', '로'] };
const DIGIT_JONG = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];
function jong(ch) { if (!ch) return 0; const c = ch.codePointAt(0); if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28; if (c >= 48 && c <= 57) return DIGIT_JONG[c - 48]; const l = ch.toLowerCase(); if (l === 'l') return 8; if (l === 'm' || l === 'n') return 4; return 0; }
function prevChar(t, end) { let i = end - 1; while (i >= 0) { const c = t[i]; if (c === ']') { const o = t.lastIndexOf('[', i); if (o >= 0) { i = o - 1; continue; } } if (["'", '"', '’', '”', '」', '』', ' '].includes(c)) { i--; continue; } return c; } return ''; }
const JOSA_RX = new RegExp('(' + Object.keys(JOSA_PAIRS).sort((a, b) => b.length - a.length).map((k) => k.replace(/[()]/g, '\\$&')).join('|') + ')', 'g');
/* 화면에 남은 '이(가)' · '(으)로' 표시를 글자 노드에서만 받침에 맞게 고칩니다(입력값 · 속성은 건드리지 않음) */
const JOSA_HINT = /(\(으\)|이\(가\)|을\(를\)|은\(는\)|와\(과\)|가\(이\)|를\(을\)|는\(은\)|과\(와\)|\(이\))/;
function josaDom(root) { if (!root) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.nodeValue; if (t && t.includes('(') && JOSA_HINT.test(t)) { const f = josaFix(t); if (f !== t) n.nodeValue = f; } } }
function josaFix(text) {
  if (!text.includes('(')) return text; const ms = [...text.matchAll(JOSA_RX)]; let out = text;
  for (let k = ms.length - 1; k >= 0; k--) { const m = ms[k], st = m.index, pair = m[0], f = JOSA_PAIRS[pair], j = jong(prevChar(out, st)); const rep = ['(으)로', '으로(로)'].includes(pair) ? (j !== 0 && j !== 8 ? f[0] : f[1]) : (j !== 0 ? f[0] : f[1]); out = out.slice(0, st) + rep + out.slice(st + pair.length); }
  return out;
}
function gLog(msg) { const p = S.P; msg = josaFix(msg); if (!Array.isArray(p.journal)) p.journal = []; p.journal.push(`[color=#75818e]${clockText().replace(' KST', '')}[/color]  ${msg}`); while (p.journal.length > 300) p.journal.shift(); }
const toastJ = (m) => toast(josaFix(m).replace(/\[color=#[0-9a-f]+\]|\[\/color\]/gi, ''));
/* notification_hub.add */
function nhAdd(id, title, body, kind, payload = {}) {
  const p = S.P; if (!Array.isArray(p.notifications)) p.notifications = []; p.notifications = p.notifications.filter((e) => !String(e.id || '').startsWith('chat-'));
  if (!p.notify_settings || typeof p.notify_settings !== 'object') p.notify_settings = { ...D.notification_hub.DEFAULTS }; for (const k in D.notification_hub.DEFAULTS) if (!(k in p.notify_settings)) p.notify_settings[k] = D.notification_hub.DEFAULTS[k];
  if (!p.channel_unread || typeof p.channel_unread !== 'object') p.channel_unread = { world: 0, party: 0, notice: 0 }; if (!p.notify_seen || typeof p.notify_seen !== 'object') p.notify_seen = {};
  if (id in p.notify_seen) return false; const now = nowSec();
  if (!(id.startsWith('result-') || id.startsWith('merchant-buy-') || id.startsWith('boost-'))) p.notify_seen[id] = now;
  title = josaFix(String(title ?? '')); body = josaFix(String(body ?? '')); p.notifications.push({ id, title, body, kind, time: now, read: false, payload }); sfx('notify');
  questSync(); /* 게임은 알림을 넣을 때마다 배지를 고치며 퀘스트 기간도 맞춤(_update_notification_badges → _quest_claimable) */ while (p.notifications.length > 150) p.notifications.shift();
  if (Object.keys(p.notify_seen).length > 1500) { const seen = p.notify_seen; Object.keys(seen).sort((a, b) => Number(seen[a]) - Number(seen[b])).slice(0, 500).forEach((k) => delete seen[k]); }
  return true;
}
/* 퀘스트 진행(기간이 바뀐 묶음은 지금 게임이 다음에 열 때 새로 뽑으므로 건드리지 않음) */
function questEvent(kind, amount = 1) { questSync(); if (['kill', 'explore', 'craft'].includes(kind)) coopRecord(kind, amount); const keys = questKeys(); for (const sc of ['daily', 'weekly']) { const q = S.P.quests?.[sc]; if (!q || String(q.key || '') !== keys[sc]) continue; if (!q.progress || typeof q.progress !== 'object') q.progress = {}; q.progress[kind] = Number(q.progress[kind] || 0) + amount; } }
/* coop.record · flush_weekly — 처치 · 탐사 수를 서버 주간 목표에 보탭니다(저장한 뒤 5분 간격, 200건이면 바로) */
function coopData() { const p = S.P; if (!p.coop || typeof p.coop !== 'object' || Array.isArray(p.coop)) p.coop = {}; const c = p.coop; for (const k of ['pending', 'claimed', 'boss_claimed', 'aid_seen', 'notified']) if (!c[k] || typeof c[k] !== 'object' || Array.isArray(c[k])) c[k] = {}; for (const k of ['rescue_points', 'rescue_today', 'boss_last']) if (!(k in c)) c[k] = 0; if (!('rescue_day' in c)) c.rescue_day = ''; if (!('week' in c)) c.week = ''; return c; }
function coopRecord(kind, amount) { if (amount <= 0 || !S.P) return; const c = coopData(), wk = coopWeekKey(); if (String(c.week) !== wk) { c.week = wk; c.pending = {}; c.week_sent = {}; }
  if (kind === 'craft') { if (!c.week_sent || typeof c.week_sent !== 'object') c.week_sent = {}; amount = Math.min(amount, 10 - Number(c.week_sent.craft || 0)); if (amount <= 0) return; c.week_sent.craft = Number(c.week_sent.craft || 0) + amount; }
  c.pending[kind] = Number(c.pending[kind] || 0) + amount; if (Number(c.pending[kind]) >= 200) FD.coopForce = true; }
function coopFlush() { if (!LIVE.on || !coopOnline()) return; const c = S.P.coop; if (!c || !c.pending || !Object.keys(c.pending).length) return; if (!FD.coopForce && nowSec() - Number(FD.coopAt || 0) < 300) return; FD.coopForce = false; FD.coopAt = nowSec();
  const sent = {}; for (const k in c.pending) sent[k] = Math.min(300, Number(c.pending[k])); const wk = String(c.week);
  call('coopWeeklyAdd', wk, JSON.stringify(sent)).then((r) => { if (!r || !r.ok || !S.P?.coop || String(S.P.coop.week) !== wk) return; const pd = S.P.coop.pending || {}; for (const k in sent) { const left = Number(pd[k] || 0) - sent[k]; if (left > 0) pd[k] = left; else delete pd[k]; } COOP.weeklyAt = 0; });
}
/* 성장 · 체력 */
const naturalGrowth = (lv) => { const n = Math.max(0, Math.min(100, lv) - 1); return n - Math.trunc(n / 5); };
function syncGrowth() { const p = S.P, old = Number(p.max_hp), base = p.base_stats && typeof p.base_stats === 'object' ? p.base_stats : BD.BASE, inv = p.invested || {}, st = {};
  for (const k of BD.STATS) st[k] = Math.trunc(Number(base[k] ?? BD.BASE[k])) + naturalGrowth(Number(p.level)) + Math.max(0, Math.trunc(Number(inv[k] || 0)));
  p.stats = st; p.max_hp = maxHealth(effStats(p.equipment || {})) + Math.trunc(Number(gearMods(workingEq(p.equipment || {})).hp || 0));
  if (!p.dead) p.hp = Math.max(1, Math.min(Number(p.max_hp), Number(p.hp) + Math.max(0, Number(p.max_hp) - old))); }
function removeItem(it, n) { const p = S.P, left = Math.max(0, count(it) - n); if (left <= 0) delete p.inventory[it]; else p.inventory[it] = left;
  const f = p.found_gear; if (f && typeof f === 'object' && it in f) { const keep = Math.min(Number(f[it]), left + (Object.values(p.equipment || {}).includes(it) ? 1 : 0)); if (keep <= 0) delete f[it]; else f[it] = keep; } }
function addItem(it, n) { if (n <= 0) return true; if (!fits(it, n)) { gLog(`가방 공간 부족 · ${it} ${n}개 · 한 칸 최대 99개`); return false; } S.P.inventory[it] = count(it) + n; return true; }
const cityMult = (id) => { const gi = hereRegion(), f = facility(gi); return doneIn(gi, visitedSet()) >= GD.REGIONS[gi].spots.length && f.id === id ? Number(CL.MULT[id] ?? 1) : 1; };
/* 긍정 상태 */
const numText = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));
const intervalText = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60}분` : `${s}초`);
function positiveDefText(p) { const parts = [], f = (k) => Number(p[k] || 0);
  for (const [k, t] of [['atk', '공격력 +%s'], ['def', '방어력 +%s'], ['crit', '치명타 +%s%'], ['evade', '회피 +%s%'], ['xp', '전투 경험치 +%s%'], ['resist', '부정 상태 저항 +%s%']]) if (f(k) > 0) parts.push(t.replace('%s', numText(f(k))));
  if (p.guard != null) parts.unshift(`체력 ${Math.trunc(p.guard)} 아래로 내려가지 않음 · 사망 없음`); if (f('xp_all') > 0) parts.push(`모든 경험치 +${Math.trunc(p.xp_all)}%`);
  if (p.heal != null) parts.push(`${intervalText(Number(p.interval))}마다 체력 +${Math.trunc(p.heal)}`); if (p.morale != null) parts.push(`${intervalText(Number(p.interval))}마다 사기 +${Math.trunc(p.morale)}`);
  if (p.move != null) parts.push(`이동속도 ${Number(p.move).toFixed(2)}배`);
  for (const [k, t] of [['loot', '획득률 +%s%'], ['rare', '희귀 획득 +%s%'], ['flee', '도주 +%s%'], ['recover', '회복 효율 +%s%']]) if (f(k) > 0) parts.push(t.replace('%s', numText(f(k))));
  if (p.hunger != null && p.interval != null) parts.push(`${intervalText(Number(p.interval))}마다 허기 +${Math.trunc(p.hunger)}`); if (p.water != null && p.interval != null) parts.push(`${intervalText(Number(p.interval))}마다 수분 +${Math.trunc(p.water)}`);
  return parts.join(' · '); }
const randRange = (a, b) => GR.randiRange(a, b);
const niceInterval = (s) => (s >= 120 ? Math.max(60, Math.round(s / 60) * 60) : s);
function grantPositive(item) { const PI = BD.POSITIVE_ITEMS[item]; if (!PI) return; const st = S.P.positive && typeof S.P.positive === 'object' ? S.P.positive : {}, now = nowSec();
  for (const id in PI) { const p = { ...clone(BD.POSITIVES[id]), ...clone(PI[id]) }, bd = Math.max(1, Math.trunc(Number(p.duration ?? 180))), sec = randRange(7200, 10800);
    if (p.interval != null && Number(p.interval) > 0) p.interval = niceInterval(Math.max(Math.trunc(p.interval), Math.round(Math.trunc(p.interval) * sec / bd)));
    p.duration = sec; p.desc = positiveDefText(p); p.until = now + sec; p.tick = now;
    const old = st[id] || {}; if (Number(old.until || 0) > now && ['atk', 'crit', 'evade', 'def', 'resist', 'xp', 'heal', 'morale', 'move'].some((k) => Number(p[k] || 0) < Number(old[k] || 0))) continue;
    st[id] = p; }
  S.P.positive = st; }
function grantState(id, seconds, reason) { const p = S.P; if (p.dead || !BD.POSITIVES[id]) return false; if (!['newbie', 'immunity'].includes(id)) seconds = randRange(7200, 10800);
  const old = (p.positive || {})[id], now = nowSec(); if (old && Number(old.until || 0) >= now + seconds) return false;
  const q = clone(BD.POSITIVES[id]); q.until = now + seconds; q.tick = now; q.duration = seconds; if (!q.desc) q.desc = positiveDefText(q); if (!p.positive || typeof p.positive !== 'object') p.positive = {}; p.positive[id] = q;
  const def = BD.POSITIVES[id]; gLog(`[color=#${def.color}]${def.name}[/color]  ${reason} · ${positiveDefText(def)} (${durationText(seconds)})`); return true; }
function lightMark() { const p = S.P; if (p.dead) return; if (!p.light || typeof p.light !== 'object') p.light = {}; const d = p.light;
  for (const k of ['cur', 'best', 'best_from', 'best_to', 'from', 'last', 'pre']) if (!(k in d)) d[k] = ['best_from', 'best_to', 'from', 'last'].includes(k) ? -1 : 0; if (!Array.isArray(d.days)) d.days = []; if (!Array.isArray(d.deaths)) d.deaths = [];
  const t = Math.floor(kstNow() / 86400); if (Number(d.last) === t) return; d.last = t; d.cur = Number(d.cur) + 1; if (Number(d.cur) === 1) d.from = t;
  if (!d.days.includes(t)) d.days.push(t); while (d.days.length > 60) d.days.shift(); if (Number(d.cur) > Number(d.best)) { d.best = Number(d.cur); d.best_from = Number(d.from); d.best_to = t; }
  for (const [n, name] of D.light_log.MILESTONES) if (Number(d.cur) === n) notify(`light-${n}-${t}`, `불빛 일지 · ${name}`, `쓰러지지 않고 ${n}일을 버텼습니다. 기록 › 불빛 일지에서 볼 수 있습니다.`, 'growth'); }
/* consumption_feedback */
function cfAction(item, d) { const o = item + (() => { const c = item.codePointAt(item.length - 1); if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? '을' : '를'; if (c >= 48 && c <= 57) return [0, 1, 3, 6, 7, 8].includes(c - 48) ? '을' : '를'; return '를'; })(), cat2 = String(d.cat || ''), has = (w) => w.some((x) => item.includes(x));
  if (item === '물병') return '물병의 뚜껑을 열고 천천히 마셨다.';
  if (cat2 === '유틸') { if (has(['주사', '앰플', '혈청', '아드레날린'])) return `${o} 팔에 주사했다.`; if (has(['흡입제'])) return `${o} 깊게 들이마셨다.`; if (has(['음료'])) return `${o} 단숨에 마셨다.`; if (has(['담배'])) return `${o} 꺼내 불을 붙이고 천천히 피웠다.`; if (has(['정제', '캡슐', '보조제', '진정제', '촉진제', '각성제'])) return `${o} 물과 함께 삼켰다.`; return `${o} 사용했다.`; }
  if (cat2 === '회복' || (cat2 !== '음식' && (d.hp != null || d.vaccine))) { if (has(['파스', '패치'])) return `${o} 아픈 곳에 꾹 눌러 붙였다.`; if (has(['붕대', '지혈대', '거즈'])) return `${o} 상처에 단단히 감았다.`; if (has(['압박팩', '지혈팩', '냉각', '찜질'])) return `${o} 아픈 곳에 대고 한동안 눌렀다.`; if (has(['부목'])) return `다친 곳에 ${o} 대고 단단히 고정했다.`; if (has(['연고', '젤', '분말'])) return `${o} 상처에 골고루 발랐다.`; if (has(['수액', '혈액'])) return `${o} 팔에 연결해 천천히 맞았다.`; if (has(['주사', '앰플', '혈청', '백신'])) return `${o} 팔에 주사했다.`; if (has(['키트', '구급상자', '세트', '치료팩', '봉합'])) return `${o} 펼쳐 상처를 치료했다.`; if (has(['소독', '세척액'])) return `${o} 상처에 부어 꼼꼼히 소독했다.`; if (has(['제세동기'])) return `${o} 가슴에 대고 작동시켰다.`; if (has(['정제', '캡슐', '항생제', '치료제', '만병통치약', '회복제', '안정제'])) return `${o} 물과 함께 삼켰다.`; return `${o} 사용해 몸을 돌봤다.`; }
  if (has(['물', '차', '음료', '탱크']) && !has(['물병']) && (['물', '음료'].includes(cat2) || d.water != null) && Number(d.hunger || 0) <= 10) return `${o} 천천히 마셨다.`;
  if (['물', '음료'].includes(cat2) || (d.water != null && d.hunger == null)) return `${o} 천천히 마셨다.`;
  if (has(['수프', '죽', '탕', '찌개', '스튜', '지리', '매운탕'])) return `${o} 따뜻하게 떠먹었다.`;
  if (cat2 === '음식' || d.hunger != null) return `${o} 먹었다.`; return `${o} 사용했다.`; }
const sgn = (v) => (v >= 0 ? '+' + v : String(v));
function cfDescribe(item, d, b, a) { const det = [], pan = !!d.panacea;
  for (const [k, lab] of [['hp', '체력'], ['hunger', '허기'], ['water', '수분'], ['morale', '사기']]) { const ov = Number(b[k] || 0), nv = Number(a[k] || 0); if (!(d[k] != null || pan) && ov === nv) continue;
    const why = (up) => { const r = Number(d[k] || 0); if (r > 0 && nv >= up) return '변화 없음·가득 참'; if (r < 0 && nv <= 0) return '변화 없음·최저치'; return '변화 없음'; };
    if (k === 'hp') det.push(`${lab} ${ov}/${b.max_hp}→${nv}/${a.max_hp ?? b.max_hp} (${ov !== nv ? sgn(nv - ov) : why(Number(a.max_hp))})`); else det.push(`${lab} ${ov}%→${nv}% (${ov !== nv ? sgn(nv - ov) + '%' : why(100)})`); }
  for (const id in (b.conditions || {})) { const nm = ED.CONDITIONS[id]?.name || id; if (!(id in (a.conditions || {}))) { det.push(`${nm} 해제`); continue; } const sh = Math.max(0, Number(b.conditions[id].until || 0) - Number(a.conditions[id].until || 0)); if (sh > 0) det.push(`${nm} ${sh}초 단축`); }
  const BL = { buff_atk: '공격력', buff_def: '방어력', buff_evade: '회피' }; for (const k in BL) { if (d[k] == null) continue; const ov = Number((b.buffs || {})[k] || 0), nv = Number((a.buffs || {})[k] || 0), sf = k === 'buff_evade' ? '%' : ''; det.push(nv !== ov ? `${BL[k]} 강화 ${sgn(ov)}${sf}→${sgn(nv)}${sf} (${sgn(nv - ov)}${sf} · 다음 전투 종료까지)` : `${BL[k]} 강화 ${sgn(nv)}${sf} 유지 (다음 전투 종료까지)`); }
  const now = nowSec(), hd = {}; for (const id in (a.positive || {})) { const cur = a.positive[id]; if (Number(cur.until || 0) <= now) continue; if (JSON.stringify((b.positive || {})[id] || {}) !== JSON.stringify(cur)) { det.push(`긍정 효과 ${cur.name || id} (${durationText(Number(cur.until) - now)})`); hd[id] = 1; } }
  for (const id in (d.effects || {})) { if (hd[id] || !(id in (a.positive || {}))) continue; if (Number(a.positive[id].until || 0) > now) det.push(`긍정 효과 ${a.positive[id].name || id} 유지`); }
  if (!det.length) det.push('현재 상태에서는 수치 변화가 없었다'); return `${cfAction(item, d)} ${det.join(' · ')}.`; }
const snapP = () => ({ hp: Number(S.P.hp), max_hp: Number(S.P.max_hp), hunger: Number(S.P.hunger), water: Number(S.P.water), morale: Number(S.P.morale), conditions: clone(S.P.conditions || {}), positive: clone(S.P.positive || {}), buffs: clone(S.P.buffs || {}) });
/* 바로 먹고 마시는 소모품인지(수리 · 능력치 · 반려동물 전용 같은 것은 따로 처리) */
function consumeOk(it) { const d = GD.ITEMS[it] || {}; return d.repair == null; }
function consume(item) {
  const it = GD.ITEMS[item] || {};
  if (it.pet_only) { setTimeout(() => go('pets'), 0); return false; }
  if (!Object.keys(it).length || count(item) <= 0) return false;
  if (it.stat_boost) { boostStatModal(item); return false; }
  const before = snapP(); removeItem(item, 1); const p = S.P;
  /* v37.21: 토벌 전용 — 다섯 능력치 영구 상승 · 경험치 즉시 획득 */
  if (it.all_boost != null) { const nb = Math.trunc(Number(it.all_boost)); if (!isDict(p.invested)) p.invested = {}; for (const k of BD.STATS) p.invested[k] = Number(p.invested[k] || 0) + nb; syncGrowth();
    gLog(`[color=#e3b341]${item}[/color]  다섯 능력치가 모두 영구 +${nb} 올랐다.`); toast(`모든 능력치 영구 +${nb}`); notify('boost-' + Math.floor(performance.now() * 1000), '능력치 강화', `${item} · 다섯 능력치 영구 +${nb}`, 'growth'); return true; }
  if (it.xp_pct != null) { const gain = Math.max(1, Math.round(xpNeed(Number(p.level)) * Number(it.xp_pct) / 100)); gLog(josaFix(`[color=#e3b341]${item}[/color]  토벌의 기억을 읽고 경험치 ${gain}을(를) 얻었다.`)); toast(`경험치 +${gain}`); addXp(gain); return true; }
  if (it.mutation_cure) { useMutationCure(); if (p.dead) return true; }
  if (it.panacea) { const keep = (p.conditions || {}).final_mutation; p.conditions = {}; p.hp = p.max_hp; p.hunger = 100; p.water = 100; p.morale = 100; if (keep) p.conditions.final_mutation = keep; }
  if (it.vaccine) { delete p.conditions.infection; delete p.conditions.mutation; if (!p.positive || typeof p.positive !== 'object') p.positive = {}; p.positive.immunity = { name: '백신 면역', until: nowSec() + 86400, resist: 25.0, color: '6cb6ff', desc: '24시간 감염 면역 · 부정 상태 저항 25%' }; }
  const states = p.conditions || {}, now = nowSec();
  for (const id of (ED.TREATMENTS[item] || [])) delete states[id];
  for (const id in (ED.REDUCERS[item] || {})) if (states[id]) { states[id].until = Math.max(now, Number(states[id].until) - Math.round(Number(ED.REDUCERS[item][id]) * Number(states[id].scale ?? 1))); if (Number(states[id].until) <= now) delete states[id]; }
  p.conditions = states; grantPositive(item);
  if (it.hp != null && Number(it.hp) > 0) { const amt = Math.round(Number(it.hp) * cityMult('clinic')); p.hp = Math.min(Number(p.max_hp), Number(p.hp) + Math.trunc(amt * derived().recover / 100)); }
  else if (it.hp != null && Number(it.hp) < 0) { const hb = Number(p.hp); p.hp = Math.max(1, hb + Number(it.hp)); guardAfterDamage(hb, item); }
  for (const k of ['hunger', 'water', 'morale']) if (it[k] != null) { let g = Number(it[k]); if (g > 0) g = Math.round(g * ({ hunger: cityMult('farm'), water: cityMult('water') }[k] ?? 1)); p[k] = Math.max(0, Math.min(100, Number(p[k]) + g)); }
  if (Number(it.hunger || 0) > 0) questEvent('eat'); if (Number(it.water || 0) > 0) questEvent('drink'); if (Number(it.hp || 0) > 0 && String(it.cat || '') === '회복') questEvent('heal_item');
  if (!p.buffs || typeof p.buffs !== 'object') p.buffs = {}; for (const k of ['buff_atk', 'buff_def', 'buff_evade']) if (it[k] != null && !BD.POSITIVE_ITEMS[item]) p.buffs[k] = Math.max(Number(p.buffs[k] || 0), Number(it[k]));
  lightMark(); if (it.hunger != null && Number(it.hunger) > 0 && Number(p.hunger) >= 90) grantState('well_fed', 600, '든든한 식사'); if (it.water != null && Number(it.water) > 0 && Number(p.water) >= 90) grantState('hydrated', 600, '충분한 수분');
  const fb = cfDescribe(item, it, before, snapP()); gLog(`[color=#3fd0a4]${item}[/color]  ${fb}`); toastJ(fb); return true;
}
/* 변이 치료제(_use_mutation_cure) — 최종 변이는 확률(1·2·3번째 시도), 세 번 실패하면 사망 */
function useMutationCure() { const p = S.P, states = isDict(p.conditions) ? p.conditions : {};
  if (states.final_mutation && Number(states.final_mutation.until || 0) > nowSec()) { let tries = Math.max(0, Math.min(2, Number(p.final_tries || 0))); const chance = Number(M.FINAL_CURE_CHANCES[tries]);
    if (gRandf() < chance) { delete states.final_mutation; p.conditions = states; p.final_tries = 0; gLog(`[color=#3fd0a4]최종 변이 치료[/color]  변이 치료제가 들었다. 몸이 서서히 원래대로 돌아온다. (${tries + 1}번째 시도 · 성공 확률 ${Math.round(chance * 100)}%)`); alertPopup('final-cure-' + nowSec(), '최종 변이 치료 성공', `${tries + 1}번째 시도에서 치료에 성공했습니다.`, 'condition'); return; }
    tries++; p.final_tries = tries;
    if (tries >= 3) { gLog('[color=#6b1f3a]최종 변이[/color]  세 번째 치료도 실패했다. 몸이 버티지 못하고 쓰러졌다.'); p.final_tries = 0; p.hp = 0; checkDeath('최종 변이 치료에 세 번 실패했다'); return; }
    const next = Number(M.FINAL_CURE_CHANCES[tries]); gLog(`[color=#6b1f3a]최종 변이[/color]  치료에 실패했다. 남은 시도 ${3 - tries}번 · 다음 성공 확률 ${Math.round(next * 100)}%`);
    alertPopup('final-fail-' + nowSec(), '최종 변이 치료 실패', `남은 시도 ${3 - tries}번입니다. 다음 시도의 성공 확률은 ${Math.round(next * 100)}%입니다. 3번째 시도도 실패하면 사망합니다.`, 'condition'); return; }
  const had = 'infection' in states || 'mutation' in states; delete states.infection; delete states.mutation; p.conditions = states; gLog('[color=#3fd0a4]변이 치료제[/color]  ' + (had ? '감염·변이를 치료했다.' : '치료할 감염·변이가 없었다.')); }
/* 잠재력 정수 · 감염체 핵 정수 — 능력치 하나를 골라 영구 상승(_select_boost_stat) */
function boostStatModal(item) { if (count(item) <= 0) return; const amt = Math.max(1, Math.trunc(Number(GD.ITEMS[item]?.stat_boost ?? 5)));
  modal(`${item} · 능력치 선택`, `<div style="display:grid;gap:8px">${BD.STATS.map((k) => `<button class="btn primary" data-bst="${esc(k)}">${esc(statName(k))} 영구 +${amt}</button>`).join('')}</div>`, [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-bst]').forEach((b) => { b.onclick = () => { const k = b.dataset.bst; $('modalRoot').innerHTML = ''; if (count(item) <= 0) return;
    act(() => { if (count(item) <= 0) return false; removeItem(item, 1); const p = S.P; if (!isDict(p.invested)) p.invested = {}; p.invested[k] = Number(p.invested[k] || 0) + amt; syncGrowth(); notify('boost-' + Math.floor(performance.now() * 1000), '능력치 강화', `${statName(k)} 영구 +${amt} · 실제 능력치에 반영되었습니다.`, 'growth'); return true; }); }; }); }
function equipGear(item) { const p = S.P; if (p.dead || !GEAR.ITEMS[item] || count(item) <= 0) return false; const it = GEAR.ITEMS[item];
  const found = p.found_gear && typeof p.found_gear === 'object' ? p.found_gear : {}, foundOk = Number(found[item] || 0) > 0 && (count(item) > 0 || Object.values(p.equipment || {}).includes(item));
  if (Number(p.level) < Number(it.level) && !foundOk) { toast(`Lv.${it.level}부터 장착 가능합니다. (탐사에서 얻은 장비는 레벨과 상관없이 장착할 수 있습니다)`); return false; }
  if (String((p.equipment || {})[it.slot] || '') !== item) questEvent('equip_new');
  const ratio = Number(p.hp) / Math.max(1, Number(p.max_hp)); p.equipment[String(it.slot)] = item; syncGrowth(); p.hp = Math.max(1, Math.min(Number(p.max_hp), Math.round(Number(p.max_hp) * ratio))); gLog('장비 장착 · ' + gearDescription(item)); return true; }
function useInventory(item) {
  const p = S.P; if (count(item) <= 0) return false;
  if (GEAR.ITEMS[item]) return equipGear(item);
  const it = GD.ITEMS[item] || {};
  if (BD.MOVE_ITEMS[item]?.move != null) { if (!p.mobility || typeof p.mobility !== 'object') p.mobility = {}; p.mobility[String(BD.MOVE_ITEMS[item].cat) === '탈것' ? '탈것' : '이동'] = item; gLog(`이동 수단 선택 · ${item} · 이동속도 ${moveSpeed().toFixed(2)}배`); return true; }
  if (GD.WEAPONS[item]) { if (String(p.equipment['무기'] || '') !== item) questEvent('equip_new'); p.equipment['무기'] = item; gLog(`[color=#3fd0a4]장착[/color]  무기를 ${item}(으)로 바꿨다. 공격력 ${Math.trunc(derived().attack)}.`); return true; }
  if (GD.ARMORS[item]) { if (String(p.equipment['방어구'] || '') !== item) questEvent('equip_new'); p.equipment['방어구'] = item; gLog(`[color=#3fd0a4]장착[/color]  방어구를 ${item}(으)로 바꿨다. 방어력 ${Math.trunc(derived().defense)}.`); return true; }
  if (GD.ITEMS[item]?.stat_boost) { boostStatModal(item); return false; }
  if (cat(item).usable) return consume(item);
  if (it.dmg != null || it.stun != null || it.escape) gLog(`${item}은(는) 전투 중 '아이템 사용'으로 쓸 수 있다.`);
  else if (it.revive) gLog('제세동기는 가지고만 있으면 사망할 때 자동으로 작동한다.');
  else gLog(`${item}은(는) 제작 재료다. 제작 메뉴에서 쓸 수 있다.`);
  return true;
}
const canUseHere = (item) => { if (GD.ITEMS[item]?.repair != null) return true; if (GEAR.ITEMS[item] || BD.MOVE_ITEMS[item]?.move != null || GD.WEAPONS[item] || GD.ARMORS[item]) return true; if (BD.MOVE_ITEMS[item] && !GD.ITEMS[item]) return false; if (BD.POSITIVE_ITEMS[item] && !GD.ITEMS[item]) return false; return consumeOk(item); };
function unequip(slot) { const p = S.P; if (p.dead) return false; if (['탈것', '이동'].includes(slot)) { delete p.mobility[slot]; return true; } const ratio = Number(p.hp) / Math.max(1, Number(p.max_hp)); delete p.equipment[slot]; syncGrowth(); p.hp = Math.max(1, Math.min(Number(p.max_hp), Math.round(Number(p.max_hp) * ratio))); return true; }
function ensureShopDay() { const p = S.P, day = String(Math.floor((kstNow() - 6 * 3600) / 86400)); if (String(p.shop_day || '') !== day) { p.shop_day = day; p.shop_bought = 0; p.shop_sold = 0; p.shop_bought_items = {}; } if (!p.shop_bought_items || typeof p.shop_bought_items !== 'object') p.shop_bought_items = {}; p.shop_bought = Math.max(0, Number(p.shop_bought || 0)); p.shop_sold = Math.max(0, Number(p.shop_sold || 0)); }
function doTrade(item, n, sell) { ensureShopDay(); const p = S.P; if (n < 1 || n > 99 || n > maxQty(item, sell)) { toast('수량·소지금·가방 공간·오늘 거래 한도를 확인하세요.'); return false; }
  if (sell) { const money = n * sellPriceOf(item); removeItem(item, n); p.money = Number(p.money) + money; p.shop_sold = Number(p.shop_sold) + money; gLog(`판매 · ${item} ${n}개 · +${won(money)}`); questEvent('shop_sell_money', money); }
  else { const cost = n * priceOf(item); if (!addItem(item, n)) return false; p.money = Number(p.money) - cost; if (tabOf(item) === '장비') p.shop_bought = Number(p.shop_bought) + n; else p.shop_bought_items[item] = Number(p.shop_bought_items[item] || 0) + n; gLog(`구매 · ${item} ${n}개 · -${won(cost)}`); questEvent('shop_buy'); questEvent('shop_buy_money', cost); }
  return true; }
function expandBag(tab) { const p = S.P; if (nonEmpty(p.travel)) { toast('도착 후 이용할 수 있습니다. 이동 중에는 음식·치료·정보 메뉴를 이용하세요.'); return false; } const price = bagPrice(slotCap(tab)); if (Number(p.money) < price || slotCap(tab) >= GD.MAX_SLOTS) return false;
  p.money = Number(p.money) - price; if (!p.slots || typeof p.slots !== 'object') p.slots = {}; p.slots[tab] = Math.min(GD.MAX_SLOTS, slotCap(tab) + GD.EXPAND_STEP); questEvent('bag_expand'); gLog(`[color=#6cb6ff]가방 확장[/color]  ${tab} 가방 ${slotCap(tab)}칸  -${won(price)}`); return true; }
function confirmStats() { const p = S.P, total = draftTotal(); if (total <= 0 || total > Number(p.skill_points)) { toast('사용할 포인트를 먼저 선택하세요.'); return false; } const sum = []; if (!p.invested || typeof p.invested !== 'object') p.invested = {};
  for (const st of BD.STATS) { const n = STAT.draft[st] || 0; if (n <= 0) continue; p.invested[st] = Number(p.invested[st] || 0) + n; sum.push(statName(st) + ` +${n}`); }
  p.skill_points = Number(p.skill_points) - total; STAT.draft = {}; syncGrowth(); gLog('능력치 확정 · ' + sum.join(' / ')); return true; }
function claimStored() { const st = { ...(S.P.stored_loot || {}) }; for (const it of Object.keys(st)) if (addItem(it, Number(st[it]))) delete st[it]; S.P.stored_loot = st; return true; }
function autoFoodCfg() { const p = S.P; let c = p.auto_food; if (!c || typeof c !== 'object') c = {}; if (!('on' in c)) c.on = true; if (!c.off || typeof c.off !== 'object') c.off = {}; p.auto_food = c; return c; }

/* ── 실행 · 저장 ── */
async function actWhenFree(fn, after) { for (let i = 0; i < 100 && LIVE.saving; i++) await new Promise((r) => setTimeout(r, 200)); return act(fn, after); }
async function act(fn, after) {
  if (LIVE.lost) { sessionLostModal(); return; }
  if (LIVE.saving) { toast('저장하는 중입니다. 잠시 뒤 다시 눌러 주세요.'); return; }
  const before = clone(S.P);
  let ok = false; try { ok = fn() !== false; } catch (e) { console.error(e); S.P = before; toast('처리하지 못했습니다.'); return; }
  if (!ok) { S.P = before; rerender(); return; }
  questStateSync(); storyCapture();
  if (after) after(); rerender();
  if (!LIVE.on) return; /* 시험(데모) 화면은 저장하지 않음 */
  LIVE.saving = true; setSaveBadge('저장 중…');
  const r = await call('saveGame', JSON.stringify({ player: S.P, log: S.log || [] }));
  LIVE.saving = false;
  if (r && r.ok) { if (r.player) S.P = r.player; if (Array.isArray(r.log)) S.log = r.log; setSaveBadge('저장됨'); rerender(); cityReport(); coopFlush(); syncCharLevel(); return; }
  if (r && r.conflict && r.player) { S.P = r.player; if (Array.isArray(r.log)) S.log = r.log; setSaveBadge(''); rerender(); modal('기록을 다시 불러왔습니다', '<p>다른 곳(교환 · 선물 · 다른 기기)에서 기록이 먼저 바뀌어, 방금 한 동작은 저장하지 않고 서버의 최신 기록을 불러왔습니다. 필요하면 다시 해 주세요.</p>'); return; }
  if (r && r.sessionLost) { S.P = before; setSaveBadge(''); rerender(); onSessionLost(); return; }
  S.P = before; setSaveBadge(''); rerender(); toast('저장하지 못해 되돌렸습니다. ' + ((r && r.error) || ''));
}
function rerender() { if (!$('app') || $('app').hidden) return; const c = $('center'), top = c ? c.scrollTop : 0; render(); const c2 = $('center'); if (c2) c2.scrollTop = top; }
let saveBadgeT = 0; function setSaveBadge(t) { const b = $('saveBar'); if (!b || !LIVE.on) return; clearTimeout(saveBadgeT); b.classList.remove('bad'); b.textContent = t; b.hidden = !t; if (t === '저장됨') saveBadgeT = setTimeout(() => { b.hidden = true; }, 1200); }
/* 세션: 지금 게임과 같은 claimSession(나중에 연 화면이 이김) */
function claimThenLoad() {
  return new Promise((resolve) => {
    let started = false; const go = (wait) => { if (started) return; started = true; setTimeout(resolve, wait); };
    if (!bridge()?.claimSession) { go(0); return; }
    sub('claimSession', [], (r) => { const t = String(r.type || ''); if (t === 'claimed') go(r.hadOther ? 3000 : 0); else if (t === 'lost') onSessionLost(); });
    setTimeout(() => go(0), 6000);
  });
}
function onSessionLost() { if (LIVE.lost) return; LIVE.lost = true; LIVE.on = false; call('releaseSaves'); sessionLostModal(); const b = $('saveBar'); if (b) { clearTimeout(saveBadgeT); b.textContent = '다른 기기에서 접속해 저장을 멈췄습니다'; b.classList.add('bad'); b.hidden = false; } }
function sessionLostModal() { modal('다른 기기에서 접속했습니다', '<p>같은 계정이 다른 기기(또는 탭)에서 열려, 이 화면은 더 이상 저장하지 않습니다. 이어서 하려면 이 화면을 새로고침해 다시 입장하세요.</p>', [['새로고침', 'primary', () => location.reload()], ['닫기', '', null]]); }
/* 게임의 확인 창: 아래 줄에 [취소 | 확인] 두 칸 */
function confirmModal(title, body, yesLabel, yesCls, fn) {
  modal(title, body, []);
  const box = $('mBtns'); box.className = 'mrow';
  const no = document.createElement('button'); no.className = 'btn'; no.textContent = '취소'; no.onclick = () => { $('modalRoot').innerHTML = ''; };
  const yes = document.createElement('button'); yes.className = 'btn ' + (yesCls === 'danger' ? 'dangerfill' : 'primary'); yes.textContent = yesLabel; yes.onclick = () => { $('modalRoot').innerHTML = ''; fn(); };
  box.append(no, yes); yes.focus();
}

function questStateSync() { const keys = questKeys(); for (const sc of ['daily', 'weekly']) { if (String(S.P.quests?.[sc]?.key || '') !== keys[sc]) continue; for (const q of questList(sc)) questDone(sc, q); } }
function runAct(b) {
  const d = b.dataset, it = d.item;
  switch (d.act) {
    case 'use': if (GD.ITEMS[it]?.repair != null) return kitModal(it); return act(() => useInventory(it));
    case 'dismantle': return act(() => dismantle(it, 1));
    case 'repair': { const n = REPAIR.points, q = repairPrice(it, n); return act(() => repairConfirm(it, n, q)); }
    case 'repairall': return act(() => repairAll(Number(d.quote)));
    case 'kit': return act(() => kitUse(it, d.tool));
    case 'merch': return merchantModal(d.key, it, Number(d.price), Number(d.limit));
    case 'claimq': { const q = (d.scope === 'daily' ? QD.DAILY : QD.WEEKLY).find((x) => x.id === d.id); if (!q) return; return act(() => claimQuest(d.scope, q)); }
    case 'discard': {
      if (count(it) <= 0) return; if (equippedLast(it)) { toast('장착 중인 마지막 1개는 버릴 수 없습니다.'); return; }
      return confirmModal('이 물품을 버리시겠습니까?', `<p style="font-size:18px;color:var(--danger)">${esc(it)} · 1개</p><p style="color:var(--text)">버린 물품은 돌려받을 수 없습니다. 버리면 ${count(it) - 1}개 남습니다.</p>`, '버리기', 'danger', () =>
        act(() => { if (count(it) <= 0 || equippedLast(it)) { toast('버릴 수 있는 물품이 없습니다.'); return false; } removeItem(it, 1); gLog(`${it} 1개를 버렸다.`); return true; }));
    }
    case 'craftmat': { CRAFT.mat = it; CRAFT.page = 0; CRAFT.q = ''; if (CRAFT.cat === '분해') CRAFT.cat = '요리'; return go('craft'); }
    case 'discardall': {
      const n = count(it) - (isWorn(it) ? 1 : 0); if (n <= 0) { toast('장착 중인 마지막 물품은 먼저 해제하세요.'); return; }
      return confirmModal('선택 품목을 모두 버리시겠습니까?', `<p style="font-size:18px;color:var(--danger)">${esc(it)} · ${n}개</p><p style="color:var(--text)">버린 물품은 돌려받을 수 없습니다.${isWorn(it) ? ' 장착 중인 1개는 남겨 둡니다.' : ''}</p>`, '모두 버리기', 'danger', () =>
        act(() => { if (count(it) - (isWorn(it) ? 1 : 0) !== n) { toast('보유 수량이 바뀌었습니다. 다시 선택하세요.'); return false; } removeItem(it, n); gLog(`버리기 · ${it} ${n}개`); return true; }));
    }
    case 'afitem': return act(() => { const c = autoFoodCfg(); if (c.off[it]) delete c.off[it]; else c.off[it] = true; toast(`${it} 자동 사용을 ${c.off[it] ? '껐습니다.' : '켰습니다.'}`); return true; });
    case 'afall': return act(() => { const c = autoFoodCfg(); c.on = !c.on; toast('자동 먹고 마시기를 ' + (c.on ? '켰습니다.' : '껐습니다.')); return true; });
    case 'claim': return act(() => claimStored());
    case 'bag': return act(() => expandBag(d.tab));
    case 'stats': return act(() => confirmStats());
    case 'unequip': return act(() => unequip(d.slot));
    case 'trade': {
      const sell = d.sell === '1', sel = b.closest('.sline')?.querySelector('.qsel'), n = Math.max(1, Math.min(99, Number(sel ? sel.value : 1)));
      const unit = sell ? sellPriceOf(it) : priceOf(it), amount = unit * n, after = Number(S.P.money) + (sell ? amount : -amount);
      return confirmModal(sell ? '판매하시겠습니까?' : '구매하시겠습니까?', `<p style="font-size:18px;color:${sell ? 'var(--warning)' : 'var(--accent)'}">${esc(itemDisplay(it))} × ${n}개</p><p style="color:var(--text);white-space:pre-line">${sell ? '판매가' : '가격'} ${won(unit)} × ${n} = ${won(amount)}\n거래 후 소지금 ${won(after)}</p>`, sell ? '판매하기' : '구매하기', 'primary', () => {
        const m0 = Number(S.P.money);
        act(() => { if (!doTrade(it, n, sell)) return false; const diff = Number(S.P.money) - m0; toast((sell ? `판매 · ${it} × ${n} · +${won(Math.abs(diff))} · 소지금 ${won(S.P.money)}` : `구매 · ${it} × ${n} · -${won(Math.abs(diff))} · 소지금 ${won(S.P.money)}`)); return true; });
      });
    }
  }
}
/* 불러온 기록을 지금 게임(_apply_loaded)과 같은 모양으로 정리 */
function normalizeLoaded(p) {
  p.coins = Math.max(0, Number(p.coins || 0)); const clean = {}; for (const k in (p.inventory || {})) if (Number(p.inventory[k]) > 0) clean[String(k)] = Math.trunc(Number(p.inventory[k])); p.inventory = clean;
  if (!Array.isArray(p.visited)) p.visited = []; if (!p.buffs || typeof p.buffs !== 'object') p.buffs = {}; if (!p.slots || typeof p.slots !== 'object') p.slots = { '소모품': GD.START_SLOTS, '장비': GD.START_SLOTS, '재료': GD.START_SLOTS };
  if (!p.pending_explore || typeof p.pending_explore !== 'object') p.pending_explore = {}; for (const k of ['conditions', 'long_expedition', 'stored_loot', 'positive', 'travel']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {};
  if (!p.equipment || typeof p.equipment !== 'object') p.equipment = {}; if (!p.mobility || typeof p.mobility !== 'object' || Array.isArray(p.mobility)) p.mobility = {};
  return p;
}


/* ════════ 저장하는 동작(2차) — 수리 · 수리 키트 · 퀘스트 보상(경험치 · 레벨업) · 분해 · 행상인 구매 ════════ */
const isHubNow = () => S.P.at_hub !== false && !activityBusy() && !nonEmpty(S.P.battle) && !S.P.dead;
function setDur(it, v) { if (!S.P.durability || typeof S.P.durability !== 'object') S.P.durability = {}; S.P.durability[it] = v; }
function repairOne(it, amount = 100) {
  if (!isHubNow()) { toast('현지 거점에서 활동을 마친 뒤 수리하세요.'); return false; }
  if (!durApplies(it) || count(it) <= 0) { toast('수리할 장비가 없습니다. 파손된 장비는 복원되지 않습니다.'); return false; }
  const restored = Math.min(Math.max(0, amount), 100 - durValue(it)); if (restored <= 0) { toast('이미 완전한 장비입니다.'); return false; }
  const price = repairPrice(it, restored); if (Number(S.P.money) < price) { toast(`수리비가 ${won(price - Number(S.P.money))} 부족합니다.`); return false; }
  S.P.money = Number(S.P.money) - price; setDur(it, durValue(it) + restored);
  gLog(`장비 수리 · ${it} · 내구도+${restored} · ${won(price)}`); syncGrowth(); questEvent('repair'); return true;
}
function repairConfirm(it, amount, quoted) { if (repairPrice(it, amount) !== quoted) { toast('장비 상태나 수리 요금이 바뀌었습니다. 새 견적을 확인하세요.'); return false; } return repairOne(it, amount); }
function repairAll(quoted) {
  if (!isHubNow()) return false; const names = damagedList(); let price = 0; for (const it of names) price += repairPrice(it);
  if (price !== quoted) { toast('일괄 견적이 바뀌었습니다. 다시 확인하세요.'); return false; }
  if (!names.length || Number(S.P.money) < price) { toast('수리비 또는 수리할 장비를 확인하세요.'); return false; }
  S.P.money = Number(S.P.money) - price; for (const it of names) setDur(it, 100); syncGrowth(); questEvent('repair');
  gLog(`일괄 수리 · ${names.length}개 장비 · ${won(price)}`); return true;
}
const kitBlock = () => (nonEmpty(S.P.battle) ? '전투를 마친 뒤 수리 키트를 쓸 수 있습니다.' : S.P.dead ? '사망 상태에서는 쓸 수 없습니다.' : '');
function kitUse(it, tool) {
  const why = kitBlock(); if (why) { toast(why); return false; }
  if (!durApplies(it) || count(it) <= 0) { toast('수리할 무기나 방어구가 없습니다.'); return false; }
  const amount = Math.min(100 - durValue(it), Number(GD.ITEMS[tool]?.repair || 0)); if (amount <= 0 || count(tool) <= 0) { toast('수리 키트나 손상된 장비가 필요합니다.'); return false; }
  const before = durValue(it); removeItem(tool, 1); setDur(it, before + amount);
  const hp0 = Number(S.P.hp); syncGrowth(); S.P.hp = Math.min(hp0, Number(S.P.max_hp)); questEvent('repair');
  gLog(`키트 수리 · ${it} · 내구도 ${before} → ${before + amount} · ${tool} 1개 사용`); toast(`${it} · 내구도 ${before} → ${before + amount}`); return true;
}
/* gear_durability.use_kit: 고칠 장비 고르기(장착 중인 것 먼저, 그다음 많이 닳은 것) */
function kitModal(tool) {
  const why = kitBlock(); if (why) { toast(why); return; } if (count(tool) <= 0) return;
  const eq = [String(S.P.equipment?.['무기'] || ''), String(S.P.equipment?.['방어구'] || '')], rep = Number(GD.ITEMS[tool]?.repair || 0);
  const list = damagedList().sort((a, b) => (eq.includes(b) ? 1 : 0) - (eq.includes(a) ? 1 : 0) || durValue(a) - durValue(b));
  if (!list.length) { modal(`${tool} 사용 · 최대 ${rep} 복구`, '<p>손상된 무기나 방어구가 없습니다. 키트는 그대로 남습니다.</p>'); return; }
  modal(`${tool} 사용 · 최대 ${rep} 복구`, `<p>고칠 장비를 고르세요. 보유 ${count(tool)}개 · 거점이 아니어도 바로 고칩니다.</p>`, list.map((it) => [`${eq.includes(it) ? '[장착 중] ' : ''}${itemDisplay(it)} · 내구도 ${durValue(it)} → ${Math.min(100, durValue(it) + rep)}`, eq.includes(it) ? 'primary' : '', () => act(() => kitUse(it, tool))]).concat([['닫기', '', null]]));
}
/* 경험치 · 레벨업(main._add_xp) */
function addXp(amount) {
  const p = S.P, now = nowSec();
  if (amount > 0 && Number((p.positive || {}).newbie?.until || 0) > now) amount = Math.round(amount * (1 + D.survival_guard.NEWBIE_XP_BONUS / 100));
  if (amount > 0) { let extra = 0; for (const id in (p.positive || {})) { if (!BD.POSITIVES[id] || Number(p.positive[id].until || 0) <= now || id === D.survival_guard.NEWBIE_ID) continue; extra += Number(p.positive[id].xp_all || 0); } if (extra > 0) amount = Math.round(amount * (1 + extra / 100)); const rm = cityMult('radio'); if (rm > 1) amount = Math.round(amount * rm); }
  p.xp = Number(p.xp) + amount; const natBefore = naturalGrowth(Number(p.level)); let levels = 0;
  while (Number(p.level) < 100 && Number(p.xp) >= xpNeed(Number(p.level))) { p.xp = Number(p.xp) - xpNeed(Number(p.level)); p.level = Number(p.level) + 1; p.skill_points = Number(p.skill_points) + 3; levels++; questEvent('levelup'); }
  if (Number(p.level) >= 100) p.xp = Math.min(Number(p.xp), xpNeed(Number(p.level)) - 1);
  if (levels > 0 && Number(p.level) >= 5 && Number(p.level) - levels < 5) notify('unlock-casino', '도박장이 열렸습니다', "Lv.5 달성! 이제 거점에서 '도박장'을 이용할 수 있습니다.\n거점 화면의 '도박장' 또는 거점 시설 › 도박장 탭에서 들어가세요 · 코인 게임 8종 · 사은품 교환", 'party');
  if (levels > 0) { syncGrowth(); const nat = naturalGrowth(Number(p.level)) - natBefore;
    gLog(`레벨 ${p.level} 달성 · 기본 능력치 5종 +${nat} · 투자 포인트 +${levels * 3}`);
    notify(`level-${p.level}-${Math.floor(performance.now() * 1000)}`, `레벨 업 · Lv.${p.level}`, `기본5종 +${nat} · 투자포인트 +${levels * 3}\n\t능력치 메뉴에서 투자할 수 있습니다.`, 'growth');
    toast(`레벨 ${p.level}! 능력치 투자 포인트 ${levels * 3}개 추가`); grantState('inspired', 600, '레벨 업'); }
}
/* 퀘스트 보상(main._claim_quest) */
function claimQuest(scope, q) {
  const qs = S.P.quests?.[scope]; if (!qs || String(qs.key || '') !== questKeys()[scope]) { questSync(); toast('새 퀘스트 기간이라 퀘스트를 새로 뽑았습니다. 다시 확인해 주세요.'); return true; }
  if (!Array.isArray(qs.claimed)) qs.claimed = [];
  if (!questDone(scope, q) || qs.claimed.includes(q.id) || !(qs.picked || []).includes(q.id)) return false;
  qs.claimed.push(String(q.id)); const r = q.reward || {};
  if (r.items) for (const it in r.items) addItem(it, Number(r.items[it]));
  if (r.points != null) S.P.skill_points = Number(S.P.skill_points) + Number(r.points);
  S.P.money = Number(S.P.money) + rewardMoney(r);
  if (scope === 'daily' && q.id === 'd_explore' && !S.P.first_quest_bonus) { S.P.first_quest_bonus = true; S.P.money = Number(S.P.money) + 500; notify('first-quest-bonus', '첫 정찰 완료 · 500원', '폐허 정찰의 첫 완료 보상으로 소지금 500원을 받았습니다. 하루가 바뀌어도 이 특별 보상은 다시 지급되지 않습니다.', 'quest'); }
  gLog(`[color=#e3b341]퀘스트 완료[/color]  ${q.title} · ${rewardText(r)}`);
  if (r.xp != null) addXp(Number(r.xp)); return true;
}
/* 분해(main._dismantle) */
function dismantle(name, qty = 1) {
  if (activityBusy() || nonEmpty(S.P.battle) || S.P.dead) { toast('현재 활동을 마친 뒤 분해하세요.'); return false; }
  const avail = Math.max(0, count(name) - (isWorn(name) ? 1 : 0));
  if (qty < 1 || qty > 999 || !GD.DISMANTLE[name] || qty > avail) { toast('분해할 수량을 확인하세요. 장착 중인 1개는 남겨 둡니다.'); return false; }
  const res = {}; for (const r in GD.DISMANTLE[name]) res[r] = Number(GD.DISMANTLE[name][r]) * qty;
  removeItem(name, qty); for (const r in res) if (!addItem(r, res[r])) { if (!S.P.stored_loot || typeof S.P.stored_loot !== 'object') S.P.stored_loot = {}; S.P.stored_loot[r] = Number(S.P.stored_loot[r] || 0) + res[r]; }
  gLog(`분해 완료 · ${name} × ${qty} → ${Object.keys(res).map((k) => `${itemDisplay(k)} × ${res[k]}`).join(', ')}`); questEvent('dismantle'); return true;
}
/* 행상인 구매(main._merchant_buy · 1개씩 n번) */
function merchantBuyOne(key, it, limit) {
  const v = merchantNow(); if (!v || String(v.key) !== key) { toast('행상인이 떠났습니다.'); return false; }
  const g = v.goods.find((x) => x[0] === it); if (!g) { toast('현재 행상인 목록을 다시 확인하세요.'); return false; }
  const price = merchantPrice(key, it, g[1]), lim = g[2]; if (price <= 0 || lim <= 0) { toast('현재 행상인 목록을 다시 확인하세요.'); return false; }
  if (!S.P.merchant_bought || typeof S.P.merchant_bought !== 'object') S.P.merchant_bought = {}; if (!S.P.merchant_bought[key] || typeof S.P.merchant_bought[key] !== 'object') S.P.merchant_bought[key] = {};
  const bought = Number(S.P.merchant_bought[key][it] || 0), why = merchantReason(v, it, price, Math.max(0, lim - bought)); if (why) { toast(why); return false; }
  if (limit !== lim) { toast('현재 행상인 목록이 바뀌었습니다. 다시 선택하세요.'); return false; }
  if (!addItem(it, 1)) { toast('가방 공간을 다시 확인하세요.'); return false; }
  S.P.money = Number(S.P.money) - price; S.P.merchant_bought[key][it] = bought + 1; questEvent('merchant_buy'); gLog(`행상인 구매 · ${it} · ${won(price)}`); return true;
}
function merchantBuy(key, it, price, limit, n) {
  const before = count(it); for (let i = 0; i < n; i++) { const c0 = count(it); merchantBuyOne(key, it, limit); if (count(it) === c0) break; }
  const got = count(it) - before;
  if (got > 0) { nhAdd('merchant-buy-' + Math.floor(performance.now() * 1000), '행상인 구매', `${it} ×${got} · ${won(price * got)}`, 'loot'); toast(`행상인에게 ${itemDisplay(it)} ${got}개를 샀습니다 · ${won(price * got)}`); return true; }
  toast('구매하지 못했습니다 · 돈 · 가방 칸 · 남은 수량을 확인해 주세요'); return false;
}
function merchantModal(key, it, price, limit) {
  const p = S.P, bought = Number(((p.merchant_bought || {})[key] || {})[it] || 0); let most = Math.min(Math.max(0, limit - bought), Math.floor(Number(p.money) / Math.max(1, price)), 99);
  while (most > 0 && !fits(it, most)) most--; if (most <= 0) { toast('소지금 · 재고 · 가방 공간을 확인하세요.'); return; }
  const quick = [1, 5, 10, most].filter((q) => !(q > most || (q === most && [1, 5, 10].includes(q))));
  let chosen = 1;
  confirmModal('행상인에게 구매하시겠습니까?', `<p style="font-size:18px;color:${gradeColor(it)}">[${esc(cat(it).grade)}] ${esc(itemDisplay(it))}</p><p>수량 (1~${most}개 · 개당 ${won(price)})</p><label class="spin"><input type="number" id="mQty" min="1" max="${most}" value="1"></label><div class="mrow" style="display:flex;gap:6px">${quick.map((q) => `<button class="btn sm" data-mq="${q}" style="flex:1">${q === most ? '최대 ' + q : q}</button>`).join('')}</div><p id="mSum" style="color:var(--text)"></p>`, '구매하기', 'primary', () => act(() => merchantBuy(key, it, price, limit, chosen)));
  const q = $('mQty'), upd = () => { const n = Math.max(1, Math.min(most, Math.trunc(Number(q.value) || 1))); chosen = n; $('mSum').textContent = `합계 ${won(price * n)} · 거래 후 소지금 ${won(Number(p.money) - price * n)}`; };
  q.oninput = upd; document.querySelectorAll('[data-mq]').forEach((b) => { b.onclick = () => { q.value = b.dataset.mq; upd(); }; }); upd();
}

function settingsModal() {
  modal('화면 설정', `<p>색 테마를 고르세요. 테마는 이 기기에 저장됩니다.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${M.THEME_IDS.map((id) => `<button class="btn sm" data-th="${id}" style="${S.theme === id ? 'border-color:var(--accent)' : ''}">${esc(M.THEMES[id].name)}</button>`).join('')}</div>`, [['닫기', '', null]]);
  document.querySelectorAll('[data-th]').forEach((b) => { b.onclick = () => { applyTheme(b.dataset.th); $('modalRoot').innerHTML = ''; render(); }; });
}

/* ── 시작 ── */
(async () => {
  const b = await waitBridge();
  if (!b || !b.available) { $('tErr').textContent = '서버에 연결하지 못했습니다. ' + ((b && b.loadError) || ''); return; }
  const r = await call('whenReady');
  if (r && r.signedIn) { S.acct = r; showChars(); } else showLogin();
  /* 시계 · 날짜 줄은 1분마다 */
  setInterval(() => { if (S.P && !$('app').hidden) { const d = document.querySelector('.hdr-day, .mhdr .day'); if (d) render(); } }, 60000);
})();
// 시험용: 저장 없이 미리 만든 기록으로 화면을 띄웁니다(?demo=1)
window.__llGo = (m) => go(m);
window.__llEval = (code) => eval(code); /* 시험용: 화면 점검 도구에서만 씁니다 */
window.__llTest = { setMerchant: (key) => { const k = kstNow(); merchantOverride = { key, start: k - 10, end: k + 3600 }; }, enterTitle: async () => { S.acct = await call('whenReady'); showChars(); }, applySteps: (base, steps) => { S.P = normalizeLoaded(JSON.parse(JSON.stringify(base))); const outs = []; for (const st of steps) { const [k, a1, a2, a3] = st;
  if (k === 'use') useInventory(a1); else if (k === 'unequip') unequip(a1); else if (k === 'trade') doTrade(a1, a2, a3); else if (k === 'bag') expandBag(a1); else if (k === 'stats') { STAT.draft = { ...a1 }; confirmStats(); } else if (k === 'claim') claimStored(); else if (k === 'discard') removeItem(a1, a2); else if (k === 'afall') { const c = autoFoodCfg(); c.on = !c.on; } else if (k === 'afitem') { const c = autoFoodCfg(); if (c.off[a1]) delete c.off[a1]; else c.off[a1] = true; }
  else if (k === 'repair') repairOne(a1, a2); else if (k === 'repair_all') repairAll(damagedList().reduce((x, i) => x + repairPrice(i), 0)); else if (k === 'kit') kitUse(a1, a2);
  else if (k === 'claimq') { const q = (a1 === 'daily' ? QD.DAILY : QD.WEEKLY).find((x) => x.id === a2); if (q) claimQuest(a1, q); } else if (k === 'xp') addXp(a1); else if (k === 'dismantle') dismantle(a1, a2);
  else if (k === 'merch') { const kst = kstNow(); merchantOverride = { key: a1, start: kst - 10, end: kst + 3600 }; const v = merchantNow(); const g = v.goods[a2]; merchantBuy(a1, g[0], merchantPrice(a1, g[0], g[1]), g[2], a3); }
  questStateSync(); outs.push(JSON.parse(JSON.stringify(S.P))); } return outs; }, shopEntries: () => { _stockKey = ''; return shopEntries(); }, merchantVisits, merchantPrice, derived, spots: (gi) => spotsOf(gi) };
window.__llDemo = (player, acct) => { S.P = player; S.acct = acct; S.mode = initialMode(); $('title').hidden = true; $('app').hidden = false;  render(); };

/* ════════ 단기 탐사 · 전투 — main.gd(_start_exploration_now · _explore_tick · _resolve_exploration · _combat_* · _finish_combat)를 줄 단위로 옮김 ════════
   무작위는 Godot 전역 함수와 같은 수열(GR): randf()=PCG 한 번/UINT32_MAX, randi()=PCG, randi_range=bounded, randf_range=randd, shuffle=next()%(i+1) */
const gRandf = () => Math.fround(GR.next() / 4294967295);
const gRandi = () => GR.next();
const gRandiRange = (a, b) => GR.randiRange(a, b);
function gRandd() { const p = GR.next(); if (p === 0) return 0; const sig = ((BigInt(GR.next()) << 32n) | BigInt(GR.next())) | 0x8000000000000001n; return Number(sig) * Math.pow(2, -64 - Math.clz32(p)); }
const gPick = (arr) => arr[GR.next() % arr.length];
const U21 = D.update21_items, EXI = D.expansion_items, DEEP = D.deep_items, FISH = D.fishing_data;
const tierKey = (t) => String(t);
const FD = { _quest_loot_on: false };
const xpTotal = (lv, xp) => { let t = 0; for (let l = 1; l < Math.max(1, Math.min(100, lv)); l++) t += xpNeed(l); return t + xp; };
/* 결과 창 기준점 */
function beginResult() { const p = S.P; p.result_baseline = { inventory: { ...(p.inventory || {}) }, stored: { ...(p.stored_loot || {}) }, money: Number(p.money), coins: Number(p.coins || 0), total_xp: xpTotal(Number(p.level), Number(p.xp)), journal: (p.journal || []).length }; }
function endResult(title, place) {
  if (FD.autoQuiet) return; const p = S.P, before = p.result_baseline || {}; if (!Object.keys(before).length) return;
  const items = [];
  for (const it of IC.order) { const gained = Math.max(0, count(it) - Number((before.inventory || {})[it] || 0)), stored = Math.max(0, Number((p.stored_loot || {})[it] || 0) - Number((before.stored || {})[it] || 0)); if (gained + stored > 0) items.push({ name: it, qty: gained + stored, stored }); }
  p.last_result = { title, place, items, money: Number(p.money) - Number(before.money), coins: Math.max(0, Number(p.coins || 0) - Number(before.coins ?? p.coins ?? 0)), xp: xpTotal(Number(p.level), Number(p.xp)) - Number(before.total_xp), notes: (p.journal || []).slice(Number(before.journal)), time: clockText() };
  if ((p.notify_settings || {}).explore_notify ?? true) nhAdd('result-' + Math.floor(performance.now() * 1000), title, `${place} · 물품${items.length}종 · 경험치${p.last_result.xp} · 금액${sgn(p.last_result.money)}\n인벤토리/받은 물품함에서 획득품을 확인하세요.`, 'loot');
  p.result_baseline = {};
  FD.showResult = ((p.notify_settings || {}).explore_popup ?? true) || title.includes('사망');
  if (!FD.showResult) toast(`${title} · 물품 ${items.length}종 · 경험치 ${sgn(p.last_result.xp)} · 금액 ${sgn(p.last_result.money)}원`);
}
function story(msg) { msg = josaFix(msg); if (!Array.isArray(S.log)) S.log = []; S.log.push(`[color=#75818e]${String(Number(S.P.day || 1)).padStart(2, '0')}일차[/color]  ${msg}`); storyCapture(); while (S.log.length > 120) S.log.shift(); }
function storyCapture() { const p = S.P; p.story = Math.max(0, Math.min(32, Number(p.story || 0))); for (const k of ['flags', 'story_choices', 'story_cursor']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {}; if (!Array.isArray(p.scenes_seen)) p.scenes_seen = []; p.story_version = 16;
  if (typeof STORY !== 'undefined' && STORY.ev) p.story_cursor = { kind: STORY.kind, event: clone(STORY.ev), chapter: Number(p.story) };
  if (!Array.isArray(p.story_archive)) p.story_archive = []; for (const l of (S.log || [])) if (!p.story_archive.includes(l)) p.story_archive.push(String(l)); while (p.story_archive.length > 240) p.story_archive.shift(); }
/* 생존 보호(survival_guard) */
const guardActive = () => Number((S.P.positive || {}).newbie?.until || 0) > nowSec();
function guardXpPenalty(source = '') { const amount = Math.max(1, Math.ceil(xpNeed(Number(S.P.level)) * 0.05)), lost = Math.min(amount, Math.max(0, Number(S.P.xp))); S.P.xp = Number(S.P.xp) - lost; const why = source ? source + ' · ' : '';
  if (lost > 0) { gLog(`[color=#e3b341]보호 중 피해[/color]  ${why}체력 5 이하에서 피해를 받아 경험치 -${lost} (레벨은 유지)`); toast(`체력 5 이하에서 피해 · 경험치 -${lost}`); } else gLog(`[color=#e3b341]보호 중 피해[/color]  ${why}깎일 경험치가 없어 체력 5을(를) 유지했습니다.`); return lost; }
function guardAfterDamage(before, source = '') { if (!guardActive() || S.P.dead) return false; const floor = Math.max(1, Math.min(5, before)); if (Number(S.P.hp) >= floor) return false; S.P.hp = floor; if (before <= 5) guardXpPenalty(source); else toast('신규 생존자 보호 · 체력 5에서 버텼습니다. 이 상태로 피해를 받으면 경험치가 줄어듭니다.'); return true; }
function guardPreventDeath(source) { if (!guardActive() || Number(S.P.hp) > 0) return false; S.P.hp = 5; guardXpPenalty(source); return true; }
const guardHpFloor = () => (guardActive() ? 5 : 1);
const REVIVE_ITEMS = [['소생 주사', 0.3], ['제세동기', 0.5]];
function tryReviveItem() { for (const [it, r] of REVIVE_ITEMS) if (count(it) > 0) { removeItem(it, 1); S.P.hp = Math.max(1, Math.trunc(Number(S.P.max_hp) * r)); S.P.morale = Math.max(Number(S.P.morale), 15); gLog(`[color=#e3b341]${it} 작동![/color]  꺼져 가던 숨이 돌아왔다. 체력 ${S.P.hp}(으)로 되살아났다.`); toastJ(`${it}(으)로 되살아났습니다.`); return true; } return false; }
function setPostCombatWait() { S.P.field_ready_at = nowSec() + 30; S.P.field_rest_kind = '전투'; S.P.field_rest_total = 30; gLog('전투를 마쳤다. 30초 동안 숨을 고른 뒤 다음 탐사를 시작할 수 있다.'); }
function setPostExploreWait() { const sec = gRandiRange(5, 10); S.P.field_ready_at = nowSec() + sec; S.P.field_rest_kind = '탐사'; S.P.field_rest_total = sec; }
function lightOnDeath() { const d = S.P.light && typeof S.P.light === 'object' ? S.P.light : (S.P.light = {}); const t = Math.floor(kstNow() / 86400); d.pre = Number(d.cur || 0); d.cur = 0; d.from = -1; d.last = -1; if (!Array.isArray(d.deaths)) d.deaths = []; d.deaths.push(t); while (d.deaths.length > 20) d.deaths.shift(); }
function checkDeath(cause) {
  const p = S.P; if (Number(p.hp) > 0) return false; if (guardPreventDeath(cause)) return false; if (tryReviveItem()) return false;
  p.hp = 0; if (!p.dead) lightOnDeath(); p.dead = true; p.dead_at = nowSec(); p.pending_explore = {}; p.long_expedition = {}; p.travel = {}; setPostCombatWait(); p.death_cause = cause; p.buffs = {}; p.battle = {};
  gLog(`[color=#f2706a]사망[/color]  ${cause}. ${Number(p.day || 1)}일차, 레벨 ${p.level}.`); return true;
}
/* 부정 상태 */
function conditionText(id) {
  const def = ED.CONDITIONS[id]; let text = String(def.desc || ''); const st = (S.P.conditions || {})[id] || {};
  text = text.replace(/ · \d+분 지속| · \d+분(?=\.|$| ·)|\d+분 지속/g, '');
  if (st.interval != null && Number(def.interval) > 0 && Number(st.interval) !== Number(def.interval)) { const oldT = intervalText(Number(def.interval)) + '마다'; text = text.replace(oldT, intervalText(Number(st.interval)) + '마다'); const m = text.match(/\d+초마다|\d+분마다/); if (m && m[0] !== intervalText(Number(st.interval)) + '마다') text = text.replace(m[0], intervalText(Number(st.interval)) + '마다'); }
  const sc = Number(st.scale ?? 15); for (const m3 of [...text.matchAll(/(\d+)초 단축/g)]) text = text.replace(m3[0], `약 ${durationText(Math.round(Number(m3[1]) * sc))} 단축`);
  if (id === 'final_mutation') { const tries = Math.max(0, Math.min(2, Number(S.P.final_tries || 0))); text += ` · 남은 치료 시도 ${3 - tries}번 · 다음 성공 확률 ${Math.round([0.6, 0.75, 0.95][tries] * 100)}%`; }
  return text.replace('. .', '.').trim();
}
function inflictCondition(id, duration = 0) {
  if (!ED.CONDITIONS[id] || S.P.dead) return; const def = ED.CONDITIONS[id]; if (!S.P.conditions || typeof S.P.conditions !== 'object') S.P.conditions = {}; const states = S.P.conditions, old = states[id] || {}, now = nowSec();
  const seconds = duration > 0 ? duration : gRandiRange(1800, 3600), scale = Math.max(1, seconds / Math.max(1, Number(def.duration)));
  const row = { until: now + seconds, tick: Number(old.tick ?? now), scale }; if (Number(def.interval) > 0) row.interval = niceInterval(Math.max(Number(def.interval), Math.round(Number(def.interval) * scale)));
  states[id] = row; if (id === 'final_mutation') S.P.final_tries = 0;
  gLog(`[color=#${def.color}]${def.name} 상태[/color]  ${conditionText(id)} · ${durationText(seconds)} 지속`);
}
const activeConds = () => Object.keys(ED.CONDITIONS).filter((id) => (S.P.conditions || {})[id] && Number(S.P.conditions[id].until || 0) > nowSec());
const activePos = () => Object.keys(S.P.positive || {}).filter((id) => BD.POSITIVES[id] && Number(S.P.positive[id].until || 0) > nowSec());
function conditionResistance() { let prot = 0; for (const id of activePos()) prot += Number(S.P.positive[id].resist || 0); return Math.min(0.65, Number(S.P.stats?.['생존력'] || 0) * 0.02 + armorDef(S.P.equipment || {}) * 0.01 + (prot + Number(gearMods(workingEq(S.P.equipment || {})).resist || 0)) / 100); }
function pickWeighted(pool, roll) { let total = 0; for (const k in pool) total += Number(pool[k]); let edge = 0; for (const k in pool) { edge += Number(pool[k]) / total; if (roll < edge) return k; } return Object.keys(pool).pop(); }
const statesOnSearch = () => { lightMark(); if (gRandf() < 0.10) { grantState(gPick(BD.V28_SEARCH_POOL), 300, '조용한 수색'); } };
const statesOnVictory = () => { lightMark(); if (gRandf() < 0.12) { grantState(gPick(BD.V28_VICTORY_POOL), 180, '전투 승리의 기세'); } };
function statesOnFieldHurt(night) { const pool = { ...ED.V28_FIELD_POOL }; if (night) pool.hypothermia = 4; if (gRandf() >= 0.07 * (1 - conditionResistance())) return; const id = pickWeighted(pool, gRandf()); if (!activeConds().includes(id)) inflictCondition(id); }
function statesOnHit(defending, damage) { const ch = 2.8 / 100 * (defending ? 0.45 : 1) * (damage > Number(S.P.max_hp) * 0.2 ? 1.3 : 1); if (gRandf() >= ch * (1 - conditionResistance())) return; const id = pickWeighted(ED.V28_HIT_POOL, gRandf()); if (!activeConds().includes(id)) inflictCondition(id); }
/* 획득 */
function markFoundGear(it, q) { if (q <= 0 || !GEAR.ITEMS[it]) return; if (!S.P.found_gear || typeof S.P.found_gear !== 'object') S.P.found_gear = {}; S.P.found_gear[it] = Number(S.P.found_gear[it] || 0) + q; }
function awardItem(it, q, fromField = true) {
  if (fromField) markFoundGear(it, q);
  if (FD._quest_loot_on && q > 0) { questEvent('loot_items', q); if (tabOf(it) === '재료') questEvent('loot_mat', q); }
  if (addItem(it, q)) return true; if (!S.P.stored_loot || typeof S.P.stored_loot !== 'object') S.P.stored_loot = {}; S.P.stored_loot[it] = Number(S.P.stored_loot[it] || 0) + q; gLog(`가방 부족 · ${it} × ${q}개를 받은 물품함에 맡겼다.`); return true;
}
function lootPick(kind, tier) {
  const pool = [];
  for (const e of (GD.LOOT[kind] || GD.LOOT.urban)) { const t = Number(e[1]); if (t > tier) continue; const w = t === tier ? 4 : t === tier - 1 ? 2 : 1; for (let i = 0; i < w; i++) pool.push(String(e[0])); }
  for (const name in U21.CONSUMABLES) { if (String(U21.CONSUMABLES[name].cat) !== '재료') continue; if ((['food', 'nature'].includes(kind) && ['감자', '콩', '채소'].includes(name)) || (kind === 'med' && ['무균 거즈', '비타민 원료', '항체 배양액'].includes(name))) pool.push(name); }
  if (!pool.length) return '천'; return pool[gRandi() % pool.length];
}
function tryRare(tier) { const pool = GD.RARE[tierKey(Math.max(1, Math.min(5, tier)))] || []; if (!pool.length) return; if (gRandf() * 100 < derived().rare) { const it = pool[gRandi() % pool.length]; if (awardItem(it, 1)) gLog(`[color=#e3b341]희귀 획득![/color] ${it}을(를) 손에 넣었다. 가방에서 장착할 수 있다.`); } }
const itemLevelOfTier = (t) => (t <= 2 ? 1 : t <= 4 ? 2 : 3);
function tryHighDrop(tier) {
  const lvl = itemLevelOfTier(tier), chance = 2.5 + derived().rare * 0.1; if (lvl >= 3 || gRandf() * 100 >= chance) return;
  let pool = []; for (const k in GD.ITEMS) { const it = GD.ITEMS[k]; if (['회복', '음식', '유틸'].includes(String(it.cat || '')) && Number(it.tier || 0) === lvl + 1) pool.push(k); }
  const gear = GD.RARE[tierKey(Math.max(1, Math.min(5, tier + 2)))] || []; if (gRandf() < 0.3 && gear.length) pool = gear; if (!pool.length) return;
  const it = pool[gRandi() % pool.length]; if (awardItem(it, 1)) { gLog(`[color=#c297ff]아주 드문 발견![/color]  이런 곳에선 보기 힘든 [b]${it}[/b]을(를) 찾았다.`); toastJ('아주 드문 발견: ' + it); }
}
function survivalSupply(tier, areaLevel) {
  const p = S.P; if (p.dead) return; const gap = Math.max(0, Math.min(15, areaLevel - Number(p.level))); let chance = 10 + Math.max(1, Math.min(5, tier)) * 4 + gap * 1.5;
  const hr = Number(p.hp) / Math.max(1, Number(p.max_hp)); let need = ''; if (hr < 0.5) need = 'heal'; else if (Number(p.water ?? 100) < 35) need = 'water'; else if (Number(p.hunger ?? 100) < 35) need = 'food'; if (need) chance += 20;
  if (gRandf() * 100 >= Math.min(chance, 65)) return; if (!need) need = ['food', 'water', 'heal'][gRandi() % 3];
  const pools = { food: ['통조림', '통조림', '전투 식량', '영양 수프'], water: ['물', '물', '보온 허브 음료'], heal: ['붕대', '소독약', '응급키트', '수액 팩', '비상 구급상자'] }[need];
  const idx = Math.max(0, Math.min(pools.length - 1, Math.trunc(gRandf() * Math.min(pools.length, 1 + tier)))), it = pools[idx]; if (!GD.ITEMS[it] && !U21.CONSUMABLES[it]) return;
  if (awardItem(it, 1)) gLog(`[color=#3fd0a4]생존 보급[/color]  ${it} × 1 · 주변을 살피다 쓸 만한 것을 챙겼다.`);
}
function tryMoveDrop(longTrip = false) { if (gRandf() < (longTrip ? BD.LONG_MOVE_DROP_CHANCE : BD.MOVE_DROP_CHANCE)) { const r = gRandiRange(0, 99); let cur = 0, it = BD.MOVE_POOL[BD.MOVE_POOL.length - 1]; for (let i = 0; i < BD.MOVE_POOL.length; i++) { cur += Number(BD.MOVE_WEIGHTS[i]); if (r < cur) { it = BD.MOVE_POOL[i]; break; } } awardItem(it, 1); gLog(`극희귀 이동 보상 · [${cat(it).grade}] ${it}`); } }
/* 추가 보급(update21_loot · expansion_loot · coin_data · pet_system) */
const U21_LEVELS = { F: 1, E: 4, D: 8, C: 20, B: 30, A: 40, S: 50 }, U21_W = { F: 172, E: 126, D: 88, C: 62, B: 36, A: 17, S: 5 }, _u21pools = {};
function u21Pool(level, kind, rare = false) { let band = 1; for (const v of Object.values(U21_LEVELS)) if (v <= level) band = Math.max(band, v); const key = `${band}/${kind}/${rare}`; if (_u21pools[key]) return _u21pools[key]; const out = [];
  for (const name in U21.ITEMS) { const it = U21.ITEMS[name]; if (String(it.cat) === '재료') continue; if (rare && !['C', 'B', 'A', 'S'].includes(String(it.grade))) continue; if (!rare && Number(it.found_level) > level) continue; if (!rare && level >= 20 && Number(it.found_level) < 20) continue; let w = U21_W[String(it.grade)]; if (kind === 'food' && String(it.cat) === '음식') w *= 2; else if (kind === 'med' && String(it.cat) === '회복') w *= 2; else if (kind === 'tech' && it.slot != null) w *= 2; out.push([name, w]); }
  return (_u21pools[key] = out); }
function u21PickR(level, kind, rng, rare = false) { const es = u21Pool(level, kind, rare); let total = 0; for (const e of es) total += e[1]; if (total <= 0) return ''; let n = rng.randiRange(1, total); for (const e of es) { n -= e[1]; if (n <= 0) return e[0]; } return ''; }
function u21Roll(level, kind, rng, longTrip = false) { const out = {};
  if (rng.randf() < (longTrip ? 0.7 : 0.25)) { const n = u21PickR(level, kind, rng); if (n) out[n] = 1; }
  if (level < 20 && rng.randf() < (longTrip ? 0.01 : 0.004)) { const n = u21PickR(level, kind, rng, true); if (n) out[n] = (out[n] || 0) + 1; } return out; }
function u21AwardShort(level, kind) { if (S.P.dead) return; const out = u21Roll(level, kind, new GRng(gRandi()));
  for (const n in out) { awardItem(n, out[n]); gLog(`추가 보급품 · ${itemDisplay(n)} × ${out[n]}`); } }
const exBand = (lv) => (lv < 20 ? 0 : lv < 30 ? 20 : lv < 40 ? 30 : lv < 50 ? 40 : 50);
function exPickGrade(level, roll, rareCh = false) { const w = rareCh || exBand(level) === 0 ? EXI.LOW_WEIGHTS : EXI.NORMAL_WEIGHTS[String(exBand(level))]; let cur = 0; for (const g of EXI.GRADES) { cur += Number(w[g] || 0); if (Math.max(0, Math.min(99.999999, roll)) < cur) return g; } return 'C'; }
const exPool = (g) => Object.keys(EXI.ITEMS).filter((n) => String(EXI.ITEMS[n].grade) === g);
function deepPick(level, rng) { const band = Math.max(50, Math.min(100, Math.trunc((level + 5) / 10) * 10)), pool = []; let total = 0;
  for (const name in DEEP.ITEMS) { const it = DEEP.ITEMS[name], b = Math.max(50, Math.min(100, Math.trunc(Number(it.level ?? 50) / 10) * 10)); if (b > band) continue; let w = b === band ? 4 : b === band - 10 ? 2 : 1; if (String(it.cat || '') === '재료') w *= 2; pool.push([name, w]); total += w; }
  if (total <= 0) return ''; let n = rng.randiRange(1, total); for (const e of pool) { n -= e[1]; if (n <= 0) return e[0]; } return ''; }
function fishRoll(level, rng, longTrip = false) { const out = [];
  if (level > 30) { if (rng.randf() >= (longTrip ? 0.03 : 0.008)) return out; const top = [['황금 미끼', 6], ['전설의 미끼', 2], ['황금 릴 낚싯대', 2], ['전설의 낚싯대', 1]]; let tt = 0; for (const e of top) tt += e[1]; let r = rng.randiRange(1, tt); for (const e of top) { r -= e[1]; if (r <= 0) { for (let i = 0; i < (FISH.BAITS[e[0]] ? 3 : 1); i++) out.push(e[0]); break; } } return out; }
  if (level < 1) return out; if (rng.randf() >= (longTrip ? 0.10 : 0.05)) return out;
  const pool = [['대나무 낚싯대', 6], ['접이식 낚싯대', 4], ['카본 낚싯대', 3], ['원투 낚싯대', 2], ['심해 릴 낚싯대', 2], ['떡밥', 8], ['새우 미끼', 6], ['루어', 3], ['형광 웜', 2]]; let total = 0; for (const e of pool) total += e[1];
  let n = rng.randiRange(1, Math.max(1, total)); for (const e of pool) { n -= e[1]; if (n <= 0) { for (let i = 0; i < (FISH.BAITS[e[0]] ? 3 : 1); i++) out.push(e[0]); break; } } return out; }
function exRoll(level, rng, longTrip = false) { const out = [], zone = exBand(level);
  if (rng.randf() < (longTrip ? EXI.LOW_LONG_CHANCE : EXI.LOW_SHORT_CHANCE)) { const ns = exPool(exPickGrade(level, rng.randf() * 100, true)); out.push(ns[rng.randiRange(0, ns.length - 1)]); }
  if (zone > 0 && rng.randf() < Number((longTrip ? EXI.NORMAL_LONG_CHANCES : EXI.NORMAL_SHORT_CHANCES)[String(zone)])) { const ns = exPool(exPickGrade(level, rng.randf() * 100)); out.push(ns[rng.randiRange(0, ns.length - 1)]); }
  if (level >= 50) { const ch = (longTrip ? 0.12 : 0.03) + 0.0008 * (Math.min(level, 100) - 50); if (rng.randf() < ch) { const n = deepPick(level, rng); if (n) out.push(n); } }
  out.push(...fishRoll(level, rng, longTrip)); return out; }
function exAwardShort(level) { if (S.P.dead) return; for (const n of exRoll(level, new GRng(gRandi()))) { awardItem(n, 1); gLog(`신규 보급품 발견 · [${cat(n).grade}] ${n} × 1`); } }
function coinsAwardShort(report) { const p = S.P; p.coins = Math.max(0, Number(p.coins || 0)); if (!Array.isArray(p.casino_history)) p.casino_history = []; if (report._coin_awarded) return; report._coin_awarded = true; if (p.dead) return;
  const chance = gRandf(), amount = gRandf(); if (Number(p.level || 1) < 5 || Math.max(0, Math.min(1, chance)) >= 0.35) return; const gained = 1 + Math.max(0, Math.min(4, Math.floor(Math.max(0, Math.min(0.999999999, amount)) * 5))); p.coins = Number(p.coins) + gained; gLog(`탐사에서 코인 ${gained}개를 발견했다.`); }
function petHelpOnce(kind, tier, items = null) { const ok = (S.P.pets || []).filter((pt) => pt && typeof pt === 'object' && Number(pt.affinity || 0) >= 60 && Math.min(Number(pt.health || 0), Number(pt.hunger || 0), Number(pt.water || 0)) >= 20); if (!ok.length) return ''; const pet = gPick(ok);
  const what = gPick(['item', 'item', 'heal', 'morale', 'warn']); let line = String(D.pet_system.HELP_LINES[what]).replace('{name}', String(pet.name));
  if (what === 'item') { const it = lootPick(kind, Math.max(1, tier)); if (items) items[it] = Number(items[it] || 0) + 1; else awardItem(it, 1); line = line.replace('{item}', it); }
  else if (what === 'heal') { const n = Math.max(5, Math.trunc(Number(S.P.max_hp) * 0.08)); S.P.hp = Math.min(Number(S.P.max_hp), Number(S.P.hp) + n); line = line.replace('{n}', String(n)); }
  else if (what === 'morale') { S.P.morale = Math.min(100, Number(S.P.morale) + 5); line = line.replace('{n}', '5'); }
  else { const n = 5 + 3 * Math.max(1, tier); addXp(n); line = line.replace('{n}', String(n)); }
  pet.affinity = Math.min(100, Number(pet.affinity) + 1); gLog('[color=#f0c674]반려동물 도움[/color]  ' + line); return line; }
function petShortHelp(kind, tier) { if (gRandf() < 0.12) { const l = petHelpOnce(kind, tier); if (l) toast('반려동물 도움 · ' + l); } }
function petLongHelp(trip, hours) { const items = trip.items && typeof trip.items === 'object' ? trip.items : {}, lines = []; for (let h = 0; h < Math.floor(hours); h++) if (gRandf() < 0.20) { const l = petHelpOnce(String(trip.kind || 'urban'), Math.max(1, Math.min(5, Number(trip.tier ?? 3))), items); if (l) lines.push(l); } trip.items = items; if (lines.length) trip.pet_help = lines; }
/* 함께 밝히는 도시(city_light.on_explore · check_realms) */
let _locLv = null;
function spotWeight(id) { if (!_locLv) { _locLv = {}; for (const l of locations()) _locLv[locId(l)] = l.level; } const lv = Number(_locLv[id] || 1); return lv >= 60 ? 3 : lv >= 30 ? 2 : 1; }
function cityData() { const p = S.P; if (!p.city || typeof p.city !== 'object') p.city = {}; const c = p.city; if (!('season' in c)) c.season = 0; for (const k of ['spots', 'claimed', 'seen']) if (!c[k] || typeof c[k] !== 'object') c[k] = {}; if (!('boss' in c)) c.boss = 0; if (!c.realm_claimed || typeof c.realm_claimed !== 'object') c.realm_claimed = {}; return c; }
const regionLit = (gi) => gi >= 0 && gi < GD.REGIONS.length && doneIn(gi, visitedSet()) >= GD.REGIONS[gi].spots.length;
function cityOnExplore(locId, gi, litBefore) {
  const c = cityData(); if (S.city?.ok && Number(c.season) !== Number(S.city.season)) { c.season = Number(S.city.season); c.spots = {}; c.boss = 0; } /* city_light.pull: 시즌이 바뀌었으면 내 기여를 새로 셉니다 */ if (!(locId in c.spots)) { c.spots[locId] = 1; questEvent('city_points', spotWeight(locId)); }
  if (!litBefore && regionLit(gi)) { questEvent('region_lit'); const f = facility(gi), name = GD.REGIONS[gi].name; gLog(`[color=#f2bb55]불빛[/color]  ${name}의 구역 ${GD.REGIONS[gi].spots.length}곳에 모두 불이 켜졌다. 거점에 '${f.name}'이(가) 가동된다 · ${f.desc}`); notify(`city-lit-${gi}`, `${name} · 모든 구역에 불빛`, `거점에 '${f.name}'이(가) 가동됩니다 · ${f.desc} (이 지역에 머무는 동안)`, 'growth'); toastJ(`${name}에 불빛이 켜졌습니다 · ${f.name} 가동`); checkRealms(); }
  FD.cityReport = true;
}
/* city_light.report — 저장한 뒤 서버에 내 기여 점수를 보탭니다(120초 간격 · 시즌 대기 중 제외) */
function cityReport(force = false) {
  const sc = S.city; if ((!force && !FD.cityReport) || !sc?.ok || !LIVE.on) return; const season = Number(sc.season || 0);
  if (season <= 0 || cityWaiting()) return; const n = cityPoints();
  if (n <= Number(sc.mine || 0)) { FD.cityReport = false; return; } if (!force && nowSec() - Number(FD.reportAt || 0) < 120) return; FD.cityReport = false; FD.reportAt = nowSec();
  call('cityReport', season, n).then((r) => { if (!r || !r.ok || Number(S.city?.season) !== season) return; const before = Number(S.city.mine || 0), now = Number(r.n ?? before); S.city.mine = now; S.city.total = Number(S.city.total || 0) + Math.max(0, now - before);
    /* 한 번에 80점까지만 올라가므로 남은 몫은 1분 뒤에 이어서 보낸다 */ if (now > before && cityPoints() > now) setTimeout(() => cityReport(true), 65000); });
}
function checkRealms() { const vs = visitedSet(); for (let realm = 0; realm < CL.REALM_REWARDS.length; realm++) { const c = cityData(); if (c.realm_claimed[String(realm)]) continue; let n = 0, lit = 0; GD.REGIONS.forEach((r, gi) => { if (Number(r.realm) !== realm) return; n++; if (doneIn(gi, vs) >= r.spots.length) lit++; }); if (n <= 0 || lit < n) continue;
  c.realm_claimed[String(realm)] = true; const rw = CL.REALM_REWARDS[realm], name = WD.REALMS[realm].name; nhAdd(`realm-lit-${realm}`, `${name} · 모든 지역에 불빛`, `${name}의 모든 지역을 밝혔습니다. 코인 ${rw.coins}와 ${rw.item} 1개를 받았습니다.`, 'growth');
  const parts = []; S.P.coins = Number(S.P.coins || 0) + Number(rw.coins); parts.push(`코인 ${rw.coins}`); markFoundGear(rw.item, 1); if (!addItem(rw.item, 1)) { S.P.stored_loot[rw.item] = Number(S.P.stored_loot[rw.item] || 0) + 1; } parts.push(`${rw.item} 1`); gLog(`[color=#e3b341]${name} 모든 지역에 불빛 · 대지역 보상[/color] · ${parts.join(', ')}`); } }
function questUnique(kind, key) { const keys = questKeys(); for (const sc of ['daily', 'weekly']) { const q = S.P.quests?.[sc]; if (!q || String(q.key || '') !== keys[sc]) continue; if (!q.seen || typeof q.seen !== 'object') q.seen = {}; if (!q.seen[kind] || typeof q.seen[kind] !== 'object') q.seen[kind] = {}; if (key in q.seen[kind]) continue; q.seen[kind][key] = true; if (!q.progress) q.progress = {}; q.progress[kind] = Number(q.progress[kind] || 0) + 1; } }
/* 생존 소모(_survival_tick) · 자동 먹기 */
function autoFoodItems(key) { const out = Object.keys(S.P.inventory || {}).filter((n) => count(n) > 0 && (() => { const it = GD.ITEMS[n] || {}; if (!Object.keys(it).length || Number(it[key] || 0) <= 0) return false; if (it.panacea || it.vaccine || it.stat_boost || it.pet_only || it.revive) return false; if (Number(it.hp || 0) < 0 || it.dmg != null || it.stun != null) return false; return true; })());
  return godotSortLess(out, (a, b) => { const ra = cat(a).rank, rb = cat(b).rank; if (ra !== rb) return ra < rb; return Number(GD.ITEMS[a][key] || 0) < Number(GD.ITEMS[b][key] || 0); }); }
function autoEat() { const p = S.P; if (p.dead) return; const cfg = autoFoodCfg(); if (!cfg.on) return;
  for (const [key, nm] of [['hunger', '허기'], ['water', '수분']]) { let guard = 0;
    while (Number(p[key]) < Number(M.AUTO_FOOD_AT ?? 10) && guard < 3) { guard++; let pick = ''; for (const it of autoFoodItems(key)) if (!cfg.off[it]) { pick = it; break; }
      if (!pick) { if (!p['auto_food_warned_' + key]) { p['auto_food_warned_' + key] = true; toastJ(`${nm}이(가) 10 아래인데 자동으로 먹을 물품이 없습니다. 음식·물을 준비하세요.`); } break; }
      p['auto_food_warned_' + key] = false; const before = Number(p[key]); removeItem(pick, 1); const it = GD.ITEMS[pick];
      for (const k of ['hunger', 'water', 'morale']) if (it[k] != null) p[k] = Math.max(0, Math.min(100, Number(p[k]) + Number(it[k])));
      if (Number(it.hp || 0) > 0) p.hp = Math.min(Number(p.max_hp), Number(p.hp) + Math.trunc(Number(it.hp) * derived().recover / 100));
      { const st = p.conditions || {}, now = nowSec(); for (const id of (ED.TREATMENTS[pick] || [])) delete st[id]; for (const id in (ED.REDUCERS[pick] || {})) if (st[id]) { st[id].until = Math.max(now, Number(st[id].until) - Math.round(Number(ED.REDUCERS[pick][id]) * Number(st[id].scale ?? 1))); if (Number(st[id].until) <= now) delete st[id]; } p.conditions = st; }
      grantPositive(pick); lightMark(); if (it.hunger != null && Number(it.hunger) > 0 && Number(p.hunger) >= 90) grantState('well_fed', 600, '든든한 식사'); if (it.water != null && Number(it.water) > 0 && Number(p.water) >= 90) grantState('hydrated', 600, '충분한 수분');
      gLog(`[color=#3fd0a4]자동 섭취[/color]  ${nm}이(가) ${before}까지 떨어져 ${cfAction(pick, it)} ${nm} ${before} → ${p[key]}`); toastJ(`자동 섭취 · ${pick} × 1 (${nm} ${before} → ${p[key]})`); } } }
function survivalTick(hc, wc) { const p = S.P, red = Math.min(2, Math.trunc(Number(p.stats?.['생존력'] || 0) / 25)); p.hunger = Math.max(0, Number(p.hunger) - Math.max(1, hc - red)); p.water = Math.max(0, Number(p.water) - Math.max(1, wc - red)); autoEat();
  let dmg = 0; const starving = Number(p.hunger) <= 0, thirsty = Number(p.water) <= 0; if (starving) dmg += 6; if (thirsty) dmg += 6; if (!dmg) return false;
  const before = Number(p.hp); p.hp = before - dmg; guardAfterDamage(before, '굶주림·탈수'); p.morale = Math.max(0, Number(p.morale) - 2); const why = starving && thirsty ? '굶주림과 탈수' : starving ? '굶주림' : '탈수';
  gLog(`[color=#f2706a]${why}[/color]  기운이 빠져 체력 -${dmg}. 음식과 물을 먹어야 한다.`); return checkDeath(`길 위에서 ${why}(으)로 쓰러졌다`); }
/* Godot sort_custom(16개 이하는 삽입 정렬, 그보다 길면 introsort) — 여기서는 안정 정렬로 충분한 곳만 씁니다 */
function godotSort(a, less) {
  const n = a.length; if (n < 2) return a; const TH = 16;
  const lin = (first, last) => { const val = a[last]; if (less(val, a[first])) { for (let i = last; i > first; i--) a[i] = a[i - 1]; a[first] = val; } else { let l = last, nx = last - 1; while (less(val, a[nx])) { a[l] = a[nx]; l = nx; nx--; } a[l] = val; } };
  const ins = (first, last) => { if (first === last) return; for (let i = first + 1; i !== last; i++) lin(first, i); };
  const unguarded = (first, last) => { for (let i = first; i !== last; i++) { const val = a[i]; let l = i, nx = i - 1; while (less(val, a[nx])) { a[l] = a[nx]; l = nx; nx--; } a[l] = val; } };
  const med3 = (x, y, z) => (less(x, y) ? (less(y, z) ? y : less(x, z) ? z : x) : less(x, z) ? x : less(y, z) ? z : y);
  const part = (first, last, pivot) => { for (;;) { while (less(a[first], pivot)) first++; last--; while (less(pivot, a[last])) last--; if (!(first < last)) return first; const t = a[first]; a[first] = a[last]; a[last] = t; first++; } };
  const heapsort = (first, last) => { const arr = a.slice(first, last).sort((x, y) => (less(x, y) ? -1 : less(y, x) ? 1 : 0)); for (let i = 0; i < arr.length; i++) a[first + i] = arr[i]; };
  const intro = (first, last, depth) => { while (last - first > TH) { if (depth === 0) { heapsort(first, last); return; } depth--; const cut = part(first, last, med3(a[first], a[first + ((last - first) >> 1)], a[last - 1])); intro(cut, last, depth); last = cut; } };
  const bitlog = (n0) => { let k = 0; for (; n0 !== 1; n0 >>= 1) k++; return k; };
  intro(0, n, bitlog(n) * 2); if (n > TH) { ins(0, TH); unguarded(TH, n); } else ins(0, n); return a; }
function godotSortLess(arr, less) { return godotSort(arr.slice(), less); }
function godotSortLessOld(arr, less) { const a = arr.slice(); for (let i = 1; i < a.length; i++) { const v = a[i]; if (less(v, a[0])) { for (let k = i; k > 0; k--) a[k] = a[k - 1]; a[0] = v; } else { let j = i; while (less(v, a[j - 1])) { a[j] = a[j - 1]; j--; } a[j] = v; } } return a; }

/* ── 탐사 시작 · 진행 · 결과 ── */
const locById = (id, gi) => locations().find((l) => GD.REGIONS[l.gu_index].name + ' ' + l.spot === id && l.gu_index === gi);
const locId = (l) => GD.REGIONS[l.gu_index].name + ' ' + l.spot;
function startExplorationNow(loc) {
  const p = S.P; calendarSyncMut();
  if (p.dead || nonEmpty(p.battle)) return false;
  if (nonEmpty(p.long_expedition) || nonEmpty(p.travel) || (p.auto_explore && p.auto_explore.started)) { toast('현재 탐사 또는 지역 이동을 먼저 마쳐 주세요.'); return false; }
  if (fieldWaitLeft() > 0) { toast(`${String(p.field_rest_kind || '전투') === '탐사' ? '탐사 후' : '전투 후'} ${fieldWaitLeft()}초 더 쉬어야 합니다.`); return false; }
  if (nonEmpty(p.pending_explore)) { toast('이미 탐사 중입니다.'); return false; }
  if (incapacitated()) { toast('사기를 회복한 뒤 탐사하세요.'); return false; }
  if (!canEnterField(loc)) { toast('권장 레벨보다 최대 3 낮은 구역까지만 진입할 수 있습니다.'); return false; }
  if (Number(p.field_count || 0) >= M.FIELD_DAILY_LIMIT) { toast('오늘 탐사는 40회를 모두 사용했습니다. 오전 6시에 다시 열립니다.'); return false; }
  if (loc.gu_index !== hereRegion()) { toast('이전 지역의 탐사 선택은 취소했습니다. 현재 지역을 다시 선택하세요.'); return false; }
  beginResult();
  const roll = gRandf() * 100, thr = encounterThreshold(loc.level, Number(p.level), isNight()), wait = gRandiRange(10, 20), now = nowSec();
  p.field_count = Number(p.field_count || 0) + 1;
  p.pending_explore = { id: locId(loc), gu_index: hereRegion(), started: now, ready: now + wait, duration: wait, night: isNight(), roll };
  p.at_hub = false;
  if (roll >= thr) { p.pending_explore = {}; resolveExploration({ ...loc, id: locId(loc), tier: Number(GD.REGIONS[loc.gu_index].tier), night: isNight(), roll }); return true; }
  return true;
}
/* main._calendar_sync 중 06시 횟수 초기화(탐사 횟수에 쓰는 부분) */
function calendarSyncMut() { const p = S.P, today = Math.floor(kstNow() / 86400); if (Number(p.calendar_origin || 0) <= 0) p.calendar_origin = today - Math.max(0, Number(p.day ?? 1) - 1); p.day = Math.max(1, today - Number(p.calendar_origin) + 1); const fd = Math.floor((kstNow() - 6 * 3600) / 86400); if (Number(p.field_date ?? -1) !== fd) { p.field_date = fd; p.field_count = 0; } }
function exploreTickDue() {
  const p = S.P, pe = p.pending_explore; if (!nonEmpty(pe)) return false; if (p.dead) { p.pending_explore = {}; return true; } if (nowSec() < Number(pe.ready)) return false;
  let sel = null; const l = locById(String(pe.id), Number(pe.gu_index ?? p.region)); if (l && l.gu_index === hereRegion()) sel = { ...l, id: String(pe.id), tier: Number(GD.REGIONS[l.gu_index].tier) };
  p.pending_explore = {};
  if (!sel) { toast('탐사 위치가 달라 결과를 실행하지 않았습니다. 현재 지역을 다시 선택하세요.'); return true; }
  sel.night = !!pe.night; sel.roll = Math.min(Number(pe.roll || 0), encounterThreshold(sel.level, Number(p.level), sel.night) - 0.01);
  resolveExploration(sel); return true;
}
function resolveExploration(loc) {
  const p = S.P; if (p.dead) return; if (loc.gu_index !== hereRegion()) { toast('현재 지역과 다른 탐사 결과를 실행하지 않았습니다.'); return; } if (incapacitated()) { toast('행동불능 상태입니다. 먼저 사기를 회복하세요.'); return; }
  const tier = Number(loc.tier || 1), id = String(loc.id), lv = Number(loc.level || 1), night = !!loc.night, kind = String(loc.kind || 'urban');
  p.scouted = Number(p.scouted || 0) + 1; questEvent('explore'); questEvent(night ? 'explore_night' : 'explore_day');
  if (['med', 'food', 'nature', 'tech'].includes(kind)) { questEvent('explore_' + kind); questUnique('explore_kinds', kind); }
  FD._quest_loot_on = !FD.autoQuiet;
  try {
    gLog(`[color=#6cb6ff]탐사 시작[/color] · ${id}`);
    const cost = resourceCost(lv, night);
    if (survivalTick(cost[0], cost[1])) { endResult('탐사 중 사망', id); return; }
    p.morale = Math.max(0, Number(p.morale) - Math.max(0, 1 - Number(gearMods(workingEq(p.equipment || {})).morale_guard || 0)));
    const litBefore = regionLit(hereRegion());
    if (!p.visited.includes(id)) { p.visited.push(id); questEvent('new_spot'); const bonus = 5 * tier; p.money = Number(p.money) + bonus; gLog(`[color=#e3b341]첫 탐사[/color]  새 구역을 지도에 표시했다. 경험치 +${10 * tier}, ${won(bonus)}`); addXp(10 * tier); }
    cityOnExplore(id, hereRegion(), litBefore);
    const d = derived(), rr = gRandf() * 100 /* GDScript get(기본값)은 기본값도 먼저 계산합니다 */, roll = loc.roll != null ? Number(loc.roll) : rr, thr = encounterThreshold(lv, Number(p.level), night);
    const baseXp = 15 + 5 * tier + Math.max(0, lv - 1) * 3;
    if (roll < thr * 0.3) {
      gLog(`[color=#3fd0a4]조용한 곳을 발견했다.[/color]  (${GD.KIND_NAME[kind] || '생활'} 구역)`);
      for (let i = 0; i < 2; i++) { const pick = lootPick(kind, tier), amount = 1 + (gRandf() * 100 < d.loot - 40 ? 1 : 0); if (awardItem(pick, amount)) gLog(`획득  [${cat(pick).grade}] ${pick} × ${amount}`); }
      addXp(baseXp); statesOnSearch(); tryRare(tier); tryHighDrop(tier); survivalSupply(tier, lv);
    } else if (roll < thr * 0.5) {
      const tm = GD.TIER_MONEY[tierKey(tier)], cash = gRandiRange(Number(tm[0]), Number(tm[1])) + Math.trunc(lv / 2) + Math.max(0, lv - 15) * 6; p.money = Number(p.money) + cash;
      const stash = lootPick(kind, tier); story('누군가 남긴 쪽지: 먼저 간다. 북쪽 방송탑에서 보자.'); gLog(`물자 상자 · ${won(cash)} · ${stash} × 2`); awardItem(stash, 2); addXp(Math.trunc(baseXp * 0.5));
    } else if (roll < thr) {
      const ev = GD.FIELD_EVENTS[gRandi() % GD.FIELD_EVENTS.length]; gLog(`[color=#8b98a5]사건[/color]  ${ev.text}`);
      if (ev.hp != null) { let ch = Number(ev.hp); if (ch < 0) ch = -Math.min(Math.max(1, Math.trunc(Number(p.max_hp) * 0.15)), Math.max(1, -ch + Math.trunc(lv * 0.18))); const before = Number(p.hp); p.hp = Math.min(Number(p.max_hp), Number(p.hp) + ch); if (ch < 0) guardAfterDamage(before, '탐사 사건'); if (checkDeath('탐사 중 상처로 쓰러졌다')) { endResult('탐사 중 사망', id); return; } }
      if (ev.hp != null && Number(ev.hp) < 0 && gRandf() < 0.08) inflictCondition('bleeding'); else if (ev.hp != null && Number(ev.hp) < 0) statesOnFieldHurt(night);
      if (ev.morale != null) p.morale = Math.max(0, Math.min(100, Number(p.morale) + Number(ev.morale))); if (ev.water != null) p.water = Math.max(0, Math.min(100, Number(p.water) + Number(ev.water))); if (ev.money != null) p.money = Number(p.money) + Number(ev.money);
      if (ev.item != null && awardItem(String(ev.item), 1)) gLog(`획득  ${ev.item} × 1`);
      addXp(Math.trunc(baseXp * 0.6));
      if (ev.item == null) { const scrap = lootPick(kind, tier); if (awardItem(scrap, 1)) gLog(`수습  [${cat(scrap).grade}] ${scrap} × 1`); }
      if (ev.money == null) { const coins = gRandiRange(1, 3) * tier + Math.trunc(lv / 4); p.money = Number(p.money) + coins; gLog(`잔돈 · ${won(coins)}`); }
    } else {
      const rng = new GRng(gRandi()); p.battle = encounterCreate({ ...loc, realm: Number(GD.REGIONS[loc.gu_index].realm) }, rng); p.battle_turn = 1; FD.live = null;
      gLog(`[color=#f2706a]조우![/color] ${p.battle.enemy}${Number(p.battle.group_count) > 1 ? ` · ${p.battle.group_count}명 무리` : ''}`);
    }
    if (!nonEmpty(p.battle)) { exAwardShort(lv); u21AwardShort(lv, kind); coinsAwardShort(p.result_baseline || {}); tryMoveDrop(); petShortHelp(kind, tier); setPostExploreWait(); endResult('단기 탐사 결과', id); }
  } finally { FD._quest_loot_on = false; }
}
/* field_encounters.create */
const HUMAN_NAMES = ['폐허 약탈자', '적대적인 무장 생존자', '물자를 노리는 도적', '떠돌이 강탈자', '무장 밀수 조직원'];
function tunedEnemy(bh, ba, level, tierLevel, pl, night, special, variation) { const extra = Math.max(0, level - tierLevel), gap = Math.max(0, level - pl), hs = (1 + extra * 0.035) * (1 + gap * 0.045) * (night ? 1.12 : 1) * (special ? 1.1 : 1), as = (1 + extra * 0.025) * (1 + gap * 0.04) * (night ? 1.12 : 1) * (special ? 1.08 : 1);
  return { hp: Math.max(12, Math.round(bh * 1.22 * hs * variation)), attack: Math.max(3, Math.ceil(ba * 1.1 * as)), defense: Math.max(0, Math.trunc(level * 0.18) + (special ? 2 : 0)) }; }
function encounterCreate(loc, rng, source = 'short') {
  const tier = Math.max(1, Math.min(5, Number(loc.tier || 1))), kind = String(loc.kind || 'urban'); let species;
  if (rng.randf() < 0.2) species = 'human'; else species = rng.randf() < (kind === 'nature' ? 0.45 : 0.25) ? 'animal' : 'zombie';
  let size = rng.randf() < 0.07 ? rng.randiRange(2, 3) : 1; size = Math.max(1, Math.min(3, size));
  const fighters = [], level = Math.max(1, Math.min(100, Number(loc.level || 1)));
  for (let i = 0; i < size; i++) {
    const base = species !== 'animal' ? GD.ENEMIES[tierKey(tier)] : ED.ANIMALS[tierKey(tier)], e = base[rng.randiRange(0, base.length - 1)];
    const t = tunedEnemy(Number(e[1]), Number(e[2]), level, Number(GD.REGION_LEVEL[tierKey(tier)]), Number(S.P.level), !!loc.night, Number(loc.realm || 0) === 5, Math.fround(rng.randf() * (1.06 - 0.97) + 0.97));
    const name = species === 'human' ? HUMAN_NAMES[rng.randiRange(0, HUMAN_NAMES.length - 1)] : String(e[0]);
    const party = source === 'long' ? Math.min(4, Math.max(1, Number((S.P.long_expedition || {}).members ?? 1))) : 1, pf = 1 - (party - 1) * 0.06;
    const hp = Math.max(20, Math.trunc(t.hp * pf * (species === 'human' ? 1.05 : 1) * (size === 2 ? 0.72 : size === 3 ? 0.58 : 1)));
    fighters.push({ enemy: name, hp, max_hp: hp, attack: Math.max(1, Math.trunc(t.attack * pf * (species === 'human' ? 1.08 : 1) * (size > 1 ? 0.94 : 1))), defense: t.defense + (species === 'human' ? 1 : 0) });
  }
  const hard = !!S.P.hard_mode && Number(loc.realm || 0) <= HARD_REALM_MAX; if (hard) for (const f of fighters) { f.hp = Math.round(f.hp * 1.4); f.max_hp = f.hp; f.attack = Math.round(f.attack * 1.4); }
  const cur = fighters.shift(); let detail = species === 'human' ? '살아 있는 적대 생존자가 물자를 요구하며 무기를 겨눈다. 실제 유저와의 전투가 아닙니다. 승리 시 더 많은 소지금을 얻습니다.' : species === 'animal' ? '굶주린 짐승이 발톱과 이빨을 드러낸다.' : '감염자가 소리에 이끌려 다가온다.';
  if (hard) detail += '\n하드 모드 · 봉쇄 해제 구역의 상위 감염체 · 체력 · 공격력 1.4배'; if (size > 1) detail += `\n${size}명 무리 · 한 명씩 상대합니다. 전원을 이겨야 전체 보상을 1회 받습니다.`;
  return Object.assign(cur, { species, description: detail, source, group_count: size, group_index: 1, group_remaining: fighters, balance_version: D.combat_balance.VERSION, hard, night: !!loc.night, level, xp: Math.trunc((Number(GD.TIER_XP[tierKey(tier)]) + Math.max(0, level - 6) * 7) * (1 + 0.35 * (size - 1))), tier, kind, location: String(loc.id) });
}

/* ── 전투 ── */
const mitigated = (raw, def, level) => { const red = Math.max(0, Math.min(0.65, Math.max(0, def) / (60 + Math.max(1, level) * 0.9 + Math.max(0, def)))); return Math.max(1, Math.round(raw * (1 - red))); };
function liveNote(msg) { const b = S.P.battle; if (!nonEmpty(b)) return; if (!FD.live) FD.live = []; FD.live.push(msg); while (FD.live.length > 20) FD.live.shift(); }
function wearRoll(amount) { let w = Math.floor(amount); if (gRandf() < amount - w) w++; return w; }
function wearScale() { const b = S.P.battle, elv = nonEmpty(b) ? Number(b.level ?? S.P.level) : Number(S.P.level), gap = Math.max(-10, Math.min(10, elv - Number(S.P.level))), skill = Math.max(0.55, Math.min(1, 1 - Number(S.P.level) / 200)); return Math.max(0.2, Math.min(1, (0.5 + gap * 0.05) * skill)) * (1 - overflowOf(effStats(S.P.equipment || {})).wear / 100); }
function wearSlot(slot, amount) { const it = String((S.P.equipment || {})[slot] || ''); if (!it || !durApplies(it) || count(it) <= 0) return; if (['무기', '방어구'].includes(slot) && durValue(it) <= 0) return; const left = Math.max(0, durValue(it) - amount); setDur(it, left); const stamp = () => Math.floor(performance.now() * 1000);
  if (left <= 0 && slot === '무기') { const hp0 = Number(S.P.hp); syncGrowth(); S.P.hp = Math.min(hp0, Number(S.P.max_hp)); gLog(`무기 내구도 0 · ${it} · 부서지지는 않았지만 쓸 수 없어 맨주먹으로 싸웁니다. 거점 수리소나 수리 키트로 고치세요.`); notify('gear-zero-' + stamp(), '무기 내구도 0', it + ' · 수리할 때까지 맨주먹으로 싸웁니다.', 'equipment'); }
  else if (left <= 0 && slot === '방어구') { const hp1 = Number(S.P.hp); syncGrowth(); S.P.hp = Math.min(hp1, Number(S.P.max_hp)); gLog(`방어구 내구도 0 · ${it} · 사라지지는 않았지만 막아 주지 못해 맨몸으로 피해를 받습니다. 거점 수리소나 수리 키트로 고치세요.`); notify('gear-zero-' + stamp(), '방어구 내구도 0', it + ' · 수리할 때까지 맨몸으로 피해를 받습니다.', 'equipment'); }
  else if (left <= 0) { const hp = Number(S.P.hp); S.P.equipment[slot] = ''; removeItem(it, 1); if (count(it) > 0) S.P.durability[it] = DUR_MAX; else delete S.P.durability[it]; syncGrowth(); S.P.hp = Math.min(hp, Number(S.P.max_hp)); gLog(`장비 파손 · ${it} · 사용하던 1개가 파손되어 장착이 해제되었습니다.`); notify('gear-break-' + stamp(), '장비가 파손되었습니다', it + ' · 예비품을 장착하세요.', 'equipment'); }
  else if (left <= 20 && left + amount > 20) notify('gear-wear-' + stamp(), '장비 내구도 주의', it + ' · ' + durText(it), 'equipment'); }
const wearAttack = () => { const n = wearRoll(2 * wearScale()); if (n > 0) wearSlot('무기', n); };
const wearHit = (dmg) => { if (dmg <= 0) return; const base = Math.max(1, Math.min(4, 1 + Math.ceil(dmg / Math.max(1, Number(S.P.max_hp)) * 6))); const n = wearRoll(base * wearScale()); if (n > 0) wearSlot('방어구', n); };
function playerStrike(base, label) { const b = S.P.battle, d = derived(); let dmg = base + (gRandi() % 5); const crit = gRandf() * 100 < d.crit; if (crit) { dmg = Math.trunc(dmg * d.crit_dmg / 100); questEvent('crit'); }
  dmg = mitigated(dmg, Number(b.defense || 0), Number(b.level ?? S.P.level)); b.hp = Math.max(0, Number(b.hp) - dmg);
  if (crit) gLog(`[color=#e3b341]치명타![/color] ${label}  ${b.enemy}에게 [b]${dmg}[/b] 피해.`); else gLog(`[color=#3fd0a4]${label}[/color]  ${b.enemy}에게 ${dmg} 피해.`);
  liveNote(`내 공격${crit ? ' 치명타' : ''} · 적 체력 -${dmg} → ${b.hp} / ${b.max_hp}`); }
function conditionChances(species, defending, damage) { const scale = 0.7 * (1 - conditionResistance()) * (defending ? 0.45 : 1) * (damage > Number(S.P.max_hp) * 0.2 ? 1.3 : 1), g = gearMods(workingEq(S.P.equipment || {}));
  const r = { bleeding: (species === 'animal' ? 10 : 8) * scale, infection: (species === 'animal' ? 1.5 : 3) * scale, sprain: (species === 'animal' ? 6 : 1) * scale }; r.bleeding += Number(g.bleed_extra || 0); r.infection += Number(g.infection_extra || 0);
  if (species === 'human') { r.infection = 0; r.sprain = Math.max(r.sprain, 3 * scale); } if (activePos().includes('immunity')) r.infection = 0; return r; }
function conditionOnHit(defending, damage) { const ch = conditionChances(String(S.P.battle.species || 'zombie'), defending, damage), roll = gRandf() * 100; let edge = 0; for (const id of ['bleeding', 'infection', 'sprain']) { edge += ch[id]; if (roll < edge) { inflictCondition(id); return; } } statesOnHit(defending, damage); }
function enemyTurn(defending) {
  const p = S.P, b = p.battle; p.battle_turn = Number(p.battle_turn || 1) + 1;
  if (Number(b.stun_turns || 0) > 0) { b.stun_turns = Number(b.stun_turns) - 1; gLog(`${b.enemy}이(가) 묶여서 공격하지 못했다.`); liveNote(josaFix(`적 행동 불가 · ${b.enemy}은(는) 묶여 공격하지 못했습니다.`)); return; }
  if (b.stun) { b.stun = false; gLog(`${b.enemy}이(가) 비틀거리며 공격하지 못했다.`); liveNote(josaFix(`적 행동 불가 · ${b.enemy}이(가) 비틀거렸습니다.`)); return; }
  const d = derived(); if (gRandf() * 100 < d.evade) { gLog(`[color=#6cb6ff]회피![/color] ${b.enemy}의 공격을 피했다.`); liveNote(`회피 성공 · ${b.enemy}의 공격을 피했습니다. 내 체력 ${p.hp} / ${p.max_hp}`); return; }
  let dmg = mitigated(Number(b.attack) + (gRandi() % 4) - 1, d.defense, Number(b.level ?? p.level)); if (defending) dmg = Math.trunc(dmg / 2); dmg = Math.max(1, dmg);
  const before = Number(p.hp); p.hp = before - dmg; guardAfterDamage(before, String(b.enemy)); wearHit(dmg);
  gLog(`${b.enemy}의 공격. ${dmg} 피해를 입었다.`); liveNote(`적 공격${defending ? ' (방어)' : ''} · 내 체력 -${dmg} → ${p.hp} / ${p.max_hp}`);
  if (Number(p.hp) <= 0) checkDeath(`${b.enemy}에게 당했다`);
  if (!p.dead && nonEmpty(p.battle)) conditionOnHit(defending, dmg);
}
function encounterAdvance() { const b = S.P.battle; if (!nonEmpty(b) || Number(b.hp) > 0) return false; const rem = b.group_remaining || []; if (!rem.length) return false; const nx = rem.shift(); Object.assign(b, nx); b.group_remaining = rem; b.group_index = Number(b.group_index) + 1; b.stun_turns = 0; b.stun = false; gLog(`무리 전투 · 다음 상대 ${b.group_index}/${b.group_count}: ${b.enemy}`); return true; }
const SDC = D.story_data.COMPANIONS;
function companionActions() { const p = S.P, b = p.battle; if (!p.party_formed) return; const comp = (id) => (p.companions || {})[id] || {};
  for (const id of Object.keys(SDC).filter((k) => comp(k).joined && comp(k).active)) { const c = SDC[id], scale = 1 + Number(comp(id).trust || 0) / 100, tag = `[color=#${c.color}]${c.name}[/color]`;
    if (id === 'cheolmin') { const dmg = Math.trunc((6 + gRandi() % 9) * scale); b.hp = Math.max(0, Number(b.hp) - dmg); gLog(`${tag}  도끼를 휘둘러 ${dmg} 피해.`); liveNote(`동료 ${c.name} 공격 · 적 체력 -${dmg} → ${b.hp} / ${b.max_hp}`); }
    else if (id === 'mirae') { if (Number(p.battle_turn) % 3 === 0) { const dmg = Math.trunc((18 + gRandi() % 13) * scale); b.hp = Math.max(0, Number(b.hp) - dmg); gLog(`${tag}  설치해 둔 덫이 터졌다. ${dmg} 피해.`); liveNote(`동료 ${c.name} 덫 · 적 체력 -${dmg} → ${b.hp} / ${b.max_hp}`); } }
    else if (id === 'seoyeon') { if (Number(p.hp) < Number(p.max_hp) * 0.6 && Number(b.heal_cd || 0) <= 0) { const heal = Math.trunc((12 + gRandi() % 6) * scale * derived().recover / 100); p.hp = Math.min(Number(p.max_hp), Number(p.hp) + heal); b.heal_cd = 2; gLog(`${tag}  응급 처치. 체력 ${heal} 회복.`); liveNote(`동료 ${c.name} 응급 처치 · 내 체력 +${heal} → ${p.hp} / ${p.max_hp}`); } else b.heal_cd = Number(b.heal_cd || 0) - 1; }
    else if (id === 'doyun') { if (gRandf() < 0.18 + Number(comp(id).trust || 0) / 400) { b.stun = true; gLog(`${tag}  돌을 던져 적의 시선을 끌었다.`); liveNote(`동료 ${c.name} 지원 · 적 행동이 취소됩니다.`); } } } }
function afterPlayerAction(defending) { const b = S.P.battle; if (!nonEmpty(b)) return; if (Number(b.hp) <= 0) { if (encounterAdvance()) return; finishCombat(true); return; } companionActions(); if (Number(b.hp) <= 0) { if (encounterAdvance()) return; finishCombat(true); return; } enemyTurn(defending); }
function finishCombat(victory) {
  const p = S.P, b = p.battle; if (!nonEmpty(b) || !victory) return;
  { const ps = b.on_win || {}; if (ps.advance && ps.story_target != null && Number(ps.story_target) <= Number(p.story || 0)) { p.battle = {}; p.story_pending_choice = {}; p.result_baseline = {}; FD.back = 'hub'; toast('이미 완료한 스토리 전투입니다. 중복 보상 없이 거점으로 돌아갑니다.'); return; } }
  if (!Object.keys(p.result_baseline || {}).length) beginResult();
  const place = String(b.location || ''), defeated = Math.max(1, Math.min(3, Number(b.group_count || 1))); p.kills = Number(p.kills || 0) + defeated; for (let i = 0; i < defeated; i++) questEvent('kill');
  const qlv = Number(b.level ?? p.level); if (qlv >= Number(p.level)) questEvent('kill_strong', defeated); if (qlv >= Number(p.level) + 3) questEvent('kill_tough', defeated); if (Number(p.hp) >= Number(p.max_hp) * 0.7) questEvent('win_clean');
  const d = derived(), tier = Math.max(1, Math.min(5, Number(b.tier || 1))), gained = Math.trunc(Number(b.xp) * (1 + d.xp_bonus / 100)), tm = GD.TIER_MONEY[tierKey(tier)];
  let cash = gRandiRange(Number(tm[0]), Number(tm[1])); { const size = Math.max(1, Math.min(3, Number(b.group_count || 1))); cash = Math.trunc(cash * (1 + 0.4 * (size - 1))); if (String(b.species || '') === 'human') cash = cash * 3 + Number(b.level || 1) * 4; }
  p.money = Number(p.money) + cash; gLog(`[color=#3fd0a4]전투 승리.[/color] 경험치 ${gained}, ${won(cash)} 획득.`);
  FD._quest_loot_on = false;
  if (b.loot) { for (const dr of b.loot) if ((gRandi() % 100) < Math.trunc(d.loot) && awardItem(String(dr[0]), Number(dr[1]))) gLog(`전리품  [${cat(String(dr[0])).grade}] ${dr[0]} × ${dr[1]}`); }
  else for (let i = 0; i < 2; i++) if ((gRandi() % 100) < Math.trunc(d.loot) - i * 30) { const pick = lootPick(String(b.kind || 'urban'), tier); if (awardItem(pick, 1)) gLog(`전리품  [${cat(pick).grade}] ${pick} × 1`); }
  tryRare(tier); tryHighDrop(tier); survivalSupply(tier, Number(b.level ?? p.level));
  if (!nonEmpty(b.on_win)) { const ll = Number(b.level || 1); exAwardShort(ll); u21AwardShort(ll, String(b.kind || 'urban')); coinsAwardShort(p.result_baseline || {}); }
  p.morale = Math.min(100, Number(p.morale) + 1);
  const storyWin = b.on_win || {}, winText = String(b.win_text || ''); if (b.tier == null) FD.back = 'hub';
  setPostCombatWait(); p.battle = {}; p.buffs = {}; addXp(gained); statesOnVictory(); if (nonEmpty(storyWin)) { if (winText) story(`[color=#e3b341]${winText}[/color]`); applyEffects(storyWin); } toast('전투에서 승리했습니다.');
  petShortHelp('urban', 1) /* 게임은 _combat을 비운 뒤 불러 늘 기본값(urban · 1)이 들어갑니다 */; tryMoveDrop(); FD.liveEnd = true; endResult('조우 전투 결과', place);
}
const isGun = (w) => !!GD.WEAPONS[w]?.gun;
const isHealItem = (it) => { const d = GD.ITEMS[it] || {}; return d.hp != null && d.dmg == null && d.stun == null && !d.escape; };
function combatUsable(it) { if (GD.WEAPONS[it] || GD.ARMORS[it] || GEAR.ITEMS[it]) return false; if (BD.POSITIVE_ITEMS[it]) return true; const d = GD.ITEMS[it] || {}; if (Number(d.hp || 0) > 0 || d.dmg != null || d.stun != null || d.escape) return true; return ['buff_atk', 'buff_def', 'buff_evade'].some((k) => d[k] != null); }
const combatItems = () => Object.keys(S.P.inventory || {}).filter((it) => count(it) > 0 && combatUsable(it));
function combatAttack() { if (!nonEmpty(S.P.battle)) return ''; const p = S.P, w = String(p.equipment?.['무기'] || '');
  if (isGun(w) && weaponDmg(p.equipment || {}) > 4) { if (count('탄약') <= 0) { gLog('탄약이 없다! 총 손잡이로 내리쳤다.'); playerStrike(Math.max(4, derived().attack - weaponDmg(p.equipment || {}) + 6), '개머리 타격'); } else { removeItem('탄약', 1); playerStrike(derived().attack, `${w} 사격`); } }
  else playerStrike(derived().attack, '당신의 공격');
  wearAttack(); afterPlayerAction(false); }
function combatDefend() { if (!nonEmpty(S.P.battle)) return ''; gLog('몸을 낮추고 공격을 받아낼 준비를 했다.'); questEvent('defend'); liveNote('내 방어 · 이번 적 공격 피해가 절반으로 적용됩니다.'); afterPlayerAction(true); }
function leaveCombat(back) { const p = S.P; if (p.battle && p.battle.tier == null) FD.back = 'hub'; setPostCombatWait(); p.battle = {}; p.buffs = {}; FD.live = null; return back; }
function combatFlee() { if (!nonEmpty(S.P.battle)) return ''; const p = S.P; if ((gRandi() % 100) < Math.trunc(derived().flee)) { gLog('[color=#6cb6ff]도주 성공.[/color] 어둠 속으로 몸을 숨겼다. 사기 -3'); leaveCombat(); p.morale = Math.max(0, Number(p.morale) - 3); return 'fled'; }
  gLog('도주에 실패했다.'); liveNote(`도주 실패 · ${p.battle.enemy}의 반격을 받습니다.`); afterPlayerAction(false); return ''; }
function combatRetreat() { if (!nonEmpty(S.P.battle)) return ''; const p = S.P, ch = Math.trunc(derived().retreat); if ((gRandi() % 100) < ch) { gLog(`[color=#6cb6ff]안전지대 이동 성공[/color]  골목과 지하도를 빠져나가 거점으로 돌아왔다. 사기 -2  (확률 ${ch}%)`); leaveCombat(); p.at_hub = true; p.morale = Math.max(0, Number(p.morale) - 2); toast('거점으로 무사히 돌아왔습니다.'); return 'hub'; }
  gLog(`[color=#f2706a]안전지대 이동 실패[/color]  길이 막혀 있었다!  (확률 ${ch}%)`); afterPlayerAction(false); return ''; }
function combatUse(it) {
  const p = S.P, b = p.battle; if (!nonEmpty(b) || count(it) <= 0) return ''; if (!combatUsable(it)) { toast('장착품은 소모품으로 사용할 수 없습니다. 장비 메뉴에서 장착하세요.'); return ''; }
  const d = GD.ITEMS[it] || {};
  if (d.escape) { removeItem(it, 1); if (d.morale != null) p.morale = Math.min(100, Number(p.morale) + Number(d.morale)); gLog(`[color=#6cb6ff]${it}[/color]  연기 속으로 몸을 숨겨 빠져나왔다.`); leaveCombat(); return 'fled'; }
  const hpB = Number(p.hp), ehB = Number(b.hp);
  if (d.dmg != null) { removeItem(it, 1); const dmg = Number(d.dmg) + Number(p.stats?.['지능'] || 0) * 2; b.hp = Math.max(0, Number(b.hp) - dmg); gLog(`[color=#e3b341]${it}[/color] 폭발! ${b.enemy}에게 ${dmg} 피해.`); liveNote(`${it} 사용 · 적 체력 -${ehB - b.hp} → ${b.hp} / ${b.max_hp}`); }
  else if (d.stun != null) { removeItem(it, 1); b.stun_turns = Number(b.stun_turns || 0) + Number(d.stun); gLog(`[color=#e3b341]${it}[/color]  ${b.enemy}이(가) ${d.stun}턴 동안 움직이지 못한다.`); liveNote(josaFix(`${it} 사용 · 적 ${d.stun}턴 행동 불가 · 적 체력 ${b.hp} / ${b.max_hp}`)); }
  else { consume(it); const ch = Number(p.hp) - hpB; liveNote(ch > 0 ? `${it} 사용 · 내 체력 +${ch} → ${p.hp} / ${p.max_hp}` : `${it} 사용 · 효과 적용 · 내 체력 ${p.hp} / ${p.max_hp}`); }
  afterPlayerAction(false); return '';
}

/* ── 화면 연결(시작 확인 창 · 수색 대기 · 결과 창 · 전투 행동) ── */
function fieldUnsupported() { syncHardMode(); return ''; }
function battleUnsupported() { const b = S.P.battle || {}; if (String(b.source || '') === 'long') return '장기 탐사 중 만난 조우는 자동 전투로 이어집니다. 잠시 뒤 결과가 기록에 남습니다.'; return fieldUnsupported(); }
const kvRows = (rows) => `<div class="kvrows">${rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join('')}</div>`;
function startExploreFlow(loc) {
  const why = fieldUnsupported(); if (why) { toast(why); return; }
  const run = (skip) => act(() => { if (skip) { if (!S.P.notify_settings || typeof S.P.notify_settings !== 'object') S.P.notify_settings = {}; S.P.notify_settings.explore_confirm = false; } return startExplorationNow(loc); }, afterField);
  if (!((S.P.notify_settings || {}).explore_confirm ?? true)) { run(false); return; }
  const lv = loc.level, night = isNight(), thr = encounterThreshold(lv, Number(S.P.level), night), combat = 100 - thr, hurt = GD.FIELD_EVENTS.filter((e) => Number(e.hp || 0) < 0).length;
  const injury = Math.max(0, Math.min(100, combat + thr * 0.5 * hurt / Math.max(1, GD.FIELD_EVENTS.length))), cost = resourceCost(lv, night), gap = lv - Number(S.P.level);
  const rows = [['걸리는 시간', '10~20초 수색 (바로 적과 마주칠 수도 있습니다)'], ['전투 확률', `약 ${Math.round(combat)}%`], ['다칠 확률', `약 ${Math.round(injury)}% (전투·사건 포함)`], ['소모', `허기 -${cost[0]} · 수분 -${cost[1]} · 사기 -1`],
    ['구역', `Lv.${lv} · ${gap > 0 ? `레벨차 +${gap} · 적이 강합니다` : '레벨 적합'}${night ? ' · 밤이라 더 위험합니다' : ''}`], ['오늘 남은 횟수', `${Math.max(0, M.FIELD_DAILY_LIMIT - calendarSync(S.P).fieldCount)} / ${M.FIELD_DAILY_LIMIT}회`]];
  const low = Number(S.P.hp) * 100 < Number(S.P.max_hp) * 40 ? `<p style="color:var(--danger)">체력이 ${S.P.hp} / ${S.P.max_hp}(으)로 낮습니다. 치료하고 가는 것을 권합니다.</p>` : '';
  modal('단기 탐사 · ' + loc.spot, kvRows(rows) + low + '<label class="chk"><input type="checkbox" id="exSkip"> 다음부터 이 창 없이 바로 탐사 (설정 → 알림에서 다시 켤 수 있음)</label>', []);
  const box = $('mBtns'); box.className = 'mrow';
  const no = document.createElement('button'); no.className = 'btn'; no.textContent = '취소'; no.onclick = () => { $('modalRoot').innerHTML = ''; };
  const yes = document.createElement('button'); yes.className = 'btn primary'; yes.textContent = '탐사 시작'; yes.onclick = () => { const skip = $('exSkip').checked; $('modalRoot').innerHTML = ''; run(skip); };
  box.append(no, yes); yes.focus();
}
/* 동작 뒤 화면: 게임처럼 전투 · 수색 · 사망 · 거점으로 옮기고 결과 창을 띄웁니다 */
function afterField(back) {
  const p = S.P; let m = S.mode;
  if (p.dead) m = 'dead'; else if (nonEmpty(p.battle)) m = 'combat'; else if (nonEmpty(p.pending_explore)) m = 'exploring'; else if (FD.back) m = FD.back; else if (['combat', 'exploring'].includes(m)) m = 'explore';
  FD.back = ''; if (m !== S.mode) go(m);
  if (FD.showResult) { FD.showResult = false; modalLater(showResult); }
}
function showResult() {
  const r = S.P.last_result; if (!r || !nonEmpty(r)) return;
  const items = (r.items || []).length ? r.items.map((it) => `<p class="ri" style="color:${gradeColor(it.name)}">[${esc(cat(it.name).grade)}] ${esc(it.name)} × ${Number(it.qty)}${Number(it.stored) > 0 ? ` · 보관함 ${Number(it.stored)}개` : ''}</p><p class="rd">${esc(itemDesc(it.name))}</p>`).join('') : '<p class="muted">획득한 아이템이 없습니다.</p>';
  const notes = (r.notes || []).map((n) => `<p class="rn">${richText(String(n))}</p>`).join('');
  modal(String(r.title), `<p class="muted" style="margin-top:-6px">${esc(r.place)} · ${esc(r.time)}</p><p style="color:var(--warning);font-size:17px">경험치 ${sgn(Number(r.xp))} · 금액 ${sgn(Number(r.money))}원 · 코인 +${Number(r.coins || 0)}</p><div class="rlist">${items}<hr>${notes}</div>`, [['확인', 'primary', null]]);
  $('modalRoot').querySelector('.mcard').classList.add('result');
}
/* 수색 대기 · 1초마다 확인 */
function fieldTick() {
  if (!S.P || $('app').hidden || LIVE.saving || LIVE.lost) return;
  const pe = S.P.pending_explore; if (!nonEmpty(pe) || nowSec() < Number(pe.ready)) return;
  if (FD.ticking) return; FD.ticking = true; act(() => exploreTickDue(), afterField).finally(() => { FD.ticking = false; });
}
/* 전투 기록(게임의 _combat_live_*) — 화면에만 있는 기록 */
function liveEnsure() { const b = S.P.battle, turn = Number(S.P.battle_turn || 1); if (!nonEmpty(b)) return; const L = FD.liveMeta || (FD.liveMeta = {});
  if (!FD.live || !FD.live.length || (turn <= 1 && (Number(L.turn || 0) > 1 || Number(L.ehp ?? 1) <= 0))) { FD.live = []; liveNote(`조우 · ${b.enemy} · 내 체력 ${S.P.hp} / ${S.P.max_hp} · 적 체력 ${b.hp} / ${b.max_hp}`); }
  else if (String(b.enemy) !== L.enemy && Number(b.group_index || 1) > 1) liveNote(`다음 상대 · ${b.enemy} · 적 체력 ${b.hp} / ${b.max_hp}`);
  L.enemy = String(b.enemy); L.ehp = Number(b.hp); L.turn = turn; }
function combatAct(kind, item) {
  const why = battleUnsupported(); if (why) { toast(why); return; }
  if (!nonEmpty(S.P.battle)) return;
  act(() => { if (!nonEmpty(S.P.battle)) return false; const r = kind === 'attack' ? combatAttack() : kind === 'defend' ? combatDefend() : kind === 'flee' ? combatFlee() : kind === 'retreat' ? combatRetreat() : combatUse(item); if (r === 'hub') FD.back = 'hub'; return true; }, afterField);
}
function combatItemModal() {
  const b = S.P.battle; if (!nonEmpty(b)) return; const items = godotSortLess(combatItems(), (a, c) => (isHealItem(a) ? 1 : 0) > (isHealItem(c) ? 1 : 0) || ((isHealItem(a) ? 1 : 0) === (isHealItem(c) ? 1 : 0) && a < c));
  let h = `<p class="muted">적 ${esc(b.enemy)} · 체력 ${b.hp} / ${b.max_hp}   ·   내 체력 ${S.P.hp} / ${S.P.max_hp}\n사용하면 한 턴이 지나갑니다. 회복 아이템은 바로 효과가 납니다.</p>`;
  if (!items.length) h += '<p>가방에 전투에서 쓸 수 있는 아이템이 없습니다.</p>';
  let last = -1; for (const it of items) { const heal = isHealItem(it) ? 1 : 0; if (heal !== last) { last = heal; h += `<p class="group" style="color:var(--warning)">${heal ? '회복' : '공격 · 묶기 · 도주 · 강화'}</p>`; }
    h += `<button class="btn citem" data-ci="${esc(it)}" style="--c:${gradeColor(it)}"><b>${esc(it)}   × ${count(it)}</b><span>${esc(effectText(it))}</span></button>`; }
  modal('전투 아이템 사용', h, [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-ci]').forEach((x) => { x.onclick = () => { $('modalRoot').innerHTML = ''; combatAct('use', x.dataset.ci); }; });
}
document.addEventListener('keydown', (e) => {
  if (!S.P || S.mode !== 'combat' || S.mobile || $('modalRoot').innerHTML || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  const k = { KeyA: 'attack', KeyS: 'defend', KeyD: 'item', KeyF: 'flee', Digit1: 'attack', Digit2: 'defend', Digit3: 'item', Digit4: 'flee' }[e.code]; if (!k) return; e.preventDefault();
  if (k === 'item') combatItemModal(); else combatAct(k);
});
/* 숫자 단축키(PC): 거점 0 탐사 · 1 몸 살피기 · 2 스토리 · 3 반려동물 · 4 거점 시설 · 5 내 방 · 6 휴식, 다른 화면은 번호가 붙은 선택지 */
document.addEventListener('keydown', (e) => {
  if (!S.P || $('app').hidden || S.mobile || S.mode === 'combat' || e.ctrlKey || e.metaKey || e.altKey || $('modalRoot').innerHTML || NPOP.open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
  const m = /^(Digit|Numpad)([0-9])$/.exec(e.code); if (!m) return; const d = m[2], c = $('center'); let el = null;
  if (S.mode === 'hub') el = d === '0' ? c.querySelector('.cta [data-go="explore"]') : c.querySelector({ 1: '[data-hub="card0"]', 2: '[data-hub="card1"]', 3: '[data-hub="card2"]', 4: '[data-go="shop"].hcard', 5: '[data-hub="card4"]', 6: '[data-hub="card5"]' }[d] || '#none');
  if (!el) el = [...c.querySelectorAll('button.choice2')].find((b) => b.querySelector('.n')?.textContent === d && !b.disabled);
  if (el && !el.disabled) { e.preventDefault(); el.click(); } });
const richText = (s) => esc(s).replace(/\[color=#([0-9a-fA-F]{6})\]/g, (m, h) => `<span style="color:${isLight() ? `color-mix(in srgb, #${h} 72%, #000)` : '#' + h}">`).replace(/\[\/color\]/g, '</span>').replace(/\[b\]/g, '<b>').replace(/\[\/b\]/g, '</b>');
const itemDesc = (it) => cat(it).effect || '';
const effectText = (it) => cat(it).effect || "";
/* 대조 시험: 게임 디버그 빌드의 fieldtest와 같은 순서로 */
window.__llTest.fieldSteps = (base, seed, steps, now = 0) => {
  TNOW = Array.isArray(now) ? 0 : now; S.P = normalizeLoaded(JSON.parse(JSON.stringify(base))); S.log = []; GR = new GRng(seed); FD.live = null; S.P.battle = {}; S.P.battle_turn = 1; const outs = [];
  for (const st of steps) { const [k, a1, a2] = st; if (Array.isArray(now)) TNOW = now[outs.length] || TNOW;
    if (k === 'start') { const l = locations().find((x) => locId(x) === a1); if (l) startExplorationNow(l); }
    else if (k === 'tick') { if (nonEmpty(S.P.pending_explore)) S.P.pending_explore.ready = 0; exploreTickDue(); }
    else if (k === 'rest') S.P.field_ready_at = 0; else if (k === 'hp') S.P.hp = a1; else if (k === 'set') S.P[a1] = a2;
    else if (k === 'long') { LONG.diff = a2; startLongExplore(a1); } else if (k === 'shift') { const t = S.P.long_expedition; if (nonEmpty(t)) { t.started = Number(t.started) - a1; t.ready = Number(t.ready) - a1; for (const e of (t.auto_log || [])) { e.at = Number(e.at) - a1; e.key = ''; } } }
    else if (k === 'longtick') { FD.noAutoClaim = true; longTickCore(); FD.noAutoClaim = false; } else if (k === 'claim') claimLongExplore(); else if (k === 'early') abortLongTrip(true); else if (k === 'move') beginRegionMove(a1); else if (k === 'arrive') { if (nonEmpty(S.P.travel)) S.P.travel.ready = 0; travelTickDue(); } else if (k === 'nap') { S.P.rest_ready = 0; restNow(); }
    else if (k === 'craft') craftStart(a1, a2); else if (k === 'crafttick') { if (craftActive()) S.P.craft_job.ready = 0; craftTickDue(); } else if (k === 'stash') { S.P.at_hub = true; stashMove(a1, a2, st[3]); }
    else if (k === 'auto') autoStart(a1); else if (k === 'autoshift') { if (autoActive()) { S.P.auto_explore.started -= a1; S.P.auto_explore.ends -= a1; } } else if (k === 'autotick') autoTickCore(); else if (k === 'chapter') { S.P.at_hub = true; openChapter(); } else if (k === 'choose') chooseStory(a1); else if (k === 'fire') { S.P.campfire_day = -1; campfire(); } else if (k === 'talk') { S.P.companions[a1].talk_day = -1; talkTo(a1); } else if (k === 'gift') { S.P.companions[a1].gift_day = -1; giftTo(a1, a2); } else if (k === 'autostop') { if (autoActive()) { autoRefund(); autoFinish('멈춤'); } }
    else if (k === 'now') TNOW = a1; else if (k === 'uid') S.acct = { ...(S.acct || {}), uid: a1 };
    else if (k === 'pettick') { S.P.at_hub = true; petTickCore(); } else if (k === 'petloot') { S.P.at_hub = true; petResolveLoot(a1); } else if (k === 'petmeet') { S.P.at_hub = true; petMeet(); } else if (k === 'petskip') S.P.hub_event.status = 'resolved';
    else if (k === 'petcare') { S.P.at_hub = true; petCare(a2 < 0 ? String(S.P.wild_animal?.id) : String(S.P.pets[a2]?.id), a1); } else if (k === 'petadopt') petAdopt(a1 < 0 ? String(S.P.wild_animal?.id) : String(S.P.pets[a1]?.id)); else if (k === 'petrename') petRename(a2 < 0 ? String(S.P.wild_animal?.id) : String(S.P.pets[a2]?.id), a1); else if (k === 'petrelease') petRelease();
    else if (k === 'bet') { S.P.at_hub = true; casPlace(a1, a2, st[3], true); } else if (k === 'giftbuy') { S.P.at_hub = true; giftBuy(giftLineup()[a1].key); } else if (k === 'giftrefresh') giftRefresh();
    else if (k === 'fishprep') { S.P.fishing_guide_seen = true; S.P.fishing_guide_v2 = true; } else if (k === 'fishbait') S.P.fish_bait = String(a1); else if (k === 'fish') { FISHS.cast = null; if (fishCast(a1, true)) fishResolve(FISHS.token, a2); } else if (k === 'fishsell') fishSell(a1, a2); else if (k === 'baitbuy') fishBuyBait(a1);
    else if (k === 'attack') combatAttack(); else if (k === 'defend') combatDefend(); else if (k === 'flee') combatFlee(); else if (k === 'retreat') combatRetreat(); else if (k === 'use') combatUse(a1);
    storyCapture(); const snap = JSON.parse(JSON.stringify(S.P)); snap._rand = GR.next(); GR = new GRng(seed + outs.length + 1); outs.push(snap); }
  TNOW = 0; return { outs, log: S.log };
};
window.__llTest.skipWait = () => { if (nonEmpty(S.P.pending_explore)) S.P.pending_explore.ready = 0; S.P.field_ready_at = 0; rerender(); };

/* ════════ 시간 흐름 — main._life_tick(10초) · _life_minute(1분) · 상태 진행 · 사망 24시간 ════════ */
const LIFE = { acc: 0, minutes: 0, decay: { hunger: 100, water: 100, morale: 100 }, infection: false, changed: false, dirty: false, lastSave: 0 };
const SG = D.survival_guard;
function heal(n) { const old = Number(S.P.hp); S.P.hp = Math.min(Number(S.P.max_hp), old + Math.trunc(n * derived().recover / 100)); return Number(S.P.hp) - old; }
/* _notify: 알림함에 넣고, 알림 창 켜기 설정이면 차례대로 띄웁니다(급한 경고는 alertPopup이 맨 앞에) */
function notify(id, title, body, kind, payload = {}) { if (!nhAdd(id, title, body, kind, payload)) return false; if ((S.P.notify_settings || {}).popups ?? true) { FD.popups = FD.popups || []; FD.popups.push({ id, title, body }); clearTimeout(FD.popT); FD.popT = setTimeout(drainPopups, 1500); } return true; }
function alertPopup(id, title, body, kind, payload = {}) { if (!nhAdd(id, title, body, kind, payload)) return; if (!((S.P.notify_settings || {}).popups ?? true)) return; FD.popups = FD.popups || []; FD.popups.unshift({ id, title, body }); }
function drainPopups() { if (!FD.popups || !FD.popups.length || $('modalRoot').innerHTML || S.mode === 'create_character' || LIVE.saving || NPOP.open) return; const e = FD.popups.shift(); if (e.id && (S.P.notifications || []).some((x) => String(x.id) === String(e.id))) openNotification(e.id); else modal(e.title, `<p style="white-space:pre-line;color:var(--text)">${esc(e.body)}</p>`); }
function positiveTick() { const st = S.P.positive && typeof S.P.positive === 'object' ? S.P.positive : {}; let ch = false, now = nowSec();
  for (const id of Object.keys(st)) { const q = st[id]; if (Number(q.until || 0) <= now) { delete st[id]; ch = true; continue; }
    const iv = Math.trunc(Number(q.interval || 0)); if (iv > 0 && now - Number(q.tick ?? now) >= iv) { q.tick = now;
      if (q.heal != null) { if (q.flat_heal) S.P.hp = Math.min(Number(S.P.max_hp), Number(S.P.hp) + Math.trunc(q.heal)); else heal(Math.trunc(q.heal)); }
      if (q.morale != null) S.P.morale = Math.min(100, Number(S.P.morale) + Math.trunc(q.morale)); if (q.hunger != null) S.P.hunger = Math.min(100, Number(S.P.hunger) + Math.trunc(q.hunger)); if (q.water != null) S.P.water = Math.min(100, Number(S.P.water) + Math.trunc(q.water)); LIFE.changed = true; } }
  S.P.positive = st; return ch; }
function finalMutationExpired() { if (S.P.dead) return; gLog('[color=#6b1f3a]최종 변이[/color]  24시간 안에 치료하지 못해 끝내 좀비가 되어 쓰러졌다.'); S.P.final_tries = 0; S.P.hp = 0; checkDeath('최종 변이를 치료하지 못해 좀비가 되었다'); }
function conditionTick() { const p = S.P; if (nonEmpty(p.long_expedition) && p.long_expedition.halted) return false; const st = p.conditions && typeof p.conditions === 'object' ? p.conditions : {}; let ch = false; const now = nowSec();
  for (const id of Object.keys(st)) {
    if (!ED.CONDITIONS[id] || Number(st[id].until || 0) <= now) { delete st[id]; ch = true; if (id === 'final_mutation') { p.conditions = st; finalMutationExpired(); return true; } continue; }
    const def = ED.CONDITIONS[id], cure = def.cure || {}; let cured = false; for (const k in cure) if (Number(p[k] || 0) >= Number(cure[k])) cured = true;
    if (cured) { delete st[id]; ch = true; gLog(`[color=#3fd0a4]${def.name} 해제[/color]  상태가 회복되어 사라졌다.`); continue; }
    const iv = Math.trunc(Number(st[id].interval ?? def.interval)); if (iv > 0 && now - Number(st[id].tick ?? now) >= iv) { const ticks = Math.min(6, Math.trunc((now - Number(st[id].tick)) / iv)); st[id].tick = now;
      for (const [dk, k] of [['hunger_drain', 'hunger'], ['water_drain', 'water'], ['morale_drain', 'morale']]) if (def[dk] != null) p[k] = Math.max(0, Number(p[k]) - Math.trunc(def[dk]) * ticks);
      LIFE.changed = true; const dmg = Math.trunc(def.damage || 0) * ticks; if (dmg <= 0) continue; const before = Number(p.hp); p.hp = before - dmg; gLog(`${def.name}(으)로 체력 -${dmg}`); guardAfterDamage(before, String(def.name)); if (checkDeath(`${def.name}(으)로 쓰러졌다`)) return true; } }
  p.conditions = st; return ch; }
function tryInflict(id, chance) { if (S.P.dead || !ED.CONDITIONS[id] || activeConds().includes(id)) return false; if (gRandf() >= chance * (1 - conditionResistance())) return false; inflictCondition(id); return true; }
function statesOnMinute() { const p = S.P; let ch = false; if (Number(p.hunger) <= 15) ch = tryInflict('hunger_pang', 0.15) || ch; if (Number(p.water) <= 15) ch = tryInflict('dehydration', 0.15) || ch;
  if (Number(p.morale) <= 20) ch = tryInflict('depression', 0.10) || ch; else if (Number(p.morale) <= 35) ch = tryInflict('fatigue', 0.05) || ch; if (Number(p.hp) <= Number(p.max_hp) * 0.25) ch = tryInflict('weakness', 0.05) || ch; return ch; }
function infectionMinute() { const p = S.P; if (p.dead || !LIFE.infection) return; p.infect_min = Number(p.infect_min || 0) + 1; if (Number(p.infect_min) < M.INFECTION_ROLL_MINUTES) return; p.infect_min = 0; const act = activeConds(); if (act.includes('final_mutation')) return;
  if (act.includes('mutation')) { if (gRandf() < M.FINAL_MUTATION_CHANCE) { if (guardActive()) { gLog('[color=#9b3d5e]변이[/color]  몸이 완전히 변하려 했지만 신규 생존자 보호가 막아 주었다. 서둘러 치료하자.'); return; } delete p.conditions.mutation; inflictCondition('final_mutation', 86400); alertPopup(`final-mutation-${nowSec()}`, '최종 변이가 시작됐습니다', "변이를 오래 방치해 최종 변이가 됐습니다. 24시간 안에 '변이 치료제'로 치료해야 합니다. 치료는 3번까지 시도할 수 있고(성공 확률 60% → 75% → 95%), 시간이 지나거나 3번째도 실패하면 사망합니다. 변이 치료제는 제작에서 만들 수 있습니다.", 'condition'); LIFE.full = true; } return; }
  if (act.includes('infection') && gRandf() < M.MUTATION_CHANCE) { delete p.conditions.infection; inflictCondition('mutation', 86400); alertPopup(`mutation-${nowSec()}`, '변이가 시작됐습니다', '감염을 오래 방치해 몸이 변하기 시작했습니다. 항생제·수술 키트·정제 항바이러스제·백신·변이 치료제로 치료하세요. 그대로 두면 최종 변이로 악화될 수 있습니다.', 'condition'); LIFE.full = true; } }
function lifeMinute() { const p = S.P, sv = Math.trunc(Number(p.stats?.['생존력'] || 0)); let ch = false; const acc = p.decay_acc && typeof p.decay_acc === 'object' ? p.decay_acc : {}, keep = { hunger: Math.min(0.45, sv * 0.03), water: Math.min(0.35, sv * 0.02), morale: 0 };
  for (const k of ['hunger', 'water', 'morale']) { const v = Number(acc[k] || 0) + Number(M.DECAY_BASE[k]) * LIFE.decay[k] / 100 * (1 - keep[k]), drop = Math.floor(v); if (drop > 0) p[k] = Math.max(0, Number(p[k]) - drop); acc[k] = v - drop; }
  p.decay_acc = acc; autoEat(); infectionMinute(); LIFE.minutes++;
  if (Number(p.hunger) <= 0 || Number(p.water) <= 0) { const dmg = (Number(p.hunger) <= 0 ? 2 : 0) + (Number(p.water) <= 0 ? 2 : 0), before = Number(p.hp); p.hp = before - dmg; guardAfterDamage(before, '굶주림·탈수');
    if (!p.starve_warned) { p.starve_warned = true; gLog('[color=#f2706a]굶주림[/color]  허기나 수분이 바닥났다. 1분마다 체력이 줄어든다. 먹고 마셔야 한다.'); ch = true; } if (checkDeath('굶주림과 갈증으로 숨을 거뒀다')) return true; }
  else { p.starve_warned = false; if (!nonEmpty(p.battle) && Number(p.hunger) >= 30 && Number(p.water) >= 30 && Number(p.hp) < Number(p.max_hp)) p.hp = Math.min(Number(p.max_hp), Number(p.hp) + (sv >= 8 ? 2 : 1)); }
  const g = gearMods(workingEq(p.equipment || {})); p.hunger = Math.max(0, Number(p.hunger) - Math.trunc(Number(g.hunger_drain || 0)));
  if (Number(g.hp_drain || 0) > 0) { const b = Number(p.hp); p.hp = b - Math.trunc(g.hp_drain); guardAfterDamage(b, '장비 부작용'); if (nonEmpty(p.long_expedition) && Number(p.hp) <= guardHpFloor()) { p.hp = Math.max(1, Number(p.hp)); haltLongTrip(); } else if (checkDeath('장비의 부정 반응으로 쓰러졌다')) return true; }
  if (statesOnMinute()) ch = true; return ch; }
function deathReset(auto) { const p = S.P; if (!p.dead) return false; p.level = 1; p.xp = 0; p.skill_points = 3; p.invested = {};
  p.dead = false; p.dead_at = 0; p.death_cause = ''; p.conditions = {}; p.buffs = {}; p.positive = {}; p.hunger = 82; p.water = 76; p.morale = 68; p.at_hub = true; STAT.draft = {};
  syncGrowth(); p.hp = Number(p.max_hp);
  gLog(`[color=#f2bb55]다시 시작[/color]  ${auto ? '24시간 동안 아무도 오지 않았다.' : ''} 레벨 1부터 다시 일어섰다. 가방과 장비는 그대로 남아 있다.`);
  nhAdd(`death-reset-${nowSec()}`, '레벨 1부터 다시 시작', auto ? '부활 대기 시간이 지나 레벨 · 능력치가 처음으로 돌아갔습니다. 아이템과 소지금은 그대로입니다.' : '레벨 · 능력치를 처음으로 돌리고 다시 시작했습니다. 아이템과 소지금은 그대로입니다.', 'growth'); return true; }
/* survival_guard.watch — 허기 · 수분 · 사기 단계 알림, 체력 경고 */
function guardWatch() { const p = S.P; if (!p || p.dead || !(p.character || {}).created) return; const state = p.vital_alerts && typeof p.vital_alerts === 'object' ? p.vital_alerts : {}, lines = []; let worst = 0;
  const stage = (v) => SG.VITAL_STEPS.filter((s) => v <= s).length, rearm = (v) => SG.VITAL_STEPS.filter((s) => v < s + SG.VITAL_REARM).length;
  const ADV = { hunger: ['배가 고파지기 시작했습니다. 여유가 있을 때 음식을 챙겨 드세요.', '몹시 배가 고픕니다. 0%가 되면 1분마다 체력이 줄어듭니다.', '곧 굶주림이 시작됩니다. 지금 음식을 드세요.'], water: ['목이 마르기 시작했습니다. 물이나 음료를 준비하세요.', '탈수가 가깝습니다. 0%가 되면 1분마다 체력이 줄어듭니다.', '곧 탈수가 시작됩니다. 지금 음료를 드세요.'], morale: ['사기가 떨어지고 있습니다. 휴식이나 사기 회복품을 고려하세요.', '사기가 낮습니다. 10 이하가 되면 행동불능 상태가 됩니다.', "행동불능 직전입니다. '잠깐 눈 붙이기'나 사기 회복품을 사용하세요."] };
  for (const k of Object.keys(SG.VITAL_NAMES)) { const v = Math.max(0, Math.min(100, Math.trunc(Number(p[k] ?? 100)))), sg = stage(v), seen = Number(state[k] || 0); if (sg > seen) { lines.push(`${SG.VITAL_NAMES[k]} ${v}%\n${ADV[k][sg - 1]}`); worst = Math.max(worst, sg); state[k] = sg; } else state[k] = Math.min(seen, rearm(v)); }
  const hp = Math.trunc(Number(p.hp || 0)), hs = Number(state.hp || 0); let hpAlert = false; if (hp > 0 && hp <= SG.HP_WARN && hs === 0) { state.hp = 1; hpAlert = true; } else if (hp > SG.HP_WARN + SG.VITAL_REARM) state.hp = 0;
  p.vital_alerts = state; const us = () => Math.floor(performance.now() * 1000);
  if (lines.length) alertPopup(`vital-${us()}`, worst >= 3 ? '생존 경고' : worst === 2 ? '생존 주의' : '생존 알림', lines.join('\n\n'), worst >= 2 ? 'danger' : 'growth');
  if (hpAlert) alertPopup(`hp-low-${us()}`, `체력 경고 · ${hp} / ${Math.trunc(p.max_hp)}`, guardActive() ? `체력이 ${hp}까지 떨어졌습니다.\n\n신규 생존자 보호 중에는 체력이 5 아래로 내려가지 않고 사망하지 않습니다.\n하지만 체력 5 이하에서 피해를 받으면 그때마다 경험치가 깎입니다.\n\n회복품을 사용하거나 안전한 곳에서 회복하세요. (보호 남은 시간 ${durationText(Math.max(0, Number(p.positive.newbie.until) - nowSec()))})` : `체력이 ${hp}까지 떨어졌습니다.\n\n체력이 0이 되면 사망합니다. 회복품을 사용하거나 전투·탐사를 잠시 멈추세요.`, 'danger'); }
/* 10초마다 — 반환: 'full'(화면 다시 그림) · 'save'(바로 저장) · '' */
function lifeTickCore() { const p = S.P; if (!p) return '';
  if (p.dead) { if (Number(p.dead_at || 0) <= 0) { p.dead_at = nowSec(); return 'save'; } if (nowSec() - Number(p.dead_at) >= M.DEATH_WINDOW) { deathReset(true); return 'reset'; } return 'deadview'; }
  const oldDay = Number(p.day), oldFd = Number(p.field_date ?? -1); calendarSyncMut(); const fieldReset = oldFd !== Number(p.field_date ?? -1); if (fieldReset) questSync();
  p.play_secs = Number(p.play_secs || 0) + 10; LIFE.acc += 10; LIFE.changed = false; LIFE.full = false;
  const chPos = positiveTick(); let full = conditionTick() || chPos || oldDay !== Number(p.day) || fieldReset; if (LIFE.changed && S.mode === 'combat') full = true;
  if (LIFE.acc >= 60) { LIFE.acc = 0; if (!nonEmpty(p.long_expedition)) full = lifeMinute() || full; }
  if (p.dead) return 'death'; if (fieldReset) return 'save'; return full || LIFE.full ? 'full' : 'light'; }
function lifeTick() {
  if (!S.P || $('app').hidden || LIVE.lost || LIVE.saving || S.mode === 'title') return;
  if (LIVE.on) { coopSub(); try { socialTick(); } catch (e) { console.error(e); } }
  const pch = petTickCore(); if (pch && ['pets', 'hub', 'hub_event'].includes(S.mode)) rerender();
  const r = lifeTickCore(); LIFE.dirty = true; if (pch) LIFE.lastSave = 0;
  if (r === 'deadview') { if (S.mode === 'dead') rerender(); if (pch) quietSave(); return; }
  { const k = questKeys(), q = S.P.quests || {}; if (String(q.daily?.key || '') !== k.daily || String(q.weekly?.key || '') !== k.weekly) { questSync(); if (S.mode === 'quests') rerender(); } }
  if (r === 'death' || r === 'reset') { go(r === 'death' ? 'dead' : 'hub'); } else if (r === 'full' || r === 'save') rerender(); else refreshHeader();
  guardWatch(); drainPopups();
  if (r === 'death' || r === 'reset' || r === 'save' || nowSec() - LIFE.lastSave >= 60) quietSave();
}
/* 동작이 아닌 변화(시간 흐름)를 저장 — 실패해도 되돌리지 않고 다음에 다시 저장합니다 */
async function quietSave() { if (!LIVE.on || LIVE.saving || LIVE.lost || !LIFE.dirty) return; LIVE.saving = true; LIFE.lastSave = nowSec(); LIFE.dirty = false;
  const r = await call('saveGame', JSON.stringify({ player: S.P, log: S.log || [] })); LIVE.saving = false;
  if (r && r.ok) { if (r.player) S.P = r.player; if (Array.isArray(r.log)) S.log = r.log; cityReport(); coopFlush(); return; }
  if (r && r.conflict && r.player) { S.P = r.player; if (Array.isArray(r.log)) S.log = r.log; rerender(); return; }
  if (r && r.sessionLost) { onSessionLost(); return; } LIFE.dirty = true; }
setInterval(lifeTick, 10000);
/* 수치만 바뀐 때: 머리 줄의 체력 · 허기 · 수분 · 사기만 고칩니다(입력 중인 화면을 지우지 않게) */
function refreshHeader() { const box = document.querySelector('.vitals') || $('mvit'); if (!box) return; const rows = box.children, v = vitals();
  v.forEach(([n, val, r], i) => { const row = rows[i]; if (!row) return; const b = row.querySelector('.t b'), bar = row.querySelector('.bar i'); if (b) b.textContent = (box.id === 'mvit' && i === 0) ? `${Number(S.P.hp)}/${Number(S.P.max_hp)}` : String(val); if (bar) bar.style.width = Math.max(0, Math.min(100, r * 100)) + '%'; }); }

window.__llTest.lifeSteps = (c) => { S.P = JSON.parse(JSON.stringify(c.player)); S.log = []; GR = new GRng(c.seed); TNOW = c.now; LIFE.infection = !!c.infect; LIFE.acc = c.life_acc || 0; const snaps = [];
  try { for (const st of c.steps) { if (st[0] === 'tick') { lifeTickCore(); guardWatch(); } else if (st[0] === 'now') TNOW = st[1]; else if (st[0] === 'use') useInventory(st[1]); else if (st[0] === 'rand') snaps.push(gRandf()); else if (st[0] === 'snap') snaps.push(JSON.parse(JSON.stringify(S.P))); } }
  finally { TNOW = 0; }
  return { name: c.name, player: S.P, snaps, life_acc: LIFE.acc }; };
function petWindow() { const e = S.P.hub_event || {}; if (e.admin) return kstNow() < Number(e.until_kst || 0); const sec = kstNow() % 86400; return sec >= 9 * 3600 && sec < (String(e.kind || 'loot') === 'animal' ? 24 : 12) * 3600; }

/* ════════ 지역 이동 — navigation_flow.request_move · main._begin_region_move · _travel_tick · cancel_move ════════ */
function beginRegionMove(gi) {
  const p = S.P; if (gi < 0 || gi >= GD.REGIONS.length || activityBusy()) return false;
  if (Number(p.level) < Number(WD.REALMS[Number(GD.REGIONS[gi].realm)].level) || Number(p.level) + 3 < Number(GD.REGIONS[gi].min_level)) return false;
  const wait = travelDuration(gi), origin = ['hub', 'explore', 'worldmap'].includes(S.mode) ? ({ explore: 'explore_gu', worldmap: 'explore' }[S.mode] || S.mode) : (p.at_hub !== false ? 'hub' : 'explore_gu');
  if (wait > 0) { p.travel = { from: Number(p.region), to: gi, started: nowSec(), ready: nowSec() + wait, duration: wait, return_hub: false, origin_hub: p.at_hub !== false, origin_mode: origin }; p.at_hub = false; gLog(`지역 이동 · ${GD.REGIONS[Number(p.region)].name} → ${GD.REGIONS[gi].name} · ${durationText(wait)}`); }
  else { p.region = gi; p.at_hub = false; }
  return true;
}
function requestMove(target) {
  if (target < 0 || target >= GD.REGIONS.length) return; if (activityBusy()) { toast('진행 중인 활동을 먼저 마쳐 주세요.'); return; }
  const r = GD.REGIONS[target]; if (Number(S.P.level) < Number(WD.REALMS[Number(r.realm)].level) || Number(S.P.level) + 3 < Number(r.min_level)) { toast('이 지역의 진입 레벨을 확인하세요.'); return; }
  const sec = travelDuration(target), origin = Number(S.P.region);
  const run = () => act(() => { if (Number(S.P.region) !== origin || activityBusy()) { toast('현재 상태가 바뀌어 이동을 시작하지 않았습니다.'); return false; } return beginRegionMove(target); }, () => { EXP.worldSel = -1; go(nonEmpty(S.P.travel) ? 'travel' : 'explore'); });
  if (sec <= 0) { run(); return; }
  modal('이 지역으로 이동하시겠습니까?', `<p style="font-size:18px;color:var(--text)">${esc(GD.REGIONS[origin].name)} → ${esc(r.name)}</p><p style="color:var(--blue);white-space:pre-line">이동 시간 ${durationText(sec)}\n도착 예상 ${kstStamp(nowSec() + sec)} (한국시간)</p><p>출발 후 5분 이내에는 이동을 취소할 수 있습니다. 이동 중에도 음식·치료와 정보 메뉴를 이용할 수 있습니다.</p>`, []);
  const box = $('mBtns'); box.className = 'mrow'; const no = document.createElement('button'); no.className = 'btn'; no.textContent = '이동하지 않기'; no.onclick = () => { $('modalRoot').innerHTML = ''; };
  const yes = document.createElement('button'); yes.className = 'btn primary'; yes.textContent = '이동 시작'; yes.onclick = () => { $('modalRoot').innerHTML = ''; run(); }; box.append(no, yes);
}
const canCancelMove = () => nonEmpty(S.P.travel) && nowSec() - Number(S.P.travel.started) <= 300 && Number(S.P.travel.ready) > nowSec();
function cancelMove() { if (!canCancelMove()) { toast('출발 후 5분이 지나 이동을 취소할 수 없습니다.'); return false; } const t = clone(S.P.travel); S.P.travel = {}; S.P.region = Number(t.from); S.P.at_hub = t.origin_hub ?? true; FD.back = String(t.origin_mode || (S.P.at_hub ? 'hub' : 'explore_gu')) === 'hub' ? 'hub' : 'explore'; gLog(`이동을 취소하고 ${GD.REGIONS[Number(t.from)].name}의 출발 위치로 돌아왔습니다.`); return true; }
function travelTickDue() { const p = S.P; if (!nonEmpty(p.travel) || Number(p.travel.ready) > nowSec()) return false; const t = clone(p.travel); p.travel = {}; p.at_hub = !!t.return_hub;
  if (Number(t.to) !== Number(t.from ?? t.to)) { questEvent('travel'); questUnique('travel_regions', String(t.to)); if (Number(GD.REGIONS[Number(t.to)].realm) !== Number(GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, Number(t.from ?? t.to)))].realm)) questEvent('realm_move'); }
  p.region = Number(t.to); EXP.worldRealm = Number(GD.REGIONS[Number(t.to)].realm); FD.back = t.return_hub ? 'hub' : 'explore'; gLog(`${GD.REGIONS[Number(t.to)].name}에 도착했습니다.`); return true; }

/* ════════ 장기 탐사 — main._long_record · _start_long_explore · long_expedition_auto · _claim_long_explore · _abort_long_trip ════════ */
const LA = { STEP: 1200, MAX_STEPS: 24, MAX_TURNS: 48, LOG_LIMIT: 160 }, ASC = D.action_scripts;
const LONG = { hours: 2, diff: 0 };
function weightedRare() { const r = gRandf() * 100, grade = r < 72 ? 'B' : r < 94 ? 'A' : 'S'; const c = IC.order.filter((it) => !BD.MOVE_ITEMS[it] && !EXI.ITEMS[it] && !U21.ITEMS[it] && cat(it).grade === grade); return c.length ? gPick(c) : '군용 소총'; }
const longCombatChance = (lv, rec) => { const gap = rec - lv; return Math.max(0.05, Math.min(0.30, 0.12 + (gap > 0 ? gap * 0.02 : gap * 0.015))); };
function longRisk(lv, rec, comp, night) { const gap = rec - lv, grp = Math.min(5, Math.max(0, comp - 1)); const ch = Math.max(0.14, Math.min(0.58, 0.3 + gap * 0.032 + (night ? 0.05 : 0) - grp * 0.025));
  const lethal = gap < 3 ? 0 : Math.max(0, Math.min(0.04, (gap - 2) * 0.007 + (night ? 0.004 : 0) - grp * 0.004)); return { event: ch, lethal, damage: Math.max(0.04, Math.min(0.17, 0.07 + Math.max(0, gap) * 0.014 + (night ? 0.012 : 0) - grp * 0.006)) }; }
const longTarget = (gi, diff) => Math.max(Math.max(1, Number(GD.REGIONS[gi].min_level) - 3), Math.min(100, Number(S.P.level) + diff));
function longRecord(hours, region, diff, started, ready, tripId = '', members = 1) {
  const r = GD.REGIONS[region], target = longTarget(region, diff), items = {}, rare = [];
  for (let i = 0; i < hours; i++) { const it = lootPick('urban', Number(r.tier)); items[it] = Number(items[it] || 0) + 1; }
  if (hours >= 2) for (let i = 0; i < (hours === 4 ? 2 : 1); i++) { const it = weightedRare(); items[it] = Number(items[it] || 0) + 1; rare.push(it); }
  const need = 100 + (Number(S.P.level) - 1) * 65, rm = Math.max(0.3, Math.min(1, Math.max(1, Number(r.min_level)) / Math.max(1, Number(S.P.level)))), dm = { '-3': 0.8, 0: 1.0, 3: 1.3, 5: 1.6 }[diff] ?? 1.0;
  const base = need * 0.22 * hours * (hours >= 2 ? 1.15 : 1) * rm * dm, money = Math.trunc(30 * hours * Math.max(1, 1 + Math.trunc(target / 10)) * rm * dm);
  return { region, name: String(r.name), hours, started, ready, xp: Math.trunc(base * (1 + derived().xp_bonus / 100)), money, region_mul: rm, diff_mul: dm, items, night: isNight(), reward_version: 10, risk_version: 10, risk_step: 0, risk_seed: gRandi(), difficulty: diff, recommended: target, rare_names: rare, tripId, members, aborted: false, halted: false, combat_paused: false, paused_total: 0 };
}
const tripElapsed = (t) => { let until = Math.min(nowSec(), Number(t.ready ?? nowSec())); if (t.combat_paused) until = Math.min(until, Number(t.paused_at ?? until)); return Math.max(0, until - Number(t.started) - Number(t.paused_total || 0)); };
function laAppend(trip, at, kind, text) { let log = Array.isArray(trip.auto_log) ? trip.auto_log : []; const key = `${kind}|${at}|${text}`; if (log.some((e) => e && e.key === key)) return; log.push({ key, at, kind, text }); if (log.length > LA.LOG_LIMIT) log = log.slice(log.length - LA.LOG_LIMIT); trip.auto_log = log; }
function asPool(kind, night) { const p = S.P, le = p.long_expedition || {}; let key = kind; if (kind === 'long') key = Number(le.members ?? 1) > 1 ? 'long_party' : 'long_solo'; if (kind === 'long' && le.halted) key = 'long_halt';
  const out = [...(ASC.POOLS[key] || ASC.POOLS.search)]; if (night && ['search', 'travel', 'long'].includes(kind)) out.push(...ASC.POOLS.night); if (['search', 'travel', 'long'].includes(kind) && Number(p.hp ?? 75) < Math.trunc(Number(p.max_hp ?? 75)) * 0.7) out.push(...ASC.POOLS.hurt); return out; }
const posmod = (a, b) => ((a % b) + b) % b;
function laActionLog(trip, step) { const at = Number(trip.started ?? nowSec()) + step * LA.STEP, started = Number(trip.started ?? at), src = asPool('long', !!trip.night), st = Math.max(0, Math.trunc((at - started) / 60)), seed = Math.abs(started * 31 + ghash('long'));
  laAppend(trip, at, 'progress', `구간 ${step} · ${src.length ? src[posmod(seed + st, src.length)] : '주변을 살피며 다음 구간으로 이동합니다.'}`); }
function laEnsure(trip) { if (!Array.isArray(trip.auto_log)) trip.auto_log = []; if (!trip.auto_summary || typeof trip.auto_summary !== 'object' || Array.isArray(trip.auto_summary)) trip.auto_summary = {}; const sm = trip.auto_summary;
  for (const k of ['encounters', 'wins', 'withdrawals', 'kills', 'turns', 'damage_taken', 'damage_dealt', 'evades', 'critical_hits', 'bonus_xp', 'bonus_money']) if (!(k in sm)) sm[k] = 0;
  if (Number(trip.auto_version || 0) >= 1) return; trip.auto_version = 1; trip.auto_started_hp = Number(S.P.hp || 0); trip.auto_started_at = nowSec(); laAppend(trip, nowSec(), 'start', '자동 탐사 시작 · 장비와 현재 능력치로 조우를 자동 해결합니다.'); laActionLog(trip, 0); }
const iga = (n) => { if (!n) return n; const c = n.codePointAt(n.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? n + ((c - 0xac00) % 28 ? '이' : '가') : n + '이(가)'; };
function laMakeCombat(trip, rng) { const region = Number(trip.region ?? -1); if (region !== Number(S.P.region ?? -2)) { laAppend(trip, nowSec(), 'skip', '현재 위치가 달라 조우를 실행하지 않았습니다.'); return {}; }
  return encounterCreate({ id: String(trip.name || '장기 탐사'), level: Number(trip.recommended ?? S.P.level), tier: Number(GD.REGIONS[region].tier), kind: 'urban', realm: Number(GD.REGIONS[region].realm), night: !!trip.night, gu_index: region }, rng, 'long'); }
function laSimulate(trip, combat, rng) {
  const sm = trip.auto_summary; sm.encounters = Number(sm.encounters) + 1; const ename = String(combat.enemy || '적'), mates = tripMates(trip), pn = mates.length + 1;
  if (pn > 1) { combat.hp = Number(combat.hp || 1) * pn; for (const e of (Array.isArray(combat.group_remaining) ? combat.group_remaining : [])) if (e && e.hp != null) e.hp = Number(e.hp) * pn; laAppend(trip, nowSec(), 'encounter', `${ename}와(과) 조우 · ${mates.join(', ')} 함께 ${pn}명이 단체 전투를 시작합니다. (적 체력 ×${pn})`); }
  else laAppend(trip, nowSec(), 'encounter', `${ename}와(과) 조우 · 자동 전투를 시작합니다.`);
  let turns = 0, victory = false; const takenBefore = Number(sm.damage_taken || 0);
  const nextEnemy = () => { const rem = Array.isArray(combat.group_remaining) ? combat.group_remaining : []; if (!rem.length) return false; const nx = rem.shift(); Object.assign(combat, nx); combat.group_remaining = rem; combat.group_index = Number(combat.group_index ?? 1) + 1; return true; };
  while (turns < LA.MAX_TURNS && Number(S.P.hp || 0) > 1) {
    turns++; sm.turns = Number(sm.turns) + 1; let d = derived(); let dealt = Math.trunc(d.attack) + rng.randiRange(0, 4); const crit = rng.randf() * 100 < d.crit;
    if (crit) dealt = Math.trunc(dealt * d.crit_dmg / 100); dealt = Math.max(1, mitigated(dealt, Number(combat.defense || 0), Number(combat.level ?? S.P.level)));
    combat.hp = Math.max(0, Number(combat.hp || 0) - dealt); sm.damage_dealt = Number(sm.damage_dealt) + dealt; laAppend(trip, nowSec(), 'attack', `${turns}턴 · ${combat.enemy || '적'}에게 ${dealt} 피해${crit ? ' (치명타)' : ''} · 적 체력 ${combat.hp}`);
    if (crit) sm.critical_hits = Number(sm.critical_hits) + 1; wearAttack();
    if (Number(combat.hp) > 0) for (const mate of mates) { let md = Math.trunc((Math.trunc(d.attack) + rng.randiRange(0, 4)) * rng.randfRange(0.8, 1.2)); md = Math.max(1, mitigated(md, Number(combat.defense || 0), Number(combat.level ?? S.P.level))); combat.hp = Math.max(0, Number(combat.hp) - md); laAppend(trip, nowSec(), 'attack', `${turns}턴 · ${mate}의 공격 · ${md} 피해 · 적 체력 ${combat.hp}`); if (Number(combat.hp) <= 0) break; }
    if (Number(combat.hp) <= 0) { if (nextEnemy()) continue; victory = true; break; }
    if (mates.length) { const aim = rng.randiRange(0, mates.length); if (aim < mates.length) { laAppend(trip, nowSec(), 'evade', `${turns}턴 · ${iga(String(combat.enemy || '적'))} ${mates[aim]}을(를) 노렸다 · 내 체력 ${S.P.hp} / ${S.P.max_hp}`); continue; } }
    d = derived(); if (rng.randf() * 100 < d.evade) { sm.evades = Number(sm.evades) + 1; laAppend(trip, nowSec(), 'evade', `${turns}턴 · 공격 회피 · 받은 피해 0 · 체력 ${S.P.hp} / ${S.P.max_hp}`); continue; }
    const taken = Math.max(1, mitigated(Number(combat.attack || 1) + rng.randiRange(-1, 2), d.defense, Number(combat.level ?? S.P.level))), hb = Number(S.P.hp || 0);
    S.P.hp = Math.max(1, hb - taken); guardAfterDamage(hb, ename); const loss = hb - Number(S.P.hp); sm.damage_taken = Number(sm.damage_taken) + loss;
    laAppend(trip, nowSec(), 'hit', `${turns}턴 · 피격 ${taken} 피해 · 체력 ${hb} → ${S.P.hp} / ${S.P.max_hp} (−${loss})`); wearHit(taken);
    { const ch = conditionChances(String(combat.species || 'zombie'), false, taken), roll = rng.randf() * 100; let edge = 0, done = false; for (const id of ['bleeding', 'infection', 'sprain']) { edge += ch[id]; if (roll < edge) { inflictCondition(id); done = true; break; } } if (!done) statesOnHit(false, taken); }
    if (Number(S.P.hp || 0) <= guardHpFloor()) { S.P.hp = Math.max(1, Number(S.P.hp)); trip.halted = true; trip.halted_at = Math.min(nowSec(), Number(trip._step_at ?? nowSec())); laAppend(trip, nowSec(), 'halt', `${ename}와(과)의 교전에서 체력이 ${S.P.hp}까지 떨어져 자동 복귀 대기 상태가 되었습니다.`); notify(`long-auto-halt-${Number(trip.started || 0)}`, '체력 위험 · 장기 탐사 중단', '자동 전투가 생존을 우선해 탐사를 멈췄습니다. 긴급 복귀로 정산하세요.', 'danger'); break; }
  }
  if (victory) { sm.wins = Number(sm.wins) + 1; const def = Math.max(1, Math.min(3, Number(combat.group_count || 1))); sm.kills = Number(sm.kills) + def; S.P.kills = Number(S.P.kills || 0) + def; for (let i = 0; i < def; i++) questEvent('kill'); S.P.morale = Math.min(100, Number(S.P.morale || 0) + 1);
    { const d = derived(), tier = Math.max(1, Math.min(5, Number(combat.tier || 1))), bx = Math.trunc(Number(combat.xp || 0) * (1 + d.xp_bonus / 100)), tm = GD.TIER_MONEY[String(tier)]; let cash = rng.randiRange(Number(tm[0]), Number(tm[1])); const gc = Math.max(1, Math.min(3, Number(combat.group_count || 1))); cash = Math.trunc(cash * (1 + 0.4 * (gc - 1))); if (String(combat.species || '') === 'human') cash = cash * 3 + Number(combat.level || 1) * 4;
      trip.xp = Number(trip.xp || 0) + bx; trip.money = Number(trip.money || 0) + cash; sm.bonus_xp = Number(sm.bonus_xp) + bx; sm.bonus_money = Number(sm.bonus_money) + cash; const items = trip.items && typeof trip.items === 'object' ? trip.items : {};
      for (let i = 0; i < 2; i++) if (rng.randiRange(0, 99) < Math.trunc(d.loot) - i * 30) { const pk = lootPick(String(combat.kind || 'urban'), tier); items[pk] = Number(items[pk] || 0) + 1; }
      if (rng.randf() * 100 < d.rare) { const rr = weightedRare(); items[rr] = Number(items[rr] || 0) + 1; } trip.items = items; }
    laAppend(trip, nowSec(), 'victory', `${ename} 자동 제압 · ${turns}턴 · 받은 피해 ${Number(sm.damage_taken) - takenBefore}.`); }
  else { sm.withdrawals = Number(sm.withdrawals) + 1; if (!trip.halted) { S.P.morale = Math.max(0, Number(S.P.morale || 0) - 3); laAppend(trip, nowSec(), 'withdraw', `${ename}와의 교전이 길어져 자동으로 거리를 벌렸습니다. 사기 -3.`); } }
  trip.auto_summary = sm;
}
function laHazard(trip, rng) { const risk = longRisk(Number(S.P.level ?? 1), Number(trip.recommended ?? 1), Math.max(1, Number(trip.members ?? 1)), !!trip.night), def = derived().defense, resist = Math.max(0, Math.min(0.35, def / (160 + Number(trip.recommended ?? 1) * 2 + def)));
  if (rng.randf() >= risk.event * (1 - resist)) { laAppend(trip, nowSec(), 'safe', '위험 구간을 경계하며 무사히 통과했습니다.'); return; }
  if (rng.randf() < risk.lethal) { laAppend(trip, nowSec(), 'death', '위험한 조우에서 치명상을 입었습니다.'); S.P.hp = 0; checkDeath('장기 탐사 중 위험한 조우에서 치명상을 입었다'); return; }
  const dmg = Math.max(1, Math.trunc(Number(S.P.max_hp ?? 1) * risk.damage * (1 - resist) * rng.randfRange(0.7, 1.3))), hb = Number(S.P.hp ?? 1); S.P.hp = Math.max(1, hb - dmg); guardAfterDamage(hb, '장기 탐사 위험 사건');
  const loss = hb - Number(S.P.hp); trip.auto_summary.damage_taken = Number(trip.auto_summary.damage_taken || 0) + loss; wearHit(dmg);
  laAppend(trip, nowSec(), 'hazard', `위험 사건 · ${dmg} 피해 · 체력 ${hb} → ${S.P.hp} / ${S.P.max_hp} (−${loss})`);
  if (rng.randf() < 0.12) inflictCondition(rng.randf() < 0.6 ? 'bleeding' : 'sprain');
  if (Number(S.P.hp ?? 1) <= guardHpFloor()) { trip.halted = true; trip.halted_at = Math.min(nowSec(), Number(trip._step_at ?? nowSec())); laAppend(trip, nowSec(), 'halt', `체력이 ${S.P.hp}까지 떨어져 추가 위험 사건을 중단했습니다.`); notify(`long-auto-halt-${Number(trip.started || 0)}`, '체력 위험 · 장기 탐사 중단', '자동 진행이 생존을 우선해 추가 위험 사건을 멈췄습니다.', 'danger'); } }
const PARTY_ACTS = [['hp', '{A} %s의 상처를 돌봐 주었다.', '회복'], ['hp', '{A} %s의 다친 팔에 붕대를 다시 감아 주었다.', '회복'], ['hunger', '{A} %s에게 가지고 온 식사를 나눠 주었다.', '허기'], ['hunger', '{A} 쉬는 틈에 %s에게 말린 고기를 건넸다.', '허기'], ['water', '{A} %s에게 아껴 둔 물을 나눠 주었다.', '수분'], ['water', '{A} 끓여 둔 물을 %s의 물병에 채워 주었다.', '수분'], ['morale', '{A} %s의 어깨를 두드리며 힘을 북돋아 주었다.', '사기'], ['morale', '{A} %s에게 예전 이야기를 들려주며 긴장을 풀어 주었다.', '사기']];
/* v37.38: 친구들이 나에게 정한 관계(장기 탐사 파티 장면을 두 사람이 같게 보기 위해) · 10분에 한 번만 읽는다 */
const REL_BACK = { map: {}, at: -100000 };
function refreshRelBack(force = false) { if (!LIVE.on || (!force && nowSec() - REL_BACK.at < 600)) return; const cids = (SOC.friends || []).filter((f) => f && String(f.charId || '') !== '').map((f) => String(f.charId)); if (!cids.length) return; REL_BACK.at = nowSec();
  call('relBackMany', JSON.stringify(cids.slice(0, 60))).then((r) => { if (r && r.ok && isDict(r.rels)) REL_BACK.map = r.rels; }); }
const relWith = (uid) => { const f = (SOC.friends || []).find((x) => x && String(x.uid || '') === uid && String(x.rel || '') !== ''); return f ? String(f.rel) : ''; };
const relBackWith = (uid) => { const f = (SOC.friends || []).find((x) => x && String(x.uid || '') === uid); return f ? String(REL_BACK.map[String(f.charId ?? f.uid ?? '')] || '') : ''; };
const eunJ = (n) => { if (!n) return n; const c = n.codePointAt(n.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? n + ((c - 0xac00) % 28 ? '은' : '는') : n + '은(는)'; };
function laParty(trip, step) { const uids = [...(trip.member_uids || [])].map(String); if (uids.length < 2 || trip.halted) return; uids.sort(); const names = trip.member_names || {}, rng = new GRng(Math.abs(ghash(`${trip.tripId || ''}:${step}:party`)));
  const roll = rng.randf(), a = rng.randiRange(0, uids.length - 1); let b = rng.randiRange(0, uids.length - 2); if (b >= a) b++; const me = String(S.acct?.uid || '');
  if (roll >= 0.45) { /* 서로 돕지 않은 구간 중 30%는 짧은 대화(효과 없음) — 대화하는 두 사람 화면에만, 관계를 알 때만 */
    if (roll >= 0.45 + 0.55 * 0.3) return; if (uids[a] !== me && uids[b] !== me) return; const other0 = uids[a] === me ? uids[b] : uids[a], srel = uids[a] === me ? relWith(other0) : relBackWith(other0);
    const tpool = RD.LONG_TALK?.[srel]; if (!Array.isArray(tpool)) return; const tline = String(tpool[rng.randiRange(0, tpool.length - 1)]), at0 = Number(trip.started || 0) + Number(trip.paused_total || 0) + step * LA.STEP;
    laAppend(trip, at0, 'party', tline.replace('{A}', iga(String(names[uids[a]] || '파티원'))).replace('%s', String(names[uids[b]] || '파티원'))); return; }
  const act0 = PARTY_ACTS[rng.randiRange(0, PARTY_ACTS.length - 1)], amount = rng.randiRange(10, 40), giver = String(names[uids[a]] || '파티원'), taker = String(names[uids[b]] || '파티원'), at = Number(trip.started || 0) + Number(trip.paused_total || 0) + step * LA.STEP, key = act0[0]; let shown = amount;
  if (uids[b] === me) { if (key === 'hp') { shown = Math.max(1, Math.trunc(Number(S.P.max_hp) * amount / 100)); S.P.hp = Math.min(Number(S.P.max_hp), Number(S.P.hp) + shown); } else S.P[key] = Math.max(0, Math.min(100, Number(S.P[key] || 0) + amount)); }
  /* 내가 주거나 받는 장면이면 두 사람이 서로 정한 관계로 장면을 고른다(준 사람 쪽 관계로 행동 문장, 받은 사람 쪽 관계로 반응 한 줄) */
  let line = String(act0[1]); const other = uids[a] === me ? uids[b] : (uids[b] === me ? uids[a] : ''); let grel = '', trel = '';
  if (other) { if (uids[a] === me) { grel = relWith(other); trel = relBackWith(other); } else { trel = relWith(other); grel = relBackWith(other); } }
  const rel = grel ? ({ mentor: 'pupil', pupil: 'mentor', savior: 'savior_back' }[grel] || grel) : trel; let reaction = '';
  if (isDict(RD.REL_LONG?.[rel]) && Array.isArray(RD.REL_LONG[rel][key])) { const pool = RD.REL_LONG[rel][key]; line = String(pool[rng.randiRange(0, pool.length - 1)]); }
  if (grel && Array.isArray(RD.LONG_REACT?.[trel])) { const rp = RD.LONG_REACT[trel]; reaction = ' ' + String(rp[rng.randiRange(0, rp.length - 1)]).replace('{T}', eunJ(taker)).replace('{G}', giver); }
  laAppend(trip, at, 'party', line.replace('{A}', iga(giver)).replace('%s', taker) + reaction + ` (${act0[2]} +${shown}${key === 'hp' && uids[b] !== me ? '%' : ''})`); }
function longAutoHeal() { const p = S.P; if (p.dead || !nonEmpty(p.long_expedition) || !((p.notify_settings || {}).long_auto_heal ?? true)) return false; let used = false;
  for (let g = 0; g < 3; g++) { const mx = Math.max(1, Number(p.max_hp)), hp = Number(p.hp); if (hp / mx >= M.LONG_HEAL_AT) break; const missing = mx - hp;
    let items = Object.keys(p.inventory || {}).filter((n) => count(n) > 0 && isHealItem(n) && Number(GD.ITEMS[n]?.hp || 0) > 0 && !GD.ITEMS[n]?.pet_only);
    if (!items.length) { if (!p.long_heal_warned) { p.long_heal_warned = true; nhAdd(`long-heal-none-${Number(p.long_expedition.started || 0)}`, '장기 탐사 · 회복품 없음', `체력이 ${Math.trunc(M.LONG_HEAL_AT * 100)}% 아래인데 가방에 쓸 회복품이 없습니다.`, 'danger'); } break; }
    items = godotSortLess(items, (a, b) => Number(GD.ITEMS[a].hp) < Number(GD.ITEMS[b].hp)); let pick = items[items.length - 1];
    if (hp / mx >= M.LONG_HEAL_URGENT) { for (const n of items) if (Number(GD.ITEMS[n].hp) <= missing) pick = n; if (Number(GD.ITEMS[pick].hp) > missing) pick = items[0]; }
    const before = hp; removeItem(pick, 1); const it = GD.ITEMS[pick]; heal(Math.trunc(it.hp)); treatConditions(pick); grantPositive(pick); statesOnConsume(it); p.long_heal_warned = false;
    gLog(`[color=#3fd0a4]장기 탐사 자동 회복[/color]  ${pick} × 1 · 체력 ${before} → ${p.hp}`); used = true; }
  return used; }
function treatConditions(item) { const st = S.P.conditions || {}, now = nowSec(); for (const id of (ED.TREATMENTS[item] || [])) delete st[id]; for (const id in (ED.REDUCERS[item] || {})) if (st[id]) { st[id].until = Math.max(now, Number(st[id].until) - Math.round(Number(ED.REDUCERS[item][id]) * Number(st[id].scale ?? 1))); if (Number(st[id].until) <= now) delete st[id]; } S.P.conditions = st; }
function statesOnConsume(it) { lightMark(); if (it.hunger != null && Number(it.hunger) > 0 && Number(S.P.hunger) >= 90) grantState('well_fed', 600, '든든한 식사'); if (it.water != null && Number(it.water) > 0 && Number(S.P.water) >= 90) grantState('hydrated', 600, '충분한 수분'); }
/* long_expedition_auto.tick — 20분 구간마다 전투 또는 위험 사건(구간 번호로 정한 씨앗이라 어디서 열어도 같은 결과) */
function laTick() { const p = S.P; if (!nonEmpty(p.long_expedition)) return false; const trip = p.long_expedition; laEnsure(trip); if ((trip.member_uids || []).length >= 2) refreshRelBack(); if (trip.halted || trip.aborted) return false;
  let changed = false;
  if (trip.combat_paused || (nonEmpty(p.battle) && String(p.battle.source || '') === 'long')) { /* 예전 기록: 멈춘 수동 전투를 자동 전투로 */
    const was = !!trip.combat_paused; if (was) { const pause = Math.max(0, nowSec() - Number(trip.paused_at ?? nowSec())); trip.ready = Number(trip.ready ?? nowSec()) + pause; trip.paused_total = Number(trip.paused_total || 0) + pause; }
    const paused = clone(p.battle || {}); p.battle = {}; trip.combat_paused = false; delete trip.paused_at; laAppend(trip, nowSec(), 'resume', '이전에 멈춘 조우를 자동 전투로 전환했습니다. 전투 대기시간은 탐사 시간에서 제외됩니다.'); changed = true;
    if (nonEmpty(paused)) laSimulate(trip, paused, new GRng(Number(trip.risk_seed || 0) + Number(trip.risk_step || 0) * 7919 + 97));
    if (!nonEmpty(p.long_expedition) || trip.halted) return changed; }
  const steps = Math.min(Math.trunc(tripElapsed(trip) / LA.STEP), Math.max(0, Math.trunc(Number(trip.hours ?? 1) * 3600 / LA.STEP) - 1)); let processed = 0;
  while (Number(trip.risk_step || 0) < steps && processed < LA.MAX_STEPS) { processed++; const step = Number(trip.risk_step || 0) + 1;
    trip._step_at = Number(trip.started || 0) + Number(trip.paused_total || 0) + step * LA.STEP; trip.risk_step = step; laActionLog(trip, step); laParty(trip, step);
    if (longAutoHeal()) laAppend(trip, Number(trip.started || 0) + step * LA.STEP, 'heal', `가방의 회복품을 자동으로 사용했습니다 · 체력 ${S.P.hp}/${S.P.max_hp}`);
    const rng = new GRng(Number(trip.risk_seed || 0) + step * 7919);
    if (rng.randf() < longCombatChance(Number(S.P.level ?? 1), Number(trip.recommended ?? S.P.level ?? 1))) { const c = laMakeCombat(trip, rng); if (nonEmpty(c)) { laSimulate(trip, c, rng); changed = true; } if (!nonEmpty(S.P.long_expedition) || trip.halted) break; continue; }
    laHazard(trip, rng); changed = true; if (!nonEmpty(S.P.long_expedition) || trip.halted) break; }
  return changed; }
function haltLongTrip() { const t = S.P.long_expedition; if (!nonEmpty(t) || nowSec() >= Number(t.ready || 0)) return; t.halted = true; t.halted_at = nowSec(); notify(`long-halt-${Number(t.started)}`, '체력 위험 · 장기 탐사 중단', '추가 위험 사건을 멈췄습니다. 장기 탐사 화면에서 긴급 복귀하거나 치료를 요청하세요.', 'danger'); }
function longOverdueFix() { const t = S.P.long_expedition; if (!nonEmpty(t) || nowSec() < Number(t.ready || 0) || t.aborted) return false; let ch = false;
  if (t.combat_paused) { t.combat_paused = false; delete t.paused_at; ch = true; t.risk_step = Math.max(Number(t.risk_step || 0), Number(t.hours || 1) * 3); if (nonEmpty(S.P.battle) && String(S.P.battle.source || '') === 'long') { S.P.battle = {}; S.P.buffs = {}; } }
  if (t.halted) { gLog('[color=#e3b341]장기 탐사 시간 종료[/color] · 중단된 시점까지 한 만큼 보상을 정산합니다.'); abortLongTrip(true); return true; }
  if (ch) gLog('[color=#3fd0a4]장기 탐사 시간 종료[/color] · 보상을 받을 수 있습니다.'); return ch; }
function startLongExplore(hours) { const p = S.P, gi = hereRegion();
  if (![1, 2, 3, 4].includes(hours) || p.dead || activityBusy() || nonEmpty(p.battle)) return false; if (fieldWaitLeft() > 0) { toast(`${String(p.field_rest_kind || '전투') === '탐사' ? '탐사 후' : '전투 후'} 쉬어야 합니다.`); return false; }
  if (incapacitated() || activeConds().includes('bleeding') || activeConds().includes('infection')) { toast('사기와 출혈/감염을 먼저 회복하세요.'); return false; } lightMark();
  if (Number(p.level) < Number(WD.REALMS[Number(GD.REGIONS[gi].realm)].level) || Number(p.level) + 3 < Number(GD.REGIONS[gi].min_level)) { toast('이 지역의 진입 레벨이 부족합니다.'); return false; }
  if (Number(p.hunger) < hours * 10 || Number(p.water) < hours * 12) { toast('시간당 허기 10/수분 12가 필요합니다.'); return false; }
  p.hunger = Number(p.hunger) - 10 * hours; p.water = Number(p.water) - 12 * hours; p.long_expedition = longRecord(hours, gi, LONG.diff, nowSec(), nowSec() + hours * 3600); laEnsure(p.long_expedition);
  gLog(`장기 탐사 출발 · ${p.long_expedition.name} · ${hours}시간 · 권장Lv.${p.long_expedition.recommended}`); FD.openLongLog = true; return true; }
function abortLongTrip(force) { const p = S.P; if (!nonEmpty(p.long_expedition) || (Number(p.hp) > guardHpFloor() && !force && !p.long_expedition.halted)) return false; if (p.long_expedition.aborted) return claimLongExplore();
  const t = p.long_expedition; let spent = tripElapsed(t); if (t.halted && Number(t.halted_at || 0) > 0) spent = Math.min(spent, Math.max(0, Number(t.halted_at) - Number(t.started) - Number(t.paused_total || 0)));
  if (spent >= Number(t.hours) * 3600) { t.halted = false; delete t.halted_at; t.aborted = false; t.ready = Math.min(Number(t.ready), nowSec()); return claimLongExplore(); }
  const fr = Math.max(0, Math.min(1, spent / Math.max(1, Number(t.hours) * 3600))); t.settled_secs = spent; t.xp = Math.trunc(Number(t.xp) * fr); t.money = Math.trunc(Number(t.money) * fr); const items = {};
  for (const n in t.items) { if (spent < 7200 && (t.rare_names || []).includes(n)) continue; const q = Math.trunc(Number(t.items[n]) * fr); if (q > 0) items[n] = q; }
  t.items = items; t.ready = nowSec(); t.aborted = true; if (String(t.tripId || '')) call('leavePartyTrip', String(t.tripId)); if (!t.halted || Number(t.halted_at || 0) <= 0) t.halted_at = nowSec(); t.halted = true; return claimLongExplore(); }
function claimLongExplore() { const p = S.P; if (!nonEmpty(p.long_expedition)) return false; longOverdueFix(); laTick();
  if (!nonEmpty(p.long_expedition) || p.long_expedition.combat_paused || nonEmpty(p.battle) || Number(p.long_expedition.ready) > nowSec()) return false;
  beginResult(); const trip = clone(p.long_expedition);
  if (Number(trip.reward_version || 0) < 8 && Number(trip.hours) >= 2) for (let i = 0; i < (Number(trip.hours) === 4 ? 2 : 1); i++) { const r = weightedRare(); trip.items[r] = Number(trip.items[r] || 0) + 1; }
  const mates = Math.max(1, Number(trip.members ?? 1));
  if (mates >= 2 && !trip.party_bonus_done) { const pb = 1 + 0.1 * Math.min(mates - 1, 3); trip.xp = Math.trunc(Number(trip.xp) * pb); trip.money = Math.trunc(Number(trip.money) * pb); trip.party_bonus_done = true; if (!trip.aborted || Number(trip.settled_secs || 0) >= 3600) { const ex = weightedRare(); trip.items[ex] = Number(trip.items[ex] || 0) + 1; } gLog(`[color=#3fd0a4]파티 보너스[/color]  함께 간 ${mates}명 · 경험치 · 금액 +${Math.trunc((pb - 1) * 100)}% · 희귀 보상 1개`); }
  const lday = Math.floor((kstNow() - 6 * 3600) / 86400); if (Number(p.long_day ?? -1) !== lday) { p.long_day = lday; p.long_day_hours = 0; }
  const done = Number(trip.settled_secs ?? Number(trip.hours) * 3600) / 3600, fullLeft = Math.max(0, 12 - Number(p.long_day_hours || 0));
  if (done > fullLeft && done > 0) { const keep = (fullLeft + (done - fullLeft) * 0.6) / done; trip.xp = Math.trunc(Number(trip.xp) * keep); trip.money = Math.trunc(Number(trip.money) * keep); gLog('[color=#e3b341]장기 탐사 하루 한도[/color]  오늘 12시간을 넘은 부분은 보상 60%'); }
  p.long_day_hours = Number(p.long_day_hours || 0) + done;
  if (!trip.pet_help_done) { trip.pet_help_done = true; petLongHelp(trip, done); }
  if (Number(trip.auto_version || 0) >= 1) { const sm = trip.auto_summary || {}; p.long_auto_result = { encounters: Number(sm.encounters || 0), wins: Number(sm.wins || 0), withdrawals: Number(sm.withdrawals || 0), kills: Number(sm.kills || 0), turns: Number(sm.turns || 0), damage_taken: Number(sm.damage_taken || 0), damage_dealt: Number(sm.damage_dealt || 0), evades: Number(sm.evades || 0), critical_hits: Number(sm.critical_hits || 0), bonus_xp: Number(sm.bonus_xp || 0), bonus_money: Number(sm.bonus_money || 0), final_hp: Number(p.hp || 0), halted: !!trip.halted }; }
  const hist = Array.isArray(p.long_history) ? p.long_history : []; let itemN = 0; for (const k in trip.items) itemN += Number(trip.items[k]);
  if (!trip.aborted) { questEvent('long_done'); if (Number(trip.difficulty || 0) >= 3) questEvent('long_hard'); if (Number(trip.members ?? 1) >= 2) questEvent('party_long'); }
  const qh = Math.trunc(Number(trip.settled_secs ?? Number(trip.hours ?? 1) * 3600) / 3600); if (qh > 0) questEvent('long_hours', qh);
  hist.unshift({ name: String(trip.name || ''), hours: Number(trip.hours ?? 1), started: Number(trip.started || 0), ended: nowSec(), xp: Number(trip.xp || 0), money: Number(trip.money || 0), items: itemN, aborted: !!trip.aborted, secs: Number(trip.settled_secs ?? Number(trip.hours ?? 1) * 3600), members: Number(trip.members ?? 1), difficulty: Number(trip.difficulty || 0) });
  p.long_history = hist.slice(0, 30); p.long_expedition = {}; p.money = Number(p.money) + Number(trip.money); addXp(Number(trip.xp));
  const stored = p.stored_loot || {}; for (const it in trip.items) { markFoundGear(it, Number(trip.items[it])); if (!addItem(it, Number(trip.items[it]))) stored[it] = Number(stored[it] || 0) + Number(trip.items[it]); else gLog(`장기 보상  [${cat(it).grade}] ${it} × ${trip.items[it]}`); } p.stored_loot = stored; p.at_hub = true;
  { const t2 = trip, el = (() => { let e = Math.max(0, Number(t2.ready || 0) - Number(t2.started || 0) - Number(t2.paused_total || 0)); if (t2.halted) e = Math.min(e, Math.max(0, Number(t2.halted_at ?? t2.started) - Number(t2.started) - Number(t2.paused_total || 0))); return e; })(), hrs = Math.max(0, Math.min(Math.min(Number(t2.hours || 0), Math.trunc(el / 3600)), 4)), region = Number(t2.region ?? -1);
    if (!p.dead && hrs > 0 && region >= 0 && region < GD.REGIONS.length) { const lv = Number(GD.REGIONS[region].min_level);
      { const rng = new GRng(Number(BigInt.asIntN(64, BigInt(Number(t2.risk_seed || 0)) ^ BigInt(Number(t2.started || 0)) ^ BigInt(region * 13007 + 170003)))), found = {}; for (let h = 0; h < hrs; h++) for (const n of exRoll(lv, rng, true)) found[n] = Number(found[n] || 0) + 1; for (const n in found) { awardItem(n, found[n]); gLog(`장기 신규 보급품 · [${cat(n).grade}] ${n} × ${found[n]}`); } }
      { const rng = new GRng(Number(BigInt.asIntN(64, BigInt(Number(t2.risk_seed || 0)) ^ BigInt(Number(t2.started || 0)) ^ 2206669n))), out = {}; for (let h = 0; h < hrs; h++) { const f = u21Roll(lv, 'urban', rng, true); for (const n in f) out[n] = Number(out[n] || 0) + f[n]; } for (const n in out) { awardItem(n, out[n]); gLog(`장기 추가 보급품 · ${itemDisplay(n)} × ${out[n]}`); } } } }
  { /* coin_data.award_long */ p.coins = Math.max(0, Number(p.coins || 0)); if (!trip.coin_rewarded) { trip.coin_rewarded = true; if (!p.dead && !trip.aborted) { let worked; if (trip.halted) { let until = Number(trip.ready ?? trip.started); until = Math.min(until, Number(trip.halted_at ?? trip.started)); if (trip.combat_paused) until = Math.min(until, Number(trip.paused_at ?? until)); worked = Math.max(0, until - Number(trip.started || 0) - Math.max(0, Number(trip.paused_total || 0))); } else worked = tripElapsed(trip);
      const hrs = Math.max(0, Math.min(Math.min(Number(trip.hours || 0), Math.trunc(worked / 3600)), 4)); if (Number(p.level || 1) >= 5 && hrs >= 1) { let gained = 0; for (let h = 0; h < hrs; h++) { const ch = gRandf(), am = gRandf(); if (Math.max(0, Math.min(1, ch)) < 0.35) gained += 1 + Math.max(0, Math.min(4, Math.floor(Math.max(0, Math.min(0.999999999, am)) * 5))); } if (gained > 0) { p.coins = Number(p.coins) + gained; gLog(`장기 탐사에서 코인 ${gained}개를 발견했다. (완료 ${hrs}시간)`); } } } } }
  gLog(`${trip.hours}시간 장기 탐사 복귀. 경험치 ${trip.xp}, ${won(trip.money)}을(를) 받았다.`);
  if (gRandf() < 0.04) inflictCondition('sprain'); tryMoveDrop(true);
  FD.back = 'hub'; endResult('장기 탐사 결과', String(trip.name));
  if (trip.auto_away) longAwayNotice(trip);
  if (nonEmpty(p.long_auto_result) && nonEmpty(p.last_result)) { p.long_auto_result.final_hp = Number(p.hp || 0); p.last_result.auto_summary = p.long_auto_result; p.long_auto_result = {}; }
  return true; }
/* v37.72: 접속하지 않은 동안 끝난 장기 탐사 — 다시 들어왔을 때 '장기 탐사 완료'를 꼭 알립니다(결과 창을 꺼 두었으면 이 알림이 창으로 뜸) */
function longAwayNotice(trip) { const r = S.P.last_result || {}, parts = [`경험치 ${comma(r.xp ?? trip.xp)}`, won(Number(r.money ?? trip.money))]; if (Number(r.coins || 0) > 0) parts.push(`코인 ${comma(r.coins)}`);
  const id = `long-away-${Number(trip.started || 0)}`, title = '장기 탐사 완료', body = `접속하지 않은 동안 장기 탐사(${trip.name || '지역'} · ${Number(trip.hours || 1)}시간)가 끝나 보상을 자동으로 받았습니다.\n${parts.join(' · ')}\n자세한 내용은 기록 › 장기 탐사에서 볼 수 있습니다.`;
  if (FD.showResult) nhAdd(id, title, body, 'loot'); else notify(id, title, body, 'loot'); }
/* 1초마다(main._long_tick) */
function longTickCore() { const p = S.P; if (!nonEmpty(p.long_expedition)) return ''; let ch = longOverdueFix(); if (!nonEmpty(p.long_expedition)) return 'claimed'; if (longAutoHeal()) ch = true; if (laTick()) ch = true; if (!nonEmpty(p.long_expedition)) return 'changed';
  const t = p.long_expedition; if (!t.halted && !t.aborted && Number(t.ready || 0) <= nowSec() && !p.dead) { laAppend(t, nowSec(), 'complete', '탐사 시간을 모두 채웠습니다. 보상을 자동 정산합니다.'); if (nowSec() - Number(t.ready || 0) >= 60) t.auto_away = true; if (FD.noAutoClaim) return 'changed'; claimLongExplore(); return 'claimed'; }
  return ch ? 'changed' : ''; }
function longTick() { if (!S.P || $('app').hidden || LIVE.saving || LIVE.lost || !nonEmpty(S.P.long_expedition)) return; if (FD.longBusy) return; const pre = clone(S.P), r = longTickCore(); if (!r) return; const after = S.P; S.P = pre; FD.longBusy = true; act(() => { S.P = after; return true; }, afterField).finally(() => { FD.longBusy = false; }); }
function travelTick() { if (!S.P || $('app').hidden || LIVE.saving || LIVE.lost || !nonEmpty(S.P.travel) || Number(S.P.travel.ready) > nowSec() || FD.travelBusy) return; FD.travelBusy = true; act(() => travelTickDue(), afterField).finally(() => { FD.travelBusy = false; }); }

/* ── 장기 탐사 화면(준비 · 진행 기록 · 지난 기록) ── */
function longPrepPage() {
  const gi = hereRegion(), r = GD.REGIONS[gi], minT = Math.max(1, Number(r.min_level) - 3);
  let h = headT('장기 탐사 준비', '정산된 시간만 하루 12시간 한도에 들어갑니다');
  const tgt = longTarget(gi, LONG.diff), risk = longRisk(Number(S.P.level), tgt, 1, isNight()), fight = longCombatChance(Number(S.P.level), tgt), rec = (() => { const save = GR; GR = new GRng(1); const t = longRecord(LONG.hours, gi, LONG.diff, 0, 0); GR = save; return t; })();
  h += `<div class="panel lprep"><small>탐사 지역</small><b style="color:var(--accent);font-size:16px">${esc(r.name)}</b><small>난이도 · 권장 레벨</small><div class="pills">${[[-3, '쉬움'], [0, '보통'], [3, '위험'], [5, '극한']].map(([d, n]) => `<button class="pill ${LONG.diff === d ? 'on' : ''}" data-ldiff="${d}" style="${d > 0 && LONG.diff !== d ? 'color:var(--warning)' : ''}">${n} · Lv.${Math.max(minT, Math.min(100, Number(S.P.level) + d))}</button>`).join('')}</div>
    <p class="muted" style="font-size:12px">20분마다 전투 ${Math.round(fight * 100)}% · 그 밖의 위험 사건 ${Math.round(risk.event * 100)}% · 사건 중 치명상 ${(risk.lethal * 100).toFixed(1)}% · 같은 대지역에 모여야 파티와 출발할 수 있습니다.</p>
    <small>탐사 시간</small><div class="pills">${[1, 2, 3, 4].map((x) => `<button class="pill ${LONG.hours === x ? 'on' : ''}" data-lhours="${x}" style="min-width:84px">${x}시간</button>`).join('')}</div>
    <div class="ltiles">${[['예상 경험치', '+' + rec.xp, ''], ['예상 소지금', '+' + won(rec.money), 'var(--warning)'], ['허기 · 수분 소모', `-${10 * LONG.hours} · -${12 * LONG.hours}`, '']].map(([a, b, c]) => `<div><small>${a}</small><b style="${c ? 'color:' + c : ''}">${b}</b></div>`).join('')}</div>
    <div class="lwarn">탐사 중에는 다른 활동을 할 수 없고, 도중에 멈추면 진행한 시간만큼만 정산됩니다. 체력이 바닥나면(신규 보호 중에는 5 이하) 탐사가 멈춥니다.</div>
    <button class="btn primary" id="lGo" style="min-height:52px" ${fieldWaitLeft() === 0 && !activityBusy() ? '' : 'disabled'}>장기 탐사 출발 · ${LONG.hours}시간</button></div>`;
  return h;
}
function bindLongPrep() { const c = $('center'); c.querySelectorAll('[data-ldiff]').forEach((b) => { b.onclick = () => { LONG.diff = Number(b.dataset.ldiff); drawCenter(); }; }); c.querySelectorAll('[data-lhours]').forEach((b) => { b.onclick = () => { LONG.hours = Number(b.dataset.lhours); drawCenter(); }; }); const g = $('lGo'); if (g) g.onclick = () => confirmLong(LONG.hours); }
function confirmLong(hours) {
  const gi = hereRegion(), r = GD.REGIONS[gi], tgt = longTarget(gi, LONG.diff), risk = longRisk(Number(S.P.level), tgt, 1, isNight()), steps = hours * 3, ev = risk.event, le = risk.lethal, anyE = 1 - Math.pow(1 - ev, steps), anyL = 1 - Math.pow(1 - ev * le, steps), fight = longCombatChance(Number(S.P.level), tgt), fs = Math.max(1, steps - 1);
  const rows = [['걸리는 시간', `${hours}시간 · 끝나는 시각 ${kstStamp(nowSec() + hours * 3600)}\n접속을 끊어도 흐릅니다`], ['권장 레벨', `Lv.${tgt} (내 레벨 Lv.${S.P.level} · 난이도 ${sgn(LONG.diff)})`],
    ['전투 조우', `20분마다 ${Math.round(fight * 100)}% · 전체 약 ${(fight * fs).toFixed(1)}회\n${tgt === Number(S.P.level) ? '적정 레벨 기준' : tgt > Number(S.P.level) ? '내 레벨보다 높아 조우가 잦습니다' : '내 레벨보다 낮아 조우가 드뭅니다'}`],
    ['위험 사건', `20분마다 ${Math.round(ev * 100)}% · 전체 약 ${(ev * steps).toFixed(1)}회\n한 번 이상 겪을 확률 ${Math.round(anyE * 100)}%`], ['치명상 위험', `사건 중 ${(le * 100).toFixed(1)}% · 탐사 전체 약 ${(anyL * 100).toFixed(1)}%`], ['준비물', `출발할 때 허기 -${10 * hours} · 수분 -${12 * hours}`], ['보상', hours >= 2 ? '2시간 이상이라 경험치 +15% · 희귀 보상 기회' : '1시간은 기본 보상만 (희귀 보상 없음)']];
  modal(`장기 탐사 · ${r.name} · ${hours}시간`, kvRows(rows).replace(/<b>/g, '<b style="white-space:pre-line">') + (anyL >= 0.15 ? '<p style="color:var(--danger)">위험이 큰 코스입니다. 체력·회복품을 넉넉히 챙기거나 난이도를 낮추세요.</p>' : '') + (guardActive() ? '<p style="color:var(--accent)">신규 생존자 보호 중이라 체력이 5 아래로 내려가지 않습니다.</p>' : ''), []);
  const box = $('mBtns'); box.className = 'mrow'; const no = document.createElement('button'); no.className = 'btn'; no.textContent = '취소'; no.onclick = () => { $('modalRoot').innerHTML = ''; };
  const yes = document.createElement('button'); yes.className = 'btn primary'; yes.textContent = '출발하기'; yes.onclick = () => { $('modalRoot').innerHTML = ''; act(() => startLongExplore(hours), () => { go('long_wait'); if (FD.openLongLog) { FD.openLongLog = false; longLogModal(); } }); }; box.append(no, yes);
}
const LKIND = { start: 'var(--accent)', progress: 'var(--muted)', encounter: 'var(--danger)', attack: 'var(--text)', hit: 'var(--danger)', evade: 'var(--blue)', victory: 'var(--accent)', withdraw: 'var(--warning)', hazard: 'var(--warning)', safe: 'var(--muted)', halt: 'var(--danger)', death: 'var(--danger)', heal: 'var(--accent)', party: '#f0c674', complete: 'var(--accent)', resume: 'var(--blue)', skip: 'var(--muted)' };
function longLogModal() { const t = S.P.long_expedition; if (!nonEmpty(t)) return; const log = (t.auto_log || []).slice(-80);
  modal('장기 탐사 진행 기록', `<p class="muted" id="llTime">${esc(t.name || '')} · ${t.halted ? '중단 · 긴급 복귀 대기' : '남은 ' + durationText(Math.max(0, Number(t.ready) - nowSec()))} · 체력 ${S.P.hp} / ${S.P.max_hp}</p><div class="rlist" id="llBox">${log.map((e) => `<p class="rn"><span class="subtle">${clockOf(Number(e.at))}</span>  <span style="color:${LKIND[e.kind] || 'var(--text)'}">${esc(e.text)}</span></p>`).join('') || '<p class="muted">아직 기록이 없습니다.</p>'}</div>`);
  const b = $('llBox'); if (b) b.scrollTop = b.scrollHeight; }
const clockOf = (epoch) => { const t = (epoch + 32400) % 86400; return String(Math.floor(t / 3600)).padStart(2, '0') + ':' + String(Math.floor(t % 3600 / 60)).padStart(2, '0'); };
function longHistoryPage() {
  const hist = Array.isArray(S.P.long_history) ? S.P.long_history : [], lday = Math.floor((kstNow() - 6 * 3600) / 86400), used = Number(S.P.long_day ?? -1) === lday ? Number(S.P.long_day_hours || 0) : 0;
  let h = headT('장기 탐사 기록', '지난 장기 탐사와 오늘 쓴 시간을 볼 수 있습니다');
  h += `<div class="lwcard lhero"><div><small>오늘 사용한 시간</small><b style="font-size:30px">${Number.isInteger(used) ? used : used.toFixed(1)}시간 <span class="muted" style="font-size:13px;font-weight:400">/ 12시간</span></b><div class="bar"><i style="width:${Math.min(12, used) / 12 * 100}%;background:var(--accent)"></i></div><span class="muted" style="font-size:12px">정산된 시간만 한도에 들어갑니다 · 06:00에 초기화</span></div><button class="btn primary" data-go="long_explore" style="min-height:50px">새 장기 탐사 준비</button></div>`;
  if (nonEmpty(S.P.long_expedition)) { const t = S.P.long_expedition; h += choiceRow('', `진행 중 · ${t.name || ''} · ${Number(t.hours || 1)}시간`, `남은 ${durationText(Math.max(0, Number(t.ready || 0) - nowSec()))} · 눌러서 진행 기록 보기`, 'var(--warning)', true, 'id="lhLog"'); }
  if (!hist.length) h += '<div class="note">아직 끝낸 장기 탐사가 없습니다.</div>';
  for (const x of hist) { const ab = !!x.aborted; h += `<div class="panel lhrow"><div><b>${esc(x.name || '')} · ${Number(x.hours || 1)}시간</b><span class="muted">${x.ended ? kstStamp(Number(x.ended)) : ''} · 난이도 ${sgn(Number(x.difficulty || 0))}${Number(x.members || 1) > 1 ? ` · ${x.members}명 동행` : ' · 혼자'}</span></div><span class="tagc" style="--c:${ab ? 'var(--warning)' : 'var(--accent)'}">${ab ? `중단 · ${durationText(Number(x.secs || 0))} 진행` : '완료'}</span><span class="rt">경험치 +${Number(x.xp || 0)} · ${won(Number(x.money || 0))} · 물품 ${Number(x.items || 0)}</span></div>`; }
  return h;
}
function confirmLongEarly() { const t = S.P.long_expedition; if (!nonEmpty(t)) return; const spent = tripElapsed(t), total = Math.max(1, Number(t.hours) * 3600), pct = Math.trunc(Math.max(0, Math.min(1, spent / total)) * 100);
  let msg = `지금 복귀하시겠습니까?\n\n진행 ${durationText(spent)} / ${durationText(total)} (${pct}%)\n경험치 · 금액 · 물품을 진행한 만큼(${pct}%)만 받습니다.`; if (spent < 7200) msg += '\n2시간 미만이라 희귀 보상은 받지 못합니다.'; msg += '\n복귀하면 이번 탐사는 끝나고 되돌릴 수 없습니다.';
  confirmModal('장기 탐사 중간 복귀', `<p style="white-space:pre-line;color:var(--text)">${esc(msg)}</p>`, '복귀하기', 'danger', () => act(() => { if (!nonEmpty(S.P.long_expedition) || nonEmpty(S.P.battle)) { toast('전투가 끝난 뒤에 복귀할 수 있습니다.'); return false; } gLog('[color=#e3b341]장기 탐사 중간 복귀[/color] · 진행한 시간만큼 보상을 정산합니다.'); return abortLongTrip(true); }, afterField)); }
function tripCompanyModal() { const t = S.P.long_expedition || {}; modal('함께 탐사 중', `<p>${tripMates(t).map((n) => esc(n)).join('<br>') || '혼자 탐사 중입니다.'}</p>`); }
/* 잠깐 눈 붙이기(main._rest · state_events.on_rest) */
function restNow() { const p = S.P; if (p.dead) return false; const wait = Number(p.rest_ready || 0) - Number(p.play_secs || 0); if (wait > 0) { toast(`아직 쉴 수 없습니다. 약 ${wait}초 뒤에 다시 쉴 수 있습니다.`); return false; }
  p.morale = Math.min(100, Number(p.morale) + 15); p.hunger = Math.max(0, Number(p.hunger) - 3); p.water = Math.max(0, Number(p.water) - 4);
  const hv = Math.round(Math.max(8, Math.round(Number(p.max_hp) * 0.1)) * cityMult('power')), hb = Number(p.hp); p.hp = Math.min(Number(p.max_hp), hb + hv); p.rest_ready = Number(p.play_secs || 0) + 180;
  lightMark(); if (p.conditions?.fatigue) { delete p.conditions.fatigue; gLog('[color=#3fd0a4]휴식[/color]  피로가 풀렸다.'); } if (gRandf() < 0.35) grantState(gPick(BD.V28_REST_POOL), 180, '충분한 휴식');
  questEvent('rest'); { const gi = hereRegion(); if (regionLit(gi)) questEvent('rest_facility'); }
  gLog(`[color=#6cb6ff]휴식[/color]  잠시 눈을 붙이고 마음을 추슬렀다. 사기 +15 · 체력 +${Number(p.hp) - hb} · 3분 뒤 다시 쉴 수 있다.`); return true; }
const HUB_ACT = { card1: () => go('story_menu'), auto: () => autoPicker(), long: () => go('long_explore'), card0: () => { USE.kind = 'hunger'; go('use_items'); }, card4: () => roomOpenMine(), card2: () => go('pets'), card5: () => act(() => restNow()) };

/* ════════ 제작 — workshop_ui(조합법 · 수량 · 즉시/3분 단위 · 추가 산출 · 분해) ════════ */
const CRAFT = { cat: '요리', page: 0, q: '', qty: {}, dsel: '', dqty: 1, mat: '' };
const CRAFT_EXTRA = { '파이프렌치': { need: { '고철': 3, '부품': 1 }, level: 1 }, '야구방망이': { need: { '목재': 4, '천': 1 }, level: 1 }, '철창': { need: { '고철': 5, '부품': 2 }, level: 6 }, '마체테': { need: { '고철': 7, '천': 2 }, level: 12 }, '가죽 재킷': { need: { '천': 6, '부품': 2 }, level: 6 }, '천 모자': { need: { '천': 2 }, level: 1 }, '작업 장갑': { need: { '천': 2, '고철': 1 }, level: 1 }, '부적 목걸이': { need: { '천': 1, '고철': 2 }, level: 1 }, '덧댄 작업복': { need: { '천': 5, '고철': 2 }, level: 2 }, '안전모': { need: { '고철': 4, '부품': 2 }, level: 3 }, '가죽 손보호대': { need: { '천': 3, '고철': 3 }, level: 3 }, '구리 반지': { need: { '고철': 6, '부품': 3 }, level: 6 }, '경량 방호복': { need: { '천': 8, '고철': 6, '부품': 4 }, level: 6 }, '방진 마스크': { need: { '천': 6, '고철': 3, '알코올': 2 }, level: 8 }, '전술 장갑': { need: { '천': 7, '고철': 7, '부품': 4 }, level: 12 }, '생존 도구 벨트': { need: { '천': 8, '고철': 6, '부품': 5 }, level: 12 }, '복합 방탄 조끼': { need: { '천': 12, '고철': 12, '부품': 8 }, level: 15 } };
let _recipes = null;
function allRecipes() { if (_recipes) return _recipes; const out = [];
  for (const n in GD.ITEMS) { const it = GD.ITEMS[n]; if (it.need) out.push({ name: n, kind: '조합', tier: Number(it.tier), level: Number(it.craft_level ?? it.level ?? tierLevel(it.tier)), need: it.need, result: { [n]: Number(it.out ?? 1) }, desc: String(it.desc || '') }); }
  for (const n in CRAFT_EXTRA) { if (!GD.ITEMS[n] && !GD.WEAPONS[n] && !GD.ARMORS[n]) continue; if (out.some((r) => r.name === n)) continue; const need = CRAFT_EXTRA[n].need; if (Object.keys(need).some((k) => !GD.ITEMS[k])) continue; out.push({ name: n, tier: 1, level: CRAFT_EXTRA[n].level, need: { ...need }, result: { [n]: 1 } }); }
  return (_recipes = out); }
const recipeFor = (n) => allRecipes().find((r) => r.name === n) || null;
function recipeCat(r) { const n = r.name; if (GD.ARMORS[n]) return '방어구'; if (GD.WEAPONS[n]) return '장비'; if (GEAR.ITEMS[n]) return ['방어구', '머리'].includes(String(GEAR.ITEMS[n].slot)) ? '방어구' : '장비';
  const d = GD.ITEMS[n] || {}; if (Number(d.hunger || 0) > 0 || Number(d.water || 0) > 0 || String(d.cat || '') === '음식') return '요리';
  if (String(d.cat || '') === '회복' || Number(d.hp || 0) > 0 || Number(d.morale || 0) > 0 || d.revive || d.panacea || d.vaccine || ED.TREATMENTS[n] || ED.REDUCERS[n] || BD.POSITIVE_ITEMS[n]) return '회복'; return '장비'; }
const reqLevel = (r) => Math.max(1, Math.ceil(Math.max(Number(r.level ?? 1), tierLevel(r.tier ?? 1)) * 0.6));
const craftDur = (q) => (q <= 1 ? 0 : Math.ceil(q / 10) * 180);
const craftTime = (q) => { const d = craftDur(q); return d <= 0 ? 0 : Math.max(1, Math.round(d * (1 - overflowOf(effStats(S.P.equipment || {})).craft / 100))); };
function canMake(r) { if (Number(S.P.level) < reqLevel(r)) return 0; let most = 100; for (const k in r.need) most = Math.min(most, Math.trunc(count(k) / Math.max(1, Number(r.need[k])))); return Math.max(0, most); }
const craftActive = () => nonEmpty(S.P.craft_job);
const needHave = (need) => Object.keys(need).map((k) => `${itemDisplay(k)} ${Number(need[k])} (보유 ${count(k)})`).join(', ');
const resultText = (res) => Object.keys(res).map((k) => `${itemDisplay(k)} × ${res[k]}`).join(', ');
function craftStart(name, q) { const p = S.P; if (!p.craft_job || typeof p.craft_job !== 'object') p.craft_job = {}; if (!p.stored_loot || typeof p.stored_loot !== 'object') p.stored_loot = {};
  const r = recipeFor(name); if (!r || q < 1 || q > 100 || craftActive() || activityBusy()) { toast('현재 활동을 마친 뒤 제작하세요.'); return false; }
  if (Number(p.level) < reqLevel(r)) { toast(`Lv.${reqLevel(r)}부터 제작할 수 있습니다.`); return false; }
  const need = {}; for (const k in r.need) need[k] = Number(r.need[k]) * q; for (const k in need) if (count(k) < need[k]) { toast('선택한 수량을 만들 재료가 부족합니다.'); return false; }
  for (const k in need) removeItem(k, need[k]); const out = {}; for (const k in r.result) out[k] = Number(r.result[k]) * q; let bonus = 0;
  for (let i = 0; i < q; i++) if (gRandf() * 100 < derived().craft_bonus) bonus++; if (bonus > 0) out[r.name] = Number(out[r.name] || 0) + bonus;
  const now = nowSec(), t = craftTime(q); p.craft_job = { id: `craft-${now}-${Math.floor(performance.now() * 1000)}`, name: r.name, quantity: q, started: now, ready: now + t, duration: t, result: out, bonus, need };
  gLog(`제작 시작 · ${r.name} ${q}회 · ${t === 0 ? '즉시' : durationText(t)}`); if (t === 0) craftTickDue(); else toast(`제작 시작 · ${r.name} × ${q}`); return true; }
function craftTickDue() { const p = S.P; if (!craftActive()) return false; const job = p.craft_job; if (Number(job.ready) > nowSec()) return false; p.craft_job = {}; const lines = [];
  for (const n in job.result) { const k = Number(job.result[n]), ok = addItem(n, k); if (!ok) p.stored_loot[n] = Number(p.stored_loot[n] || 0) + k; lines.push(`${n} × ${k}${ok ? '' : ' · 받은 물품함에 보관'}`); }
  questEvent('craft', 1); const qr = recipeFor(String(job.name)); if (qr) { const c = recipeCat(qr); if (c === '요리') questEvent('cook'); else if (c === '회복') questEvent('craft_med'); }
  gLog('제작 완료 · ' + lines.join(' / ')); nhAdd(String(job.id), '제작 완료 · ' + job.name, lines.join('\n') + (Number(job.bonus) > 0 ? `\n추가 산출 ${job.bonus}개` : ''), 'loot'); return true; }
function craftTick() { if (!S.P || $('app').hidden || LIVE.saving || LIVE.lost || !craftActive() || Number(S.P.craft_job.ready) > nowSec() || FD.craftBusy) return; FD.craftBusy = true; act(() => craftTickDue()).finally(() => { FD.craftBusy = false; }); }
function craftPage() {
  let h = headT('제작', '1개는 즉시 · 2~10개는 3분 · 이후 10개마다 3분 추가');
  if (craftActive()) { const j = S.P.craft_job, r = recipeFor(String(j.name)), wk = r ? recipeCat(r) : '', col = wk === '요리' ? 'var(--warning)' : wk === '회복' ? 'var(--accent)' : 'var(--blue)', left = Math.max(0, Number(j.ready) - nowSec());
    h += `<div class="panel cjob"><small style="color:${col}">${wk === '요리' ? '요리 중' : wk === '회복' ? '회복품 제작 중' : '제작 중'}</small><b>${esc(itemDisplay(String(j.name)))} ${Number(j.quantity)}개</b><div class="bar"><i data-livebar="craft" style="width:${Number(j.duration) <= 0 ? 100 : Math.max(0, Math.min(100, 100 * (1 - left / Number(j.duration))))}%;background:${col}"></i></div>${actView(wk === '요리' ? 'cook' : wk === '회복' ? 'medicine' : 'craft', j.started)}<span class="muted" data-live="craft" style="font-size:12px">남은 ${durationText(left)} · 완료 ${kstStamp(Number(j.ready)).slice(6)}</span></div>
      <div class="note">재료는 제작을 시작할 때 맡깁니다. 창을 닫거나 재접속해도 완료 시각은 유지됩니다. 가방이 가득 차면 완성품은 받은 물품함에 남습니다.</div>`; }
  if (!CRAFT.mat) h += `<div class="pills" style="margin-bottom:12px">${['요리', '회복', '장비', '방어구', '분해'].map((c) => `<button class="pill ${CRAFT.cat === c ? 'on' : ''}" data-ccat="${c}">${c}</button>`).join('')}</div>`;
  const busy = craftActive() || activityBusy();
  if (CRAFT.cat === '분해' && !CRAFT.mat) return h + dismantleList(busy);
  let rows;
  if (CRAFT.mat) { h += infoBox(josaFix(`'${CRAFT.mat}'(으)로 만들 수 있는 것`), `보유 ${count(CRAFT.mat)}개 · 모든 종류에서 찾았습니다.`) + choiceRow('', '전체 제작 목록으로', '', 'var(--blue)', true, 'id="cMatClear"'); rows = allRecipes().filter((r) => CRAFT.mat in (r.need || {})); }
  else { h += `<input class="csearch" id="cSearch" placeholder="제작법 이름 검색 (Enter)" enterkeyhint="search" value="${esc(CRAFT.q)}">`; rows = allRecipes().filter((r) => recipeCat(r) === CRAFT.cat && (!CRAFT.q || r.name.includes(CRAFT.q))); }
  rows = godotSort(rows.slice(), (a, b) => { const ca = canMake(a) > 0, cb = canMake(b) > 0; if (ca !== cb) return ca; if (reqLevel(a) !== reqLevel(b)) return reqLevel(a) < reqLevel(b); return a.name < b.name; });
  const pages = Math.max(1, Math.ceil(rows.length / 16)); CRAFT.page = Math.max(0, Math.min(pages - 1, CRAFT.page));
  if (S.mobile || pages > 1) h += `<p class="muted" style="font-size:12px">${rows.length}종 · ${CRAFT.page + 1} / ${pages}쪽</p>`;
  for (const r of rows.slice(CRAFT.page * 16, CRAFT.page * 16 + 16)) { const most = canMake(r), ok = most > 0 && !busy, req = reqLevel(r), outN = Number(r.result[r.name] ?? 1), top = Math.max(1, most), opts = [1, 2, 3, 5, 10, 20, 50].filter((n) => n < top).concat([top]);
    const want = Math.max(1, Math.min(top, Number(CRAFT.qty[r.name] || 1))); let sel = opts[0]; for (const o of opts) if (o <= want) sel = o;
    h += `<div class="panel crow ${most > 0 ? '' : 'dim'}" style="--c:${most > 0 ? gradeColor(r.name) : 'var(--line)'}"><div class="tx"><b>${esc(itemDisplay(r.name))}${outN > 1 ? ` ×${outN}` : ''} · Lv.${req}</b><span style="color:${most <= 0 && Number(S.P.level) >= req ? 'var(--warning)' : 'var(--muted)'}">${Number(S.P.level) < req ? `Lv.${req}부터 · ` : ''}${esc(needHave(r.need))}</span>${cat(r.name).effect ? `<span class="subtle">${esc(cat(r.name).effect)}</span>` : ''}</div>
      <select class="qsel" data-cq="${esc(r.name)}" ${ok ? '' : 'disabled'}>${opts.map((n) => `<option value="${n}" ${n === sel ? 'selected' : ''}>${n}개</option>`).join('')}</select><button class="btn ${ok ? 'primary' : ''}" data-cmake="${esc(r.name)}" ${ok ? '' : 'disabled'}>제작</button></div>`; }
  if (!rows.length) h += '<div class="note">해당하는 제작법이 없습니다.</div>';
  if (CRAFT.page > 0) h += choiceRow('', '이전 쪽', '', 'var(--blue)', true, 'data-cpage="-1"'); if (CRAFT.page + 1 < pages) h += choiceRow('', '다음 쪽', '', 'var(--blue)', true, 'data-cpage="1"');
  return h; }
function dismantleList(busy) { let h = '';
  if (CRAFT.dsel && GD.DISMANTLE[CRAFT.dsel]) { const n = CRAFT.dsel, av = Math.max(0, count(n) - (isWorn(n) ? 1 : 0)); h += `<div class="panel info"><b>${esc(itemDisplay(n))}</b><span class="muted">보유 ${count(n)} · 분해 가능 ${av} · 장착 중인 1개는 남겨 둡니다.</span></div>`;
    if (av > 0) { CRAFT.dqty = Math.max(1, Math.min(Math.min(999, av), CRAFT.dqty)); const res = {}; for (const k in GD.DISMANTLE[n]) res[k] = Number(GD.DISMANTLE[n][k]) * CRAFT.dqty;
      h += `<label class="spin"><input type="number" id="dQty" min="1" max="${Math.min(999, av)}" value="${CRAFT.dqty}"></label><p class="muted" id="dPrev">${CRAFT.dqty}개 분해 → ${esc(resultText(res))}<br>가방이 가득 차면 재료를 받은 물품함으로 보냅니다.</p>` + choiceRow('', '선택 수량 분해', '확정하면 장비가 재료로 바뀝니다. 선택하지 않은 물품은 유지합니다.', 'var(--warning)', !busy, 'id="dGo"'); }
    else h += '<div class="note">장착을 해제하거나 여분을 준비한 뒤 분해하세요.</div>';
    return h + choiceRow('', '분해 목록으로', '', 'var(--blue)', true, 'data-dsel=""'); }
  let any = false; for (const n in (S.P.inventory || {})) { if (!GD.DISMANTLE[n]) continue; any = true; h += choiceRow('', itemDisplay(n) + ' 분해 수량 선택', `보유 ${count(n)} · 분해 가능 ${Math.max(0, count(n) - (isWorn(n) ? 1 : 0))} · 1개당 ${resultText(GD.DISMANTLE[n])}`, 'var(--warning)', !busy, `data-dsel="${esc(n)}"`); }
  if (!any) h += '<div class="note">지금 분해할 수 있는 물품이 없습니다. 장착 중인 1개는 분해하지 않습니다.</div>'; return h; }
function bindCraft() { const c = $('center');
  c.querySelectorAll('[data-ccat]').forEach((b) => { b.onclick = () => { CRAFT.cat = b.dataset.ccat; CRAFT.page = 0; CRAFT.q = ''; CRAFT.dsel = ''; drawCenter(); }; }); { const mc = $('cMatClear'); if (mc) mc.onclick = () => { CRAFT.mat = ''; CRAFT.page = 0; drawCenter(); }; }
  const sr = $('cSearch'); if (sr) sr.onkeydown = (e) => { if (e.key === 'Enter') { CRAFT.q = sr.value.trim(); CRAFT.page = 0; drawCenter(); } };
  c.querySelectorAll('[data-cq]').forEach((x) => { x.onchange = () => { CRAFT.qty[x.dataset.cq] = Number(x.value); }; });
  c.querySelectorAll('[data-cmake]').forEach((b) => { b.onclick = () => { const n = b.dataset.cmake, q = Math.max(1, Math.min(100, Number(c.querySelector(`[data-cq="${CSS.escape(n)}"]`)?.value || 1))); act(() => craftStart(n, q)); }; });
  c.querySelectorAll('[data-cpage]').forEach((b) => { b.onclick = () => { CRAFT.page += Number(b.dataset.cpage); drawCenter(); }; });
  c.querySelectorAll('[data-dsel]').forEach((b) => { b.onclick = () => { CRAFT.dsel = b.dataset.dsel; CRAFT.dqty = 1; drawCenter(); }; });
  const dq = $('dQty'); if (dq) dq.oninput = () => { CRAFT.dqty = Math.max(1, Math.trunc(Number(dq.value) || 1)); const n = CRAFT.dsel, res = {}; for (const k in GD.DISMANTLE[n]) res[k] = Number(GD.DISMANTLE[n][k]) * CRAFT.dqty; $('dPrev').innerHTML = `${CRAFT.dqty}개 분해 → ${esc(resultText(res))}<br>가방이 가득 차면 재료를 받은 물품함으로 보냅니다.`; };
  const dg = $('dGo'); if (dg) dg.onclick = () => act(() => dismantle(CRAFT.dsel, CRAFT.dqty), () => { CRAFT.dsel = ''; CRAFT.dqty = 1; }); }

/* ════════ 보관 상자 — feature_ui.render_stash · main._stash_move ════════ */
const STASH = { cat: '', sel: '', side: 'bag' };
function stashRows(src) { return godotSort(Object.keys(src || {}).filter((it) => tabOf(it) === STASH.cat && Number(src[it]) > 0), (a, b) => cat(a).rank > cat(b).rank || (cat(a).rank === cat(b).rank && a < b)); }
const stashUsed = (tab) => Object.keys(S.P.stash || {}).filter((k) => tabOf(k) === tab && Number(S.P.stash[k]) > 0).reduce((a, k) => a + Math.ceil(Number(S.P.stash[k]) / 99), 0);
function stashMove(item, qty, deposit) { const p = S.P; if (!(p.at_hub !== false && !activityBusy() && !nonEmpty(p.battle) && !p.dead)) { toast('거점으로 돌아간 뒤 보관하세요.'); return false; } if (!p.stash || typeof p.stash !== 'object') p.stash = {};
  if (deposit) { if (qty < 1 || count(item) - qty < (Object.values(p.equipment || {}).includes(item) ? 1 : 0)) return false; const tab = tabOf(item), cur = Number(p.stash[item] || 0);
    if (stashUsed(tab) + Math.ceil((cur + qty) / 99) - Math.ceil(cur / 99) > 100) { toast('이 카테고리 보관 상자는 100칸이 가득 찼습니다.'); return false; }
    removeItem(item, qty); p.stash[item] = cur + qty; questEvent('stash_put'); toast(`상자에 넣었습니다 · ${item} × ${qty}`); }
  else { if (Number(p.stash[item] || 0) < qty) return false; if (!addItem(item, qty)) { toast('가방에 빈 칸이 부족합니다. 상점에서 가방을 늘리거나 물품을 정리해 주세요.'); return false; } p.stash[item] = Number(p.stash[item]) - qty; questEvent('stash_take'); if (Number(p.stash[item]) <= 0) delete p.stash[item]; toast(`가방으로 꺼냈습니다 · ${item} × ${qty}`); }
  return true; }
function stashPage() { let h = headT('보관 상자', '칸을 누르면 위쪽에 개수 버튼이 나옵니다');
  if (!(S.P.at_hub !== false && !activityBusy() && !nonEmpty(S.P.battle) && !S.P.dead)) { if (S.P.at_hub === false && !activityBusy()) return h + '<div class="note">상자는 각 대지역의 현지 거점에서 이용할 수 있습니다.</div>' + choiceRow('', '거점으로 돌아가기', '현재 지역을 유지하며 현지 거점으로 들어갑니다.', 'var(--blue)', true, 'id="stHub"'); return h + '<div class="note">지금은 상자를 쓸 수 없습니다. 진행 중인 활동을 먼저 마쳐 주세요.</div>'; }
  if (!GD.TABS.includes(STASH.cat)) STASH.cat = GD.TABS[0]; const stash = S.P.stash || {};
  h += `<div class="pills" style="margin-bottom:12px">${GD.TABS.map((t) => `<button class="pill ${STASH.cat === t ? 'on' : ''}" data-stab="${t}">${t}  ${slotsUsed(t)} / ${slotCap(t)}</button>`).join('')}</div>`;
  const bag = stashRows(S.P.inventory), box = stashRows(stash), fromBag = STASH.side === 'bag'; if (STASH.sel && !(fromBag ? bag : box).includes(STASH.sel)) STASH.sel = '';
  if (!STASH.sel) h += `<div class="panel stbar"><b>물품을 골라 주세요</b><span class="muted">가방의 물품은 상자로, 상자의 물품은 가방으로 옮길 수 있습니다.</span></div>`;
  else { const it = STASH.sel, have = Number((fromBag ? S.P.inventory : stash)[it]), mv = have - (fromBag && equippedLast(it) ? 1 : 0), col = fromBag ? 'var(--blue)' : 'var(--accent)';
    h += `<div class="panel stbar"><div style="flex:1;min-width:150px"><b style="color:${gradeColor(it)}">${esc(itemDisplay(it))}  × ${have}</b><br><span class="muted" style="font-size:12px">${fromBag ? '가방 → 상자로 맡기기' : '상자 → 가방으로 꺼내기'}${fromBag && equippedLast(it) ? ' · 장착 중 1개는 남김' : ''}</span></div>${[1, 10, -1].filter((q) => q < 0 || q <= mv).map((q) => `<button class="btn ${q < 0 ? 'primary' : ''}" style="${q < 0 ? `background:${col};border-color:${col}` : `color:${col}`}" data-smv="${q < 0 ? mv : q}" ${mv <= 0 ? 'disabled' : ''}>${q < 0 ? `전부 ${mv}개` : q + '개'}</button>`).join('')}</div>`; }
  h += '<div class="stcols">'; for (const side of ['bag', 'box']) { const isBag = side === 'bag', items = isBag ? bag : box, src = isBag ? S.P.inventory : stash;
    h += `<div class="panel stcol"><div class="hd"><b style="color:${isBag ? 'var(--warning)' : 'var(--blue)'}">${isBag ? '가방' : '보관 상자'}</b><span class="muted">${isBag ? `${slotsUsed(STASH.cat)} / ${slotCap(STASH.cat)}칸` : `${stashUsed(STASH.cat)} / 100칸`}</span></div>${items.length ? '' : `<p class="subtle">${isBag ? '가방에 옮길 물품이 없습니다.' : josaFix(`상자에 맡긴 ${STASH.cat}이(가) 없습니다.`)}</p>`}<div class="stgrid">`;
    for (const it of items) { const sel = it === STASH.sel && STASH.side === side; h += `<button class="tile${sel ? ' sel' : ''}" data-ssel="${esc(it)}" data-sside="${side}">${itemIcon(it, gradeColor(it))}<b>${esc(it)}</b><span class="t-n">×${Number(src[it])}</span></button>`; } h += '</div></div>'; }
  return h + '</div>'; }
function bindStash() { const c = $('center'); c.querySelectorAll('[data-stab]').forEach((b) => { b.onclick = () => { STASH.cat = b.dataset.stab; STASH.sel = ''; drawCenter(); }; });
  c.querySelectorAll('[data-ssel]').forEach((b) => { b.onclick = () => { const it = b.dataset.ssel, sd = b.dataset.sside; if (STASH.sel === it && STASH.side === sd) STASH.sel = ''; else { STASH.sel = it; STASH.side = sd; } drawCenter(); }; });
  c.querySelectorAll('[data-smv]').forEach((b) => { b.onclick = () => act(() => stashMove(STASH.sel, Math.max(1, Number(b.dataset.smv)), STASH.side === 'bag')); });
  const sh = $('stHub'); if (sh) sh.onclick = () => act(() => { S.P.at_hub = true; return true; }, () => go('hub')); }

/* ════════ 자동 탐사 — auto_explore.gd(40분 · 오늘 남은 횟수 · 자동 전투 · 10번마다 물품 1~2개) ════════ */
const AUTO = { DUR: 2400, CAP: 8, STEPS: 4, LOG: 60 };
const autoData = () => (S.P.auto_explore && typeof S.P.auto_explore === 'object' && !Array.isArray(S.P.auto_explore) ? S.P.auto_explore : {});
const autoActive = () => 'started' in autoData() && 'total' in autoData();
const autoLeft = () => Math.max(0, Number(autoData().ends || 0) - nowSec());
const autoRemaining = () => Math.max(0, M.FIELD_DAILY_LIMIT - Number(S.P.field_count || 0));
const autoRealmSpots = (realm) => locations().filter((l) => Number(GD.REGIONS[l.gu_index].realm) === realm && canEnterField(l)).map((l) => ({ ...l, id: locId(l), tier: Number(GD.REGIONS[l.gu_index].tier) }));
const autoMaxItems = (n) => Math.min(AUTO.CAP, Math.ceil(n / 10) * 2);
function autoBlock() { const p = S.P; if (p.dead) return '쓰러진 동안에는 탐사할 수 없습니다.'; if (autoActive()) return '이미 자동 탐사 중입니다.'; if (nonEmpty(p.long_expedition)) return '장기 탐사를 마친 뒤 시작하세요.'; if (nonEmpty(p.travel)) return '지역 이동을 마친 뒤 시작하세요.';
  if (nonEmpty(p.battle)) return '전투를 마친 뒤 시작하세요.'; if (nonEmpty(p.pending_explore)) return '진행 중인 탐사를 마친 뒤 시작하세요.'; if (craftActive()) return '제작이 끝난 뒤 시작하세요.'; if (incapacitated()) return '사기를 회복한 뒤 시작하세요.';
  syncHardMode(); calendarSyncMut(); if (autoRemaining() <= 0) return '오늘 단기 탐사 횟수를 모두 썼습니다. 오전 6시에 다시 열립니다.'; return ''; }
function autoLog(text) { const a = autoData(), lg = Array.isArray(a.log) ? a.log : []; lg.push(`${clockText()}  ${text}`); while (lg.length > AUTO.LOG) lg.shift(); a.log = lg; }
function autoPicker() { const why = autoBlock(); if (why) { toast(why); return; } const n = autoRemaining(), here = Number(GD.REGIONS[hereRegion()].realm);
  let h = `<p style="color:var(--text)">오늘 남은 단기 탐사 ${n}회를 모두 써서, 고른 대지역을 40분 동안 돌아다니며 차례로 탐사합니다.</p><p style="white-space:pre-line;font-size:13px">· 한 번 한 번은 단기 탐사와 같습니다 — 허기 · 수분이 줄고, 사건 · 전투 · 부상이 생길 수 있습니다.\n· 전투는 자동으로 싸우고, 체력이 30% 아래면 물러납니다. 체력이 절반 아래면 가방의 회복품을 먼저 쓰고, 그래도 35% 아래면 돌아옵니다(남은 횟수는 돌려받음).\n· 경험치 · 금액 · 코인은 단기 탐사만큼 받습니다.\n· 물품은 10번마다 1~2개, 모두 합쳐 최대 ${AUTO.CAP}개만 가져옵니다(이번에는 최대 ${autoMaxItems(n)}개).\n· 내 레벨 이하 구역을 먼저, 그중 처음 가는 곳부터 돕니다. 불빛 · 도시 복구율 · 퀘스트에도 그대로 셉니다.\n· 진행 중에는 다른 탐사 · 지역 이동 · 제작을 할 수 없고, 언제든 멈출 수 있습니다(남은 횟수는 돌려받습니다).</p>`;
  let any = false; WD.REALMS.forEach((R, r) => { const sp = autoRealmSpots(r); if (!sp.length) { h += `<button class="btn" disabled style="min-height:46px">${esc(R.name)} · Lv.${R.level}부터</button>`; return; } any = true; const fresh = sp.filter((l) => !(S.P.visited || []).includes(l.id)).length; h += `<button class="btn ${r === here ? 'primary' : ''}" data-arealm="${r}" style="min-height:48px">${esc(R.name)} · 구역 ${sp.length}곳${fresh ? ` · 새 구역 ${fresh}` : ''}</button>`; });
  if (!any) h += '<p style="color:var(--warning)">지금 레벨로 갈 수 있는 대지역이 없습니다.</p>';
  modal('자동 탐사', h, [['닫기', '', null]]); $('modalRoot').querySelectorAll('[data-arealm]').forEach((b) => { b.onclick = () => { $('modalRoot').innerHTML = ''; act(() => autoStart(Number(b.dataset.arealm)), () => go('hub')); }; }); }
function autoStart(realm) { const why = autoBlock(); if (why) { toast(why); return false; } const sp = autoRealmSpots(realm); if (!sp.length) { toast('갈 수 있는 구역이 없습니다.'); return false; } const n = autoRemaining(), now = nowSec(), p = S.P;
  p.field_count = M.FIELD_DAILY_LIMIT; p.auto_explore = { started: now, ends: now + AUTO.DUR, realm, total: n, done: 0, origin: Number(p.region), day: String(p.field_day ?? ''), pool: {}, given: {}, given_n: 0, fights: 0, wins: 0, retreats: 0, xp0: xpTotal(Number(p.level), Number(p.xp)), money0: Number(p.money), coins0: Number(p.coins || 0), new_spots: 0, log: [] };
  p.at_hub = false; autoLog(`자동 탐사 시작 · ${WD.REALMS[realm].name} · ${n}회 · 40분`); gLog(`[color=#6cb6ff]자동 탐사[/color]  ${WD.REALMS[realm].name} 일대를 40분 동안 돌아다니며 ${n}번 탐사한다.`); toast(`자동 탐사를 시작했습니다 · ${WD.REALMS[realm].name} · ${n}회 · 40분`); return true; }
const autoDue = () => { const a = autoData(), total = Math.max(1, Number(a.total ?? 1)), el = Math.max(0, Math.min(AUTO.DUR, nowSec() - Number(a.started || 0))); return Math.min(total, Math.floor(el * total / AUTO.DUR)); };
function autoHeal() { const p = S.P, mx = Math.max(1, Number(p.max_hp)); for (let g = 0; g < 3; g++) { if (Number(p.hp) / mx >= 0.5) return; let best = '', bh = 0;
  for (const n of Object.keys(p.inventory || {})) { if (count(n) <= 0 || !isHealItem(n)) continue; const it = GD.ITEMS[n] || {}; if (Number(it.hp || 0) <= 0 || it.pet_only) continue; if (!best || Number(it.hp) > bh) { best = n; bh = Number(it.hp); } }
  if (!best) return; const before = Number(p.hp); removeItem(best, 1); const it2 = GD.ITEMS[best]; heal(Math.trunc(it2.hp)); treatConditions(best); grantPositive(best); statesOnConsume(it2); autoLog(`회복 · ${best} × 1 · 체력 ${before} → ${p.hp}`); } }
function autoPickSpot(a) { const sp = autoRealmSpots(Number(a.realm)); if (!sp.length) return null; const lv = Number(S.P.level), safe = sp.filter((l) => Number(l.level ?? 1) <= lv), base = safe.length ? safe : sp, fresh = base.filter((l) => !(S.P.visited || []).includes(l.id)); return { ...gPick(fresh.length ? fresh : base) }; }
function autoGrant(a, n) { const pool = a.pool || {}, given = a.given && typeof a.given === 'object' ? a.given : {}, got = [], G = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  for (let i = 0; i < n; i++) { if (Number(a.given_n || 0) >= AUTO.CAP || !Object.keys(pool).length) break; let tw = 0; const ws = []; for (const k of Object.keys(pool)) { const gi = G.indexOf(String(cat(k).grade)); const w = Number(pool[k]) * (1 + 0.25 * (gi >= 0 ? gi : 0)); ws.push([k, w]); tw += w; }
    let r = gRandf() * tw, pick = ws[0][0]; for (const [k, w] of ws) { r -= w; if (r <= 0) { pick = k; break; } } pool[pick] = Number(pool[pick]) - 1; if (Number(pool[pick]) <= 0) delete pool[pick];
    awardItem(pick, 1, false); given[pick] = Number(given[pick] || 0) + 1; a.given_n = Number(a.given_n || 0) + 1; got.push(`[${cat(pick).grade}] ${pick}`); }
  a.given = given; a.pool = pool; if (got.length) { questEvent('loot_items', got.length); autoLog(`물품 챙김 · ${got.join(', ')} · 지금까지 ${a.given_n}/${AUTO.CAP}개`); } }
function autoFight(a) { const c = S.P.battle, enemy = String(c.enemy || '적'); a.fights = Number(a.fights || 0) + 1; const rng = new GRng(gRandi()); let turns = 0;
  while (turns < 48) { turns++; let d = derived(); let dealt = Math.trunc(d.attack) + rng.randiRange(0, 4); if (rng.randf() * 100 < d.crit) dealt = Math.trunc(dealt * d.crit_dmg / 100); dealt = Math.max(1, mitigated(dealt, Number(c.defense || 0), Number(c.level ?? S.P.level)));
    c.hp = Math.max(0, Number(c.hp || 0) - dealt); wearAttack();
    if (Number(c.hp) <= 0) { const rest = Array.isArray(c.group_remaining) ? c.group_remaining : []; if (rest.length) { const nx = rest.shift(); Object.assign(c, nx); c.group_remaining = rest; c.group_index = Number(c.group_index ?? 1) + 1; continue; } a.wins = Number(a.wins || 0) + 1; finishCombat(true); return `${enemy} 처치 · ${turns}턴`; }
    d = derived(); if (rng.randf() * 100 < d.evade) continue; const taken = Math.max(1, mitigated(Number(c.attack || 1) + rng.randiRange(-1, 2), d.defense, Number(c.level ?? S.P.level))), hb = Number(S.P.hp);
    S.P.hp = Math.max(0, hb - taken); guardAfterDamage(hb, enemy); wearHit(taken); { const ch = conditionChances(String(c.species || 'zombie'), false, taken), roll = rng.randf() * 100; let e = 0, hit = false; for (const id of ['bleeding', 'infection', 'sprain']) { e += ch[id]; if (roll < e) { inflictCondition(id); hit = true; break; } } if (!hit) statesOnHit(false, taken); }
    if (Number(S.P.hp) <= 0 && checkDeath(`자동 탐사 중 ${enemy}에게 쓰러졌다`)) { S.P.battle = {}; return `${enemy}에게 쓰러짐`; }
    if (Number(S.P.hp) < Number(S.P.max_hp) * 0.5) autoHeal();
    if (Number(S.P.hp) < Number(S.P.max_hp) * 0.3) { a.retreats = Number(a.retreats || 0) + 1; S.P.morale = Math.max(0, Number(S.P.morale) - 3); S.P.battle = {}; S.P.buffs = {}; return `${enemy}에게서 물러남(체력 ${S.P.hp}) · 사기 -3`; } }
  a.retreats = Number(a.retreats || 0) + 1; S.P.battle = {}; S.P.buffs = {}; return `${enemy}와의 싸움이 길어져 물러남`; }
function autoStep() { const a = autoData(); if (!nonEmpty(a)) return; calendarSyncMut(); const loc = autoPickSpot(a), idx = Number(a.done || 0) + 1;
  if (!loc) { a.halt = true; a.halt_reason = '갈 수 있는 구역 없음'; return; } autoEat(); autoHeal();
  if (incapacitated()) { a.halt = true; a.halt_reason = '사기가 너무 낮아 멈춤'; autoLog('사기가 너무 낮아 더 돌아다닐 수 없다.'); return; }
  if (Number(S.P.hp) < Number(S.P.max_hp) * 0.35) { a.halt = true; a.halt_reason = '체력이 낮아 돌아옴'; autoLog(`체력이 ${S.P.hp}/${S.P.max_hp}라 더 돌아다니지 않고 돌아왔다.`); return; }
  const keepRegion = Number(S.P.region), before = { inv: { ...(S.P.inventory || {}) }, stored: { ...(S.P.stored_loot || {}) } }, vb = (S.P.visited || []).length; FD.autoQuiet = true;
  S.P.region = loc.gu_index; loc.night = isNight(); loc.roll = gRandf() * 100; beginResult(); const hp0 = Number(S.P.hp); let outcome;
  try { resolveExploration(loc); outcome = nonEmpty(S.P.battle) ? autoFight(a) : '탐사' + (Number(S.P.hp) !== hp0 ? ` · 체력 ${hp0} → ${S.P.hp}` : ''); } finally { FD.autoQuiet = false; }
  S.P.result_baseline = {}; S.P.region = keepRegion; S.P.field_ready_at = 0; S.P.at_hub = false;
  if ((S.P.visited || []).length > vb) a.new_spots = Number(a.new_spots || 0) + 1;
  { const pool = a.pool && typeof a.pool === 'object' ? a.pool : {}; for (const k of Object.keys(S.P.inventory || {})) { const g = count(k) - Number(before.inv[k] || 0); if (g > 0) { removeItem(k, g); pool[k] = Number(pool[k] || 0) + g; } }
    const st = S.P.stored_loot && typeof S.P.stored_loot === 'object' ? S.P.stored_loot : {}; for (const k of Object.keys(st)) { const g2 = Number(st[k]) - Number(before.stored[k] || 0); if (g2 > 0) { st[k] = Number(st[k]) - g2; if (Number(st[k]) <= 0) delete st[k]; pool[k] = Number(pool[k] || 0) + g2; } } S.P.stored_loot = st; a.pool = pool; }
  a.done = idx; autoLog(`${idx}/${a.total} · ${loc.id} · ${outcome}`);
  if (idx % 10 === 0) autoGrant(a, gRandiRange(1, 2)); else if (idx === Number(a.total) && idx % 10 >= 5) autoGrant(a, 1); }
function autoRefund() { const a = autoData(), left = Math.max(0, Number(a.total || 0) - Number(a.done || 0)); if (left > 0 && Number(S.P.field_count) >= left) S.P.field_count = Number(S.P.field_count) - left; a.refunded = left; }
function autoFinish(reason) { const a = autoData(); if (!nonEmpty(a)) return; const done = Number(a.done || 0); if (reason !== '완료' && done % 10 >= 5 && !S.P.dead) autoGrant(a, 1);
  const xp = xpTotal(Number(S.P.level), Number(S.P.xp)) - Number(a.xp0 || 0), money = Number(S.P.money) - Number(a.money0 || 0), coins = Number(S.P.coins || 0) - Number(a.coins0 || 0), given = a.given || {}, parts = Object.keys(given).map((k) => `${k} × ${given[k]}`), rn = WD.REALMS[Number(a.realm || 0)].name;
  const head = { 완료: '자동 탐사 완료', 멈춤: '자동 탐사를 멈췄습니다', 쓰러짐: '자동 탐사 중 쓰러졌습니다' }[reason] || '자동 탐사 · ' + reason, ref = Number(a.refunded || 0);
  const body = (ref > 0 ? `남은 ${ref}회는 오늘 단기 탐사로 돌려받았습니다.\n` : '') + `${rn} · ${done}/${Number(a.total || 0)}번 탐사 · 처음 간 구역 ${Number(a.new_spots || 0)}곳\n경험치 +${Math.max(0, xp)} · 금액 ${sgn(money)}원${coins > 0 ? ` · 코인 +${coins}` : ''}\n전투 ${Number(a.fights || 0)}번(승리 ${Number(a.wins || 0)} · 물러남 ${Number(a.retreats || 0)})\n물품 ${Number(a.given_n || 0)}개${parts.length ? ' · ' + parts.join(', ') : ''}`;
  S.P.last_auto = { title: head, body, log: a.log || [], time: nowSec() }; S.P.auto_explore = {}; if (!S.P.dead) S.P.at_hub = true;
  gLog(`[color=#6cb6ff]${head}[/color]  ${body.replace(/\n/g, ' · ')}`); notify(`auto-explore-${Number(a.started || 0)}`, head, body, 'loot'); FD.autoDone = { head, body }; }
function autoTickCore() { if (!autoActive()) return false; let a = autoData(); if (S.P.dead) { autoFinish('쓰러짐'); return true; } let steps = 0, ch = false;
  while (Number(a.done || 0) < autoDue() && steps < AUTO.STEPS) { steps++; autoStep(); ch = true; a = autoData(); if (!nonEmpty(a)) return true; if (S.P.dead) { autoFinish('쓰러짐'); return true; } if (a.halt) { autoRefund(); autoFinish(String(a.halt_reason || '멈춤')); return true; } }
  if (Number(a.done || 0) >= Number(a.total || 0) && nowSec() >= Number(a.ends || 0)) { autoFinish('완료'); return true; } return ch; }
function autoTick() { if (!S.P || $('app').hidden || LIVE.saving || LIVE.lost || !autoActive() || FD.autoBusy) return; const pre = clone(S.P), r = autoTickCore(); if (!r) { refreshAutoCard(); return; } const after = S.P; S.P = pre; FD.autoBusy = true;
  act(() => { S.P = after; return true; }, () => { if (S.P.dead) go('dead'); if (FD.autoDone) { const d = FD.autoDone; FD.autoDone = null; modal(d.head, `<p style="white-space:pre-line;color:var(--text)">${esc(d.body)}</p>`); } }).finally(() => { FD.autoBusy = false; }); }
function autoCard() { const a = autoData(); if (!autoActive()) return ''; const left = autoLeft(), xp = xpTotal(Number(S.P.level), Number(S.P.xp)) - Number(a.xp0 || 0), lg = (a.log || []).slice(-3);
  return `<section class="panel autocard"><small>자동 탐사 중 · ${esc(WD.REALMS[Number(a.realm || 0)].name)}</small><b data-live="auto">${Number(a.done || 0)} / ${Number(a.total || 0)}번 · 남은 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b><div class="bar"><i data-livebar="auto" style="width:${Number(a.done || 0) / Math.max(1, Number(a.total || 1)) * 100}%;background:var(--blue)"></i></div>
    <p data-live="autostat">경험치 +${Math.max(0, xp)} · 금액 ${sgn(Number(S.P.money) - Number(a.money0 || 0))}원 · 물품 ${Number(a.given_n || 0)}/${Math.min(AUTO.CAP, autoMaxItems(Number(a.total || 0)))}개 · 전투 ${Number(a.fights || 0)}(승 ${Number(a.wins || 0)})</p><p class="lg" data-live="autolog">${lg.map(esc).join('<br>')}</p>
    <div class="mrow"><button class="btn" id="autoLogB">기록 보기</button><button class="btn" style="color:var(--danger)" id="autoStopB">멈추고 돌아오기</button></div></section>`; }
function refreshAutoCard() { const t = document.querySelector('[data-live="auto"]'); if (!t || !autoActive()) return; const a = autoData(), left = autoLeft(); t.textContent = `${Number(a.done || 0)} / ${Number(a.total || 0)}번 · 남은 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
function autoLogModal() { const a = autoData(), lg = nonEmpty(a) ? (a.log || []) : ((S.P.last_auto || {}).log || []); modal('자동 탐사 기록', lg.length ? `<p style="white-space:pre-line;color:var(--text);font-size:13px">${esc([...lg].reverse().join('\n'))}</p>` : '<p class="muted">아직 기록이 없습니다.</p>'); }
function autoStopConfirm() { const a = autoData(); if (!nonEmpty(a)) return; const left = Math.max(0, Number(a.total || 0) - Number(a.done || 0));
  confirmModal('자동 탐사를 멈추시겠습니까?', `<p style="color:var(--text)">지금까지 ${Number(a.done || 0)}번 탐사했습니다. 남은 ${left}번은 오늘 단기 탐사 횟수로 돌려받습니다.</p>`, '멈추고 돌아오기', 'danger', () => act(() => { if (!autoActive()) return false; autoRefund(); autoFinish('멈춤'); return true; }, () => { if (FD.autoDone) { const d = FD.autoDone; FD.autoDone = null; modal(d.head, `<p style="white-space:pre-line;color:var(--text)">${esc(d.body)}</p>`); } })); }

/* ════════ 기록 — 알림 · 일지 · 불빛 일지 · 업데이트 소식 · 생존 규칙 ════════ */
const NTABS = [['all', '전체'], ['alert', '경고'], ['result', '획득 · 결과'], ['growth', '성장'], ['social', '함께'], ['base', '거점 · 행상인']];
const REC = { ntab: 'all', jf: '전체', gsec: 0 };
function ntabOf(e) { const id = String(e.id || ''), k = String(e.kind || ''); for (const pre of ['vital-', 'hp-low-', 'long-halt-', 'long-auto-halt-', 'gear-']) if (id.startsWith(pre)) return 'alert'; if (['danger', 'equipment'].includes(k)) return 'alert';
  if (id.startsWith('level-') || id.startsWith('newbie-') || id.startsWith('boost-') || ['growth', 'quest'].includes(k)) return 'growth'; if (['merchant', 'hub_event', 'pet'].includes(k)) return 'base'; if (['friend', 'social', 'gift', 'party', 'duel'].includes(k)) return 'social'; if (k === 'loot') return 'result'; return 'all'; }
function ntagOf(e) { if (String(e.id || '').startsWith('update-')) return ['소식', 'var(--accent)']; return { alert: ['경고', 'var(--danger)'], result: ['획득', 'var(--blue)'], growth: ['성장', 'var(--warning)'], social: ['함께', 'var(--morale)'], base: ['거점', 'var(--accent)'] }[ntabOf(e)] || ['', 'var(--subtle)']; }
const agoText = (t) => { const s = Math.max(0, nowSec() - t); return s < 60 ? '방금' : s < 3600 ? `${Math.floor(s / 60)}분 전` : s < 86400 ? `${Math.floor(s / 3600)}시간 전` : `${Math.floor(s / 86400)}일 전`; };
function notifBody(e) { let b = kstStamp(Number(e.time ?? nowSec())) + '\n' + String(e.body || ''); const d = e.payload || {}; if (String(e.kind || '') === 'merchant' && d.arrival != null) { const a = Number(d.arrival), dep = Number(d.departure); if (nowSec() < a) b += '\n도착까지 ' + durationText(a - nowSec()); else if (nowSec() < dep) b += `\n떠날 시각 ${kstStamp(dep)} · 남은 영업 ${durationText(dep - nowSec())}`; else b += '\n이번 방문은 종료되었습니다.'; } return b; }
const unreadCount = () => (S.P.notifications || []).filter((e) => !e.read && !String(e.id || '').startsWith('chat-')).length;
function notificationsPage() { const all = [...(S.P.notifications || [])].reverse(), list = all.filter((e) => REC.ntab === 'all' || ntabOf(e) === REC.ntab);
  let h = S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>알림</h2><span class="spacer"></span><button class="btn sm" data-go="settings">알림 설정</button><button class="btn sm" id="nAll">모두 읽음</button></div><p class="muted sec-sub">읽지 않은 알림 ${unreadCount()} · 누르면 읽음으로 바뀝니다</p>` : `<p class="crumb">읽지 않은 알림 ${unreadCount()} · 누르면 읽음으로 바뀝니다</p><div class="pagehead"><h2>알림</h2><span class="spacer"></span><button class="btn" data-go="settings">알림 설정</button><button class="btn" id="nAll">모두 읽음</button></div>`;
  h += `<div class="pills" style="margin-bottom:12px">${NTABS.map(([id, lab]) => { const n = all.filter((e) => !e.read && (id === 'all' || ntabOf(e) === id)).length; return `<button class="pill ${REC.ntab === id ? 'on' : ''}" data-ntab="${id}">${lab}${n ? ' ' + n : ''}</button>`; }).join('')}</div>`;
  h += list.slice(0, 100).map((e) => { const [tg, tc] = ntagOf(e), un = !e.read; return `<div class="panel nrow ${un ? 'un' : ''}" data-nid="${esc(String(e.id))}"><i class="dot" style="background:${un ? tc : 'transparent'}"></i><div class="c"><div class="t">${tg ? `<span class="cchip" style="--c:${tc}">${tg}</span>` : ''}<b>${esc(String(e.title || ''))}</b><span class="subtle">${agoText(Number(e.time ?? nowSec()))}</span></div><p>${esc(notifBody(e))}</p></div></div>`; }).join('') || `<div class="note">${REC.ntab !== 'all' ? '이 탭에는 아직 알림이 없습니다.' : '아직 알림이 없습니다.'}</div>`;
  return h; }
function bindNotifications() { const c = $('center'); bindProgress(); c.querySelectorAll('[data-ntab]').forEach((b) => { b.onclick = () => { REC.ntab = b.dataset.ntab; drawCenter(); }; });
  const na = $('nAll'); if (na) na.onclick = () => act(() => { const all = (S.P.notifications || []).filter((e) => REC.ntab === 'all' || ntabOf(e) === REC.ntab); if (!all.some((e) => !e.read)) return false; for (const e of all) e.read = true; return true; });
  c.querySelectorAll('[data-nid]').forEach((r) => { r.onclick = () => { const e = (S.P.notifications || []).find((x) => String(x.id) === r.dataset.nid); if (e && !e.read) act(() => { e.read = true; return true; }); if (e && String(e.kind) === 'duel') { duelOpen(String((e.payload || {}).id || '')); return; } if (e && String(e.kind) === 'hub_event' && petActive()) openHubEvent(); }; }); }
function journalCat(msg) { for (const c of M.JOURNAL_CATS) for (const kw of c[1]) if (msg.includes(String(kw))) return [String(c[0]), '#' + c[2]]; return ['기록', 'var(--muted)']; }
function journalPage() { const j = S.P.journal || []; let h = headT('일지', `${calendarSync(S.P).day}일차 · 최근 기록부터 보입니다`);
  h += `<div class="jtiles">${[['일차', calendarSync(S.P).day + '일'], ['처치', String(Number(S.P.kills || 0))], ['탐사한 구역', exploreText()], ['레벨', 'Lv.' + S.P.level]].map(([a, b]) => `<div class="panel"><small>${a}</small><b>${esc(b)}</b></div>`).join('')}</div>`;
  h += `<div class="pills" style="margin:12px 0">${['전체', '탐사', '전투', '스토리', '제작', '낚시'].map((f) => `<button class="pill ${REC.jf === f ? 'on' : ''}" data-jf="${f}">${f}</button>`).join('')}</div>`;
  const rows = []; for (let i = j.length - 1; i >= 0 && rows.length < 120; i--) { const line = String(j[i]); let t = '', msg = line; if (line.startsWith('[color=#75818e]')) { const e = line.indexOf('[/color]'); if (e > 0) { t = line.slice(15, e); msg = line.slice(e + 8).trim(); } } const c = journalCat(msg.replace(/\[[^\]]*\]/g, '')); if (REC.jf !== '전체' && c[0] !== REC.jf) continue; rows.push([t, msg, c]); }
  if (!rows.length) return h + `<div class="note">${j.length ? '이 분류의 기록이 없습니다.' : '아직 기록이 없습니다.'}</div>`;
  return h + `<div class="panel jlist">${rows.map(([t, m, c]) => `<div class="jr"><span class="subtle">${esc(t.length >= 5 ? t.slice(-5) : t)}</span><i style="background:${c[1]}"></i><p><b style="color:${c[1]}">${esc(c[0])}</b> · ${richText(m)}</p></div>`).join('')}</div>`; }
function bindJournal() { $('center').querySelectorAll('[data-jf]').forEach((b) => { b.onclick = () => { REC.jf = b.dataset.jf; drawCenter(); }; }); }
const mdText = (day) => { if (day < 0) return '-'; const d = new Date(day * 86400000); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
function lanternSvg(cur, ghost, w, h) { const lit = isLight() ? '#e2a23a' : '#ffcf6e', body = 'var(--subtle)', on = cur > 0 && !ghost, fs = Math.max(0.6, Math.min(1.15, 0.6 + cur / 60));
  const fl = (cx, cy, rw, up, dn) => `M${cx} ${cy - up} C${cx + rw} ${cy - up * 0.35} ${cx + rw} ${cy + dn * 0.6} ${cx} ${cy + dn} C${cx - rw} ${cy + dn * 0.6} ${cx - rw} ${cy - up * 0.35} ${cx} ${cy - up}Z`;
  return `<svg viewBox="0 0 60 90" width="${w}" height="${h}" aria-hidden="true">${on ? `<circle cx="30" cy="50" r="40" fill="${lit}" opacity=".14"/>` : ''}<g fill="${body}" stroke="${body}" opacity="${ghost ? 0.55 : 1}"><path d="M23 9a7 7 0 0 1 14 0" fill="none" stroke-width="3"/><rect x="16" y="10" width="28" height="7" stroke="none"/><path d="M14 18h32l-3 6H17z" stroke="none"/><rect x="15" y="24" width="30" height="44" rx="9" fill="${lit}" fill-opacity="${on ? 0.14 : 0.04}" stroke-width="3"/><path d="M18 70h24l3 8H15z" stroke="none"/></g>${on ? `<path d="${fl(30, 52, 6 * fs, 16 * fs, 6 * fs)}" fill="${isLight() ? '#f29a2e' : '#ffb347'}"/><path d="${fl(30, 54, 3.2 * fs, 9 * fs, 3.4 * fs)}" fill="#fff3c9"/>` : ghost ? `<path d="${fl(30, 52, 4.5, 12, 4.5)}" fill="none" stroke="${lit}" stroke-opacity=".45" stroke-width="1.5"/>` : ''}</svg>`; }
function lightLogPage() { const d = S.P.light && typeof S.P.light === 'object' ? S.P.light : {}, t = Math.floor(kstNow() / 86400), cur = Number(d.cur || 0), days = d.days || [], deaths = d.deaths || [], from = Number(d.from ?? -1), lit = isLight() ? '#e2a23a' : '#ffcf6e', glow = isLight() ? 'var(--warning)' : '#ffe2a6';
  let h = headT('불빛 일지', '쓰러지지 않고 버틴 날 · 혼자 보는 기록입니다'); let dots = ''; for (let i = 29; i >= 0; i--) { const day = t - i, k = deaths.includes(day) ? 3 : days.includes(day) ? (from >= 0 && day >= from ? 2 : 1) : 0; dots += `<i class="dd k${k}" title="${mdText(day)}" style="--c:${k === 3 ? 'var(--danger)' : k === 2 ? lit : k === 1 ? `color-mix(in srgb, ${lit} 45%, var(--panel))` : 'color-mix(in srgb, var(--line) 65%, var(--subtle))'}"></i>`; }
  const best = Math.max(Number(d.best || 0), cur), ML = D.light_log.MILESTONES, next = (ML.find((m) => best < m[0]) || [0])[0];
  h += `<div class="llwrap"><div class="panel llbig">${lanternSvg(cur, false, S.mobile ? 84 : 150, S.mobile ? 120 : 200)}<div><small class="subtle">지금 내 불빛</small><b style="color:${cur > 0 ? glow : 'var(--muted)'}">${cur > 0 ? `${cur}일째 타는 중` : '아직 불을 붙이기 전'}</b><p class="muted">${cur > 0 ? '쓰러진 뒤 활동한 날만 셉니다(탐사 · 전투 · 식사 · 휴식). 쉰 날은 건너뛰고 이어집니다.' : '오늘 탐사 · 식사 · 휴식 중 하나를 하면 첫 불씨가 켜집니다.'}</p><small class="subtle">지난 30일</small><div class="dots">${dots}</div><div class="leg"><span><i class="dd k2" style="--c:${lit}"></i>활동한 날</span><span><i class="dd k0" style="--c:color-mix(in srgb, var(--line) 65%, var(--subtle))"></i>쉰 날(끊기지 않음)</span><span><i class="dd k3" style="--c:var(--danger)"></i>쓰러진 날</span></div></div></div>
    <div class="llside"><div class="panel llbest">${lanternSvg(0, true, 40, 58)}<div><small class="subtle">가장 오래 탄 불빛</small><b>${Number(d.best || 0)}일</b><small class="subtle">${Number(d.best || 0) > 0 ? `${mdText(Number(d.best_from))} ~ ${mdText(Number(d.best_to))}` : '아직 기록이 없습니다'}</small></div></div>
    <div class="panel llms"><small class="subtle">기념 표식 · 날수를 채우면 남습니다</small><div class="ms">${ML.map(([n, nm]) => { const dn = best >= n; return `<div>${lanternSvg(dn ? 30 : 0, !dn, 30, 44)}<b style="color:${dn ? glow : 'var(--text)'}">${n}일${dn ? ' ✓' : ''}</b><small class="subtle">${esc(nm)}</small></div>`; }).join('')}</div>${next ? `<div class="bar"><i style="width:${Math.min(100, cur / next * 100)}%;background:${lit}"></i></div><small class="subtle">다음 표식까지 ${next - cur}일</small>` : ''}</div>
    <p class="subtle" style="font-size:12px">순위 · 서버 합산 없이 나만 보는 기록입니다. 쓰러지면 '지금' 기록만 처음부터 — 밝힌 지도와 기여는 그대로 남습니다. 결투로는 끊기지 않습니다.</p></div></div>`;
  return h; }
const UN = D.update_notes, KCOL = { new: 'var(--accent)', bal: 'var(--warning)', fix: 'var(--blue)' };
const noteBlock = (n) => `<div class="unhead"><span class="cchip" style="--c:var(--warning)">${esc(n.v)}</span><span class="muted" style="font-size:12px">${esc(n.date)}</span></div>${n.items.map(([k, t]) => `<div class="unrow"><span class="cchip" style="--c:${KCOL[k] || 'var(--muted)'}">${esc(UN.KIND_NAME[k] || '')}</span><p>${esc(t)}</p></div>`).join('')}`;
function updatesPage() { return headT('업데이트 소식', '새 기능 · 조정 · 고친 점을 짧게 모았습니다') + UN.NOTES.slice(0, 10).map((n) => `<div class="panel uncard">${noteBlock(n)}</div>`).join(''); }
function checkUpdates() { const p = S.P, seen = String(p.update_seen || ''), latest = String(UN.NOTES[0].v); if (seen === latest) return false; const news = []; for (const n of UN.NOTES) { if (String(n.v) === seen) break; news.push(n); } p.update_seen = latest; if (!news.length) return true;
  nhAdd('update-' + news[0].v, '업데이트 소식 · ' + news[0].v, news.slice(0, 3).flatMap((n) => n.items.map(([k, t]) => `· [${UN.KIND_NAME[k] || ''}] ${t}`)).join('\n'), 'growth');
  setTimeout(() => { modal('업데이트 소식', news.slice(0, 3).map(noteBlock).join('<hr>'), [['확인', 'primary', null], ['지난 소식 보기 · 기록 › 업데이트 소식', '', () => go('updates')]]); }, 400); return true; }
const HELP = D.player_help.SECTIONS;
function guidePage() { REC.gsec = Math.max(0, Math.min(HELP.length - 1, REC.gsec)); const wide = !S.mobile && ($('center')?.clientWidth || window.innerWidth) >= 600;
  let h = (S.mobile ? `<div class="pagehead" style="margin-bottom:4px"><h2>생존 규칙</h2></div><p class="muted sec-sub">처음이라면 '꼭 알아야 할 5가지'부터 읽어 보세요</p>` : `<p class="crumb">처음이라면 '꼭 알아야 할 5가지'부터 읽어 보세요</p><div class="pagehead"><h2>생존 규칙</h2><span class="spacer"></span><label class="chk" style="min-height:0"><input type="checkbox" id="gHide" ${(S.P.notify_settings || {}).welcome_hidden ? 'checked' : ''}> 입장할 때 자동으로 열지 않기</label></div>`);
  if (S.mobile) h += `<label class="chk"><input type="checkbox" id="gHide" ${(S.P.notify_settings || {}).welcome_hidden ? 'checked' : ''}> 입장할 때 자동으로 열지 않기</label>`;
  const sec = HELP[REC.gsec], body = `<div class="panel gbody"><small style="color:var(--accent)">${String(REC.gsec + 1).padStart(2, '0')} / ${HELP.length}</small><b>${esc(sec[0])}</b><p>${esc(sec[1])}</p><div class="mrow"><button class="btn" data-gs="${REC.gsec - 1}" ${REC.gsec > 0 ? '' : 'disabled'}>이전</button><button class="btn" data-gs="${REC.gsec + 1}" ${REC.gsec + 1 < HELP.length ? '' : 'disabled'}>다음</button></div></div>`;
  if (wide) h += `<div class="gwrap"><div class="gtoc">${HELP.map((x, i) => `<button class="btn ${i === REC.gsec ? 'on' : ''}" data-gs="${i}">${String(i + 1).padStart(2, '0')}  ${esc(x[0])}</button>`).join('')}</div>${body}</div>`;
  else h += `<select class="csearch" id="gSel">${HELP.map((x, i) => `<option value="${i}" ${i === REC.gsec ? 'selected' : ''}>${String(i + 1).padStart(2, '0')}  ${esc(x[0])}</option>`).join('')}</select>` + body;
  return h; }
function bindGuide() { const c = $('center'); c.querySelectorAll('[data-gs]').forEach((b) => { b.onclick = () => { REC.gsec = Number(b.dataset.gs); drawCenter(); }; }); const s = $('gSel'); if (s) s.onchange = () => { REC.gsec = Number(s.value); drawCenter(); };
  const gh = $('gHide'); if (gh) gh.onchange = () => act(() => { if (!S.P.notify_settings || typeof S.P.notify_settings !== 'object') S.P.notify_settings = {}; S.P.notify_settings.welcome_hidden = gh.checked; return true; }); }

/* ════════ 설정(화면 · 채팅과 알림) · 접속 표시(presenceBeat) ════════ */
const NSET = [['world', '월드 채팅 알림', true], ['party', '파티 채팅 알림', true], ['notice', '공지 알림', true], ['dm', '쪽지 알림', true], ['popups', '게임 알림 자동 팝업', true], ['explore_confirm', '탐사 전 확률·시간 확인 창', true], ['explore_popup', '탐사·전투 결과 창', true], ['explore_notify', '탐사·전투 결과를 알림함에 남기기', true], ['long_auto_heal', '장기 탐사 자동 회복', true]];
function settingsPage() { const ns = S.P.notify_settings || {}; let h = headT('설정', '화면 · 소리 · 채팅과 알림 · 도움말');
  const dark = M.THEME_IDS.filter((id) => !M.THEMES[id].light), light = M.THEME_IDS.filter((id) => M.THEMES[id].light);
  h += `<div class="panel setcard"><b style="color:var(--accent)">화면</b><small>다크 테마</small><div class="pills">${dark.map((id) => `<button class="pill ${S.theme === id ? 'on' : ''}" data-th="${id}">${esc(M.THEMES[id].name)}</button>`).join('')}</div><small>라이트 테마</small><div class="pills">${light.map((id) => `<button class="pill ${S.theme === id ? 'on' : ''}" data-th="${id}">${esc(M.THEMES[id].name)}</button>`).join('')}</div><p class="subtle" style="font-size:12px">테마는 이 기기에 저장됩니다.</p></div>`;
  h += `<div class="panel setcard"><b style="color:var(--blue)">채팅과 알림</b>${NSET.map(([k, lab, def]) => `<label class="tgl"><span>${lab}</span><input type="checkbox" data-ns="${k}" ${(ns[k] ?? def) ? 'checked' : ''}></label>`).join('')}<p class="subtle" style="font-size:12px">알림 설정은 계정 기록에 저장되어 다른 기기에서도 그대로 적용됩니다.</p></div>`;
  h += `<div class="panel setcard"><b style="color:var(--accent)">캐릭터</b>${choiceRow('', '캐릭터 설정', '이름 · 사진 · 소개 · 이름 색', 'var(--accent)', true, 'data-go="profile"')}${choiceRow('', '캐릭터 관리', '다른 캐릭터로 바꾸거나 새로 만들기', 'var(--blue)', LIVE.on, 'id="setChars"')}${choiceRow('', '상태 상세', '생존 · 부정/긍정 효과 · 장비 · 확률', 'var(--blue)', true, 'data-go="status"')}</div>`;
  h += `<div class="panel setcard"><b style="color:var(--warning)">도움말</b>${choiceRow('', '생존 규칙', '게임 방법 · 규칙 설명', 'var(--accent)', true, 'data-go="guide"')}${choiceRow('', '업데이트 소식', '새 기능 · 조정 · 고친 점', 'var(--warning)', true, 'data-go="updates"')}</div>`;
  return h; }
function bindSettings() { const c = $('center'); bindProgress(); { const sc = $('setChars'); if (sc) sc.onclick = charManager; } c.querySelectorAll('[data-th]').forEach((b) => { b.onclick = () => { applyTheme(b.dataset.th); render(); }; });
  c.querySelectorAll('[data-ns]').forEach((x) => { x.onchange = () => act(() => { if (!S.P.notify_settings || typeof S.P.notify_settings !== 'object') S.P.notify_settings = {}; S.P.notify_settings[x.dataset.ns] = x.checked; return true; }); }); }
function publicInfo() { const p = S.P, d = derived(), gi = hereRegion(), ch = p.character || {}, pub = ch.pub && typeof ch.pub === 'object' ? ch.pub : { age: false, appearance: !!ch.public, personality: !!ch.public, gender: !!ch.public };
  const shared = { created: !!ch.created, public: Object.values(pub).some(Boolean) }; if (pub.appearance) shared.appearance = String(ch.appearance ?? ch.background ?? '').slice(0, 300); if (pub.personality) shared.personality = String(ch.personality ?? ch.traits ?? '').slice(0, 500); if (pub.gender) shared.gender = String(ch.gender || '').slice(0, 20);
  const hardIds = new Set((p.visited || []).map(String));
  return { isGM: !!S.admin, duelReady: !activityBusy(), level: Number(p.level), day: Number(p.day), hp: Number(p.hp), maxHp: Number(p.max_hp), dead: !!p.dead, weapon: String(p.equipment?.['무기'] || '') && weaponDmg(p.equipment || {}) > 4 ? String(p.equipment['무기']) : '맨손', armor: String(p.equipment?.['방어구'] ?? '없음') || '',
    region: String(GD.REGIONS[gi].name), regionId: gi, tripId: String((p.long_expedition || {}).tripId || ''), character: shared, kills: Number(p.kills || 0), explored: normalVisited().length, explored_hard: p.hard_mode ? locations().filter((l) => l.realm <= HARD_REALM_MAX && hardIds.has(locId(l))).length : 0, stats: { ...(p.stats || {}) },
    d: { attack: Math.trunc(d.attack), crit: d.crit, crit_dmg: Math.trunc(d.crit_dmg), evade: d.evade, defense: Math.trunc(d.defense), loot: Math.trunc(d.loot), rare: Math.trunc(d.rare), retreat: Math.trunc(d.retreat), flee: Math.trunc(d.flee), recover: d.recover }, companions: Object.values(p.companions || {}).filter((c) => c && c.joined).length }; }
const beatSig = () => { const p = S.P; return `${p.level}|${p.day}|${!!p.dead}|${Number(p.avatar || 0)}|${JSON.stringify(p.equipment || {})}`; };
function presenceBeat(force) { if (!LIVE.on || !S.P || $('app').hidden) return; const sig = beatSig(); if (!force && sig === FD.beatSig && nowSec() - Number(FD.beatAt || 0) < 60) return; FD.beatSig = sig; FD.beatAt = nowSec();
  call('presenceBeat', JSON.stringify({ avatar: Number(S.P.avatar || 0), photo: String(S.P.photo || ''), info: publicInfo() })); }
setInterval(() => presenceBeat(false), 5000);

/* ════════ 스토리 · 동료 — main._open_story_chapter · _choose_story · _apply_effects · _recruit · _talk · _gift · _campfire ════════ */
const SDATA = D.story_data, STORY = { ev: null, kind: '' };
const trustTier = (t) => (t < 40 ? 0 : t < 75 ? 1 : 2);
const compOf = (id) => (S.P.companions || {})[id] || {};
const joinedIds = () => Object.keys(SDATA.COMPANIONS).filter((id) => compOf(id).joined);
const activeIds = () => joinedIds().filter((id) => compOf(id).active);
function storyReqs() { const st = Number(S.P.story || 0), p = S.P, day = calendarSync(p).day; if (st >= SDATA.CHAPTERS.length) return []; const out = []; if (st > 0) out.push({ label: '이전 이야기 완료', ok: true });
  if (st === 1) out.push({ label: '탐사 1회 이상 또는 생존 2일차', ok: Number(p.scouted || 0) >= 1 || day >= 2 }); if (st >= 2) out.push({ label: `레벨 ${st} 이상 · 현재 Lv.${p.level}`, ok: Number(p.level) >= st }); if (st === 3) out.push({ label: `생존 3일차 이상 · 현재 ${day}일차`, ok: day >= 3 }); return out; }
const storyReady = () => Number(S.P.story || 0) < SDATA.CHAPTERS.length && storyReqs().every((r) => r.ok);
function currentGoal() { const st = Number(S.P.story || 0); if (st >= SDATA.CHAPTERS.length) return SDATA.ENDING_GOAL; const ch = SDATA.CHAPTERS[st]; return storyReady() ? `${ch.chapter} '${ch.title}' 이야기가 기다린다. 스토리 메뉴에서 조건을 확인하세요.` : `${ch.chapter} · ${ch.goal}`; }
function reqOk(req) { for (const k in (req || {})) { if (k.startsWith('item:')) { if (count(k.slice(5)) < Number(req[k])) return false; } else if (Number(S.P.stats?.[k] || 0) < Number(req[k])) return false; } return true; }
const reqText = (req) => Object.keys(req || {}).map((k) => k.startsWith('item:') ? `${k.slice(5)} ${req[k]}개 필요 (보유 ${count(k.slice(5))})` : `${k} ${req[k]} 필요 (현재 ${Number(S.P.stats?.[k] || 0)})`).join(', ');
function recruit(id) { if (compOf(id).joined) return; if (!S.P.companions || typeof S.P.companions !== 'object') S.P.companions = {}; S.P.companions[id] = { joined: true, trust: 0, active: activeIds().length < 2, talk_day: 0, gift_day: 0 }; const c = SDATA.COMPANIONS[id];
  if (!S.P.party_formed) { S.P.party_formed = true; story('[color=#3fd0a4]파티 결성[/color]  첫 동료와 함께 파티가 만들어졌다.'); } story(`[color=#${c.color}]${c.name}[/color] (${c.role})이(가) 동료로 합류했다.`); toast(`${c.name} 합류! 파티 메뉴에서 대화하고 동행을 정할 수 있습니다.`); }
function addTrust(id, n) { if (!compOf(id).joined) return; const c = S.P.companions[id], before = trustTier(Number(c.trust)), t0 = Number(c.trust); c.trust = Math.max(0, Math.min(100, Number(c.trust) + n)); if (Number(c.trust) > t0) questEvent('trust', Number(c.trust) - t0);
  const after = trustTier(Number(c.trust)); if (after > before) gLog(`[color=#${SDATA.COMPANIONS[id].color}]${SDATA.COMPANIONS[id].name}[/color]의 신뢰가 [b]${['경계', '동료', '전우'][after]}[/b] 단계가 됐다. 전투 지원이 강해진다.`); }
function applyEffects(e) { const p = S.P; if (e.advance && Number(e.story_target ?? Number(p.story || 0) + 1) <= Number(p.story || 0)) return;
  if (e.recruit) recruit(String(e.recruit)); if (e.trust) for (const id in e.trust) addTrust(id, Number(e.trust[id]));
  if (e.items) for (const it in e.items) { const n = Number(e.items[it]); if (n >= 0) addItem(it, n); else removeItem(it, -n); }
  if (e.morale != null) p.morale = Math.max(0, Math.min(100, Number(p.morale) + Number(e.morale))); if (e.hp != null) p.hp = Math.max(1, Math.min(Number(p.max_hp), Number(p.hp) + Number(e.hp))); if (e.xp != null) addXp(Number(e.xp));
  if (e.flag) { if (!p.flags || typeof p.flags !== 'object') p.flags = {}; p.flags[String(e.flag)] = true; if (String(e.flag) === 'ending') story('[color=#3fd0a4]엔딩: 마지막 불빛[/color]  신호는 도시 전체로 퍼져 나갔다. 당신의 기록은 계속된다.'); }
  if (e.advance) { if (!p.story_choices || typeof p.story_choices !== 'object') p.story_choices = {}; p.story_choices[String(Number(p.story || 0))] = Number((p.story_pending_choice || {}).choice ?? -1); p.story = Number(e.story_target ?? Number(p.story || 0) + 1); p.story_pending_choice = {}; p.story_cursor = {}; questEvent('story'); story(`[color=#8b98a5]다음 목표[/color]  ${currentGoal()}`); } }
function openChapter() { if (!storyReady()) { toast('스토리 메뉴에서 필요한 조건을 확인하세요.'); return false; } if (activityBusy() || incapacitated()) { toast('현재 활동을 마치고 사기를 회복한 뒤 진행하세요.'); return false; }
  STORY.ev = { ...clone(SDATA.CHAPTERS[Number(S.P.story || 0)]), _progress_index: Number(S.P.story || 0) }; STORY.kind = 'chapter'; story(`${STORY.ev.chapter} · ${STORY.ev.title}`); return true; }
function chooseStory(i) { const ev = STORY.ev; if (!ev || i < 0 || i >= ev.choices.length) return false; const p = S.P;
  if (STORY.kind === 'chapter' && Number(ev._progress_index ?? p.story) !== Number(p.story || 0)) { STORY.ev = null; p.story_cursor = {}; toast('이미 완료한 이야기입니다.'); FD.back = 'story_menu'; return true; }
  const c = ev.choices[i], eff = clone(c.effects || {}); if (!reqOk(c.req || {})) return false; if (eff.combat && fieldWaitLeft() > 0) { toast(`${String(p.field_rest_kind || '전투') === '탐사' ? '탐사 후' : '전투 후'} ${fieldWaitLeft()}초 더 쉬어야 합니다.`); return false; }
  const kind = STORY.kind; story(`[color=#8b98a5]선택[/color]  ${c.text}`); if (kind === 'scene') { if (!Array.isArray(p.scenes_seen)) p.scenes_seen = []; p.scenes_seen.push(String(ev.id)); }
  if (kind === 'chapter') { p.story_pending_choice = { chapter: Number(p.story || 0), choice: i }; if (eff.advance) eff.story_target = Number(p.story || 0) + 1; } STORY.ev = null; p.story_cursor = {};
  if (eff.combat) { const cb = eff.combat; p.battle = { enemy: cb.enemy, hp: Number(cb.hp), max_hp: Number(cb.hp), attack: Number(cb.atk), xp: Number(cb.xp), loot: cb.loot, location: String(ev.place || '거점'), on_win: clone(cb.on_win || {}), win_text: cb.win_text || '' };
    if (kind === 'chapter' && p.battle.on_win.advance) p.battle.on_win.story_target = Number(p.story || 0) + 1; p.battle_turn = 1; FD.live = null; story(`[color=#f2706a]전투 개시![/color]  ${cb.enemy}`); return true; }
  if (c.result != null) story(String(c.result)); applyEffects(eff); FD.back = kind === 'scene' ? 'story_menu' : 'hub'; return true; }
function talkTo(id) { const c = S.P.companions[id], day = calendarSync(S.P).day; if (Number(c.talk_day) === day) { toast('오늘은 이미 이야기를 나눴습니다. 내일 다시 말을 걸어 보세요.'); return false; } const info = SDATA.COMPANIONS[id], lines = info.talk[trustTier(Number(c.trust))];
  story(`[color=#${info.color}]${info.name}[/color]  ${lines[(day + Number(c.trust)) % lines.length]}`); c.talk_day = day; addTrust(id, 6); questEvent('talk'); return true; }
function giftTo(id, it) { const c = S.P.companions[id], day = calendarSync(S.P).day; if (Number(c.gift_day) === day) { toast('선물은 하루에 한 번만 줄 수 있습니다.'); return false; } if (count(it) <= 0) return false; removeItem(it, 1); const info = SDATA.COMPANIONS[id], fav = String(info.favorite) === it;
  c.gift_day = day; questEvent('gift'); addTrust(id, fav ? 12 : 6); gLog(`[color=#${info.color}]${info.name}[/color]에게 ${it}을(를) 건넸다.${fav ? '  "이거, 제일 필요했던 것입니다."' : ''}`); return true; }
function toggleActive(id) { const c = S.P.companions[id]; if (c.active) { c.active = false; gLog(`${SDATA.COMPANIONS[id].name}은(는) 거점에서 대기한다.`); } else if (activeIds().length >= 2) { toast('동행은 최대 2명까지 가능합니다. 다른 동료를 먼저 대기시키세요.'); return false; } else { c.active = true; gLog(`${SDATA.COMPANIONS[id].name}이(가) 다음 탐사에 동행한다.`); } return true; }
function toggleParty() { S.P.party_formed = !S.P.party_formed; gLog(S.P.party_formed ? '[color=#3fd0a4]파티 결성[/color]  동료들이 다시 한 팀으로 움직인다.' : '[color=#f2706a]파티 해체[/color]  동료들은 거점에 남고, 당신은 혼자 탐사에 나선다.'); return true; }
function campfire() { const p = S.P, day = calendarSync(p).day; if (Number(p.campfire_day) === day) { toast('모닥불은 하루에 한 번 피울 수 있습니다.'); return false; } p.campfire_day = day; questEvent('campfire'); for (const id of joinedIds()) addTrust(id, 2);
  const sc = SDATA.PARTY_SCENES.find((s) => !(p.scenes_seen || []).includes(String(s.id)) && compOf(String(s.a)).joined && compOf(String(s.b)).joined);
  if (sc) { STORY.ev = clone(sc); STORY.kind = 'scene'; story(`[color=#e3b341]모닥불 · ${sc.title}[/color]`); return true; }
  p.morale = Math.min(100, Number(p.morale) + 4); story(`[color=#e3b341]모닥불[/color]  ${SDATA.CAMPFIRE_CHATTER[day % SDATA.CAMPFIRE_CHATTER.length]}  (사기 +4)`); return true; }
function storyMenuPage() { const st = Number(S.P.story || 0), ch = SDATA.CHAPTERS; let h = headT('스토리', `기록 ${String(Math.min(st + 1, ch.length)).padStart(2, '0')} / ${ch[Math.min(st, ch.length - 1)].place || ''}`);
  h += '<div class="stwrap"><div class="panel sthero">'; if (st >= ch.length) h += '<small>이어서 읽기</small><p>현재 준비된 이야기를 모두 읽었습니다.</p>';
  else { const c = ch[st], rs = storyReqs(), ready = storyReady() && !activityBusy() && !incapacitated(); h += `<small>이어서 읽기</small><b>기록 ${String(st + 1).padStart(2, '0')} · ${esc(c.title)}</b><p>${esc(c.goal || '')}</p><div class="streq"><b>열리는 조건</b>${rs.length ? rs.map((r) => `<div><i class="${r.ok ? 'ok' : ''}"></i><span>${esc(r.label)}</span><em style="color:${r.ok ? 'var(--accent)' : 'var(--warning)'}">${r.ok ? '충족' : '미충족'}</em></div>`).join('') : '<p>첫 이야기는 바로 진행할 수 있습니다.</p>'}</div><button class="btn primary" id="stGo" style="min-height:52px" ${ready ? '' : 'disabled'}>${ready ? '스토리 진행' : '조건을 더 채워 주세요'}</button>`; }
  h += `</div><div class="panel stlist"><b>기록</b>${ch.map((c, i) => `<div class="${i === st ? 'cur' : ''}"><small>${String(i + 1).padStart(2, '0')}</small><span>${esc(c.title)}</span><em>${i < st ? '완료' : i === st ? '진행 중' : '잠김'}</em></div>`).join('')}</div></div>`;
  h += `<div class="panel stcomp"><b>동료 · 이야기 속에서 만난 생존자</b><div class="grid">${Object.keys(SDATA.COMPANIONS).map((id) => { const info = SDATA.COMPANIONS[id], c = compOf(id), met = !!c.joined; return `<button class="ccard2" data-comp="${id}" ${met ? '' : 'disabled'}><b style="color:${met ? '#' + info.color : 'var(--muted)'}">${met ? esc(info.name) : '아직 만나지 못한 생존자'}</b><span>${met ? `${esc(info.role)} · 신뢰 ${c.trust} (${['경계', '동료', '전우'][trustTier(Number(c.trust))]})${c.active ? ' · 동행 중' : ''}` : '이야기를 진행하면 만날 수 있습니다'}</span></button>`; }).join('')}</div>
    ${joinedIds().length ? `<div class="mrow"><button class="btn" id="stFire">모닥불 피우기</button><button class="btn" id="stParty">${S.P.party_formed ? '파티 해체' : '파티 결성'}</button></div>` : ''}</div>`;
  return h; }
function storyPage() { const ev = STORY.ev; if (!ev) return storyMenuPage(); let h = headT(STORY.kind === 'chapter' ? `${ev.chapter} · ${ev.title}` : `모닥불 · ${ev.title}`, String(ev.place || '거점의 밤')) + `<div class="story">${esc(ev.lines.join('\n'))}</div>`;
  ev.choices.forEach((c, i) => { const ok = reqOk(c.req || {}); h += choiceRow(i + 1, c.text, ok ? c.desc : `${c.desc} · ${reqText(c.req)}`, STORY.kind === 'chapter' ? 'var(--warning)' : 'var(--accent)', ok, `data-sch="${i}"`); }); return h; }
function compModal(id) { const info = SDATA.COMPANIONS[id], c = compOf(id); if (!c.joined) return; const tier = trustTier(Number(c.trust)), day = calendarSync(S.P).day, talked = Number(c.talk_day) === day, gifted = Number(c.gift_day) === day;
  let h = `<p class="muted" style="margin-top:-4px">${esc(info.role)} · ${esc(info.bio || '')}</p><div class="panel" style="padding:12px 14px;display:grid;gap:8px"><div class="mlab"><span>신뢰도 · ${['경계', '동료', '전우'][tier]}</span><b>${Number(c.trust)} / 100</b></div>${cbar(Number(c.trust), 100, '#' + info.color)}<p class="muted" style="white-space:pre-line;margin:0;font-size:14px">전투 능력 · ${esc(info.skill)}\n동행 보너스 · ${esc(info.passive)}\n좋아하는 선물 · ${esc(info.favorite)}\n신뢰가 높을수록 전투 지원이 강해지고 대화가 깊어집니다. (40 동료 / 75 전우)</p></div>`;
  h += choiceRow('', '대화하기', talked ? '오늘 이미 이야기를 나눴다.' : '신뢰 +6 · 하루 1회', 'var(--accent)', !talked, 'data-cm="talk"');
  for (const it of ['통조림', '물']) { const fav = String(info.favorite) === it; h += choiceRow('', `${it} 선물하기 · 보유 ${count(it)}`, (fav ? '좋아하는 선물! 신뢰 +12' : '신뢰 +6') + (gifted ? ' · 오늘은 이미 선물했다' : ''), 'var(--warning)', count(it) > 0 && !gifted, `data-cg="${it}"`); }
  h += choiceRow('', c.active ? '대기시키기' : '동행시키기', c.active ? '탐사·전투에 함께하지 않는다.' : '탐사·전투에 함께한다. (최대 2명)', 'var(--blue)', true, 'data-cm="act"');
  modal(`${info.name} · ${info.role}`, h, [['닫기', '', null]]);
  const r = $('modalRoot'), again = () => { if (S.P.companions?.[id]?.joined) compModal(id); };
  r.querySelectorAll('[data-cm]').forEach((b) => { b.onclick = () => { r.innerHTML = ''; act(() => (b.dataset.cm === 'talk' ? talkTo(id) : toggleActive(id)), again); }; }); r.querySelectorAll('[data-cg]').forEach((b) => { b.onclick = () => { r.innerHTML = ''; act(() => giftTo(id, b.dataset.cg), again); }; }); }
function bindStory() { const c = $('center'); bindProgress(); const g = $('stGo'); if (g) g.onclick = () => act(() => openChapter(), () => go('story'));
  c.querySelectorAll('[data-sch]').forEach((b) => { b.onclick = () => act(() => chooseStory(Number(b.dataset.sch)), () => { if (nonEmpty(S.P.battle)) go('combat'); else { const m = FD.back || 'hub'; FD.back = ''; go(m); } }); });
  c.querySelectorAll('[data-comp]').forEach((b) => { b.onclick = () => compModal(b.dataset.comp); }); const f = $('stFire'); if (f) f.onclick = () => act(() => campfire(), () => { if (STORY.ev) go('story'); }); const pt = $('stParty'); if (pt) pt.onclick = () => act(() => toggleParty()); }

/* ════════ 반려동물 — pet_system.gd 그대로(거점 사건 · 만남 · 돌봄 · 교감 · 입양 · 이름 · 놓아주기) ════════ */
const PD = D.pet_data, PSY = D.pet_system;
const PET = { sel: '', after: null };
const isDict = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
/* Godot String.hash()(djb2 · 글자 코드 단위)와 같은 값 */
function godotHash(s) { let h = 5381; for (const ch of String(s)) h = (Math.imul(h, 33) + ch.codePointAt(0)) >>> 0; return h; }
const signed = (n) => (n >= 0 ? '+' : '') + n;
function petEnsure() { const p = S.P; if (!p) return;
  if (!Array.isArray(p.pets)) p.pets = []; if (!isDict(p.wild_animal)) p.wild_animal = {}; if (!isDict(p.hub_event)) p.hub_event = {}; if (!('pet_bond_ready' in p)) p.pet_bond_ready = 0;
  for (const pet of p.pets) {
    for (const k of ['affinity', 'hunger', 'health', 'water']) pet[k] = Math.max(0, Math.min(100, Math.trunc(Number(pet[k] ?? 60))));
    if (!isDict(pet.cooldowns)) pet.cooldowns = {}; if (!('care_at' in pet)) pet.care_at = nowSec();
    if (Number(pet.care_fix || 0) < 1) { pet.care_fix = 1; pet.care_at = nowSec(); pet.affinity = Math.max(Number(pet.affinity), PD.ADOPT_AFFINITY); pet.hunger = Math.max(Number(pet.hunger), 55); pet.water = Math.max(Number(pet.water), 60); pet.health = Math.max(Number(pet.health), 60); }
  } }
const petNote = (t) => story('반려동물 · ' + t);
function petActive() { const e = S.P.hub_event || {}; return nonEmpty(e) && String(e.status || '') === 'pending' && (e.admin || Number(e.day) === Math.floor(kstNow() / 86400)) && petWindow(); }
function petSchedule() { const p = S.P, day = Math.floor(kstNow() / 86400); if (Number(p.hub_event.day ?? -1) === day) return;
  const rng = new GRng(godotHash(String(S.acct?.uid ?? S.acct?.username ?? '') + ':' + day + ':morning'));
  let animal = ''; const kind = rng.randf() < 0.55 ? 'loot' : 'animal';
  if (kind === 'animal') { const roll = rng.randiRange(1, 100); let cum = 0; for (const sp in PD.SPECIES) { cum += Number(PD.SPECIES[sp].weight); if (roll <= cum) { animal = sp; break; } } }
  const due = day * 86400 + 9 * 3600 + rng.randiRange(0, kind === 'animal' ? 53999 : 10799);
  p.hub_event = { id: 'morning-' + day, day, due, kind, species: animal, status: 'scheduled', window_version: 21, item: PD.LOOT_POOL[rng.randiRange(0, PD.LOOT_POOL.length - 1)] }; }
/* v35 · 관리자 반려동물 출현 이벤트 — 이벤트마다 한 번, 진행 중인 거점 사건이 끝난 뒤에 나타남 */
function petAdminEvent(ev, nowMs) { const p = S.P; if (!p || !p.character?.created) return false; petEnsure(); const id = String(ev.id ?? ''), until = Number(ev.until || 0); if (!id || until <= nowMs) return false;
  if (!isDict(p.pet_admin_seen)) p.pet_admin_seen = {}; const seen = p.pet_admin_seen; if (id in seen || petActive()) return false;
  let sp = String(ev.species ?? ''); if (!PD.SPECIES[sp]) { let total = 0; for (const k in PD.SPECIES) total += Number(PD.SPECIES[k].weight); const roll = gRandiRange(1, Math.max(1, total)); let cum = 0; for (const k in PD.SPECIES) { cum += Number(PD.SPECIES[k].weight); if (roll <= cum) { sp = k; break; } } }
  const left = Math.trunc((until - nowMs) / 1000), k = kstNow();
  p.hub_event = { id, day: Math.floor(k / 86400), due: k, kind: 'animal', species: sp, status: 'scheduled', window_version: 21, admin: true, until_kst: k + left, item: '' };
  seen[id] = nowSec(); if (Object.keys(seen).length > 30) { const keys = Object.keys(seen).sort((a, b) => Number(seen[a]) - Number(seen[b])); for (const x of keys.slice(0, keys.length - 20)) delete seen[x]; } return true; }
/* 10초마다(main._feature_tick) — 반환: 바뀌었으면 true(바로 저장) */
function petTickCore() { const p = S.P; if (!p || !p.character?.created) return false; petEnsure(); petSchedule(); let changed = false; const now = nowSec();
  for (const pet of [...p.pets]) { const hours = Math.min(48, Math.max(0, Math.trunc((now - Number(pet.care_at)) / 3600))); if (hours <= 0) continue;
    for (let h = 0; h < hours; h++) { pet.hunger = Math.max(0, Number(pet.hunger) - 2); pet.water = Math.max(0, Number(pet.water) - 3); petAutoFeed(pet); /* v37.70 */
      if (pet.hunger < 20 || pet.water < 20) pet.affinity = Math.max(0, Number(pet.affinity) - 2); if (pet.hunger === 0 || pet.water === 0) pet.health = Math.max(1, Number(pet.health) - 1); }
    pet.care_at = hours < 48 ? Number(pet.care_at) + hours * 3600 : now; changed = true; if (Number(pet.affinity) <= 0) petLeave(pet); }
  for (const pet of [...p.pets]) { if (petAutoFeed(pet)) changed = true; if (petLowAlert(pet)) changed = true; }
  const e = p.hub_event, st = String(e.status || '');
  if (st === 'scheduled' && kstNow() >= Number(e.due) && petWindow() && isHubNow()) { e.status = 'pending'; changed = true;
    const text = String(e.kind) === 'animal' ? `거점 바깥에서 ${e.species}이(가) 조심스럽게 다가왔습니다.` : '거점 정리 중 낡은 보급 상자를 발견했습니다. 세 가지 방법 중 하나를 고를 수 있습니다.';
    alertPopup(String(e.id), '현지 거점 · 작은 사건', text + '\n반려동물 메뉴의 거점 사건에서 선택하세요. ' + (String(e.kind) === 'animal' ? (e.admin ? '관리자 이벤트 · 종료 시각까지 동물을 만날 수 있습니다.' : '23:59까지 동물을 만날 수 있습니다.') : '정오까지 보급품을 확인할 수 있습니다.'), 'hub_event', { hub_event: String(e.id) }); }
  const st2 = String(e.status || '');
  if (e.admin) { if (['scheduled', 'pending'].includes(st2) && !petWindow()) { e.status = 'expired'; changed = true; } }
  else if (['scheduled', 'pending'].includes(st2) && !petWindow() && kstNow() % 86400 >= (String(e.kind) === 'animal' ? 24 : 12) * 3600) { e.status = 'expired'; changed = true; }
  return changed; }
/* v37.70 자동 급식 — 허기·수분이 각각 30 이하가 되면 가방의 먹이 · 물을 스스로 먹어 100까지 채운다. 호감도는 직접 줄 때의 절반(먹이 +6 · 물 +2) */
const PET_AUTO_AT = 30;
function petAutoFeed(pet) { if (!pet.adopted || S.P.pet_auto_feed === false) return false; const name = String(pet.name); let did = false; const food = String(D.pet_data.SPECIES[String(pet.species)]?.food || '반려동물 사료');
  for (const [key, item, add, aff, lab] of [['hunger', food, 35, 6, '허기'], ['water', '물', 40, 2, '수분']]) {
    if (Number(pet[key] || 0) > PET_AUTO_AT) { delete pet['auto_none_' + key]; continue; }
    const before = Number(pet[key]), aff0 = Number(pet.affinity); let used = 0;
    while (Number(pet[key]) < 100 && count(item) > 0) { removeItem(item, 1); used++; pet[key] = Math.min(100, Number(pet[key]) + add); pet.affinity = Math.min(100, Number(pet.affinity) + aff); }
    if (used > 0) { delete pet['auto_none_' + key]; did = true; petNote(`자동 급식 · ${name}이(가) ${item} ${used}개로 ${lab} ${before} → ${Number(pet[key])} · 호감도 ${sgn(Number(pet.affinity) - aff0)}`); }
    else if (!pet['auto_none_' + key]) { pet['auto_none_' + key] = true; did = true; notify(`pet-auto-none-${pet.id}-${key}-${nowSec()}`, '반려동물 자동 급식', `${name}의 ${lab}이(가) ${Number(pet[key])}입니다. 가방에 ${item}이(가) 없어 스스로 먹지 못했습니다. ${item}을(를) 준비해 주세요.`, 'pet'); } }
  return did; }
function petAutoToggle() { act(() => { S.P.pet_auto_feed = S.P.pet_auto_feed === false; toast('반려동물 자동 급식을 ' + (S.P.pet_auto_feed ? '켰습니다.' : '껐습니다.')); if (S.P.pet_auto_feed) petTickCore(); return true; }); }
/* v37.70: 호감도가 30 이하로 내려가면 돌봐 달라는 알림(30을 넘었다가 다시 내려갈 때마다 한 번) */
function petLowAlert(pet) { if (!pet.adopted) return false; if (Number(pet.affinity) > PET_AUTO_AT) { if ('low_alert' in pet) { delete pet.low_alert; return true; } return false; } if (pet.low_alert) return false;
  pet.low_alert = true; notify(`pet-low-${pet.id}-${nowSec()}`, '반려동물 호감도 주의', `${String(pet.name)}의 호감도가 ${Number(pet.affinity)}입니다. 0이 되면 거점을 떠나니 대화 · 놀이 · 교감으로 호감도를 채워 주세요.`, 'pet'); return true; }
function petFind(id) { const p = S.P; if (String(p.wild_animal?.id ?? '') === id) return p.wild_animal; return (p.pets || []).find((x) => String(x.id ?? '') === id) || {}; }
function petLeave(pet) { const p = S.P, id = String(pet.id), name = String(pet.name);
  if (String(p.wild_animal?.id ?? '') === id) p.wild_animal = {}; else for (let i = p.pets.length - 1; i >= 0; i--) if (String(p.pets[i].id) === id) p.pets.splice(i, 1);
  if (PET.sel === id) PET.sel = ''; petNote(name + '이(가) 신뢰를 잃고 거점 밖으로 떠났다.'); alertPopup('pet-left-' + id, '반려동물이 떠났습니다', name + ' · 호감도가 0이 되어 더는 머물지 않습니다.', 'pet'); }
function petMake(sp, id) { return { id, species: sp, name: sp, affinity: Number(PD.SPECIES[sp].affinity), hunger: 55, water: 60, health: 100, care_at: nowSec(), cooldowns: {}, adopted: false }; }
function petResolveLoot(i) { const p = S.P; if (!isHubNow() || !petActive() || String(p.hub_event.kind) !== 'loot' || i < 0 || i >= 3) return false;
  const ch = PD.LOOT_CHOICES[i], cost = i * 2; if (Number(p.hunger) < cost || Number(p.water) < cost) { toast(`허기와 수분이 각각 ${cost} 필요합니다.`); return false; }
  const e = p.hub_event; e.status = 'resolved'; questEvent('hub_event'); p.hunger = Number(p.hunger) - cost; p.water = Number(p.water) - cost;
  const roll = gRandiRange(1, 100), success = roll <= Number(ch.chance), item = String(e.item), amount = success ? Number(ch.quantity) : 0; let stored = false;
  if (amount > 0 && !addItem(item, amount)) { if (!isDict(p.stored_loot)) p.stored_loot = {}; p.stored_loot[item] = Number(p.stored_loot[item] || 0) + amount; stored = true; }
  e.result = { chance: Number(ch.chance), roll, success, item, qty: amount, stored };
  gLog(`거점 발견 · ${ch.title} · 성공확률 ${ch.chance}% · 판정 ${roll} · ${success ? item + ' ' + amount + '개' : '빈 상자였다'}`);
  PET.after = ['거점 발견 결과', success ? `${item} ${amount}개를 발견했습니다.${stored ? '\n가방이 가득 차 받은 물품함으로 보냈습니다.' : '\n가방에 넣었습니다.'}` : '주변을 확인했지만 쓸 만한 물건은 없었습니다.\n오늘의 사건은 완료되었습니다.']; return true; }
function petMeet() { const p = S.P; if (!isHubNow() || !petActive() || String(p.hub_event.kind) !== 'animal') return false;
  if (nonEmpty(p.wild_animal)) { toast('이미 곁에서 살펴보는 동물이 있습니다. 반려동물 메뉴에서 먼저 관리하세요.'); return false; }
  const e = p.hub_event; e.status = 'resolved'; questEvent('hub_event'); const sp = String(e.species), a = petMake(sp, String(e.id) + '-animal');
  p.wild_animal = a; petNote('거점에서 ' + sp + '을(를) 만났다. 거리를 지키며 천천히 친해져 보기로 한다.'); PET.sel = a.id; return true; }
function petRelease() { const p = S.P; if (!nonEmpty(p.wild_animal)) return false; const name = String(p.wild_animal.name ?? '동물');
  if (PET.sel === String(p.wild_animal.id ?? '')) PET.sel = ''; p.wild_animal = {}; petNote(name + '을(를) 조용히 놓아주었다. 거점 밖으로 천천히 걸어 나간다.'); toast(name + '을(를) 놓아주었습니다.'); return true; }
function petAdopt(id) { const p = S.P; if (!isHubNow()) { toast('현지 거점에서만 입양할 수 있습니다.'); return false; }
  const pet = petFind(id); if (!nonEmpty(pet) || pet.adopted) return false;
  if (Number(pet.affinity) < PD.ADOPT_AFFINITY) { toast('호감도 60부터 입양할 수 있습니다.'); return false; }
  if (p.pets.length >= PD.MAX_PETS) { toast('반려동물은 최대 5마리까지 함께할 수 있습니다.'); return false; }
  pet.adopted = true; pet.care_at = nowSec(); pet.care_fix = 1; p.pets.push(clone(pet)); p.wild_animal = {}; petNote(pet.name + '을(를) 반려동물로 맞이했다. 서로의 일상이 조금 가까워졌다.'); return true; }
function petCare(id, action) { if (action.startsWith('bond_')) return petInteract(id, action);
  const p = S.P; if (!isHubNow()) { toast('돌봄은 현재 지역 거점에서만 할 수 있습니다.'); return false; }
  const pet = petFind(id); if (!nonEmpty(pet)) return false; const now = nowSec(), until = Number(pet.cooldowns[action] || 0);
  if (until > now) { toast(`잠시 쉬게 해 주세요. ${until - now}초 뒤 다시 할 수 있습니다.`); return false; }
  let gain = 0, text = '', cd = 60; const nm = String(pet.name);
  if (action === 'feed') { const food = String(PD.SPECIES[pet.species].food);
    if (Number(pet.hunger) >= 95) { toast('이미 배가 부릅니다. 대화나 놀이로 친해져 보세요.'); return false; }
    if (count(food) <= 0) { toast(food + '이(가) 필요합니다. 거점 상점·제작에서 준비하세요.'); return false; }
    removeItem(food, 1); pet.hunger = Math.min(100, Number(pet.hunger) + 35); gain = 12; cd = 120; text = '알맞은 먹이를 조용히 내려놓았다. ' + nm + '이(가) 경계를 조금 풀었다.'; }
  else if (action === 'water') { if (Number(pet.water) >= 95) { toast('물은 충분합니다.'); return false; } if (count('물') <= 0) { toast('가방에 물이 필요합니다.'); return false; }
    removeItem('물', 1); pet.water = Math.min(100, Number(pet.water) + 40); gain = 3; cd = 120; text = '깨끗한 물을 준비했다. ' + nm + '이(가) 편안히 쉬었다.'; }
  else if (action === 'heal') { if (Number(pet.health) >= 100) { toast('건강한 상태입니다.'); return false; } if (count('동물 치료약') <= 0) { toast('동물 치료약이 필요합니다.'); return false; }
    removeItem('동물 치료약', 1); pet.health = Math.min(100, Number(pet.health) + 40); gain = 5; cd = 120; text = nm + '의 상태를 살피고 동물 치료약을 사용했다.'; }
  else if (action === 'talk') { gain = 5; text = String(PD.TALK[gRandiRange(0, PD.TALK.length - 1)]).replaceAll('{name}', nm); }
  else if (action === 'play') { if (count('반려동물 장난감') <= 0) { toast('반려동물 장난감을 가방에 준비하세요. 놀이로 소비되지 않습니다.'); return false; }
    gain = 8; cd = 120; text = String(PD.PLAY[gRandiRange(0, PD.PLAY.length - 1)]).replaceAll('{name}', nm); }
  else if (action === 'rush') { gain = -15; text = '서둘러 붙잡자 ' + nm + '이(가) 불편해하며 뒤로 물러났다.'; }
  else return false;
  const aff0 = Number(pet.affinity); pet.cooldowns[action] = now + cd; pet.affinity = Math.max(0, Math.min(100, aff0 + gain)); petNote(text + ' · 호감도' + signed(gain));
  if (action !== 'rush' && pet.adopted) { questEvent('pet_care'); if (action === 'feed') questEvent('pet_feed'); if (action === 'play') questEvent('pet_play'); }
  if (pet.affinity > aff0 && pet.adopted) questEvent('pet_affinity', pet.affinity - aff0);
  if (pet.affinity <= 0) petLeave(pet); return true; }
function petInteract(id, action) { const p = S.P; if (!isHubNow()) { toast('교감은 현지 거점에서 활동을 마친 뒤 가능합니다.'); return false; }
  let index = -1; PD.BOND_ACTIONS.forEach((b, i) => { if (String(b[0]) === action) index = i; });
  const pet = petFind(id); if (index < 0 || !nonEmpty(pet) || !pet.adopted) return false; const now = nowSec();
  if (Number(pet.cooldowns.bond || 0) > now) { toast('교감 후 잠시 쉬게 해 주세요. 120초 간격으로 함께할 수 있습니다.'); return false; }
  if (Number(pet.health) < 20 || Number(pet.hunger) < 20 || Number(pet.water) < 20) { toast('건강·허기·수분이 각각 20 이상일 때 편안히 교감합니다. 먼저 돌봐 주세요.'); return false; }
  const aff1 = Number(pet.affinity); pet.cooldowns.bond = now + 120; pet.affinity = Math.min(100, aff1 + 4);
  questEvent('pet_care'); if (pet.affinity > aff1) questEvent('pet_affinity', pet.affinity - aff1);
  let line = String(PD.BOND_LINES[pet.species][index]).replaceAll('{name}', String(pet.name)); petNote(line + ' · 호감도+4');
  if (Number(p.pet_bond_ready || 0) <= now) { p.pet_bond_ready = now + PD.BOND_COOLDOWN;
    if (gRandiRange(1, 100) <= PD.BOND_CHANCE) { const effect = String(PD.BOND_EFFECTS[gRandiRange(0, PD.BOND_EFFECTS.length - 1)]), dur = gRandiRange(7200, 10800);
      const bonus = clone(BD.POSITIVES[effect]); bonus.duration = dur; bonus.until = now + dur; bonus.tick = now;
      if ('interval' in bonus && Number(bonus.interval) > 0) bonus.interval = niceInterval(Math.round(Math.trunc(bonus.interval) * dur / Math.max(1, PD.BOND_DURATION)));
      bonus.desc = positiveDefText(bonus); if (!isDict(p.positive)) p.positive = {}; p.positive[effect] = bonus;
      line += '\n긍정 효과 · ' + bonus.name + ' · ' + durationText(dur) + '\n' + bonus.desc; }
    else line += '\n오늘은 조용히 교감했습니다. 특별한 효과는 없지만 호감도가 올랐습니다.'; }
  else line += '\n긍정 효과 판정까지 ' + durationText(Number(p.pet_bond_ready) - now) + ' 남았습니다. 교감과 호감도 상승은 가능합니다.';
  PET.after = ['반려동물과의 교감', line]; return true; }
function petRename(id, text) { if (!isHubNow()) { toast('이름은 현지 거점에서 바꿉니다.'); return false; }
  const pet = petFind(id), clean = String(text).trim(); if (!nonEmpty(pet) || !pet.adopted) return false;
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ]{1,12}$/.test(clean)) { toast('이름은 한글·영문·숫자·공백 1~12자로 적어 주세요.'); return false; }
  const old = String(pet.name); pet.name = clean; petNote(old + "의 이름을 '" + clean + "'(으)로 정했다."); return true; }
function petAfter() { if (!PET.after) return; const [t, b] = PET.after; PET.after = null; modal(t, `<p style="white-space:pre-line;color:var(--text)">${esc(b)}</p>`); }

/* 화면 — pet_system.render · render_event */
const petIcon = (sp, px = 26) => `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${PSY.PET_ICONS[sp] || PSY.PET_ICONS['개']}"/></svg>`;
const PET_ROWS = [['feed', '먹이 주기'], ['water', '물 주기'], ['talk', '대화하기'], ['play', '놀기'], ['heal', '치료하기'], ['rush', '서둘러 붙잡기']];
function petBar(label, v, col) { return `<div class="pbar"><div><span>${label}</span><b>${v}</b></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></div></div>`; }
function petsPage() { petEnsure(); const p = S.P, hub = isHubNow(); let h = headT('반려동물', '호감도 60 이상이면 탐사 중에 도와줍니다');
  if (petActive()) h += choiceRow('', '거점 사건 · ' + (String(p.hub_event.kind) === 'animal' ? '동물 조우' : '보급품 발견'), (String(p.hub_event.kind) === 'animal' ? '한국시간 23:59까지' : '정오까지') + ' · 오늘의 사건 선택', 'var(--warning)', hub, 'id="petEv"');
  if (!hub) h += noteBox('이동·탐사 중에는 상태만 확인합니다. 돌봄과 이름 변경은 현지 거점에서 가능합니다.');
  const animals = [...p.pets]; if (nonEmpty(p.wild_animal)) animals.push(p.wild_animal);
  if (!animals.length) return h + noteBox(p.pets.length ? '' : '아직 반려동물이 없습니다. 09:00~23:59의 거점 사건에서 동물과 친해져 보세요.');
  if (p.pets.length) { const on = p.pet_auto_feed !== false; h += choiceRow('', '자동 급식 · ' + (on ? '켜짐' : '꺼짐'), (on ? '허기나 수분이 30 이하가 되면 가방의 먹이와 물을 스스로 먹어 100까지 채웁니다(호감도는 직접 줄 때의 절반). 누르면 끕니다.' : '켜면 허기나 수분이 30 이하일 때 가방의 먹이와 물을 스스로 먹습니다.') + ' 호감도가 30 이하로 떨어지면 알림으로 알려 드립니다.', on ? 'var(--accent)' : 'var(--muted)', true, 'id="petAuto"'); }
  let pet = petFind(PET.sel); if (!nonEmpty(pet)) { pet = animals[0]; PET.sel = String(pet.id); }
  const many = animals.length > 1, now = nowSec(), sp = PD.SPECIES[pet.species] || {};
  h += `<div class="petwrap${many ? ' many' : ''}">`;
  if (many) h += `<div class="petlist"><small>내 동물 ${p.pets.length} / 5${nonEmpty(p.wild_animal) ? ' · 새 동물 1' : ''}</small><div class="pl">${animals.map((a) => { const ad = !!a.adopted, on = String(a.id) === PET.sel;
    return `<button class="petli${on ? ' on' : ''}" data-psel="${esc(a.id)}"><span class="pic ${ad ? 'ad' : ''}">${petIcon(a.species, 26)}</span><span class="tx"><b>${esc(a.name)}</b><span>${ad ? `${esc(a.species)} · 호감 ${a.affinity}` : `새 · ${esc(a.species)} · ${a.affinity}/60`}</span><i style="--w:${Math.max(0, Math.min(100, Number(a.affinity)))}%"></i></span></button>`; }).join('')}</div></div>`;
  h += '<div class="petmain"><div class="panel petcard">';
  h += `<div class="phd"><span class="pic big">${petIcon(pet.species, 44)}</span><div><div class="pn"><b>${esc(pet.name)}</b><span>${pet.adopted ? '반려 · ' : '친해지는 중 · '}${esc(pet.species)}</span></div><p>${esc(sp.desc || '')}</p></div></div>`;
  h += `<div class="pbars">${petBar('호감도', Number(pet.affinity), '#ff8fb8')}${petBar('건강', Number(pet.health), 'var(--danger)')}${petBar('허기', Number(pet.hunger), 'var(--warning)')}${petBar('수분', Number(pet.water), 'var(--blue)')}</div><div class="pacts">`;
  const cdl = (k) => Math.max(0, Number(pet.cooldowns?.[k] || 0) - now);
  if (pet.adopted) { const bl = cdl('bond'), okv = Math.min(Number(pet.health), Number(pet.hunger), Number(pet.water)) >= 20;
    for (const [k, lab] of PD.BOND_ACTIONS) h += `<button class="btn primary" data-pcare="${k}" data-pcd="bond" data-plab="${esc(lab)}" ${hub && bl === 0 && okv ? '' : 'disabled'}>${esc(lab)}${bl > 0 ? ` · ${bl}초` : ''}</button>`; }
  for (const [k, lab] of PET_ROWS) { const l = cdl(k); h += `<button class="btn${k === 'rush' ? ' pdanger' : ''}" data-pcare="${k}" data-pcd="${k}" data-plab="${esc(lab)}" ${hub && l === 0 ? '' : 'disabled'}>${esc(lab)}${l > 0 ? ` · ${l}초` : ''}</button>`; }
  h += `</div><p class="muted phint">먹이 · ${esc(sp.food || '')} 1개 → 허기 +35 · 호감 +12<br>물 1개 → 수분 +40 · 장난감 → 호감 +8 · 동물 치료약 → 건강 +40</p>`;
  if (pet.adopted) h += `<label class="field"><span>반려동물 이름</span><input id="petName" maxlength="12" placeholder="1~12자" value="${esc(pet.name)}"></label><button class="btn" style="color:var(--blue)" id="petRen" ${hub ? '' : 'disabled'}>이름 바꾸기</button>`;
  h += '</div><div class="petside">';
  if (!pet.adopted) h += `<div class="panel petnew"><small>새로 만난 동물</small><b>${esc(pet.name)} · 호감도 ${pet.affinity}</b><button class="btn primary" id="petAdopt" ${hub && Number(pet.affinity) >= 60 && p.pets.length < 5 ? '' : 'disabled'}>반려동물로 맞이하기 · ${pet.affinity}/60</button><button class="btn" id="petRel">놓아주기</button></div>`;
  h += '<div class="panel petinfo"><b>탐사 중 도움</b><p class="muted">호감도 60부터 입양 · 최대 5마리 · 호감도 0이면 떠납니다. 시간당 허기 2 · 수분 3 줄고, 둘 중 하나가 20 미만이면 호감도가 2씩 줄어듭니다(재접속 때 최대 48시간 반영). 교감은 120초 간격으로 호감 +4, 모든 반려동물 합산 10분마다 60% 확률로 5분 효과를 받습니다.</p></div>';
  return h + '</div></div></div>'; }
function petReleaseConfirm(thenMeet) { const w = S.P.wild_animal || {};
  modal('동물 놓아주기', `<p style="white-space:pre-line;color:var(--text)">${esc(`${w.name ?? '동물'}(호감도 ${Number(w.affinity || 0)})을(를) 놓아주시겠습니까?\n쌓은 호감도는 사라지고 되돌릴 수 없습니다.${thenMeet ? '\n놓아준 뒤 지금 만난 동물과 친해지기 시작합니다.' : ''}`)}</p>`,
    [['놓아주기', 'danger', () => act(() => { const ok = petRelease(); if (thenMeet) petMeet(); return ok; }, () => { if (thenMeet) go('pets'); })], ['취소', '', null]]); }
function bindPets() { const c = $('center'), sel = () => PET.sel; { const pa = $('petAuto'); if (pa) pa.onclick = petAutoToggle; }
  const ev = $('petEv'); if (ev) ev.onclick = () => openHubEvent();
  c.querySelectorAll('[data-psel]').forEach((b) => { b.onclick = () => { PET.sel = b.dataset.psel; redrawKeep(); }; });
  c.querySelectorAll('[data-pcare]').forEach((b) => { b.onclick = () => act(() => petCare(sel(), b.dataset.pcare), petAfter); });
  const ad = $('petAdopt'); if (ad) ad.onclick = () => act(() => petAdopt(sel()));
  const rl = $('petRel'); if (rl) rl.onclick = () => petReleaseConfirm(false);
  const rn = $('petRen'); if (rn) rn.onclick = () => act(() => petRename(sel(), $('petName').value)); }
/* 남은 대기 시간은 버튼 글자만 1초마다 고치고, 끝나는 순간에만 다시 그립니다(v37.31) */
function petCdTick() { if (S.mode !== 'pets') return; const pet = petFind(PET.sel); if (!nonEmpty(pet)) return; let done = false; const now = nowSec();
  document.querySelectorAll('#center [data-pcd]').forEach((b) => { const left = Math.max(0, Number(pet.cooldowns?.[b.dataset.pcd] || 0) - now), t = b.dataset.plab + (left > 0 ? ` · ${left}초` : ''); if (b.textContent !== t) { b.textContent = t; if (left === 0) done = true; } });
  if (done) redrawKeep(); }
function openHubEvent() { if (!isHubNow()) { toast('현지 거점에서 활동을 마친 뒤 확인하세요.'); return; } if (!petActive()) { toast('지금 진행할 거점 사건이 없습니다. 동물 만남은 한국시간 09:00~23:59, 보급품 발견은 09:00~정오입니다.'); return; } go('hub_event'); }
function hubEventPage() { const p = S.P, hub = isHubNow(); let h = headT('현지 거점 · 작은 사건', '동물 09:00~23:59 · 보급품 09:00~정오 · 하루 한 번');
  if (!petActive()) return h + noteBox('이 사건은 이미 끝났거나 시간이 지났습니다.'); const e = p.hub_event;
  if (String(e.kind) === 'animal') { h += noteBox(`${e.species}이(가) 문밖에서 주변을 살피고 있습니다.\n${PD.SPECIES[e.species]?.desc || ''}`);
    let wd = '반려동물 메뉴에서 대화·알맞은 먹이로 친밀감 쌓기'; const w = p.wild_animal || {};
    if (nonEmpty(w)) wd = `이미 친해지는 중인 ${w.name ?? '동물'}(${w.species ?? ''})이(가) 있어 지금은 만날 수 없습니다 · 반려동물 메뉴에서 호감도 60으로 맞이한 뒤 새 동물과 친해질 수 있습니다`; else if (!hub) wd = '현지 거점에서만 만날 수 있습니다 · 이동·탐사·전투를 마친 뒤 시도하세요';
    h += choiceRow(1, '거리를 지키며 지켜본다', wd, 'var(--accent)', hub && !nonEmpty(w), 'id="heMeet"');
    let n = 2; if (nonEmpty(w)) h += choiceRow(n++, `${w.name ?? '동물'}을(를) 놓아주고 이 동물과 친해지기`, '지금 친해지던 동물의 호감도는 사라집니다 · 확인 창이 한 번 더 나옵니다', 'var(--warning)', hub, 'id="heSwap"');
    h += choiceRow(n, '조용히 길을 비켜 준다', '오늘의 만남을 마칩니다. 물품이나 체력 소모는 없습니다.', 'var(--muted)', hub, 'id="heSkip"'); }
  else { h += noteBox('정리하던 보급 상자 아래에서 작은 흔적을 발견했습니다. 어떻게 살펴보시겠습니까?');
    PD.LOOT_CHOICES.forEach((c, i) => { h += choiceRow(i + 1, c.title, c.desc, i === 0 ? 'var(--accent)' : 'var(--warning)', hub, `data-hel="${i}"`); }); }
  return h; }
function bindHubEvent() { const c = $('center'), on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('heMeet', () => act(() => petMeet(), () => go('pets'))); on('heSwap', () => petReleaseConfirm(true));
  on('heSkip', () => act(() => { S.P.hub_event.status = 'resolved'; return true; }, () => go('hub')));
  c.querySelectorAll('[data-hel]').forEach((b) => { b.onclick = () => act(() => petResolveLoot(Number(b.dataset.hel)), () => { go('hub'); petAfter(); }); }); }

/* ════════ 도박장 — coin_casino.gd · coin_data.gd(사은품 교환) · casino_icons.gd(그림) ════════ */
const CC = D.coin_casino, CDT = D.coin_data;
const CAS = { kind: 'coin', pick: '', bet: 1, step: 'bet', lastMs: -99999999, pend: null };
const CAS_NAME = { coin: '동전 앞뒤', odd_even: '홀짝', slot: '슬롯', horse: '사이버 경마', dice_hilo: '주사위 대소', dice_number: '주사위 숫자 맞히기', roulette: '생존 룰렛', crate: '보급 상자 뽑기' };
const CAS_SUB = { coin: '앞뒤를 맞힙니다', odd_even: '숫자가 홀수인지 짝수인지', dice_hilo: '큰 눈인지 작은 눈인지', dice_number: '나올 눈을 정확히 맞힙니다', roulette: '색을 골라 휠에 맡깁니다', slot: '레버를 당겨 릴을 맞춥니다', crate: '상자 하나를 엽니다', horse: '1등으로 들어올 말을 고릅니다' };
const CAS_RULES = { coin: '앞/뒤 중 하나 · 당첨 50% · 총 지급 베팅액 ×2', odd_even: '홀/짝 중 하나 · 당첨 50% · 총 지급 베팅액 ×2', slot: '잭팟 0.05%(×500) · 대박 2.45%(×10) · 소당첨 17.5%(×2) · 반환 25%(×0.5, 내림) · 꽝 55%', horse: '개인 시뮬레이션 · 응원마와 무관하게 우승 3% · 총 지급 베팅액 ×30 · PvP/공유 경주 아님', dice_hilo: '주사위 2개의 합 · 대(8~12) 또는 소(2~6) · 당첨 41.7% · 합이 7이면 딜러 승 · 총 지급 ×2.3(내림)', dice_number: '주사위 1개 · 1~6 중 숫자 하나 · 당첨 16.7% · 총 지급 ×5.8(내림)', roulette: '0~36 룰렛 · 빨강/검정 당첨 48.6%(×2) · 초록(0) 당첨 2.7%(×35)', crate: '상자 하나 선택 · 전설 0.2%(×100) · 희귀 3%(×8) · 쓸 만함 15%(×2) · 부스러기 42%(×0.5, 내림) · 빈 상자 39.8%' };
const CAS_OPTS = { coin: ['앞', '뒤'], odd_even: ['홀', '짝'], slot: ['레버 당기기'], horse: ['1번 응원마', '2번 응원마', '3번 응원마', '4번 응원마', '5번 응원마'], dice_hilo: ['대 (8~12)', '소 (2~6)'], dice_number: ['1', '2', '3', '4', '5', '6'], roulette: ['빨강', '검정', '초록'], crate: ['왼쪽 상자', '가운데 상자', '오른쪽 상자'] };
const CAS_STEPS = { coin: ['동전을 손끝에서 굴리고 있습니다…', '탁자 위로 동전이 날아갑니다…', '바닥에 닿는 소리를 기다립니다…', '손이 결과를 가리고 있습니다…', '마지막으로 숨을 고르세요…'], odd_even: ['숫자 패를 섞고 있습니다…', '선택한 면을 봉인했습니다…', '패가 천천히 멈춥니다…', '딜러가 결과를 가리고 있습니다…', '마지막으로 숨을 고르세요…'], slot: ['릴의 잠금이 풀립니다…', '첫 번째 릴이 돌아갑니다…', '두 번째 릴이 속도를 늦춥니다…', '마지막 릴이 흔들립니다…', '불빛이 멈추기 직전입니다…'], horse: ['출발 게이트가 열립니다…', '응원마가 첫 코너를 돕니다…', '관중의 함성이 커집니다…', '결승선이 가까워집니다…', '사진 판독을 기다립니다…'], dice: ['컵 안에서 주사위를 흔듭니다…', '주사위가 탁자를 구릅니다…', '모서리에 부딪혀 방향이 바뀝니다…', '천천히 멈춰 갑니다…', '컵을 들어 올리기 직전입니다…'], roulette: ['딜러가 휠을 돌립니다…', '구슬이 바깥쪽을 달립니다…', '구슬이 칸 사이를 튑니다…', '휠이 느려집니다…', '구슬이 한 칸에 걸리려 합니다…'], crate: ['녹슨 잠금장치를 풉니다…', '뚜껑이 조금 열립니다…', '안쪽에서 무언가 빛납니다…', '포장을 걷어 냅니다…', '내용물을 확인하기 직전입니다…'] };
const casSteps = (k) => CAS_STEPS[k.startsWith('dice') ? 'dice' : k] || ['판을 준비하고 있습니다…', '결과를 가리고 있습니다…', '숨을 고르세요…', '마지막 확인 중입니다…', '곧 공개합니다…'];
function casEnsure() { const p = S.P; p.coins = Math.max(0, Math.trunc(Number(p.coins || 0))); if (!Array.isArray(p.casino_history)) p.casino_history = []; return p.coins; }
function casOk() { casEnsure(); const p = S.P; if (Number(p.level || 1) < 5 || p.dead) return false; if (nonEmpty(p.battle)) return false; if (activityBusy()) return false; return isHubNow(); }
function casRoll(kind, bet, pick, rr) { const stake = Math.max(0, bet), r = Math.max(0, Math.min(0.999999999, rr)); let won = false, mul = 0, out = '실패';
  if (kind === 'coin') { out = r < 0.5 ? '앞' : '뒤'; won = out === '앞' ? ['앞', '앞면', 'heads'].includes(pick) : ['뒤', '뒷면', 'tails'].includes(pick); mul = won ? 2 : 0; }
  else if (kind === 'odd_even') { out = r < 0.5 ? '홀' : '짝'; won = out === '홀' ? ['홀', 'odd'].includes(pick) : ['짝', 'even'].includes(pick); mul = won ? 2 : 0; }
  else if (kind === 'slot') { if (r < 0.0005) { out = '잭팟'; mul = 500; } else if (r < 0.025) { out = '대박'; mul = 10; } else if (r < 0.2) { out = '소당첨'; mul = 2; } else if (r < 0.45) { out = '반환'; mul = 0.5; } else { out = '꽝'; mul = 0; } won = mul > 0; }
  else if (kind === 'dice_hilo') { const idx = Math.trunc(r * 36), d1 = Math.trunc(idx / 6) + 1, d2 = idx % 6 + 1, t = d1 + d2, side = t >= 8 ? '대' : t <= 6 ? '소' : '7 · 딜러'; out = `${d1} + ${d2} = ${t} · ${side}`; won = (pick === '대 (8~12)' && t >= 8) || (pick === '소 (2~6)' && t <= 6); mul = won ? 2.3 : 0; }
  else if (kind === 'dice_number') { const f = Math.trunc(r * 6) + 1; out = `주사위 ${f}`; won = pick === String(f); mul = won ? 5.8 : 0; }
  else if (kind === 'roulette') { const n = Math.trunc(r * 37), col = n === 0 ? '초록' : CC.RED_NUMBERS.includes(n) ? '빨강' : '검정'; out = `${n} · ${col}`; won = pick === col; mul = won ? (col === '초록' ? 35 : 2) : 0; }
  else if (kind === 'crate') { if (r < 0.002) { out = '전설 보급품'; mul = 100; } else if (r < 0.032) { out = '희귀 보급품'; mul = 8; } else if (r < 0.182) { out = '쓸 만한 보급품'; mul = 2; } else if (r < 0.602) { out = '부스러기'; mul = 0.5; } else { out = '빈 상자'; mul = 0; } won = mul > 0; }
  else if (kind === 'horse') { won = r < 0.03; out = won ? '응원마 우승' : '응원마 패배'; mul = won ? 30 : 0; }
  else return { valid: false, kind, pick, roll: r, payout: 0, multiplier: 0, won: false, outcome: '알 수 없는 게임' };
  return { valid: true, kind, pick, roll: r, payout: Math.floor(stake * mul), multiplier: mul, won, outcome: out }; }
/* place_bet — 결과를 정하는 순간에 무작위 한 번(randf) */
function casPlace(kind, bet, pick, test = false) { casEnsure(); if (!casOk()) return { ok: false, reason: 'unavailable' };
  if (!test && performance.now() - CAS.lastMs < CC.SHORT_COOLDOWN_MS) return { ok: false, reason: 'cooldown' };
  const bal = Number(S.P.coins); if (bet < 1 || bet > CC.MAX_BET || bet > bal) return { ok: false, reason: 'invalid_bet' };
  const res = casRoll(kind, bet, pick, gRandf()); if (!res.valid) return { ok: false, reason: 'invalid_game' };
  S.P.coins = bal - bet + res.payout; CAS.lastMs = performance.now();
  const hist = S.P.casino_history; hist.push({ kind: String(res.kind), pick: String(res.pick), stake: bet, payout: res.payout, outcome: String(res.outcome), at: nowSec() }); while (hist.length > CC.HISTORY_LIMIT) hist.shift();
  if (!test) toast(`${res.outcome} · 지급 ${res.payout}코인 · 잔액 ${S.P.coins}코인`); return { ...res, ok: true, coins: S.P.coins }; }
function casPayout(kind, bet) { const f = (m) => Math.floor(bet * m);
  return { coin: `${bet * 2}코인 (당첨 시 ×2)`, odd_even: `${bet * 2}코인 (당첨 시 ×2)`, horse: `${bet * 30}코인 (응원마 우승 시 ×30)`, slot: `${bet * 500} / ${bet * 10} / ${bet * 2} / ${f(0.5)}코인 (×500 / ×10 / ×2 / ×0.5)`, dice_hilo: `${f(2.3)}코인 (당첨 시 ×2.3)`, dice_number: `${f(5.8)}코인 (당첨 시 ×5.8)`, roulette: `빨강·검정 ${bet * 2}코인 (×2) / 초록 ${bet * 35}코인 (×35)`, crate: `${bet * 100} / ${bet * 8} / ${bet * 2} / ${f(0.5)}코인 (×100 / ×8 / ×2 / ×0.5)` }[kind] || '0코인'; }
function casBeginError(kind, bet, pick) { casEnsure(); if (CAS.pend) return 'in_progress'; if (!casOk()) return 'unavailable'; if (performance.now() - CAS.lastMs < CC.SHORT_COOLDOWN_MS) return 'cooldown';
  if (bet < 1 || bet > CC.MAX_BET || bet > Number(S.P.coins)) return 'invalid_bet'; if (!casRoll(kind, bet, pick, 0).valid) return 'invalid_game'; return ''; }
function casCancel() { if (!CAS.pend) return; clearInterval(CAS.pend.timer); clearInterval(CAS.pend.anim); CAS.pend = null; }
/* 결과를 기다리는 5초 — 닫으면 취소(차감 없음) · 건너뛰기는 바로 한 번 정산 */
function casBegin(kind, bet, pick) { const why = casBeginError(kind, bet, pick); if (why) { toast('베팅 시작 실패: ' + why); return; }
  const serial = Date.now(); modal(CAS_NAME[kind] + ' · 결과 확인 중', `<p class="muted">베팅을 접수했습니다. 결과가 공개될 때까지 코인은 차감되지 않습니다.</p><div class="bar casbar"><i id="casPg" style="width:0%;background:var(--accent)"></i></div><div class="caspic" id="casPic">${casSvg(casFrame(kind, 0), 120)}</div><p class="casstage" id="casStage">${esc(casSteps(kind)[0])}</p><p style="color:var(--warning);font-size:13px;margin:0">'확인 · 닫기'는 취소(차감 없음) · '건너뛰기'는 즉시 한 번 정산합니다.</p><button class="btn" style="color:var(--blue)" id="casSkip">건너뛰고 결과 보기</button>`, [['확인 · 닫기', '', null]]);
  const pend = { serial, kind, bet, pick, step: 0, f: 0 }; CAS.pend = pend; CAS.step = 'bet';
  const alive = () => CAS.pend === pend && $('casStage');
  pend.anim = setInterval(() => { if (!alive()) { casCancel(); return; } pend.f++; $('casPic').innerHTML = casSvg(casFrame(kind, pend.f), 120); }, 250);
  pend.timer = setInterval(() => { if (!alive()) { casCancel(); return; } pend.step++; if (pend.step >= CC.SUSPENSE_SECONDS) { casSettle(pend); return; } $('casStage').textContent = casSteps(kind)[Math.min(pend.step, 4)]; $('casPg').style.width = pend.step / CC.SUSPENSE_SECONDS * 100 + '%'; }, 1000);
  $('casSkip').onclick = () => { if (alive()) casSettle(pend); else casCancel(); }; }
function casSettle(pend) { if (CAS.pend !== pend) return; casCancel(); $('modalRoot').innerHTML = ''; let res = null;
  act(() => { res = casPlace(pend.kind, pend.bet, pend.pick); if (!res.ok) { toast('베팅 실패: ' + res.reason); return false; } return true; }, () => { if (res && res.ok) casResult(res, pend.bet); }); }
function casResult(res, bet) { const k = res.kind, faces = { 잭팟: '7  |  7  |  7', 대박: '별  |  별  |  별', 소당첨: '불빛  |  불빛  |  그늘', 반환: '안개  |  불빛  |  폐허', 꽝: '그늘  |  안개  |  철문' };
  modal(CAS_NAME[k] + ' · 결과', `<div class="caspic">${casSvg(casResultSvg(res), 120)}</div><p class="casout" style="color:${res.payout > bet ? 'var(--accent)' : 'var(--warning)'}">${esc(res.outcome)}</p>${k === 'slot' ? `<p class="casfaces">${esc(faces[res.outcome] || '')}</p>` : ''}${['dice_hilo', 'dice_number', 'roulette', 'crate'].includes(k) ? `<p class="muted">선택: ${esc(res.pick)}</p>` : ''}<p style="white-space:pre-line;color:var(--text);margin:0">베팅 ${bet}코인 · 총 반환 ${res.payout}코인\n순변동 ${signed(res.payout - bet)}코인 · 잔액 ${S.P.coins}코인</p><p class="muted" style="font-size:13px;margin:0">이 결과는 한 번만 정산되었습니다. 코인만 변하며 실제 소지금과 캐릭터 피해에는 영향을 주지 않습니다.</p>`); }
/* 사은품 교환(v34) — 매일 오전 6시(한국시간) 새 목록 · 24시간에 임의 갱신 3회 */
const realNow = () => Math.floor(Date.now() / 1000);
const kstDay6 = (t) => new Date((t + 3 * 3600) * 1000).toISOString().slice(0, 10);
function giftEnsure() { casEnsure(); const p = S.P, st = isDict(p.gift_shop) ? p.gift_shop : {}, now = realNow(), today = kstDay6(now);
  if (String(st.day ?? '') !== today) { st.day = today; st.seed = godotHash(String(S.acct?.uid ?? '') + '|' + today); }
  st.refresh = (Array.isArray(st.refresh) ? st.refresh : []).map(Number).filter((t) => t > now - CDT.GIFT_REFRESH_WINDOW); p.gift_shop = st; return st; }
let GIFT_POOL = null;
function giftPool() { if (GIFT_POOL) return GIFT_POOL; const gear = [], heal = [], seen = {};
  for (const src of CDT.SHOP) { const k = String(src.key), it = GD.ITEMS[k]; if (!it || !['C', 'B', 'A', 'S'].includes(String(it.grade || ''))) continue; const row = { ...src, grade: String(it.grade || '') };
    if (row.category !== '회복') { const g = GEAR.ITEMS[k]; if (!g || String(g.slot || '') !== row.category) continue; row.slot = String(g.slot || ''); row.level = Math.trunc(Number(g.level || 0)); } else { row.slot = ''; row.level = 0; }
    row.desc = String(it.desc || ''); seen[k] = true; (row.category === '회복' ? heal : gear).push(row); }
  const r10 = (v) => Math.round(v / 10) * 10;
  for (const k of Object.keys(GEAR.ITEMS).sort()) { if (seen[k] || !GD.ITEMS[k]) continue; const g = GEAR.ITEMS[k], grade = String(g.grade ?? GD.ITEMS[k].grade ?? '');
    if (!CDT.GIFT_GRADES.includes(grade) || !['무기', '방어구', '머리', '도구', '악세사리'].includes(String(g.slot || ''))) continue; const lv = Math.trunc(Number(g.level || 0));
    gear.push({ key: k, category: String(g.slot), slot: String(g.slot), grade, level: lv, price: r10(CDT.GIFT_GEAR_PRICE[grade] + lv * (grade === 'S' ? 4 : 3)), desc: String(GD.ITEMS[k].desc || '') }); }
  for (const k of Object.keys(GD.ITEMS).sort()) { if (seen[k] || GEAR.ITEMS[k]) continue; const it = GD.ITEMS[k], grade = String(it.grade || '');
    if (!CDT.GIFT_GRADES.includes(grade) || !('hp' in it) || Math.trunc(Number(it.hp || 0)) <= 0) continue; heal.push({ key: k, category: '회복', slot: '', grade, level: 0, price: Number(CDT.GIFT_HEAL_PRICE[grade]), desc: String(it.desc || '') }); }
  return (GIFT_POOL = { gear, heal }); }
function giftLineup() { const pool = giftPool(), rng = new GRng(Number(giftEnsure().seed ?? 1)), out = [], gear = [...pool.gear], used = {};
  for (let pass = 0; pass < 2; pass++) { let tries = 0; while (out.length < CDT.GIFT_GEAR_COUNT && gear.length && tries < 400) { tries++; const i = rng.randiRange(0, gear.length - 1), row = gear[i];
    if (pass === 0 && (used[row.category] || 0) >= 1) continue; gear.splice(i, 1); out.push(row); used[row.category] = (used[row.category] || 0) + 1; } }
  const heal = [...pool.heal]; for (let n = 0; n < CDT.GIFT_HEAL_COUNT && heal.length; n++) { const j = rng.randiRange(0, heal.length - 1); out.push(heal[j]); heal.splice(j, 1); }
  return out; }
const giftLeft = () => Math.max(0, CDT.GIFT_REFRESH_LIMIT - giftEnsure().refresh.length);
function giftRefresh() { const st = giftEnsure(); if (giftLeft() <= 0) { toast(`임의 갱신은 24시간에 ${CDT.GIFT_REFRESH_LIMIT}회까지입니다.`); return false; }
  st.refresh.push(realNow()); st.seed = gRandi(); S.P.gift_shop = st; toast(`사은품 목록을 새로 받았습니다 · 남은 임의 갱신 ${giftLeft()}회`); return true; }
function giftBuy(key) { casEnsure(); if (!casOk()) return { ok: false, reason: 'unavailable' }; const prod = giftLineup().find((r) => r.key === key); if (!prod) return { ok: false, reason: 'unknown_product' };
  const price = Number(prod.price); if (price < 100 || Number(S.P.coins) < price) return { ok: false, reason: 'insufficient_coins' };
  S.P.coins = Number(S.P.coins) - price; awardItem(key, 1, false); toast(`사은품 교환 · ${itemDisplay(key)} · -${price}코인`); return { ok: true, key, price }; }
function giftModal() { if (!casOk()) { toast('현재는 사은품 교환을 이용할 수 없습니다.'); return; } const st = giftEnsure(), now = realNow(), ls = 86400 - ((now + 3 * 3600) % 86400), left = giftLeft();
  let note = `임의 갱신 · 남은 ${left}/${CDT.GIFT_REFRESH_LIMIT}회`; if (left <= 0) { const w = Math.max(0, (st.refresh.length ? Math.min(...st.refresh) + CDT.GIFT_REFRESH_WINDOW : now) - now); note = `임의 갱신 · 다음 가능까지 ${Math.floor(w / 3600)}시간 ${Math.floor((w % 3600) / 60)}분`; }
  const rows = giftLineup().map((r) => `<div class="giftrow"><button class="btn" data-gbuy="${esc(r.key)}" ${Number(S.P.coins) < Number(r.price) ? 'disabled' : ''}><b style="color:${gradeColor(r.key)}">${esc(r.key)}</b><span class="gold">${comma(r.price)}코인</span></button><p class="subtle">[${esc(r.grade)}] ${esc(r.category)} · ${comma(r.price)}코인${r.level > 0 ? ` · 교환 후 Lv.${r.level}부터 장착` : ''}<br>${esc(r.desc)}</p></div>`).join('');
  modal(`사은품 교환 · 보유 ${comma(S.P.coins)}코인`, `<p class="muted" style="margin:0">코인으로 교환하는 사은품입니다. 현금은 쓰지 않으며, 장비는 교환 후 해당 Lv.부터 장착할 수 있습니다.</p><p class="subtle" style="margin:0;font-size:13px">자동 갱신 · 오전 6시(한국시간)까지 ${Math.floor(ls / 3600)}시간 ${Math.floor((ls % 3600) / 60)}분</p><button class="btn" style="color:var(--warning)" id="gRef" ${left <= 0 ? 'disabled' : ''}>${esc(note)}</button><div class="giftlist">${rows}</div>`, [['닫기', '', null]]);
  const r = $('modalRoot'); const rf = $('gRef'); if (rf) rf.onclick = () => { r.innerHTML = ''; act(() => giftRefresh(), giftModal); };
  r.querySelectorAll('[data-gbuy]').forEach((b) => { b.onclick = () => { r.innerHTML = ''; let res = null; act(() => { res = giftBuy(b.dataset.gbuy); if (!res.ok) toast('교환 실패: ' + res.reason); return res.ok; }); }; }); }
const CAS_ICON = CC.LINE_ICONS;
function casinoPage() { casEnsure(); const p = S.P; let h = `${S.mobile ? '' : '<p class="crumb">코인으로만 즐깁니다 · 결과는 선택 뒤에 바로 정해집니다</p>'}<div class="pagehead"><h2>도박장</h2><span class="gold">보유 코인 ${comma(p.coins)}</span></div>${S.mobile ? '<p class="muted sec-sub">코인으로만 즐깁니다 · 결과는 선택 뒤에 바로 정해집니다</p>' : ''}`;
  if (!casOk()) return h + noteBox(Number(p.level || 1) < 5 ? '도박장은 레벨 5부터 거점에서 열립니다. 코인은 현금이 아닌 탐사 게임 재화입니다.' : p.dead ? '사망 상태에서는 도박장을 이용할 수 없습니다.' : '거점에서만 이용할 수 있으며, 이동·전투·탐사·제작 중에는 열리지 않습니다.');
  const k = CAS.kind, maxb = Math.max(1, Math.min(CC.MAX_BET, Number(p.coins))); CAS.bet = Math.max(1, Math.min(maxb, CAS.bet));
  h += `<div class="caswrap"><div class="casgrid">${CC.GAME_KINDS.map((g) => `<button class="cascard${g === k ? ' on' : ''}" data-ckind="${g}">${svg(CAS_ICON[g] || CAS_ICON.coin, 1.8)}<b>${esc(CAS_NAME[g])}</b><span>${esc(CAS_SUB[g])}</span></button>`).join('')}</div>`;
  const cur = CAS.step === 'bet' ? 0 : 1;
  h += `<div class="panel caspanel"><div class="cassteps">${['베팅 설정', '최종 확인', '실행', '결과'].map((n, i) => `<span class="${i === cur ? 'on' : ''}">${i + 1} ${n}</span>`).join('')}</div><b class="casname">${esc(CAS_NAME[k])}</b><p class="muted" style="margin:0;font-size:12px">${esc(CAS_RULES[k])}</p>`;
  if (CAS.step === 'bet') {
    h += `<small class="muted">어느 쪽입니까?</small><div class="pills">${CAS_OPTS[k].map((o) => `<button class="pill ${o === CAS.pick ? 'on' : ''}" data-cpick="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    h += `<small class="muted">베팅 코인</small><div class="casbet"><button class="btn" data-cbet="${CAS.bet - 1}" ${CAS.bet <= 1 ? 'disabled' : ''} aria-label="1 줄이기">−</button><b>${CAS.bet}</b><button class="btn" style="color:var(--accent)" data-cbet="${CAS.bet + 1}" ${CAS.bet >= maxb ? 'disabled' : ''} aria-label="1 늘리기">+</button></div>`;
    h += `<div class="pills">${[1, 5, 10, 50, 100].filter((q) => q <= maxb).map((q) => `<button class="pill ${CAS.bet === q ? 'on' : ''}" data-cbet="${q}">${q}</button>`).join('')}<button class="pill ${CAS.bet === maxb && maxb > 100 ? 'on' : ''}" data-cbet="${maxb}">최대 ${maxb}</button></div>`;
    h += `<button class="btn primary big" id="casNext" ${Number(p.coins) < 1 || !CAS.pick ? 'disabled' : ''}>다음 · 최종 확인</button>`; }
  else { h += `<div class="cassum">선택 · ${esc(CAS.pick)}<br>베팅 · ${CAS.bet}코인<br>총 지급 · ${esc(casPayout(k, CAS.bet))}</div><p style="color:var(--warning);font-size:12px;margin:0">확정 후에는 한 번만 굴리며 자동 반복하지 않습니다. 결과가 나올 때까지 코인은 차감되지 않습니다.</p>`;
    h += `<div class="casrow"><button class="btn" id="casBack">이전</button><button class="btn primary" id="casGo" ${CAS.pend ? 'disabled' : ''}>${CAS.bet}코인 베팅 확정</button></div>`; }
  h += '</div></div>';
  h += choiceRow('', '사은품 교환', `오늘의 사은품 ${CDT.GIFT_GEAR_COUNT + CDT.GIFT_HEAL_COUNT}종 · 매일 오전 6시(한국시간) 새 목록 · 임의 갱신 남은 ${giftLeft()}/${CDT.GIFT_REFRESH_LIMIT}회`, 'var(--accent)', true, 'id="casGift"');
  h += noteBox('코인은 일반 현금 상점에서 사고팔 수 없고, 탐사 보상·도박장·사은품 교환에서만 사용합니다. 자동 반복 베팅은 없습니다.');
  const hist = p.casino_history || []; if (hist.length) h += groupLab('최근 코인게임 기록 · 반환에는 베팅액이 포함') + hist.slice(-5).map((r) => `<div class="panel irow"><span class="tchip" style="color:var(--warning)">${esc(CAS_NAME[r.kind] || r.kind)}</span><div class="tx"><b>${esc(r.outcome)}</b><span>베팅 ${Number(r.stake)} / 반환 ${Number(r.payout)}코인</span></div></div>`).join('');
  return h; }
function bindCasino() { const c = $('center');
  c.querySelectorAll('[data-ckind]').forEach((b) => { b.onclick = () => { CAS.kind = b.dataset.ckind; CAS.pick = ''; CAS.step = 'bet'; redrawKeep(); }; });
  c.querySelectorAll('[data-cpick]').forEach((b) => { b.onclick = () => { CAS.pick = b.dataset.cpick; redrawKeep(); }; });
  c.querySelectorAll('[data-cbet]').forEach((b) => { b.onclick = () => { CAS.bet = Math.max(1, Math.min(Math.max(1, Math.min(CC.MAX_BET, Number(S.P.coins))), Number(b.dataset.cbet))); redrawKeep(); }; });
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('casNext', () => { if (!CAS.pick) { toast('먼저 무엇에 걸지 고르세요.'); return; } CAS.step = 'confirm'; redrawKeep(); });
  on('casBack', () => { CAS.step = 'bet'; redrawKeep(); });
  on('casGo', () => { if (CAS.pend) { toast('다른 코인게임의 결과를 확인 중입니다.'); return; } casBegin(CAS.kind, CAS.bet, CAS.pick); });
  on('casGift', giftModal); }
/* casino_icons.gd — 기다리는 동안 0.25초마다 바뀌는 그림과 결과 그림(100×100 SVG) */
const CI = { W: '#f4f2ea', GOLD: '#e3b341', RED: '#e0565b', GREEN: '#3fb37f', DARK: '#1b2326' };
const ff1 = (n) => Number(n).toFixed(1);
const casSvg = (body, px) => `<svg width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
function ciDie(x, y, s, face, col = CI.W) { const P = { 1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]], 5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]], 6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]] };
  let o = `<rect x='${ff1(x)}' y='${ff1(y)}' width='${ff1(s)}' height='${ff1(s)}' rx='${ff1(s * 0.18)}' fill='${CI.DARK}' stroke='${col}' stroke-width='2'/>`;
  for (const q of P[Math.max(1, Math.min(6, face))] || []) o += `<circle cx='${ff1(x + s * q[0])}' cy='${ff1(y + s * q[1])}' r='${ff1(s * 0.085)}' fill='${face === 1 ? CI.RED : col}'/>`; return o; }
function ciCoin(rx, heads) { let o = `<ellipse cx='50' cy='50' rx='${ff1(Math.max(2, rx))}' ry='36' fill='${CI.GOLD}' stroke='#9c7a2a' stroke-width='3'/>`;
  if (rx > 14) { const k = rx / 36; if (heads) o += `<path d='M50.0 38 L${ff1(50 + 4 * k)} 46 L${ff1(50 + 12 * k)} 46 L${ff1(50 + 6 * k)} 52 L${ff1(50 + 8 * k)} 62 L50 56 L${ff1(50 - 8 * k)} 62 L${ff1(50 - 6 * k)} 52 L${ff1(50 - 12 * k)} 46 L${ff1(50 - 4 * k)} 46 Z' fill='#9c7a2a'/>`; else o += `<ellipse cx='50' cy='50' rx='${ff1(16 * k)}' ry='16' fill='none' stroke='#9c7a2a' stroke-width='4'/>`; } return o; }
function ciSym(i, x) { switch (i % 5) { case 0: return `<path d='M${ff1(x - 8)} 38 h16 l-9 26' fill='none' stroke='${CI.RED}' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/>`; case 1: return `<path d='M${ff1(x)} 36 l4 9 10 1 -8 6 3 10 -9 -6 -9 6 3 -10 -8 -6 10 -1z' fill='${CI.GOLD}'/>`;
  case 2: return `<circle cx='${ff1(x)}' cy='50' r='9' fill='#ffd166'/><circle cx='${ff1(x)}' cy='50' r='13' fill='none' stroke='#ffd166' stroke-width='2' opacity='.5'/>`; case 3: return `<path d='M${ff1(x - 10)} 56 a7 7 0 0 1 2 -13 a9 9 0 0 1 16 2 a6 6 0 0 1 1 11z' fill='#a3b8c2'/>`; default: return `<rect x='${ff1(x - 9)}' y='44' width='18' height='12' rx='2' fill='#7d8a8f'/>`; } }
function ciSlot(a, b, c) { let o = `<rect x='6' y='22' width='88' height='56' rx='8' fill='${CI.DARK}' stroke='${CI.GOLD}' stroke-width='3'/>`; [a, b, c].forEach((v, k) => { const x = 22 + k * 28; o += `<rect x='${ff1(x - 12)}' y='28' width='24' height='44' rx='4' fill='#0f1416'/>` + ciSym(v, x); }); return o; }
function ciWheel(ang) { const T = Math.PI * 2; let o = `<circle cx='50' cy='50' r='42' fill='${CI.DARK}' stroke='${CI.GOLD}' stroke-width='3'/>`;
  for (let k = 0; k < 12; k++) { const a0 = T * k / 12, col = k === 0 ? CI.GREEN : k % 2 === 1 ? CI.RED : '#2a3236'; o += `<path d='M50 50 L${ff1(50 + Math.cos(a0) * 40)} ${ff1(50 + Math.sin(a0) * 40)} A40 40 0 0 1 ${ff1(50 + Math.cos(a0 + T / 12) * 40)} ${ff1(50 + Math.sin(a0 + T / 12) * 40)} Z' fill='${col}'/>`; }
  return o + `<circle cx='50' cy='50' r='14' fill='${CI.DARK}' stroke='${CI.GOLD}' stroke-width='2'/><circle cx='${ff1(50 + Math.cos(ang) * 33)}' cy='${ff1(50 + Math.sin(ang) * 33)}' r='4.5' fill='${CI.W}'/>`; }
const ciHorse = (x, y, c) => `<ellipse cx='${ff1(x)}' cy='${ff1(y)}' rx='8' ry='4.5' fill='${c}'/><circle cx='${ff1(x + 9)}' cy='${ff1(y - 4)}' r='3.5' fill='${c}'/><path d='M${ff1(x - 4)} ${ff1(y + 3)} l-3 6 M${ff1(x + 4)} ${ff1(y + 3)} l3 6' stroke='${c}' stroke-width='2'/>`;
function ciRace(pos) { let o = "<rect x='4' y='18' width='92' height='64' rx='6' fill='#24412c'/>"; for (let k = 0; k < 4; k++) o += `<line x1='6' y1='${34 + k * 14}' x2='94' y2='${34 + k * 14}' stroke='#3c6a47' stroke-width='1.5'/>`;
  o += `<line x1='86' y1='20' x2='86' y2='80' stroke='${CI.W}' stroke-width='3' stroke-dasharray='4 3'/>`; const cols = [CI.GOLD, '#6cb6ff', '#c297ff', '#f0a35e']; for (let k = 0; k < 4; k++) o += ciHorse(pos[k], 27 + k * 14, cols[k]); return o; }
function ciCrate(open, glow = 0) { let o = ''; if (glow > 0) { const gc = [CI.W, '#6cb6ff', '#c297ff', CI.GOLD][Math.min(3, glow)]; for (let k = 0; k < 8; k++) { const a = Math.PI * 2 * k / 8; o += `<line x1='50' y1='46' x2='${ff1(50 + Math.cos(a) * 44)}' y2='${ff1(46 + Math.sin(a) * 44)}' stroke='${gc}' stroke-width='3' opacity='.55'/>`; } }
  return o + "<rect x='18' y='48' width='64' height='36' rx='3' fill='#7a5838' stroke='#4a3420' stroke-width='3'/><path d='M18 60 h64 M18 72 h64' stroke='#4a3420' stroke-width='2'/>" + `<g transform='rotate(${ff1(-open * 35)} 18 48)'><rect x='16' y='${ff1(36 - open * 22 * 0.1)}' width='68' height='12' rx='3' fill='#8d6a45' stroke='#4a3420' stroke-width='3'/></g>`; }
function ciCards(a, b, reveal) { let o = ''; [a, b].forEach((n, k) => { const x = 18 + k * 36; o += `<rect x='${ff1(x)}' y='22' width='28' height='42' rx='4' fill='${reveal || k === 0 ? CI.W : '#30474f'}' stroke='${CI.GOLD}' stroke-width='2'/>`;
  if (reveal || k === 0) for (let i = 0; i < n; i++) o += `<circle cx='${ff1(x + 8 + (i % 2) * 12)}' cy='${ff1(30 + Math.floor(i / 2) * 8)}' r='2.6' fill='${n % 2 === 1 ? CI.RED : '#26292d'}'/>`; }); return o; }
function casFrame(kind, f) { const rng = new GRng(godotHash(`${kind}-${f}`)), rr = (a, b) => rng.randfRange(a, b), ri = (a, b) => rng.randiRange(a, b);
  switch (kind) { case 'coin': return ciCoin(Math.abs(Math.cos(f * 0.9)) * 36, f % 4 < 2); case 'odd_even': return ciCards(ri(1, 6), ri(1, 6), false);
    case 'dice_hilo': { const a = ciDie(10 + rr(-3, 3), 30 + rr(-6, 6), 36, ri(1, 6)); return a + ciDie(54 + rr(-3, 3), 30 + rr(-6, 6), 36, ri(1, 6)); }
    case 'dice_number': { const x = 26 + rr(-5, 5), y = 26 + rr(-5, 5); return ciDie(x, y, 48, ri(1, 6)); } case 'roulette': return ciWheel(-f * 0.85);
    case 'slot': { const a = ri(0, 4), b = ri(0, 4); return ciSlot(a, b, ri(0, 4)); } case 'crate': return ciCrate(Math.min(1, f / 18) * 0.6, 0);
    case 'horse': { const pos = []; for (let k = 0; k < 4; k++) pos.push(Math.min(84, 10 + f * (2.8 + rr(0, 1.6) + k * 0.2))); return ciRace(pos); } }
  return `<circle cx='50' cy='50' r='30' fill='${CI.GOLD}'/>`; }
function casResultSvg(res) { const k = String(res.kind || ''), o = String(res.outcome || ''), nums = (o.match(/\d+/g) || []).map(Number);
  switch (k) { case 'coin': return ciCoin(36, o === '앞'); case 'odd_even': return o === '홀' ? ciCards(3, 5, true) : ciCards(2, 4, true);
    case 'dice_hilo': if (nums.length >= 2) return ciDie(10, 30, 36, nums[0]) + ciDie(54, 30, 36, nums[1]); break; case 'dice_number': if (nums.length) return ciDie(26, 26, 48, nums[0]); break;
    case 'roulette': { const n = nums.length ? nums[0] : 0; return ciWheel(Math.PI * 2 * (n % 12) / 12 + Math.PI * 2 / 24) + `<rect x='34' y='86' width='32' height='12' rx='3' fill='${o.includes('초록') ? CI.GREEN : o.includes('빨강') ? CI.RED : '#2a3236'}'/>`; }
    case 'slot': return { 잭팟: ciSlot(0, 0, 0), 대박: ciSlot(1, 1, 1), 소당첨: ciSlot(2, 2, 3), 반환: ciSlot(3, 2, 4) }[o] || ciSlot(3, 4, 1);
    case 'crate': return ciCrate(1, o.includes('전설') ? 3 : o.includes('희귀') ? 2 : o.includes('쓸 만한') ? 1 : 0);
    case 'horse': { const w = !!res.won; return ciRace([w ? 86 : 70, w ? 72 : 86, 62, 66]); } }
  return casFrame(k, 0); }

/* ════════ 낚시 — fishing.gd · fishing_data.gd 그대로(낚시터 · 던지기 5초 · 생선/물건 · 낚시 레벨 · 상점 · 생선 팔기 · 낚시 대회) ════════ */
const FIS = D.fishing, FSH = D.fishing_data;
const FISHS = { cast: null, token: 0, last: '', result: null, event: {}, entries: [], entriesFor: '', subbed: false, gmKind: 'biggest', gmHours: 24, pools: {}, timer: 0 };
/* GRng에 Godot randd · randfn 추가(RandomPCG::randd · randfn 그대로) */
GRng.prototype.randd = function () { const p = this.next(); if (p === 0) return 0; const sig = ((BigInt(this.next()) << 32n) | BigInt(this.next())) | 0x8000000000000001n; return Number(sig) * Math.pow(2, -64 - Math.clz32(p)); };
/* Godot 4.7의 randfn은 randf() 두 번(float 계산)을 씁니다 — 직접 비교해 맞춘 식(최대 1ulp 차이) */
GRng.prototype.randfn = function (mean, dev) { const F = Math.fround; let t = this.randf(); if (t < 0.00001) t += 0.00001; const u = this.randf(), a = F(Math.cos(F(F(Math.PI * 2) * u))), b = Math.sqrt(F(-2 * F(Math.log(t)))); return F(mean + F(F(dev) * F(a * b))); };
const snapped = (v, s) => Math.floor(v / s + 0.5) * s;
const fishLevel = () => Math.max(1, Math.trunc(Number(S.P.fish_level || 1)));
const fishBonus = () => Math.min(0.20, 0.01 * (fishLevel() - 1));
const fishSize = (cm) => (cm >= 100 ? (cm / 100).toFixed(2) + 'm' : cm.toFixed(1) + 'cm');
function fishXp(n) { const p = S.P; let xp = Number(p.fish_xp || 0) + n, lv = fishLevel(); while (xp >= FIS.FISH_XP_PER_LEVEL) { xp -= FIS.FISH_XP_PER_LEVEL; lv++; }
  if (lv > fishLevel()) { toast(`낚시 레벨 업! Lv.${lv} · 큰 물고기 · 좋은 물건 확률 +${Math.round(Math.min(0.20, 0.01 * (lv - 1)) * 100)}%`); gLog(`[color=#6cb6ff]낚시 레벨 업[/color]  Lv.${lv}`); }
  p.fish_level = lv; p.fish_xp = xp; }
function equippedRod() { const r = String((S.P.equipment || {})['낚싯대'] || ''); return FSH.RODS[r] && count(r) > 0 ? r : ''; }
const fishDay = () => String(Math.trunc((kstNow() - 6 * 3600) / 86400));
function fishSoldToday() { const p = S.P; if (String(p.fish_sold_day ?? '') !== fishDay()) { p.fish_sold_day = fishDay(); p.fish_sold = 0; } return Math.max(0, Number(p.fish_sold || 0)); }
const fishSellLeft = () => Math.max(0, FIS.FISH_SELL_DAILY - fishSoldToday());
/* main._sell_price — 낚은 생선은 기본값의 70% × 지능 상한 넘김 판매가 */
const fishUnit = (f) => Math.max(1, Math.trunc(priceOf(f) * 0.7 * (1 + overflowOf(effStats(S.P.equipment || {})).sell / 100)));
const fishSellMax = (f) => Math.min(count(f), Math.trunc(fishSellLeft() / Math.max(1, fishUnit(f))));
function fishSell(f, n) { const p = S.P; n = Math.min(n, fishSellMax(f)); if (n <= 0 || nonEmpty(p.travel) || p.dead) { toast(`오늘 생선 판매 한도(${won(FIS.FISH_SELL_DAILY)})를 넘거나 지금은 팔 수 없습니다.`); return false; }
  const money = n * fishUnit(f); removeItem(f, n); p.money = Number(p.money) + money; p.fish_sold = fishSoldToday() + money;
  questEvent('fish_sell'); questEvent('fish_sell_money', money); gLog(`[color=#6cb6ff]생선 판매[/color]  ${f} ${n}마리 · +${won(money)}`); toast(`${f} ${n}마리 판매 · +${won(money)} · 오늘 남은 한도 ${won(fishSellLeft())}`); return true; }
function fishSellModal(f) { const unit = fishUnit(f), mx = fishSellMax(f), opts = []; for (const q of [1, 5, mx]) if (q > 0 && q <= mx && !opts.includes(q)) opts.push(q);
  modal('생선 팔기', `<p style="color:var(--warning);font-size:17px;margin:0">${esc(f)} × ${count(f)}마리 · 1마리 ${won(unit)}</p><p class="muted" style="white-space:pre-line;margin:0">오늘 판매 ${won(fishSoldToday())} / ${won(FIS.FISH_SELL_DAILY)} · 남은 한도 ${won(fishSellLeft())}\n지금 팔 수 있는 수: ${mx}마리</p>${mx <= 0 ? '<p style="color:var(--danger);font-size:13px;margin:0">오늘은 더 팔 수 없습니다. 오전 6시에 한도가 다시 채워집니다. 요리 재료로 써 보세요.</p>' : ''}`,
    opts.map((q) => { const all = q === mx && opts.length > 1; return [all ? `모두 ${q}마리 · ${won(q * unit)}` : `${q}마리 · ${won(q * unit)}`, all ? 'primary' : '', () => act(() => fishSell(f, q))]; }).concat([['취소', '', null]])); }
function curBait() { const want = String(S.P.fish_bait || ''); if (want === 'none') return ''; if (want && count(want) > 0) return want; for (const b of FSH.BAIT_ORDER) if (count(b) > 0) return b; return ''; }
function fishPool(kind, maxRank) { const key = kind + '/' + maxRank; if (FISHS.pools[key]) return FISHS.pools[key]; const out = [];
  for (const n in GD.ITEMS) { const it = GD.ITEMS[n]; if (it.fish || it.rod || it.bait || it.boss_only) continue; if (Number(it.price || 0) <= 0) continue; const c = String(it.cat || '');
    if (kind === 'junk' && c !== '재료') continue; if ((kind === 'supply' || kind === 'supply_s') && !['회복', '음식'].includes(c)) continue;
    if (kind === 'supply_s') { if (cat(n).rank === 6 && !('stat_boost' in it)) out.push([n, 1]); continue; }
    if (it.revive || it.panacea || it.vaccine || 'stat_boost' in it || it.deep) continue; const r = cat(n).rank; if (r < 0 || r > maxRank) continue; out.push([n, r + 1]); }
  return (FISHS.pools[key] = out); }
function fishPick(kind, maxRank, rng) { const pool = fishPool(kind, maxRank); let total = 0; for (const e of pool) total += e[1]; if (total <= 0) return ''; let n = rng.randiRange(1, total); for (const e of pool) { n -= e[1]; if (n <= 0) return e[0]; } return ''; }
function fishSpecies(spot, rareMul, rng) { const pool = []; let total = 0; const RW = { 1: 60, 2: 25, 3: 8, 4: 1.5 };
  for (const n in FSH.FISH) { const f = FSH.FISH[n]; let w = Number(f.sea ? spot.sea : spot.fresh); if (w <= 0) continue; w *= RW[f.rarity]; if (f.rarity >= 3) w *= rareMul; pool.push([n, w]); total += w; }
  let x = rng.randf() * total; for (const e of pool) { x -= e[1]; if (x <= 0) return e[0]; } return pool.length ? pool[pool.length - 1][0] : '붕어'; }
function fishRollSize(sp, sizeMul, rareMul, rng, bonus) { let base = Number(FSH.FISH[sp].cm) * sizeMul * Math.exp(rng.randfn(0, 0.45)); const r = rng.randf();
  if (r < 0.03) base *= rng.randfRange(0.04, 0.3); else if (r < 0.03 + 0.004 * Math.sqrt(rareMul) + bonus) base *= rng.randfRange(4, 25);
  if (rng.randf() < 0.0001 * Math.sqrt(rareMul)) base = rng.randfRange(3000, 10000); return Math.max(1, Math.min(10000, snapped(base, 0.1))); }
const fishCasting = () => !!FISHS.cast;
function fishCast(i, test = false) { const p = S.P; if (fishCasting()) return false;
  if (p.dead || nonEmpty(p.battle) || nonEmpty(p.travel) || nonEmpty(p.pending_explore)) { toast('지금은 낚시할 수 없습니다. 전투 · 단기 탐사 수색 · 지역 이동을 먼저 마치세요.'); return false; }
  let bait = curBait(); if (bait) { if (count(bait) <= 0) bait = ''; else { removeItem(bait, 1); if (!test) toast(`${bait} 1개 사용 · 남은 ${count(bait)}개`); } }
  FISHS.token++; if (bait) questEvent('fish_bait');
  FISHS.cast = { uid: S.acct?.uid, spot: i, bait, rod: equippedRod(), ends: Date.now() + FIS.CAST_SEC * 1000, token: FISHS.token }; FISHS.last = ''; FISHS.result = null; return true; }
/* resolve — 5초 뒤 결과(게임도 이때 무작위 한 벌을 새로 만듦) */
function fishResolve(token, seed = 0) { const c = FISHS.cast; if (!c || c.token !== token || !S.P || c.uid !== S.acct?.uid) { FISHS.cast = null; return false; } FISHS.cast = null; const p = S.P;
  const spot = FSH.SPOTS[Math.max(0, Math.min(FSH.SPOTS.length - 1, c.spot))], noBait = !c.bait, bait = FSH.BAITS[c.bait] || FSH.BAITS[FSH.BASIC_BAIT], rod = FSH.RODS[c.rod] || null;
  const bite = Math.max(0.2, Math.min(0.92, (noBait ? FSH.NO_BAIT_BITE : Number(bait.bite)) + (rod ? Number(rod.bite || 0) : -0.15)));
  const rng = new GRng(seed || (Math.floor(Math.random() * 2 ** 32) * 2 ** 21 + Math.floor(Math.random() * 2 ** 21))); let item = '';
  const bit = rng.randf() < bite;
  if (bit) { if (noBait && rng.randf() < FSH.NO_BAIT_JUNK) item = fishPick('junk', 1, rng); else if (!noBait && Number(bait.s_chance || 0) > 0 && rng.randf() < Number(bait.s_chance)) item = fishPick('supply_s', 6, rng); else if (!noBait && rng.randf() < Number(bait.item) + fishBonus()) item = fishPick('supply', Number(bait.item_rank), rng); }
  if (!bit) { FISHS.last = `${spot.name} · 입질이 없었습니다.${noBait ? '' : ' 미끼만 사라졌습니다.'}`; FISHS.result = { kind: 'miss', title: '놓쳤습니다', rarity: 0, spot: c.spot }; toast('놓쳤습니다…'); }
  else if (item) { fishXp(gRandiRange(1, 3)); const kept = addItem(item, 1); if (!kept) { if (!isDict(p.stored_loot)) p.stored_loot = {}; p.stored_loot[item] = Number(p.stored_loot[item] || 0) + 1; }
    const gr = cat(item).grade; FISHS.last = `${spot.name}에서 [${gr}] ${item}을(를) 건져 올렸습니다${kept ? '' : ' · 가방이 가득 차 받은 물품함으로'}`; FISHS.result = { kind: 'item', title: `${item} [${gr}]`, name: item, rarity: 0, spot: c.spot };
    gLog('[color=#6cb6ff]낚시[/color]  ' + FISHS.last); toast(`건짐 · [${gr}] ${item}`); }
  else { const rare = noBait ? 0 : Number(bait.rare), sp = fishSpecies(spot, rare, rng), size = fishRollSize(sp, (rod ? Number(rod.size || 1) : 0.8) * Number(spot.big), rare, rng, fishBonus()); let stored = false;
    if (!addItem(sp, 1)) { if (!isDict(p.stored_loot)) p.stored_loot = {}; p.stored_loot[sp] = Number(p.stored_loot[sp] || 0) + 1; stored = true; }
    if (!isDict(p.fish_records)) p.fish_records = {}; const before = Number(p.fish_records[sp] || 0); if (size > before) p.fish_records[sp] = size;
    const F = FSH.FISH[sp]; const tag = size >= 3000 ? ' · 초거대!!' : size >= F.cm * 4 ? ' · 거대!' : size < F.cm * 0.3 ? ' · 치어' : '';
    FISHS.last = `${spot.name}에서 ${sp}을(를) 낚았습니다 · 크기 ${fishSize(size)}${tag}${size > before && before > 0 ? ' · 내 최고 기록!' : ''}${stored ? ' · 가방이 가득 차 받은 물품함으로' : ''}`;
    FISHS.result = { kind: 'fish', title: `${sp} · ${fishSize(size)}${tag}`, name: sp, rarity: F.rarity, spot: c.spot };
    questEvent('fish'); if (F.rarity >= 2) questEvent('fish_good'); if (F.rarity >= 3) questEvent('fish_rare');
    gLog('[color=#6cb6ff]낚시[/color]  ' + FISHS.last); toast(`${sp} · ${fishSize(size)}${tag}`); fishXp(FIS.FISH_XP_FISH); fishRecordEvent(sp, size); }
  return true; }
function fishBuyBait(q) { const p = S.P, cost = q * FSH.BAIT_PRICE; if (Number(p.money) < cost) { toast('소지금이 부족합니다.'); return false; } if (!addItem(FSH.BASIC_BAIT, q)) { toast('가방이 가득 찼습니다.'); return false; }
  if (String(p.fish_bait || '') === 'none') p.fish_bait = FSH.BASIC_BAIT; p.money = Number(p.money) - cost; toast(`${FSH.BASIC_BAIT} ${q}개를 샀습니다.`); return true; }
/* 낚시 대회(서버 fishEvent · fishEntries) */
function fishSubscribe() { if (!LIVE.on || FISHS.subbed) return; FISHS.subbed = true; FISHS.entriesFor = '';
  sub('watchFishEvent', [], (r) => { if (!r.ok) return; FISHS.event = isDict(r.event) ? r.event : {}; fishWatchEntries(); if (S.mode === 'fishing') redrawKeep(); }); }
function fishWatchEntries() { const id = String(FISHS.event.id || ''); if (id === FISHS.entriesFor) return; FISHS.entriesFor = id; FISHS.entries = [];
  if (!id) { try { bridge()?.unsubscribe('fish_entries'); } catch (_) {} return; }
  sub('watchFishEntries', [id], (r) => { if (!r.ok) return; FISHS.entries = Array.isArray(r.entries) ? r.entries : []; if (S.mode === 'fishing') redrawKeep(); }); }
const fishEvActive = () => { const e = FISHS.event; return nonEmpty(e) && Number(e.ends || 0) > Date.now() && Number(e.starts || 0) <= Date.now(); };
function fishMyState() { const p = S.P; let st = isDict(p.fish_event) ? p.fish_event : {}; if (String(st.id ?? '') !== String(FISHS.event.id ?? '')) st = { id: String(FISHS.event.id ?? ''), joined: false, best: 0, count: 0, caught: {} }; p.fish_event = st; return st; }
function fishCoinsUsed() { const p = S.P, cut = nowSec() - 86400; p.fish_coin_hist = (Array.isArray(p.fish_coin_hist) ? p.fish_coin_hist : []).filter((e) => Array.isArray(e) && Number(e[0]) > cut); return p.fish_coin_hist.reduce((a, e) => a + Number(e[1]), 0); }
function fishRecordEvent(sp, size) { if (!fishEvActive()) return; const st = fishMyState(); if (!st.joined) return; st.count = Number(st.count) + 1; st.best = Math.max(Number(st.best), size); st.caught[sp] = Number(st.caught[sp] || 0) + 1; S.P.fish_event = st;
  call('fishEntrySet', String(FISHS.event.id), displayName(), Number(st.best), Number(st.count)); }
const fishKindName = () => (String(FISHS.event.kind || 'biggest') === 'biggest' ? '가장 큰 물고기' : '가장 많이 낚기');
async function fishJoin() { if (!fishEvActive()) { toast('진행 중인 대회가 없습니다.'); return; } const st = fishMyState(); if (st.joined) return; if (Number(S.P.coins || 0) < FIS.ENTRY_FEE) { toast('코인이 부족합니다.'); return; }
  const r = await call('fishEntrySet', String(FISHS.event.id), displayName(), 0, 0); if (!r.ok) { toast(r.error || '참가하지 못했습니다.'); return; }
  act(() => { const s2 = fishMyState(); S.P.coins = Number(S.P.coins || 0) - FIS.ENTRY_FEE; s2.joined = true; toast(`낚시 대회에 참가했습니다. (-${FIS.ENTRY_FEE}코인)`); return true; }); }
function fishExchange() { if (!fishEvActive()) { toast('대회 기간에만 코인으로 바꿀 수 있습니다.'); return false; } if (Number(S.P.level || 1) < FIS.COIN_MIN_LEVEL) { toast(`코인 교환은 Lv.${FIS.COIN_MIN_LEVEL}부터 할 수 있습니다.`); return false; }
  const st = fishMyState(), room = Math.max(0, Math.min(FIS.COIN_CAP_24H - fishCoinsUsed(), FIS.COIN_CAP_EVENT - Number(st.coins_got || 0))); let got = 0, used = 0;
  const names = Object.keys(st.caught).sort((a, b) => Number(FSH.FISH[b]?.coin ?? 1) - Number(FSH.FISH[a]?.coin ?? 1));
  for (const n of names) { const per = Number(FSH.FISH[n]?.coin ?? 1), can = Math.min(Number(st.caught[n]), count(n)), take = Math.min(can, Math.floor((room - got) / per)); if (take <= 0) continue; removeItem(n, take); st.caught[n] = Number(st.caught[n]) - take; used += take; got += take * per; }
  if (got <= 0) { toast(`바꿀 수 있는 생선이 없거나 한도(24시간 ${FIS.COIN_CAP_24H} · 대회당 ${FIS.COIN_CAP_EVENT}코인)를 다 썼습니다.`); return false; }
  st.coins_got = Number(st.coins_got || 0) + got; S.P.coins = Number(S.P.coins || 0) + got; S.P.fish_coin_hist.push([nowSec(), got]); S.P.fish_event = st; gLog(`낚시 대회 · 생선 ${used}마리 → ${got}코인`); toast(`${got}코인을 받았습니다.`); return true; }
function fishRanking(top) { const bySize = String(FISHS.event.kind || 'biggest') === 'biggest', rows = [...FISHS.entries].sort((a, b) => (bySize ? Number(b.best || 0) - Number(a.best || 0) : Number(b.count || 0) - Number(a.count || 0)));
  if (!rows.length) return noteBox('아직 기록이 없습니다.');
  return noteBox('순위\n' + rows.slice(0, top).map((r, i) => `${i + 1}위  ${r.name || '생존자'}  ·  ${bySize ? (Number(r.best || 0) > 0 ? fishSize(Number(r.best)) : '기록 없음') : Number(r.count || 0) + '마리'}`).join('\n')); }
function fishEventHtml() { const e = FISHS.event; let h = '';
  if (!fishEvActive()) { if (nonEmpty(e) && Number(e.ends || 0) <= Date.now() && Number(e.ends || 0) > Date.now() - 86400000) h += infoBox('지난 낚시 대회 · ' + fishKindName(), '끝났습니다. 대회 중 낚은 생선은 이제 팔거나 요리할 수 있습니다.') + fishRanking(5); return h; }
  const st = fishMyState(), left = Math.max(0, Math.trunc((Number(e.ends) - Date.now()) / 1000));
  h += infoBox('낚시 대회 진행 중 · ' + fishKindName(), `남은 시간 ${durationText(left)} · 참가비 ${FIS.ENTRY_FEE}코인 · ${st.joined ? '참가 중' : '아직 참가하지 않음'}`);
  if (!st.joined) h += choiceRow('', `대회 참가 · ${FIS.ENTRY_FEE}코인`, `보유 코인 ${Number(S.P.coins || 0)} · 참가한 뒤 낚은 생선부터 기록됩니다.`, 'var(--warning)', Number(S.P.coins || 0) >= FIS.ENTRY_FEE, 'id="fsJoin"');
  else { h += noteBox(`내 기록 · 가장 큰 물고기 ${Number(st.best) > 0 ? fishSize(Number(st.best)) : '-'} · 낚은 수 ${Number(st.count)}마리`); const used = fishCoinsUsed(), eg = Number(st.coins_got || 0), room = Math.max(0, Math.min(FIS.COIN_CAP_24H - used, FIS.COIN_CAP_EVENT - eg)); let value = 0;
    for (const n in st.caught) value += Math.min(Number(st.caught[n]), count(n)) * Number(FSH.FISH[n]?.coin ?? 1);
    h += choiceRow('', `대회 생선을 코인으로 바꾸기 · 최대 ${Math.min(value, room)}코인`, `대회 중 낚은 생선만 바꿀 수 있습니다 · 24시간 ${used} / ${FIS.COIN_CAP_24H}코인 · 이번 대회 ${eg} / ${FIS.COIN_CAP_EVENT}코인 · 기간이 끝나면 바꿀 수 없습니다.`, 'var(--accent)', value > 0 && room > 0, 'id="fsEx"'); }
  return h + fishRanking(10); }
function fishGmHtml() { let h = groupLab('GM · 낚시 대회 관리');
  if (fishEvActive()) return h + choiceRow('', '대회 지금 끝내기', `종목 ${fishKindName()} · 참가 ${FISHS.entries.length}명`, 'var(--danger)', true, 'id="fsClose"');
  h += `<div class="pills" style="margin-bottom:8px">${[['biggest', '가장 큰 물고기'], ['most', '가장 많이 낚기']].map(([k, l]) => `<button class="pill ${FISHS.gmKind === k ? 'on' : ''}" data-fgk="${k}">${l}</button>`).join('')}${[1, 3, 6, 12, 24, 48, 72].map((x) => `<button class="pill ${FISHS.gmHours === x ? 'on' : ''}" data-fgh="${x}">${x}시간</button>`).join('')}</div>`;
  return h + choiceRow('', `낚시 대회 열기 · ${FISHS.gmKind === 'biggest' ? '가장 큰 물고기' : '가장 많이 낚기'} · ${FISHS.gmHours}시간`, '지금부터 시작합니다. 모든 생존자의 낚시 화면에 표시됩니다.', 'var(--accent)', true, 'id="fsOpen"'); }
const infoBox = (t, d) => `<div class="panel infobox"><b>${escJ(t)}</b><span>${escJ(d)}</span></div>`;
const FISH_XY = [[76, 132], [192, 148], [210, 128], [172, 106], [268, 134]];
function fishScene(spot) { const h = Math.floor(Number(kstNow() % 86400) / 3600 * 100) / 100, dusk = (h >= 17 && h < 20) || (h >= 5 && h < 7.5), t = isNight() ? 'night' : dusk ? 'dusk' : 'day', [x, y] = FISH_XY[spot]; let o = '';
  if (fishCasting()) o = `<line x1="304" y1="153" x2="${x}" y2="${y - 2}" stroke="#e8e2d2" stroke-width="1"/><ellipse cx="${x}" cy="${y + 4}" rx="14" ry="4" fill="none" stroke="rgba(255,255,255,.35)"/><circle cx="${x}" cy="${y}" r="6" fill="#f4f2ea"/><path d="M${x - 6} ${y} A6 6 0 0 0 ${x + 6} ${y}Z" fill="#ef5350"/>`;
  else if (FISHS.result && FISHS.result.spot === spot) o = `<ellipse cx="${x}" cy="${y + 4}" rx="22" ry="6" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.2"/><ellipse cx="${x}" cy="${y + 4}" rx="34" ry="9" fill="none" stroke="rgba(255,255,255,.25)"/>`;
  else o = `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="#4fd1a5" stroke-width="2" stroke-dasharray="4.3 4.3"/><circle cx="${x}" cy="${y}" r="3" fill="#4fd1a5"/>`;
  return `<div class="fscene"><svg viewBox="0 0 332 190" preserveAspectRatio="xMidYMid slice" aria-label="낚시터 그림"><image href="${ASSET(`fish_${t}.png`)}" x="0" y="0" width="332" height="190"/>${o}</svg></div>`; }
function fishingPage() { const p = S.P; fishSubscribe();
  if (!p.fishing_guide_seen) { p.fishing_guide_seen = true; p.fishing_guide_v2 = true; nhAdd('fishing-guide', '낚시 안내', FSH.GUIDE, 'growth'); LIFE.dirty = true; setTimeout(() => go('fishing_guide'), 0); return ''; }
  if (!p.fishing_guide_v2) { p.fishing_guide_v2 = true; nhAdd('fishing-guide-v2', '낚시 안내 추가 · 상급 낚싯대 · 미끼', FIS.GUIDE_V2, 'growth'); LIFE.dirty = true; }
  const rod = equippedRod(), bait = curBait(), si = Math.max(0, Math.min(FSH.SPOTS.length - 1, Number(p.fish_spot ?? 3))), sp = FSH.SPOTS[si];
  let h = `${S.mobile ? '' : '<p class="crumb">장기 탐사 중에도 할 수 있습니다 · 전투와 지역 이동 중에는 못 합니다</p>'}<div class="pagehead"><h2>낚시</h2><button class="btn" data-go="fishing_guide">낚시 안내</button></div>${S.mobile ? '<p class="muted sec-sub">장기 탐사 중에도 할 수 있습니다 · 전투와 지역 이동 중에는 못 합니다</p>' : ''}`;
  h += fishEventHtml();
  h += `<div class="panel fstage">${fishScene(si)}<div class="pills">${FSH.SPOTS.map((s, i) => `<button class="pill ${i === si ? 'on' : ''}" data-fspot="${i}" ${fishCasting() ? 'disabled' : ''}>${esc(s.name)}</button>`).join('')}</div>`;
  h += `<p class="subtle" style="margin:0;font-size:12px">${esc(sp.name)} · 민물 ${Math.round(sp.fresh * 100)}% · 바다 ${Math.round(sp.sea * 100)}% · 큰 물고기 ×${Number(sp.big).toFixed(2)}</p>`;
  if (fishCasting()) { const left = Math.max(0, (FISHS.cast.ends - Date.now()) / 1000); h += `<div class="fwait"><b data-live="fish">${left > 0.05 ? `입질을 기다리는 중 · ${Math.ceil(left)}초` : '입질 확인 중…'}</b><div class="bar"><i data-livebar="fish" style="width:${(FIS.CAST_SEC - left) / FIS.CAST_SEC * 100}%;background:var(--accent)"></i></div></div>`; }
  else if (FISHS.result) { const r = FISHS.result, rc = r.kind === 'miss' ? 'var(--danger)' : r.kind === 'fish' ? ({ 1: 'var(--muted)', 2: 'var(--blue)', 3: 'var(--morale)', 4: 'var(--warning)' }[r.rarity] || 'var(--accent)') : 'var(--accent)';
    h += `<div class="fres" style="--c:${rc}">${r.kind !== 'miss' ? `<span class="fic">${itemIcon(r.name, 'currentColor', 26)}</span>` : ''}<div><div class="t"><b>${esc(r.title)}</b>${r.kind === 'fish' ? `<span class="cchip" style="--c:${rc}">${FSH.RARITY_NAME[r.rarity]}</span>` : ''}</div><p>${esc(FISHS.last)}</p></div></div>`; }
  h += `<div class="fcast"><button class="btn primary fcastb" id="fsCast" ${fishCasting() ? 'disabled' : ''}>${fishCasting() ? '던지는 중…' : FISHS.result ? '다시 던지기' : '던지기'}</button>`;
  for (const b of FSH.BAIT_ORDER) if (count(b) > 0) h += `<button class="pill ${b === bait ? 'on' : ''}" data-fbait="${esc(b)}">${esc(b)} × ${count(b)}</button>`;
  h += `<button class="pill ${!bait ? 'on' : ''}" data-fbait="none">미끼 없이</button></div></div>`;
  const best = FSH.ROD_ORDER.find((n) => count(n) > 0) || '';
  h += `<div class="fcards"><div class="panel fcard"><small>낚싯대</small><div class="r"><b>${esc(rod || '장착 안 함')}</b>${rod ? '<em style="color:var(--accent)">장착됨</em>' : '<em style="color:var(--warning)">손 낚싯줄 · 입질 -15%</em>'}</div>${best && best !== rod ? `<button class="btn sm" style="color:var(--accent)" id="fsRod" data-rod="${esc(best)}">장착 · ${esc(best)}</button>` : '<small>장비 › 낚싯대 칸에서 바꿀 수 있습니다</small>'}</div>`;
  h += `<div class="panel fcard"><div class="r"><small>낚시 레벨</small><b>Lv.${fishLevel()}</b></div><div class="bar"><i style="width:${Number(p.fish_xp || 0)}%;background:var(--blue)"></i></div><small>낚시 경험치 ${Number(p.fish_xp || 0)} / ${FIS.FISH_XP_PER_LEVEL} · 큰 물고기 확률 +${Math.round(fishBonus() * 100)}%</small></div></div>`;
  h += groupLab('낚시 상점 · 이곳에서만 판매') + `<div class="panel fshop"><div class="top"><span class="fic" style="--c:var(--blue)">${itemIcon(FSH.BASIC_BAIT, 'currentColor', 24)}</span><div><b>${esc(FSH.BASIC_BAIT)}</b><p class="muted">1개 ${won(FSH.BAIT_PRICE)} · 보유 ${count(FSH.BASIC_BAIT)}개 · 소지금 ${won(p.money)}</p></div></div><div class="row">${[1, 10, 30].map((q) => `<button class="btn" style="color:var(--blue)" data-fbuy="${q}" ${Number(p.money) < q * FSH.BAIT_PRICE ? 'disabled' : ''}>${q}개 · ${won(q * FSH.BAIT_PRICE)}</button>`).join('')}</div></div>`;
  const have = Object.keys(FSH.FISH).filter((n) => count(n) > 0), sold = fishSoldToday();
  h += groupLab('내 생선 · 이곳에서만 판매') + `<div class="panel flim"><div class="r"><b class="muted">오늘 생선 판매</b><b style="color:${fishSellLeft() > 0 ? 'var(--warning)' : 'var(--danger)'}">${won(sold)} / ${won(FIS.FISH_SELL_DAILY)}</b></div><div class="bar"><i style="width:${sold / FIS.FISH_SELL_DAILY * 100}%;background:var(--warning)"></i></div><small class="muted">하루 최대 ${won(FIS.FISH_SELL_DAILY)} · 오전 6시 초기화 · 일반 상점에서는 생선을 팔 수 없습니다</small></div>`;
  if (!have.length) h += noteBox('아직 가진 생선이 없습니다. 낚시터를 고르고 [던지기]를 눌러 보세요.');
  else h += `<div class="panel flist">${have.map((f) => { const rec = Number((p.fish_records || {})[f] || 0), rr = FSH.FISH[f].rarity, rc = { 1: 'var(--muted)', 2: 'var(--blue)', 3: 'var(--morale)', 4: 'var(--warning)' }[rr];
    return `<div class="frow"><span class="fic" style="--c:${rc}">${itemIcon(f, 'currentColor', 24)}</span><div class="tx"><div class="t"><b>${esc(f)} × ${count(f)}</b><span class="cchip" style="--c:${rc}">${FSH.RARITY_NAME[rr]}</span></div><span>1마리 ${won(fishUnit(f))}${rec > 0 ? ' · 내 최고 ' + fishSize(rec) : ''}</span></div><button class="btn sm" style="color:var(--warning)" data-fsell="${esc(f)}" ${fishSellMax(f) <= 0 ? 'disabled' : ''}>팔기</button><button class="btn sm" style="color:var(--accent)" data-fcook="${esc(f)}">요리</button></div>`; }).join('')}</div>`;
  if (S.admin) h += fishGmHtml();
  return h; }
function bindFishing() { const c = $('center'), on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; }; bindProgress();
  c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-fspot]').forEach((b) => { b.onclick = () => { S.P.fish_spot = Number(b.dataset.fspot); LIFE.dirty = true; redrawKeep(); }; });
  c.querySelectorAll('[data-fbait]').forEach((b) => { b.onclick = () => { S.P.fish_bait = b.dataset.fbait; LIFE.dirty = true; redrawKeep(); }; });
  c.querySelectorAll('[data-fbuy]').forEach((b) => { b.onclick = () => act(() => fishBuyBait(Number(b.dataset.fbuy))); });
  c.querySelectorAll('[data-fsell]').forEach((b) => { b.onclick = () => fishSellModal(b.dataset.fsell); });
  c.querySelectorAll('[data-fcook]').forEach((b) => { b.onclick = () => { CRAFT.cat = '요리'; CRAFT.q = ''; CRAFT.mat = b.dataset.fcook; CRAFT.page = 0; go('craft'); }; });
  c.querySelectorAll('[data-fgk]').forEach((b) => { b.onclick = () => { FISHS.gmKind = b.dataset.fgk; redrawKeep(); }; });
  c.querySelectorAll('[data-fgh]').forEach((b) => { b.onclick = () => { FISHS.gmHours = Number(b.dataset.fgh); redrawKeep(); }; });
  on('fsRod', () => act(() => equipGear($('fsRod').dataset.rod)));
  on('fsCast', () => { const si = Math.max(0, Math.min(FSH.SPOTS.length - 1, Number(S.P.fish_spot ?? 3))); act(() => fishCast(si), () => { const tk = FISHS.token; clearTimeout(FISHS.timer); FISHS.timer = setTimeout(() => { if (!FISHS.cast || FISHS.cast.token !== tk) return; const pre = clone(S.P), ok = fishResolve(tk), after = S.P; S.P = pre; if (ok) act(() => { S.P = after; return true; }); else rerender(); }, FIS.CAST_SEC * 1000); }); });
  on('fsJoin', fishJoin); on('fsEx', () => act(() => fishExchange()));
  on('fsClose', async () => { const r = await call('fishEventClose'); toast(r.ok ? '대회를 끝냈습니다.' : r.error || '실패'); });
  on('fsOpen', async () => { const k = FISHS.gmKind, hrs = FISHS.gmHours, r = await call('fishEventOpen', k, hrs); if (r.ok) { toast('낚시 대회를 열었습니다.'); call('adminNotice', '낚시 대회 개최', `${k === 'biggest' ? '가장 큰 물고기' : '가장 많이 낚기'} 종목 · ${hrs}시간 동안 열립니다. 함께 › 낚시에서 참가하세요(참가비 ${FIS.ENTRY_FEE}코인).`); } else toast(r.error || '실패'); }); }
function fishLiveTick() { if (S.mode !== 'fishing' || !fishCasting()) return; const el = document.querySelector('[data-live="fish"]'); if (!el) return; const left = Math.max(0, (FISHS.cast.ends - Date.now()) / 1000);
  el.textContent = left > 0.05 ? `입질을 기다리는 중 · ${Math.ceil(left)}초` : '입질 확인 중…'; const b = document.querySelector('[data-livebar="fish"]'); if (b) b.style.width = (FIS.CAST_SEC - left) / FIS.CAST_SEC * 100 + '%'; }
function fishGuidePage() { const p = S.P, rod = equippedRod(); let h = headT('낚시 안내', '그림 속 낚시터를 눌러 5초 동안 낚시합니다 · 이 안내는 언제든 다시 볼 수 있습니다');
  h += '<div class="fguide"><div class="panel fgmain"><b>기본 규칙</b>' + String(FSH.GUIDE).split('\n').map((l) => l.trim()).filter(Boolean).map((t) => { const bl = t.startsWith('·') || t.startsWith('-'); return bl ? `<div class="gl"><i></i><span>${esc(t.slice(1).trim())}</span></div>` : `<p class="muted">${esc(t)}</p>`; }).join('') + '</div>';
  h += `<div class="fgside"><div class="panel petnew"><small>상급 낚싯대 · 미끼</small>${FIS.GUIDE_V2.split('\n').map((l) => `<p style="margin:0;font-size:12px">${esc(l.replace(/^· /, ''))}</p>`).join('')}</div>`;
  h += `<div class="panel petinfo"><b>내 낚시</b><p class="muted">낚시 Lv.${fishLevel()} · 경험치 ${Number(p.fish_xp || 0)} / ${FIS.FISH_XP_PER_LEVEL} · 큰 물고기 확률 +${Math.round(fishBonus() * 100)}%</p><p class="muted">낚싯대 · ${esc(rod || '장착 안 함(손 낚싯줄 · 입질 -15%)')}</p></div><button class="btn primary big" data-go="fishing">낚시하러 가기</button></div></div>`;
  return h; }

/* ════════ 내 방 — player_room.gd · room_data.gd 그대로(가구 · 꾸미기 · 상호작용 · 쉬기 · 룸 상점 · 친구 방 방문 · 함께 쉬기 장면) ════════ */
const RD = D.room_data;
const ROOM = { host: '', hostName: '', hostRel: 'friend', hostRelSet: false, hostRelBack: '', hostRoom: {}, hostLoaded: false, inside: '', people: [], decorating: false, shopCat: '전체', beat: 0, greeted: {}, feed: [], queue: [], running: false };
const displayName = () => (LIVE.on ? (S.admin ? 'GM · ' : '') + String(S.acct?.nickname || '') : String(S.acct?.nickname || '미등록 생존자'));
const myCid = () => String(S.acct?.charId ?? S.acct?.uid ?? '');
const meName = () => (LIVE.on && S.acct?.nickname ? String(S.acct.nickname) : displayName());
const roomDay = () => Math.trunc((kstNow() - 6 * 3600) / 86400);
const rdItem = (id) => RD.FURNITURE[id] || {};
const rdFill = (line, vars) => { let o = String(line); for (const k in vars) o = o.replaceAll('{' + k + '}', String(vars[k])); return o; };
const rdCoin = (price) => (price > 0 ? Math.max(1, Math.ceil(price / RD.COIN_RATE)) : 0);
const restHeal = () => Math.round(Math.max(8, Math.round(Number(S.P.max_hp) * 0.1)) * cityMult('power'));
/* main._grant_positive_id */
function posGrantId(id, seconds) { const p = S.P; if (!BD.POSITIVES[id] || p.dead) return false; const q = clone(BD.POSITIVES[id]); q.until = nowSec() + seconds; q.tick = nowSec(); q.duration = seconds; if (!('desc' in q)) q.desc = positiveDefText(q); if (!isDict(p.positive)) p.positive = {}; p.positive[id] = q; return true; }
/* state_events.on_rest */
function statesOnRest() { const p = S.P; lightMark(); if (p.conditions?.fatigue) { delete p.conditions.fatigue; gLog('[color=#3fd0a4]휴식[/color]  피로가 풀렸다.'); } if (gRandf() < 0.35) grantState(gPick(BD.V28_REST_POOL), 180, '충분한 휴식'); }
function roomEnsure() { const p = S.P, r = isDict(p.room) ? p.room : {}; if (!isDict(r.owned)) r.owned = { mattress: true, w_basic: true }; if (!Array.isArray(r.slots)) r.slots = [];
  while (r.slots.length < RD.SLOTS) r.slots.push(''); if (r.slots.length > RD.SLOTS) r.slots = r.slots.slice(0, RD.SLOTS);
  for (let i = 0; i < r.slots.length; i++) { const id = String(r.slots[i]); if (id && (!RD.FURNITURE[id] || !(id in r.owned))) r.slots[i] = ''; }
  if (!r.init) { r.slots[5] = 'mattress'; r.init = true; } if (!r.wall || !(String(r.wall) in r.owned)) r.wall = 'w_basic'; if (!('f_concrete' in r.owned)) r.owned.f_concrete = true; if (!r.floor || !(String(r.floor) in r.owned)) r.floor = 'f_concrete';
  p.room = r; return r; }
const roomLayout = (r) => JSON.stringify({ s: r.slots, w: String(r.wall), f: String(r.floor || 'f_concrete') });
function roomParse(text) { let v = null; try { v = text ? JSON.parse(text) : null; } catch (_) {} const out = { slots: [], wall: 'w_basic', floor: 'f_concrete' };
  if (isDict(v)) { if (Array.isArray(v.s)) for (const id of v.s) out.slots.push(RD.FURNITURE[String(id)] && !['벽지', '바닥'].includes(String(rdItem(String(id)).cat || '')) ? String(id) : '');
    if (RD.FURNITURE[String(v.w ?? '')] && rdItem(String(v.w)).cat === '벽지') out.wall = String(v.w); if (RD.FURNITURE[String(v.f ?? '')] && rdItem(String(v.f)).cat === '바닥') out.floor = String(v.f); }
  while (out.slots.length < RD.SLOTS) out.slots.push(''); out.slots = out.slots.slice(0, RD.SLOTS); return out; }
const roomPublish = () => { if (LIVE.on) call('roomSave', roomLayout(roomEnsure())); };
function roomCanUse() { const p = S.P; if (p.dead) return '사망 상태에서는 방에 들어갈 수 없습니다.'; if (nonEmpty(p.long_expedition)) return '장기 탐사 중에는 방에 들어갈 수 없습니다.'; if (activityBusy() || nonEmpty(p.battle)) return '지금은 방에 들어갈 수 없습니다. ' + busyReason(); return ''; }
function roomOpenMine() { FD.roomFresh = true; go('room'); FD.roomFresh = false; }
/* go('room')로 들어올 때(방 밖에서 · 내 방 열기) — player_room.open_mine */
function roomGoHook() { if (FD.roomVisit) return true; if (!FD.roomFresh && ['room', 'room_shop'].includes(S.mode)) return true; const why = roomCanUse(); if (why) { toast(why); return false; }
  if (ROOM.inside && ROOM.inside !== myCid()) roomLeave(); Object.assign(ROOM, { host: '', hostName: '', hostRoom: {}, hostLoaded: true, decorating: false }); roomEnsure(); if (LIVE.on) { roomPublish(); roomEnter(myCid()); } return true; }
function roomVisit(f) { const why = roomCanUse(); if (why) { toast(why); return; } if (!LIVE.on) { toast('친구 방은 로그인해야 방문할 수 있습니다.'); return; }
  const cid = String(f.charId ?? f.uid ?? ''); if (!cid || cid === myCid()) { roomOpenMine(); return; }
  ROOM.host = cid; ROOM.hostName = String(f.nickname || '친구'); ROOM.hostRel = String(f.rel || ''); act(() => { questEvent('room_visit'); return true; });
  ROOM.hostRelSet = RD.REL_IDS.includes(ROOM.hostRel); if (!ROOM.hostRelSet) ROOM.hostRel = 'friend'; Object.assign(ROOM, { hostRoom: {}, hostLoaded: false, decorating: false, hostRelBack: '' }); delete ROOM.greeted[cid];
  call('roomLoad', cid).then((res) => { if (ROOM.host !== cid) return; ROOM.hostRelBack = RD.REL_IDS.includes(String(res.relBack || '')) ? String(res.relBack) : ''; const room = res.room;
    ROOM.hostRoom = roomParse(isDict(room) ? String(room.layout || '') : ''); if (isDict(room) && room.name) ROOM.hostName = String(room.name); ROOM.hostLoaded = true; if (['room', 'room_shop'].includes(S.mode)) redrawKeep(); });
  roomEnter(cid); FD.roomVisit = true; go('room'); FD.roomVisit = false; }
function roomEnter(cid) { if (!LIVE.on) return; ROOM.inside = cid; ROOM.beat = 0; ROOM.people = []; call('roomEnter', cid);
  sub('watchRoom', [cid], (res) => { if (ROOM.inside !== cid || !res.ok) return; ROOM.people = Array.isArray(res.people) ? res.people : []; roomMaybeGreet(); if (S.mode === 'room') redrawKeep(); }); }
function roomLeave() { if (!ROOM.inside) return; ROOM.inside = ''; ROOM.people = []; ROOM.decorating = false; try { bridge()?.unsubscribe('room'); } catch (_) {} call('roomLeave'); }
/* 5초마다(main room_clock) */
function roomTick() { if (!ROOM.inside) return; if (!['room', 'room_shop'].includes(S.mode)) { roomLeave(); return; } ROOM.beat += 5; if (ROOM.beat >= 60) { ROOM.beat = 0; call('roomEnter', ROOM.inside); } }
setInterval(() => { if (S.P && !$('app').hidden) roomTick(); }, 5000);
const hostPresent = () => !!ROOM.host && ROOM.people.some((x) => isDict(x) && String(x.charId || '') === ROOM.host);
function roomMaybeGreet() { if (!ROOM.host || !hostPresent() || ROOM.greeted[ROOM.host]) return; ROOM.greeted[ROOM.host] = true;
  const rel2 = `${ROOM.hostRelSet ? ROOM.hostRel : ''}|${ROOM.hostRelBack}`, sc = roomScene('greet', rel2, meName(), ROOM.hostName);
  call('roomEvent', ROOM.host, JSON.stringify({ kind: 'greet', rel: rel2, idx: sc.idx })); act(() => { gLog(`[color=#f2789a]방문[/color]  ${sc.lines.join(' ')}`); return true; });
  roomPush(sc.lines, sc.color, `${ROOM.hostName} 님이 방에 있습니다. 함께 쉬면 특별한 장면이 나옵니다.`); }
/* 친구가 내 방에서 보낸 장면 */
function roomOnEvents(events) { let any = false; const pre = clone(S.P);
  for (const ev of events || []) { if (!isDict(ev)) continue; const kind = String(ev.kind || ''); if (!['duo', 'greet'].includes(kind)) continue; any = true;
    const sc = roomScene(kind, String(ev.rel || ''), String(ev.name || '친구'), meName(), Number(ev.idx || 0)), line = sc.lines.join(' '); let foot = '';
    if (kind === 'duo') { const r = roomEnsure(); if (Number(r.host_day ?? -1) !== roomDay()) { r.host_day = roomDay(); r.host_count = 0; }
      if (Number(r.host_count || 0) < RD.DAILY_REST) { r.host_count = Number(r.host_count || 0) + 1; S.P.morale = Math.min(100, Number(S.P.morale) + 8); const heal = Math.round(restHeal() * 0.5); S.P.hp = Math.min(Number(S.P.max_hp), Number(S.P.hp) + heal); foot = `함께 쉰 덕분에 사기 +8 · 체력 +${heal} (오늘 ${r.host_count}/${RD.DAILY_REST}회)`; } }
    gLog(`[color=#f2789a]${kind === 'duo' ? '함께 쉬기' : '방문'}[/color]  ${line}`);
    if (ROOM.inside === myCid() && S.mode === 'room' && !ROOM.host) roomPush(sc.lines, sc.color, foot); else if (kind === 'duo') modal('함께 쉬기', `<p style="white-space:pre-line;color:var(--text);font-size:17px">${esc(sc.lines.join('\n'))}</p>${foot ? `<p style="color:${sc.color}">${esc(foot)}</p>` : ''}`); else toast(`${ev.name || '친구'} 님이 내 방에 들렀습니다.`); }
  if (any) { const after = S.P; S.P = pre; act(() => { S.P = after; return true; }); } }
/* 장면 고르기(방문객 a · 방 주인 b) — 방문객과 방 주인이 같은 rel2 · idx로 같은 장면 */
const R_FLIP = { mentor: 'pupil', pupil: 'mentor' };
function rNorm(rel2) { const pt = String(rel2).split('|'); let ra = pt[0] || '', rb = pt[1] || ''; if (!RD.REL_IDS.includes(ra)) ra = ''; if (!RD.REL_IDS.includes(rb)) rb = '';
  if (!ra && !rb) return ['friend', '']; if (!ra) return rb === 'savior' ? ['friend', 'savior'] : [R_FLIP[rb] || rb, '']; return [ra, rb]; }
const rDedicated = (ra, rb) => (rb === '' ? true : ra === rb ? !['mentor', 'pupil'].includes(ra) : (R_FLIP[ra] || '') === rb);
const pickIdx = (n, size) => gShuffle([...Array(size).keys()]).slice(0, Math.min(n, size));
const encIdx = (ids) => ids.reduce((v, x, i) => v + Number(x) * 16 ** i, 0);
const decIdx = (v, n = 3) => [...Array(n).keys()].map((i) => (v >> (4 * i)) & 15);
function roomScene(kind, rel2, a, b, enc = -1) { const [ra, rb] = rNorm(rel2), duo = kind === 'duo', lines = []; let ids = []; const cl = (x, n) => Math.max(0, Math.min(n - 1, Number(x)));
  if (rDedicated(ra, rb)) { const src = duo ? RD.DUO_REST : RD.GREET, pool = src[ra] || src.friend, cnt = duo ? 3 : 1; ids = enc >= 0 ? decIdx(enc, cnt) : pickIdx(cnt, pool.length); for (const i of ids) lines.push(rdFill(pool[cl(i, pool.length)], { a, b })); }
  else { const ev = duo ? RD.MIX_EVENT : RD.MIX_GREET, rp = duo ? RD.REACT : RD.GREET_REACT, pa = rp[ra] || rp.friend, pb = rp[rb] || rp.friend;
    if (enc >= 0) ids = decIdx(enc, 3); else { ids = [GR.next() % ev.length, GR.next() % pa.length, GR.next() % pb.length]; if (ra === rb && pb.length > 1) while (ids[2] === ids[1]) ids[2] = GR.next() % pb.length; }
    lines.push(rdFill(ev[cl(ids[0], ev.length)], { a, b })); lines.push(rdFill(pa[cl(ids[1], pa.length)], { a, b })); lines.push(rdFill(pb[cl(ids[2], pb.length)], { a: b, b: a })); }
  return { lines, idx: encIdx(ids), color: '#' + (RD.REL_COLORS[ra] || '69c5a7') }; }
/* 방 이야기 — 여러 줄을 1.25초 간격으로 한 줄씩 */
function roomPush(lines, color = '', tail = '') { for (const l of lines) ROOM.queue.push({ text: String(l), color }); if (tail) ROOM.queue.push({ text: tail, color: 'var(--accent)', small: true }); if (!ROOM.running) roomFeedStep(); }
function roomFeedStep() { if (!ROOM.queue.length) { ROOM.running = false; return; } ROOM.running = true; const row = ROOM.queue.shift(); ROOM.feed.push(row); while (ROOM.feed.length > 30) ROOM.feed.shift();
  const box = $('roomFeed'); if (box) { if (ROOM.feed.length === 1) box.innerHTML = ''; const el = document.createElement('p'); el.className = 'rline' + (row.small ? ' sm' : ''); if (row.color) el.style.color = row.color; el.textContent = row.text; box.appendChild(el); while (box.children.length > 30) box.firstChild.remove(); box.scrollTop = box.scrollHeight; }
  setTimeout(roomFeedStep, 1250); }
const ACT_POS = ['focus', 'vigor', 'protected', 'calm', 'regeneration', 'light_step'];
function roomActBonus() { const p = S.P; if (p.dead) return '효과 없음'; const hurt = Number(p.hp) < Number(p.max_hp);
  if (hurt && gRandf() < 0.5) { const heal = Math.max(5, Math.round(restHeal() * 0.6)), b = Number(p.hp); p.hp = Math.min(Number(p.max_hp), b + heal); return `체력 +${Number(p.hp) - b}`; }
  const id = ACT_POS[GR.next() % ACT_POS.length], sec = gRandiRange(7200, 10800); if (posGrantId(id, sec)) { const q = BD.POSITIVES[id] || {}; return `${q.name || id} ${durationText(sec)} (${q.desc || ''})`; } return '효과 없음'; }
function roomInteract(id) { const it = rdItem(id), acts = it.acts || []; if (!acts.length) return false; const line = rdFill(acts[GR.next() % acts.length], { me: meName() }), r = roomEnsure();
  if (Number(r.act_day ?? -1) !== roomDay()) { r.act_day = roomDay(); r.acts = 0; } let foot = '';
  if (Number(r.acts) < RD.DAILY_ACT_BONUS) { r.acts = Number(r.acts) + 1; foot = roomActBonus() + ` · 오늘 ${r.acts}/${RD.DAILY_ACT_BONUS}회`; }
  gLog(`[color=#e3b341]${it.name}[/color]  ${line}`); ROOM.pushAfter = [[`${it.name} · ${line}`], '', foot]; return true; }
function roomRestMine() { const p = S.P, before = Number(p.rest_ready || 0); if (!restNow()) return false; if (Number(p.rest_ready || 0) === before) return true;
  const r = roomEnsure(), vars = { me: meName() }, lines = [rdFill(RD.MINE_OPEN[GR.next() % RD.MINE_OPEN.length], vars)], placed = r.slots.filter((id) => id && (rdItem(id).acts || []).length);
  if (placed.length) { const acts = rdItem(placed[GR.next() % placed.length]).acts; lines.push(rdFill(acts[GR.next() % acts.length], vars)); }
  lines.push(rdFill(RD.MINE_CLOSE[GR.next() % RD.MINE_CLOSE.length], vars)); ROOM.pushAfter = [lines, '', `내 방에서 쉬기 · 사기 +15 · 체력 +${restHeal()}`]; return true; }
function roomRestState() { const r = roomEnsure(); let st = isDict(r.rest) ? r.rest : {}; if (Number(st.day ?? -1) !== roomDay()) st = { day: roomDay(), count: 0, last: Number(st.last || 0) }; r.rest = st; return st; }
function roomCureOne() { const c = S.P.conditions; if (!isDict(c) || !nonEmpty(c)) return ''; let best = '', bu = -1; for (const k in c) { if (k === 'final_mutation') continue; const u = isDict(c[k]) ? Number(c[k].until || 0) : 0; if (!best || u > bu) { best = k; bu = u; } }
  if (!best) return ''; delete c[best]; return String(ED.CONDITIONS?.[best]?.name || best); }
function roomRestFriend() { if (!ROOM.host || S.P.dead) return false; const p = S.P, st = roomRestState();
  if (Number(st.count) >= RD.DAILY_REST) { toast(`오늘은 친구 방에서 더 쉴 수 없습니다. (하루 ${RD.DAILY_REST}회)`); return false; } const wait = Number(st.last) + RD.REST_GAP - nowSec(); if (wait > 0) { toast(`다음 휴식까지 ${durationText(wait)} 남았습니다.`); return false; }
  const heal = Math.round(restHeal() * 1.5), hb = Number(p.hp); p.hp = Math.min(Number(p.max_hp), hb + heal); p.morale = Math.min(100, Number(p.morale) + 23); p.hunger = Math.max(0, Number(p.hunger) - 3); p.water = Math.max(0, Number(p.water) - 4);
  const cured = roomCureOne(); st.count = Number(st.count) + 1; st.last = nowSec(); statesOnRest(); const together = hostPresent(); let lines = [];
  if (together) { questEvent('room_rest'); const rel2 = `${ROOM.hostRelSet ? ROOM.hostRel : ''}|${ROOM.hostRelBack}`, sc = roomScene('duo', rel2, meName(), ROOM.hostName); lines = sc.lines; ROOM.duoEvent = [ROOM.host, JSON.stringify({ kind: 'duo', rel: rel2, idx: sc.idx })]; }
  else { const solo = ROOM.hostRelSet ? RD.SOLO_REST_REL[ROOM.hostRel] || RD.SOLO_REST : RD.SOLO_REST; for (const i of pickIdx(3, solo.length)) lines.push(rdFill(solo[i], { a: meName(), b: ROOM.hostName })); }
  const hpTxt = Number(p.hp) > hb ? `체력 +${Number(p.hp) - hb}` : '체력 가득', foot = `${hpTxt} · 사기 +23${cured ? ` · ${cured} 치료` : ''} · 오늘 ${st.count}/${RD.DAILY_REST}회 · 다음 휴식은 30분 뒤`;
  gLog(`[color=#f2789a]${together ? '함께 쉬기' : '혼자 쉬기'}[/color]  ${lines.join(' ')}  (${foot})`);
  const col = together ? '#' + (RD.REL_COLORS[rNorm(`${ROOM.hostRelSet ? ROOM.hostRel : ''}|${ROOM.hostRelBack}`)[0]] || '69c5a7') : ROOM.hostRelSet ? '#' + (RD.REL_COLORS[ROOM.hostRel] || '69c5a7') : '';
  ROOM.pushAfter = [lines, col, foot]; toast(`${ROOM.hostName} 방에서 쉬었습니다 · ${hpTxt} · 사기 +23`); return true; }
function roomAfter() { if (ROOM.duoEvent) { call('roomEvent', ...ROOM.duoEvent); ROOM.duoEvent = null; } if (ROOM.pushAfter) { const [l, c, f] = ROOM.pushAfter; ROOM.pushAfter = null; roomPush(l, c, f); } }
function roomBuy(id, cur) { const it = rdItem(id); if (!nonEmpty(it)) return false; const r = roomEnsure(), p = S.P; if (id in r.owned) { toast('이미 가지고 있습니다.'); return false; }
  const price = Number(it.price), coin = rdCoin(price);
  if (cur === 'coins') { if (Number(p.coins || 0) < coin) { toast('코인이 부족합니다.'); return false; } p.coins = Number(p.coins) - coin; } else { if (Number(p.money) < price) { toast('소지금이 부족합니다.'); return false; } p.money = Number(p.money) - price; }
  r.owned[id] = true; questEvent('room_buy'); gLog(`[color=#e3b341]룸 상점[/color]  ${it.name} 구매 · ${cur === 'coins' ? '코인 ' + coin : won(price)}`);
  toast(['벽지', '바닥'].includes(it.cat) ? `${it.name}을(를) 샀습니다. '방 꾸미기'에서 ${it.cat}을(를) 고르세요.` : `${it.name}을(를) 샀습니다. '방 꾸미기'에서 놓아 보세요.`); return true; }
const rCatOrder = (id) => String(RD.CATS.indexOf(String(rdItem(id).cat || ''))).padStart(2, '0') + String(rdItem(id).name || '');
const roomOwnedFurniture = (r) => Object.keys(r.owned).filter((id) => RD.FURNITURE[id] && !['벽지', '바닥'].includes(rdItem(id).cat)).sort((a, b) => (rCatOrder(a) < rCatOrder(b) ? -1 : rCatOrder(a) > rCatOrder(b) ? 1 : 0));
function roomPickSlot(i) { const r = roomEnsure(), cur = String(r.slots[i] || ''), placed = new Set(r.slots.map(String)); let h = '';
  const opts = roomOwnedFurniture(r).filter((id) => id !== cur && !placed.has(id));
  if (cur) h += `<button class="btn" style="color:var(--warning)" data-rpick="">치우기 · ${esc(rdItem(cur).name)}</button>`;
  h += opts.map((id) => `<button class="btn" style="color:var(--accent)" data-rpick="${esc(id)}">${esc(rdItem(id).name)} · ${esc(rdItem(id).cat)}</button>`).join('');
  if (!opts.length) h += '<p class="muted">놓을 수 있는 가구가 없습니다. 이미 놓은 가구는 한 자리에만 놓을 수 있습니다. 룸 상점에서 더 사 보세요.</p>';
  modal(`${RD.SPOTS[i][2]} 자리`, `<div class="rpick">${h}</div>`, [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-rpick]').forEach((b) => { b.onclick = () => { $('modalRoot').innerHTML = ''; act(() => { roomEnsure().slots[i] = b.dataset.rpick; questEvent('room_deco'); return true; }, roomPublish); }; }); }
/* 방 그림(RoomCanvas.paint) — SVG로 같은 구도 */
const rcol = (h) => '#' + String(h || '39424a').replace('#', '');
const mixHex = (a, b, t) => { const x = hex(rcol(a)), y = hex(rcol(b)); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const darkHex = (a, f) => mixHex(a, '#000000', f), liteHex = (a, f) => mixHex(a, '#ffffff', f);
function roomWallArt(w, h, id, base) { const dk = darkHex(base, 0.22), lt = liteHex(base, 0.22); let o = '';
  if (id === 'w_wood') { const n = 14; for (let i = 1; i < n; i++) o += `<rect x="${w * i / n - 1}" y="0" width="2" height="${h}" fill="${dk}" opacity=".6"/>`; for (let i = 0; i < n; i++) o += `<rect x="${w * (i + 0.5) / n}" y="${h * (0.25 + 0.4 * (i % 3) / 3)}" width="3" height="3" fill="${dk}" opacity=".5"/>`; }
  else if (id === 'w_brick') { const rows = 5, bw = w / 12, rh = h / rows; for (let y = 0; y < rows; y++) { o += `<rect x="0" y="${y * rh}" width="${w}" height="1.5" fill="${lt}" opacity=".55"/>`; for (let x = y % 2 ? bw * 0.5 : 0; x < w; x += bw) o += `<rect x="${x}" y="${y * rh}" width="1.5" height="${rh}" fill="${lt}" opacity=".55"/>`; } }
  else if (id === 'w_night') { for (let i = 0; i < 26; i++) { const px = ((i * 0.6180339 * w * 1.7) % w + w) % w, py = ((i * i * 7.3) % (h * 0.85)) + 2; o += `<circle cx="${px}" cy="${py}" r="${i % 4 ? 1.4 : 2.2}" fill="rgba(255,237,153,.85)"/>`; } }
  else if (id === 'w_cream') { const n = 22; for (let i = 0; i < n; i += 2) o += `<rect x="${w * i / n}" y="0" width="${w / n}" height="${h}" fill="${lt}" opacity=".35"/>`; }
  else if (id === 'w_flower') { for (let i = 0; i < 18; i++) { const cx = w * ((i % 9) + (Math.floor(i / 9) % 2 === 0 ? 0.5 : 1)) / 9.5, cy = h * (i < 9 ? 0.3 : 0.68); for (let k = 0; k < 4; k++) o += `<circle cx="${cx + 3.2 * Math.cos(k * Math.PI / 2)}" cy="${cy + 3.2 * Math.sin(k * Math.PI / 2)}" r="2.4" fill="${lt}" opacity=".9"/>`; o += `<circle cx="${cx}" cy="${cy}" r="1.8" fill="#fad973"/>`; } }
  else if (id === 'w_sky') { for (const [cx, cy] of [[0.18, 0.4], [0.72, 0.55], [0.9, 0.3]]) for (const [dx, dy] of [[-10, 2], [0, -3], [10, 2], [0, 4]]) o += `<circle cx="${w * cx + dx}" cy="${h * cy + dy}" r="7" fill="rgba(255,255,255,.55)"/>`; }
  else if (id === 'w_forest') { const n = 16; for (let i = 0; i < n; i++) { const tx = w * (i + 0.5) / n, th = h * (0.45 + 0.25 * ((i * 7) % 3) / 2); o += `<polygon points="${tx - 9},${h} ${tx + 9},${h} ${tx},${h - th}" fill="${dk}" opacity=".75"/>`; } }
  else if (id === 'w_black') { const t = h / 4; for (let x = 0; x < w; x += t) o += `<rect x="${x}" y="0" width="1.2" height="${h}" fill="${lt}" opacity=".5"/>`; for (let y = 0; y < 4; y++) o += `<rect x="0" y="${y * t}" width="${w}" height="1.2" fill="${lt}" opacity=".5"/>`; }
  else if (id === 'w_mint') o += `<rect x="0" y="${h * 0.62}" width="${w}" height="3" fill="${lt}" opacity=".8"/><rect x="0" y="${h * 0.62 + 3}" width="${w}" height="${h * 0.38 - 3}" fill="${dk}" opacity=".35"/>`;
  return o; }
function roomFloorArt(x0, y0, w, h, fid) { const it = rdItem(fid), base = rcol(it.color || '585e60'), line = rcol(it.line || '4c5254'); let o = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${base}"/>`; const pat = String(it.pattern || 'slab');
  if (pat === 'plank') { const st = Math.max(36, Math.min(64, w / 13)); let j = 0; for (let x = x0; x < x0 + w; x += st, j++) { o += `<rect x="${x}" y="${y0}" width="2" height="${h}" fill="${line}"/><rect x="${x}" y="${y0 + (j * 97) % h}" width="${st}" height="2" fill="${line}"/>`; } }
  else if (pat === 'slab') { const c = w / 6; for (let x = x0 + c; x < x0 + w; x += c) o += `<rect x="${x}" y="${y0}" width="1" height="${h}" fill="${line}"/>`; for (let y = y0 + c * 0.8; y < y0 + h; y += c * 0.8) o += `<rect x="${x0}" y="${y}" width="${w}" height="1" fill="${line}"/>`; }
  else if (pat === 'check') { const c = Math.max(26, Math.min(44, w / 18)); for (let r = 0, y = y0; y < y0 + h; y += c, r++) for (let k = 0, x = x0; x < x0 + w; x += c, k++) if ((r + k) % 2 === 0) o += `<rect x="${x}" y="${y}" width="${Math.min(c, x0 + w - x)}" height="${Math.min(c, y0 + h - y)}" fill="${line}"/>`; }
  else if (pat === 'carpet') o += `<rect x="${x0 + 14}" y="${y0 + 14}" width="${w - 28}" height="${h - 28}" fill="none" stroke="${line}" stroke-width="3"/><rect x="${x0 + 22}" y="${y0 + 22}" width="${w - 44}" height="${h - 44}" fill="none" stroke="${line}"/>`;
  else if (pat === 'marble') { const c = Math.max(50, Math.min(110, w / 8)); for (let x = x0; x < x0 + w; x += c) o += `<rect x="${x}" y="${y0}" width="1" height="${h}" fill="${line}"/>`; for (let y = y0; y < y0 + h; y += c) o += `<rect x="${x0}" y="${y}" width="${w}" height="1" fill="${line}"/>`; for (let k = 0; k < 9; k++) { const sx = x0 + (k * 173) % w, sy = y0 + (k * 61) % h; o += `<polyline points="${sx},${sy} ${sx + 18},${sy + 10} ${sx + 30},${sy + 6} ${sx + 46},${sy + 20}" fill="none" stroke="${liteHex(base, 0.25)}"/>`; } }
  else if (pat === 'grass') { let d = ''; for (let k = 0; k < 260; k++) { const gx = x0 + (k * 37.7) % w, gy = y0 + 4 + (k * 53.3) % Math.max(1, h - 8); d += `M${gx.toFixed(1)} ${gy.toFixed(1)}l${k % 2 ? -1.5 : 1.5} -6`; } o += `<path d="${d}" stroke="${line}" stroke-width="1.4"/>`; }
  else if (pat === 'herring') { const bw = Math.max(18, Math.min(34, w / 22)); let d = ''; for (let r = 0, y = y0; y < y0 + h + bw; y += bw * 0.9, r++) for (let k = 0, x = x0 - bw; x < x0 + w + bw; x += bw, k++) { const up = (k + r) % 2 === 0; d += `M${x.toFixed(1)} ${(y + (up ? bw : 0)).toFixed(1)}L${(x + bw).toFixed(1)} ${(y + (up ? 0 : bw)).toFixed(1)}`; } o += `<path d="${d}" stroke="${line}" stroke-width="2"/>`; }
  else if (pat === 'tatami') { const cw = w / 5, ch = h / 3; for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) { o += `<rect x="${x0 + k * cw}" y="${y0 + r * ch}" width="${cw}" height="${ch}" fill="none" stroke="${line}" stroke-width="2"/>`; if ((r + k) % 2 === 0) o += `<line x1="${x0 + k * cw + cw / 2}" y1="${y0 + r * ch}" x2="${x0 + k * cw + cw / 2}" y2="${y0 + r * ch + ch}" stroke="${line}"/>`; } }
  return `<g clip-path="url(#rfClip)">${o}</g>`; }
function roomSvg(slots, wall, floorId, editable, W) { const light = isLight(), tall = !(S.mobile || W > 560), H = Math.round(tall ? Math.max(320, Math.min(600, W * 1.15)) : Math.max(240, Math.min(360, W * 0.46)));
  const wallH = H * 0.23, dark = light ? '#dbe5e4' : '#141e1d', wcol = rcol(rdItem(wall).color || '39424a'), wallC = light ? liteHex(wcol, 0.32) : mixHex(dark, wcol, 0.6), rad = H > W * 0.9 ? Math.max(20, Math.min(30, W * 0.075)) : Math.max(20, Math.min(30, W * 0.037));
  let s = `<svg class="roomsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto"><defs><clipPath id="rfClip"><rect x="0" y="${wallH}" width="${W}" height="${H - wallH}"/></clipPath></defs><rect width="${W}" height="${H}" fill="${dark}"/><rect width="${W}" height="${wallH}" fill="${wallC}"/>${roomWallArt(W, wallH, wall, wallC)}`;
  s += roomFloorArt(0, wallH, W, H - wallH, floorId || 'f_concrete') + `<rect x="0" y="${wallH}" width="${W}" height="${H - wallH}" fill="${light ? 'rgba(255,255,255,.28)' : 'rgba(20,30,29,.30)'}"/><rect x="0" y="${wallH - 3}" width="${W}" height="3" fill="${darkHex(wallC, 0.35)}"/>`;
  for (let k = 0; k < 6; k++) s += `<rect x="0" y="${wallH + k * 2}" width="${W}" height="2" fill="rgba(0,0,0,${(0.10 - k * 0.015).toFixed(3)})"/>`;
  s += `<rect x="${W * 0.4}" y="${H * 0.02}" width="${W * 0.2}" height="${H * 0.065}" fill="${light ? '#cfe0ee' : '#1f3a52'}" stroke="#3b5f7e" stroke-width="2"/><rect x="${W * 0.5 - 1}" y="${H * 0.02}" width="2" height="${H * 0.065}" fill="#3b5f7e"/>`;
  const names = [], pts = [], fs = S.mobile ? 11 : 12;
  for (let i = 0; i < RD.SLOTS; i++) { const id = String(slots[i] || ''), x = RD.SPOTS[i][0] * W, y = RD.SPOTS[i][1] * H;
    if (!id) { if (!editable) continue; s += `<g class="rspot" data-rslot="${i}"><circle cx="${x}" cy="${y}" r="${rad * 0.8}" fill="rgba(0,0,0,.001)" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-dasharray="4 4"/><path d="M${x - 6} ${y}h12M${x} ${y - 6}v12" stroke="rgba(255,255,255,.6)" stroke-width="2"/></g>`; continue; }
    const cc = rcol(RD.CAT_COLORS[rdItem(id).cat] || 'b1bdbb'), sz = rad * 1.15;
    s += `<g class="rspot" data-rslot="${i}" data-rid="${esc(id)}"><rect x="${x - rad}" y="${y - rad}" width="${rad * 2}" height="${rad * 2}" rx="${rad * 0.4}" fill="${light ? '#f4f7f6' : '#1b2326'}" stroke="${cc}" stroke-width="2"/><svg x="${x - sz / 2}" y="${y - sz / 2}" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${cc}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${RD.ICONS[id] || RD.ICONS.table_crate}</svg></g>`;
    names.push(String(rdItem(id).name || '')); pts.push([x, y]); }
  const sizes = names.map((t) => [textW(t, fs, true) + 12, lineH(fs) + 2]), door = [W * 0.83 - 4, H - 12 - 22, W * 0.09 + 8, 34];
  const avoid = [door]; if (editable) for (let i = 0; i < RD.SLOTS; i++) if (!slots[i]) avoid.push([RD.SPOTS[i][0] * W - rad, RD.SPOTS[i][1] * H - rad, rad * 2, rad * 2]);
  const rects = mlLayout(pts, sizes, [W, H], rad + 1, avoid);
  rects.forEach((r, k) => { s += `<g pointer-events="none"><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="6" fill="${light ? 'rgba(255,255,255,.88)' : 'rgba(16,21,24,.86)'}"/><text x="${r[0] + 6}" y="${r[1] + 1 + fs * 0.95}" font-size="${fs}" font-weight="700" fill="var(--text)">${esc(names[k])}</text></g>`; });
  return s + '</svg>'; }
function roomPage() { const mine = !ROOM.host, r = roomEnsure(), wide = !S.mobile && $('center') && $('center').clientWidth >= 600; let h = '';
  if (mine) { const placed = r.slots.filter(Boolean).length, acts0 = Number(r.act_day ?? -1) === roomDay() ? Number(r.acts || 0) : 0;
    h += S.mobile ? headT('내 방', '가구를 놓고 눌러 보세요 · 아래 버튼으로 친구 방에 놀러 갈 수 있습니다') : `<p class="crumb">가구 ${placed} / ${r.slots.length}칸 · 오늘 가구 효과 ${acts0} / ${RD.DAILY_ACT_BONUS}</p><div class="pagehead"><h2>내 방</h2><button class="btn" id="rmDeco">방 꾸미기</button><button class="btn" data-go="room_shop">룸 상점</button><button class="btn" id="rmFriends" ${(SOC.friends || []).length ? '' : 'disabled'}>친구 방 방문</button></div>`; }
  else h += headT(`${ROOM.hostName}의 방`, "가구를 누르면 상호작용, '함께 쉬기'로 회복");
  if (!mine && !ROOM.hostLoaded) return h + noteBox('방을 불러오는 중입니다…');
  const here = ROOM.people.filter(isDict).map((x) => String(x.name || '생존자') + (String(x.charId || '') === (mine ? myCid() : ROOM.host) ? ' (주인)' : '')); if (LIVE.on && here.length) h += noteBox('지금 방에 있는 사람 · ' + here.join(', '));
  const slots = mine ? r.slots : ROOM.hostRoom.slots || [], wall = mine ? String(r.wall) : String(ROOM.hostRoom.wall || 'w_basic'), fl = mine ? String(r.floor || 'f_concrete') : String(ROOM.hostRoom.floor || 'f_concrete');
  const cw = ($('center')?.clientWidth || 760) - 8, W = Math.round(mine && !ROOM.decorating && wide ? Math.max(300, Math.min(540, cw - 316)) : Math.max(280, Math.min(760, cw)));
  const canvas = `<div class="rframe" style="border-color:${liteHex(rcol(rdItem(wall).color || '39424a'), 0.25)}">${roomSvg(slots, wall, fl, mine && ROOM.decorating, W)}</div>`;
  const legend = `<div class="rleg">${Object.keys(RD.CAT_COLORS).map((c) => `<span><i style="background:#${RD.CAT_COLORS[c]}"></i>${esc(c)}</span>`).join('')}</div>`;
  if (mine && ROOM.decorating) { h += canvas + noteBox('꾸미는 중 · 점선 원(빈 자리)이나 놓인 가구를 눌러 바꿉니다. 벽지와 바닥은 아래에서 고릅니다.') + choiceRow('', '꾸미기 끝내기', '빈 자리를 눌러 가구를 놓고, 놓인 가구를 눌러 바꾸거나 치웁니다.', 'var(--accent)', true, 'id="rmDecoEnd"');
    for (const [lab, key] of [['벽지', 'wall'], ['바닥', 'floor']]) { h += groupLab(lab + ' · 룸 상점에서 더 살 수 있습니다') + '<div class="pills" style="margin-bottom:10px">' + Object.keys(RD.FURNITURE).filter((id) => rdItem(id).cat === lab && id in r.owned).map((id) => `<button class="pill ${String(r[key]) === id ? 'on' : ''}" data-rwf="${key}" data-rid="${esc(id)}">${String(r[key]) === id ? '● ' : ''}${esc(rdItem(id).name)}</button>`).join('') + '</div>'; }
    return h; }
  const acts = Number(r.act_day ?? -1) === roomDay() ? Number(r.acts || 0) : 0, feed = `<div class="panel rfeed"><b>방 이야기 · 오늘 가구 상호작용 보너스 ${acts}/${RD.DAILY_ACT_BONUS}</b><div id="roomFeed" class="rfbox">${ROOM.feed.length ? ROOM.feed.slice(-30).map((x) => `<p class="rline${x.small ? ' sm' : ''}" style="${x.color ? 'color:' + x.color : ''}">${esc(x.text)}</p>`).join('') : '<p class="subtle rline sm">가구를 누르거나 쉬면 이곳에 이야기가 이어집니다.</p>'}</div></div>`;
  if (mine) { const wait = Number(S.P.rest_ready || 0) - Number(S.P.play_secs || 0), rb = `<button class="btn restbig" id="rmRest" ${wait > 0 ? 'disabled' : ''}>${wait <= 0 ? `방에서 쉬기 · 체력 +${restHeal()} · 사기 +15` : `아직 쉴 수 없다 · 약 ${wait}초 뒤 가능`}</button>`;
    const arow = `<div class="pills"><button class="btn" style="color:var(--blue)" id="rmDeco2">방 꾸미기</button><button class="btn" style="color:var(--warning)" data-go="room_shop">룸 상점 · 가구 ${roomOwnedFurniture(r).length}개</button><button class="btn" style="color:#69c5a7" id="rmFriends2" ${(SOC.friends || []).length ? '' : 'disabled'}>친구 방 방문 · ${(SOC.friends || []).length}명</button></div>`;
    if (wide) h += `<div class="rwrap"><div class="panel rcard">${canvas}${legend}</div><div class="rside"><div class="panel petinfo"><b style="font-size:15px">가구를 눌러 보세요</b><p class="muted" style="font-size:13px">놓인 가구를 누르면 장면이 한 줄씩 올라오고, 가끔 체력 회복이나 좋은 상태가 붙습니다.</p></div>${feed}${rb}</div></div>`;
    else h += canvas + feed + arow + rb; }
  else { const st = roomRestState(), wait = Math.max(0, Number(st.last) + RD.REST_GAP - nowSec()), left = RD.DAILY_REST - Number(st.count); let desc = `휴식의 1.5배 회복 · 부정 상태 1개 치료 · 오늘 ${st.count}/${RD.DAILY_REST}회`;
    if (left <= 0) desc = '오늘은 더 쉴 수 없습니다 · 한국시간 오전 6시에 초기화'; else if (wait > 0) desc = `다음 휴식까지 ${durationText(wait)} · 오늘 ${st.count}/${RD.DAILY_REST}회`; if (hostPresent()) desc += ` · ${ROOM.hostName} 님과 함께 쉬면 특별한 장면`;
    h += canvas + feed + `<button class="btn restbig" id="rmRestF" ${left > 0 && wait <= 0 ? '' : 'disabled'}>${esc((hostPresent() ? '함께 쉬기' : '친구 방에서 쉬기') + ' · ' + desc)}</button>` + choiceRow('', '내 방으로', '친구 방에서 나옵니다.', 'var(--muted)', true, 'id="rmBack"'); }
  return h; }
function roomFriendPicker() { const fr = SOC.friends || []; if (!fr.length) { modal('친구 방 방문', '<p class="muted">친구가 없습니다. 접속자 정보에서 친구를 추가해 보세요.</p>'); return; }
  modal('친구 방 방문', `<div class="rpick">${fr.map((f, i) => `<button class="btn" style="color:${f.online ? 'var(--accent)' : 'var(--blue)'}" data-rfv="${i}">${esc(gmName(f))}${f.rel ? ' · ' + esc(RD.REL_NAMES[f.rel] || '') : ''}${f.online ? ' · 접속 중' : ''}</button>`).join('')}</div>`, [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-rfv]').forEach((b) => { b.onclick = () => { $('modalRoot').innerHTML = ''; roomVisit(fr[Number(b.dataset.rfv)]); }; }); }
function bindRoom() { const c = $('center'), on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  const deco = () => { ROOM.decorating = !ROOM.decorating; if (!ROOM.decorating) roomPublish(); redrawKeep(); }; on('rmDeco', deco); on('rmDeco2', deco); on('rmDecoEnd', deco); on('rmFriends', roomFriendPicker); on('rmFriends2', roomFriendPicker);
  on('rmRest', () => act(() => roomRestMine(), roomAfter)); on('rmRestF', () => act(() => roomRestFriend(), roomAfter)); on('rmBack', () => { roomLeave(); roomOpenMine(); });
  c.querySelectorAll('[data-rwf]').forEach((b) => { b.onclick = () => act(() => { roomEnsure()[b.dataset.rwf] = b.dataset.rid; questEvent('room_deco'); toast(`${b.dataset.rwf === 'wall' ? '벽지' : '바닥'}을(를) '${rdItem(b.dataset.rid).name}'(으)로 바꿨습니다.`); return true; }, roomPublish); });
  c.querySelectorAll('.rspot').forEach((g) => { g.style.cursor = 'pointer'; g.onclick = () => { const i = Number(g.dataset.rslot), id = g.dataset.rid || ''; if (!ROOM.host && ROOM.decorating) roomPickSlot(i); else if (id) act(() => roomInteract(id), roomAfter); }; }); }
function roomShopPage() { const r = roomEnsure(), p = S.P; let h = headT('룸 상점', `소지금 ${won(p.money)} · 코인 ${Number(p.coins || 0)} · 코인 가격은 돈 가격의 1/${RD.COIN_RATE}`);
  h += noteBox("돈과 코인 중 편한 쪽으로 삽니다. 탐사에서 돈은 코인보다 약 40배 많이 모이므로, 코인으로 사면 같은 시간 대비 약 20% 저렴합니다. 산 가구는 '방 꾸미기'에서 놓습니다.");
  h += `<div class="pills" style="margin-bottom:10px">${['전체', ...RD.CATS].map((c) => `<button class="pill ${ROOM.shopCat === c ? 'on' : ''}" data-rsc="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  const ids = Object.keys(RD.FURNITURE).sort((a, b) => (rCatOrder(a) < rCatOrder(b) ? -1 : rCatOrder(a) > rCatOrder(b) ? 1 : 0));
  for (const id of ids) { const it = RD.FURNITURE[id]; if (Number(it.price || 0) <= 0) continue; if (ROOM.shopCat !== '전체' && it.cat !== ROOM.shopCat) continue; const owned = id in r.owned, price = Number(it.price), coin = rdCoin(price), n = (it.acts || []).length;
    const pic = ['벽지', '바닥'].includes(it.cat) ? `<span class="rsw" style="background:${rcol(it.color)};border-color:${liteHex(rcol(it.line || it.color), 0.3)};border-radius:${it.cat === '바닥' ? 24 : 8}px"></span>` : `<span class="rsw ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#${RD.CAT_COLORS[it.cat] || 'b1bdbb'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${RD.ICONS[id] || RD.ICONS.table_crate}</svg></span>`;
    h += `<div class="rsrow">${pic}<div class="panel rsinfo"><b>${esc(it.name)}</b><span class="muted">${esc(it.cat)}${n ? ` · 상호작용 ${n}가지` : ' · 방 분위기'}</span></div><div class="rsbtn">${owned ? '<button class="btn" disabled>보유 중</button>' : `<button class="btn" style="color:var(--warning)" data-rbuy="${esc(id)}" data-cur="money" ${Number(p.money) < price ? 'disabled' : ''}>${won(price)}</button><button class="btn" style="color:#dba747" data-rbuy="${esc(id)}" data-cur="coins" ${Number(p.coins || 0) < coin ? 'disabled' : ''}>코인 ${coin}</button>`}</div></div>`; }
  return h + choiceRow('', '내 방으로', '', 'var(--muted)', true, 'data-go="room"'); }
function bindRoomShop() { const c = $('center'); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); c.querySelectorAll('[data-rsc]').forEach((b) => { b.onclick = () => { ROOM.shopCat = b.dataset.rsc; redrawKeep(); }; });
  c.querySelectorAll('[data-rbuy]').forEach((b) => { b.onclick = () => act(() => roomBuy(b.dataset.rbuy, b.dataset.cur)); }); }

/* ════════ 함께(서버) — main._v10_social_start · _social_call · 제안 팝업(proposal_popup.gd) · 친구 · 요청함 · 교환 · 생존자 정보 ════════ */
const SOC = { friends: [], friendRequests: [], relRequests: [], entries: [], trades: [], gifts: [], broadcasts: [], notices: [], pendingNotices: [], party: {}, trips: [], partyList: [], partyListLoading: false,
  busy: false, giftSeenAt: {}, giftDone: {}, giftPendingSeen: {}, giftClaimNext: {}, giftFailNoted: {}, giftClaimBusy: false, relRounds: {}, relLive: {}, tripAutoDone: {}, tripAutoFails: {}, tripReadyMap: {}, tripReadySent: {}, tripReadyWatch: '',
  started: false, peer: null, tradeTarget: {}, friendTab: 'list', friendSel: '', chat: { party: [], notice: [], dm: [] }, latestNotice: '', adminGiftQueue: {}, adminGiftClaiming: {}, cmdQueue: {}, cmdClaiming: {}, cmdRetryAt: {}, relBack: {}, relBackAt: -1e9 };
const unsubK = (key) => { try { bridge()?.unsubscribe(key); } catch (_) {} };
const gmName = (u) => { const n = String(u?.nickname ?? '생존자'), gm = !!u?.isGM || !!u?.info?.isGM || (String(u?.uid ?? '') === String(S.acct?.uid ?? '') && S.admin); return (gm && !n.startsWith('GM · ') ? 'GM · ' : '') + n; };
const relName = (rel) => RD.REL_NAMES[rel] || '';
const myUid = () => String(S.acct?.uid ?? '');
/* 서버 요청 전에 지금 기록을 먼저 저장하고(socialRevision 규칙) 접속 정보를 올린 뒤 요청합니다 */
async function socialCall(method, args, done, failed) {
  const busyFail = (code, msg) => { const r = { ok: false, code, error: `[${code}] ${msg}` }; if (failed) failed(r); else toast(msg); };
  if (!LIVE.on) { busyFail('not-signed-in', '로그인이 필요합니다.'); return; }
  if (SOC.busy || LIVE.saving) { busyFail('request-in-progress', '앞선 요청을 처리하는 중입니다.'); return; }
  SOC.busy = true; LIVE.saving = true; let ans = null;
  try {
    let res = null; for (let a = 0; a < 3; a++) { res = await call('saveGame', JSON.stringify({ player: S.P, log: S.log || [] })); if (res && isDict(res.player)) { S.P = res.player; if (Array.isArray(res.log)) S.log = res.log; } if (!(res && res.conflict)) break; }
    if (res && res.sessionLost) { SOC.busy = false; LIVE.saving = false; onSessionLost(); return; }
    if (!res || !res.ok) { SOC.busy = false; LIVE.saving = false; if (failed) failed(res || {}); else modal('기록 동기화 실패', `<p>${esc((res && res.error) || '다시 요청해 주세요.')}</p>`); rerender(); return; }
    const pres = await call('presenceBeat', JSON.stringify({ avatar: Number(S.P.avatar || 0), info: publicInfo(), photo: String(S.P.photo || '') }));
    if (!pres.ok) { SOC.busy = false; LIVE.saving = false; if (failed) failed(pres); else modal('위치 동기화 실패', `<p>${esc(pres.error || '서버 연결을 확인해 주세요.')}</p>`); return; }
    ans = await call(method, ...args);
  } finally { SOC.busy = false; LIVE.saving = false; }
  if (isDict(ans.player)) S.P = ans.player;
  if (!ans.ok) { if (failed) failed(ans); else modal('요청 실패', `<p>${esc(ans.error || '처리할 수 없습니다.')}</p>`); rerender(); return; }
  if (done) done(ans); LIFE.dirty = true; LIFE.lastSave = 0; rerender(); presenceBeat(true); }
/* 제안 팝업 — 화면 오른쪽 위에 하나씩, 시간이 정해진 제안은 줄어들다 저절로 닫힘 */
const PROP = { queue: [], seen: {}, cur: null };
function propShow(key, title, body, buttons, seconds = 0, onTimeout = null) { if (!key || PROP.seen[key]) return; PROP.seen[key] = true; PROP.queue.push({ key, title, body, buttons, until: seconds > 0 ? nowSec() + seconds : 0, onTimeout }); if (!PROP.cur) propNext(); }
function propDrop(key) { PROP.queue = PROP.queue.filter((x) => x.key !== key); if (PROP.cur && PROP.cur.key === key) { propClose(); propNext(); } }
const propHas = (key) => !!PROP.seen[key];
function propClose() { PROP.cur = null; const el = $('propCard'); if (el) el.remove(); }
function propNext() { if (PROP.cur || !PROP.queue.length) return; const e = PROP.queue.shift(); PROP.cur = e; sfx('notify'); let el = $('propCard'); if (!el) { el = document.createElement('div'); el.id = 'propCard'; el.className = 'propcard'; document.body.appendChild(el); }
  el.innerHTML = `<b>${esc(e.title)}</b><p>${esc(e.body)}</p>${e.until ? '<small id="propClock"></small>' : ''}<div class="pbtns">${e.buttons.map(([t, c], i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-pb="${i}" ${i === 0 && c ? `style="background:${c};border-color:${c}"` : ''}>${esc(t)}</button>`).join('')}</div>`;
  el.querySelectorAll('[data-pb]').forEach((b) => { b.onclick = () => { const fn = e.buttons[Number(b.dataset.pb)][2]; propClose(); try { if (fn) fn(); } finally { propNext(); } }; }); propClockTick(); }
function propClockTick() { const e = PROP.cur; if (!e || !e.until) return; const left = e.until - nowSec(), el = $('propClock'); if (left <= 0) { propClose(); try { if (e.onTimeout) e.onTimeout(); } finally { propNext(); } return; } if (el) el.textContent = `${left}초 안에 답하지 않으면 자동으로 닫힙니다`; }
setInterval(propClockTick, 500);
/* 로그인 뒤 한 번 — 친구 · 방 장면 · 요청함 · 교환 · 공지 · 전체 지급 · 관리자 명령 · 파티 · 쪽지 · 결투 · 토벌 · 낚시 대회 */
function socialStart() { if (!LIVE.on || SOC.started) return; SOC.started = true; fishSubscribe(); coopSub();
  sub('watchFriends', [], (r) => { if (!r.ok) return; SOC.friends = Array.isArray(r.friends) ? r.friends : []; SOC.friendRequests = Array.isArray(r.requests) ? r.requests : []; SOC.relRequests = Array.isArray(r.relRequests) ? r.relRequests : []; friendAlerts(); proposalAlerts(); if (S.mode === 'friends') redrawKeep(); });
  sub('watchRoomEvents', [], (r) => { if (r.ok) roomOnEvents(r.events || []); });
  sub('watchSocial', [], (r) => { if (r.ok) { SOC.entries = Array.isArray(r.entries) ? r.entries : []; ingestSocial(); } });
  sub('watchTrades', [], (r) => { if (r.ok) SOC.trades = Array.isArray(r.trades) ? r.trades : []; });
  sub('watchGifts', [], (r) => { if (r.ok) { SOC.gifts = Array.isArray(r.offers) ? r.offers : []; handleGifts(); } if (['trades', 'requests'].includes(S.mode)) redrawKeep(); });
  sub('watchNotice', [], (r) => { if (!r.ok) return; SOC.notices = Array.isArray(r.notices) ? r.notices : []; const joined = Number(S.acct?.createdAt || 0) * 1000, now = Date.now(); SOC.pendingNotices = SOC.notices.filter((n) => { const at = Number(n.at || 0); return at > 0 && now - at <= 3 * 86400000 && !(joined > 0 && at < joined); }); showPendingNotice(); });
  sub('watchBroadcasts', [], (r) => { if (r.ok) { SOC.broadcasts = Array.isArray(r.broadcasts) ? r.broadcasts : []; ingestSocial(); if (S.mode === 'requests') redrawKeep(); } });
  sub('subscribe', ['notice'], (r) => { if (!r.ok || r.channel && r.channel !== 'notice') return; const msgs = Array.isArray(r.messages) ? r.messages : [], before = SOC.chat.notice.length; SOC.chat.notice = msgs; const last = msgs.length ? String(msgs[msgs.length - 1].text || '') : ''; const ch = SOC.latestNotice !== last; SOC.latestNotice = last; if (ch && before > 0 && last) toast('새 공지: ' + last); if (S.chatTab === 'notice') drawChat(); });
  sub('watchAdminActions', [], (r) => { const a = String(r.action || ''); if (!a) return; if (S.P && !$('app').hidden) adminApplyAction(a, String(r.by || '관리자')); call('clearAdminAction'); });
  sub('watchAdminGifts', [], (r) => { for (const g of Array.isArray(r.gifts) ? r.gifts : []) { if (!isDict(g)) continue; const id = String(g.id || ''); if (!id || SOC.adminGiftClaiming[id]) continue; SOC.adminGiftQueue[id] = g; } processAdminGifts(); });
  sub('watchControls', [], (r) => { for (const c of Array.isArray(r.commands) ? r.commands : []) if (isDict(c) && !SOC.cmdClaiming[String(c.id)]) SOC.cmdQueue[String(c.id)] = c; processCommands(); });
  call('myParty').then((r) => { if (r && r.ok) setOnlineParty(r.party || null); });
  dmStart(); duelsSubscribe(); }
/* 10초마다(main._feature_tick 중 함께 부분) */
function socialTick() { if (!LIVE.on || !S.P) return; ingestSocial(); showPendingNotice(); partyTripAuto(); adoptPartyTrips(); processAdminGifts(); processCommands(); coopSosAutoCancel(); }
function friendAlerts() { const p = S.P; if (!p) return; if (!isDict(p.friend_states)) p.friend_states = {};
  for (const f of SOC.friends) { const uid = String(f.uid || ''), dead = !!f.info?.dead, prev = p.friend_states[uid] || {};
    if (dead && !prev.dead) alertPopup(`friend-death-${uid}-${Number(prev.generation || 0)}`, '친구가 사망했습니다', String(f.nickname || '친구') + ' · 같은 대지역의 생존자는 부활을 시도할 수 있습니다.', 'friend');
    p.friend_states[uid] = { dead, generation: Number(prev.generation || 0) + (prev.dead && !dead ? 1 : 0) }; } }
function proposalAlerts() { const live = {}; for (const q of SOC.relRequests) live[String(q.from || '')] = true; for (const k of Object.keys(SOC.relLive)) if (!live[k]) SOC.relRounds[k] = Number(SOC.relRounds[k] || 0) + 1; SOC.relLive = live; if (!S.P) return;
  for (const q of SOC.friendRequests) { const rid = String(q.id || ''); propShow(`friend:${rid}:${Number(q.createdAt || 0)}`, '친구 추가 요청', `${q.actorName || q.fromName || '생존자'}님이 친구가 되고 싶어 합니다.`, [['수락', 'var(--accent)', () => friendRespond(rid, true)], ['거절', '', () => friendRespond(rid, false)]]); }
  for (const q of SOC.relRequests) { const from = String(q.from || ''), rn = RD.REL_NAMES[q.rel] || '친구'; propShow(`rel:${from}:${q.rel}:${Number(SOC.relRounds[from] || 0)}`, '관계 지정 요청', `${q.name || '생존자'}님이 서로의 관계를 '${rn}'(으)로 정하자고 합니다.`, [['수락', 'var(--accent)', () => relRespond(from, true)], ['거절', '', () => relRespond(from, false)]]); }
  for (const e of SOC.entries) if (e.kind === 'heal_request' && e.status === 'pending') propShow('heal:' + e.id, '치료 요청', `${e.actorName || '생존자'}님이 치료를 부탁했습니다. 가방의 치료품으로 도와줄 수 있습니다.`, [['요청함 열기', 'var(--accent)', () => go('requests')]]);
  const me = myUid();
  for (const t of SOC.trips) { if (t.status === 'pending' && !tripStale(t) && String(t.leader || '') !== me && (t.participants || []).includes(me) && !(t.readyMembers || []).includes(me) && !(t.declinedMembers || []).includes(me)) { const tid = String(t.id || '');
      propShow('trip:' + tid, '파티 함께 탐사 요청', `${partyNameOf(String(t.leader || ''))}님이 함께 탐사하자고 합니다.\n${GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, Number(t.regionId || 0)))].name} · ${Number(t.hours || 1)}시간 · 난이도 ${signed(Number(t.difficulty || 0))}\n수락한 사람끼리 출발합니다(같은 대지역에 있어야 함).`, [['동행 수락', 'var(--accent)', () => respondPartyTrip(tid, true)], ['거절', '', () => respondPartyTrip(tid, false)]]); }
    else propDrop('trip:' + String(t.id || '')); } }
const giftText = (o) => { const pt = []; if (Number(o.qty || 0) > 0) pt.push(`${o.item || ''} × ${Number(o.qty)}`); if (Number(o.money || 0) > 0) pt.push(won(Number(o.money))); if (Number(o.coins || 0) > 0) pt.push(`코인 ${Number(o.coins)}`); return pt.length ? pt.join(' · ') : '(빈 제안)'; };
const GIFT_WINDOW = Number(M.GIFT_WINDOW || 60);
function handleGifts() { if (!S.P) return; const me = myUid();
  for (const o of SOC.gifts) { const id = String(o.id || ''), st = String(o.status || ''); if (!(id in SOC.giftSeenAt)) SOC.giftSeenAt[id] = nowSec(); const age = nowSec() - SOC.giftSeenAt[id];
    if (st !== 'pending') { propDrop('gift:' + id); if (st === 'accepted' && String(o.from || '') === me && SOC.giftPendingSeen[id]) { delete SOC.giftPendingSeen[id]; alertPopup('gift-sent-ok-' + id, '교환 완료', `${o.toName || '생존자'}님이 교환을 수락했습니다.\n보낸 것 · ${giftText(o)}\n상대는 '가방 › 인벤토리'의 '받은 물품함'에서 물품을 꺼냅니다.`, 'social'); } continue; }
    if (String(o.from || '') === me) SOC.giftPendingSeen[id] = true;
    if (String(o.to || '') === me) { if (SOC.giftDone[id] || propHas('gift:' + id)) continue; if (age >= GIFT_WINDOW || S.P.dead) { SOC.giftDone[id] = true; giftRespond(id, false, true); continue; }
      propShow('gift:' + id, '아이템 교환 제안', `${o.fromName || '생존자'}님이 보내려 합니다.\n${giftText(o)}\n수락하면 물품은 받은 물품함(가방 › 인벤토리 맨 위 받은 물품함)으로, 금액·코인은 바로 들어옵니다.`, [['수락', 'var(--accent)', () => giftRespond(id, true, false)], ['거절', '', () => giftRespond(id, false, false)]], Math.max(1, GIFT_WINDOW - age), () => giftRespond(id, false, true)); }
    else if (String(o.from || '') === me && age >= GIFT_WINDOW && !SOC.giftDone[id]) { SOC.giftDone[id] = true; call('respondGift', id, 'cancel').then((r) => { if (r.ok) toast(`상대가 ${GIFT_WINDOW}초 안에 수락하지 않아 교환 제안이 취소됐습니다. 맡긴 물품·금액은 돌아옵니다.`); }); } } }
function giftRespond(id, accept, auto) { SOC.giftDone[id] = true; call('respondGift', id, accept).then((r) => { if (auto) return; if (!r.ok) { toast(r.error || '교환 처리 실패'); return; } toast(accept ? '교환을 수락했습니다. 곧 받은 물품·금액이 반영됩니다.' : '교환을 거절했습니다.'); }); }
function claimGiftEntries() { if (SOC.giftClaimBusy || SOC.busy) return;
  for (const e of SOC.entries) { if (e.kind !== 'gift') continue; const id = String(e.id || ''); if (nowSec() < Number(SOC.giftClaimNext[id] || 0)) continue; SOC.giftClaimNext[id] = nowSec() + 60; SOC.giftClaimBusy = true;
    socialCall('claimSocial', [id], (res) => { SOC.giftClaimBusy = false; const c = isDict(res.claimed) ? res.claimed : {}, back = c.side === 'return';
      const where = Number(c.qty || 0) > 0 ? "물품은 받은 물품함에 들어 있습니다. '가방 › 인벤토리' 맨 위의 '받은 물품함'을 누르면 가방으로 옮겨집니다." : '', cash = Number(c.money || 0) > 0 || Number(c.coins || 0) > 0 ? '금액 · 코인은 바로 소지금에 들어왔습니다.' : '';
      alertPopup('gift-got-' + id, back ? '교환 물품을 돌려받았습니다' : '교환 완료 · 물품 도착', `${giftText(c)}\n${[where, cash].filter(Boolean).join('\n')}`, 'social'); },
    (r) => { SOC.giftClaimBusy = false; if (!SOC.giftFailNoted[id]) { SOC.giftFailNoted[id] = true; alertPopup('gift-fail-' + id, '교환 물품을 받지 못했습니다', (r.error || '잠시 뒤 자동으로 다시 시도합니다.') + ' · 요청함을 정리하면 자동으로 다시 받습니다.', 'social'); } }); return; } }
function ingestSocial() { if (!S.P || $('app').hidden) return; claimGiftEntries(); proposalAlerts(); friendAlerts();
  for (const q of SOC.friendRequests) alertPopup('friend-request-' + q.id, '친구 추가 요청', `${q.actorName || q.fromName || '생존자'}의 요청을 친구 메뉴에서 확인하세요.`, 'friend');
  for (const e of SOC.entries) { if (e.kind === 'gift') continue; alertPopup('social-' + e.id, '새 요청', `${e.actorName || '생존자'} · ${entryTitle(e)}\n요청함에서 처리하세요.`, 'social', { entry: String(e.id || '') }); }
  for (const b of SOC.broadcasts) alertPopup('broadcast-' + b.id, '관리자 전체 지급', `${b.item || '물품'} × ${Math.trunc(Number(b.qty || 1))} · 가방 › 인벤토리 맨 위에서 받으세요.`, 'gift'); }
function showPendingNotice() { if (!SOC.pendingNotices.length || !S.P || $('app').hidden) return; const ns = S.P.notify_settings || (S.P.notify_settings = {}), key = 'll_notices_' + myUid();
  let seen = Array.isArray(ns.notice_seen_list) ? [...ns.notice_seen_list] : []; if (ns.notice_seen) seen.push(String(ns.notice_seen)); try { for (const x of JSON.parse(localStorage.getItem(key) || '[]')) if (!seen.includes(String(x))) seen.push(String(x)); } catch (_) {}
  let shown = false; for (const n of SOC.pendingNotices) { const nid = String(n.id || ''); if (!nid || seen.includes(nid) || (S.P.notify_seen || {})['notice-' + nid] != null) continue; seen.push(nid); alertPopup('notice-' + nid, '공지 · ' + (n.title || '공지'), String(n.body || ''), 'notice'); shown = true; }
  SOC.pendingNotices = []; if (shown) { seen = seen.slice(Math.max(0, seen.length - 40)); ns.notice_seen_list = seen; try { localStorage.setItem(key, JSON.stringify(seen)); } catch (_) {} LIFE.dirty = true; LIFE.lastSave = 0; drainPopups(); } }
const friendRequest = (uid) => socialCall('friendRequest', [uid], () => modal('친구 요청', '<p>상대의 친구 메뉴에 요청을 보냈습니다.</p>'));
const friendRespond = (id, ok) => socialCall('friendRespond', [id, ok]);
function relRespond(from, ok) { call('relRespond', from, ok).then((r) => { if (!r.ok) { toast(r.error || '처리하지 못했습니다.'); return; } toast(ok ? `관계가 '${RD.REL_NAMES[r.rel] || '친구'}'(으)로 정해졌습니다.` : '요청을 거절했습니다.'); }); }
function requestHeal(uid) { if (S.P.dead || Number(S.P.hp) > Number(S.P.max_hp) * 0.7) return; presenceBeat(true); socialCall('sendHealRequest', [uid], () => modal('회복 요청', '<p>요청을 보냈습니다. 같은 대지역의 상대가 치료품으로 응답하면 1.5배 효과를 받습니다.</p>')); }
const respondHeal = (id, item) => socialCall('respondHeal', [id, item]);
const tryPeerRevive = (uid) => socialCall('tryRevive', [uid], (r) => modal('부활 시도 결과', `<p>${r.success ? '성공했습니다. 상대가 요청함에서 부활 효과를 받습니다.' : '구조에 실패했습니다. 5분 뒤 다시 시도할 수 있습니다.'}</p>`));
const claimSocial = (id) => socialCall('claimSocial', [id], () => { claimStored(); toast('받았습니다 · 가방에 자리가 없으면 받은 물품함에 남습니다.'); });
const dismissSocial = (id) => socialCall('dismissSocial', [id]);
function claimBroadcast(id) { socialCall('claimBroadcast', [id], () => { if (!isDict(S.P.social_done)) S.P.social_done = {}; S.P.social_done['broadcast:' + id] = true; claimStored(); toast('관리자 지급품을 받았습니다.'); },
  (r) => { if (String(r.error || '').includes('이미 받았')) { if (!isDict(S.P.social_done)) S.P.social_done = {}; S.P.social_done['broadcast:' + id] = true; toast('이미 받은 지급입니다(계정당 한 번).'); act(() => true); } else toast(r.error || '받지 못했습니다.'); }); }
function entryTitle(e) { const p = isDict(e.payload) ? e.payload : {}; switch (e.kind) { case 'heal_request': return '치료 요청'; case 'aid': return p.effect === 'revive' ? '소생 시도' : '치료 도착'; case 'trade': return '교환 물품'; case 'trade_refund': return '교환 반환'; case 'broadcast': return '관리자 지급'; case 'notification': return p.type === 'friend_response' ? '친구 요청 결과' : '알림'; } return '알림'; }
function entryDesc(e) { const p = isDict(e.payload) ? e.payload : {}, n = (v) => Math.round(Number(v || 0));
  switch (e.kind) { case 'heal_request': return `체력 ${n(p.patientHp)} / ${n(p.patientMaxHp)} · 같은 대지역에서 치료품을 보내 줄 수 있습니다.`;
    case 'aid': if (p.effect === 'revive') return p.success ? '소생에 성공했습니다 · 체력 25%로 일어납니다.' : '소생 시도가 실패했습니다.'; return `${p.item || '치료품'} · 체력 +${n(p.amount)}`;
    case 'trade': case 'trade_refund': case 'broadcast': return `${p.item ?? e.item ?? '물품'} × ${n(p.qty ?? e.qty ?? 1)}`;
    case 'notification': if (p.type === 'friend_response') return p.accepted ? '친구 요청을 수락했습니다.' : '친구 요청을 거절했습니다.'; }
  return 'item' in p ? `${p.item} × ${n(p.qty ?? 1)}` : ''; }
function claimableItemsCount() { const p = S.P; let n = 0; for (const b of SOC.broadcasts) if (!(p.social_done || {})['broadcast:' + b.id]) n++; for (const e of SOC.entries) if (['broadcast', 'trade', 'trade_refund'].includes(e.kind)) n++; if (nonEmpty(p.stored_loot)) n++; return n; }
/* 친구 */
function friendsPage() { const reqN = SOC.friendRequests.length + SOC.relRequests.length; let h = headT('친구', '친구는 캐릭터끼리 맺습니다 · 다른 캐릭터로 접속하면 오프라인으로 보입니다');
  h += `<div class="pills" style="margin-bottom:12px"><button class="pill ${SOC.friendTab === 'list' ? 'on' : ''}" data-ftab="list">친구 ${SOC.friends.length}</button><button class="pill ${SOC.friendTab === 'req' ? 'on' : ''}" data-ftab="req">받은 요청 ${reqN}</button></div>`;
  if (!LIVE.on) return h + noteBox('로그인한 계정으로 들어오면 친구를 맺을 수 있습니다.');
  if (SOC.friendTab === 'req') { if (!reqN) h += noteBox('받은 요청이 없습니다.');
    for (const q of SOC.friendRequests) h += infoBox('친구 요청 · ' + (q.actorName || q.fromName || '생존자'), '상대 요청을 수락하면 서로 친구 목록에 표시됩니다.') + choiceRow('', '요청 수락', '', 'var(--accent)', true, `data-frr="${esc(q.id)}" data-ok="1"`) + choiceRow('', '요청 거절', '', 'var(--muted)', true, `data-frr="${esc(q.id)}" data-ok="0"`);
    for (const q of SOC.relRequests) { const rn = RD.REL_NAMES[q.rel] || '친구'; h += infoBox('관계 지정 요청 · ' + (q.name || '생존자'), `'${rn}'(으)로 지정하자고 합니다. 수락하면 서로의 관계가 '${rn}'(으)로 표시되고, 방에서 관계에 맞는 장면이 나옵니다.`) + choiceRow('', `'${rn}' 수락`, '', 'var(--accent)', true, `data-rlr="${esc(q.from)}" data-ok="1"`) + choiceRow('', '거절', '', 'var(--muted)', true, `data-rlr="${esc(q.from)}" data-ok="0"`); }
    return h; }
  if (!SOC.friends.length) return h + noteBox('오른쪽 접속자 목록에서 이름을 누른 뒤 친구 추가를 요청해 보세요.');
  const cidOf = (f) => String(f.charId ?? f.uid ?? ''); let sel = SOC.friends.find((f) => cidOf(f) === SOC.friendSel); if (!sel) { sel = SOC.friends[0]; SOC.friendSel = cidOf(sel); }
  h += '<div class="frwrap"><div class="frlist">' + SOC.friends.map((f) => { const info = f.info || {}, rel = String(f.rel || ''), on = cidOf(f) === SOC.friendSel, ac = info.dead ? 'var(--danger)' : 'var(--accent)';
    return `<button class="frcard${on ? ' on' : ''}" style="--a:${ac}" data-fsel="${esc(cidOf(f))}">${avatarHtml(f.avatar ?? info.avatar ?? 0, 44, f.photo || info.photo || '')}<span class="tx"><b>${esc(gmName(f))}</b><span>Lv.${Number(info.level || 1)} · ${info.dead ? '사망' : '생존'} · ${esc(peerLocation(info))}</span></span><em style="color:#${RD.REL_COLORS[rel] || 'b1bdbb'}">${esc(rel ? RD.REL_NAMES[rel] || '관계 미지정' : '관계 미지정')}</em></button>`; }).join('') + '</div>';
  const i2 = sel.info || {}; h += `<div class="panel frdet"><div class="hd">${avatarHtml(sel.avatar ?? i2.avatar ?? 0, 56, sel.photo || i2.photo || '')}<div><b>${esc(gmName(sel))}</b><span class="muted">${esc(peerLocation(i2))} · Lv.${Number(i2.level || 1)}</span></div></div><div class="g2"><button class="btn" id="frDm">쪽지 보내기</button><button class="btn" id="frRoom">방 방문</button><button class="btn" id="frRel">관계 정하기</button><button class="btn" style="color:var(--danger)" id="frCut">친구 끊기</button></div><p class="muted" style="font-size:12px;margin:0">관계는 가족 · 연인 · 친구 · 동료 · 지인 · 악연 · 라이벌 · 스승 · 제자 · 은인 중에서 내가 따로 정합니다. 상대에게 요청이 가지 않고, 상대가 정한 관계와 달라도 됩니다. 방과 장기 탐사 장면은 두 사람이 정한 관계에 맞춰 나옵니다.</p></div></div>`;
  return h; }
function bindFriends() { const c = $('center'), sel = () => SOC.friends.find((f) => String(f.charId ?? f.uid ?? '') === SOC.friendSel) || {}, on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  c.querySelectorAll('[data-ftab]').forEach((b) => { b.onclick = () => { SOC.friendTab = b.dataset.ftab; redrawKeep(); }; }); c.querySelectorAll('[data-fsel]').forEach((b) => { b.onclick = () => { SOC.friendSel = b.dataset.fsel; redrawKeep(); }; });
  c.querySelectorAll('[data-frr]').forEach((b) => { b.onclick = () => friendRespond(b.dataset.frr, b.dataset.ok === '1'); }); c.querySelectorAll('[data-rlr]').forEach((b) => { b.onclick = () => relRespond(b.dataset.rlr, b.dataset.ok === '1'); });
  on('frDm', () => openPeer(sel())); on('frRoom', () => roomVisit(sel())); on('frRel', () => relModal(sel())); on('frCut', () => unfriendModal(sel())); }
function unfriendModal(f) { const cid = String(f.charId ?? f.uid ?? ''); modal('친구 끊기', `<p style="white-space:pre-line;color:var(--text)">${esc(gmName(f))} 님을 친구에서 지웁니다.\n양쪽 친구 목록에서 함께 지워지고 관계도 해제됩니다. 상대에게 알림은 가지 않습니다.</p>`,
  [['친구 끊기', 'dangerfill', () => call('friendRemove', cid).then((r) => { if (r.ok) { SOC.friends = SOC.friends.filter((x) => String(x.charId ?? x.uid ?? '') !== cid); toast('친구를 끊었습니다.'); redrawKeep(); } else toast(r.error || '처리하지 못했습니다.'); })], ['취소', '', null]]); }
function relModal(f) { const cid = String(f.charId ?? f.uid ?? ''), cur = String(f.rel || '');
  modal(`${f.nickname || '친구'} 님과의 관계`, `<p class="muted" style="margin:0">내가 보는 관계를 고르면 바로 정해집니다. 상대는 상대대로 따로 정하고, 두 사람이 정한 관계에 맞춰 방의 인사 · 함께 쉬기 장면과 장기 탐사 파티 장면이 나옵니다.</p><p class="subtle" style="font-size:12px;margin:0">스승: 상대가 나를 가르치는 사이 · 제자: 내가 상대를 가르치는 사이 · 은인: 상대가 나를 살려 준 사이</p><div class="g2">${RD.REL_IDS.map((id) => `<button class="btn" style="color:#${RD.REL_COLORS[id]}" data-rel="${id}" ${cur === id ? 'disabled' : ''}>${cur === id ? '● ' : ''}${esc(RD.REL_NAMES[id])}</button>`).join('')}</div>${cur ? '<button class="btn" id="relClr">관계 해제</button>' : ''}`, [['닫기', '', null]]);
  const r = $('modalRoot'), setLocal = (rel) => { for (const x of SOC.friends) if (String(x.charId ?? x.uid ?? '') === cid) x.rel = rel; redrawKeep(); };
  r.querySelectorAll('[data-rel]').forEach((b) => { b.onclick = () => { r.innerHTML = ''; const rid = b.dataset.rel; call('relPropose', cid, rid).then((res) => { if (!res.ok) { toast(res.error || '정하지 못했습니다.'); return; } setLocal(rid); toast(`관계를 '${RD.REL_NAMES[rid]}'(으)로 정했습니다.`); }); }; });
  const clr = $('relClr'); if (clr) clr.onclick = () => { r.innerHTML = ''; call('relRemove', cid).then((res) => { if (res.ok) setLocal(''); toast(res.ok ? '관계를 해제했습니다.' : res.error || '실패'); }); }; }
/* 요청함 */
function requestsPage() { const me = myUid(); let nReq = 0; for (const o of SOC.gifts) if (o.status === 'pending' && String(o.from || '') !== me) nReq++; for (const d of DUEL.entries) if (d.status === 'pending') nReq++; for (const e of SOC.entries) if (!['gift', 'broadcast'].includes(e.kind)) nReq++;
  const claim = claimableItemsCount(); let h = headT('요청함', `받은 요청 ${nReq} · 받은 물품함 ${claim}`);
  for (const o of SOC.gifts) { if (o.status !== 'pending' || String(o.from || '') === me) continue; h += ROW('교환', 'var(--blue)', `${o.fromName || '생존자'}의 교환 제안`, giftText(o), [['보러 가기', 'data-go="trades"', true, 'var(--accent)'], ['거절', `data-gfno="${esc(o.id)}"`, false]]); }
  for (const d of DUEL.entries) { if (d.status !== 'pending') continue; const mine = String(d.from || '') === me; h += ROW('결투', 'var(--danger)', mine ? `${d.toName || '생존자'}에게 보낸 결투` : `${d.fromName || '생존자'}의 결투 신청`, '모의결투 · 수락 대기', [['열기', `data-duelopen="${esc(d.id)}"`, true, 'var(--accent)']]); }
  for (const e of SOC.entries) { if (['gift', 'broadcast'].includes(e.kind)) continue; const tag = { heal_request: '치료', aid: '치료', trade: '교환', trade_refund: '교환', broadcast: '관리자', notification: '알림' }[e.kind] || '알림', col = { 치료: 'var(--accent)', 교환: 'var(--blue)', 관리자: 'var(--warning)' }[tag] || 'var(--muted)', pl = isDict(e.payload) ? e.payload : {};
    const claimable = ['aid', 'trade', 'trade_refund', 'broadcast'].includes(e.kind) && !(e.kind === 'aid' && pl.effect === 'revive' && !pl.success), btns = [];
    if (claimable) btns.push(['받기', `data-scl="${esc(e.id)}"`, true, 'var(--accent)']); if (!['trade', 'trade_refund', 'broadcast'].includes(e.kind) || !claimable) btns.push([claimable ? '나중에' : '확인 · 닫기', `data-sdi="${esc(e.id)}"`, false]);
    h += ROW(tag, col, `${e.actorName || '생존자'} · ${entryTitle(e)}`, entryDesc(e), btns);
    if (e.kind === 'heal_request' && e.status === 'pending') { const meds = Object.keys(CB.HEAL_BASE || {}).filter((it) => count(it) > 0); for (const it in (D.update21_items.CONSUMABLES || {})) { const x = D.update21_items.CONSUMABLES[it]; if (x.cat === '회복' && Number(x.hp || 0) > 0 && count(it) > 0 && !meds.includes(it)) meds.push(it); }
      meds.sort(); for (const it of meds) h += choiceRow('', `${it}(으)로 치료`, '해당 치료품 1개 사용 · 상대 회복효과 1.5배', 'var(--accent)', true, `data-heal="${esc(e.id)}" data-item="${esc(it)}"`); } }
  if (!nReq) h += noteBox('받은 요청이 없습니다. 교환 · 치료 · 결투 요청이 오면 여기에 모입니다.');
  h += `<div class="panel rqbox"><b>받은 물품함</b><span class="muted">${claim > 0 ? '가방이 가득 차서 맡겨 둔 물품입니다. 칸을 비우고 받으세요.' : '맡겨 둔 물품이 없습니다.'}</span>${claim > 0 ? '<button class="btn" style="color:var(--accent)" data-go="inventory">받기</button>' : ''}</div>`;
  return h; }
function bindRequests() { const c = $('center'); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-gfno]').forEach((b) => { b.onclick = () => giftRespond(b.dataset.gfno, false, false); }); c.querySelectorAll('[data-duelopen]').forEach((b) => { b.onclick = () => duelOpen(b.dataset.duelopen); });
  c.querySelectorAll('[data-scl]').forEach((b) => { b.onclick = () => claimSocial(b.dataset.scl); }); c.querySelectorAll('[data-sdi]').forEach((b) => { b.onclick = () => dismissSocial(b.dataset.sdi); });
  c.querySelectorAll('[data-heal]').forEach((b) => { b.onclick = () => respondHeal(b.dataset.heal, b.dataset.item); }); }
/* 교환 */
function openTradeForm(peer) { SOC.tradeTarget = clone(peer); $('modalRoot').innerHTML = ''; go('trade_form'); }
function createGift(item, qty, money, coins) { const t = SOC.tradeTarget, uid = String(t.uid || ''); if (!uid || uid === myUid()) { toast('교환할 다른 생존자를 고르세요.'); return; } if (qty <= 0) item = '';
  if (qty + money + coins <= 0) { toast('보낼 물품이나 금액·코인을 정해 주세요.'); return; }
  if (qty > 0) { const res = Object.values(S.P.equipment || {}).includes(item) ? 1 : 0; if (qty > count(item) - res) { toast(`보낼 수 있는 ${item}은(는) ${Math.max(0, count(item) - res)}개입니다. 장착 중인 1개는 남겨 둡니다.`); return; } }
  if (money > Number(S.P.money)) { toast('소지금이 부족합니다.'); return; } if (coins > Number(S.P.coins || 0)) { toast('코인이 부족합니다.'); return; }
  socialCall('createGift', [uid, String(t.nickname || '생존자'), item, qty, money, coins], () => { go('trades'); toast(`교환 제안을 보냈습니다. 상대가 ${GIFT_WINDOW}초 안에 수락하면 전달됩니다.`); }); }
const TRF = { q: '', item: '', qty: 1 };
function tradeFormPage() { const t = SOC.tradeTarget, p = S.P; let h = headT('아이템 교환', '받는 사람 · ' + (t.nickname || '생존자'));
  const fr = SOC.friends.filter((f) => f.online); if (fr.length) { const opts = [...fr]; if (!opts.some((f) => String(f.uid) === String(t.uid))) opts.unshift(t); h += groupLab('받는 사람 · 접속 중인 친구') + `<select class="sel" id="trWho">${opts.map((f, i) => `<option value="${i}" ${String(f.uid) === String(t.uid) ? 'selected' : ''}>${esc(nonEmpty(f) ? gmName(f) : '(받는 사람 고르기)')}</option>`).join('')}</select>`; TRF.opts = opts; }
  h += noteBox(`가방에 있는 물품 1종과 금액 · 코인을 함께 보낼 수 있습니다. 보내는 순간 맡겨 두고, 상대가 ${GIFT_WINDOW}초 안에 수락하면 전달됩니다. 거절 · 시간 초과 · 상대가 쓰러져 있으면 자동으로 돌아옵니다. 지역이나 탐사 · 이동 중인지는 상관없습니다.`);
  const haves = {}; const own = Object.keys(p.inventory || {}).filter((n) => { const hv = count(n) - (Object.values(p.equipment || {}).includes(n) ? 1 : 0); if (hv > 0) haves[n] = hv; return hv > 0; }).sort((a, b) => (itemDisplay(a) < itemDisplay(b) ? -1 : itemDisplay(a) > itemDisplay(b) ? 1 : 0));
  const q = TRF.q.trim().toLowerCase().replace(/ /g, '').replace(/^\[|\]$/g, ''), list = own.filter((n) => !q || `${n} [${cat(n).tag || ''}] ${tabOf(n)} ${itemDisplay(n)} ${cat(n).grade}급`.toLowerCase().replace(/ /g, '').includes(q));
  if (!list.includes(TRF.item)) TRF.item = q ? list[0] || '' : TRF.item && own.includes(TRF.item) ? TRF.item : '';
  h += groupLab(`보낼 물품 검색 · 가방 ${own.length}종`) + `<input class="sel" id="trQ" placeholder="이름 · 태그 · 등급으로 검색 (예: 통조림, 음료, 의약, S급)" value="${esc(TRF.q)}">`;
  if (q) h += `<p class="muted" style="font-size:12px;margin:4px 0">${list.length ? `'${esc(TRF.q.trim())}' 검색 결과 ${list.length}종 · 맨 위 물품을 골라 두었습니다` : `'${esc(TRF.q.trim())}'에 맞는 물품이 없습니다.`}</p>`;
  h += groupLab('보낼 물품 (가방에 있는 것만)') + `<select class="sel" id="trItem">${q ? '' : '<option value="">(물품 없이 금액·코인만)</option>'}${list.map((n) => `<option value="${esc(n)}" ${n === TRF.item ? 'selected' : ''}>${esc(itemDisplay(n))} · ${haves[n]}개</option>`).join('')}${q && !list.length ? '<option value="">(맞는 물품 없음 · 금액·코인만)</option>' : ''}</select>`;
  const mx = Math.max(1, Math.min(99, haves[TRF.item] || 1)); TRF.qty = Math.max(1, Math.min(mx, TRF.qty));
  h += groupLab('물품 수량') + `<input class="sel" type="number" id="trQty" min="1" max="${mx}" value="${TRF.qty}">`;
  h += groupLab(`보낼 금액 (원) · 소지금 ${won(p.money)}`) + `<input class="sel" type="number" id="trMoney" min="0" max="${Math.max(0, Math.min(1000000, Number(p.money)))}" value="0">`;
  h += groupLab(`보낼 코인 · 보유 ${Number(p.coins || 0)}`) + `<input class="sel" type="number" id="trCoins" min="0" max="${Math.max(0, Math.min(100000, Number(p.coins || 0)))}" value="0">`;
  return h + choiceRow('', '교환 제안 보내기', '상대에게 팝업으로 바로 물어봅니다.', 'var(--accent)', true, 'id="trSend"'); }
function bindTradeForm() { const who = $('trWho'); if (who) who.onchange = () => { const f = TRF.opts[Number(who.value)]; if (nonEmpty(f)) { SOC.tradeTarget = clone(f); redrawKeep(); } };
  const q = $('trQ'); if (q) { q.onchange = () => { TRF.q = q.value; redrawKeep(); }; q.onkeydown = (e) => { if (e.key === 'Enter') { TRF.q = q.value; redrawKeep(); } }; }
  const it = $('trItem'); if (it) it.onchange = () => { TRF.item = it.value; redrawKeep(); }; const qt = $('trQty'); if (qt) qt.onchange = () => { TRF.qty = Number(qt.value) || 1; };
  const s = $('trSend'); if (s) s.onclick = () => { const item = $('trItem')?.value || '', n = Math.max(0, Math.trunc(Number($('trQty')?.value || 0))); createGift(item, item ? n : 0, Math.max(0, Math.trunc(Number($('trMoney')?.value || 0))), Math.max(0, Math.trunc(Number($('trCoins')?.value || 0)))); }; }
function tradesPage() { const me = myUid(); let h = headT('교환', '어느 지역에 있든 생존자와 물품·소지금을 주고받습니다');
  if (!SOC.friends.length) h += noteBox("친구가 없습니다. 접속자 목록에서 상대를 누른 뒤 '아이템 교환 제안'을 선택하세요.");
  else h += `<div class="trgrid">${SOC.friends.map((f, i) => `<div class="panel trcard">${avatarHtml(f.avatar || 0, 44, f.photo || '')}<div class="tx"><b>${esc(gmName(f))}</b><span class="muted">${f.online ? '접속 중' : '접속하지 않음'}</span></div><button class="btn ${f.online ? 'primary' : ''}" data-trf="${i}">교환 신청</button></div>`).join('')}</div>`;
  if (!SOC.friends.length) h += choiceRow('', '다른 생존자에게 보내기', "접속자 목록에서 상대를 누른 뒤 '아이템 교환 제안'을 선택하세요.", 'var(--blue)', true, 'data-go="chat"');
  const claim = claimableItemsCount(); h += `<div class="panel rqbox"><b>받은 물품함</b><span class="muted">${claim <= 0 ? '교환·치료로 받았지만 가방이 가득 차서 맡겨 둔 물품이 없습니다.' : `맡겨 둔 물품 ${claim}건 · 가방 › 인벤토리에서 받을 수 있습니다.`}</span></div>`;
  if (SOC.gifts.length) h += groupLab('교환 기록');
  for (const o of SOC.gifts) { const sent = String(o.from || '') === me, st = String(o.status || ''), stt = { pending: '수락 대기', accepted: '전달 완료', declined: '거절 · 돌려받음', cancelled: '취소 · 돌려받음' }[st] || st;
    h += infoBox(`${sent ? '보낸 교환 → ' : '받은 교환 ← '}${sent ? o.toName || '생존자' : o.fromName || '생존자'} · ${stt}`, giftText(o));
    if (st === 'pending') h += sent ? choiceRow('', '제안 취소', '맡긴 물품 · 금액 · 코인을 돌려받습니다.', 'var(--muted)', true, `data-gfc="${esc(o.id)}"`) : choiceRow('', '수락', '', 'var(--accent)', true, `data-gfy="${esc(o.id)}"`) + choiceRow('', '거절', '', 'var(--muted)', true, `data-gfno="${esc(o.id)}"`); }
  for (const t of SOC.trades) { if (t.status !== 'pending') continue; const of = isDict(t.offer) ? t.offer : {}; h += infoBox('이전 방식 교환 · 수락 대기', `${of.item || '물품'} × ${Number(of.qty || 1)}`);
    h += String(t.to || '') === me ? choiceRow('', '거절하고 정리', '보낸 사람에게 물품이 돌아갑니다.', 'var(--muted)', true, `data-trno="${esc(t.id)}"`) : choiceRow('', '제안 취소', '맡겨 둔 물품은 받은 물품함으로 돌아옵니다.', 'var(--muted)', true, `data-trc="${esc(t.id)}"`); }
  return h; }
function bindTrades() { const c = $('center'); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-trf]').forEach((b) => { b.onclick = () => openTradeForm(SOC.friends[Number(b.dataset.trf)]); });
  c.querySelectorAll('[data-gfc]').forEach((b) => { b.onclick = () => call('respondGift', b.dataset.gfc, 'cancel').then((r) => toast(r.ok ? '제안을 취소했습니다. 맡긴 것은 곧 돌아옵니다.' : r.error || '취소하지 못했습니다.')); });
  c.querySelectorAll('[data-gfy]').forEach((b) => { b.onclick = () => giftRespond(b.dataset.gfy, true, false); }); c.querySelectorAll('[data-gfno]').forEach((b) => { b.onclick = () => giftRespond(b.dataset.gfno, false, false); });
  c.querySelectorAll('[data-trno]').forEach((b) => { b.onclick = () => socialCall('respondTrade', [b.dataset.trno, false], () => toast('교환을 거절했습니다. 상대에게 물품 반환 요청이 전달됩니다.')); });
  c.querySelectorAll('[data-trc]').forEach((b) => { b.onclick = () => socialCall('cancelTrade', [b.dataset.trc], () => toast('제안을 취소했습니다. 맡긴 물품은 곧 받은 물품함(가방 › 인벤토리 맨 위)으로 돌아옵니다.')); }); }
/* 생존자 정보(접속자 목록에서 누르기) */
function peerLocation(info) { const gi = Number(info?.regionId ?? -1); if (info?.dead) return '쓰러짐'; return gi >= 0 && gi < GD.REGIONS.length ? `${WD.REALMS[GD.REGIONS[gi].realm].name} › ${GD.REGIONS[gi].name}` : String(info?.region || '위치 모름'); }
function friendOf(u) { const info = isDict(u.info) ? u.info : {}, cid = String(u.charId ?? info.charId ?? ''); if (cid) return SOC.friends.find((f) => String(f.charId || '') === cid) || {}; return SOC.friends.find((f) => String(f.uid || '') === String(u.uid || '') && u.uid) || {}; }
function openPeer(u) { if (!u) return; const peer = clone(u), uid = String(u.uid || ''), mine = uid === myUid(); SOC.peer = peer;
  if (mine) { peer.info = publicInfo(); peer.detail_loaded = true; }
  else if (!u.detail_loaded && LIVE.on && uid) { peer.detail_loaded = false; const want = String(u.charId ?? u.info?.charId ?? '');
    call('onlineDetail', uid, want).then((res) => { if (SOC.peer !== peer) return; const base = isDict(peer.info) ? peer.info : {}, det = isDict(res.info) ? res.info : {}; Object.assign(base, det); peer.info = base; peer.detail_loaded = true; peer.detail_missing = !nonEmpty(det); peer.offline_seen = res.offline ? Number(res.lastSeen || 0) : 0; peerModal(); }); }
  peerModal(); }
const PEER_ICONS = { dm: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5', duel: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2', friend: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a7 7 0 0 1 14 0v1M19 8v6M16 11h6', room: 'M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6', heal: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10zM12 9v6M9 12h6', revive: 'M13 2 4 14h7l-1 8 9-12h-7z', trade: 'M7 7h13l-3-3M17 17H4l3 3', admin: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' };
const peerTile = (key, title, desc, col, enabled, why = '') => `<button class="ptile" style="--c:${col}" data-ptile="${key}" ${enabled ? '' : 'disabled'}><span class="ic">${svg(PEER_ICONS[key] || PEER_ICONS.dm)}</span><b>${esc(title)}</b><span>${esc(enabled || !why ? desc : why)}</span></button>`;
function peerModal() { const u = SOC.peer; if (!u) return; const info = isDict(u.info) ? u.info : {}, d = isDict(info.d) ? info.d : {}, st = isDict(info.stats) ? info.stats : {}, mine = String(u.uid || '') === myUid(), fr = friendOf(u);
  let h = '<div class="peerhead">'; if (nonEmpty(fr) && !mine) h += `<div class="chips"><span class="cchip" style="--c:var(--accent)">친구</span><span class="cchip" style="--c:#${RD.REL_COLORS[fr.rel] || 'a3b8b3'}">${fr.rel ? '관계 · ' + esc(RD.REL_NAMES[fr.rel] || '친구') : '관계 미지정'}</span></div>`;
  h += `<div class="row">${avatarHtml(u.avatar || 0, 64, u.photo || '')}<div><b style="font-size:20px">${esc(gmName(u))}</b><p style="margin:2px 0;color:${info.dead ? 'var(--danger)' : 'var(--muted)'};font-size:14px">Lv. ${Number(info.level || 1)}  ·  ${'day' in info ? Number(info.day) + '일차' : '-'}  ·  ${info.dead ? '사망' : 'maxHp' in info ? `체력 ${Number(info.hp || 0)} / ${Number(info.maxHp || 0)}` : '체력 확인 중'}</p><p class="subtle" style="margin:0;font-size:13px">${mine ? '내 ' : ''}위치  ${esc(peerLocation(info))}  ·  처치 ${Number(info.kills || 0)}  ·  탐사 ${Number(info.explored || 0)} / 600${Number(info.explored_hard || 0) > 0 ? `  ·  하드 ${Number(info.explored_hard)} / 500` : ''}</p>${Number(u.offline_seen || 0) > 0 ? `<p style="color:var(--warning);font-size:12px;margin:0">접속 안 함 · 마지막 접속 ${durationText(Math.max(0, Math.floor(Date.now() / 1000) - Math.floor(Number(u.offline_seen) / 1000)))} 전 기준</p>` : ''}</div></div></div>`;
  if (!mine && u.uid) { const dead = !!info.dead, meDead = !!S.P.dead; h += groupLab('생존자 상호작용') + '<div class="ptiles">' + peerTile('dm', '쪽지 보내기', '1:1 비공개 대화 · 접속 안 해도 전달', 'var(--accent)', true);
    h += peerTile('duel', '1:1 결투', '모의전투 · 승자 +200원', 'var(--warning)', (info.duelReady ?? true) && !dead && !activityBusy() && Number(S.P.money) >= 200, dead ? '상대가 쓰러져 있습니다' : '상대가 바쁘거나 소지금 200원 미만');
    h += nonEmpty(fr) ? peerTile('room', '친구 방 방문', '쉬면 회복 1.5배', '#69c5a7', true) : peerTile('friend', '친구 추가', '상대가 수락하면 친구가 됩니다', 'var(--blue)', true);
    h += peerTile('heal', '회복 요청', '같은 대지역에서 치료받기', 'var(--accent)', Number(S.P.hp) <= Number(S.P.max_hp) * 0.7 && !meDead, '내 체력이 70% 이하일 때');
    if (dead) h += peerTile('revive', '응급 부활', '성공하면 상대 체력 25%', 'var(--danger)', Number(info.regionId ?? -1) === Number(S.P.region) && !meDead, '같은 대지역에 있어야 합니다');
    h += peerTile('trade', '아이템 교환', '물품 · 금액 · 코인 보내기', 'var(--blue)', !dead && !meDead, '쓰러진 동안은 못 합니다');
    if (S.admin) h += peerTile('admin', 'GM · 목록에서 지우기', '끊긴 접속 표시 정리', 'var(--danger)', true); h += '</div>'; }
  if (u.detail_loaded === false) h += noteBox('자세한 정보를 불러오는 중입니다…');
  else if (!nonEmpty(info) || u.detail_missing) h += noteBox('아직 이 생존자의 자세한 정보가 올라오지 않았습니다. 잠시 후 다시 확인하세요.');
  else { const ch = isDict(info.character) ? info.character : {}; h += groupLab('캐릭터 소개') + noteBox(ch.public ? characterSummary(ch, false) : '캐릭터 소개는 비공개입니다.') + groupLab('장비') + infoBox(`무기  ${info.weapon ?? '?'}`, `방어구  ${info.armor ?? '?'}`);
    h += groupLab('기본 능력치') + `<div class="panel pstats">${['체력', '힘', '민첩', '지능', '생존력'].map((k) => `<div><small>${statName(k)}</small><b>${Math.trunc(Number(st[k] || 0))}</b></div>`).join('')}</div>`;
    h += groupLab('세부 능력') + `<div class="panel pder">${[['attack', '공격력', ''], ['crit', '치명타 확률', '%'], ['crit_dmg', '치명타 피해', '%'], ['evade', '회피율', '%'], ['defense', '방어력', ''], ['flee', '도주 확률', '%'], ['loot', '전리품 획득률', '%'], ['rare', '희귀 획득률', '%'], ['retreat', '안전지대 이동', '%']].map(([k, l, u2]) => `<div><span>${l}</span><b>${esc(String(+(+Number(d[k] || 0)).toFixed(1)) + u2)}</b></div>`).join('')}</div>`; }
  if (S.admin && !mine) h += choiceRow('', '관리자: 이 생존자 관리', '부활 · 사망 · 지급/차감 · 상태 부여', 'var(--danger)', true, 'id="pAdm"');
  modal('생존자 정보', `<div class="peer">${h}</div>`, [['돌아가기', '', () => { SOC.peer = null; }]]); const r = $('modalRoot'), mc = r.querySelector('.mcard'); if (mc) mc.classList.add('wide');
  r.querySelectorAll('[data-ptile]').forEach((b) => { b.onclick = () => { const k = b.dataset.ptile, uid = String(u.uid || ''); r.innerHTML = '';
    if (k === 'dm') dmOpen(u); else if (k === 'duel') duelChallenge(u); else if (k === 'friend') friendRequest(uid); else if (k === 'room') roomVisit(fr); else if (k === 'heal') requestHeal(uid); else if (k === 'revive') tryPeerRevive(uid); else if (k === 'trade') openTradeForm(u);
    else if (k === 'admin') call('adminRemoveOnline', uid).then((res) => { if (res.ok) { S.online = (S.online || []).filter((x) => String(x.uid || '') !== uid); drawOnline(); toast('접속 목록에서 지웠습니다.'); } else toast(res.error || '지우지 못했습니다.'); }); }; });
  const pa = $('pAdm'); if (pa) pa.onclick = () => { r.innerHTML = ''; adminOpenPlayer({ uid: String(u.uid || ''), nickname: String(u.nickname || '?'), username: '', level: Number(info.level || 1), hasSave: true, dead: !!info.dead, hp: Number(info.hp || 0), maxHp: Number(info.maxHp || 0) }); }; }
function characterPub(ch) { if (isDict(ch.pub)) return { age: !!ch.pub.age, appearance: !!ch.pub.appearance, personality: !!ch.pub.personality, gender: !!ch.pub.gender }; const all = !!ch.public; return { age: false, appearance: all, personality: all, gender: all }; }
const charAgeText = () => (S.acct?.charAgeText ? String(S.acct.charAgeText) : Number(S.acct?.charAge || 0) > 0 ? `${Number(S.acct.charAge)}세` : '');
function characterSummary(ch, mine) { const pub = mine ? characterPub(ch) : {}, lines = [];
  if (mine) lines.push(`나이 · ${charAgeText() || '미기재'}  (${pub.age ? '공개' : '비공개'})`); else lines.push('age' in ch ? `나이 · ${ch.age}` : '나이 · 비공개');
  for (const [k, l, alt] of [['appearance', '외관', 'background'], ['personality', '성격', 'traits'], ['gender', '성별', '']]) { const v = String(ch[k] ?? (alt ? ch[alt] ?? '' : ''));
    if (mine) lines.push(`${l} · ${v || '미기재'}  (${pub[k] ? '공개' : '비공개'})`); else if (k in ch || (alt && alt in ch)) lines.push(`${l} · ${v || '미기재'}`); else lines.push(`${l} · 비공개`); }
  return lines.join('\n'); }
/* 받은 물품함 — 관리자 전체 지급 · 관리자 지급 요청 · 넘친 물품을 하나로(feature_ui.render_gm_gifts) */
function giftsRow2() { const p = S.P, rows = []; for (const b of SOC.broadcasts) if (!(p.social_done || {})['broadcast:' + b.id]) rows.push(['b', b]); for (const e of SOC.entries) if (e.kind === 'broadcast') rows.push(['e', e]);
  const st = isDict(p.stored_loot) ? p.stored_loot : {}, total = rows.length + Object.keys(st).length; if (!total) return ''; const open = !!INV.giftOpen;
  let h = choiceRow(1, `받은 물품함 · ${total}건` + (open ? '  · 접기' : '  · 펼치기'), '관리자 지급 · 교환 · 가방이 꽉 차서 넘친 물품이 모입니다 · 누르면 ' + (open ? '접습니다.' : '펼칩니다.'), 'var(--warning)', true, 'id="gRow"'); if (!open) return h;
  if (Object.keys(st).length) h += choiceRow(2, `가방으로 모두 받기 · ${Object.keys(st).length}종`, Object.keys(st).map((k) => `${k} × ${Number(st[k])}`).join(', ').slice(0, 120) + ' · 가방이 꽉 차면 남은 것은 계속 보관', 'var(--accent)', true, 'data-act="claim"');
  for (const [k, x] of rows) h += k === 'b' ? choiceRow('', `받기 · ${x.item || '?'} × ${Math.trunc(Number(x.qty || 1))}`, '관리자 전체 지급 · 계정당 한 번 · 가방에 자리가 있으면 바로 들어갑니다', 'var(--warning)', true, `data-bcl="${esc(x.id)}"`) : choiceRow('', '받기 · ' + entryDesc(x), '관리자 지급 · 가방이 가득 차면 받은 물품함으로', 'var(--warning)', true, `data-scl="${esc(x.id)}"`);
  return h; }
function bindGiftsRow2() { const c = $('center'); c.querySelectorAll('[data-bcl]').forEach((b) => { b.onclick = () => claimBroadcast(b.dataset.bcl); }); c.querySelectorAll('[data-scl]').forEach((b) => { b.onclick = () => claimSocial(b.dataset.scl); }); }
/* ════════ 채팅 · 쪽지(direct_messages.gd) · 접속자 ════════ */
const DM = { entries: [], peer: null, msgs: [], status: '', choosing: false, blocked: {}, ack: {}, retried: false, drafts: {} };
const dmUnread = () => DM.entries.filter((e) => e.unread && !e.blocked).length;
function dmStart() { sub('watchDMInbox', [], (r) => { if (!r.ok) { DM.status = String(r.error || '쪽지 초기 설정을 확인해 주세요.'); if (!DM.retried) { DM.retried = true; setTimeout(() => { if (LIVE.on) dmStart(); }, 6000); } }
  else { const old = dmUnread(); DM.entries = Array.isArray(r.entries) ? r.entries : []; DM.status = ''; if (dmUnread() > old && (S.P?.notify_settings?.dm ?? true)) sfx('notify'); DM.blocked = isDict(r.blocked) ? r.blocked : {}; } chatBadges(); if (S.chatTab === 'dm' && !DM.peer) drawChat(); }); }
function dmOpen(target) { const info = isDict(target.info) ? target.info : {}, uid = String(target.charId ?? info.charId ?? target.peer ?? target.uid ?? '');
  if (!uid || uid === String(S.acct?.charId ?? S.acct?.uid ?? '') || uid.split('_c')[0] === myUid()) { if (uid) toast('내 캐릭터에게는 쪽지를 보낼 수 없습니다.'); return; }
  dmStop(); DM.peer = { uid, nickname: String(target.nickname || '생존자'), isGM: !!target.isGM }; DM.msgs = []; DM.status = '연결 중…'; DM.choosing = false; $('modalRoot').innerHTML = ''; openChat('dm'); }
function dmStop() { unsubK('dm'); }
function dmBack() { dmStop(); DM.peer = null; DM.msgs = []; DM.status = ''; drawChat(); }
function dmSubscribe() { if (!DM.peer || DM.subbed === DM.peer.uid) return; DM.subbed = DM.peer.uid; const want = DM.peer.uid;
  sub('subscribe', ['dm:' + want], (r) => { if (!DM.peer || (r.peer && String(r.peer) !== DM.peer.uid) || DM.peer.uid !== want) return; if (!r.ok) { DM.status = String(r.error || '쪽지 연결 실패'); drawChat(); return; }
    DM.status = ''; DM.msgs = Array.isArray(r.messages) ? r.messages : []; drawChat(); if (S.chatTab === 'dm' && DM.msgs.length) { const at = Number(DM.msgs[DM.msgs.length - 1].createdAt || 0), uid = DM.peer.uid; if (at > Number(DM.ack[uid] || 0)) { DM.ack[uid] = at; call('dmRead', uid, at).then((x) => { if (!x.ok) delete DM.ack[uid]; }); } } }); }
const dmIsBlocked = () => { const u = DM.peer?.uid || ''; if (DM.blocked[u]) return true; const e = DM.entries.find((x) => String(x.peer || '') === u); return !!e?.blocked; };
function dmBlock() { if (!DM.peer) return; const uid = DM.peer.uid, bl = !dmIsBlocked(); call('dmBlock', uid, bl).then((r) => { if (r.ok) { DM.blocked[uid] = bl; for (const e of DM.entries) if (String(e.peer || '') === uid) e.blocked = bl; drawChat(); chatBadges(); } toast(r.ok ? '쪽지 차단 상태를 변경했습니다.' : r.error || '차단 실패'); }); }
function openChat(tab) { if (S.chatTab === 'dm' && tab !== 'dm' && DM.peer) { /* 대화 유지 */ } S.chatTab = tab; if (S.mobile) { if (S.mode !== 'chat') go('chat'); else drawChat(); } else { document.querySelectorAll('[data-ct]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.ct === tab))); drawChat(); } }
function chatBadges() { const p = S.P; if (!p) return; const cu = p.channel_unread || {}; document.querySelectorAll('[data-ct]').forEach((b) => { const k = b.dataset.ct, n = k === 'dm' ? dmUnread() : ['world', 'party', 'notice'].includes(k) && S.chatTab !== k ? Number(cu[k] || 0) : 0; let s = b.querySelector('.cbadge'); if (n > 0) { if (!s) { s = document.createElement('span'); s.className = 'cbadge'; b.appendChild(s); } s.textContent = n > 99 ? '99+' : String(n); } else if (s) s.remove(); }); }
function chatSetTab(tab) { const p = S.P; if (S.chatTab === 'dm' && tab !== 'dm') dmStop(), (DM.subbed = ''); S.chatTab = tab; if (['world', 'party', 'notice'].includes(tab) && p) { if (!isDict(p.channel_unread)) p.channel_unread = {}; if (Number(p.channel_unread[tab] || 0)) { p.channel_unread[tab] = 0; LIFE.dirty = true; } } drawChat(); chatBadges(); }
function chatNew(tab, before, after) { if (!S.P || after <= before || before < 0) return; if (!isDict(S.P.channel_unread)) S.P.channel_unread = {}; const ns = S.P.notify_settings || {}; if (!(ns[tab] ?? true)) { S.P.channel_unread[tab] = 0; return; } sfx('notify'); const visible = S.chatTab === tab && (S.mobile ? S.mode === 'chat' : UI.chat); S.P.channel_unread[tab] = visible ? 0 : Math.min(999, Number(S.P.channel_unread[tab] || 0) + (after - before)); chatBadges(); badgesRefresh(); }
const CHAT_CD = { until: 0, sending: false };
function msgLine(m, tab) { const me = myUid(), mine = String(m.uid || '') === me || String(m.uid || '') === String(S.acct?.charId || ''); let col = tab === 'notice' ? '#e3b341' : mine ? 'var(--accent)' : 'var(--blue)';
  if (tab !== 'notice' && /^[0-9a-fA-F]{6}$/.test(String(m.color || ''))) col = '#' + m.color; const del = S.admin && tab !== 'dm' && m.id ? `<button class="mdel" data-cdel="${esc(m.id)}">삭제</button>` : '';
  return `<div class="msg"><span class="tm">${esc(String(m.time || '').replace(' KST', ''))}</span><span class="nm" style="color:${col}">${esc((m.isGM ? 'GM · ' : '') + String(m.nickname || '?'))}</span><span>${esc(m.text)}${del}</span></div>`; }
function bbPlain(s) { return esc(String(s).replace(/\[\/?(color|b|i|u)[^\]]*\]/g, '')); }
function drawChat() { const box = $('msgs'); if (!box) return; const tab = S.chatTab, form = $('cForm'), inp = $('cIn'); let html = '', canSend = true, ph = '메시지를 입력하세요', max = 200;
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 40, wasTab = box.dataset.tab;
  if (tab === 'story') { html = (S.log || []).map((l) => `<div class="msg"><span>${bbPlain(l)}</span></div>`).join('') || '<p class="muted">아직 스토리 기록이 없습니다.</p>'; html += '<p class="subtle cfoot">스토리와 동료 상호작용 기록 전용 · 메시지를 보낼 수 없습니다.</p>'; canSend = false; }
  else if (tab === 'combat') { const j = S.P?.journal || []; html = j.map((l) => `<div class="msg"><span>${bbPlain(l)}</span></div>`).join('') || '<p class="muted">아직 상태/전투 정보가 없습니다.</p>'; canSend = false; }
  else if (!LIVE.on) { html = '<p class="muted">채팅은 로그인한 생존자만 사용할 수 있습니다.</p>'; canSend = false; }
  else if (tab === 'dm' && !DM.peer) { canSend = false; let rows = DM.entries; if (DM.choosing) { rows = []; const seen = {}; for (const t of [...(S.online || []), ...SOC.friends]) { const ti = isDict(t.info) ? t.info : {}, uid = String(t.charId ?? ti.charId ?? t.uid ?? ''); if (!uid || String(t.uid || '') === myUid() || seen[uid]) continue; seen[uid] = 1; rows.push(t); } }
    DM.rows = rows; html = `<b class="dmh">쪽지 · 미확인 대화 ${dmUnread()}</b><p class="muted cfoot">대화는 두 당사자만 볼 수 있습니다. 접속자·친구 정보에서도 쪽지를 시작할 수 있습니다.</p>${DM.status ? `<p class="cfoot" style="color:var(--danger)">${esc(DM.status)}</p>` : ''}<div class="dmbar"><button class="btn sm" id="dmPick" style="color:var(--blue)">${DM.choosing ? '최근 대화 보기' : '대화 상대 선택'}</button><button class="btn sm" id="dmRe">새로고침</button>${S.admin ? '<button class="btn sm" id="dmSync" style="color:var(--warning)">사용자 동기화</button>' : ''}</div>`;
    html += rows.length ? rows.map((t, i) => `<button class="btn dmrow" data-dmi="${i}" style="color:${t.unread ? 'var(--danger)' : 'var(--accent)'}">${t.unread ? '새 쪽지 · ' : ''}${esc(gmName(t))}${t.blocked ? ' · 차단' : ''}</button>`).join('') : '<p class="muted">아직 대화가 없습니다. 위의 대화 상대 선택 또는 친구 목록을 이용하세요.</p>'; }
  else if (tab === 'party' && !nonEmpty(PARTY.online)) { html = '<p class="muted">온라인 파티에 참가하면 파티원끼리 대화할 수 있습니다.</p><button class="btn" id="cParty" style="color:var(--accent)">파티 메뉴로</button>'; canSend = false; }
  else { let msgs = tab === 'world' ? S.world : tab === 'dm' ? DM.msgs : SOC.chat[tab] || [];
    if (tab === 'dm') { html = `<div class="dmbar"><button class="btn sm" id="dmBack" style="color:var(--blue)">대화 목록</button><b class="dmname">${esc(gmName(DM.peer))}</b><button class="btn sm" id="dmBlk">${dmIsBlocked() ? '차단 해제' : '차단'}</button></div><p class="muted cfoot">당사자만 보는 쪽지 · 최근 80개 · 한국시간</p>${dmIsBlocked() ? '<p class="cfoot" style="color:var(--danger)">이 상대와의 새 쪽지를 차단했습니다. 기존 대화는 유지됩니다.</p>' : ''}`; ph = '쪽지를 입력하세요'; max = 500; dmSubscribe(); if (DM.status) html += `<p class="muted">${esc(DM.status)}</p>`; }
    if (tab === 'party') partyChatSub();
    if (!(tab === 'dm' && DM.status)) html += msgs.map((m) => msgLine(m, tab)).join('') || '<p class="muted">아직 메시지가 없습니다. 첫 인사를 남겨 보세요.</p>';
    if (tab === 'notice' && !S.admin) { canSend = false; html += '<p class="subtle cfoot">공지는 운영자만 작성할 수 있습니다.</p>'; } if (tab === 'notice' && S.admin) ph = '공지 작성 (관리자)'; }
  box.innerHTML = html; box.dataset.tab = tab; if (form) form.hidden = !canSend; if (inp) { inp.placeholder = ph; inp.maxLength = max; }
  if (near || wasTab !== tab || box.dataset.first !== '1') { box.scrollTop = box.scrollHeight; box.dataset.first = '1'; }
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('dmPick', () => { DM.choosing = !DM.choosing; drawChat(); }); on('dmRe', () => dmStart()); on('dmSync', () => call('dmSyncDirectory').then((r) => { toast(r.ok ? `쪽지 사용자 ${Number(r.count || 0)}명 동기화 완료` : r.error || '동기화 실패'); if (r.ok) dmStart(); }));
  on('dmBack', dmBack); on('dmBlk', dmBlock); on('cParty', () => go('party'));
  box.querySelectorAll('[data-dmi]').forEach((b) => { b.onclick = () => dmOpen(DM.rows[Number(b.dataset.dmi)]); });
  box.querySelectorAll('[data-cdel]').forEach((b) => { b.onclick = () => call('deleteChat', tab === 'party' ? 'party:' + String(PARTY.online.id || '') : tab, b.dataset.cdel).then((r) => toast(r.ok ? '메시지를 지웠습니다.' : r.error || '지우지 못했습니다.')); }); }
async function sendChatNow() { const inp = $('cIn'); if (!inp || CHAT_CD.sending) return; if (CHAT_CD.until > nowSec()) { toast(`도배 방지 · ${CHAT_CD.until - nowSec()}초 남음`); return; } const t = inp.value.trim(); if (!t) return; const tab = S.chatTab;
  const ch = tab === 'dm' ? 'dm:' + String(DM.peer?.uid || '') : tab === 'party' ? 'party:' + String(PARTY.online.id || '') : tab; CHAT_CD.sending = true; const r = await call('sendChat', ch, t); CHAT_CD.sending = false; CHAT_CD.until = nowSec() + Number(r.cooldown || 0);
  if (r.ok) { if (S.chatTab === tab) inp.value = ''; } else toast(r.error || '전송 실패'); }
function drawOnline() { const box = $('onlList'); if (!box) return; const me = myUid();
  /* 내 줄은 서버 값 대신 항상 지금 레벨 · 아이콘 · 사진으로(v36.42) */
  const list = (S.online || []).filter((u) => String(u.uid || '') !== me); if (S.P && me && !$('app').hidden) list.unshift({ uid: me, nickname: displayName(), avatar: Number(S.P.avatar || 0), photo: String(S.P.photo || ''), info: publicInfo() }); FD.onlList = list;
  $('onlN').textContent = list.length ? list.length + '명' : '';
  box.innerHTML = list.map((u, i) => `<button class="onl-row" data-onl="${i}">${avatarHtml(u.avatar, 26, u.photo)}<b style="${u.uid === me ? 'color:var(--accent)' : ''}">${esc(gmName(u))}${u.uid === me ? ' (나)' : ''}</b><span class="lv">Lv.${Number(u.info?.level) || 1}</span></button>`).join('') || '<span class="muted">접속한 생존자가 없습니다.</span>';
  box.querySelectorAll('[data-onl]').forEach((b) => { b.onclick = () => openPeer(FD.onlList[Number(b.dataset.onl)]); }); }
/* 모바일 채팅 화면 */
function chatPage() { return `<div class="mchat">${chatCol()}</div>`; }
function bindChatPage() { const c = $('center'); c.querySelectorAll('[data-ct]').forEach((b) => { b.onclick = () => { chatSetTab(b.dataset.ct); c.querySelectorAll('[data-ct]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; });
  const f = $('cForm'); if (f) f.onsubmit = (e) => { e.preventDefault(); sendChatNow(); }; drawChat(); drawOnline(); chatBadges(); }
/* ════════ 파티(main._render_party · 온라인 파티 · 파티 함께 탐사) ════════ */
const PARTY = { online: {}, trips: [], list: [], loading: false, subId: '', chatSub: '' };
function setOnlineParty(pp) { const oldId = String(PARTY.online.id || ''); PARTY.online = isDict(pp) ? pp : {}; const nid = String(PARTY.online.id || '');
  if (oldId !== nid) { unsubK('partydoc'); unsubK('party'); unsubK('partytrips'); SOC.chat.party = []; PARTY.chatSub = ''; PARTY.trips = [];
    if (nid) { sub('watchParty', [nid], (r) => { if (!r.ok) return; const np = r.party; if (!isDict(np) && nonEmpty(PARTY.online)) { toast('온라인 파티가 해체되었습니다.'); setOnlineParty(null); } else if (isDict(np)) { if (!(np.members || []).includes(myUid())) { toast('온라인 파티에서 나왔습니다.'); setOnlineParty(null); return; } PARTY.online = np; } if (S.mode === 'party') redrawKeep(); });
      sub('watchPartyTrips', [nid], (r) => { if (r.ok) { PARTY.trips = SOC.trips = Array.isArray(r.trips) ? r.trips : []; adoptPartyTrips(); partyCourseAlerts(); proposalAlerts(); partyTripAuto(); if (S.mode === 'party_trips') redrawKeep(); } }); partyChatSub(); }
    if (S.chatTab === 'party') drawChat(); }
  if (['party', 'party_list'].includes(S.mode)) redrawKeep(); }
function partyChatSub() { const id = String(PARTY.online.id || ''); if (!id || PARTY.chatSub === id) return; PARTY.chatSub = id;
  sub('subscribe', ['party:' + id], (r) => { if (!r.ok || PARTY.chatSub !== id) return; const before = SOC.chat.party.length; SOC.chat.party = Array.isArray(r.messages) ? r.messages : []; chatNew('party', before, SOC.chat.party.length); if (S.chatTab === 'party') drawChat(); }); }
const partyNameOf = (uid) => String((PARTY.online.memberNames || {})[uid] ?? '파티원');
const tripStale = (t) => { const c = Number(t.createdAt || 0), lin = (PARTY.online.members || []).includes(String(t.leader || '')); return !lin || (c > 0 && Date.now() - c > 1800000); };
const memberFlow = (members, mn, leader) => `<div class="pflow">${members.map((u) => { const il = String(u) === leader, me = String(u) === myUid(), col = il ? 'var(--warning)' : me ? 'var(--accent)' : 'var(--blue)', nm = String(mn[u] ?? '?'); return `<span class="pchip" style="--c:${col}"><i>${esc(nm.slice(0, 1))}</i>${esc(nm + (il ? ' · 파티장' : '') + (me ? ' (나)' : ''))}</span>`; }).join('')}</div>`;
function partyPage() { const p = S.P, joined = joinedIds(), formed = !!p.party_formed; let h = headT('파티', formed ? `동행 ${activeIds().length} / 2 · 사기 ${Number(p.morale)}` : '파티가 해체된 상태입니다. 혼자 탐사합니다.');
  h += groupLab('동료 · 이야기 속에서 만난 생존자'); if (!joined.length) h += noteBox("아직 동료가 없습니다. 거점의 '이야기' 선택지를 진행하면 동료를 만날 수 있습니다.");
  for (const id of joined) { const info = SDATA.COMPANIONS[id], c = compOf(id); h += choiceRow('', `${info.name} · ${info.role}     ${c.active && formed ? '동행 중' : '대기'}`, `신뢰 ${Number(c.trust)} (${['경계', '동료', '전우'][trustTier(Number(c.trust))]}) · ${info.skill}`, '#' + info.color, true, `data-comp="${id}"`); }
  if (joined.length) { const sc = pendingScene(); h += choiceRow('', '모닥불 앞에 모이기', sc ? `동료들 사이에 사건이 있다: ${sc.title}` : '동료들과 하루를 정리한다. 신뢰 +2, 사기 +4 (하루 1회)', 'var(--warning)', Number(p.campfire_day) !== Number(p.day), 'id="stFire"') + choiceRow('', formed ? '파티 해체' : '파티 결성', formed ? '동료들을 거점에 남기고 혼자 움직인다.' : '동료들과 다시 한 팀으로 움직인다.', formed ? 'var(--danger)' : 'var(--accent)', true, 'id="stParty"'); }
  h += groupLab('온라인 파티 · 다른 플레이어와 함께');
  if (!LIVE.on) return h + noteBox('로그인하면 다른 플레이어와 온라인 파티를 만들고 파티 채팅을 쓸 수 있습니다.');
  const op = PARTY.online; if (!nonEmpty(op)) return h + choiceRow('', '새 파티 만들기', '파티장이 되어 다른 생존자를 모집합니다. (최대 8명)', 'var(--accent)', true, 'id="opNew"') + choiceRow('', '모집 중인 파티 찾기', '열려 있는 파티 목록을 보고 참가합니다.', 'var(--blue)', true, 'id="opList"');
  const mn = op.memberNames || {}, leader = String(op.leader || ''), meL = leader === myUid(), members = op.members || [], closed = !!op.closed;
  h += `<div class="panel pcard"><div class="pctop"><b>${esc(op.name || '')}</b><span class="cchip" style="--c:${closed ? 'var(--muted)' : 'var(--accent)'}">${closed ? '모집 마감' : '모집 중'}</span><span class="cchip" style="--c:var(--blue)">${members.length} / ${Number(op.max || 8)}명</span></div>${memberFlow(members, mn, leader)}`;
  if (meL) h += `<div class="pclose"><span class="muted">${closed ? "모집을 마감해서 '모집 중인 파티' 목록에서 숨겼습니다. 새로 들어올 수 없습니다." : "지금 '모집 중인 파티' 목록에 보입니다. 사람이 다 모이면 모집을 마감하세요."}</span><button class="btn ${closed ? '' : 'primary'}" id="opClose" style="${closed ? 'color:var(--accent)' : 'background:var(--warning);border-color:var(--warning)'}">${closed ? '다시 모집하기' : '모집 마감하기'}</button></div>`;
  h += '</div>'; if (meL) for (const u of members) if (String(u) !== myUid()) h += choiceRow('', '내보내기 · ' + String(mn[u] ?? '파티원'), '이 파티원을 파티에서 내보냅니다(확인 창).', 'var(--muted)', true, `data-kick="${esc(u)}"`);
  h += choiceRow('', '파티 채팅 열기', '파티원끼리만 보이는 채팅', 'var(--accent)', true, 'id="opChat"') + choiceRow('', '파티 함께 탐사', '난이도 · 탐사 시간을 고르면 바로 파티원에게 알림 · 받은 요청 확인', 'var(--warning)', true, 'data-go="party_trips"');
  return h + (meL ? choiceRow('', '파티 해체', '파티를 없애고 모든 파티원을 내보냅니다.', 'var(--danger)', true, 'id="opExit" data-dis="1"') : choiceRow('', '파티 탈퇴', '이 파티에서 나갑니다.', 'var(--danger)', true, 'id="opExit"')); }
function bindParty() { const c = $('center'), on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; }; c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-comp]').forEach((b) => { b.onclick = () => compModal(b.dataset.comp); }); on('stFire', () => act(() => campfire(), () => { if (STORY.ev) go('story'); })); on('stParty', () => act(() => toggleParty()));
  on('opNew', partyCreateModal); on('opList', openPartyList); on('opChat', () => openChat('party')); on('opClose', () => setPartyClosed(!PARTY.online.closed));
  c.querySelectorAll('[data-kick]').forEach((b) => { b.onclick = () => { const uid = b.dataset.kick, nm = partyNameOf(uid); modal('파티원 내보내기', `<p style="color:var(--text)">${esc(nm)}님을 파티에서 내보내시겠습니까?</p>`, [['내보내기', 'dangerfill', () => call('kickParty', String(PARTY.online.id || ''), uid).then((r) => toast(r.ok ? `${nm}님을 내보냈습니다.` : r.error || '내보내지 못했습니다.'))], ['취소', '', null]]); }; });
  on('opExit', () => { const dis = !!$('opExit').dataset.dis; modal(dis ? '파티 해체' : '파티 탈퇴', `<p style="color:var(--text)">${dis ? '파티를 해체하시겠습니까? 모든 파티원이 파티에서 나가게 됩니다.' : '이 파티에서 나가시겠습니까? 나중에 다시 들어올 수 있습니다.'}</p>`, [[dis ? '해체하기' : '탈퇴하기', 'dangerfill', () => { const pid = String(PARTY.online.id || ''); call(dis ? 'disbandParty' : 'leaveParty', pid).then((r) => { if (r.ok) { toast(dis ? '파티를 해체했습니다.' : '파티에서 탈퇴했습니다.'); act(() => { gLog(dis ? '[color=#f2706a]온라인 파티 해체[/color]' : '[color=#f2706a]온라인 파티 탈퇴[/color]'); return true; }); setOnlineParty(null); } else toast(r.error || (dis ? '해체하지 못했습니다.' : '탈퇴하지 못했습니다.')); }); }], ['취소', '', null]]); }); }
function setPartyClosed(closed) { const pid = String(PARTY.online.id || ''); if (!pid) return; call('setPartyClosed', pid, closed).then((r) => { if (r.ok) { toast(closed ? '모집을 마감했습니다 · 목록에서 숨겨집니다' : '다시 모집을 시작했습니다'); if (isDict(r.party)) PARTY.online = r.party; if (S.mode === 'party') redrawKeep(); } else toast(String(r.error || '바꾸지 못했습니다.') + ' (서버 규칙 업데이트가 필요할 수 있습니다)'); }); }
function inputModal(title, desc, ph, okText, handler, max = 16) { modal(title, `<p class="muted">${esc(desc)}</p><input class="sel" id="imIn" maxlength="${max}" placeholder="${esc(ph)}"><p id="imSt" style="color:var(--danger);font-size:13px;margin:0"></p>`, [[okText, 'primary keep', () => { const t = $('imIn').value.trim(), st = $('imSt'); handler(t, st, (ok = true) => { if (ok) $('modalRoot').innerHTML = ''; }); return false; }], ['취소', '', null]]); setTimeout(() => $('imIn')?.focus(), 30); }
function partyCreateModal() { inputModal('새 파티 만들기', '다른 생존자에게 보이는 파티 이름입니다. (2~16자)', '예: 방송탑 원정대', '만들기', (text, st, done) => call('createParty', text).then((r) => { if (r.ok) { done(); toast(`파티 '${text}'을(를) 만들었습니다.`); act(() => { gLog(`[color=#3fd0a4]온라인 파티 생성[/color]  ${text}`); return true; }); setOnlineParty(r.party || null); } else { st.textContent = r.error || '파티를 만들지 못했습니다.'; done(false); } })); }
function openPartyList() { PARTY.loading = true; PARTY.list = []; go('party_list', true); call('listParties').then((r) => { PARTY.loading = false; PARTY.list = r.ok && Array.isArray(r.parties) ? r.parties : []; if (!r.ok) toast(r.error || '목록을 불러오지 못했습니다.'); if (S.mode === 'party_list') redrawKeep(); }); }
function partyListPage() { const shown = PARTY.list.filter((x) => !x.closed); let h = headT('모집 중인 파티', '눌러서 파티원을 확인하고 들어갑니다');
  if (PARTY.loading) h += noteBox('목록을 불러오는 중…'); else if (!shown.length) h += noteBox('지금 모집 중인 파티가 없습니다. 직접 만들어 보세요.');
  h += '<div class="plist">' + shown.map((x, i) => { const n = (x.members || []).length, mx = Number(x.max || 8), full = n >= mx; return `<button class="panel prow" data-pv="${i}"><span class="tx"><b>${esc(x.name || '')}</b><span class="muted">파티장 ${esc(x.leaderName || '?')}${full ? ' · 인원 가득' : ''}</span><i class="pbarx"><i style="width:${Math.round((n / Math.max(1, mx)) * 100)}%;background:${full ? 'var(--warning)' : 'var(--accent)'}"></i></i></span><em style="color:${full ? 'var(--warning)' : 'var(--accent)'}">${n} / ${mx}</em><span class="muted">›</span></button>`; }).join('') + '</div>';
  PARTY.shown = shown; return h + choiceRow('', '새로고침', '', 'var(--blue)', true, 'id="plRe"') + choiceRow('', '파티로 돌아가기', '', 'var(--muted)', true, 'data-go="party"'); }
function bindPartyList() { const c = $('center'); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); const re = $('plRe'); if (re) re.onclick = openPartyList;
  c.querySelectorAll('[data-pv]').forEach((b) => { b.onclick = () => { const x = PARTY.shown[Number(b.dataset.pv)], n = (x.members || []).length, mx = Number(x.max || 8), can = n < mx && !nonEmpty(PARTY.online);
    modal(String(x.name || '파티'), `<p class="muted">파티장 ${esc(x.leaderName || '?')} · 인원 ${n} / ${mx}명</p><b class="muted" style="font-size:13px">파티원</b>${memberFlow(x.members || [], x.memberNames || {}, String(x.leader || ''))}<p class="subtle" style="font-size:12px">들어가면 파티 채팅과 파티 함께 탐사를 쓸 수 있습니다. 언제든 탈퇴할 수 있습니다.</p>`,
      [['닫기', '', null], [can ? '이 파티 들어가기' : n >= mx ? '인원 가득' : '이미 파티에 있습니다', can ? 'primary' : 'disabled', can ? () => joinPartyNow(String(x.id || ''), String(x.name || '')) : null]]); }; }); }
function joinPartyNow(pid, nm) { modal('파티 참가', `<p style="color:var(--text);white-space:pre-line">'${esc(nm)}'에 들어가시겠습니까?\n파티원끼리 파티 채팅과 함께 탐사를 할 수 있고, 언제든 탈퇴할 수 있습니다.</p>`, [['들어가기', 'primary', () => call('joinParty', pid).then((r) => { if (r.ok) { toast('파티에 참가했습니다.'); act(() => { gLog(`[color=#3fd0a4]온라인 파티 참가[/color]  ${(r.party || {}).name || ''}`); return true; }); S.mode = 'party'; setOnlineParty(r.party || null); go('party'); } else toast(r.error || '참가하지 못했습니다.'); })], ['취소', '', null]]); }
/* 파티 함께 탐사 */
function tripReadyReason(t) { const p = S.P, h = Number(t.hours || 1); if (p.dead) return '쓰러진 상태입니다.'; if (activityBusy() || nonEmpty(p.battle)) return '다른 활동을 먼저 마쳐 주세요.';
  if (Number(p.region) !== Number(t.regionId ?? -1)) return `출발 지역(${GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, Number(t.regionId || 0)))].name})에 있어야 합니다.`;
  if (Number(p.hunger) < h * 10 || Number(p.water) < h * 12) return `허기 ${h * 10} · 수분 ${h * 12} 이상이 필요합니다(지금 ${Number(p.hunger)} · ${Number(p.water)}).`; if (incapacitated()) return '사기(기력)가 너무 낮습니다. 먼저 회복하세요.'; return ''; }
function tripNotReady(t) { const rm = SOC.tripReadyMap[String(t.id || '')] || {}, mem = PARTY.online.members || [], out = []; for (const u of t.readyMembers || []) { if (!mem.includes(u)) continue; const r = isDict(rm[u]) ? rm[u] : {}; if (!nonEmpty(r)) out.push(`${partyNameOf(u)}(확인 중)`); else if (!r.ok) out.push(`${partyNameOf(u)}(${r.why || '준비 중'})`); } return out.join(', '); }
function partyTripsPage() { const me = myUid(); let h = headT('파티 함께 탐사', '누구나 요청 · 난이도와 시간만 고르면 바로 알림 · 모두 응답하면 수락한 사람끼리 출발'), any = false;
  for (const t of PARTY.trips) { const st = String(t.status || ''); if (st !== 'pending' && st !== 'active') continue; if (st === 'active' && Number(t.ready || 0) <= nowSec()) continue; if (st === 'pending' && tripStale(t)) continue; any = true;
    const leader = String(t.leader || ''), ready = t.readyMembers || [], no = t.declinedMembers || [], rg = GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, Number(t.regionId || 0)))].name;
    const rows = (t.participants || []).map((u) => `${partyNameOf(u)} ${st === 'active' ? '출발' : ready.includes(u) ? '수락' : no.includes(u) ? '거절' : '대기'}`);
    h += infoBox(`${rg} · ${Number(t.hours || 1)}시간 · 난이도 ${signed(Number(t.difficulty || 0))}${st === 'active' ? ' · 진행 중' : ''}`, `요청 · ${partyNameOf(leader)}\n${rows.join(' · ')}`); if (st !== 'pending') continue; const id = esc(t.id);
    if (leader === me) { const nr = tripNotReady(t); if (nr) h += noteBox(`출발 준비 중 · ${nr}\n수락한 사람이 모두 준비되면(허기 · 수분 · 사기 · 지역 · 다른 활동) 자동으로 함께 출발합니다.`); h += choiceRow('', `지금 출발 (수락 ${ready.length - 1}명)`, '아직 응답하지 않은 사람은 빼고, 수락한 사람이 모두 준비되면 출발합니다.', 'var(--warning)', ready.length >= 2 && !nr, `data-tstart="${id}"`) + choiceRow('', '요청 취소', '이 함께 탐사 요청을 닫습니다.', 'var(--muted)', true, `data-tresp="${id}" data-v="cancel"`); }
    else if (!ready.includes(me) && !no.includes(me)) h += choiceRow('', '함께 가기', '같은 대지역에서 생존 중이어야 합니다 · 출발하면 식량 · 물을 씁니다.', 'var(--accent)', true, `data-tresp="${id}" data-v="1"`) + choiceRow('', '이번에는 빠지기', '나만 빠지고, 다른 사람들은 그대로 출발할 수 있습니다.', 'var(--muted)', true, `data-tresp="${id}" data-v="0"`);
    else { const why = ready.includes(me) ? tripReadyReason(t) : ''; h += noteBox(why ? `아직 나갈 준비가 안 됐습니다 · ${why}\n준비가 되어야 파티 전체가 출발합니다.` : '응답했습니다 · 요청한 사람이 출발하면 자동으로 함께 떠납니다.'); } }
  if (!any) h += noteBox("진행 중인 요청이 없습니다. 아래 '새 함께 탐사 요청'에서 난이도 · 탐사 시간을 고르면 바로 파티원에게 알림이 갑니다.");
  return h + choiceRow('', '새 함께 탐사 요청', '난이도 · 탐사 시간 고르기 → 모든 파티원에게 바로 알림', 'var(--accent)', !any, 'id="tNew"'); }
function bindPartyTrips() { const c = $('center'); const n = $('tNew'); if (n) n.onclick = partyTripModal;
  c.querySelectorAll('[data-tstart]').forEach((b) => { b.onclick = () => startPartyTrip(b.dataset.tstart); }); c.querySelectorAll('[data-tresp]').forEach((b) => { b.onclick = () => respondPartyTrip(b.dataset.tresp, b.dataset.v === 'cancel' ? 'cancel' : b.dataset.v === '1'); }); }
function partyTripModal() { const p = S.P; if (!nonEmpty(PARTY.online) || (PARTY.online.members || []).length < 2) { toast('파티원이 2명 이상일 때 함께 탐사할 수 있습니다.'); return; } if (activityBusy()) { toast('진행 중인 활동을 먼저 마쳐 주세요.'); return; }
  if (PARTY.trips.some((t) => t.status === 'pending' && !tripStale(t))) { toast('이미 대기 중인 함께 탐사 요청이 있습니다. 먼저 응답하거나 끝나기를 기다려 주세요.'); return; } const pick = { diff: 0, hours: 1 };
  const draw = () => { const d = $('ptD'), hh = $('ptH'), inf = $('ptI'); if (!d) return; d.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === pick.diff))); hh.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === pick.hours))); inf.textContent = `권장 Lv.${Math.max(1, Math.min(100, Number(p.level) + pick.diff))} · 출발하면 허기 -${10 * pick.hours} · 수분 -${12 * pick.hours}`; };
  modal('파티 함께 탐사 요청', `<p class="muted" style="white-space:pre-line">지금 있는 곳 · ${esc(GD.REGIONS[Number(p.region)].name)}\n고르고 '요청 보내기'를 누르면 모든 파티원에게 바로 알림이 가고, 모두 응답하면 수락한 사람끼리 출발합니다.</p><b>난이도</b><div class="pills" id="ptD">${[[-3, '쉬움'], [0, '보통'], [3, '위험'], [5, '극한']].filter(([v]) => Number(p.level) + v >= 1 && Number(p.level) + v <= 100).map(([v, l]) => `<button class="pill" data-v="${v}">${l}</button>`).join('')}</div><b>탐사 시간</b><div class="pills" id="ptH">${[1, 2, 3, 4].map((v) => `<button class="pill" data-v="${v}">${v}시간</button>`).join('')}</div><p id="ptI" style="color:var(--warning);margin:0"></p>`,
    [['취소', '', null], ['요청 보내기', 'primary', () => socialCall('createPartyTrip', [pick.hours, Number(p.region), pick.diff], () => { toast('파티원에게 함께 탐사 요청을 보냈습니다.'); go('party_trips'); }, (r) => toast(String(r.error || '요청하지 못했습니다.').slice(0, 80)))]]);
  $('ptD').querySelectorAll('button').forEach((b) => { b.onclick = () => { pick.diff = Number(b.dataset.v); draw(); }; }); $('ptH').querySelectorAll('button').forEach((b) => { b.onclick = () => { pick.hours = Number(b.dataset.v); draw(); }; }); draw(); }
function respondPartyTrip(id, accept) { if (accept === true) { const t = PARTY.trips.find((x) => String(x.id) === id); const why = t ? tripReadyReason(t) : ''; if (why) { modal('아직 함께 갈 수 없습니다', `<p style="white-space:pre-line">${esc(why + "\n준비를 마친 뒤 다시 '함께 가기'를 누르세요.")}</p>`); return; } } socialCall('respondPartyTrip', [id, accept]); }
function startPartyTrip(id) { const t = PARTY.trips.find((x) => String(x.id) === id); if (t) { const nr = tripNotReady(t); if (nr) { modal('아직 출발할 수 없습니다', `<p style="white-space:pre-line">${esc('수락한 파티원이 모두 나갈 준비가 되어야 출발합니다.\n준비 중 · ' + nr)}</p>`); return; } } socialCall('startPartyTrip', [id], () => adoptPartyTrips()); }
function publishTripReady() { const me = myUid(); let watch = ''; for (const t of PARTY.trips) { const id = String(t.id || ''); if (t.status !== 'pending' || tripStale(t)) continue; if ((t.readyMembers || []).includes(me)) { watch = id; const why = tripReadyReason(t), sig = (why ? '0|' : '1|') + why; if (SOC.tripReadySent[id] !== sig) { SOC.tripReadySent[id] = sig; call('setTripReady', id, !why, why); } } }
  if (watch !== SOC.tripReadyWatch) { SOC.tripReadyWatch = watch; unsubK('tripready'); if (watch) sub('watchTripReady', [watch], (r) => { if (r.ok) { SOC.tripReadyMap[String(r.trip || '')] = isDict(r.ready) ? r.ready : {}; setTimeout(() => { partyTripAuto(); if (S.mode === 'party_trips') redrawKeep(); }, 300); } }); } }
function partyTripAuto() { if (!S.P || !LIVE.on) return; const me = myUid(); publishTripReady();
  for (const t of PARTY.trips) { const id = String(t.id || ''); if (t.status !== 'pending' || String(t.leader || '') !== me || SOC.tripAutoDone[id] || tripStale(t)) continue; const parts = t.participants || [], ready = t.readyMembers || [], no = t.declinedMembers || [], mem = PARTY.online.members || parts;
    if (parts.some((u) => mem.includes(u) && !ready.includes(u) && !no.includes(u))) continue; const going = ready.filter((u) => mem.includes(u));
    if (going.length >= 2 && going.length === ready.length) { if (tripNotReady(t)) continue; if (SOC.busy) return; SOC.tripAutoDone[id] = true; socialCall('startPartyTrip', [id], () => adoptPartyTrips(), (r) => tripAutoFail(id, String(r.error || ''))); }
    else { if (SOC.busy) return; SOC.tripAutoDone[id] = true; socialCall('respondPartyTrip', [id, 'cancel'], () => act(() => { notify('party-trip-none-' + id, '함께 탐사 취소', '함께 갈 파티원이 없어(또는 수락한 사람이 파티를 나가) 요청을 닫았습니다.', 'party'); return true; }), (r) => tripAutoFail(id, String(r.error || ''))); } } }
function tripAutoFail(id, err) { const n = Number(SOC.tripAutoFails[id] || 0) + 1; SOC.tripAutoFails[id] = n; if (n >= 3) { alertPopup('party-trip-autofail-' + id, '함께 탐사 자동 출발 실패', "서버가 출발을 받지 않았습니다. 파티 함께 탐사 화면에서 '지금 출발'을 직접 눌러 주세요.\n" + err.slice(0, 80), 'party'); return; } setTimeout(() => { delete SOC.tripAutoDone[id]; }, [30, 120, 600][n - 1] * 1000); }
function syncTripMembers(t) { const p = S.P; if (!nonEmpty(p.long_expedition)) return; const left = Array.isArray(t.leftMembers) ? t.leftMembers : [], uids = [], names = {}, me = myUid();
  for (const u of t.activeMembers || []) { if (left.includes(String(u))) continue; uids.push(String(u)); names[String(u)] = String(u) !== me ? partyNameOf(String(u)) : displayName(); } if (!uids.includes(me)) { uids.push(me); names[me] = displayName(); }
  const tr = p.long_expedition; tr.members = Math.max(1, uids.length); tr.member_uids = uids; tr.member_names = names; }
function partyCourseAlerts() { const me = myUid(); for (const t of PARTY.trips) if (t.status === 'pending' && !tripStale(t) && String(t.leader || '') !== me && (t.participants || []).includes(me)) nhAdd('party-course-' + t.id, '파티 함께 탐사 요청', `${partyNameOf(String(t.leader || ''))}님 · ${Number(t.hours)}시간 · 난이도 ${signed(Number(t.difficulty || 0))} · 파티 › 함께 탐사에서 수락/거절`, 'party'); }
function adoptPartyTrips() { const p = S.P; if (!p || $('app').hidden) return; const me = myUid(); if (!isDict(p.social_done)) p.social_done = {};
  for (const t of PARTY.trips) { const id = String(t.id || ''), parts = t.participants || t.readyMembers || []; if (t.status !== 'active' || !parts.includes(me)) continue;
    if (nonEmpty(p.long_expedition) && String(p.long_expedition.tripId || '') === id) { syncTripMembers(t); continue; } if (nonEmpty(p.long_expedition)) continue;
    if (p.social_done['trip:' + id] || SOC.busy || Date.now() < Number(SOC.cmdRetryAt['trip:' + id] || 0)) continue; if (Number(t.ready || 0) <= nowSec()) { p.social_done['trip:' + id] = true; continue; }
    const hrs = Number(t.hours || 1); let why = ''; if (p.dead) why = '쓰러진 상태'; else if (activityBusy()) why = '다른 활동 중'; else if (Number(p.hunger) < hrs * 10 || Number(p.water) < hrs * 12) why = `허기 ${hrs * 10} · 수분 ${hrs * 12} 이상 필요`; else if (Number(p.region) !== Number(t.regionId ?? -1)) why = '출발 지역이 아님';
    if (why) { act(() => { p.social_done['trip:' + id] = true; notify('party-trip-skip-' + id, '함께 탐사에 합류하지 못했습니다', `${why}라서 이번 함께 탐사에서는 빠졌습니다.`, 'party'); return true; }); continue; }
    socialCall('activatePartyTrip', [id], (res) => { if (!res.ok) return; const P = S.P; if (!isDict(P.social_done)) P.social_done = {}; P.social_done['trip:' + id] = true; const n = Math.max(1, (t.activeMembers || [me]).length);
      const cur = isDict(P.long_expedition) ? P.long_expedition : {}, data = longRecord(hrs, Number(t.regionId), Number(t.difficulty || 0), Number(t.started), Number(t.ready), id, n); Object.assign(data, cur); data.risk_version = 10; P.long_expedition = data; laEnsure(P.long_expedition); syncTripMembers(t);
      notify('party-trip-' + id, '파티 탐사 출발', '수락한 파티원과 같은 코스로 이동합니다. 실제 참가 수만 생존에 보정됩니다.', 'party'); FD.openLongLog = true; LIFE.lastSave = 0; go('long_wait'); },
    (r) => { const err = String(r.error || ''); if (['활성화할 수 없는', '이미 이 코스', '진행 중인 활동', '허기'].some((k) => err.includes(k))) { S.P.social_done['trip:' + id] = true; toast('함께 탐사에 합류하지 못했습니다 · ' + err.slice(0, 60)); } else SOC.cmdRetryAt['trip:' + id] = Date.now() + 15000; }); return; } }

/* ════════ 협력(coop.gd) — 거대 감염체 토벌 · 거점 보수 기부 · 주간 목표 보상 · 구조 신호 · 서버 효과 ════════ */
const COOPX = { bossInfo: {}, bossInfoAt: 0, spawnTried: 0, activeSig: '', activeAt: 0, caught: '' };
const coopMs = () => Date.now() + Number(COOP.off || 0);
const coopBoss = () => (isDict(COOP.state?.boss) ? COOP.state.boss : {});
const coopBuffs = () => (isDict(COOP.state?.buffs) ? COOP.state.buffs : {});
const coopRepair = () => (isDict(COOP.state?.repair) ? COOP.state.repair : {});
const bossActive = () => { const b = coopBoss(); return nonEmpty(b) && !('defeatedAt' in b) && !b.removed && Number(b.endsAt || 0) > coopMs(); };
function leftText(ms) { const s = Math.max(0, Math.trunc(ms / 1000)); if (s >= 86400) { const h = Math.trunc((s % 86400) / 3600); return h > 0 ? `${Math.trunc(s / 86400)}일 ${h}시간` : `${Math.trunc(s / 86400)}일`; } if (s >= 3600) { const m = Math.trunc((s % 3600) / 60); return m > 0 ? `${Math.trunc(s / 3600)}시간 ${m}분` : `${Math.trunc(s / 3600)}시간`; } if (s >= 60) return `${Math.trunc(s / 60)}분`; return `${s}초`; }
const buffName = (id) => String(BD.POSITIVES[id]?.name ?? id);
function coopOnState() { if (!S.P || $('app').hidden) return; COOPX.caught = String(S.acct?.charId ?? ''); coopApplyBuffs(); coopReportActive(); coopMaybeSpawn(); coopNotifyChanges(); if (S.mode === 'coop' && !$('modalRoot').innerHTML) redrawKeep(); }
function coopCatchUp() { if (!COOP.state || !S.P || !coopOnline()) return; const sig = String(S.acct?.charId ?? ''); if (sig === COOPX.caught) return; COOPX.caught = sig; coopApplyBuffs(); coopMaybeSpawn(); coopNotifyChanges(); }
function coopApplyBuffs() { const now = coopMs(); let ch = false; for (const id of CO.BUFF_IDS) { const b = isDict(coopBuffs()[id]) ? coopBuffs()[id] : {}, until = Number(b.until || 0); if (until <= now) continue; const sec = Math.trunc((until - now) / 1000), cur = isDict((S.P.positive || {})[id]) ? S.P.positive[id] : {}, tgt = nowSec() + sec;
  if (!nonEmpty(cur) || Math.abs(Number(cur.until || 0) - tgt) > 90) if (posGrantId(id, sec)) ch = true; } if (ch) { LIFE.dirty = true; rerender(); } }
const coopExpectedHit = () => Math.max(1, Math.min(3000, Math.round(Number(derived().attack) * 2.5 + Number(S.P.level) * 3)));
function coopReportActive() { if (!coopOnline() || !S.P || !S.P.character?.created) return; const sig = `${Number(S.P.level)}|${coopExpectedHit()}`; if (sig === COOPX.activeSig && nowSec() - COOPX.activeAt < 6 * 3600) return; COOPX.activeSig = sig; COOPX.activeAt = nowSec(); call('coopActive', Number(S.P.level), coopExpectedHit(), false); }
function coopMaybeSpawn() { const b = coopBoss(), now = coopMs(), due = !nonEmpty(b) || (('defeatedAt' in b || Number(b.endsAt || 0) < now) && now >= Number(b.nextAt || 0)); if (!due || nowSec() - COOPX.spawnTried < 90) return; COOPX.spawnTried = nowSec(); call('coopBossSpawn', false); }
function coopNotified(key) { const n = coopData().notified; if (key in n) return true; n[key] = nowSec(); const ks = Object.keys(n); if (ks.length > 60) { ks.sort((a, b) => Number(n[a]) - Number(n[b])); for (const k of ks.slice(0, ks.length - 40)) delete n[k]; } return false; }
function coopNotifyChanges() { const now = coopMs(), b = coopBoss(); let any = false;
  if (bossActive() && !coopNotified('boss-' + b.id)) { any = true; alertPopup('coop-boss-' + b.id, '거대 감염체 출현 · ' + String(b.name || ''), `Lv.${Number(b.level || 1)} · 모두가 같은 체력을 깎습니다. 토벌 메뉴에서 10분마다 공격할 수 있습니다. 남은 시간 ${leftText(Number(b.endsAt || 0) - now)}`, 'party'); }
  if ('defeatedAt' in b && !coopNotified('boss-down-' + b.id) && now - Number(b.defeatedAt || 0) < 6 * 3600000) { any = true; alertPopup('coop-boss-down-' + b.id, '거대 감염체 격퇴', String(b.name || '') + "을(를) 모두의 힘으로 쓰러뜨렸습니다. 공격에 참여했다면 토벌 메뉴에서 보상을 받으세요. 서버 전원에게 '습격 격퇴' 효과가 24시간 적용됩니다.", 'party'); }
  for (const id of Object.keys(coopBuffs())) { const bf = isDict(coopBuffs()[id]) ? coopBuffs()[id] : {}; if (Number(bf.until || 0) > now && now - Number(bf.at || 0) < 6 * 3600000 && id !== 'coop_rally' && !coopNotified(`buff-${id}-${Number(bf.at || 0)}`)) { any = true; alertPopup(`coop-repair-${id}-${Number(bf.at || 0)}`, '거점 보수 완료 · ' + String(bf.name || ''), `서버 전원에게 '${buffName(id)}' 효과가 ${leftText(Number(bf.until || 0) - now)} 동안 적용됩니다.`, 'party'); } }
  for (const row of sosList()) if (!coopNotified(`sos-${row.uid}-${row.at}`)) { any = true; alertPopup(`coop-sos-${row.uid}-${row.at}`, '구조 요청 · ' + row.nickname, `같은 대지역(${row.region})에서 구조 신호가 왔습니다 · 체력 ${row.hp}/${row.maxHp}. 퀘스트 › 단체 퀘스트에서 회복품을 보낼 수 있습니다.`, 'party'); }
  if (any) { LIFE.dirty = true; } }
/* 거점 보수 기부 */
function coopDonate(mat, amount) { if (!coopOnline()) { toast('온라인 로그인 후 기부할 수 있습니다.'); return; } const n = Math.min(Math.min(amount, count(mat)), 50); if (n <= 0) { toast(`${mat}이(가) 없습니다.`); return; }
  call('coopDonate', mat, n).then((r) => { if (!r.ok) { toast(r.error || '기부하지 못했습니다.'); return; } const acc = Number(r.accepted || 0); if (acc <= 0) return; const done = isDict(r.completed) ? r.completed : {};
    act(() => { removeItem(mat, acc); coopRecord('donate', acc); questEvent('donate'); gLog(`거점 보수 · ${mat} ${acc}개 기부`); return true; }, () => { toast(`${mat} ${acc}개를 보수 작업에 보탰습니다.`); if (nonEmpty(done)) modal('거점 보수 완료', `<p style="white-space:pre-line">'${esc(done.name || '')}' 보수를 마쳤습니다!\n서버 전원에게 '${esc(buffName(String(done.buff || '')))}' 효과가 3일 동안 적용되고, 다음 보수 단계가 열렸습니다.</p>`); else coopDonateModal(); }); }); }
function coopDonateModal() { const r = coopRepair(); if (!nonEmpty(r)) { toast('보수 정보를 불러오는 중입니다.'); return; } const goal = r.goal || {}, prog = r.progress || {};
  modal('재료 기부 · ' + String(r.project?.name || ''), '<p class="muted">한 번에 재료 하나당 최대 50개까지 보탤 수 있습니다. 목표를 넘는 수량은 받지 않습니다.</p>' + Object.keys(goal).map((m) => { const have = count(m), cur = Number(prog[m] || 0), need = Number(goal[m]);
    return `<div class="panel dncard"><b>${esc(m)} · 보유 ${have}개</b>${cbar(cur, need, cur >= need ? 'var(--accent)' : 'var(--warning)')}<span class="muted">진행 ${cur} / ${need}${cur >= need ? ' · 완료' : ''}</span><div class="brow">${[1, 10, 50].map((a) => `<button class="btn" style="color:var(--accent)" data-dn="${esc(m)}" data-n="${a}" ${have <= 0 || cur >= need || (a !== 50 && have < a) ? 'disabled' : ''}>${a === 50 ? `최대 ${Math.min(50, have)}` : a + '개'}</button>`).join('')}</div></div>`; }).join(''), [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-dn]').forEach((b) => { b.onclick = () => { $('modalRoot').innerHTML = ''; coopDonate(b.dataset.dn, Number(b.dataset.n)); }; }); }
function coopDonorsModal() { const r = coopRepair(); call('coopDonors', Number(r.stage || 0)).then((res) => { if (!res.ok) { toast(res.error || '참여자 목록을 불러오지 못했습니다.'); return; } const mine = isDict(res.mine) ? res.mine : {}, mats = isDict(mine.mats) ? mine.mats : {}, names = res.names || [];
  modal('보수 참여자 · ' + String(r.project?.name || ''), (nonEmpty(mine) ? `<b style="color:var(--accent);font-size:17px">내 기여 · ${Number(res.rank || 0)}위 / ${Number(res.count || 0)}명</b><p style="color:var(--text)">총 ${Number(mine.total || 0)}개 · ${esc(Object.keys(mats).map((k) => `${k} ${Number(mats[k])}`).join(' · '))}</p>` : '<p class="muted">아직 이번 보수에 참여하지 않았습니다. 재료를 보태면 내 기여 순위가 표시됩니다.</p>') + `<b>참여자 ${Number(res.count || 0)}명 · 가나다순</b><p class="muted">${esc(names.length ? names.join(' · ') : '아직 참여자가 없습니다.')}</p>`, [['닫기', '', null]]); }); }
/* 거대 감염체 */
const bossWait = () => Math.max(0, Number(coopData().boss_last) + Number(CO.BOSS_GAP) - nowSec());
function bossBlock() { const p = S.P; if (!coopOnline()) return '온라인 로그인 후 참여할 수 있습니다.'; if (!bossActive()) return '지금은 공격할 감염체가 없습니다.'; if (Number(p.level) < 5) return 'Lv.5부터 참여할 수 있습니다.'; if (p.dead) return '사망 상태에서는 공격할 수 없습니다.'; if (nonEmpty(p.battle)) return '전투를 마친 뒤 공격하세요.';
  if (Number(p.hp) < Math.ceil(Number(p.max_hp) * 0.2)) return '체력이 20% 이상이어야 공격할 수 있습니다.'; if (Number(p.hunger) < 2 || Number(p.water) < 2) return '허기·수분이 각각 2 이상 필요합니다.'; if (bossWait() > 0) return '다음 공격까지 ' + leftText(bossWait() * 1000); return ''; }
const gRandfRange = (a, b) => Math.fround(gRandf() * (b - a) + a);
function bossDamage(b) { const d = derived(), lv = Number(S.P.level), bl = Math.max(1, Number(b.level || 10)); let base = (Number(d.attack) * 2.5 + lv * 3) * gRandfRange(0.85, 1.15); const crit = gRandf() * 100 < Number(d.crit); if (crit) base *= Math.max(1.25, Number(d.crit_dmg ?? 150) / 100);
  const cu = 1 + Math.max(0, Math.min(0.6, (bl - lv) * 0.012)), dealt = Math.max(1, Math.min(3000, Math.round(base * cu))); let taken = 0; const ev = gRandf() * 100 < Number(d.evade);
  if (!ev) { const sc = Math.max(0.35, Math.min(1, 0.35 + 0.65 * lv / bl)); taken = Math.max(1, Math.round(Number(b.atk ?? 25) * sc * gRandfRange(0.8, 1.2) - Number(d.defense) * 0.6)); } return { dealt, crit, taken, evaded: ev, catchup: cu }; }
function bossAttack() { const why = bossBlock(); if (why) { toast(why); return; } const b = coopBoss(), roll = bossDamage(b); coopData().boss_last = nowSec();
  call('coopBossAttack', String(b.id || ''), roll.dealt).then((res) => { if (!res.ok) { coopData().boss_last = 'wait' in res ? nowSec() + Number(res.wait) - Number(CO.BOSS_GAP) : 0; toast(res.error || '공격하지 못했습니다.'); return; }
    let parts = String(COOPX.bossInfo.id || '') === String(b.id) ? Number(COOPX.bossInfo.participants || 0) : 0; if (Number(res.myCount || 0) === 1) parts++; COOPX.bossInfo = { mine: { dmg: Number(res.myDmg || 0), count: Number(res.myCount || 0) }, id: String(b.id || ''), participants: Math.max(1, parts) };
    const cur = coopBoss(); if (String(cur.id || '') === String(b.id)) { cur.hp = Number(res.hp ?? cur.hp ?? 0); if (res.defeated) { cur.defeatedAt = coopMs(); cur.nextAt = Math.max(Number(cur.nextAt || 0), coopMs() + 3 * 3600000); } }
    let line = `${b.name || '감염체'}에게 ${Number(res.dealt || 0)} 피해${roll.crit ? ' · 치명타!' : ''}`; line += roll.evaded ? ' · 반격 회피' : ` · 반격으로 체력 -${roll.taken}`;
    act(() => { const p = S.P, floor = guardActive() ? Math.max(1, guardHpFloor()) : 1; p.hp = Math.max(Math.min(Number(p.hp), floor), Number(p.hp) - roll.taken); p.hunger = Math.max(0, Number(p.hunger) - 1); p.water = Math.max(0, Number(p.water) - 1); coopRecord('boss', 1); questEvent('boss_hit'); const c = cityData(); c.boss = Number(c.boss) + 1; questEvent('city_points', Number(CL.BOSS_POINT)); FD.cityReport = true; gLog('거대 감염체 · ' + line); return true; },
      () => { let body = line + `\n남은 감염체 체력 ${Number(res.hp || 0)} · 내 누적 피해 ${Number(res.myDmg || 0)} (${Number(res.myCount || 0)}회)\n다음 공격은 10분 뒤에 할 수 있습니다.`; if (roll.catchup > 1.01) body += `\n레벨 보정으로 주는 피해 +${Math.round((roll.catchup - 1) * 100)}%`; if (res.defeated) body += '\n\n마지막 일격! 감염체를 쓰러뜨렸습니다. 보상은 토벌 메뉴에서 받으세요.'; modal('거대 감염체 공격', `<p style="white-space:pre-line;color:var(--text)">${esc(body)}</p>`); }); }); }
function loadBossInfo() { const b = coopBoss(); if (!nonEmpty(b) || Date.now() - COOPX.bossInfoAt < 15000) return; COOPX.bossInfoAt = Date.now(); call('coopBossMine', String(b.id || '')).then((r) => { if (!r.ok) return; COOPX.bossInfo = clone(r); COOPX.bossInfo.id = String(b.id || ''); if (S.mode === 'coop' && !$('modalRoot').innerHTML) redrawKeep(); }); }
function bossReward(b, n) { const hits = Math.min(n, 12), lv = Number(b.level ?? 10), items = { 고철: 2 * hits, 전선: hits }; if (hits >= 3) items['응급키트'] = 1; if (hits >= 8) items['부품'] = 3; return { xp: (40 + lv * 2) * hits, coins: 3 * hits, items }; }
function bossItemsRoll(bossId, uid, hits, owned) { const rng = new GRng(godotHash(`${bossId}|${uid}|boss-loot`)), out = [], h = Math.min(hits, 12);
  if (rng.randf() < 0.10 + 0.04 * h) { const names = Object.keys(D.boss_items.EQUIPMENT), fresh = names.filter((n) => !owned(n)), pool = fresh.length ? fresh : names; out.push(pool[rng.randiRange(0, pool.length - 1)]); }
  const w = { '감염체 핵 정수': 15, '토벌 영웅의 각인': 10, '감염체 항체 혈청': 25, '토벌 전투 영약': 30, '토벌 경험의 서': 20 }; for (let i = 0; i < (h >= 3 ? 1 : 0) + (h >= 8 ? 1 : 0); i++) { let tot = 0; for (const k in w) tot += w[k]; let r = rng.randiRange(1, tot); for (const k in w) { r -= w[k]; if (r <= 0) { out.push(k); break; } } } return out; }
function bossClaim() { const b = coopBoss(), id = String(b.id || ''); if (!('defeatedAt' in b) || coopData().boss_claimed[id]) return; const mine = String(COOPX.bossInfo.id || '') === id && isDict(COOPX.bossInfo.mine) ? COOPX.bossInfo.mine : {}, n = Number(mine.count || 0);
  if (n <= 0) { toast('이번 감염체 공격에 참여한 기록이 없습니다.'); return; } const r = bossReward(b, n), extra = bossItemsRoll(id, myUid(), n, (nm) => count(nm) > 0 || Object.values(S.P.equipment || {}).includes(nm)); for (const nm of extra) r.items[nm] = Number(r.items[nm] || 0) + 1;
  coopData().boss_claimed[id] = true; call('coopClaim', 'boss-' + id.replace(/ /g, '')).then((res) => { if (!res.ok) { toast(res.error || '이미 받은 보상입니다.'); rerender(); return; } coopGive(r, '거대 감염체 보상', () => questEvent('boss_claim')); }); }
function coopGive(r, title, pre) { const parts = []; act(() => { const p = S.P; if (pre) pre(); if (Number(r.coins || 0) > 0) { p.coins = Number(p.coins || 0) + Number(r.coins); parts.push(`코인 ${Number(r.coins)}`); } if (Number(r.points || 0) > 0) { p.skill_points = Number(p.skill_points) + Number(r.points); parts.push(`능력치 포인트 ${Number(r.points)}`); }
    const items = isDict(r.items) ? r.items : {}; for (const it in items) { const n = Number(items[it]); if (n <= 0) continue; markFoundGear(it, n); if (!addItem(it, n)) p.stored_loot[it] = Number(p.stored_loot[it] || 0) + n; parts.push(`${it} ${n}`); }
    if (Number(r.xp || 0) > 0) { parts.unshift(`경험치 ${Number(r.xp)}`); addXp(Number(r.xp)); } gLog(`[color=#e3b341]${title}[/color] · ${parts.join(', ')}`); return true; }, () => modal(title, `<p style="white-space:pre-line">${esc(parts.join(', ') + '\n가방이 가득하면 받은 물품함으로 들어갑니다.')}</p>`)); }
function weeklyClaimable() { if (!nonEmpty(COOP.weekly) || !S.P) return 0; const cl = coopData().claimed[coopWeekKey()] || []; let n = 0; for (const q of CO.WEEK_QUESTS) if (!cl.includes(q.id) && weeklyTotal(q.id) >= goalOf(q) && weeklyMine(q.id) >= Number(q.min)) n++; return n; }
function claimWeekly(qid) { const q = CO.WEEK_QUESTS.find((x) => x.id === qid); if (!q) return; const wk = coopWeekKey(), c = coopData(), cl = [...(c.claimed[wk] || [])]; if (cl.includes(q.id) || weeklyTotal(q.id) < goalOf(q) || weeklyMine(q.id) < Number(q.min)) return;
  cl.push(q.id); c.claimed = { [wk]: cl }; call('coopClaim', `week-${wk}-${q.id}`).then((res) => { if (!res.ok) { toast(res.error || '이미 받은 보상입니다.'); rerender(); return; } coopGive(q.reward, '서버 주간 목표 · ' + q.title); }); }
/* 구조 신호 */
function mySos() { const all = isDict(COOP.state?.sos) ? COOP.state.sos : {}, s = isDict(all[myUid()]) ? all[myUid()] : {}; if (!nonEmpty(s) || Number(s.at || 0) < coopMs() - Number(CO.SOS_LIFE_MS)) return {}; return s; }
function sosBlock() { const p = S.P; if (!coopOnline()) return '온라인 로그인 후 사용할 수 있습니다.'; if (!nonEmpty(p.long_expedition)) return '장기 탐사 중에만 구조 신호를 보낼 수 있습니다.'; if (p.dead) return '사망 상태에서는 보낼 수 없습니다. 같은 지역 생존자의 소생을 기다리세요.';
  if (Number(p.hp) > Math.trunc(Number(p.max_hp) * 0.4)) return '체력이 40% 이하일 때 보낼 수 있습니다.'; const m = mySos(); if (nonEmpty(m)) return '이미 구조 신호를 보냈습니다 · ' + leftText(Number(m.at || 0) + Number(CO.SOS_LIFE_MS) - coopMs()) + ' 동안 유지'; return ''; }
function sendSos() { const why = sosBlock(); if (why) { toast(why); return; } const p = S.P, gi = Number(p.region || 0);
  call('coopSos', JSON.stringify({ regionId: gi, region: String(GD.REGIONS[gi].name), hp: Number(p.hp), maxHp: Number(p.max_hp), level: Number(p.level) })).then((r) => { if (r.ok) { act(() => { gLog('구조 신호를 보냈다. 같은 대지역의 생존자가 회복품을 보내 줄 수 있다.'); return true; }); toast('구조 신호를 보냈습니다 · 30분 동안 유지됩니다.'); } else toast(r.error || '신호를 보내지 못했습니다.'); rerender(); }); }
const cancelSos = () => call('coopSosCancel').then(() => rerender());
function coopSosAutoCancel() { if (!nonEmpty(mySos())) return; const p = S.P; if (!nonEmpty(p.long_expedition) || Number(p.hp) > Math.trunc(Number(p.max_hp) * 0.7) || p.dead) cancelSos(); }
function sosList() { const out = [], all = isDict(COOP.state?.sos) ? COOP.state.sos : {}, me = myUid(), gi = Number(S.P?.region ?? -1);
  for (const uid in all) { const s = isDict(all[uid]) ? all[uid] : {}; if (uid === me || !nonEmpty(s) || Number(s.at || 0) < coopMs() - Number(CO.SOS_LIFE_MS)) continue; if (Number(s.regionId ?? -2) !== gi) continue; const hp = isDict(s.helpers) ? s.helpers : {};
    out.push({ uid, nickname: String(s.nickname || '생존자'), region: String(s.region || ''), hp: Number(s.hp || 0), maxHp: Number(s.maxHp || 1), level: Number(s.level || 1), at: Number(s.at || 0), helped: me in hp, helpers: Object.keys(hp).length }); }
  return out.sort((a, b) => b.at - a.at); }
const healItemsCo = () => Object.keys(S.P.inventory || {}).filter((n) => String(GD.ITEMS[n]?.cat || '') === '회복' && Number(GD.ITEMS[n]?.hp || 0) > 0 && count(n) > 0).sort((a, b) => Number(GD.ITEMS[a].hp) - Number(GD.ITEMS[b].hp));
function rescueTitle() { const p = Number(coopData().rescue_points); if (p >= 50) return '칭호 · 서울의 등불'; if (p >= 20) return '칭호 · 거점 수호자'; if (p >= 5) return '칭호 · 구조대원'; return '구조 포인트 5점부터 칭호가 생깁니다'; }
function sosHelpModal(row) { const items = healItemsCo(), rec = Number(derived().recover);
  modal('구조 물품 보내기 · ' + row.nickname, `<p class="muted" style="white-space:pre-line">${esc(`${row.region} · Lv.${row.level} · 체력 ${row.hp}/${row.maxHp}\n회복품 1개를 보내면 상대가 받는 즉시 체력이 회복됩니다. 신호 하나에 한 번만 보낼 수 있습니다.`)}</p>${items.length ? '' : '<p style="color:var(--warning)">가방에 보낼 수 있는 회복품이 없습니다.</p>'}${items.map((it) => { const amt = Math.min(400, Math.round(Number(GD.ITEMS[it].hp) * 1.2 * rec / 100)); return `<button class="btn" style="color:var(--accent)" data-aid="${esc(it)}" data-amt="${amt}">${esc(it)} 보내기 · 체력 +${amt} (보유 ${count(it)})</button>`; }).join('')}`, [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-aid]').forEach((b) => { b.onclick = () => { $('modalRoot').innerHTML = ''; sendAid(row, b.dataset.aid, Number(b.dataset.amt)); }; }); }
function sendAid(row, item, amt) { if (count(item) <= 0) return; call('coopAid', row.uid, item, amt).then((res) => { if (!res.ok) { toast(res.error || '보내지 못했습니다.'); return; } let gained = 0;
  act(() => { removeItem(item, 1); const c = coopData(), today = new Date(kstNow() * 1000).toISOString().slice(0, 10); if (String(c.rescue_day) !== today) { c.rescue_day = today; c.rescue_today = 0; } if (Number(c.rescue_today) < Number(CO.RESCUE_DAILY_CAP)) { c.rescue_today = Number(c.rescue_today) + 1; c.rescue_points = Number(c.rescue_points) + 1; gained = 1; addXp(30); } gLog(`구조 · ${row.nickname}에게 ${item}을(를) 보냈다.`); questEvent('aid'); return true; },
    () => modal('구조 물품 전달', `<p style="white-space:pre-line">${esc(`${row.nickname}에게 ${item}을(를) 보냈습니다.${gained > 0 ? '\n구조 포인트 +1 · 경험치 +30' : '\n오늘 구조 포인트 한도(10)에 도달했습니다.'}\n누적 구조 포인트 ${Number(coopData().rescue_points)} · ${rescueTitle()}`)}</p>`)); }); }
function coopOnAid(r) { if (!r.ok || !S.P || $('app').hidden) return; const rows = Array.isArray(r.aid) ? r.aid.filter(isDict) : []; if (!rows.length) return; const ids = rows.map((x) => String(x.id || ''));
  actWhenFree(() => { const seen = coopData().aid_seen; for (const row of rows) { const id = String(row.id || ''); if (id in seen) continue; seen[id] = nowSec(); if (S.P.dead) continue; const before = Number(S.P.hp); S.P.hp = Math.min(Number(S.P.max_hp), before + Number(row.amount || 0));
      notify('coop-aid-' + id, '구조 물품 도착', `${row.nickname || '생존자'}님이 ${row.item || '회복품'}을(를) 보냈습니다 · 체력 +${Number(S.P.hp) - before}`, 'party'); gLog(`구조 물품 도착 · ${row.nickname || ''} · ${row.item || ''} · 체력 +${Number(S.P.hp) - before}`); }
    const ks = Object.keys(seen); if (ks.length > 50) { ks.sort((a, b) => Number(seen[a]) - Number(seen[b])); for (const k of ks.slice(0, ks.length - 30)) delete seen[k]; } return true; }, () => call('coopAidTaken', JSON.stringify(ids))); }
function sosBox(minePart) { let h = groupLab(minePart ? '구조 신호' : '구조 요청 돕기 · 같은 대지역') + '<div class="ccard">'; const m = mySos();
  if (minePart && nonEmpty(m)) h += `<b style="color:var(--warning)">내 구조 신호가 켜져 있습니다</b><p class="muted">같은 대지역 생존자가 회복품을 보내면 바로 체력이 회복됩니다 · ${leftText(Number(m.at || 0) + Number(CO.SOS_LIFE_MS) - coopMs())} 남음</p><div class="brow"><button class="btn" data-sosoff>신호 끄기</button></div>`;
  else if (minePart) { const why = sosBlock(); h += `<p class="muted">${why ? '장기 탐사 중 체력이 40% 이하이면 같은 대지역 생존자에게 도움을 청할 수 있습니다.' : '지금 구조 신호를 보낼 수 있습니다.'}</p><div class="brow"><button class="btn" style="color:var(--warning)" data-soson ${why ? 'disabled' : ''}>${esc(why || '구조 신호 보내기')}</button></div>`; }
  const rows = sosList(); COOPX.sosRows = rows; if (!rows.length) h += '<p class="subtle" style="font-size:13px">지금 이 대지역에 구조를 기다리는 생존자가 없습니다.</p>';
  rows.forEach((r, i) => { h += `<div class="brow"><button class="btn" style="color:var(--accent)" data-sosh="${i}" ${r.helped ? 'disabled' : ''}>${esc(`${r.nickname} · Lv.${r.level} · 체력 ${r.hp}/${r.maxHp}${r.helped ? ' · 보냄' : ''}`)}</button></div>`; });
  return h + `<p class="subtle" style="font-size:12px">내 구조 포인트 ${Number(coopData().rescue_points)} · ${esc(rescueTitle())}</p></div>`; }
function bindCoopBits(c) { c.querySelectorAll('[data-codn]').forEach((b) => { b.onclick = coopDonateModal; }); c.querySelectorAll('[data-codo]').forEach((b) => { b.onclick = coopDonorsModal; });
  c.querySelectorAll('[data-wkc]').forEach((b) => { b.onclick = () => claimWeekly(b.dataset.wkc); }); c.querySelectorAll('[data-sosoff]').forEach((b) => { b.onclick = cancelSos; }); c.querySelectorAll('[data-soson]').forEach((b) => { b.onclick = sendSos; });
  c.querySelectorAll('[data-sosh]').forEach((b) => { b.onclick = () => sosHelpModal(COOPX.sosRows[Number(b.dataset.sosh)]); }); const a = $('bossAtk'); if (a) a.onclick = bossAttack; const cl = $('bossClaim'); if (cl) cl.onclick = bossClaim; }
/* 토벌 화면 */
function coopPage() { let h = headT('거대 감염체 토벌', '서버 전체가 함께 쓰러뜨리고, 참여한 만큼 보상을 받습니다'); if (!coopOnline()) return h + noteBox('로그인 후 이용할 수 있습니다.'); coopEnsure(); if (!COOP.state) return h + noteBox('서버 정보를 불러오는 중입니다…');
  loadBossInfo(); const now = coopMs(), b = coopBoss(), id = String(b.id || ''), mine = String(COOPX.bossInfo.id || '') === id && isDict(COOPX.bossInfo.mine) ? COOPX.bossInfo.mine : {}; h += groupLab('거대 감염체');
  if (!nonEmpty(b)) h += '<div class="ccard"><p class="muted">곧 첫 습격이 시작됩니다. 잠시 뒤 다시 확인하세요.</p></div>';
  else if (bossActive()) { const why = bossBlock(), part = String(COOPX.bossInfo.id || '') === id ? Number(COOPX.bossInfo.participants || 0) : 0;
    h += `<div class="bosshero"><div class="bhd"><span class="btag">거대 감염체</span><b class="bnm">${esc(b.name || '')}</b><em>Lv.${Number(b.level || 1)}</em><span class="muted bleft">남은 시간 ${leftText(Number(b.endsAt || 0) - now)}</span></div><div class="bhp"><span class="muted">체력</span><b>${comma(Number(b.hp || 0))} / ${comma(Number(b.maxHp || 1))}</b></div>${cbar(Number(b.hp || 0), Number(b.maxHp || 1), 'var(--danger)').replace('class="cbar"', 'class="cbar big"')}
      <div class="batk"><button class="btn dangerfill" id="bossAtk" ${why ? 'disabled' : ''}>${esc(why || '감염체 공격하기')}</button><span class="muted">공격 대기 10분 · 참여 ${part}명 · 내 기여 피해 ${Number(mine.dmg || 0)} (공격 ${Number(mine.count || 0)}회)</span></div>${'players' in b ? `<p class="subtle" style="font-size:11px;margin:0">체력은 최근 3일 접속한 생존자 ${Number(b.players || 0)}명(GM 제외)의 레벨·공격력에 맞춰 정해졌습니다. 잡을 때마다 다음 감염체가 조금씩 강해집니다.</p>` : ''}</div>`; }
  else if ('defeatedAt' in b) { const next = Number(b.nextAt || 0) - now, claimed = !!coopData().boss_claimed[id], n = Number(mine.count || 0); h += `<div class="ccard"><b style="color:var(--accent);font-size:17px">격퇴 완료 · ${esc(b.name || '')}</b><p class="muted">${next > 0 ? `다음 습격까지 ${leftText(next)} · 서버 전원 '습격 격퇴' 효과 24시간` : '곧 다음 습격이 시작됩니다.'}</p>`;
    if (n > 0) { const r = bossReward(b, n); h += `<p style="color:var(--text)">내 기여 · 피해 ${Number(mine.dmg || 0)} · 공격 ${n}회 → 경험치 ${r.xp} · 코인 ${r.coins} · 재료</p><p style="color:var(--warning);font-size:12px">토벌 전용 보상 · 장비 확률 ${Math.round((0.10 + 0.04 * Math.min(n, 12)) * 100)}% · 전용 소모품 ${(n >= 3 ? 1 : 0) + (n >= 8 ? 1 : 0)}개 (공격 3회 이상 1개, 8회 이상 2개)</p><div class="brow"><button class="btn warnfill" id="bossClaim" ${claimed ? 'disabled' : ''}>${claimed ? '보상 받음' : '보상 받기'}</button></div>`; }
    else h += '<p class="subtle">이번 습격에는 참여하지 않았습니다.</p>'; h += '</div>'; }
  else if (b.removed) { const w = Number(b.nextAt || 0) - now; h += `<div class="ccard"><b class="muted" style="font-size:17px">거대 감염체 · 쉬는 중</b><p class="muted">${w < 30 * 86400000 ? `관리자가 감염체를 철수시켰습니다. 다음 습격까지 ${leftText(w)}` : '관리자가 감염체를 철수시켰습니다. 다음 습격은 관리자가 다시 열면 시작됩니다.'}</p></div>`; }
  else h += `<div class="ccard"><b class="muted" style="font-size:17px">${esc(b.name || '')} · 퇴각</b><p class="muted">제한 시간 안에 쓰러뜨리지 못해 감염체가 물러났습니다. 다음 습격까지 ${leftText(Number(b.nextAt || 0) - now)}</p></div>`;
  h += cityCard(true); const act0 = CO.BUFF_IDS.filter((x) => Number(coopBuffs()[x]?.until || 0) > now).map((x) => `${buffName(x)} ${leftText(Number(coopBuffs()[x].until) - now)}`); if (act0.length) h += `<div class="ccard"><b style="color:var(--accent)">서버 효과 적용 중</b><p style="color:var(--text)">${esc(act0.join(' · '))}</p></div>`;
  return h; }
function bindCoop() { bindCoopBits($('center')); bindCityCard(); }
/* 관리자 · 협력 이벤트 도구 */
function coopGmTools() { const pk = { species: '', minutes: 60 }, b = coopBoss(); let now = '지금: 감염체 없음'; if (bossActive()) now = `지금: ${b.name || ''} · Lv.${Number(b.level || 1)} · 체력 ${Number(b.hp || 0)} / ${Number(b.maxHp || 1)}`; else if (b.removed) now = '지금: 철수 상태'; else if ('defeatedAt' in b) now = '지금: 격퇴 후 휴식 중';
  modal('관리자 · 협력 · 이벤트', `<b>반려동물 출현 이벤트</b><p class="muted">정한 시간 동안 거점에 들어오는 모든 플레이어에게 동물이 나타납니다. 나중에 접속한 사람도 남은 시간 안이면 만날 수 있습니다. 진행 중인 거점 사건이 있으면 끝난 뒤 나타납니다.</p><div class="pills">${['', ...Object.keys(PD.SPECIES)].map((s) => `<button class="pill" data-gsp="${esc(s)}">${esc(s || '무작위')}</button>`).join('')}</div><div class="pills">${[30, 60, 180, 360, 720, 1440].map((m) => `<button class="pill" data-gmin="${m}">${leftText(m * 60000)}</button>`).join('')}</div><p id="gpInfo" style="color:var(--accent);margin:0"></p><button class="btn primary" id="gpGo">이벤트 시작</button><button class="btn" id="gpStop">진행 중인 동물 이벤트 끝내기</button>
    <b>거대 감염체</b><p style="color:var(--text)">${esc(now)}</p><p class="muted">즉시 소환은 서버 인원·레벨로 새 감염체를 만듭니다. 진행 중인 감염체가 있으면 새 감염체로 바뀝니다. 철수는 지금 감염체를 없애고 정한 시간 동안 자동 소환을 멈춥니다(보상 없음).</p><button class="btn" style="color:var(--danger)" id="gbSp">거대 감염체 즉시 소환</button><div class="pills">${[[1, '감염체 철수 · 1시간 뒤 다시'], [6, '철수 · 6시간 뒤'], [24, '철수 · 하루 뒤'], [0, '철수 · 자동 소환 멈춤']].map(([h, l]) => `<button class="pill" data-grm="${h}">${l}</button>`).join('')}</div>`, [['닫기', '', null]]);
  const r = $('modalRoot'), info = () => { $('gpInfo').textContent = `선택 · ${pk.species || '무작위'} · ${leftText(pk.minutes * 60000)}`; }; info();
  r.querySelectorAll('[data-gsp]').forEach((x) => { x.onclick = () => { pk.species = x.dataset.gsp; info(); }; }); r.querySelectorAll('[data-gmin]').forEach((x) => { x.onclick = () => { pk.minutes = Number(x.dataset.gmin); info(); }; });
  $('gpGo').onclick = () => call('coopPetEvent', pk.species, pk.minutes).then((res) => { toast(res.ok ? '반려동물 출현 이벤트를 시작했습니다.' : res.error || '실패'); if (res.ok) r.innerHTML = ''; });
  $('gpStop').onclick = () => call('coopPetEvent', '', 0).then((res) => toast(res.ok ? '동물 이벤트를 끝냈습니다.' : res.error || '실패'));
  $('gbSp').onclick = () => call('coopBossSpawn', true).then((res) => { const ok = res.ok && res.spawned; toast(ok ? '거대 감염체를 소환했습니다. 토벌 메뉴에서 확인할 수 있습니다.' : res.error || '소환하지 못했습니다. (쪽지 관리자 등록 확인)'); if (ok) r.innerHTML = ''; });
  r.querySelectorAll('[data-grm]').forEach((x) => { x.onclick = () => { const h = Number(x.dataset.grm); call('coopBossRemove', h).then((res) => { toast(res.ok ? '감염체를 철수시켰습니다.' + (h > 0 ? ` ${h}시간 뒤 다시 나타납니다.` : ' 다시 소환할 때까지 나타나지 않습니다.') : res.error || '철수시키지 못했습니다.'); if (res.ok) r.innerHTML = ''; }); }; }); }

/* ════════ 1:1 모의결투(player_duels.gd) ════════ */
const DUEL = { entries: [], current: {}, sel: '', slot: '', slotSt: '', claimDl: 0, retryAt: 0, error: '', owner: '', seen: {}, credits: [], claiming: false, pending: '', pendingUntil: 0, watchId: '', readEp: 0, ep: 0, autoDecline: {}, autoCancelDone: {}, shown: {}, acceptLater: {}, acting: false, autoActAt: 0, board: false, clockSig: '' };
const DW = Number(D.player_duels?.REQUEST_WINDOW || 30);
const duelTerminal = (s) => ['finished', 'declined', 'cancelled', 'expired'].includes(s);
function duelBusy() { const c = DUEL.current, a = DUEL.slotSt === 'active' || (c.status === 'active' && !!(c.members || {})[myUid()]); if (!a) return false; const u = Number(c.updatedAt || 0); return !(u > 0 && nowSec() - u > 600); }
const duelIncoming = () => DUEL.entries.filter((d) => String(d.to || '') === myUid() && d.status === 'pending' && Number(d.createdAt || 0) > 0 && nowSec() < Number(d.createdAt) + DW && !DUEL.autoDecline[d.id]).length;
function duelApplyCurrent(rec) { const nid = String(rec.id || ''), ns = String(rec.status || ''), oid = String(DUEL.current.id || ''), os = String(DUEL.current.status || '');
  if (nid && nid === oid && duelTerminal(os) && !duelTerminal(ns)) return; if (nid && nid === oid && !duelTerminal(ns) && Number(rec.round || 0) < Number(DUEL.current.round || 0)) return;
  DUEL.current = rec; if (nid && nid === DUEL.slot && duelTerminal(ns)) { DUEL.slot = ''; DUEL.slotSt = ''; } }
function duelApplySlot(rec) { const nid = String(rec.id || ''), ns = String(rec.status || ''); if (['pending', 'active'].includes(ns) && nid) { if (nid === String(DUEL.current.id || '') && duelTerminal(String(DUEL.current.status || ''))) return; DUEL.slot = nid; DUEL.slotSt = ns; duelWatch(nid); } else { if (DUEL.slot && nid && nid !== DUEL.slot) return; DUEL.slot = ''; DUEL.slotSt = ''; } }
const duelErr = (v) => { const t = String(v ?? '').trim(); return !t || t === '{}' ? '결투 요청 실패 · 서버가 오류 상세를 보내지 않았습니다. 다시 시도해도 반복되면 운영자에게 발생 시각을 알려 주세요.' : t; };
function duelsSubscribe() { if (!LIVE.on || DUEL.owner === myUid()) return; DUEL.owner = myUid(); const ep = ++DUEL.ep;
  sub('watchDuels', [], (r) => { if (ep !== DUEL.ep) return; if (!r.ok) { DUEL.error = duelErr(r.error || '결투 목록 연결 실패'); duelRedrawMenu(); return; }
    if (Array.isArray(r.duels)) { DUEL.entries = r.duels; for (const d of DUEL.entries) { const id = String(d.id || ''); if (d.status !== 'pending') propDrop('duel:' + id);
        if (String(d.to || '') === myUid() && d.status === 'pending' && !DUEL.seen[id] && Number(d.createdAt || 0) > 0) { DUEL.seen[id] = true;
          if (!S.P || $('app').hidden || activityBusy() || S.P.dead || Number(S.P.money || 0) < 200 || nowSec() >= Number(d.createdAt) + DW) DUEL.autoDecline[id] = true;
          else { nhAdd('duel:' + id, '1:1 결투 요청', `${d.fromName || '생존자'}님이 모의결투를 요청했습니다. ${DW}초 안에 수락하세요. 수락 시 200원이 임시보관됩니다.`, 'duel', { id }); const left = Math.max(1, Number(d.createdAt) + DW - nowSec());
            propShow('duel:' + id, '1:1 결투 요청', `${d.fromName || '생존자'}님이 모의결투를 신청했습니다.\n수락하면 양쪽 200원이 임시보관되고 승자가 400원을 받습니다. 실제 체력은 줄지 않습니다.`, [['수락', 'var(--accent)', () => { if (DUEL.pending || SOC.busy) { DUEL.acceptLater[id] = true; toast('결투 수락을 처리하는 중입니다…'); return; } duelCall('duelRespond', [id, 'accept'], () => duelOpen(id)); }], ['거절', '', () => duelCall('duelRespond', [id, 'decline'])]], left, () => { DUEL.autoDecline[id] = true; }); } } } }
    if (isDict(r.slot)) duelApplySlot(r.slot); duelRedrawMenu(); });
  sub('watchDuelCredits', [], (r) => { if (ep !== DUEL.ep) return; if (r.ok) DUEL.credits = Array.isArray(r.credits) ? r.credits : []; else DUEL.error = duelErr(r.error || '정산 연결 실패'); }); }
function duelWatch(id, force = false) { if (!id || (id === DUEL.watchId && !force)) return; DUEL.watchId = id; const ep = DUEL.ep; unsubK('duelCurrent');
  sub('watchDuel', [id], (r) => { if (ep !== DUEL.ep || DUEL.watchId !== id) return; if (!r.ok) { DUEL.error = duelErr(r.error || '결투 연결 실패'); duelBoard(); duelRedrawMenu(); return; }
    const was = duelBusy(), before = String(DUEL.current.id || '') === id ? String(DUEL.current.status || '') : ''; duelApplyCurrent(isDict(r.duel) ? r.duel : {}); DUEL.error = '';
    if (DUEL.current.status === 'finished' && String(DUEL.current.id || '') === id && !DUEL.shown[id] && (before === 'active' || was)) { DUEL.shown[id] = true; DUEL.sel = id; duelModal('결투 종료'); return; }
    if (DUEL.current.status === 'active' && !was) act(() => { notify('duel-start:' + id, '모의결투 시작', '양쪽 동의가 확인됐습니다. 실제 캐릭터 피해 없이 가상체력으로 진행합니다.', 'duel', { id }); return true; });
    if (DUEL.sel === id) duelBoard(); duelRedrawMenu(); });
  const re = ++DUEL.readEp; call('readDuel', id).then((r) => { if (ep !== DUEL.ep || re !== DUEL.readEp || DUEL.sel !== id) return; if (!r.ok) DUEL.error = duelErr(r.error || '서버 기록 재조회 실패'); else if (isDict(r.duel)) { duelApplyCurrent(r.duel); DUEL.error = ''; } duelBoard(); duelRedrawMenu(); }); }
const duelReload = () => { if (DUEL.sel) duelWatch(DUEL.sel, true); };
function duelCall(method, args, done) { if (!LIVE.on) return; if (DUEL.pending || SOC.busy) { toast('결투 요청을 처리하는 중입니다. 결과가 반영될 때까지 기다려 주세요.'); return; } DUEL.pending = method; DUEL.pendingUntil = nowSec() + 25;
  socialCall(method, args, (res) => { DUEL.pending = ''; DUEL.pendingUntil = 0; if (isDict(res.duel)) { DUEL.current = res.duel; DUEL.sel = String(DUEL.current.id || ''); duelWatch(DUEL.sel); } if (done) done(res); duelBoard(); },
    (res) => { DUEL.pending = ''; DUEL.pendingUntil = 0; if (method === 'claimDuelCredit') DUEL.claiming = false; DUEL.error = duelErr(res.error || '결투 요청 실패'); duelReload(); duelBoard(); duelRedrawMenu(); }); }
const duelWaiting = () => !!DUEL.pending && (SOC.busy || nowSec() < DUEL.pendingUntil);
const duelNameFor = (id, d) => (id === String(d.from || '') ? String(d.fromName || '생존자') : id === String(d.to || '') ? String(d.toName || '생존자') : '상대');
function duelSummary(d) { const L = [], st = String(d.status || ''), w = String(d.winner || ''), a = String(d.lastAction || ''), actor = duelNameFor(String(d.actor || ''), d);
  if (st === 'finished') { if (!w) L.push('승자가 기록되지 않은 무승부입니다. 양쪽 보관금은 반환됩니다.'); else if (w === myUid()) L.push('서버 기록상 당신이 승자로 확정됐습니다. 보관금을 포함해 400원이 정산 대상입니다.'); else if ([String(d.from || ''), String(d.to || '')].includes(w)) L.push('서버 기록상 상대가 승자로 확정됐습니다. 당신의 보관금 200원은 승리 보상에 포함됩니다.'); else L.push('승자 식별값을 확인할 수 없어 승패를 단정해 표시하지 않습니다.');
    const am = { resign: `${actor}님이 포기를 선택해 결투가 종료됐습니다.`, timeout: `${actor}님이 상대 행동시간 경과를 확인해 정산을 요청했습니다.`, draw: '최대 결투시간 경과에 따라 무승부 정산이 선택됐습니다.', heavy: `${actor}님이 마지막으로 강공을 선택했습니다. 강공 반동은 가상 체력에만 적용됩니다.`, attack: `${actor}님이 마지막으로 공격을 선택했습니다.`, guard: `${actor}님이 마지막으로 방어를 선택했습니다.` }; if (am[a]) L.push(am[a]); if (Number(d.round || 0) >= 60) L.push('기록상 최대 60번째 행동까지 진행되어 무승부로 종료됐습니다.'); }
  if ('hpA' in d && 'hpB' in d) L.push(`종료 기록의 가상 체력 · ${d.fromName || '생존자'} ${Number(d.hpA || 0)}/100 · ${d.toName || '생존자'} ${Number(d.hpB || 0)}/100`);
  const fa = isDict(d.fighterA) ? d.fighterA : {}, fb = isDict(d.fighterB) ? d.fighterB : {}; if (nonEmpty(fa) && nonEmpty(fb)) L.push(`기록된 전투 수치 · ${d.fromName || '생존자'} 공격 ${Number(fa.atk || 0)}·방어 ${Number(fa.def || 0)} / ${d.toName || '생존자'} 공격 ${Number(fb.atk || 0)}·방어 ${Number(fb.def || 0)}`);
  L.push('이 결투 기록에는 회피·치명타·개별 피해량이 저장되지 않아, 해당 결과를 단정해 표시하지 않습니다.'); return L; }
function duelChallenge(peer) { if (!LIVE.on) { modal('로그인이 필요합니다', '<p>계정으로 입장한 뒤 실제 접속자를 선택해 주세요.</p>'); return; } if (String(peer.uid || '') === myUid()) { toast('본인과 결투할 수 없습니다.'); return; } if (activityBusy()) { toast('진행 중인 활동을 마친 뒤 요청해 주세요.'); return; } if (Number(S.P.money) < 200) { toast('소지금 200원 이상이 필요합니다.'); return; }
  const target = String(peer.uid || ''), nm = String(peer.nickname || '생존자'), nonce = `duel-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  modal('1:1 모의결투 요청', `<p style="white-space:pre-line;color:var(--text)">${esc(nm)}님에게 요청하시겠습니까?\n\n실제 캐릭터의 체력·상태·장비 내구도는 결투로 소모되지 않습니다.\n요청 시 200원 임시보관 → 상대 수락 시 상대도 200원 임시보관. 승자는 400원 수령(순이익 200원), 패자는 보관금 200원을 잃습니다.\n상대가 30초 안에 수락하지 않거나, 활동 중·타이틀 화면이라 받을 수 없으면 자동으로 거절되고 200원은 바로 돌려받습니다. 거절·취소·무승부도 보관금을 돌려받고, 30초 뒤 다시 신청할 수 있습니다.</p>`, [['200원 임시보관 · 요청 보내기', 'primary', () => { if (duelWaiting() || SOC.busy) return; duelCall('duelChallenge', [target, nonce], (res) => duelOpen(String(res.duel?.id || ''))); }], ['닫기', '', null]]); }
function duelsPage() { let h = headT('결투', '신청하면 보관금 200원이 맡겨지고, 30초 안에 수락되지 않으면 돌아옵니다'); if (DUEL.error) h += `<p style="color:var(--danger)">${esc(DUEL.error)}</p>`;
  const rules = noteBox('상대가 탐사 · 전투 · 이동 중이거나 타이틀 화면에 있거나 소지금이 200원 미만이면 바로 자동 거절됩니다. 거절된 뒤 30초가 지나면 다시 신청할 수 있습니다. 결투 피해는 실제 캐릭터에 반영되지 않고, 승자는 400원(순이익 200원)을 받습니다.');
  if (!LIVE.on) return h + noteBox('로그인한 뒤 같은 지역 생존자에게 결투를 신청할 수 있습니다.') + rules;
  if (duelBusy()) h += ROW('진행 중', 'var(--accent)', '진행 중인 결투', '실제 탐사 · 이동은 결투가 끝난 뒤 할 수 있습니다.', [['열기', `data-dopen="${esc(DUEL.slot || DUEL.current.id || '')}"`, true, 'var(--accent)']]);
  const wait = duelWaiting() || SOC.busy;
  for (const d of DUEL.entries) { if (d.status !== 'pending') continue; const id = esc(d.id); if (String(d.from || '') === myUid()) { h += ROW('보냄', 'var(--blue)', `${d.toName || '생존자'}에게 보낸 신청`, '상대의 수락을 기다리는 중 · 보관금 200원', [['취소', `data-dresp="${id}" data-v="cancel" ${wait ? 'disabled' : ''}`, false]]); continue; }
    const left = Math.max(0, Number(d.createdAt || 0) + DW - nowSec());
    h += `<div class="duelhero"><div class="tx"><small>결투 신청이 왔습니다</small><div><b>${esc(d.fromName || '생존자')}</b><span class="muted">보관금 200원</span></div><i class="dbar"><i style="width:${(left / DW) * 100}%"></i></i><span class="muted" style="font-size:11px">${left}초 안에 답하지 않으면 자동으로 거절됩니다</span></div><button class="btn dangerfill" data-dresp="${id}" data-v="accept" ${wait || activityBusy() || Number(S.P.money) < 200 || left <= 0 ? 'disabled' : ''}>수락</button><button class="btn" style="color:var(--danger)" data-dresp="${id}" data-v="decline" ${wait ? 'disabled' : ''}>거절</button></div>`; }
  h += '<b style="font-size:15px;display:block;margin:12px 0 8px">같은 지역 생존자</b>'; const realm = Number(GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, Number(S.P.region)))].realm); let any = false; DUEL.list = [];
  for (const u of S.online || []) { if (!isDict(u) || String(u.uid || '') === myUid()) continue; const info = isDict(u.info) ? u.info : {}, gi = Math.max(-1, Math.min(GD.REGIONS.length - 1, Number(info.regionId ?? -1))); if (gi < 0 || Number(GD.REGIONS[gi].realm) !== realm) continue; any = true;
    const ready = (info.duelReady ?? true) && !info.dead, can = ready && !duelBusy() && !activityBusy() && Number(S.P.money) >= 200, i = DUEL.list.push(u) - 1;
    h += `<div class="panel duelrow">${avatarHtml(u.avatar || 0, 36, u.photo || '')}<div class="tx"><b>${esc(gmName(u))}</b><span class="muted">Lv.${Number(info.level || 1)} · ${esc(info.region || '')}</span></div><span class="cchip" style="--c:${ready ? 'var(--accent)' : 'var(--warning)'}">${ready ? '신청 가능' : info.dead ? '쓰러짐' : '활동 중'}</span><button class="btn ${can ? 'primary' : ''}" data-dch="${i}" ${can ? '' : 'disabled'}>${can ? '결투 신청' : '신청 불가'}</button></div>`; }
  if (!any) h += noteBox('지금 같은 지역에 접속한 생존자가 없습니다. 접속자 목록에서 상대를 눌러 신청할 수도 있습니다.'); return h + rules; }
function bindDuels() { const c = $('center'); c.querySelectorAll('[data-dopen]').forEach((b) => { b.onclick = () => duelOpen(b.dataset.dopen); }); c.querySelectorAll('[data-dch]').forEach((b) => { b.onclick = () => duelChallenge(DUEL.list[Number(b.dataset.dch)]); });
  c.querySelectorAll('[data-dresp]').forEach((b) => { b.onclick = () => { const id = b.dataset.dresp, v = b.dataset.v; DUEL.sel = id; duelCall('duelRespond', [id, v], v === 'accept' ? () => duelOpen(id) : null); }; }); }
function duelOpen(id) { if (['active', 'pending'].includes(DUEL.slotSt) && DUEL.slot && id !== DUEL.slot) { toast('현재 결투/보낸 요청을 먼저 마치거나 취소해 주세요.'); return; } DUEL.sel = id; if (String(DUEL.current.id || '') !== id) DUEL.current = {}; duelWatch(id); duelModal('1:1 모의결투'); }
function duelModal(title) { modal(title, '<div id="duelBoard" class="duelboard"></div>', [['닫기', '', () => { DUEL.board = false; }]]); DUEL.board = true; DUEL.clockSig = ''; duelBoard(); }
const duelRemaining = () => { const c = DUEL.current, base = c.status === 'active' ? Number(c.updatedAt || 0) : Number(c.createdAt || 0); if (base <= 0) return 0; return Math.max(0, base + (c.status === 'active' ? 60 : DW) - nowSec()); };
const duelClockText = () => { const c = DUEL.current; return c.status === 'pending' ? `요청 남은시간 ${duelRemaining()}초` : c.status === 'active' ? `차례 ${Number(c.round || 0) + 1}/60 · 행동 남은시간 ${duelRemaining()}초` : '서버 결과 저장 완료'; };
const DUEL_ST = { pending: '수락 대기', active: '결투 중', finished: '결투 종료', declined: '거절됨', cancelled: '요청 취소', expired: '요청 만료' };
function duelBoard() { const box = $('duelBoard'); if (!box) { DUEL.board = false; return; } const d = DUEL.current; if (!nonEmpty(d) || String(d.id || '') !== DUEL.sel) { box.innerHTML = '<p class="muted">결투 기록을 불러오는 중입니다…</p>'; return; }
  const st = String(d.status || ''), mine = String(d.from || '') === myUid(), wait = duelWaiting() || SOC.busy, B = (t, k, col, en) => `<button class="btn" style="color:${col}" data-dk="${k}" ${en ? '' : 'disabled'}>${esc(t)}</button>`;
  let h = `<p style="color:var(--text);font-size:16px;margin:0">${esc(d.fromName || '생존자')} ↔ ${esc(d.toName || '생존자')}</p><p style="color:var(--blue);margin:0">결투 피해·소모 없음 · 양쪽 200원 보관 · 승자 순이익 200원</p><p class="muted" id="duelClock" style="margin:0">${duelClockText()}</p>`;
  if (wait) h += '<p style="color:var(--warning)">서버가 결투 요청을 처리 중입니다. 같은 요청을 다시 보내지 마세요.</p>'; if (DUEL.error) h += `<p style="color:var(--danger)">${esc(DUEL.error)}</p>` + B('서버 기록 다시 확인', 'reload', 'var(--blue)', !wait);
  if (st === 'pending') { h += '<p style="color:var(--text)">요청자 200원 임시보관 상태입니다. 수락할 때 상대도 200원을 임시보관합니다. 30초 안에 수락하지 않으면 자동으로 거절되고, 요청자의 200원은 자동 환급됩니다.</p>'; h += mine ? B('요청 취소 · 보관금 환급', 'cancel', 'var(--warning)', !wait) : B('200원 임시보관 · 수락', 'accept', 'var(--accent)', !wait && !activityBusy() && Number(S.P.money) >= 200 && duelRemaining() > 0) + B('거절 · 요청자에게 환급', 'decline', 'var(--muted)', !wait); }
  else if (st === 'active') { for (const a of [true, false]) { const f = isDict(d[a ? 'fighterA' : 'fighterB']) ? d[a ? 'fighterA' : 'fighterB'] : {}; h += `<p style="color:var(--text);margin:0">${esc(d[a ? 'fromName' : 'toName'] || '생존자')} · 가상 체력 ${Number(d[a ? 'hpA' : 'hpB'] ?? 100)}/100 · 공격 ${Number(f.atk ?? 8)} · 방어 ${Number(f.def || 0)} · 방패 ${Number(d[a ? 'shieldA' : 'shieldB'] || 0)}</p>`; }
    const turn = String(d.turn || '') === myUid(), av = !wait && turn && duelRemaining() > 0 && nowSec() < Number(d.startedAt || 0) + 900 && !DUEL.acting; h += `<p style="color:${turn ? 'var(--accent)' : 'var(--warning)'};font-size:15px;margin:0">${turn ? '내 차례입니다.' : '상대의 행동을 기다립니다.'}</p>`;
    h += B('공격 (피해는 ±3 안에서 무작위)', 'attack', 'var(--accent)', av) + B('방어 (다음 피해 −8 · 체력 +2)', 'guard', 'var(--blue)', av) + B('포기', 'resign', 'var(--danger)', !DUEL.acting && !wait); if (!turn && duelRemaining() <= 0) h += '<p style="color:var(--warning)">상대 행동시간이 지나 자동으로 승리 정산합니다…</p>'; }
  else { const w = String(d.winner || ''); let t = st === 'finished' && !w ? '무승부 · 양쪽 보관금 200원 반환' : w === myUid() ? '승리 · 보관금 포함 400원 수령(순이익 200원)' : [String(d.from || ''), String(d.to || '')].includes(w) ? '패배 · 보관금 200원 손실' : '결과 기록 확인 필요'; if (st !== 'finished') t = (DUEL_ST[st] || st) + ' · 요청자 200원 반환';
    if (st === 'finished' && d.lastAction === 'resign') h += `<p style="color:var(--warning);font-size:17px">${String(d.actor || '') === myUid() ? '내가 포기하여 결투가 종료되었습니다.' : esc(duelNameFor(String(d.actor || ''), d)) + '님이 포기하여 결투가 종료되었습니다.'}</p>`;
    h += `<p style="color:${w === myUid() ? 'var(--accent)' : 'var(--text)'};font-size:16px">${esc(t)}</p>`; if (st === 'finished') h += '<b style="color:var(--accent)">결과 요약</b>' + duelSummary(d).map((l) => `<p style="color:var(--text);font-size:13px;margin:0">${esc(l)}</p>`).join('');
    h += '<p class="muted" style="font-size:13px">정산금은 서버 수령 기록을 확인해 자동으로 한 번만 지급됩니다. 재접속해도 미수령 정산금을 확인합니다.</p>'; }
  box.innerHTML = h; box.querySelectorAll('[data-dk]').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); const k = b.dataset.dk;
    if (k === 'reload') duelReload(); else if (['cancel', 'accept', 'decline'].includes(k)) duelCall('duelRespond', [DUEL.sel, k]); else if (k === 'resign') duelResign(); else duelAction(k); }; }); }
function duelResign() { if (duelWaiting()) return; const id = DUEL.sel, rnd = Number(DUEL.current.round || 0); DUEL.board = false;
  modal('결투를 포기하시겠습니까?', '<p style="color:var(--text)">포기하면 패배합니다. 임시보관한 200원은 상대의 승리 보상으로 정산됩니다. 실제 캐릭터 체력에는 피해가 없습니다.</p>', [['확인 · 포기하기', 'dangerfill', () => duelAct(id, 'resign', String(DUEL.current.id || '') === id ? Number(DUEL.current.round ?? rnd) : rnd)], ['계속 결투하기', '', () => duelOpen(id)]]); }
function duelAction(kind) { if (!nonEmpty(DUEL.current) || DUEL.acting) return; if (DUEL.current.status !== 'active') { toast('이미 처리된 결투입니다. 최신 결과를 확인해 주세요.'); return; } duelAct(DUEL.sel, kind, Number(DUEL.current.round || 0)); }
function duelAct(id, kind, rnd) { if (DUEL.acting || !id) return; DUEL.acting = true; duelBoard();
  call('duelAct', id, kind, rnd).then((r) => { DUEL.acting = false; if (!r.ok) { if (!['draw', 'timeout'].includes(kind)) DUEL.error = duelErr(r.error || '결투 행동 실패'); duelReload(); }
    else { DUEL.error = ''; if (isDict(r.duel) && String(r.duel.id || '') === id) { const before = String(DUEL.current.status || ''); duelApplyCurrent(r.duel); if (DUEL.current.status === 'finished' && before === 'active' && !DUEL.shown[id]) { DUEL.shown[id] = true; DUEL.sel = id; duelModal('결투 종료'); } } }
    duelBoard(); duelRedrawMenu(); }); }
function duelTick() { const ck = $('duelClock'); if (ck) ck.textContent = duelClockText(); if (!S.P) return;
  if (DUEL.pending && (!SOC.busy || nowSec() >= DUEL.pendingUntil)) { const to = nowSec() >= DUEL.pendingUntil; DUEL.pending = ''; DUEL.pendingUntil = 0; if (to) { DUEL.error = '결투 응답을 기다리는 시간이 지났습니다. 처리 결과는 서버 기록을 다시 확인해 주세요.'; duelReload(); } duelBoard(); }
  if (!LIVE.on || SOC.busy) return; if (DUEL.claiming && nowSec() >= DUEL.claimDl) DUEL.claiming = false; const c = DUEL.current, me = myUid();
  if (DUEL.credits.length && !DUEL.claiming) { DUEL.claiming = true; DUEL.claimDl = nowSec() + 30; const id = String(DUEL.credits[0].id || ''); duelCall('claimDuelCredit', [id], () => { DUEL.claiming = false; DUEL.credits = DUEL.credits.filter((x) => String(x.id || '') !== id); }); return; }
  const al = Object.keys(DUEL.acceptLater); if (al.length) { const aid = al[0]; delete DUEL.acceptLater[aid]; duelCall('duelRespond', [aid, 'accept'], () => duelOpen(aid)); return; }
  const ad = Object.keys(DUEL.autoDecline); if (ad.length) { const did = ad[0]; delete DUEL.autoDecline[did]; duelCall('duelRespond', [did, 'decline']); return; }
  if (nonEmpty(c) && c.status === 'pending' && String(c.from || '') === me && Number(c.createdAt || 0) > 0 && duelRemaining() <= 0 && nowSec() >= DUEL.retryAt) { DUEL.retryAt = nowSec() + 10; const cid = String(c.id); duelCall('duelRespond', [cid, 'cancel'], () => { if (!DUEL.autoCancelDone[cid]) { DUEL.autoCancelDone[cid] = true; toast(`상대가 ${DW}초 안에 수락하지 않아 결투 요청이 자동으로 거절됐습니다. 보관금 200원은 바로 돌려받고, 30초 뒤 다시 신청할 수 있습니다.`); } }); return; }
  if (nonEmpty(c) && c.status === 'pending' && String(c.to || '') === me && Number(c.createdAt || 0) > 0 && duelRemaining() <= 0 && nowSec() >= DUEL.retryAt) { DUEL.retryAt = nowSec() + 10; duelCall('duelRespond', [String(c.id), 'decline']); return; }
  if (nonEmpty(c) && c.status === 'pending' && Number(c.createdAt || 0) > 0 && nowSec() >= Number(c.createdAt) + 300 && nowSec() >= DUEL.retryAt) { DUEL.retryAt = nowSec() + 20; duelCall('duelRespond', [String(c.id), 'expire']); }
  if (nonEmpty(c) && c.status === 'active' && (c.members || {})[me] && !DUEL.acting && nowSec() >= DUEL.autoActAt) { const st = Number(c.startedAt || 0); if (st > 0 && nowSec() >= st + 900) { DUEL.autoActAt = nowSec() + 10; duelAct(String(c.id), 'draw', Number(c.round || 0)); return; }
    if (String(c.turn || '') !== me && duelRemaining() <= 0 && Number(c.updatedAt || 0) > 0) { DUEL.autoActAt = nowSec() + 10; duelAct(String(c.id), 'timeout', Number(c.round || 0)); return; } }
  if ($('duelBoard') && c.status === 'active') { const sig = (String(c.turn || '') === me ? 'mine' : 'peer') + `:${duelRemaining() > 0}:${nowSec() < Number(c.startedAt || 0) + 900}`; if (sig !== DUEL.clockSig) { DUEL.clockSig = sig; duelBoard(); } } }
function duelRedrawMenu() { if (['duels', 'requests'].includes(S.mode) && !SOC.busy) redrawKeep(); }

/* ════════ 오류 · 건의(game_reports.gd) ════════ */
const RPT_ST = D.game_reports.STATUSES, RPT_KINDS = D.game_reports.KINDS;
const RPT = { uid: '', ep: 0, draft: { kind: '버그', title: '', body: '', reproduce: '', attach: true, requestId: '' }, rows: [], sel: '', loaded: false, busy: false, msg: '', adminView: false, answers: {} };
function rptEnsure() { if (myUid() !== RPT.uid) { RPT.ep++; Object.assign(RPT, { rows: [], sel: '', loaded: false, busy: false, msg: '', answers: {}, draft: { kind: '버그', title: '', body: '', reproduce: '', attach: true, requestId: '' } }); RPT.uid = myUid(); } }
const rptChange = (k, v) => { RPT.draft[k] = v; RPT.draft.requestId = ''; };
const rptValid = () => { const d = RPT.draft; return RPT_KINDS.includes(d.kind) && d.title.trim().length >= 3 && d.title.length <= 80 && d.body.trim().length >= 10 && d.body.length <= 2000 && d.reproduce.length <= 1200; };
const rptStamp = (row) => kstStamp(Math.trunc(Number(row.createdAt || 0) / 1000));
function reportsPage(mode) { rptEnsure(); if (!LIVE.on) return headT('오류 · 건의', '운영진에게 바로 전달됩니다 · 답변은 알림으로 옵니다') + noteBox('로그인한 계정으로만 보낼 수 있습니다. 작성자와 관리자만 읽습니다.');
  if (mode === 'reports') { let h = headT('오류 · 건의', '운영진에게 바로 전달됩니다 · 답변은 알림으로 옵니다') + '<div class="rptwrap"><div class="panel rptform">'; if (RPT.msg) h += noteBox(RPT.msg);
    const kl = { 오류: '오류 제보', 버그: '버그', 건의: '건의' }; h += `<div class="pills">${RPT_KINDS.map((k) => `<button class="pill ${RPT.draft.kind === k ? 'on' : ''}" data-rk="${k}">${kl[k]}</button>`).join('')}</div>`;
    h += `<label class="muted">제목</label><input class="sel" id="rTitle" maxlength="80" placeholder="한 줄로 알려 주세요" value="${esc(RPT.draft.title)}"><label class="muted">내용</label><textarea class="sel" id="rBody" maxlength="2000" rows="6" placeholder="어떤 상황에서 일어났는지, 화면에 무엇이 보였는지 적어 주세요">${esc(RPT.draft.body)}</textarea>`;
    h += `<label class="sqchk"><input type="checkbox" id="rAtt" ${RPT.draft.attach ? 'checked' : ''}>게임 버전·지역·레벨·기기 종류 첨부</label><button class="btn primary big" id="rSend" ${RPT.busy ? 'disabled' : ''}>${RPT.busy ? '보내는 중…' : '보내기'}</button></div>`;
    if (!RPT.loaded && !RPT.busy) setTimeout(() => rptLoad(false), 0);
    h += `<div class="panel rptside"><b>내가 보낸 글</b>${RPT.rows.length ? RPT.rows.slice(0, 8).map((r) => { const st = String(r.status); return `<div class="rptrow"><div><b>${esc(r.title)}</b><em style="color:${st === 'resolved' ? 'var(--accent)' : ['open', 'reviewing'].includes(st) ? 'var(--warning)' : 'var(--muted)'}">${esc(RPT_ST[st] || st)}</em></div><span class="muted">${esc(r.kind)} · ${rptStamp(r)}</span></div>`; }).join('') : `<p class="subtle" style="font-size:13px">${RPT.busy || !RPT.loaded ? '불러오는 중입니다.' : '아직 보낸 글이 없습니다.'}</p>`}<button class="btn" style="color:var(--blue)" data-go="report_list">처리상태 자세히 보기</button>${S.admin ? '<button class="btn" style="color:var(--warning)" data-go="report_admin">전체 제보 관리 · 관리자</button>' : ''}</div></div>`;
    return h; }
  const adm = mode === 'report_admin'; if (adm && !S.admin) return noteBox('관리자만 다른 사용자의 제보를 확인할 수 있습니다.'); if (RPT.adminView !== adm) { RPT.adminView = adm; RPT.loaded = false; RPT.sel = ''; RPT.rows = []; }
  let h = headT(adm ? '제보 · 건의 관리' : '내 제보 · 처리상태', '최근 60건 · 작성자/관리자만 읽을 수 있습니다.') + choiceRow('', '목록 새로 고침', '처리상태/답변을 다시 불러옵니다.', 'var(--blue)', !RPT.busy, 'id="rRe"') + choiceRow('', '새 제보 작성', '오류 / 버그 / 건의', 'var(--accent)', true, 'data-go="reports"');
  if (!RPT.loaded && !RPT.busy) setTimeout(() => rptLoad(adm), 0); if (RPT.msg) h += noteBox(RPT.msg); if (!RPT.rows.length) return h + noteBox(RPT.busy ? '불러오는 중입니다.' : '아직 접수된 제보가 없습니다.');
  if (!RPT.sel) return h + RPT.rows.map((r) => choiceRow('', `[${RPT_ST[r.status] || r.status}] ${r.title}`, `${r.kind} · ${r.nickname} · ${rptStamp(r)}`, r.status === 'open' ? 'var(--warning)' : 'var(--blue)', true, `data-rsel="${esc(r.id)}"`)).join('');
  const r = RPT.rows.find((x) => String(x.id) === RPT.sel); if (r) { h += infoBox(String(r.title), `${r.kind} · ${r.nickname} · ${RPT_ST[r.status] || r.status}`) + infoBox('내용', String(r.body || '')) + infoBox('재현 / 기대 결과', String(r.reproduce || '')); if (nonEmpty(r.context)) h += infoBox('첨부한 기술 정보', JSON.stringify(r.context)); h += infoBox('관리자 답변', String(r.reply ?? '답변이 아직 없습니다.'));
    if (adm) h += `<textarea class="sel" id="rReply" rows="5" maxlength="1200">${esc(RPT.answers[RPT.sel] ?? r.reply ?? '')}</textarea>` + ['reviewing', 'needs_info', 'resolved', 'closed'].map((st) => choiceRow('', RPT_ST[st] + '로 저장', '입력한 답변과 함께 처리상태 저장', 'var(--accent)', !RPT.busy, `data-rup="${st}"`)).join(''); }
  return h + choiceRow('', '목록으로', '', 'var(--blue)', true, 'data-rsel=""'); }
function bindReports() { const c = $('center'), on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; }; c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-rk]').forEach((b) => { b.onclick = () => { rptChange('kind', b.dataset.rk); redrawKeep(); }; }); on('rTitle', 'oninput', (e) => rptChange('title', e.target.value)); on('rBody', 'oninput', (e) => rptChange('body', e.target.value)); on('rAtt', 'onchange', (e) => rptChange('attach', e.target.checked)); on('rSend', 'onclick', rptSubmit);
  on('rRe', 'onclick', () => rptLoad(RPT.adminView)); c.querySelectorAll('[data-rsel]').forEach((b) => { b.onclick = () => { RPT.sel = b.dataset.rsel; redrawKeep(); }; }); on('rReply', 'oninput', (e) => { RPT.answers[RPT.sel] = e.target.value.slice(0, 1200); });
  c.querySelectorAll('[data-rup]').forEach((b) => { b.onclick = () => rptUpdate(RPT.sel, b.dataset.rup); }); }
function rptSubmit() { rptEnsure(); if (RPT.busy || !LIVE.on) return; if (!rptValid()) { RPT.msg = '제목 3~80자, 내용 10~2000자로 작성해 주세요.'; toast(RPT.msg); redrawKeep(); return; } const d = RPT.draft; if (!d.requestId) d.requestId = `report-${nowSec()}-${Math.floor(performance.now() * 1000)}`;
  const ctx = d.attach ? { version: 23, mode: String(S.mode).slice(0, 40), region: Math.max(0, Math.min(59, Number(S.P.region || 0))), level: Math.max(1, Math.min(100, Number(S.P.level || 1))), platform: ('Web · ' + navigator.userAgent).slice(0, 120) } : {};
  const data = { kind: d.kind, title: d.title.trim(), body: d.body.trim(), reproduce: d.reproduce.trim(), context: ctx, requestId: d.requestId }, tok = RPT.ep; RPT.busy = true; RPT.msg = '비공개 제보를 보내는 중입니다.'; redrawKeep();
  call('submitFeedback', JSON.stringify(data)).then((r) => { if (tok !== RPT.ep) return; RPT.busy = false; if (r.ok) { RPT.msg = "접수했습니다. '내 제보 · 처리상태'에서 확인해 주세요."; RPT.loaded = false; RPT.draft = { kind: '버그', title: '', body: '', reproduce: '', attach: true, requestId: '' }; } else RPT.msg = '전송하지 못했습니다: ' + (r.error || '연결 상태를 확인해 주세요.'); toast(RPT.msg); if (['reports', 'report_list', 'report_admin'].includes(S.mode)) redrawKeep(); }); }
function rptLoad(adm) { rptEnsure(); if (RPT.busy || !LIVE.on || (adm && !S.admin)) return; const tok = RPT.ep; RPT.busy = true;
  call('listFeedback', !!adm).then((r) => { if (tok !== RPT.ep) return; RPT.busy = false; RPT.loaded = true; if (r.ok) { RPT.rows = Array.isArray(r.reports) ? r.reports : []; RPT.msg = ''; } else RPT.msg = '목록을 불러오지 못했습니다: ' + (r.error || '연결을 확인하세요.'); if (['reports', 'report_list', 'report_admin'].includes(S.mode)) redrawKeep(); }); }
function rptUpdate(id, st) { rptEnsure(); if (RPT.busy || !S.admin || !(st in RPT_ST)) return; const tok = RPT.ep; RPT.busy = true;
  call('updateFeedback', id, st, String(RPT.answers[id] ?? '')).then((r) => { if (tok !== RPT.ep) return; RPT.busy = false; if (r.ok) { RPT.loaded = false; toast('처리상태와 답변을 저장했습니다.'); rptLoad(true); } else { RPT.msg = '저장하지 못했습니다: ' + (r.error || '권한과 연결을 확인하세요.'); redrawKeep(); } }); }

/* ════════ 정보 · 상태 창 · 상태 상세(status_details.gd) · 몸 살피기 · 캐릭터 설정 · 하드 모드 ════════ */
const activePositive = () => Object.keys(S.P.positive || {}).filter((id) => BD.POSITIVES[id] && Number(S.P.positive[id]?.until || 0) > nowSec()).sort();
const infectionRuleText = () => (LIFE.infection ? "서버 규칙 · 감염 악화 켜짐: 감염을 방치하면 15분마다 0.3% 확률로 변이, 변이를 방치하면 15분마다 0.1% 확률로 최종 변이가 됩니다. 최종 변이는 24시간 안에 '변이 치료제'로 고치지 못하면 사망합니다." : '서버 규칙 · 감염 악화 꺼짐: 감염이 변이로 이어지지 않습니다.');
const charAgeShown = () => charAgeText();
const modalTile = (t, v) => `<div class="mtile"><small>${esc(t)}</small><b>${esc(v)}</b></div>`;
function infoModal() { const p = S.P, d = derived(), need = xpNeed(Number(p.level));
  modal('정보', `<div class="infohd">${avatarHtml(p.avatar || 0, 76, p.photo || '')}<div><div class="row"><b style="font-size:20px">${esc(displayName())}</b><span class="cchip" style="--c:var(--blue)">Lv. ${Number(p.level)}</span></div><span class="muted">${esc([charAgeShown(), `${Number(p.day)}일차`, GD.REGIONS[Number(p.region)].name].filter(Boolean).join(' · '))}</span></div></div><div class="mtiles">${modalTile('공격', String(Math.trunc(d.attack))) + modalTile('방어', String(Math.trunc(d.defense))) + BD.STATS.map((k) => modalTile(statName(k), String(Math.trunc(Number(p.stats?.[k] || 0))))).join('')}</div><div class="kvx"><span class="muted">경험치</span><span class="muted">${Number(p.xp)} / ${need}</span></div>${cbar(Number(p.xp), need, 'var(--accent)')}`,
    [['자세한 능력 보기', '', () => go('status')], ['닫기', '', null]]); }
function stateModal() { const p = S.P, neg = activeConds(), pos = activePositive(), afc = autoFoodCfg();
  const bars = [['체력', Number(p.hp), Number(p.max_hp), 'var(--danger)', true], ['허기', Number(p.hunger), 100, 'var(--warning)'], ['수분', Number(p.water), 100, 'var(--blue)'], ['사기', Number(p.morale), 100, 'var(--morale)']].map(([n, v, mx, c, two]) => `<div class="kvx"><b>${n}</b><span class="muted">${two ? `${v} / ${mx}` : v}</span></div>${cbar(v, mx, c)}`).join('');
  const chips = pos.map((id) => { const pd = p.positive[id], left = Math.max(0, Number(pd.until || 0) - nowSec()); return `<span class="cchip" style="--c:${id === 'newbie' ? 'var(--warning)' : 'var(--accent)'}">${esc(String(pd.name ?? BD.POSITIVES[id].name) + (left > 0 ? ' · ' + durationText(left) : ''))}</span>`; }).join('') + neg.map((id) => `<span class="cchip" style="--c:var(--danger)">${esc(ED.CONDITIONS[id].name)}</span>`).join('') + (neg.length ? '' : `<span class="muted" style="font-size:12px">${pos.length ? '그 밖의 이상 없음' : '이상 없음'}</span>`);
  modal('상태', `${bars}<span class="muted" style="font-size:13px">상태 이상</span><div class="chips">${chips}</div><div class="panel" style="padding:12px 14px"><p class="muted" style="margin:0;white-space:pre-line">감염 · ${neg.includes('infection') ? '있음' : '정상'} / 출혈 · ${neg.includes('bleeding') ? '있음' : '없음'}\n${afc.on ? '허기 · 수분이 10 아래면 가방의 음식이나 물을 자동으로 씁니다.' : '음식 · 물 자동 사용이 꺼져 있습니다.'}</p></div>`, [['효과 · 남은 시간 자세히 보기', '', statusDetails], ['닫기', '', null]]); }
/* 상태 상세 — 1초마다 남은 시간을 고칩니다 */
const SDET = { open: false, sig: '' };
function sdSig() { const p = S.P, eq = p.equipment || {}, b = p.buffs || {}; return `N:${activeConds().join(',')}|P:${activePositive().join(',')}|C:${nonEmpty(p.battle)}|B:${Number(b.buff_atk || 0)},${Number(b.buff_def || 0)},${Number(b.buff_evade || 0)}|G:${GEAR.SLOTS.map((s) => s + ':' + (eq[s] || '')).join(',')}|I:${Object.keys(p.inventory || {}).length}`; }
const sdLeft = (until) => { const l = Math.max(0, until - nowSec()); return l > 0 ? durationText(l) + ' 남음' : '곧 종료'; };
function condTreatText(id) { const full = [], red = []; for (const it in ED.TREATMENTS) if (ED.TREATMENTS[it].includes(id)) full.push(it + ' 완치'); for (const it in ED.REDUCERS) if (id in ED.REDUCERS[it]) red.push(`${it} ${Number(ED.REDUCERS[it][id])}초 단축`);
  const parts = full.slice(0, 3); if (full.length > 3) parts.push('같은 완치 효과의 의약품으로도 치료 가능'); parts.push(...red.slice(0, 2)); return parts.length ? '치료: ' + parts.join(' · ') : '치료: 자연 종료만 가능'; }
function treatItems(id) { const out = []; for (const it in ED.TREATMENTS) if (ED.TREATMENTS[it].includes(id) && count(it) > 0) out.push(it); for (const it in ED.REDUCERS) if (id in ED.REDUCERS[it] && count(it) > 0 && !out.includes(it)) out.push(it); return out.sort(); }
function gearDrawbacks() { const out = [], eq = S.P.equipment || {}; for (const s of GEAR.SLOTS) { const it = String(eq[s] || ''); if (!GEAR.ITEMS[it]) continue; const m = GEAR.ITEMS[it].mods || {}, ef = [];
  if (Number(m.hunger_drain || 0) > 0) ef.push(`1분마다 허기 -${Math.trunc(m.hunger_drain)}`); if (Number(m.hp_drain || 0) > 0) ef.push(`1분마다 체력 -${Math.trunc(m.hp_drain)}`); if (Number(m.bleed_extra || 0) > 0) ef.push(`출혈 발생률 +${Math.trunc(m.bleed_extra)}%`); if (Number(m.infection_extra || 0) > 0) ef.push(`감염 발생률 +${Math.trunc(m.infection_extra)}%`);
  if (Number(m.evade || 0) < 0) ef.push(`회피 ${signed(Math.round(Number(m.evade)))}%`); if (Number(m['민첩'] || 0) < 0) ef.push(`민첩 ${signed(Math.round(Number(m['민첩'])))}`); if (ef.length) out.push({ name: it, effect: ef.join(' · ') }); } return out; }
const sdCard = (title, col, rows) => `<div class="sdcard" style="--c:${col}"><b>${esc(title)}</b>${rows}</div>`;
const sdRow = (k, v, col = 'var(--text)', live = '') => `<div class="sdrow"><span class="muted">${esc(k)}</span><span style="color:${col}" ${live}>${esc(v)}</span></div>`;
function statusDetailsHtml() { const p = S.P, neg = activeConds(), pos = activePositive(), inC = nonEmpty(p.battle), b = p.buffs || {}; let h = `<p class="muted" style="margin:0">긍정 ${pos.length} · 부정 ${neg.length} · 합계 ${pos.length + neg.length}</p>`;
  if (inC) h += '<p style="color:var(--warning);margin:0">전투 중에는 상태 확인만 가능합니다. 치료품은 전투 아이템 메뉴에서 사용하세요.</p>';
  if (neg.length) { h += '<b style="color:var(--danger)">부정 상태</b>'; for (const id of neg) { const st = p.conditions[id], def = ED.CONDITIONS[id], items = treatItems(id); let rows = sdRow('효과', def.desc) + sdRow('남은 시간', sdLeft(Number(st.until || 0)), 'var(--danger)', `data-sdu="${Number(st.until || 0)}"`) + sdRow('해제 조건', '자연 종료: 남은 시간이 끝나면 자동 해제. ' + condTreatText(id), 'var(--muted)');
      if (!inC) rows += items.length ? `<div class="sdrow"><span class="muted">치료</span><span class="sdbtns">${items.map((it) => `<button class="btn sm" style="color:var(--accent)" data-sdt="${esc(it)}">${esc(it)} 사용 × ${count(it)}</button>`).join('')}</span></div>` : sdRow('보유 치료품', '해당 상태에 쓸 수 있는 치료품이 없습니다.', 'var(--muted)');
      h += sdCard(def.name, '#' + def.color, rows); } }
  if (pos.length) { h += '<b style="color:var(--accent)">긍정 상태</b>'; for (const id of pos) { const st = p.positive[id], base = BD.POSITIVES[id], col = '#' + String(st.color ?? base.color ?? '6cb6ff'), ef = positiveDefText(st);
    h += sdCard(String(st.name ?? base.name ?? id), col, sdRow('효과', ef || String(st.desc ?? base.desc ?? '시간제 생존 보조')) + sdRow('남은 시간', sdLeft(Number(st.until || 0)), col, `data-sdu="${Number(st.until || 0)}"`) + sdRow('해제 조건', '남은 시간이 끝나면 자동 종료합니다. 긍정 상태는 이 화면에서 강제로 해제할 수 없습니다.', 'var(--muted)')); } }
  const bp = []; if (Number(b.buff_atk || 0) > 0) bp.push(`공격력 +${Math.trunc(b.buff_atk)}`); if (Number(b.buff_def || 0) > 0) bp.push(`방어력 +${Math.trunc(b.buff_def)}`); if (Number(b.buff_evade || 0) > 0) bp.push(`회피 +${Math.trunc(b.buff_evade)}%`);
  if (bp.length) h += '<b style="color:var(--warning)">전투 임시 버프</b>' + sdCard('다음 전투용 강화', 'var(--warning)', sdRow('효과', bp.join(' · ')) + sdRow('해제 조건', '다음 전투 종료·후퇴·사망 시 자동 해제됩니다. 시간제로 저장되는 긍정 상태와는 별개입니다.', 'var(--muted)'));
  const gd = gearDrawbacks(); if (gd.length) { h += '<b style="color:var(--warning)">장비 부정 효과</b>'; for (const e of gd) h += sdCard(e.name, 'var(--warning)', sdRow('효과', e.effect) + sdRow('해제 조건', `장비 메뉴에서 ${e.name}을(를) 해제하면 즉시 사라집니다.`, 'var(--muted)')); }
  if (!(pos.length + neg.length) && !bp.length && !gd.length) h += '<p style="color:var(--text)">현재 시간제 긍정/부정 상태가 없습니다. 허기·수분·사기와 장비 대가를 계속 확인하세요.</p>';
  return h + `<p style="color:${LIFE.infection ? 'var(--danger)' : 'var(--subtle)'};font-size:13px;margin:0">${esc(infectionRuleText())}</p>`; }
function statusDetails() { modal('상태 상세', '<div id="sdBody" class="sdbody"></div>', [['닫기', '', () => { SDET.open = false; }]]); SDET.open = true; sdRebuild(); }
function sdRebuild() { const b = $('sdBody'); if (!b) { SDET.open = false; return; } SDET.sig = sdSig(); b.innerHTML = statusDetailsHtml();
  b.querySelectorAll('[data-sdt]').forEach((x) => { x.onclick = () => { const it = x.dataset.sdt; if (nonEmpty(S.P.battle)) { toast('전투 중에는 전투 아이템 메뉴에서 사용하세요.'); return; } if (count(it) <= 0) { toast('치료품 수량이 바뀌었습니다. 다시 확인하세요.'); sdRebuild(); return; } act(() => consume(it) !== false, () => sdRebuild()); }; }); }
function sdTick() { if (!SDET.open) return; const b = $('sdBody'); if (!b) { SDET.open = false; return; } if (sdSig() !== SDET.sig) { sdRebuild(); return; } b.querySelectorAll('[data-sdu]').forEach((e) => { e.textContent = sdLeft(Number(e.dataset.sdu)); }); }
/* 상태 화면(_render_status_mobile) */
function statusPage() { const p = S.P; let h = headT('상태 상세', '생존 · 부정/긍정 효과 · 장비 · 확률'); h += noteBox(`이동속도 ${moveSpeed().toFixed(2)}배 · 탈것 ${p.equipment?.['탈것'] || '없음'} · 이동 장비 ${p.equipment?.['이동'] || '없음'}`);
  for (const sp of ['zombie', 'animal']) { const r = conditionChances(sp, false, 0); h += noteBox(`${sp === 'zombie' ? '좀비' : '짐승'} 피격 시: 출혈 ${Number(r.bleeding).toFixed(1)}% · 감염 ${Number(r.infection).toFixed(1)}% · 염좌 ${Number(r.sprain).toFixed(1)}%\n방어 시 55% 감소, 최대체력의 20% 이상 강타 시 30% 증가. 회피하면 상태도 발생하지 않습니다.`); }
  h += noteBox(infectionRuleText()) + `<div class="panel" style="padding:14px 16px">${statusDetailsHtml()}</div>`; return h + choiceRow('', '능력치 화면', '기본 능력치와 세부 능력', 'var(--accent)', true, 'data-go="stats"'); }
function bindStatus() { const c = $('center'); c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); }); c.querySelectorAll('[data-sdt]').forEach((x) => { x.onclick = () => act(() => consume(x.dataset.sdt) !== false); }); }
/* 몸 살피기 · 음식 · 음료 · 치료(workshop.render_consumables) */
const USE = { kind: 'hunger' };
function useBelongs(it, k) { const x = GD.ITEMS[it] || {}; if (k === 'hunger') return Number(x.hunger || 0) > 0; if (k === 'water') return Number(x.water || 0) > 0; return String(x.cat || '') === '회복' || Number(x.hp || 0) > 0 || Number(x.morale || 0) > 0; }
function useCan(it) { const p = S.P; if (count(it) <= 0 || p.dead) return false; const x = GD.ITEMS[it] || {}; if (!nonEmpty(x) || x.stat_boost || x.revive) return false; if ('all_boost' in x || 'xp_pct' in x) return true; if (Number(x.hp || 0) > 0 && Number(p.hp) < Number(p.max_hp)) return true;
  for (const k of ['hunger', 'water', 'morale']) if (Number(x[k] || 0) > 0 && Number(p[k]) < 100) return true; const ac = activeConds(), ap = activePositive(); if (x.panacea && ac.length) return true; if (x.mutation_cure && ['infection', 'mutation', 'final_mutation'].some((i) => ac.includes(i))) return true; if (x.vaccine && !ap.includes('immunity')) return true;
  for (const id of ED.TREATMENTS[it] || []) if (ac.includes(id)) return true; for (const id in ED.REDUCERS[it] || {}) if (ac.includes(id)) return true; for (const id in BD.POSITIVE_ITEMS[it] || {}) if (!ap.includes(id)) return true; return false; }
function useItemsPage() { let h = headT('몸 살피기 · 음식 · 음료 · 치료', '가방에 실제로 들어 있는 소모품입니다. 현재 효과를 받을 수 있는 물품만 사용 버튼이 활성화됩니다.');
  h += `<div class="pills">${[['hunger', '음식'], ['water', '물 · 음료'], ['hp', '치료 · 사기']].map(([k, l]) => `<button class="pill ${USE.kind === k ? 'on' : ''}" data-uk="${k}">${l}</button>`).join('')}</div>`; let found = false;
  for (const it of Object.keys(S.P.inventory || {})) { if (count(it) <= 0 || !useBelongs(it, USE.kind)) continue; found = true; const ok = useCan(it); h += choiceRow('', `${itemDisplay(it)} × ${count(it)}`, effectText(it) + (ok ? '' : '\n이미 회복되어 있거나 지금 효과를 받을 수 없습니다.'), catColorForTag(cat(it).tag), ok, `data-uuse="${esc(it)}"`); }
  if (!found) h += noteBox('이 종류의 소모품이 가방에 없습니다. 상점·탐사·제작으로 준비하세요.');
  if (USE.kind === 'hunger' || USE.kind === 'water') { const cfg = autoFoodCfg(), on = !!cfg.on, items = autoFoodItems(USE.kind); h += groupLab(`자동 먹고 마시기 · ${USE.kind === 'hunger' ? '허기' : '수분'}이(가) 10 아래로 떨어지면 낮은 등급부터`) + `<button class="btn ${on ? 'primary' : ''}" id="afOn" style="width:100%">${on ? '자동 사용 켜짐' : '자동 사용 꺼짐'}</button>`;
    if (!items.length) h += noteBox('자동으로 먹을 수 있는 물품이 가방에 없습니다.'); else { let first = true; h += '<div class="pills" style="margin-top:8px">' + items.map((n) => { const en = !(cfg.off || {})[n], nx = en && on && first; if (en && on) first = false; return `<button class="pill ${en ? 'on' : ''}" data-afi="${esc(n)}" ${on ? '' : 'disabled'}>${en ? '✓ ' : '× '}${esc(n)} [${esc(cat(n).grade)}] × ${count(n)}${nx ? '  · 다음 차례' : ''}</button>`; }).join('') + '</div>' + noteBox('✓ 표시된 물품만 자동으로 먹습니다. 물품을 누르면 켜고 끌 수 있고, 위 버튼으로 기능 전체를 끌 수 있습니다. 설정은 캐릭터마다 저장됩니다.'); } }
  return h; }
function bindUseItems() { const c = $('center'); c.querySelectorAll('[data-uk]').forEach((b) => { b.onclick = () => { USE.kind = b.dataset.uk; redrawKeep(); }; });
  c.querySelectorAll('[data-uuse]').forEach((b) => { b.onclick = () => { const it = b.dataset.uuse; if (!useCan(it)) { toast('지금은 이 아이템의 효과를 받을 수 없습니다.'); return; } act(() => consume(it) !== false); }; });
  const on = $('afOn'); if (on) on.onclick = () => act(() => { const cfg = autoFoodCfg(); cfg.on = !cfg.on; S.P.auto_food = cfg; return true; });
  c.querySelectorAll('[data-afi]').forEach((b) => { b.onclick = () => act(() => { const cfg = autoFoodCfg(), n = b.dataset.afi; if (!isDict(cfg.off)) cfg.off = {}; if (cfg.off[n]) delete cfg.off[n]; else cfg.off[n] = true; S.P.auto_food = cfg; return true; }); }); }
/* 캐릭터 설정(_render_profile) */
const validHex = (h) => /^[0-9a-f]{6}$/.test(String(h));
const nickWaitLeft = () => Math.max(0, Number(S.acct?.nicknameReadyAt || 0) - nowSec());
function profilePage() { const p = S.P, a = S.acct || {}, age = charAgeShown(); let h = headT('캐릭터 설정', '캐릭터 이름·사진·소개 · 다른 생존자에게는 캐릭터 이름만 보입니다');
  h += `<div class="panel profhd">${avatarHtml(p.avatar || 0, 72, p.photo || '')}<div><b style="font-size:20px">${esc(displayName())}</b><p class="muted" style="margin:2px 0">Lv. ${Number(p.level)} · ${Number(p.day)}일차 · ${won(p.money)}</p><p class="subtle" style="margin:0;font-size:13px">${LIVE.on ? `${age ? age + ' · ' : ''}아이디 ${esc(a.username || '')} (나만 보임)` : '게스트 (이 기기에만 저장)'}</p></div></div>`;
  h += groupLab('캐릭터 소개') + noteBox(characterSummary(p.character || {}, true));
  if (LIVE.on) h += choiceRow('', '캐릭터 이름 바꾸기', `지금 이름 · ${displayName()} · 다른 생존자에게 보이는 게임 속 이름 (언제든 변경)`, 'var(--warning)', true, 'id="pfRen"');
  h += choiceRow('', '캐릭터 정보 수정', '이름 · 나이 · 외관 · 성격 · 성별과 항목별 공개 여부를 고칩니다.', 'var(--blue)', true, 'id="pfEdit"');
  if (LIVE.on) h += choiceRow('', '캐릭터 관리', '캐릭터 바꾸기 · 새로 만들기(계정당 2개) · 삭제', 'var(--accent)', true, 'id="pfChars"');
  const nw = nickWaitLeft(); h += groupLab('계정 닉네임 · 나만 보임 · 7일에 한 번 변경') + noteBox(nw > 0 ? `다음 변경까지 ${durationText(nw)} 남았습니다.` : '닉네임을 변경하면 7일 동안 다시 바꿀 수 없습니다. 사진 변경에는 제한이 없습니다.');
  h += `<div class="nkrow"><input class="sel" id="pfNick" maxlength="10" placeholder="2~10자" value="${esc(a.accountNickname ?? a.nickname ?? '')}" ${nw > 0 ? 'disabled' : ''}><button class="btn primary" id="pfNickGo" ${nw > 0 ? 'disabled' : ''}>변경</button></div>`;
  const cur = validHex(String(p.theme_color || '').toLowerCase()) ? String(p.theme_color).toLowerCase() : '';
  h += groupLab('테마 색상 · 채팅에 나오는 내 이름 색') + `<div class="pills">${M.THEME_COLORS.map(([hx, nm]) => `<button class="pill tcol" style="--c:${hx ? '#' + hx : 'var(--muted)'}" data-tc="${hx}">${hx === cur ? '● ' : ''}${esc(nm)}</button>`).join('')}</div><p style="color:${cur ? '#' + cur : 'var(--accent)'};margin:6px 0 0">채팅 미리보기 · ${esc(displayName())} : 안녕하세요${cur ? `  (#${cur})` : ''}</p>`;
  h += groupLab('프로필 사진') + `<div class="nkrow"><button class="btn primary" id="pfPhoto" style="flex:1">내 사진 올리기</button>${p.photo ? '<button class="btn" style="color:var(--danger)" id="pfPhotoX">사진 지우기</button>' : ''}</div>` + noteBox('휴대폰·PC에 있는 사진을 골라 올립니다. 가운데를 정사각형으로 잘라 128×128 크기로 줄여 저장하고, 접속자 목록에도 그대로 보입니다.');
  h += groupLab('기본 아이콘 · 고르면 올린 사진 대신 사용됩니다') + `<div class="avgrid">${M.AVATARS.map((x, i) => `<button class="avbtn ${Number(p.avatar || 0) === i ? 'on' : ''}" data-av="${i}">${avatarHtml(i, 46, '')}</button>`).join('')}</div>`; return h; }
function bindProfile() { const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; }; on('pfRen', renameModal); on('pfEdit', () => beginCharEdit()); on('pfChars', charManager);
  on('pfNickGo', () => saveNickname($('pfNick').value)); const nk = $('pfNick'); if (nk) nk.onkeydown = (e) => { if (e.key === 'Enter') saveNickname(nk.value); };
  $('center').querySelectorAll('[data-tc]').forEach((b) => { b.onclick = () => act(() => { S.P.theme_color = b.dataset.tc; return true; }, () => { try { window.__llChatColor = b.dataset.tc; } catch (_) {} presenceBeat(true); }); });
  on('pfPhoto', () => call('pickPhoto').then((r) => { if (!r.ok) { if (r.error) toast(r.error); return; } const data = String(r.data || ''); if (!data) { toast('사진을 읽지 못했습니다. 다른 사진을 골라 주세요.'); return; } act(() => { S.P.photo = data; return true; }, () => { presenceBeat(true); toast('프로필 사진을 바꿨습니다.'); }); }));
  on('pfPhotoX', () => act(() => { S.P.photo = ''; return true; }, () => { presenceBeat(true); toast('올린 사진을 지웠습니다. 기본 아이콘으로 표시됩니다.'); }));
  $('center').querySelectorAll('[data-av]').forEach((b) => { b.onclick = () => act(() => { S.P.avatar = Number(b.dataset.av); S.P.photo = ''; gLog('프로필 사진을 바꿨다.'); return true; }, () => presenceBeat(true)); }); }
function saveNickname(t) { const n = String(t || '').trim(); if (n.length < 2 || n.length > 10) { toast('닉네임은 2~10자입니다.'); return; } if (n === String(S.acct?.accountNickname ?? displayName())) { toast('현재 닉네임과 같습니다.'); return; } if (nickWaitLeft() > 0) { toast(`닉네임 변경은 7일에 한 번입니다. ${durationText(nickWaitLeft())} 남았습니다.`); return; } if (!LIVE.on) return;
  call('updateProfile', n, Number(S.P.level)).then((r) => { if (!r.ok) { toast(r.error || '닉네임 변경 실패'); return; } S.acct.accountNickname = n; if ('nickname' in r) S.acct.nickname = String(r.nickname); S.acct.nicknameReadyAt = Number(r.nicknameReadyAt ?? nowSec() + Number(M.NICKNAME_INTERVAL)); act(() => { gLog(`계정 닉네임을 ${n}(으)로 바꿨다. (다른 생존자에게는 보이지 않음)`); return true; }); presenceBeat(true); }); }
/* 나이 읽기(chars.parse_age) */
function parseAge(raw) { let shown = String(raw).trim(), s = shown.replace(/ /g, ''); if (!s) return { ok: false, error: '나이를 적어 주세요. (18세 이상 · 예: 25 또는 스물다섯)' }; if (s.length > 16) return { ok: false, error: '나이는 16자 안으로 적어 주세요.' };
  const isInt = (x) => /^[+-]?\d+$/.test(x); if (s.endsWith('살')) s = s.slice(0, -1); else if (s.endsWith('세') && isInt(s.slice(0, -1))) s = s.slice(0, -1); let num = -1;
  if (isInt(s)) { num = s.length <= 15 ? parseInt(s, 10) : -1; shown = num >= 0 ? num + '세' : shown; } else { num = nativeAge(s); if (num < 0) num = sinoAge(s); if (num < 0 && s.endsWith('세')) { const cut = s.slice(0, -1); num = sinoAge(cut); if (num < 0) num = nativeAge(cut); } }
  if (num < 0) return { ok: false, error: '나이를 알아볼 수 없습니다. 숫자(25)나 한글(스물다섯, 이십오)로 적어 주세요.' }; if (num < 18) return { ok: false, error: '나이는 18세 이상이어야 합니다.' }; return { ok: true, num, text: shown }; }
function nativeAge(s) { const CH = D.chars; let total = 0, rest = s; for (const k of Object.keys(CH.NATIVE_TENS)) if (rest.startsWith(k)) { total += CH.NATIVE_TENS[k]; rest = rest.slice(k.length); break; } if (rest) { if (!(rest in CH.NATIVE_ONES)) return -1; total += CH.NATIVE_ONES[rest]; } return total > 0 ? total : -1; }
function sinoAge(s) { const CH = D.chars; let total = 0, sec = 0, dg = -1; for (const ch of s) { if (ch in CH.SINO_DIGITS) dg = CH.SINO_DIGITS[ch]; else if (ch in CH.SINO_UNITS) { sec += (dg > 0 ? dg : 1) * CH.SINO_UNITS[ch]; dg = -1; } else if (ch === '만') { total += (sec + Math.max(dg, 0) > 0 ? sec + Math.max(dg, 0) : 1) * 10000; sec = 0; dg = -1; } else return -1; } return total + sec + Math.max(dg, 0); }
function charValid(name, age) { if (!/^[가-힣A-Za-z0-9]{2,10}$/.test(String(name).trim())) return '캐릭터 이름은 한글·영문·숫자 2~10자로 적어 주세요. (띄어쓰기·기호 불가)'; const a = parseAge(age); return a.ok ? '' : a.error; }
const CHS = { busy: false };
function charSetup(name, ageText, done) { const why = charValid(name, ageText); if (why) { toast(why); return; } if (CHS.busy) return; CHS.busy = true; const a = parseAge(ageText);
  call('charSetup', String(name).trim(), a.num, a.text).then((r) => { CHS.busy = false; if (!r.ok) { toast(r.error || '이름을 정하지 못했습니다.'); return; } if (r.signedIn && String(r.uid || '') === myUid()) { for (const k of ['nickname', 'accountNickname', 'charId']) S.acct[k] = String(r[k] ?? S.acct[k] ?? ''); S.acct.charAge = Number(r.charAge || 0); S.acct.charAgeText = String(r.charAgeText || ''); S.acct.charSetup = r.charSetup ?? true; S.acct.chars = Array.isArray(r.chars) ? r.chars : []; S.acct.charCreateReadyAt = Number(r.charCreateReadyAt || 0); } presenceBeat(true); if (done) done(); }); }
function renameModal() { let age = charAgeText(); if (!age) age = '25';
  modal('캐릭터 이름 바꾸기', `<p class="muted">접속 목록 · 채팅 · 친구에 새 이름이 보입니다. 이미 보낸 쪽지 · 채팅에는 예전 이름이 남습니다. 한글 · 영문 · 숫자 2~10자.</p><label class="muted">새 캐릭터 이름</label><input class="sel" id="rnIn" maxlength="10" placeholder="2~10자 · 띄어쓰기 · 기호 없이" value="${esc(displayName().replace(/^GM · /, ''))}">`,
    [['이름 바꾸기', 'primary keep', () => { const nm = $('rnIn').value.trim(); if (nm === displayName()) { toast('지금과 같은 이름입니다.'); return; } charSetup(nm, age, () => { $('modalRoot').innerHTML = ''; toast(`캐릭터 이름을 '${nm}'(으)로 바꿨습니다.`); act(() => true); }); }], ['취소', '', null]]); }
const CHD = { d: null };
function beginCharEdit() { const ch = S.P.character || {}; CHD.d = { fresh: false, appearance: String(ch.appearance ?? ch.background ?? ''), personality: String(ch.personality ?? ch.traits ?? ''), gender: String(ch.gender || ''), public: !!ch.public, pub: characterPub(ch), name: String(S.acct?.nickname || ''), age: charAgeText() }; go('create_character'); }
function charEditPage() { const d = CHD.d; if (!d) return profilePage(); let h = headT(d.fresh ? '캐릭터 생성' : '캐릭터 정보 수정', '캐릭터 · ' + displayName());
  if (LIVE.on && (!d.fresh || S.acct?.charSetup === false)) h += groupLab('캐릭터 이름 · 나이') + noteBox('이름을 바꾸면 접속 목록·채팅·친구에 새 이름이 보입니다. 이미 보낸 쪽지·채팅에는 예전 이름이 남습니다.') + noteBox('다른 생존자에게는 계정 닉네임 대신 캐릭터 이름만 보입니다. 이름은 한글·영문·숫자 2~10자입니다. 나이는 18세 이상이면 상한이 없고, 숫자(25)나 한글(스물다섯 살, 이십오 세)로 적을 수 있습니다.') +
    `<label class="muted">캐릭터 이름</label><input class="sel" data-cd="name" maxlength="10" placeholder="2~10자 · 띄어쓰기·기호 없이" value="${esc(d.name)}"><label class="muted">나이</label><input class="sel" data-cd="age" maxlength="16" placeholder="18세 이상 · 숫자 또는 한글 (예: 25, 스물다섯)" value="${esc(d.age || '')}"><label class="sqchk"><input type="checkbox" data-cp="age" ${d.pub.age ? 'checked' : ''}>나이 모두에게 공개</label>`;
  if (d.fresh) h += freshExtraHtml();
  for (const [k, l, mx] of [['appearance', '외관', 300], ['personality', '성격', 500], ['gender', '성별 · 자유 입력', 20]]) h += `<div class="cdhd"><b style="color:var(--warning)">${l}</b><label class="sqchk"><input type="checkbox" data-cp="${k}" ${d.pub[k] ? 'checked' : ''}>공개</label></div><textarea class="sel" data-cd="${k}" maxlength="${mx}" rows="${k === 'gender' ? 2 : 3}">${esc(d[k])}</textarea>`;
  h += noteBox("'공개'에 체크한 항목만 다른 생존자의 정보 창에 보입니다."); if (d.fresh) h += freshTailHtml();
  return h + choiceRow('', d.fresh ? '캐릭터 만들기' : '저장하기', d.fresh ? '이 능력치와 소개로 시작합니다.' : '고친 내용을 저장합니다.', 'var(--accent)', true, 'id="cdSave"') + (d.fresh ? '' : choiceRow('', '취소', '', 'var(--muted)', true, 'id="cdBack"')); }
function bindCharEdit() { const c = $('center'), d = CHD.d; if (!d) { bindProfile(); return; } c.querySelectorAll('[data-cd]').forEach((x) => { x.oninput = () => { d[x.dataset.cd] = x.value; }; }); c.querySelectorAll('[data-cp]').forEach((x) => { x.onchange = () => { d.pub[x.dataset.cp] = x.checked; }; });
  $('cdSave').onclick = finishCharEdit; const bk = $('cdBack'); if (bk) bk.onclick = () => { CHD.d = null; go('profile'); }; if (d.fresh) bindFresh(); }
function finishCharEdit() { const d = CHD.d; if (!d) return; if (d.fresh) { if (LIVE.on && S.acct?.charSetup === false && !d._named) { charSetup(String(d.name || ''), String(d.age || ''), () => { d._named = true; finishCharEdit(); }); return; } finishFresh(); return; } if (LIVE.on && !d._named) { const nn = String(d.name).trim(), na = String(d.age).trim(); if (nn !== String(S.acct?.nickname || '') || na !== charAgeText()) { charSetup(nn, na, () => { d._named = true; finishCharEdit(); }); return; } }
  const pub = { age: !!d.pub.age, appearance: !!d.pub.appearance, personality: !!d.pub.personality, gender: !!d.pub.gender };
  act(() => { S.P.character = { created: true, appearance: String(d.appearance).trim().slice(0, 300), personality: String(d.personality).trim().slice(0, 500), gender: String(d.gender).trim().slice(0, 20), public: Object.values(pub).includes(true), pub }; return true; }, () => { CHD.d = null; presenceBeat(true); go('profile'); }); }
/* 하드 모드(봉쇄 해제 구역) */
var REG_ORIG = GD.REGIONS.map((r) => ({ min_level: r.min_level, tier: r.tier })), HARD_APPLIED = false;
function syncHardMode() { if (!REG_ORIG) return; const on = !!(S.P && S.P.hard_mode); if (on === HARD_APPLIED) return; HARD_APPLIED = on; GD.REGIONS.forEach((r, i) => { r.min_level = REG_ORIG[i].min_level; r.tier = REG_ORIG[i].tier; if (on && Number(r.realm) <= HARD_REALM_MAX) { r.min_level = 100; r.tier = 5; } }); LOCS = null; }
function hardProgress() { const seen = new Set(normalVisited().map(String)); syncHardMode(); const ids = locations().map((l) => locId(l)); return [ids.filter((i) => seen.has(i)).length, ids.length]; }
const hardUnlocked = () => { if (S.admin) return true; const [a, b] = hardProgress(); return Number(S.P.level || 1) >= 100 && a >= b; };
function setHardMode(on) { const p = S.P; if (on === !!p.hard_mode) return false; if (on && !hardUnlocked()) { toast('Lv.100 · 모든 구역 탐사 완료 후 열립니다.'); return false; } if (activityBusy()) { toast('진행 중인 이동 · 탐사 · 전투 · 제작을 마친 뒤 바꿀 수 있습니다.'); return false; }
  if (on) { p.visited_normal = [...(p.visited || [])]; p.visited = Array.isArray(p.visited_hard) ? [...p.visited_hard] : []; } else { p.visited_hard = [...(p.visited || [])]; p.visited = Array.isArray(p.visited_normal) ? [...p.visited_normal] : p.visited; }
  p.hard_mode = on; if (!on && !('hard_seen' in p)) p.hard_seen = true; syncHardMode(); gLog(`[color=#ff8070]${on ? '하드 모드' : '일반 모드'}[/color]  ${on ? '봉쇄가 풀린 구역이 모두 Lv.100으로 바뀌었다.' : '원래 지도로 돌아왔다.'}`); toast(on ? '하드 모드를 켰습니다 · 모든 구역 Lv.100' : '일반 모드로 돌아왔습니다'); return true; }
function hardModal() { const on = !!S.P.hard_mode, un = hardUnlocked(), [a, b] = hardProgress(), lvOk = Number(S.P.level || 1) >= 100, busy = activityBusy();
  modal('하드 모드 · 봉쇄 해제 구역', `<div class="hardhero"><small>최종 감염원 너머</small><p>특수 탐사의 마지막 봉쇄 구역 '최종 감염원'까지 정리하자, 군 무전에 새 신호가 잡혔다.\n"수도권과 남부 전역의 봉쇄선을 해제한다. 격리 구역에 갇혀 있던 상위 감염체가 도시 전체로 퍼졌다."</p></div><p style="color:var(--text)">이미 지나온 서울 · 인천 · 경기도 · 세종 · 대전 · 전남 · 광주가 다시 열립니다. 이번에는 모든 구역이 Lv.100 위험 지역입니다. 구역 수는 같고, 지도와 탐사 방법도 같습니다.</p>${kvRows([['바뀌는 곳', '서울 · 인천 · 경기도 · 세종·대전 · 전남·광주 (특수 탐사는 그대로)'], ['구역 레벨', '모든 구역 Lv.100 · 적 · 전투 확률 · 소모 · 보상도 Lv.100 기준'], ['탐사 기록', '하드 모드 기록은 따로 쌓입니다. 끄면 원래 기록(✓)으로 돌아옵니다'], ['전환', '언제든 켜고 끌 수 있습니다 · 이동 · 탐사 · 전투 중에는 불가']])}
    <div class="panel" style="padding:12px 16px;display:grid;gap:6px"><span class="muted" style="font-size:13px">여는 조건</span><b style="color:${lvOk ? 'var(--accent)' : 'var(--danger)'}">${lvOk ? '✓' : '✗'} 레벨 100 · 지금 Lv.${Number(S.P.level || 1)}</b><b style="color:${a >= b ? 'var(--accent)' : 'var(--danger)'}">${a >= b ? '✓' : '✗'} 모든 탐사 구역 완료(특수 탐사 포함) · ${a} / ${b}</b>${cbar(a, b, 'var(--accent)')}</div>${busy ? '<p style="color:var(--warning);font-size:12px">진행 중인 이동 · 탐사 · 전투 · 제작을 마친 뒤 바꿀 수 있습니다.</p>' : ''}`,
    [['닫기', '', null], [on ? '일반 모드로 돌아가기' : un ? '하드 모드 켜기' : '아직 잠겨 있습니다', (on ? 'primary' : 'dangerfill') + ((!on && !un) || busy ? ' disabled' : ''), (!on && !un) || busy ? null : () => act(() => setHardMode(!on))]]); }

/* ════════ 관리자(GM) — main._render_admin · admin_player · 성장/상태 조정 · 배포 · 가상화폐 · 가입 코드 · 공지 · 도시 목표 · 수리 요금 ════════ */
const ADM = { loading: false, players: [], parties: [], rtdb: -1, tab: '운영', confirm: '', target: {}, playersOpen: false, subUid: '', reg: { loading: false, required: true, codes: [], error: '' }, notices: [], cur: { op: 'add', kind: 'money', scope: 'individual', target: '', amount: 1, nonce: '', step: 'form', caps: {}, capLoading: false, capErr: '', issuing: false }, gs: { sel: null, minutes: 10 }, bq: '' };
function lightOnRevive() { const d = isDict(S.P.light) ? S.P.light : null; if (!d || Number(d.pre || 0) <= 0) return; const t = Math.floor(kstNow() / 86400); d.cur = Number(d.pre); d.pre = 0; d.last = t; if (Number(d.from ?? -1) < 0) d.from = t - Number(d.cur) + 1; if (Array.isArray(d.deaths) && d.deaths.length) d.deaths.pop(); }
function adminApplyAction(action, by) { actWhenFree(() => { const p = S.P; if (action === 'revive') { if (p.dead) lightOnRevive(); p.conditions = {}; p.field_ready_at = 0; p.dead = false; p.death_cause = ''; p.hp = Number(p.max_hp); for (const k of ['hunger', 'water', 'morale']) p[k] = Math.max(Number(p[k]), 40); gLog(`[color=#3fd0a4]부활[/color]  관리자 ${by}이(가) 당신을 되살렸다.`); toast(`관리자 ${by}이(가) 부활시켰습니다.`); }
  else if (action === 'kill') { p.long_expedition = {}; p.pending_explore = {}; p.travel = {}; p.hp = 0; p.dead = true; p.death_cause = `관리자 ${by}에 의해 사망`; p.buffs = {}; p.battle = {}; gLog(`[color=#f2706a]사망[/color]  관리자 ${by}에 의해 사망 처리되었다.`); toast('관리자에 의해 사망 처리되었습니다.'); } else return false; return true; },
  () => { if (action === 'revive' && S.mode === 'dead') go('hub'); if (action === 'kill') go('dead'); }); }
/* 관리자 지급(개별) — 받은 물품함으로 */
function receiveGift(money, items, by, gid = '') { const p = S.P, toBox = !!gid, parts = []; let boxed = false; if (money > 0) { p.money = Number(p.money || 0) + money; parts.push(won(money)); } const known = new Set(allItemNames());
  for (const k in items) { const q = Math.trunc(Number(items[k])); if (q <= 0 || !known.has(k)) continue; if (!toBox && addItem(k, q)) { parts.push(`${k} × ${q}`); continue; } if (!isDict(p.stored_loot)) p.stored_loot = {}; p.stored_loot[k] = Number(p.stored_loot[k] || 0) + q; parts.push(`${k} × ${q}`); boxed = true; }
  if (!parts.length) return false; const where = boxed ? '물품은 받은 물품함(가방 › 인벤토리 맨 위)에 들어 있습니다.' : ''; gLog(`[color=#e3b341]관리자 지급[/color]  ${by} — ${parts.join(', ')}${boxed ? ' · 받은 물품함' : ''}`);
  if (toBox) notify('gmgift-' + gid, '관리자 지급 · ' + by, parts.join(', ') + (where ? '\n' + where : ''), 'system'); else toast('받았습니다: ' + parts.join(', ') + (where ? ' · ' + where : '')); return true; }
function processAdminGifts() { if (!S.P || $('app').hidden) return; for (const gid of Object.keys(SOC.adminGiftQueue)) { if (SOC.adminGiftClaiming[gid]) continue; SOC.adminGiftClaiming[gid] = true; const g = SOC.adminGiftQueue[gid];
  call('claimGift', gid).then((r) => { delete SOC.adminGiftQueue[gid]; if (r.ok) actWhenFree(() => receiveGift(Number(g.money || 0), isDict(g.items) ? g.items : {}, String(g.by || '관리자'), gid)); }); } }
/* 관리 명령(watchControls → claimControl → _apply_control) */
function changeXp(v) { const p = S.P; if (v >= 0) { addXp(v); return; } const old = Number(p.level); let total = Math.max(0, xpTotal(old, Number(p.xp)) + v), lv = 1; while (lv < 100 && total >= xpNeed(lv)) { total -= xpNeed(lv); lv++; } p.level = lv; p.xp = total; p.skill_points = Math.max(0, Number(p.skill_points) - Math.max(0, old - lv) * 3); syncGrowth(); gLog(`경험치 감소 ${signed(v)} · 현재 레벨 ${lv} (투자한 스탯은 보존)`); }
const GMS = D.gm_state_ui;
function controlLabel(a, v, st) { const L = { xp: `경험치 ${signed(v)}`, money: `금액 ${signed(v)}원`, coins: `코인 ${signed(v)}`, points: `스탯 포인트 ${signed(v)}`, set_level: `레벨 ${v}(으)로 지정`, set_stat: `${st} ${v}(으)로 지정`, set_hp: `체력 ${v}(으)로 지정`, set_hunger: `허기 ${v}(으)로 지정`, set_water: `수분 ${v}(으)로 지정`, set_morale: `사기 ${v}(으)로 지정`, clear_status: '부정 상태 해제', clear_positive: '긍정 상태 해제', restore: '전체 회복', reset_daily: '오늘 탐사 횟수 초기화', skip_travel: '이동 시간 건너뛰기', complete_activity: '진행 중인 활동 완료',
    teleport: `${GD.REGIONS[Math.max(0, Math.min(GD.REGIONS.length - 1, v))].name}(으)로 순간 이동`, grant_positive: `긍정 상태 '${BD.POSITIVES[st]?.name ?? st}' ${durationText(Math.max(60, Math.min(GMS.MAX_SECONDS, v)))} 부여`, grant_condition: `부정 상태 '${ED.CONDITIONS[st]?.name ?? st}' ${durationText(Math.max(60, Math.min(GMS.MAX_SECONDS, v)))} 부여`, set_daily_quests: '일일 퀘스트 변경', set_weekly_quests: '주간 퀘스트 변경', currency_sync: '가상화폐 지급 반영' }; return josaFix(L[a] || a); }
function applyControl(cmd) { const p = S.P, a = String(cmd.action || ''), v = Math.max(-1000000, Math.min(1000000, Math.trunc(Number(cmd.value || 0)))); let nextMode = '';
  switch (a) { case 'xp': changeXp(v); break; case 'money': p.money = Math.max(0, Number(p.money) + v); break; case 'coins': p.coins = Math.max(0, Number(p.coins || 0) + v); break;
    case 'currency_sync': { const cur = String(cmd.currency || ''), rev = Number(cmd.socialRevision ?? -1); if (['money', 'coins'].includes(cur) && rev >= Number(p.socialRevision || 0)) { p.gmCurrencyClaimId = String(cmd.grantId || ''); p.gmCurrencyClaimKind = cur; } break; }
    case 'points': p.skill_points = Math.max(0, Math.min(1000000, Number(p.skill_points) + v)); break;
    case 'set_level': { const old = Number(p.level); p.level = Math.max(1, Math.min(100, v)); p.xp = 0; p.skill_points = Math.max(0, Number(p.skill_points) + (Number(p.level) - old) * 3); syncGrowth(); break; }
    case 'set_stat': { const st = String(cmd.stat || ''); if (BD.STATS.includes(st)) { if (!isDict(p.invested)) p.invested = {}; const base = isDict(p.base_stats) ? p.base_stats : BD.BASE; p.invested[st] = Math.max(0, v - Number(base[st] ?? BD.BASE[st]) - naturalGrowth(Number(p.level))); syncGrowth(); } break; }
    case 'set_hp': p.hp = Math.max(0, Math.min(Number(p.max_hp), v)); if (v <= 0) checkDeath('관리자 체력 조정'); break; case 'set_hunger': p.hunger = Math.max(0, Math.min(100, v)); break; case 'set_water': p.water = Math.max(0, Math.min(100, v)); break; case 'set_morale': p.morale = Math.max(0, Math.min(100, v)); break;
    case 'clear_status': p.conditions = {}; break; case 'clear_positive': p.positive = {}; break;
    case 'grant_positive': if (!posGrantId(String(cmd.stat || ''), Math.max(60, Math.min(GMS.MAX_SECONDS, Math.trunc(Number(cmd.value || 0)))))) return false; break;
    case 'grant_condition': { const cid = String(cmd.stat || ''); if (!ED.CONDITIONS[cid]) return false; inflictCondition(cid, Math.max(60, Math.min(GMS.MAX_SECONDS, Math.trunc(Number(cmd.value || 0))))); break; }
    case 'restore': p.conditions = {}; p.hp = Number(p.max_hp); p.hunger = 100; p.water = 100; p.morale = 100; if (p.dead) lightOnRevive(); p.dead = false; p.death_cause = ''; if (S.mode === 'dead') nextMode = 'hub'; break;
    case 'reset_daily': calendarSyncMut(); p.field_count = 0; break;
    case 'set_daily_quests': case 'set_weekly_quests': { questSync(); const qs = a === 'set_daily_quests' ? 'daily' : 'weekly', all = qs === 'daily' ? QD.DAILY : QD.WEEKLY; let want = []; for (const id0 of String(cmd.stat || '').split(',')) { const id = id0.trim(); if (id && all.some((q) => q.id === id) && !want.includes(id)) want.push(id); } if (!want.length) want = questPick(qs); p.quests[qs].picked = want.slice(0, 8); notify(`gm-quest-${Date.now()}`, '퀘스트 변경', `관리자 ${cmd.by || '관리자'}이(가) ${qs === 'daily' ? '일일' : '주간'} 퀘스트를 바꿨습니다.`, 'quest'); break; }
    case 'skip_travel': if (nonEmpty(p.travel)) { p.travel.ready = nowSec(); travelTickDue(); } break;
    case 'complete_activity': p.field_ready_at = 0; if (nonEmpty(p.travel)) { p.travel.ready = nowSec(); travelTickDue(); } if (nonEmpty(p.long_expedition)) { p.long_expedition.ready = nowSec(); longTickCore(); } if (nonEmpty(p.pending_explore)) { p.pending_explore.ready = nowSec(); exploreTickDue(); } break;
    case 'teleport': if (v < 0 || v > 9) return false; p.pending_explore = {}; p.long_expedition = {}; p.travel = {}; p.result_baseline = {}; p.battle = {}; p.region = v; nextMode = 'explore'; break;
    default: return false; }
  gLog(`[color=#e3b341]관리자[/color]  ${cmd.by || '관리자'} · ${controlLabel(a, a.startsWith('grant_') ? Math.trunc(Number(cmd.value || 0)) : v, String(cmd.stat || ''))}`); if (nextMode) FD.ctlMode = nextMode; return true; }
function applyControlNow(cmd) { actWhenFree(() => applyControl(cmd), () => { presenceBeat(true); if (FD.ctlMode) { const m = FD.ctlMode; FD.ctlMode = ''; go(m); } }); }
function processCommands() { if (!S.P || $('app').hidden || SOC.busy || Object.keys(SOC.cmdClaiming).length) return;
  for (const id of Object.keys(SOC.cmdQueue)) { if (Date.now() < Number(SOC.cmdRetryAt[id] || 0)) continue; SOC.cmdClaiming[id] = true;
    socialCall('claimControl', [id], (res) => { if (res.skipped) { delete SOC.cmdClaiming[id]; SOC.cmdRetryAt[id] = Date.now() + 600000; return; } delete SOC.cmdQueue[id]; delete SOC.cmdClaiming[id]; delete SOC.cmdRetryAt[id]; if (isDict(res.command)) applyControlNow(res.command); },
      (res) => { delete SOC.cmdClaiming[id]; if (!(id in SOC.cmdRetryAt)) toast('관리자 지급 수령 대기 · ' + (res.error || '연결 복구 후 다시 확인합니다.')); SOC.cmdRetryAt[id] = Date.now() + 5000; }); return; } }
function adminControl(uid, action, value, stat) { if (!S.admin) return; if (!uid || uid === myUid()) { applyControlNow({ action, value, stat, by: displayName() }); return; } call('adminControl', uid, action, value, stat).then((r) => toast(r.ok ? '관리 명령 전달 완료 · 접속 중이 아니면 다음 입장에 적용' : r.error || '실패')); }
/* 관리자 화면 */
function openAdmin() { if (!S.admin) { toast('관리자만 사용할 수 있습니다.'); return; } ADM.loading = true; ADM.confirm = ''; go('admin', true);
  call('adminListPlayers').then((r) => { ADM.loading = false; ADM.players = r.ok && Array.isArray(r.players) ? r.players : []; if (!r.ok) toast(r.error || '플레이어 목록을 불러오지 못했습니다.'); if (S.mode === 'admin') redrawKeep(); });
  call('listParties').then((r) => { ADM.parties = r.ok && Array.isArray(r.parties) ? r.parties : []; if (S.mode === 'admin') redrawKeep(); }); call('adminRtdbStatus').then((r) => { ADM.rtdb = r.rtdb ? 1 : 0; if (S.mode === 'admin') redrawKeep(); }); }
const admCard = (t, s, body) => `<div class="panel admcard">${t ? `<b>${esc(t)}</b>${s ? `<span class="muted" style="font-size:12px">${esc(s)}</span>` : ''}` : ''}${body}</div>`;
function adminPage() { if (!S.admin) return noteBox('관리자만 사용할 수 있습니다.'); let h = headT('관리자', 'GM 전용 운영 도구 · 일반 플레이어에게는 보이지 않습니다');
  if (ADM.rtdb === 0) h += noteBox("[!] 이 계정은 실시간 DB 관리자 명단(dmAdmins)에 아직 없습니다.\n월드 채팅 삭제 · 거대 감염체 소환/철수 · 반려동물 이벤트가 '권한 없음'으로 막힙니다.\nCloud Shell의 lastlight-v36 폴더에서 python3 관리자권한동기화.py 를 한 번 실행한 뒤 새로고침하세요. (배포36.sh도 자동으로 실행합니다)"); else if (ADM.rtdb === 1) h += noteBox('관리자 권한 확인 · Firestore + 실시간 DB 모두 정상');
  if (S.P.dead) h += choiceRow('', '나 자신 부활', '관리자 권한으로 바로 되살아납니다.', 'var(--accent)', true, 'id="admSelf"');
  h += `<div class="pills">${['운영', '지급', '협력 · 이벤트'].map((t) => `<button class="pill ${ADM.tab === t ? 'on' : ''}" data-atab="${t}">${t}</button>`).join('')}</div>`;
  if (ADM.tab === '운영') { h += admCard('생존 수치 감소 속도', '각각 25~300% · 접속 중인 모두에게 바로 적용됩니다', [['hunger', '허기'], ['water', '수분'], ['morale', '사기']].map(([k, l]) => `<div class="kvx"><b>${l}</b><b id="arv_${k}">${LIFE.decay[k]}%</b></div><input type="range" min="25" max="300" step="5" value="${LIFE.decay[k]}" data-arate="${k}">`).join(''));
    h += admCard('', '', `<div class="admsw"><div><b>감염 사망 규칙</b><p class="muted" style="font-size:12px;margin:2px 0 0">켜면 치료하지 않은 감염이 변이 → 최종 변이로 이어지고, 최종 변이는 변이 치료제로만 고칠 수 있습니다.</p></div><button class="swt ${LIFE.infection ? 'on' : ''}" id="admInf"><i></i></button></div>`);
    h += admCard('운영 도구', '', [['제보 · 건의 관리', 'data-go="report_admin"', 'var(--blue)'], ['가입 코드 관리', 'id="admReg"', 'var(--blue)'], ['공통 수리 요금 설정', 'data-go="repair_settings"', 'var(--blue)'], ['행상인 즉시 등장', 'id="admMer"', 'var(--warning)']].map(([t, at, c]) => `<button class="btn admbtn" style="color:${c}" ${at}>${t}</button>`).join('')); return h; }
  if (ADM.tab === '지급') { h += admCard('지급', '아이템 · 가상화폐를 보냅니다', `<button class="btn admbtn" style="color:var(--warning)" data-go="admin_broadcast">아이템 배포 · 내 가방에 받기</button><button class="btn admbtn" style="color:var(--warning)" id="admCur">GM 가상화폐 지급 · 차감</button>`) + admCard('나에게 적용', '', `<button class="btn admbtn" style="color:var(--blue)" data-asub="admin_grow">상태 · 성장 조정</button><button class="btn admbtn" style="color:var(--blue)" data-asub="admin_status">긍정 · 부정 상태 부여</button>`);
    h += choiceRow('', `플레이어 · 최근 활동 순 ${ADM.players.length}명` + (ADM.playersOpen ? '  · 접기' : '  · 펼치기'), '누르면 목록을 ' + (ADM.playersOpen ? '접습니다.' : '펼칩니다.'), 'var(--blue)', true, 'id="admPl"');
    if (ADM.playersOpen) { if (ADM.loading) h += noteBox('목록을 불러오는 중…'); else if (!ADM.players.length) h += noteBox('표시할 플레이어가 없습니다.');
      ADM.players.forEach((p, i) => { let st = '서버 기록 없음'; if (p.hasSave) st = p.dead ? '사망' : `생존 · 체력 ${Number(p.hp || 0)} / ${Number(p.maxHp || 0)}`; let an = String(p.nickname ?? '?'), al = Number(p.level || 1); const oth = []; for (const c of Array.isArray(p.chars) ? p.chars : []) { if (c.active) { an = String(c.name ?? an); al = Number(c.level ?? al); } else oth.push(`${c.name || ''} Lv.${Number(c.level || 1)}`); }
        h += choiceRow('', `${an} / ${p.username ?? '?'}   Lv.${al}`, st + (oth.length ? ' · 다른 캐릭터 ' + oth.join(', ') : ''), p.dead ? 'var(--danger)' : 'var(--accent)', true, `data-apl="${i}"`); }); }
    h += groupLab('온라인 파티 · 누르면 강제 해체'); if (!ADM.parties.length) h += noteBox('모집 중인 파티가 없습니다.');
    for (const pt of ADM.parties) { const pid = String(pt.id || ''), armed = ADM.confirm === 'party:' + pid; h += choiceRow('', `${pt.name || ''}   ${(pt.members || []).length} / ${Number(pt.max || 8)}`, armed ? '한 번 더 누르면 해체됩니다.' : `파티장 ${pt.leaderName ?? '?'}`, 'var(--danger)', true, `data-adis="${esc(pid)}"`); }
    return h + choiceRow('', '새로고침', '', 'var(--blue)', true, 'id="admRe"') + choiceRow('', '거점으로 돌아가기', '', 'var(--muted)', true, 'data-go="hub"'); }
  const cs = S.city || {}, season = Number(cs.season || 0), goal = Math.max(1, Number(cs.goal || 0)), total = Number(cs.total || 0), waiting = !!(isDict(cs.final) && cs.final.defeatedAt != null && Number(cs.final.season || 0) === season);
  h += admCard('협력 · 이벤트', '반려동물 출현 · 거대 감염체 소환 · 철수', '<button class="btn warnfill" id="admCoop">협력 · 이벤트 도구 열기</button>');
  h += admCard('도시 복구 목표', season > 0 ? `이번 시즌 ${season} · 지금 ${total} / ${goal}점 (${Math.trunc((total / goal) * 100)}%)` + (waiting ? ' · 시즌 대기 중' : '') : '시즌 정보를 불러오는 중입니다', `<button class="btn warnfill" id="admGoal">복구 목표 바꾸기</button><button class="btn ${waiting ? 'primary' : ''}" id="admSeason" ${waiting ? '' : 'disabled'}>${waiting ? `다음 시즌 열기 · 시즌 ${season + 1}` : '다음 시즌 열기 · 시즌 보스를 쓰러뜨린 뒤 가능'}</button>`);
  h += admCard('공지 팝업', '접속한 모두에게 화면 가운데 공지를 띄웁니다', '<div class="brow"><button class="btn warnfill" id="admNot">공지 보내기</button><button class="btn" style="color:var(--warning)" id="admNotL">보낸 공지 · 삭제</button></div>');
  return h + noteBox("채팅 메시지 옆 '삭제'로 공지와 다른 사람의 채팅을 지울 수 있습니다. 공지는 채팅창 '공지' 탭에서 씁니다."); }
function bindAdmin() { const c = $('center'), on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; }; c.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  c.querySelectorAll('[data-atab]').forEach((b) => { b.onclick = () => { ADM.tab = b.dataset.atab; redrawKeep(); }; }); on('admSelf', () => adminApplyAction('revive', displayName()));
  c.querySelectorAll('[data-arate]').forEach((s) => { const k = s.dataset.arate; s.oninput = () => { $('arv_' + k).textContent = s.value + '%'; }; s.onchange = () => { const pick = { ...LIFE.decay, [k]: Number(s.value) }; call('setSurvivalRates', pick.hunger, pick.water, pick.morale).then((r) => { if (r.ok) { LIFE.decay[k] = Number(s.value); toast(`${{ hunger: '허기', water: '수분', morale: '사기' }[k]} 감소 속도 ${s.value}%로 적용했습니다.`); } else toast(r.error || '저장하지 못했습니다.'); }); }; });
  on('admInf', () => { const nx = !LIFE.infection; call('setInfectionRule', nx).then((r) => { if (r.ok) { LIFE.infection = nx; toast(`감염 악화 규칙을 ${nx ? '켰습니다' : '껐습니다'}. 접속 중인 모든 생존자에게 바로 적용됩니다.`); rerender(); } else toast(r.error || '바꾸지 못했습니다.'); }); });
  on('admReg', openRegAdmin); on('admMer', () => call('forceMerchant').then((r) => toast(r.ok ? '행상인이 전체 계정에 1시간 동안 등장합니다.' : r.error || '실패'))); on('admCur', openCurrency);
  c.querySelectorAll('[data-asub]').forEach((b) => { b.onclick = () => { ADM.subUid = ''; go(b.dataset.asub); }; }); on('admPl', () => { ADM.playersOpen = !ADM.playersOpen; redrawKeep(); }); c.querySelectorAll('[data-apl]').forEach((b) => { b.onclick = () => adminOpenPlayer(ADM.players[Number(b.dataset.apl)]); });
  c.querySelectorAll('[data-adis]').forEach((b) => { b.onclick = () => { const pid = b.dataset.adis; if (ADM.confirm !== 'party:' + pid) { ADM.confirm = 'party:' + pid; redrawKeep(); return; } ADM.confirm = ''; call('adminDisbandParty', pid).then((r) => { if (r.ok) { toast('파티를 강제 해체했습니다.'); act(() => { gLog('[color=#f2706a]관리자[/color]  온라인 파티 강제 해체'); return true; }); openAdmin(); } else toast(r.error || '해체하지 못했습니다.'); }); }; });
  on('admRe', openAdmin); on('admCoop', coopGmTools); on('admGoal', cityGoalModal); on('admSeason', () => { const season = Number(S.city?.season || 0); call('cityAdvanceGM', season).then((r) => { toast(r.ok ? `시즌 ${Number(r.season ?? season + 1)}을(를) 열었습니다.` : r.error || '다음 시즌을 열지 못했습니다.'); if (r.ok) call('cityState').then((x) => { if (x.ok) { S.city = x; redrawKeep(); } }); }); });
  on('admNot', noticeModal); on('admNotL', noticeListModal); }
function adminOpenPlayer(p) { ADM.target = p || {}; ADM.confirm = ''; go('admin_player'); }
const admTargetName = (uid) => (!uid || uid === myUid() ? `나 (${displayName()})` : String(ADM.target.nickname ?? '선택한 유저'));
function adminPlayerPage() { const p = ADM.target; let h = headT('플레이어 관리', `${p.nickname ?? '?'}  (${p.username ?? '?'})  ·  Lv.${Number(p.level || 1)}`); let st = '서버 기록 없음 — 명령은 대상이 접속했을 때 적용됩니다.'; if (p.hasSave) st = p.dead ? '현재 상태: 사망' : `현재 상태: 생존 · 체력 ${Number(p.hp || 0)} / ${Number(p.maxHp || 0)}`;
  h += noteBox(st) + choiceRow('', '부활시키기', '체력을 가득 채우고 허기·수분·사기를 최소 40으로 맞춥니다.', 'var(--accent)', true, 'data-aact="revive"') + choiceRow('', '사망시키기', ADM.confirm === 'kill' ? '한 번 더 누르면 사망 처리됩니다.' : '즉시 사망 처리합니다. (확인을 위해 두 번 눌러야 합니다)', 'var(--danger)', true, 'data-aact="kill"');
  h += groupLab('조정') + choiceRow('', '상태 · 성장 조정', '경험치 · 레벨 · 체력 · 허기 · 능력치 · 회복 등 (지금 접속 중인 캐릭터에 적용)', 'var(--blue)', true, 'data-asub="admin_grow"') + choiceRow('', '긍정 · 부정 상태 부여', '효과 이름과 시간을 골라 부여 · 해제', 'var(--blue)', true, 'data-asub="admin_status"');
  h += groupLab('아이템 지급 · 접속 중이면 바로, 아니면 다음 접속 때 들어갑니다') + givePanel(String(p.nickname ?? '?')) + noteBox("금액 · 코인은 관리자 → 'GM 가상화폐 지급 · 차감'에서 캐릭터를 골라 보냅니다.");
  return h + choiceRow('', '목록으로', '', 'var(--muted)', true, 'id="apBack"'); }
function bindAdminPlayer() { const c = $('center'), uid = String(ADM.target.uid || ''); c.querySelectorAll('[data-aact]').forEach((b) => { b.onclick = () => { const a = b.dataset.aact; if (a === 'kill' && ADM.confirm !== 'kill') { ADM.confirm = 'kill'; redrawKeep(); return; } ADM.confirm = ''; const nick = String(ADM.target.nickname ?? '?');
    if (uid === myUid()) { adminApplyAction(a, displayName()); return; } call('adminAct', uid, a).then((r) => { if (r.ok) { toast(`${nick}님을 ${a === 'revive' ? '부활' : '사망'} 처리했습니다.`); act(() => { gLog(`[color=#f2706a]관리자[/color]  ${nick}  →  ${a === 'revive' ? '부활' : '사망'}`); return true; }); openAdmin(); } else toast(r.error || '처리하지 못했습니다.'); }); }; });
  c.querySelectorAll('[data-asub]').forEach((b) => { b.onclick = () => { ADM.subUid = uid; go(b.dataset.asub); }; }); bindGivePanel(uid); const bk = $('apBack'); if (bk) bk.onclick = openAdmin; }
function allItemNames() { const s = new Set(Object.keys(GD.ITEMS)); for (const src of [GD.WEAPONS, GD.ARMORS, GEAR.ITEMS, BD.MOVE_ITEMS]) for (const k in src || {}) s.add(k); return [...s].sort(); }
function gmItemInfo(it) { if (!it) return ''; const x = GD.ITEMS[it] || {}, lines = [`${it} · ${tabOf(it)} · ${cat(it).grade}등급`], ef = effectText(it); if (ef) lines.push(ef); const d = String(x.desc || ''); if (d && !ef.includes(d)) lines.push(d); if (GEAR.ITEMS[it]) lines.push(`장착 Lv.${Number(GEAR.ITEMS[it].level || 1)} 이상`); if (Number(x.price || 0) > 0) lines.push('상점 기준가 ' + won(Number(x.price))); return lines.join('\n'); }
function givePanel(name) { const names = allItemNames(); return `<div class="panel admcard"><b style="color:var(--warning)">아이템 지급 대상 · ${esc(name)}</b><span class="muted" style="font-size:12px">금액·코인 지급과 차감은 관리자 메뉴의 'GM 가상화폐 지급 · 차감'에서 합니다.</span><div class="nkrow"><select class="sel" id="gvItem">${names.map((n) => `<option value="${esc(n)}">${esc(`${n} · ${tabOf(n)} · ${cat(n).grade}등급`)}</option>`).join('')}</select><input class="sel" type="number" id="gvQty" min="1" max="99" value="1" style="width:88px"></div><p class="muted" id="gvInfo" style="white-space:pre-line;font-size:13px;margin:0">${esc(gmItemInfo(names[0]))}</p><button class="btn primary" id="gvGo">아이템 지급</button></div>`; }
function bindGivePanel(uid) { const it = $('gvItem'); if (!it) return; it.onchange = () => { $('gvInfo').textContent = gmItemInfo(it.value); };
  $('gvGo').onclick = () => { const items = { [it.value]: Math.max(1, Math.min(99, Math.trunc(Number($('gvQty').value || 1)))) }; if (!uid || uid === myUid()) { act(() => receiveGift(0, items, '관리자 권한')); return; } call('adminGive', uid, 0, JSON.stringify(items)).then((r) => toast(r.ok ? '지급했습니다. 상대의 받은 물품함에 들어갑니다(접속 중이면 바로, 아니면 다음 접속 때).' : '지급 실패: ' + (r.error || ''))); }; }
/* 상태 · 성장 조정 */
const GROW_CH = [['xp', '경험치 추가/감소', '양수는 지급, 음수는 차감. 레벨은 누적 경험치로 반영'], ['points', '스탯 포인트 추가/감소', '사용하지 않은 투자 포인트 조정'], ['set_level', '레벨 지정', '1~100, 이미 투자한 스탯 보존'], ['set_hp', '체력 지정', '0이면 사망, 최대체력을 넘지 않음'], ['set_hunger', '허기 지정', '0~100'], ['set_water', '수분 지정', '0~100'], ['set_morale', '사기 지정', '0~100'], ['set_stat', '기본 능력치 지정', '아래 능력치 선택, 자동 성장 기본치 이상'], ['teleport', '지역 순간 이동', '0~9 지역번호, 전투/탐사 취소 후 이동']];
function adminGrowPage() { const uid = ADM.subUid; let h = headT('상태 · 성장 조정', '대상 · ' + admTargetName(uid)) + choiceRow('', '일일 퀘스트 변경', '50가지 중 골라서 바꾸거나 무작위로 다시 뽑기', 'var(--warning)', true, 'data-gq="daily"') + choiceRow('', '주간 퀘스트 변경', '50가지 중 골라서 바꾸거나 무작위로 다시 뽑기', 'var(--warning)', true, 'data-gq="weekly"');
  h += choiceRow('', '지역 이동 시간만 건너뛰기', '전투·탐사·제작은 건드리지 않고 이동 중인 본인/선택 대상만 즉시 도착', 'var(--blue)', true, 'data-gc="skip_travel"') + groupLab('상태 · 성장 조정');
  h += `<select class="sel" id="grAct">${GROW_CH.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><input class="sel" type="number" id="grVal" value="100"><select class="sel" id="grStat" hidden>${BD.STATS.map((k) => `<option value="${k}">${statName(k)}</option>`).join('')}</select><p class="muted" id="grInfo" style="margin:0">${GROW_CH[0][2]}</p><button class="btn warnfill" id="grGo">조정 적용</button>`;
  for (const [k, l] of [['restore', '체력·허기·수분·사기 전체 회복 + 부정 상태 해제'], ['reset_daily', '오늘 단기 탐사 40회 초기화'], ['complete_activity', '이동·탐사 즉시 완료 · 전투 후 대기 해제']]) h += choiceRow('', l, '본인 또는 선택한 대상에게 적용', 'var(--accent)', true, `data-gc="${k}"`);
  return h + choiceRow('', '돌아가기', '', 'var(--muted)', true, 'id="grBack"'); }
function adminSubBack() { if (!ADM.subUid || ADM.subUid === myUid()) openAdmin(); else go('admin_player'); }
function bindAdminGrow() { const c = $('center'), uid = ADM.subUid; c.querySelectorAll('[data-gq]').forEach((b) => { b.onclick = () => gmQuestModal(uid, b.dataset.gq); }); c.querySelectorAll('[data-gc]').forEach((b) => { b.onclick = () => adminControl(uid, b.dataset.gc, 0, ''); });
  const sel = $('grAct'), val = $('grVal'); sel.onchange = () => { const i = GROW_CH.findIndex((x) => x[0] === sel.value), a = sel.value; $('grInfo').textContent = GROW_CH[i][2]; $('grStat').hidden = a !== 'set_stat'; val.min = a === 'set_level' ? 1 : ['teleport', 'set_hp', 'set_hunger', 'set_water', 'set_morale', 'set_stat'].includes(a) ? 0 : -1000000; val.max = a === 'set_level' ? 100 : a === 'teleport' ? 9 : ['set_hunger', 'set_water', 'set_morale'].includes(a) ? 100 : 1000000; };
  $('grGo').onclick = () => { let v = Math.trunc(Number(val.value || 0)); v = Math.max(Number(val.min || -1000000), Math.min(Number(val.max || 1000000), v)); adminControl(uid, sel.value, v, $('grStat').value); }; $('grBack').onclick = adminSubBack; }
function gmQuestModal(uid, scope) { if (!S.admin) return; let pick = []; if (!uid || uid === myUid()) { questSync(); pick = [...(S.P.quests[scope].picked || [])]; } const all = scope === 'daily' ? QD.DAILY : QD.WEEKLY;
  const info = () => `고른 퀘스트 ${pick.length}개 · 일일은 4개, 주간은 5개를 권장합니다(최대 8개). 지금 진행도는 같은 종류끼리 이어집니다.`;
  modal(`${scope === 'daily' ? '일일' : '주간'} 퀘스트 변경 · ${admTargetName(uid)}`, `<p class="muted" id="gqInfo">${info()}</p><div class="gqlist">${all.map((q) => `<label class="sqchk"><input type="checkbox" data-gqi="${esc(q.id)}" ${pick.includes(q.id) ? 'checked' : ''}>${esc(`${q.title} · ${q.desc}`)}</label>`).join('')}</div>`,
    [['무작위로 다시 뽑기', '', () => adminControl(uid, `set_${scope}_quests`, 0, '')], ['고른 퀘스트로 바꾸기', 'warnfill keep', () => { if (!pick.length) { toast('퀘스트를 하나 이상 고르세요.'); return; } $('modalRoot').innerHTML = ''; adminControl(uid, `set_${scope}_quests`, 0, pick.join(',')); }], ['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-gqi]').forEach((x) => { x.onchange = () => { const id = x.dataset.gqi; if (x.checked && !pick.includes(id) && pick.length < 8) pick.push(id); else if (!x.checked) pick = pick.filter((y) => y !== id); else x.checked = false; $('gqInfo').textContent = info(); }; }); }
/* 긍정 · 부정 상태 부여(gm_state_ui) */
function adminStatusPage() { const uid = ADM.subUid, nm = admTargetName(uid), sel = ADM.gs.sel; let h = headT('긍정 · 부정 상태 부여', '대상 · ' + nm) + groupLab('상태 부여 · 눌러서 고르기');
  h += `<div class="panel admcard"><p class="muted" style="margin:0">상태 칩을 눌러 고른 뒤 아래 대상 상자를 누르면 부여됩니다.</p><div class="kvx"><b>지속 시간(분) · 최대 1년</b><input class="sel" type="number" id="gsMin" min="1" max="525600" value="${ADM.gs.minutes}" style="width:110px"></div><div class="pills">${[[10, '10분'], [60, '1시간'], [1440, '1일'], [10080, '7일'], [43200, '30일'], [525600, '1년']].map(([m, l]) => `<button class="pill" data-gsm="${m}">${l}</button>`).join('')}</div>`;
  const chip = (kind, id, name, col, desc) => `<button class="pill gschip ${sel && sel.id === id && sel.kind === kind ? 'on' : ''}" style="--c:#${col}" title="${esc(desc)}" data-gsk="${kind}" data-gsi="${esc(id)}" data-gsn="${esc(name)}">${esc(name)}</button>`;
  h += `<b style="color:var(--accent);font-size:13px">긍정 상태</b><div class="pills">${Object.keys(BD.POSITIVES).filter((id) => !id.startsWith('coop_')).map((id) => { const d = BD.POSITIVES[id]; return chip('positive', id, d.name, d.color || '3fd0a4', d.desc || positiveDefText(d)); }).join('')}</div>`;
  h += `<b style="color:var(--danger);font-size:13px">부정 상태</b><div class="pills">${Object.keys(ED.CONDITIONS).map((id) => { const d = ED.CONDITIONS[id]; return chip('condition', id, d.name, d.color, d.desc); }).join('')}</div>`;
  h += `<button class="gszone ${sel ? 'on' : ''}" id="gsZone">${sel ? `부여 대상 · ${esc(nm)}<br>'${esc(sel.name)}' 선택됨 · 상자를 누르면 부여합니다` : `부여 대상 · ${esc(nm)}<br>상태 칩을 먼저 고르세요`}</button><div class="brow"><button class="btn" style="color:var(--warning)" id="gsClrP">긍정 상태 모두 해제</button><button class="btn" style="color:var(--accent)" id="gsClrN">부정 상태 모두 해제</button></div></div>`;
  return h + choiceRow('', '돌아가기', '', 'var(--muted)', true, 'id="gsBack"'); }
function bindAdminStatus() { const c = $('center'), uid = ADM.subUid, nm = admTargetName(uid), mi = $('gsMin'); mi.onchange = () => { ADM.gs.minutes = Math.max(1, Math.min(525600, Math.trunc(Number(mi.value || 10)))); };
  c.querySelectorAll('[data-gsm]').forEach((b) => { b.onclick = () => { ADM.gs.minutes = Number(b.dataset.gsm); mi.value = ADM.gs.minutes; }; });
  c.querySelectorAll('[data-gsk]').forEach((b) => { b.onclick = () => { const s = { kind: b.dataset.gsk, id: b.dataset.gsi, name: b.dataset.gsn }; ADM.gs.sel = ADM.gs.sel && ADM.gs.sel.id === s.id && ADM.gs.sel.kind === s.kind ? null : s; redrawKeep(); }; });
  $('gsZone').onclick = () => { const s = ADM.gs.sel; if (!s || !S.admin) return; const sec = Math.max(GMS.MIN_SECONDS, Math.min(GMS.MAX_SECONDS, ADM.gs.minutes * 60)); if (s.kind === 'positive' && BD.POSITIVES[s.id]) adminControl(uid, 'grant_positive', sec, s.id); else if (s.kind === 'condition' && ED.CONDITIONS[s.id]) adminControl(uid, 'grant_condition', sec, s.id); else return; ADM.gs.sel = null; toast(`${nm}에게 '${s.name}' ${durationText(sec)} 부여`); redrawKeep(); };
  $('gsClrP').onclick = () => adminControl(uid, 'clear_positive', 0, ''); $('gsClrN').onclick = () => adminControl(uid, 'clear_status', 0, ''); $('gsBack').onclick = adminSubBack; }
/* 아이템 배포 · GM 받기 */
function adminBroadcastPage() { const all = allItemNames(), q = ADM.bq.trim(), names = all.filter((n) => !q || `${n} [${cat(n).tag || ''}] ${tabOf(n)} ${itemDisplay(n)} ${cat(n).grade}급`.includes(q.replace(/^\[|\]$/g, ''))); ADM.bnames = names;
  let h = headT('아이템 배포 · GM 받기', '전체 사용자에게 보내거나(계정당 1회), 내 가방에 바로 받습니다') + groupLab(`아이템 검색 · 전체 ${all.length}종`) + `<input class="sel" id="abQ" placeholder="이름 · 태그 · 등급으로 검색 (예: 낚싯대, 음료, 요리, S급)" value="${esc(ADM.bq)}">`;
  h += groupLab('물품') + `<select class="sel" id="abItem">${names.map((n, i) => `<option value="${i}">${esc(itemDisplay(n))}</option>`).join('')}</select><div class="panel" style="padding:10px 14px"><p class="muted" id="abInfo" style="white-space:pre-line;margin:0;font-size:13px">${esc(names.length ? gmItemInfo(names[0]) : `'${q}'에 맞는 아이템이 없습니다.`)}</p></div>` + groupLab('사용자당 수량') + '<input class="sel" type="number" id="abQty" min="1" max="999" value="1">';
  return h + choiceRow('', '전체 유저에게 배포', '한 번 누른 배포는 계정당 1회 수령 · 새로 누르면 별도 배포입니다.', 'var(--warning)', true, 'id="abAll"') + choiceRow('', '내(GM) 가방에 바로 받기', '고른 물품을 위 수량만큼 지금 캐릭터 가방에 넣습니다 · 가방이 가득 차면 받은 물품함으로', 'var(--accent)', true, 'id="abMe"'); }
function bindAdminBroadcast() { const q = $('abQ'), it = $('abItem'), qty = () => Math.max(1, Math.min(999, Math.trunc(Number($('abQty').value || 1)))), cur = () => ADM.bnames[Number(it.value)];
  q.onchange = () => { ADM.bq = q.value; redrawKeep(); }; q.onkeydown = (e) => { if (e.key === 'Enter') { ADM.bq = q.value; redrawKeep(); } }; it.onchange = () => { $('abInfo').textContent = gmItemInfo(cur()); };
  $('abAll').onclick = () => { const n = cur(); if (!n) { toast('아이템을 먼저 고르세요.'); return; } const k = qty(); socialCall('adminGiveAll', [n, k], () => modal('전체 지급 등록', `<p>모든 사용자(앞으로 가입할 사용자 포함)가 받을 수 있게 ${esc(n)} × ${k} 배포를 등록했습니다.</p>`)); };
  $('abMe').onclick = () => { if (!S.admin) return; const n = cur(); if (!n) { toast('아이템을 먼저 고르세요.'); return; } const k = qty(); act(() => { if (!addItem(n, k)) { if (!isDict(S.P.stored_loot)) S.P.stored_loot = {}; S.P.stored_loot[n] = Number(S.P.stored_loot[n] || 0) + k; } gLog(`[color=#ef5350]GM[/color]  내 가방에 ${n} × ${k}`); return true; }, () => toast(`${n} × ${k} 받음`)); }; }
/* GM 가상화폐(gm_currency_ui) — 서버가 명령을 만들고 받는 쪽이 claimControl로 받습니다 */
function openCurrency() { if (!S.admin) { toast('관리자만 가상화폐 지급 기능을 사용할 수 있습니다.'); return; } Object.assign(ADM.cur, { op: 'add', kind: 'money', scope: 'individual', target: '', amount: 1, nonce: '', step: 'form', issuing: false, capErr: '', capLoading: true }); go('admin_currency', true);
  call('gmCurrencyCapabilities').then((r) => { ADM.cur.capLoading = false; if (r.ok && isDict(r.capabilities)) { ADM.cur.caps = clone(r.capabilities); ADM.cur.capErr = ''; } else ADM.cur.capErr = String(r.error || '지급 경로 권한을 확인하지 못했습니다.'); if (S.mode === 'admin_currency') redrawKeep(); }); }
function curTargets() { const out = [], seen = {}, ou = myUid(), oc = String(S.acct?.charId ?? ou); if (ou) { out.push({ uid: ou + '|' + oc, name: `나 · ${displayName()} / ${S.acct?.username || ''}` }); seen[ou + '|' + oc] = 1; }
  for (const e of ADM.players) { if (!isDict(e)) continue; const uid = String(e.uid || ''); if (!uid) continue; let ch = Array.isArray(e.chars) ? e.chars : []; if (!ch.length) ch = [{ id: uid, name: String(e.nickname || '생존자'), level: Number(e.level || 1) }]; for (const c of ch) { const k = uid + '|' + String(c.id ?? uid); if (seen[k]) continue; seen[k] = 1; out.push({ uid: k, name: `${c.name || '생존자'} / ${e.username || ''} · Lv.${Number(c.level || 1)}` }); } } return out; }
const curRouteOk = () => { const c = ADM.cur; if (c.op === 'sub') return c.scope === 'individual'; return !!c.caps[`${c.kind}_${c.scope}`]; };
const curBlock = () => (ADM.cur.capLoading ? '서버 권한을 확인하는 중입니다.' : ADM.cur.capErr || '현재 배포에서 이 지급 경로를 확인하지 못했습니다. Hosting과 Firestore 규칙을 함께 배포했는지 확인하세요.');
const curKind = (k) => (k === 'coins' ? '코인' : '금액');
const curTargetName = () => (curTargets().find((t) => t.uid === ADM.cur.target) || {}).name || '선택한 유저';
function currencyPage() { if (!S.admin) return headT('GM 가상화폐 지급 · 차감', '관리자 전용') + noteBox('관리자 검증에 실패했습니다. 이 화면에서는 지급을 실행할 수 없습니다.'); const c = ADM.cur, sub = c.op === 'sub';
  if (c.step === 'confirm') { const tgt = c.scope === 'individual' ? curTargetName() : '전체 유저', ok = curRouteOk() && c.amount >= 1; let h = headT(`GM ${sub ? '차감' : '지급'} 최종 확인`, '두 번째 확인 · 아래 요약이 정확할 때만 실행하세요') + infoBox(`${sub ? '차감' : '지급'} 요약`, `작업: ${sub ? '차감 (빼기)' : '지급 (더하기)'}\n종류: ${curKind(c.kind)}\n수량: ${sub ? '-' : '+'}${c.amount}\n대상: ${tgt}`);
    h += noteBox(sub ? `실행하면 대상의 ${curKind(c.kind)}에서 ${c.amount}을(를) 뺍니다. 보유량보다 많이 빼면 0이 됩니다.` : '실행하면 Firebase 규칙이 관리자 권한을 다시 검증합니다. 전체 지급은 대상별 명령 ID와 1회 수령 영수증으로 중복을 막습니다.'); if (!ok) h += noteBox(curBlock());
    return h + choiceRow('', c.issuing ? '처리 중…' : '최종 실행', `서버 권한으로 ${sub ? '차감' : '지급'} 명령을 등록합니다.`, 'var(--danger)', ok && !c.issuing, 'id="gcRun"') + choiceRow('', '수정', '종류·수량·대상을 바꿉니다.', 'var(--blue)', !c.issuing, 'id="gcEdit"') + choiceRow('', '관리자 메뉴로', '', 'var(--muted)', !c.issuing, 'id="gcAdm"'); }
  let h = headT('GM 가상화폐 지급 · 차감', '금액/코인 · 더하기/빼기 · 실행 전 요약 확인') + noteBox('관리자 권한으로 검증된 명령만 등록합니다. 접속 중이면 바로, 오프라인 대상은 다음 로그인 때 적용됩니다.');
  const opt = (id, rows, val) => `<select class="sel" id="${id}">${rows.map(([k, l]) => `<option value="${k}" ${k === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  h += groupLab('작업') + opt('gcOp', [['add', '지급 (더하기)'], ['sub', '차감 (빼기)']], c.op); if (!sub && c.capLoading) h += noteBox('현재 배포된 서버 권한과 수령 경로를 확인하는 중입니다…'); else if (!sub && c.capErr) h += noteBox('지급 경로를 사용할 수 없습니다: ' + c.capErr);
  h += groupLab('종류') + opt('gcKind', [['money', '금액'], ['coins', '코인']], c.kind); if (sub) h += noteBox('차감은 개별 유저에게만 할 수 있습니다. 잔액은 0 아래로 내려가지 않습니다.'); else h += groupLab('대상 범위') + opt('gcScope', [['individual', '개별 유저'], ['all', '전체 유저']], c.scope);
  if (c.scope === 'individual') { const ts = curTargets(); if (!ts.length) h += noteBox('지급할 개별 유저 목록이 없습니다. 관리자 목록을 새로고침한 뒤 다시 시도하세요.'); else { if (!ts.some((t) => t.uid === c.target)) { c.target = ts[0].uid; c.nonce = ''; } h += groupLab('개별 대상') + opt('gcTgt', ts.map((t) => [t.uid, t.name]), c.target); } }
  else h += noteBox('전체 지급은 현재 프로필 목록을 페이지 단위로 스냅샷한 뒤, 대상별 결정적 명령 ID를 배치 등록합니다. 중간 실패 시 같은 지급 내용으로 재시도하면 기존 대기/수령 건을 중복 등록하지 않습니다.');
  h += groupLab('수량') + `<input class="sel" type="number" id="gcAmt" min="1" max="${D.gm_currency_ui.MAX_AMOUNT}" value="${Math.max(1, Math.min(D.gm_currency_ui.MAX_AMOUNT, c.amount))}">`; const ok = curRouteOk(); if (!ok) h += noteBox(curBlock());
  return h + choiceRow('', sub ? '차감 내용 검토' : '지급 내용 검토', '종류·수량·대상을 다시 확인한 뒤 최종 실행 화면으로 이동합니다.', 'var(--warning)', ok && (sub || !c.capLoading), 'id="gcRev"') + choiceRow('', '관리자 메뉴로', '', 'var(--muted)', true, 'id="gcAdm"'); }
function bindCurrency() { const c = ADM.cur, on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; }, inv = () => { c.nonce = ''; };
  on('gcOp', 'onchange', (e) => { c.op = e.target.value; if (c.op === 'sub') c.scope = 'individual'; inv(); redrawKeep(); }); on('gcKind', 'onchange', (e) => { c.kind = e.target.value; inv(); redrawKeep(); }); on('gcScope', 'onchange', (e) => { c.scope = e.target.value; inv(); redrawKeep(); }); on('gcTgt', 'onchange', (e) => { c.target = e.target.value; inv(); }); on('gcAmt', 'onchange', (e) => { c.amount = Math.trunc(Number(e.target.value || 0)); inv(); });
  on('gcAdm', 'onclick', openAdmin); on('gcEdit', 'onclick', () => { c.step = 'form'; redrawKeep(); });
  on('gcRev', 'onclick', () => { const raw = Number($('gcAmt').value), amt = Number.isInteger(raw) && raw >= 1 && raw <= D.gm_currency_ui.MAX_AMOUNT ? raw : 0; if (amt <= 0) { toast(`수량은 1~${D.gm_currency_ui.MAX_AMOUNT} 사이의 양의 정수여야 합니다.`); return; } c.amount = amt; if (c.scope === 'individual' && !c.target) { toast('개별 지급 대상을 선택하세요.'); return; } if (!curRouteOk()) { toast(curBlock()); return; } if (!c.nonce) c.nonce = `${Math.floor(performance.now() * 1000)}_${Math.floor(Math.random() * 1e9)}`; c.step = 'confirm'; redrawKeep(); });
  on('gcRun', 'onclick', () => { if (c.issuing || !S.admin) return; if (!curRouteOk()) { toast(curBlock()); return; } const uid = c.target;
    if (c.op === 'sub') { const nm = curTargetName(); adminControl(uid.split('|')[0], c.kind, -c.amount, ''); modal('GM 차감 등록', `<p>${esc(nm)}에게서 ${curKind(c.kind)} ${c.amount}을(를) 차감했습니다. 접속 중이 아니면 다음 로그인 때 적용됩니다.</p>`); c.step = 'form'; c.nonce = ''; return; }
    if (!c.nonce) c.nonce = `${Math.floor(performance.now() * 1000)}_${Math.floor(Math.random() * 1e9)}`; c.issuing = true; redrawKeep();
    call('gmCurrencyIssue', c.kind, c.scope, uid, c.amount, c.nonce).then((r) => { c.issuing = false; if (r.ok) { modal('GM 지급 등록', `<p style="white-space:pre-line">${esc(`${curKind(c.kind)} ${c.amount}을(를) ${c.scope === 'individual' ? curTargetName() : '전체 유저'}에 지급 처리했습니다. 대상은 기존 명령 수령/오프라인 다음 로그인 흐름에서 적용됩니다.\n대상 ${Number(r.count ?? 1)}명 · 새 명령 ${Number(r.queued || 0)}건 · 기존 대기 ${Number(r.alreadyQueued || 0)}건 · 이미 수령 ${Number(r.alreadyClaimed || 0)}건`)}</p>`); c.step = 'form'; c.nonce = ''; } else modal('GM 지급 실패', `<p>${esc(r.error || '서버가 지급을 거부했습니다.')}</p>`); if (S.mode === 'admin_currency') redrawKeep(); }); }); }
/* 가입 코드 */
function openRegAdmin() { if (!S.admin) { toast('관리자만 가입 설정을 변경할 수 있습니다.'); return; } ADM.reg.loading = true; go('registration_admin', true);
  call('adminRegistration').then((r) => { ADM.reg.loading = false; if (r.ok) { ADM.reg.required = r.required ?? true; ADM.reg.codes = Array.isArray(r.codes) ? r.codes : []; ADM.reg.error = r.initialized ? '' : '초기 설정이 없습니다. 배포 폴더의 가입 초기화 스크립트를 실행하세요. 기본 정책은 코드 필수입니다.'; } else ADM.reg.error = String(r.error || '설정을 불러오지 못했습니다.'); if (S.mode === 'registration_admin') redrawKeep(); }); }
function regAdminPage() { if (!S.admin) return noteBox('관리자만 사용할 수 있습니다.'); const R = ADM.reg; let h = headT('가입 코드 관리', '일반 가입 허용 · 코드는 관리자 권한을 주지 않습니다.') + noteBox('기존 계정은 코드 없이 로그인합니다. OFF는 회원가입 중지 기능이 아니라, 코드 없이 일반 가입을 허용하는 설정입니다.');
  h += R.loading ? noteBox('서버 설정을 불러오는 중…') : `<label class="sqchk"><input type="checkbox" id="rgReq" ${R.required ? 'checked' : ''}>가입 코드가 있어야 회원가입 허용</label>`; if (R.error) h += noteBox(R.error);
  h += groupLab('새 가입 코드 발급 · 관리자 전용') + `<label class="muted">코드 (빈칸이면 무작위 생성)</label><input class="sel" id="rgCode" maxlength="32" placeholder="영문·숫자·-  6~32자"><div class="nkrow"><label style="flex:1"><span class="muted" style="font-size:12px">허용 횟수 · 0=무제한</span><input class="sel" type="number" id="rgMax" min="0" max="10000" value="1"></label><label style="flex:1"><span class="muted" style="font-size:12px">유효기간(일) · 0=없음</span><input class="sel" type="number" id="rgDays" min="0" max="365" value="7"></label></div><p id="rgRes" style="color:var(--warning);margin:0"></p><button class="btn primary" id="rgGo">가입 코드 발급</button>`;
  h += groupLab('발급 코드 · 최근 100개'); if (!R.codes.length && !R.loading) h += noteBox('발급된 코드가 없습니다. 코드를 입력해 발급하거나 배포 초기화를 완료하세요.');
  R.codes.forEach((cd, i) => { const ex = Number(cd.expiresAt || 0), mx = Number(cd.maxUses || 0), used = Number(cd.used || 0); let tag = cd.active ? '사용 가능' : '사용 중지'; if (ex > 0 && ex <= nowSec()) tag = '만료'; else if (mx > 0 && used >= mx) tag = '소진';
    const until = ex === 0 ? '기한 없음' : new Date((ex + 32400) * 1000).toISOString().slice(0, 19).replace('T', ' ') + ' (한국시간)'; h += `<div class="panel admcard"><div class="brow"><button class="btn" style="color:var(--blue)" data-rgc="${i}">${esc(cd.code || '')}</button><button class="btn" style="color:${cd.active ? 'var(--danger)' : 'var(--accent)'}" data-rgt="${i}">${cd.active ? '비활성화' : '활성화'}</button><button class="btn" style="color:var(--danger)" data-rgd="${i}">삭제</button></div><span class="muted" style="font-size:13px">${esc(`${tag} · 사용 ${used} / ${mx === 0 ? '무제한' : mx} · ${until}`)}</span></div>`; });
  return h + choiceRow('', '새로고침', '', 'var(--blue)', true, 'id="rgRe"') + choiceRow('', '관리자 메뉴로', '', 'var(--muted)', true, 'id="rgAdm"'); }
function bindRegAdmin() { const c = $('center'), R = ADM.reg, copy = (t) => { const old = () => { try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (_) {} }; try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).catch(old); else old(); } catch (_) { old(); } };
  const rq = $('rgReq'); if (rq) rq.onchange = () => { if (R.loading) return; R.loading = true; call('adminSetRegistration', !R.required).then((r) => { R.loading = false; if (r.ok) { toast('코드 가입 설정을 변경했습니다.'); openRegAdmin(); } else { R.error = String(r.error || '설정 변경에 실패했습니다.'); redrawKeep(); } }); };
  $('rgGo').onclick = () => { const b = $('rgGo'); b.disabled = true; $('rgRes').textContent = '발급 중…'; call('adminCreateCode', $('rgCode').value, Math.trunc(Number($('rgMax').value || 0)), Math.trunc(Number($('rgDays').value || 0))).then((r) => { b.disabled = false; if (r.ok) { const v = String(r.code || ''); copy(v); toast(`코드 발급: ${v} · 클립보드에 복사했습니다.`); openRegAdmin(); } else $('rgRes').textContent = r.error || '발급에 실패했습니다.'; }); };
  c.querySelectorAll('[data-rgc]').forEach((b) => { b.onclick = () => { copy(String(R.codes[Number(b.dataset.rgc)].code || '')); toast('가입 코드를 복사했습니다.'); }; });
  c.querySelectorAll('[data-rgt]').forEach((b) => { b.onclick = () => { const cd = R.codes[Number(b.dataset.rgt)]; call('adminSetCodeActive', String(cd.id), !cd.active).then((r) => { if (r.ok) openRegAdmin(); else toast(r.error || '변경에 실패했습니다.'); }); }; });
  c.querySelectorAll('[data-rgd]').forEach((b) => { b.onclick = () => { const cd = R.codes[Number(b.dataset.rgd)]; modal('가입 코드 삭제', `<p style="color:var(--text)">'${esc(cd.code || '')}' 코드를 삭제하시겠습니까? 이미 가입한 계정에는 영향이 없습니다.</p>`, [['삭제', 'dangerfill', () => call('adminDeleteCode', String(cd.id)).then((r) => { if (r.ok) { toast('가입 코드를 삭제했습니다.'); openRegAdmin(); } else toast(r.error || '삭제하지 못했습니다.'); })], ['취소', '', null]]); }; });
  $('rgRe').onclick = openRegAdmin; $('rgAdm').onclick = openAdmin; }
/* 공지 팝업 · 도시 목표 · 수리 요금 */
function noticeModal() { modal('공지 팝업 보내기', '<p class="muted">지금 접속한 모두에게 바로 팝업이 뜨고, 3일 안에 접속하는 사람에게도 한 번 뜹니다(보낸 뒤 가입한 계정 제외). 보낸 공지는 목록에서 지울 수 있습니다.</p><label class="muted">제목</label><input class="sel" id="ntT" maxlength="40" placeholder="예: 오늘 밤 9시 점검"><label class="muted">내용</label><textarea class="sel" id="ntB" maxlength="600" rows="5" placeholder="최대 600자"></textarea>',
  [['공지 보내기', 'warnfill keep', () => { const t = $('ntT').value.trim(), b = $('ntB').value.trim().replace(/ \/ /g, '\n').slice(0, 600); if (!t || !b) { toast('제목과 내용을 적어 주세요.'); return; } call('adminNotice', t, b).then((r) => { if (r.ok) { $('modalRoot').innerHTML = ''; toast('공지 팝업을 보냈습니다.'); } else toast(r.error || '공지를 보내지 못했습니다.'); }); }], ['취소', '', null]]); }
function noticeListModal() { const list = [...SOC.notices].reverse(); modal('보낸 공지 팝업 목록', `<p class="muted">지운 공지는 아직 못 본 사람에게도 더 이상 뜨지 않습니다. 공지는 보낸 뒤 3일 동안만 뜨고, 보낸 뒤에 가입한 계정에는 뜨지 않습니다.</p>${list.length ? list.map((n, i) => `<div class="ntrow"><p style="white-space:pre-line;margin:0;flex:1">${esc(`${kstStamp(Math.trunc(Number(n.at || 0) / 1000))} · ${n.title || ''}\n${String(n.body || '').slice(0, 80)}`)}</p><button class="btn" style="color:var(--danger)" data-ntd="${esc(n.id)}">삭제</button></div>`).join('') : '<p style="color:var(--text)">보낸 공지가 없습니다.</p>'}`, [['닫기', '', null]]);
  $('modalRoot').querySelectorAll('[data-ntd]').forEach((b) => { b.onclick = () => { b.disabled = true; call('adminDeleteNotice', b.dataset.ntd).then((r) => { if (r.ok) { toast('공지를 지웠습니다.'); b.closest('.ntrow').remove(); } else { b.disabled = false; toast(r.error || '지우지 못했습니다.'); } }); }; }); }
function cityGoalModal() { if (!S.admin) return; const cs = S.city || {}, cur = Math.max(1, Number(cs.goal || 0)), tot = Number(cs.total || 0); let pick = cur; const info = () => { $('cgI').textContent = `바꿀 목표 ${pick}점 → 복구율 ${Math.trunc(Math.max(0, Math.min(1, tot / Math.max(1, pick))) * 100)}%`; };
  modal('도시 복구 목표 바꾸기', `<p style="color:var(--text)">이번 시즌 ${Number(cs.season || 0)} · 지금 모인 점수 ${tot}점 · 목표 ${cur}점 (복구율 ${Math.trunc(Math.min(1, tot / cur) * 100)}%)</p><p class="muted" style="font-size:12px">목표를 올리면 복구율이 바로 낮아집니다. 이미 받은 단계 보상 · 효과는 그대로이고, 80%에 다시 닿아야 시즌 보스가 나옵니다. 이미 나온 시즌 보스는 그대로 둡니다.</p><p id="cgI" style="color:var(--warning)"></p><div class="pills">${[1.5, 2, 3, 5].map((m) => `<button class="pill" data-cgm="${m}">×${m}</button>`).join('')}</div><label class="muted">목표 점수 직접 입력 (100~600,000)</label><input class="sel" id="cgV" maxlength="6" placeholder="${cur}" value="${cur}">`,
    [['목표 바꾸기', 'warnfill keep', () => { const ty = Math.trunc(Number(String($('cgV').value).trim().replace(/,/g, '')) || 0); if (ty >= 100 && ty !== cur) pick = Math.min(ty, 600000); if (pick === cur) { toast('지금 목표와 같습니다.'); return; } call('cityGoalSet', pick).then((r) => { if (r.ok) { $('modalRoot').innerHTML = ''; toast(`도시 복구 목표를 ${Number(r.goal ?? pick)}점으로 바꿨습니다.`); call('cityState').then((x) => { if (x.ok) { S.city = x; rerender(); } }); } else toast(r.error || '목표를 바꾸지 못했습니다.'); }); }], ['취소', '', null]]);
  $('modalRoot').querySelectorAll('[data-cgm]').forEach((b) => { b.onclick = () => { pick = Math.max(100, Math.min(600000, Math.round(cur * Number(b.dataset.cgm)))); info(); }; }); $('cgV').oninput = (e) => { const v = Math.trunc(Number(e.target.value.trim()) || 0); if (v > 0) { pick = Math.max(100, Math.min(600000, v)); info(); } }; info(); }
function repairSettingsPage() { return headT('공통 수리 요금', '관리자만 수정 · 모든 계정의 현지 거점에 적용') + `<label class="muted">기본 공임(원)</label><input class="sel" type="number" id="rpFee" min="0" max="1000" value="${Number(REPAIR.policy.fee)}"><label class="muted">정가 대비 수리율(%)</label><input class="sel" type="number" id="rpRate" min="0" max="100" value="${Number(REPAIR.policy.rate)}">` + noteBox('기본값: 공임 5원, 수리율 20%. 양쪽을 0으로 설정하면 무료 수리입니다. 키트에는 공임이 없습니다.') + choiceRow('', '공통 요금 저장', '견적 확인 후 수리하는 사용자에게 새 요금이 적용됩니다.', 'var(--accent)', S.admin, 'id="rpSave"'); }
function bindRepairSettings() { const s = $('rpSave'); if (s) s.onclick = () => { if (!S.admin) return; const fee = Math.max(0, Math.min(1000, Math.trunc(Number($('rpFee').value || 0)))), rate = Math.max(0, Math.min(100, Math.trunc(Number($('rpRate').value || 0)))); call('setRepairPolicy', fee, rate).then((r) => { if (r.ok) { REPAIR.policy = { fee, rate }; toast('수리 요금을 저장했습니다.'); } else toast(r.error || '저장에 실패했습니다.'); }); }; }
/* ════════ 퀘스트 다시 뽑기(_quest_reroll) · 기타 ════════ */
const pendingScene = () => SDATA.PARTY_SCENES.find((s) => !(S.P.scenes_seen || []).includes(String(s.id)) && compOf(String(s.a)).joined && compOf(String(s.b)).joined) || null;
const questRerollsLeft = (sc) => { questSync(); return Math.max(0, QUEST_REROLLS[sc] - Number(S.P.quests[sc].rerolls || 0)); };
function questReroll(sc) { if (questRerollsLeft(sc) <= 0) { toast(`${sc === 'daily' ? '오늘' : '이번 주'} 다시 뽑기를 모두 썼습니다.`); return false; } const q = S.P.quests[sc], all = sc === 'daily' ? QD.DAILY : QD.WEEKLY, find = (id) => all.find((x) => x.id === id), keep = [];
  for (const id of q.picked || []) { const qd = find(String(id)); if (!qd) continue; if ((q.claimed || []).includes(String(id)) || questDone(sc, qd)) keep.push(String(id)); }
  const want = Number(QD.PICK[sc]); if (keep.length >= want) { toast('바꿀 수 있는 퀘스트가 없습니다. 완료한 퀘스트는 그대로 둡니다.'); return false; }
  const pool = gShuffle(all.filter((qd) => questNeedOk(String(qd.need || '')) && !(q.picked || []).includes(String(qd.id)) && !(q.claimed || []).includes(String(qd.id)))), groups = {}; for (const id of keep) groups[String(find(id).group)] = true; const out = [...keep];
  for (const qd of pool) { if (out.length >= want) break; if (groups[String(qd.group)]) continue; groups[String(qd.group)] = true; out.push(String(qd.id)); }
  for (const qd of pool) { if (out.length >= want) break; if (!out.includes(String(qd.id))) out.push(String(qd.id)); }
  q.picked = out; q.rerolls = Number(q.rerolls || 0) + 1; toast(`${sc === 'daily' ? '일일' : '주간'} 퀘스트를 다시 뽑았습니다 · 남은 횟수 ${questRerollsLeft(sc)}`); return true; }
/* ════════ 캐릭터 관리(chars.gd) · 새 캐릭터 시작(_init_player · _start_new_game · 캐릭터 생성) ════════ */
function charSwitchBlock() { const p = S.P; if (!p || $('app').hidden) return ''; if (nonEmpty(p.long_expedition)) return '장기 탐사를 마친 뒤 바꿀 수 있습니다.'; if (nonEmpty(p.travel)) return '지역 이동을 마친 뒤 바꿀 수 있습니다.'; if (nonEmpty(p.battle)) return '전투를 마친 뒤 바꿀 수 있습니다.';
  if (nonEmpty(p.pending_explore)) return '탐사가 끝난 뒤 바꿀 수 있습니다.'; if (nonEmpty(p.craft_job)) return '제작이 끝난 뒤 바꿀 수 있습니다.'; if (duelBusy()) return '결투를 마친 뒤 바꿀 수 있습니다.'; if (nonEmpty(PARTY.online)) return '온라인 파티에서 나온 뒤 바꿀 수 있습니다.';
  if (SOC.trades.some((t) => isDict(t) && t.status === 'pending')) return '진행 중인 교환을 마치거나 취소한 뒤 바꿀 수 있습니다.'; if (SOC.busy) return '앞선 요청을 처리하는 중입니다.'; return ''; }
const charCreateWait = () => Math.max(0, Number(S.acct?.charCreateReadyAt || 0) - nowSec());
/* 내 계정(_open_account_panel 'account' · 'password') */
function accountModal() { const a = S.acct || {}; if (!LIVE.on) return;
  modal('내 계정', `<p style="white-space:pre-line;color:var(--text)">계정 닉네임  ${esc(a.accountNickname || '')} (다른 생존자에게는 보이지 않음)\n아이디  ${esc(a.username || '')}\n지금 캐릭터  ${esc(a.nickname || '')}</p><p class="muted" style="font-size:13px">저장하면 기록이 서버에 올라가며, 어느 기기에서든 로그인 후 '입장'하면 이어집니다.</p>`,
    [['캐릭터 관리 · 바꾸기 · 새로 만들기', 'primary', () => charManager()], ['비밀번호 변경', 'keep', () => passwordModal()], ['닫기', '', null]]); }
function passwordModal() { modal('비밀번호 변경', '<label class="muted">현재 비밀번호</label><input class="sel" id="pwCur" type="password" maxlength="64" autocomplete="current-password"><label class="muted">새 비밀번호</label><input class="sel" id="pwNew" type="password" maxlength="64" placeholder="6자 이상" autocomplete="new-password"><label class="muted">새 비밀번호 확인</label><input class="sel" id="pwNew2" type="password" maxlength="64" autocomplete="new-password"><p class="terr" id="pwSt" style="color:var(--warning)"></p>',
  [['변경하기', 'primary keep', () => { const st = $('pwSt'), nw = $('pwNew').value; if (nw !== $('pwNew2').value) { st.textContent = '새 비밀번호 확인이 일치하지 않습니다.'; return; } if (FD.pwBusy) return; FD.pwBusy = true; st.textContent = '변경 중…';
    call('changePassword', $('pwCur').value, nw).then((r) => { FD.pwBusy = false; if (r.ok) { $('modalRoot').innerHTML = ''; toast('비밀번호를 변경했습니다.'); } else if ($('pwSt')) $('pwSt').textContent = r.error || '변경하지 못했습니다.'; }); }], ['뒤로', 'keep', () => accountModal()]]);
  setTimeout(() => $('pwCur')?.focus(), 50); }
/* 레벨이 바뀌면 캐릭터 목록 · 계정 레벨도 맞춘다(_sync_char_level · 레벨이 바뀔 때만 한 번) */
let charLvSynced = '';
function syncCharLevel() { if (!LIVE.on || !S.P) return; const key = `${String(S.acct?.charId ?? S.acct?.uid ?? '')}|${Number(S.P.level)}`; if (key === charLvSynced) return; charLvSynced = key;
  call('syncCharLevel', Number(S.P.level)).then((r) => { if (!r || !r.ok) { charLvSynced = ''; return; } for (const c of (Array.isArray(S.acct?.chars) ? S.acct.chars : [])) if (isDict(c) && c.active) c.level = Number(S.P.level); if (S.acct) S.acct.level = Number(S.P.level); }); }
async function charSaveThen(next) { if (!S.P || $('app').hidden || !LIVE.on) { next(); return; } const r = await call('saveGame', JSON.stringify({ player: S.P, log: S.log || [] })); if (!r || !r.ok) { CHS.busy = false; toast('먼저 기록을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요. ' + ((r && r.error) || '')); return; } if (isDict(r.player)) S.P = r.player; next(); }
function charReload(text) { $('modalRoot').innerHTML = ''; toast(text); try { sessionStorage.setItem('ll_html_resume', '1'); } catch (_) {} setTimeout(() => location.reload(), 900); }
function charManager() { if (!LIVE.on && !S.acct?.uid) { toast('로그인 후 캐릭터를 관리할 수 있습니다.'); return; } const list = Array.isArray(S.acct?.chars) ? S.acct.chars : [], block = charSwitchBlock(), wait = charCreateWait();
  let h = '<p class="muted">계정 하나에 캐릭터를 2개까지 둘 수 있습니다. 캐릭터마다 레벨·가방·스토리·친구·쪽지가 따로입니다. 다른 생존자에게는 캐릭터 이름만 보입니다.</p>';
  list.forEach((c, i) => { if (!isDict(c)) return; const on = !!c.active, age = String(c.ageText || '') || (Number(c.age || 0) > 0 ? `${Number(c.age)}세` : '나이 미정'), lv = on && S.P ? Number(S.P.level) : Number(c.level || 1);
    h += `<div class="panel admcard" style="${on ? 'border-color:var(--accent)' : ''}"><b style="color:${on ? 'var(--accent)' : 'var(--text)'};font-size:17px">${on ? '● 플레이 중 · ' : ''}${esc(c.name || '')}</b><span class="muted">Lv.${lv} · ${esc(age)}</span>${on ? '' : `<div class="nkrow"><button class="btn primary" style="flex:1" data-chsw="${i}" ${block || CHS.busy ? 'disabled' : ''}>${esc(block || '이 캐릭터로 바꾸기')}</button><button class="btn" style="color:var(--danger)" data-chdel="${i}">삭제</button></div>`}</div>`; });
  if (list.length < 2) h += `<button class="btn" style="color:var(--blue)" id="chNew" ${wait > 0 || block || CHS.busy ? 'disabled' : ''}>${esc(wait > 0 ? `새 캐릭터는 ${durationText(wait)} 뒤에 만들 수 있습니다 (삭제 후 7일)` : block || '새 캐릭터 만들기')}</button>`;
  modal('캐릭터 관리', h + '<p class="subtle" style="font-size:12px">캐릭터를 삭제하면 그 캐릭터의 기록·친구·쪽지 목록은 되돌릴 수 없고, 삭제한 날부터 7일 동안 새 캐릭터를 만들 수 없습니다.</p>', [['닫기', '', null]]);
  const r = $('modalRoot'); r.querySelectorAll('[data-chsw]').forEach((b) => { b.onclick = () => { const c = list[Number(b.dataset.chsw)]; if (CHS.busy) return; const bl = charSwitchBlock(); if (bl) { toast(bl); return; } CHS.busy = true; charSaveThen(() => call('charSwitch', String(c.id || '')).then((res) => { if (!res.ok) { CHS.busy = false; toast(res.error || '바꾸지 못했습니다.'); return; } charReload('캐릭터를 바꿨습니다. 잠시 뒤 불러옵니다.'); })); }; });
  r.querySelectorAll('[data-chdel]').forEach((b) => { b.onclick = () => charDeleteConfirm(list[Number(b.dataset.chdel)]); }); const nb = $('chNew'); if (nb) nb.onclick = charCreateModal; }
function charCreateModal() { modal('새 캐릭터 만들기', '<p class="muted">이름과 나이를 정하면 새 캐릭터로 처음부터 시작합니다. 지금 캐릭터의 기록은 그대로 보관되고, 캐릭터 관리에서 언제든 다시 바꿀 수 있습니다. 외관·성격·능력치는 다음 화면에서 정합니다.</p><label class="muted">캐릭터 이름</label><input class="sel" id="ccName" maxlength="10" placeholder="한글·영문·숫자 2~10자"><label class="muted">나이</label><input class="sel" id="ccAge" maxlength="16" placeholder="18세 이상 · 숫자 또는 한글 (예: 25, 스물다섯)">',
  [['만들고 시작하기', 'primary keep', () => { const nm = $('ccName').value, ag = $('ccAge').value, why = charValid(nm, ag); if (why) { toast(why); return; } if (CHS.busy) return; const bl = charSwitchBlock(); if (bl) { toast(bl); return; } CHS.busy = true; const a = parseAge(ag);
    charSaveThen(() => call('charCreate', nm.trim(), a.num, a.text).then((res) => { if (!res.ok) { CHS.busy = false; toast(res.error || '만들지 못했습니다.'); return; } charReload(`새 캐릭터 '${nm.trim()}'을(를) 만들었습니다. 잠시 뒤 새 캐릭터로 시작합니다.`); })); }], ['취소', '', null]]); }
function charDeleteConfirm(c) { modal('캐릭터 삭제', `<p style="white-space:pre-line;color:var(--text)">'${esc(c.name || '')}'(Lv.${Number(c.level || 1)})을(를) 삭제하시겠습니까?\n이 캐릭터의 레벨·가방·스토리·친구가 모두 사라지고 되돌릴 수 없습니다.\n삭제한 날부터 7일 동안 새 캐릭터를 만들 수 없습니다.</p><p style="color:var(--warning);font-size:13px">확인을 위해 캐릭터 이름을 그대로 입력하세요.</p><input class="sel" id="cdName" maxlength="10" placeholder="${esc(c.name || '')}">`,
  [['영구 삭제', 'dangerfill keep', () => { if ($('cdName').value.trim() !== String(c.name || '')) { toast('이름이 일치하지 않습니다.'); return; } if (CHS.busy) return; CHS.busy = true; call('charDelete', String(c.id || '')).then((res) => { CHS.busy = false; if (!res.ok) { toast(res.error || '삭제하지 못했습니다.'); return; } if (res.signedIn && String(res.uid || '') === myUid()) { S.acct.chars = Array.isArray(res.chars) ? res.chars : S.acct.chars; S.acct.charCreateReadyAt = Number(res.charCreateReadyAt || 0); } toast('캐릭터를 삭제했습니다.'); charManager(); }); }], ['취소', '', null]]); }
/* 새 캐릭터의 처음 기록(main._init_player · _start_new_game) */
function initPlayer(progress) { const p = { at_hub: true, level: 1, xp: 0, skill_points: 3, day: 1, hp: 75, max_hp: 75, hunger: 82, water: 76, morale: 68, stats: { ...BD.BASE }, invested: {}, growth_version: 8, positive: {}, travel: {}, last_result: {}, result_baseline: {},
    inventory: { 파이프렌치: 1, '낡은 재킷': 1, 탄약: 6, 통조림: 2, 물: 2, 붕대: 1, 고철: 2, 천: 2, 빈병: 1, 화약: 1, 쌀: 1, 소금: 1, '전투 식량': 2, '보온 허브 음료': 2 }, equipment: { 무기: '파이프렌치', 방어구: '낡은 재킷' }, kills: 0, scouted: 0,
    conditions: {}, long_expedition: {}, stored_loot: {}, field_ready_at: 0, money: 500, coins: 0, casino_history: [], field_date: -1, field_count: 0, pending_explore: {}, calendar_origin: 0, merchant_bought: {}, play_secs: 0, photo: '', rest_ready: 0, journal: [], avatar: 0, region: 0, dead: false, death_cause: '', buffs: {}, visited: [],
    slots: { 소모품: GD.START_SLOTS, 장비: GD.START_SLOTS, 재료: GD.START_SLOTS }, story: 0, flags: {}, companions: {}, party_formed: false, scenes_seen: [], campfire_day: 0, quests: { daily: { key: '', progress: {}, claimed: [] }, weekly: { key: '', progress: {}, claimed: [] } },
    durability: { 파이프렌치: 100, '낡은 재킷': 100 }, craft_job: {}, stash: {}, character: { fresh: true, created: false }, base_stats: { ...BD.BASE }, friend_states: {}, social_done: {}, socialRevision: 0 };
  const pr = isDict(progress) ? progress : {}, stored = Math.max(0, Math.min(32, Number(pr.chapter || 0))); p.story = stored; p.flags = isDict(pr.flags) ? { ...pr.flags } : {}; p.story_choices = isDict(pr.choices) ? { ...pr.choices } : {};
  p.scenes_seen = Array.isArray(pr.scenes) ? [...pr.scenes] : []; p.story_archive = Array.isArray(pr.archive) ? [...pr.archive] : []; return p; }
function startNewGame(progress) { S.P = normalizeLoaded(initPlayer(progress)); calendarSync(S.P); S.log = []; story('[color=#7ee0c2]기록 01 / 마포구 지하 주차장[/color]'); story('새벽 5시. 한강 너머에서 사이렌이 한 번 울리고 멈췄다.'); story('서울은 조용해졌다. 당신은 남은 물자를 세고, 오늘 어디로 갈지 결정해야 한다.');
  for (const l of S.P.story_archive || []) if (!S.log.includes(String(l))) S.log.push(String(l)); CHD.d = { fresh: true, stats: { ...BD.BASE }, appearance: '', personality: '', gender: '', public: false, pub: { age: false, appearance: false, personality: false, gender: false }, avatar: Math.floor(Math.random() * M.AVATARS.length), theme_color: '' }; }
function draftStat(k, dlt) { const d = CHD.d; let sum = 0; for (const s of BD.STATS) sum += Number(d.stats[s]); if (dlt > 0 && sum >= BD.START_POINTS) return; if (Number(d.stats[k]) + dlt < 1) return; d.stats[k] = Number(d.stats[k]) + dlt; redrawKeep(); }
function freshPreview() { const d = CHD.d, save = clone(S.P); S.P.base_stats = { ...d.stats }; S.P.invested = {}; S.P.level = 1; syncGrowth(); const dv = derived(), mh = Number(S.P.max_hp); S.P = save; return `최대 체력 ${mh} · 공격 ${Math.trunc(dv.attack)} · 방어 ${Number(dv.defense).toFixed(1)}\n치명타 ${Number(dv.crit).toFixed(1)}% · 회피 ${Number(dv.evade).toFixed(1)}% · 획득 ${Number(dv.loot).toFixed(1)}% · 회복 ${Number(dv.recover).toFixed(1)}%`; }
function freshExtraHtml() { const d = CHD.d; let total = 0; for (const k of BD.STATS) total += Number(d.stats[k]); let h = noteBox(`기본 능력치 총 ${BD.START_POINTS}을(를) 자유롭게 나눕니다. 각 능력치는 최소 1입니다. 만든 뒤에는 레벨 업과 능력치 투자로 성장합니다.`) + groupLab(`배분할 기본 포인트 ${BD.START_POINTS - total} / ${BD.START_POINTS}`);
  h += BD.STATS.map((k) => `<div class="kvx" style="margin-bottom:6px"><b style="font-size:16px;font-weight:500">${statName(k)} · ${Number(d.stats[k])}</b><span class="nkrow"><button class="btn" style="width:48px;color:var(--blue)" data-dst="${k}" data-v="-1" ${Number(d.stats[k]) <= 1 ? 'disabled' : ''}>-</button><button class="btn" style="width:48px;color:var(--blue)" data-dst="${k}" data-v="1" ${total >= BD.START_POINTS ? 'disabled' : ''}>+</button></span></div>`).join('');
  return h + infoBox('능력치 보정 미리보기', freshPreview()); }
function freshTailHtml() { const d = CHD.d; return groupLab('프로필 아이콘 · 처음에는 무작위로 골라 둡니다') + `<div class="avgrid">${M.AVATARS.map((x, i) => `<button class="avbtn ${Number(d.avatar) === i ? 'on' : ''}" data-dav="${i}">${avatarHtml(i, 40, '')}</button>`).join('')}</div>` + groupLab('테마 색상 · 채팅에 나오는 이름 색') + `<div class="pills">${M.THEME_COLORS.map(([hx, nm]) => `<button class="pill tcol" style="--c:${hx ? '#' + hx : 'var(--muted)'}" data-dtc="${hx}">${hx === d.theme_color ? '● ' : ''}${esc(nm)}</button>`).join('')}</div>`; }
function bindFresh() { const c = $('center'); c.querySelectorAll('[data-dst]').forEach((b) => { b.onclick = () => draftStat(b.dataset.dst, Number(b.dataset.v)); }); c.querySelectorAll('[data-dav]').forEach((b) => { b.onclick = () => { CHD.d.avatar = Number(b.dataset.dav); redrawKeep(); }; }); c.querySelectorAll('[data-dtc]').forEach((b) => { b.onclick = () => { CHD.d.theme_color = b.dataset.dtc; redrawKeep(); }; }); }
function finishFresh() { const d = CHD.d; let total = 0; for (const k of BD.STATS) total += Number(d.stats[k]); if (total !== BD.START_POINTS) { toast(`기본 포인트 ${BD.START_POINTS}을(를) 모두 나눠 주세요.`); return; }
  const pub = { age: !!d.pub.age, appearance: !!d.pub.appearance, personality: !!d.pub.personality, gender: !!d.pub.gender };
  act(() => { const p = S.P; p.base_stats = { ...d.stats }; syncGrowth(); p.hp = p.max_hp; delete p.newbie_started; if (!p.photo) p.avatar = Math.max(0, Math.min(M.AVATARS.length - 1, Number(d.avatar))); if (validHex(String(d.theme_color || ''))) p.theme_color = d.theme_color;
    p.character = { created: true, appearance: String(d.appearance).trim().slice(0, 300), personality: String(d.personality).trim().slice(0, 500), gender: String(d.gender).trim().slice(0, 20), public: Object.values(pub).includes(true), pub };
    if (!('newbie_started' in p)) { const created = Number(S.acct?.createdAt || 0), start = created > 0 ? created : nowSec(); p.newbie_started = start; const until = start + Number(D.survival_guard.NEWBIE_SECONDS); if (until > nowSec()) { const q = clone(BD.POSITIVES[D.survival_guard.NEWBIE_ID]); q.until = until; q.tick = nowSec(); q.duration = Number(D.survival_guard.NEWBIE_SECONDS); if (!isDict(p.positive)) p.positive = {}; p.positive[D.survival_guard.NEWBIE_ID] = q; const lt = durationText(until - nowSec());
      gLog(`[color=#f0c674]신규 생존자 보호[/color]  ${lt} 동안 체력이 5 아래로 내려가지 않고, 모든 경험치 +30%, 10분마다 체력 +10이 적용됩니다.`); nhAdd(`newbie-start-${start}`, '신규 생존자 보호 시작', `남은 시간 ${lt}\n· 체력이 5 아래로 내려가지 않고 사망하지 않습니다.\n· 모든 경험치 +30%\n· 10분마다 체력 +10\n· 체력 5 이하에서 피해를 받으면 경험치가 줄어듭니다.`, 'growth'); } }
    return true; }, () => { CHD.d = null; presenceBeat(true); go('hub'); }); }

/* ════════ 화면 틀(1.1) — 배경음악(index.html의 __ytbgm) · 효과음(ui_feedback 합성음) · 알림 팝업(notif_popup) · 채팅 켜기/끄기 · 설정 창(화면/소리/알림/기타) · 머리말 칩 · 메뉴 배지 · 입장 안내 · 새 버전 감지 ════════ */
var UI = (() => { const d = { compact: true, zoom: 100, font: 'pretendard', tags: true, motion: true, bgm: true, bgmVol: 25, track: 'yt', sfx: true, sfxVol: 130, chat: true };
  try { const s = JSON.parse(localStorage.getItem('ll_html_ui') || '{}'); if (s && typeof s === 'object') Object.assign(d, s); } catch (_) {} try { if (matchMedia('(prefers-reduced-motion: reduce)').matches && !('motionSet' in d)) d.motion = false; } catch (_) {} return d; })();
function uiSave() { try { localStorage.setItem('ll_html_ui', JSON.stringify(UI)); } catch (_) {} }
function uiApply() { const r = document.documentElement; r.style.zoom = String((UI.compact ? 1 : 1.15) * Number(UI.zoom || 100) / 100); r.style.setProperty('--uifont', { pretendard: "'LastLightUI'", gothic: "'LLNotoSans'", serif: "'LLNotoSerif'" }[UI.font] || "'LastLightUI'"); document.body.classList.toggle('nomotion', !UI.motion);  if (S.P && !$('app').hidden && !S.mobile && isNarrow() !== !!S.narrow) render(); }
let AUDIO_UNLOCKED = false;
function audioUnlock() { if (AUDIO_UNLOCKED) return; AUDIO_UNLOCKED = true; try { SFX.ctx = SFX.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); } catch (_) {} bgmSync(); }
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, audioUnlock, { capture: true, passive: true }));
/* 배경음악 — 지금 게임 index.html의 window.__ytbgm과 같은 동작(목록 전체 무작위 · 곡 끝나면 다음 곡) */
const BGM_FILES = { bgm01track1: [ASSET('../bgm/bgm01.mp3'), 'Window Demons'], bgm02track2: [ASSET('../bgm/bgm02.mp3'), 'Cinematic Symphony of Steel'], bgm03track3: [ASSET('../bgm/bgm03.mp3'), 'Alien or Cake'], bgm04track4: [ASSET('../bgm/bgm04.mp3'), 'Cosmic Nightmares'], bgm05track5: [ASSET('../bgm/bgm05.mp3'), 'Apocalyptic Echoes'], bgm06track6: [ASSET('../bgm/bgm06.mp3'), 'GROWTH DECAY'], bgm07track7: [ASSET('../bgm/bgm07.mp3'), 'TRAVELATOR'] };
const BGM = { audio: null, list: [], idx: 0, order: [], want: false, stopped: false, fails: 0, key: '' };
function bgmEl() { if (!BGM.audio) { const a = new Audio(); a.preload = 'auto'; a.addEventListener('ended', () => { if (BGM.list.length === 1) { a.currentTime = 0; a.play().catch(() => {}); } else bgmNext(); }); a.addEventListener('error', () => { BGM.fails++; if (BGM.fails < BGM.list.length) bgmNext(); }); a.addEventListener('playing', () => { BGM.fails = 0; musicPaint(); }); a.addEventListener('pause', musicPaint); BGM.audio = a; } return BGM.audio; }
function bgmShuffle() { BGM.order = BGM.list.map((_, i) => i); for (let i = BGM.order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [BGM.order[i], BGM.order[j]] = [BGM.order[j], BGM.order[i]]; } }
function bgmLoad(i) { if (!BGM.list.length) return; BGM.idx = (i + BGM.list.length) % BGM.list.length; const f = BGM_FILES[BGM.list[BGM.idx]]; if (!f) { bgmNext(); return; } const a = bgmEl(); a.src = f[0]; a.volume = UI.bgmVol / 100; BGM.stopped = false; BGM.want = true; a.play().catch(() => {}); }
function bgmNext() { if (!BGM.list.length) return; if (BGM.list.length > 1) { let pos = BGM.order.indexOf(BGM.idx); if (pos < 0 || pos >= BGM.order.length - 1) { const last = BGM.idx; bgmShuffle(); if (BGM.order[0] === last && BGM.order.length > 1) BGM.order.push(BGM.order.shift()); pos = -1; } bgmLoad(BGM.order[pos + 1]); } else bgmLoad(0); }
function bgmStart(ids) { BGM.list = ids.filter((v) => !!BGM_FILES[v]); if (!BGM.list.length) { bgmStop(); return; } BGM.fails = 0; if (BGM.list.length > 1) { bgmShuffle(); bgmLoad(BGM.order[0]); } else bgmLoad(0); }
function bgmStop() { BGM.want = false; BGM.stopped = false; BGM.key = ''; if (BGM.audio) BGM.audio.pause(); }
const bgmPlaying = () => !!(BGM.audio && !BGM.audio.paused);
const bgmTitle = () => (BGM_FILES[BGM.list[BGM.idx]] || ['', ''])[1];
function bgmSync() { const inGame = !!S.P && !$('app').hidden; if (!AUDIO_UNLOCKED || !UI.bgm || UI.bgmVol <= 0 || !inGame) { bgmStop(); musicPaint(); return; }
  const ids = UI.track === 'yt' ? Object.keys(BGM_FILES) : [String(UI.track).slice(3)], key = UI.track + '|' + ids.join(','); if (key === BGM.key) { if (BGM.audio) BGM.audio.volume = UI.bgmVol / 100; return; } BGM.key = key; bgmStart(ids); musicPaint(); }
function bgmCmd(c) { if (c === 'toggle') { const a = bgmEl(); if (!a.src) { BGM.key = ''; bgmSync(); return; } if (a.paused) { BGM.stopped = false; BGM.want = true; a.play().catch(() => {}); } else a.pause(); } else if (c === 'stop') { if (BGM.audio) { BGM.audio.pause(); try { BGM.audio.currentTime = 0; } catch (_) {} } BGM.stopped = true; } else if (c === 'next') bgmNext(); musicPaint(); }
function musicToggle() { audioUnlock(); const was = bgmPlaying(); UI.bgm = !was; uiSave(); if (!was) { BGM.key = ''; bgmSync(); if (!bgmPlaying()) bgmCmd('toggle'); } else bgmStop(); toast(was ? '배경음악 끔' : '배경음악 켬'); musicPaint(); }
const ICON_MUSIC_OFF = 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM3 3l18 18';
function musicPaint() { document.querySelectorAll('[data-music]').forEach((b) => { const on = bgmPlaying() || (UI.bgm && BGM.want && !BGM.stopped); b.innerHTML = svg(on ? ICON.music : ICON_MUSIC_OFF); b.style.color = on ? 'var(--accent)' : 'var(--muted)'; b.classList.toggle('outline-accent', on); b.title = on ? '배경음악 끄기' : '배경음악 틀기'; }); }
/* 효과음 — ui_feedback.tone · melody와 같은 합성(22050Hz) */
const SFX = { ctx: null, bufs: {}, last: 0 };
function sfxBuf(key) { if (SFX.bufs[key]) return SFX.bufs[key]; const ctx = SFX.ctx; if (!ctx) return null; const R = 22050;
  const tone = (f1, f2, sec) => { const n = Math.trunc(sec * R), b = ctx.createBuffer(1, n, R), d = b.getChannelData(0); for (let i = 0; i < n; i++) { const t = i / R, x = i / Math.max(1, n - 1), f = x < 0.5 ? f1 : f2, env = Math.min(1, t / 0.006) * Math.pow(1 - x, 1.7); d[i] = Math.max(-0.16, Math.min(0.16, Math.sin(Math.PI * 2 * f * t) * env * 0.12)); } return b; };
  const melody = (notes, step, tail, gain) => { const total = step * (notes.length - 1) + tail, n = Math.trunc(total * R), b = ctx.createBuffer(1, n, R), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / R; let v = 0; notes.forEach((f, k) => { const lt = t - step * k; if (lt < 0) return; const len = k === notes.length - 1 ? tail : step * 2.2; if (lt > len) return; const env = Math.min(1, lt / 0.005) * Math.exp(-lt * (5.5 / len)) * (1 - lt / len); v += (Math.sin(Math.PI * 2 * f * lt) + 0.28 * Math.sin(Math.PI * 4 * f * lt) + 0.08 * Math.sin(Math.PI * 6 * f * lt)) * env; }); d[i] = Math.max(-0.2, Math.min(0.2, v * gain)); } return b; };
  const def = { 'ui.confirm': () => tone(520, 680, 0.09), 'ui.cancel': () => tone(560, 380, 0.07), 'player.action': () => tone(330, 440, 0.16), 'score.reward': () => tone(660, 880, 0.18), 'game.victory': () => tone(480, 720, 0.22),
    'combat.victory': () => melody([784, 987.8, 1174.7, 1568], 0.075, 0.32, 0.075), 'game.defeat': () => melody([392, 329.6, 261.6], 0.16, 0.42, 0.08), 'long.complete': () => melody([659.3, 880, 1318.5], 0.13, 0.55, 0.07),
    'ui.open': () => melody([587.3, 880], 0.05, 0.12, 0.09), 'ui.close': () => melody([698.5, 466.2], 0.05, 0.12, 0.08), 'travel.start': () => melody([392, 493.9, 587.3], 0.07, 0.2, 0.09), 'travel.arrive': () => melody([587.3, 784, 987.8], 0.09, 0.35, 0.08), 'explore.done': () => melody([523.3, 659.3, 784], 0.08, 0.3, 0.08) };
  SFX.bufs[key] = def[key] ? def[key]() : null; return SFX.bufs[key]; }
function sfxCue(key) { if (!UI.sfx || !AUDIO_UNLOCKED || !SFX.ctx || UI.sfxVol <= 1) return false; try { const b = sfxBuf(key); if (!b) return false; const s = SFX.ctx.createBufferSource(), g = SFX.ctx.createGain(); g.gain.value = UI.sfxVol / 100; s.buffer = b; s.connect(g); g.connect(SFX.ctx.destination); s.start(); return true; } catch (_) { return false; } }
function sfx(kind) { if (TNOW) return false; const now = performance.now(); if (now - SFX.last < 90) return false; SFX.last = now; return sfxCue({ open: 'ui.open', close: 'ui.close', move: 'travel.start', explore_done: 'explore.done', start: 'player.action', arrive: 'travel.arrive', notify: 'score.reward', complete: 'score.reward' }[kind] || 'ui.confirm'); }
function sfxAlert(kind) { if (TNOW) return false; const k = { win: 'combat.victory', lose: 'game.defeat', long_done: 'long.complete' }[kind]; if (!k) return false; SFX.last = performance.now(); return sfxCue(k); }
/* 알림 팝업(종) */
const NPOP = { open: false, openId: '', shown: [] };
function ago(t) { const s = Math.max(0, nowSec() - Number(t || 0)); if (s < 60) return '방금'; if (s < 3600) return `${Math.trunc(s / 60)}분 전`; if (s < 86400) return `${Math.trunc(s / 3600)}시간 전`; return `${Math.trunc(s / 86400)}일 전`; }
function notifAction(e) { const id = String(e.id || ''), k = String(e.kind || ''), pl = isDict(e.payload) ? e.payload : {};
  if (id.startsWith('update-')) return ['업데이트 소식 보기', () => go('updates')]; if (id.startsWith('coop-boss') || id.startsWith('city-final') || id.startsWith('city-ending')) return ['토벌로 가기', () => go('coop')];
  if (id.startsWith('coop-sos') || id.startsWith('coop-repair')) return ['단체 퀘스트 보기', () => go('quests')]; if (id.startsWith('city-lit')) return ['탐사로 가기', () => go('explore')];
  if (k === 'duel') return ['결투 열기', () => duelOpen(String(pl.id || ''))]; if (k === 'hub_event' && petActive()) return ['거점 사건 확인', () => openHubEvent()]; if (k === 'merchant') return ['행상인 보기', () => go('merchant')];
  if (['friend', 'gift'].includes(k)) return ['요청함 열기', () => go('requests')]; if (k === 'pet') return ['반려동물 보기', () => go('pets')]; return null; }
const nhUnread = () => (S.P?.notifications || []).filter((e) => !e.read && !String(e.id || '').startsWith('chat-')).length;
function nhRead(id) { const e = (S.P.notifications || []).find((x) => String(x.id) === String(id)); if (e && !e.read) { e.read = true; return true; } return false; }
function notifToggle() { if (NPOP.open) notifClose(); else notifOpen(); }
function notifOpen() { if (!S.P) return; NPOP.open = true; NPOP.openId = ''; NPOP.shown = []; let el = $('npop'); if (!el) { el = document.createElement('div'); el.id = 'npop'; document.body.appendChild(el); } notifFill(); sfx('open'); }
function notifClose() { if (!NPOP.open) return; NPOP.open = false; let ch = false; for (const id of NPOP.shown) if (nhRead(id)) ch = true; const el = $('npop'); if (el) el.remove(); if (ch) { LIFE.dirty = true; LIFE.lastSave = 0; } badgesRefresh(); if (S.mode === 'notifications') redrawKeep(); }
function notifFill() { const el = $('npop'); if (!el) return; const b = $('bBell'), r = b ? b.getBoundingClientRect() : { right: innerWidth - 20, bottom: 70 }, mob = S.mobile, rows = [...(S.P.notifications || [])].reverse().slice(0, 6);
  let h = `<div class="npshade"></div><div class="nppanel${mob ? ' mob' : ''}" style="${mob ? '' : `top:${Math.round(r.bottom + 10)}px;left:${Math.round(Math.max(12, Math.min(innerWidth - Math.min(390, innerWidth - 24) - 12, r.right - Math.min(390, innerWidth - 24) + 6)))}px`}">${mob ? '<i class="grab"></i>' : ''}<div class="nphd"><b>알림</b><span class="muted">읽지 않은 알림 ${nhUnread()}</span><button class="btn sm" style="color:var(--accent)" id="npAll">모두 읽음</button></div><div class="nplist">`;
  if (!rows.length) h += '<p class="muted" style="font-size:13px;margin:8px 4px">아직 알림이 없습니다.</p>';
  rows.forEach((e, i) => { const id = String(e.id); if (!NPOP.shown.includes(id)) NPOP.shown.push(id); const un = !e.read, [tg, tc] = ntagOf(e), ex = NPOP.openId === id, actn = ex ? notifAction(e) : null;
    h += `${i ? '<i class="npsep"></i>' : ''}<div class="npitem${ex ? ' ex' : ''}" data-npi="${esc(id)}"><i class="dot" style="background:${un ? tc : 'transparent'}"></i><div class="tx"><div class="t">${tg ? `<span class="cchip" style="--c:${tc}">${esc(tg)}</span>` : ''}<b style="color:${un ? 'var(--text)' : 'var(--muted)'}">${esc(e.title || '')}</b><small>${ago(e.time)}</small></div><p class="${ex ? '' : 'one'}">${esc(ex ? notifBody(e) : String(e.body || ''))}</p>${ex ? `<div class="brow">${actn ? `<button class="btn sm primary" data-npa="${esc(id)}">${esc(actn[0])}</button>` : ''}<button class="btn sm" data-npf>접기</button></div>` : ''}</div></div>`; });
  h += `</div><div class="npft"><button class="btn" id="npSet">알림 설정</button><button class="btn primary" id="npFull">전체 보기</button></div></div>`; el.innerHTML = h;
  el.querySelector('.npshade').onclick = notifClose; $('npAll').onclick = () => { for (const e of S.P.notifications || []) e.read = true; LIFE.dirty = true; LIFE.lastSave = 0; badgesRefresh(); notifFill(); };
  $('npSet').onclick = () => { notifClose(); settingsOpen('알림'); }; $('npFull').onclick = () => { notifClose(); go('notifications'); };
  el.querySelectorAll('[data-npi]').forEach((x) => { x.onclick = (ev) => { if (ev.target.closest('button')) return; NPOP.openId = NPOP.openId === x.dataset.npi ? '' : x.dataset.npi; notifFill(); }; });
  el.querySelectorAll('[data-npf]').forEach((x) => { x.onclick = () => { NPOP.openId = ''; notifFill(); }; });
  el.querySelectorAll('[data-npa]').forEach((x) => { x.onclick = () => { const e = (S.P.notifications || []).find((y) => String(y.id) === x.dataset.npa), a = e && notifAction(e); nhRead(x.dataset.npa); notifClose(); if (a) a[1](); }; }); }
/* 게임 알림 자동 팝업(_drain_popup_queue → _open_notification) */
function openNotification(id) { const e = (S.P.notifications || []).find((x) => String(x.id) === String(id)); if (!e) return; nhRead(id); LIFE.dirty = true; LIFE.lastSave = 0; badgesRefresh();
  if (String(e.kind) === 'duel') { duelOpen(String((e.payload || {}).id || '')); return; } const a = notifAction(e);
  modal(String(e.title || '알림'), `<p style="white-space:pre-line;color:var(--text)">${esc(notifBody(e))}</p>`, a ? [[a[0], 'primary', a[1]], ['확인 · 닫기', '', null]] : [['확인 · 닫기', 'primary', null]]); }
/* 채팅 켜기 · 끄기 */
function chatToggle() { if (S.narrow) { if (S.mode === 'chat') go(FD.chatBack && FD.chatBack !== 'chat' ? FD.chatBack : initialMode()); else { FD.chatBack = S.mode; go('chat'); } badgesRefresh(); return; } UI.chat = !UI.chat; uiSave(); if (!S.mobile) { const col = $('chatcol'), body = document.querySelector('#app .body'); if (col) col.hidden = !UI.chat; if (body) body.classList.toggle('nochat', !UI.chat); if (UI.chat) { drawChat(); drawOnline(); } } badgesRefresh(); }
/* 머리말 · 메뉴 배지(_update_notification_badges · _side_badge_info) */
function sideBadge(m, claim) { const p = S.P; if (!p) return ['', true]; switch (m) { case 'quests': return [claim > 0 ? String(claim) : '', true]; case 'stats': return [Number(p.skill_points) > 0 ? String(Number(p.skill_points)) : '', true]; case 'story_menu': return [storyReady() ? '준비' : '', true];
  case 'party': return [joinedIds().length ? `${joinedIds().length}명` : '', false]; case 'notifications': { const n = nhUnread(); return [n > 0 ? (n < 100 ? String(n) : '99+') : '', true]; } case 'inventory': { const n = claimableItemsCount(); return [n > 0 ? String(n) : '', true]; }
  case 'requests': { const n = SOC.friendRequests.length + SOC.relRequests.length + SOC.entries.filter((x) => x.kind === 'heal_request' && x.status === 'pending').length + duelIncoming(); return [n > 0 ? String(n) : '', true]; } case 'duels': { const n = duelIncoming(); return [n > 0 ? String(n) : '', true]; } }
  return ['', true]; }
function questClaimableN() { try { let n = 0; for (const sc of ['daily', 'weekly']) { const q = S.P.quests?.[sc]; if (!q) continue; for (const x of questList(sc)) if (questDone(sc, x) && !(q.claimed || []).includes(x.id)) n++; } return n + weeklyClaimable(); } catch (_) { return 0; } }
function badgesRefresh() { if (!S.P || $('app').hidden) return; const un = nhUnread();
  document.querySelectorAll('#bBell').forEach((b) => { let s = b.querySelector('.bbadge'); if (un > 0) { if (!s) { s = document.createElement('span'); s.className = 'bbadge'; b.appendChild(s); } s.textContent = un < 100 ? String(un) : '99+'; } else if (s) s.remove(); });
  const cu = S.P.channel_unread || {}; let total = 0; for (const k of ['world', 'party', 'notice']) total += Number(cu[k] || 0); total += dmUnread();
  const ct = $('bChatT'); if (ct) { ct.textContent = S.narrow ? (S.mode === 'chat' ? '채팅 닫기' : total > 0 ? `채팅 (${total})` : '채팅') : total > 0 ? `채팅 (${total})` : UI.chat ? '채팅 ON' : '채팅 OFF'; ct.style.color = total > 0 ? 'var(--danger)' : UI.chat || S.narrow ? 'var(--accent)' : 'var(--muted)'; }
  document.querySelectorAll('#bnav [data-m="chat"] .nbadge, #bnav [data-m="chat"] .cbadge').forEach((x) => x.remove()); if (total > 0) { const nb = document.querySelector('#bnav [data-m="chat"]'); if (nb) { const s = document.createElement('span'); s.className = 'cbadge nb'; s.textContent = total > 99 ? '99+' : String(total); nb.appendChild(s); } }
  const claim = questClaimableN(); document.querySelectorAll('#side [data-m]').forEach((b) => { const [t, alert] = sideBadge(b.dataset.m, claim); let s = b.querySelector('.sbadge'); if (t) { if (!s) { s = document.createElement('span'); s.className = 'sbadge'; b.appendChild(s); } s.textContent = t; s.classList.toggle('alert', alert); } else if (s) s.remove(); });
  document.querySelectorAll('#side [data-g]').forEach((g) => { const grp = M.NAV_GROUPS.find(([n]) => n === g.dataset.g); const has = grp && g.dataset.g !== S.openGroup && grp[1].some(([, m]) => { const [t, al] = sideBadge(m, claim); return t && al; }); let d = g.querySelector('.gdot'); if (has) { if (!d) { d = document.createElement('i'); d.className = 'gdot'; g.appendChild(d); } } else if (d) d.remove(); });
  const st = $('bState'); if (st) { const n = activeConds().length + activePositive().length; st.textContent = n > 0 ? `상태 ${n}` : '상태'; }
  const db = $('bDuel'); if (db) { const n = duelIncoming(), busy = duelBusy(); db.textContent = n > 0 ? `결투 ${n}` : busy ? '결투 중' : '결투'; db.hidden = !(n > 0 || busy); }
  const wc = $('bWork'); if (wc) { const on = craftActive(); wc.hidden = !on; if (on) { const j = S.P.craft_job, left = Math.max(0, Number(j.ready || 0) - nowSec()), lt = left > 60 ? `${Math.ceil(left / 60)}분 남음` : left > 0 ? '곧 완료' : '완료'; const r = recipeFor(String(j.name || '')), kind = r ? recipeCat(r) : ''; wc.textContent = `${kind === '요리' ? '요리 중' : kind === '회복' ? '회복품 제작' : '제작 중'} · ${lt}`; wc.style.color = kind === '요리' ? 'var(--warning)' : kind === '회복' ? 'var(--accent)' : 'var(--blue)'; } }
  const cc = document.querySelectorAll('[data-claimall]'); const n = claimableItemsCount(); cc.forEach((c) => { c.hidden = !(n > 0 || CLAIM.running); c.lastChild.textContent = CLAIM.running ? '받는 중…' : `받을 것 ${n} · 모두 받기`; }); }
/* 받을 것 모두 받기(_claim_all_inbox) */
const CLAIM = { running: false };
function claimAllInbox() { if (CLAIM.running) return; const q = []; for (const b of SOC.broadcasts) if (!(S.P.social_done || {})['broadcast:' + b.id]) q.push(['claimBroadcast', String(b.id || '')]); for (const e of SOC.entries) if (['broadcast', 'trade', 'trade_refund'].includes(e.kind)) q.push(['claimSocial', String(e.id || '')]);
  CLAIM.running = true; badgesRefresh(); let failed = 0;
  const step = () => { if (!q.length) { CLAIM.running = false; act(() => { claimStored(); return true; }, () => { const left = isDict(S.P.stored_loot) ? Object.keys(S.P.stored_loot).length : 0; toast(left ? `가방이 가득 차 ${left}종은 받은 물품함에 남았습니다 · 가방 › 인벤토리 맨 위` : failed ? '일부를 받지 못했습니다 · 잠시 뒤 다시 눌러 주세요.' : '받을 것을 모두 가방에 넣었습니다.'); badgesRefresh(); }); return; }
    const [k, id] = q.shift(); if (!LIVE.on) { step(); return; } socialCall(k, [id], () => { if (k === 'claimBroadcast') { if (!isDict(S.P.social_done)) S.P.social_done = {}; S.P.social_done['broadcast:' + id] = true; } step(); }, (r) => { if (k === 'claimBroadcast' && String(r.error || '').includes('이미 받았')) { if (!isDict(S.P.social_done)) S.P.social_done = {}; S.P.social_done['broadcast:' + id] = true; } else failed++; step(); }); };
  step(); }
/* 설정 창(화면 · 소리 · 알림 · 기타) */
const SET = { tab: '화면' };
const setRow = (key, title, desc, on) => `<label class="srow"><span><b>${esc(title)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span><button type="button" class="swt ${on ? 'on' : ''}" data-sk="${key}"><i></i></button></label>`;
const setSeg = (key, title, opts, val) => `<div class="sseg"><span class="muted">${esc(title)}</span><div class="pills">${opts.map(([id, l]) => `<button type="button" class="pill ${String(id) === String(val) ? 'on' : ''}" data-ss="${key}" data-v="${esc(id)}">${esc(l)}</button>`).join('')}</div></div>`;
function settingsOpen(tab) { if (tab) SET.tab = tab; const p = S.P, ns = p?.notify_settings || {}; let b = '';
  if (SET.tab === '화면') { b += `<b class="sgrp">테마</b><div class="thgrid">${M.THEME_IDS.map((id) => { const t = M.THEMES[id], on = id === S.theme; return `<button type="button" class="thcard${on ? ' on' : ''}" data-th="${id}" style="background:#${t.PANEL};border-color:${on ? 'var(--accent)' : '#' + t.LINE};color:#${t.TEXT}"><b>${esc(t.name)}${on ? ' ✓' : ''}</b><span>${['BG', 'ACCENT', 'WARNING', 'DANGER', 'BLUE'].map((k) => `<i style="background:#${t[k]};border-color:#${t.LINE}"></i>`).join('')}</span></button>`; }).join('')}</div>`;
    b += '<b class="sgrp">크기 · 글씨</b>' + setSeg('compact', '화면 크기', [['1', '기본'], ['0', '확대']], UI.compact ? '1' : '0') + setSeg('zoom', '글씨 크기', [80, 90, 100, 110, 120, 135].map((v) => [v, v + '%']), UI.zoom) + setSeg('font', '글꼴', [['pretendard', '프리텐다드'], ['gothic', '노토 산스'], ['serif', '노토 세리프']], UI.font);
    b += setRow('tags', '물품 종류 태그', '물품 이름 옆에 [요리] 같은 태그를 붙입니다', UI.tags) + setRow('motion', '창 열기 애니메이션', '창이 열릴 때 부드럽게 나타납니다', UI.motion) + '<button class="btn" id="setFit" style="width:100%">화면 크기 처음대로 맞추기</button>'; }
  else if (SET.tab === '소리') { const pl = bgmPlaying(), title = bgmTitle();
    b += `<div class="snow"><small>지금 나오는 곡</small><b>${esc(title ? '♪ ' + title : '♪ 배경음악 ' + (UI.bgm ? '켜짐' : '꺼짐'))}</b><div class="brow"><button class="btn primary" data-bc="toggle">${pl ? '일시정지' : '재생'}</button><button class="btn" data-bc="stop">정지</button><button class="btn" data-bc="next">다음 곡</button></div></div>`;
    b += setRow('bgm', '배경음악', '거점과 전투에서 음악이 나옵니다', UI.bgm) + '<b class="sgrp">곡 선택</b>' + setSeg('track', '곡', [['yt', '전체 랜덤'], ...Object.keys(BGM_FILES).map((k) => ['yt:' + k, BGM_FILES[k][1]])], UI.track);
    b += `<div class="sslide"><span><b>배경음악 크기</b><em id="svBgm">${Math.round(UI.bgmVol)}</em></span><input type="range" min="0" max="100" step="1" value="${UI.bgmVol}" data-sv="bgmVol"></div>` + setRow('sfx', '효과음', '버튼 · 알림 · 전투 소리', UI.sfx) + `<div class="sslide"><span><b>효과음 크기</b><em id="svSfx">${Math.round(UI.sfxVol)}</em></span><input type="range" min="0" max="200" step="5" value="${UI.sfxVol}" data-sv="sfxVol"></div>`; }
  else if (SET.tab === '알림') { if (!p) b += '<p class="muted">캐릭터로 들어간 뒤 바꿀 수 있습니다.</p>'; else { b += setRow('chat', '채팅 칸 보이기', '오른쪽 채팅 · 접속자 목록', UI.chat);
    for (const [k, t, d] of [['explore_confirm', '탐사 전 확인 창', '확률 · 걸리는 시간을 먼저 보여 줍니다'], ['popups', '게임 알림 팝업', '새 알림을 화면 위에 띄웁니다'], ['world', '월드 채팅 새 글 표시', ''], ['party', '파티 채팅 새 글 표시', ''], ['notice', '공지 새 글 표시', ''], ['dm', '쪽지 새 글 표시', '']]) b += setRow('ns:' + k, t, d, ns[k] ?? true);
    b += setRow('ns:explore_popup', '결과 창 띄우기', '탐사 · 전투가 끝나면 결과 창을 보여 줍니다', ns.explore_popup ?? true) + setRow('ns:explore_notify', '결과를 알림함에 남기기', '', ns.explore_notify ?? true) + setRow('ns:long_auto_heal', '장기 탐사 자동 회복', '체력이 60% 아래면 회복품을 자동으로 씁니다', ns.long_auto_heal ?? true); } }
  else { if (p) b += setRow('welcome', '입장 안내 보기', '들어올 때 생존 규칙을 보여 줍니다', !ns.welcome_hidden); b += '<div class="brow"><button class="btn" style="color:var(--blue)" id="setGuide">생존 규칙 읽기</button><button class="btn" style="color:var(--blue)" id="setRep">오류 제보 · 건의</button></div><div class="brow"><button class="btn" id="setChars">캐릭터 관리</button><button class="btn" id="setProfile">캐릭터 설정</button></div>' + (LIVE.on ? '<div class="brow"><button class="btn" id="setAcct">내 계정 · 비밀번호 변경</button></div>' : '');
    b += `<button class="btn" id="setOut" style="width:100%;color:var(--danger);border-color:color-mix(in srgb,var(--danger) 45%,transparent)">${LIVE.on ? '로그아웃' : '타이틀로'}</button><p class="subtle" style="font-size:12px;margin:0">게임 버전 ${esc(M.BUILD_VERSION)} · <a href="classic.html" style="color:inherit">이전 화면(Godot)으로 열기</a></p>`; }
  modal('설정', `<div class="settabs">${['화면', '소리', '알림', '기타'].map((t) => `<button class="pill ${t === SET.tab ? 'on' : ''}" data-st="${t}">${t}</button>`).join('')}</div><div class="setbody">${b}</div>`, [['닫기', '', null]]);
  const r = $('modalRoot'), mc = r.querySelector('.mcard'); if (mc) mc.classList.add('wide'); const again = () => settingsOpen();
  r.querySelectorAll('[data-st]').forEach((x) => { x.onclick = () => settingsOpen(x.dataset.st); }); r.querySelectorAll('[data-th]').forEach((x) => { x.onclick = () => { applyTheme(x.dataset.th); try { localStorage.setItem('ll_html_theme', S.theme); } catch (_) {} if (S.P) render(); again(); }; });
  r.querySelectorAll('[data-ss]').forEach((x) => { x.onclick = () => { const k = x.dataset.ss, v = x.dataset.v; if (k === 'compact') UI.compact = v === '1'; else if (k === 'zoom') UI.zoom = Number(v); else if (k === 'font') UI.font = v; else if (k === 'track') { UI.track = v; BGM.key = ''; bgmSync(); } uiSave(); uiApply(); again(); }; });
  r.querySelectorAll('[data-sv]').forEach((x) => { x.oninput = () => { UI[x.dataset.sv] = Number(x.value); const e = $(x.dataset.sv === 'bgmVol' ? 'svBgm' : 'svSfx'); if (e) e.textContent = x.value; if (x.dataset.sv === 'bgmVol') bgmSync(); }; x.onchange = () => { uiSave(); if (x.dataset.sv === 'sfxVol') sfx('complete'); }; });
  r.querySelectorAll('[data-bc]').forEach((x) => { x.onclick = () => { audioUnlock(); if (!UI.bgm && x.dataset.bc !== 'stop') { UI.bgm = true; uiSave(); bgmSync(); } bgmCmd(x.dataset.bc); setTimeout(() => { if (SET.tab === '소리' && $('modalRoot').querySelector('.settabs')) again(); }, 400); }; });
  r.querySelectorAll('[data-sk]').forEach((x) => { x.onclick = (ev) => { ev.preventDefault(); const k = x.dataset.sk;
    if (k === 'tags' || k === 'motion' || k === 'sfx') { UI[k] = !UI[k]; if (k === 'motion') UI.motionSet = true; uiSave(); uiApply(); if (k === 'tags' && S.P) rerender(); again(); return; }
    if (k === 'bgm') { UI.bgm = !UI.bgm; uiSave(); audioUnlock(); bgmSync(); again(); return; } if (k === 'chat') { chatToggle(); again(); return; }
    if (k === 'welcome') { act(() => { const ns2 = S.P.notify_settings || (S.P.notify_settings = {}); ns2.welcome_hidden = !ns2.welcome_hidden; return true; }, again); return; }
    if (k.startsWith('ns:')) { const key = k.slice(3); act(() => { const ns2 = S.P.notify_settings || (S.P.notify_settings = {}); ns2[key] = !(ns2[key] ?? true); if (['world', 'party', 'notice'].includes(key) && !ns2[key] && isDict(S.P.channel_unread)) S.P.channel_unread[key] = 0; return true; }, () => { badgesRefresh(); again(); }); } }; });
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = () => { $('modalRoot').innerHTML = ''; fn(); }; };
  on('setFit', () => { UI.compact = true; UI.zoom = 100; uiSave(); uiApply(); }); on('setGuide', () => go('guide')); on('setRep', () => go('reports')); on('setChars', charManager); on('setProfile', () => go('profile')); on('setAcct', accountModal);
  on('setOut', async () => { if (LIVE.on) { call('presenceOff'); const r2 = await call('signOut'); if (r2.ok) { toast('로그아웃했습니다.'); location.reload(); } } else { $('app').hidden = true; $('saveBar').hidden = true; $('title').hidden = false; showChars(); } }); }
/* 입장 안내(_show_welcome_modal) · 이름/나이 처음 정하기(chars.prompt_setup) */
function entryWelcome() { const p = S.P; if (!p || !(p.character || {}).created) return; if ($('modalRoot').innerHTML) { modalLater(entryWelcome, true); return; }
  if (LIVE.on && S.acct?.charSetup === false) { modal('캐릭터 이름 · 나이 정하기', `<p class="muted">이제 다른 생존자에게는 계정 닉네임 대신 캐릭터 이름만 보입니다. 처음 한 번 캐릭터 이름과 나이를 정해 주세요. 지금 닉네임을 그대로 써도 됩니다.</p><label class="muted">캐릭터 이름</label><input class="sel" id="psName" maxlength="10" placeholder="한글·영문·숫자 2~10자" value="${esc(S.acct.nickname || '')}"><label class="muted">나이</label><input class="sel" id="psAge" maxlength="16" placeholder="18세 이상 · 숫자 또는 한글 (예: 25, 스물다섯)">`,
    [['저장', 'primary keep', () => charSetup($('psName').value, $('psAge').value, () => { $('modalRoot').innerHTML = ''; toast('캐릭터 이름을 정했습니다.'); rerender(); })]]); return; }
  if ((p.notify_settings || {}).welcome_hidden) return; const rules = [['시간은 실제로 흐릅니다', '하루는 실제 하루입니다. 접속하지 않아도 허기와 수분은 천천히 줄어듭니다.'], ['체력이 0이 되면 쓰러집니다', '같은 대지역에 있는 다른 생존자가 부활시켜 줄 수 있습니다.'], ['감염을 조심하세요', '치료하지 않으면 변이로 이어질 수 있습니다. 최종 변이는 변이 치료제로만 고칩니다.'], ['함께하면 더 쉽습니다', '토벌과 장기 탐사는 다른 생존자와 함께할 때 보상이 커집니다.'], ['오류는 알려 주세요', '기록 › 오류·건의에서 바로 운영진에게 보낼 수 있습니다.']];
  modal('생존 규칙', `<b style="color:var(--warning);font-size:12px">입장할 때마다 보입니다 · 다 읽었으면 아래에 체크하세요</b>${rules.map(([t, d], i) => `<div class="wrule"><em>${i + 1}</em><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join('')}<label class="sqchk"><input type="checkbox" id="wHide">규칙을 읽었습니다 · 다음 입장부터 보지 않기</label>`,
    [['거점으로 들어가기', 'primary', () => { if ($('wHide')?.checked) act(() => { (S.P.notify_settings || (S.P.notify_settings = {})).welcome_hidden = true; return true; }); }], ['전체 생존 규칙 보기', '', () => go('guide')]]);
  const cb = $('wHide'); if (cb) cb.onchange = () => { const ok = $('mBtns')?.firstChild; if (ok) ok.onclick = () => { $('modalRoot').innerHTML = ''; if (cb.checked) act(() => { (S.P.notify_settings || (S.P.notify_settings = {})).welcome_hidden = true; return true; }); }; }; }
/* 새 버전 배포 감지(index.html v36.58과 같은 방식 · 30분마다) */
(() => { let shown = false, last = 0; const mine = String(M.BUILD_VERSION || '');
  const show = (v) => { if (shown) return; shown = true; let left = 15; const box = document.createElement('div'); box.className = 'verbar'; const t = document.createElement('div'), b = document.createElement('button'); b.textContent = '지금 새로고침'; b.className = 'btn primary'; const goR = () => location.replace(location.pathname + '?v=' + encodeURIComponent(v) + '&t=' + Date.now()); b.onclick = goR; box.append(t, b); document.body.appendChild(box);
    const tick = () => { t.textContent = `새 버전(${v})이 나왔습니다. 진행은 저장되어 있습니다. ${left}초 뒤 자동으로 새로고침합니다.`; if (left-- <= 0) goR(); else setTimeout(tick, 1000); }; tick(); };
  const check = () => { last = Date.now(); fetch(ASSET('../version.json') + '?t=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.version && mine && j.version !== mine) show(String(j.version)); }).catch(() => {}); };
  if (!/localhost|127\.0\.0\.1/.test(location.hostname)) { setTimeout(check, 20000); setInterval(check, 1800000); document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - last >= 1800000) check(); }); } })();
/* 브라우저 · 휴대폰 뒤로 가기(browser_navigation.gd와 같은 생각): 창이 열려 있으면 창을 닫고, 다른 메뉴면 거점(지금 상황 화면)으로,
   거점에서는 한 번 더 누를 때만 게임을 떠납니다. 메뉴끼리 옮겨 다니는 것은 기록을 쌓지 않습니다. */
const NAVH = { armed: false, ignore: 0, modal: false, exitAt: 0 };
function navArm() { if (NAVH.armed) return; NAVH.armed = true; try { history.replaceState({ ll: 'base' }, ''); history.pushState({ ll: 'game' }, ''); } catch (_) { NAVH.armed = false; } }
new MutationObserver(() => { if (!NAVH.armed) return; const open = !!$('modalRoot').innerHTML;
  if (open && !NAVH.modal) { NAVH.modal = true; try { history.pushState({ ll: 'modal' }, ''); } catch (_) {} }
  else if (!open && NAVH.modal) { NAVH.modal = false; if (history.state && history.state.ll === 'modal') { NAVH.ignore++; history.back(); } } }).observe($('modalRoot'), { childList: true });
window.addEventListener('popstate', () => { if (NAVH.ignore > 0) { NAVH.ignore--; return; } if (!NAVH.armed || $('app').hidden || !S.P) return;
  if (NAVH.modal) { NAVH.modal = false; $('modalRoot').innerHTML = ''; sfx('close'); return; }
  const re = () => { try { history.pushState({ ll: 'game' }, ''); } catch (_) {} };
  if (NPOP.open) { notifClose(); re(); return; }
  if (!(M.WORLD_MODES || []).includes(S.mode) && S.mode !== 'worldmap') { go(initialMode()); re(); return; }
  if (Date.now() - NAVH.exitAt < 2500) { NAVH.armed = false; history.back(); return; } NAVH.exitAt = Date.now(); toast('뒤로 가기를 한 번 더 누르면 게임을 떠납니다.'); re(); });
/* 창이 이미 열려 있으면 닫힌 뒤 차례로(입장 때 생존 규칙 → 장기 탐사 결과 → 알림) */
const MQ = [];
function modalLater(fn, front = false) { if (!$('modalRoot').innerHTML) { fn(); return; } if (front) MQ.unshift(fn); else MQ.push(fn); }
new MutationObserver(() => { if ($('modalRoot').innerHTML) return; setTimeout(() => { if ($('modalRoot').innerHTML) return; if (MQ.length) MQ.shift()(); else drainPopups(); }, 180); }).observe($('modalRoot'), { childList: true });
/* Esc로 창 닫기 */
document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (NPOP.open) { notifClose(); return; } if ($('modalRoot').innerHTML) { $('modalRoot').innerHTML = ''; sfx('close'); } });
setInterval(() => { if (S.P && !$('app').hidden) badgesRefresh(); }, 2000);
uiApply();

/* 효과음을 내는 곳(Godot에서 _feedback.play를 부르는 동작과 같음) */
{ const W = (f, kind, ok = (r) => r !== false) => function (...a) { const r = f.apply(this, a); if (ok(r, a)) sfx(kind); return r; };
  claimQuest = W(claimQuest, 'complete'); dismantle = W(dismantle, 'complete'); doTrade = W(doTrade, 'complete'); craftStart = W(craftStart, 'start'); startLongExplore = W(startLongExplore, 'start');
  fishBuyBait = W(fishBuyBait, 'complete'); fishCast = W(fishCast, 'start'); setHardMode = W(setHardMode, 'complete'); questReroll = W(questReroll, 'notify'); petCare = W(petCare, 'complete');
  beginRegionMove = W(beginRegionMove, 'move', (r) => r !== false && nonEmpty(S.P.travel)); travelTickDue = W(travelTickDue, 'arrive', (r) => r === true); exploreTickDue = W(exploreTickDue, 'explore_done', (r) => r === true);
  const fc = finishCombat; finishCombat = function (victory) { const src = String(S.P.battle?.source || ''); const r = fc.call(this, victory); if (victory && src !== 'long') sfxAlert('win'); return r; };
  const cd = checkDeath; checkDeath = function (...a) { const was = !!S.P.dead, r = cd.apply(this, a); if (!was && S.P.dead) sfxAlert('lose'); return r; };
  const lo = longOverdueFix; longOverdueFix = function () { const t = S.P.long_expedition, halted = !!(t && t.halted), r = lo.call(this); if (r && !halted) sfxAlert('long_done'); return r; }; }
