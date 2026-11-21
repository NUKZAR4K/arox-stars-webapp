'use strict';
const API = 'https://8p47e06l67.apps.bot-hosting.cloud';
const ADMIN_ID = 5903404447;
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round(n * 100) / 100;
const money = n => r2(n).toFixed(2).replace('.', ',') + ' ₴';
const num = n => Number(n).toLocaleString('uk-UA');
const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
const AVA = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0d1022"/><circle cx="32" cy="24" r="11" fill="#f6c453"/><path d="M10 58c2-14 13-20 22-20s20 6 22 20z" fill="#c8912b"/></svg>');
const STARS = [50, 100, 250, 500, 1000, 5000], MONTHS = [3, 6, 12];
const ST = { new: 'очікує оплати', receipt: 'чек на перевірці', done: 'виконано', cancelled: 'скасовано' };
const S = { cfg: { price_per_star: 1.7, prem_3: 650, prem_6: 1150, prem_12: 2000, support_username: 'Zuiral', bot_username: '' },
  cat: 'stars', pack: 100, custom: '', months: 3, promo: null, admin: false, busy: false };

const hap = t => { try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(t || 'light'); } catch (e) {} };
let tt;
function toast(msg, type) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + (type || '');
  clearTimeout(tt); tt = setTimeout(() => t.className = '', 3200);
  try { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred(type === 'bad' ? 'error' : type === 'ok' ? 'success' : 'warning'); } catch (e) {}
}

async function api(path, opt) {
  opt = opt || {};
  const c = new AbortController(), t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(API + path, { ...opt, signal: c.signal, headers: { 'Content-Type': 'application/json', 'X-Init-Data': (tg && tg.initData) || '' } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { d.ok = false; d.error = d.error || 'Помилка сервера ' + r.status; }
    return d;
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'Сервер не відповідає' : 'Немає зв’язку із сервером' };
  } finally { clearTimeout(t); }
}
const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b) });

/* ---------- зоряне небо ---------- */
(function sky() {
  const c = $('#sky'), x = c.getContext('2d'), rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, stars = [], run = false;
  function size() {
    const d = devicePixelRatio || 1; W = c.width = innerWidth * d; H = c.height = innerHeight * d;
    stars = Array.from({ length: Math.min(120, Math.floor(innerWidth / 3.5)) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + .4) * d, p: Math.random() * 6.28, s: Math.random() * .04 + .01, g: Math.random() < .16, v: (Math.random() * .08 + .02) * d }));
    draw(0);
  }
  function draw(t) {
    x.clearRect(0, 0, W, H);
    for (const s of stars) {
      const a = .3 + .7 * Math.abs(Math.sin(s.p + t * s.s * .05));
      x.globalAlpha = a; x.fillStyle = s.g ? '#f6c453' : '#cfd6ff';
      x.shadowColor = s.g ? '#f6c453' : 'transparent'; x.shadowBlur = s.g ? 12 * a : 0;
      x.beginPath(); x.arc(s.x, s.y, s.g ? s.r * 1.4 : s.r, 0, 6.283); x.fill();
      if (!rm) { s.y += s.v; if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; } }
    }
    x.globalAlpha = 1;
  }
  function loop(t) { if (!run) return; draw(t); requestAnimationFrame(loop); }
  function go() { if (rm || run || document.hidden) return; run = true; requestAnimationFrame(loop); }
  addEventListener('resize', size);
  document.addEventListener('visibilitychange', () => { run = false; go(); });
  size(); go();
})();

/* ---------- користувач ---------- */
function setUser() {
  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Гість' : 'Гість';
  const ava = user && user.photo_url ? user.photo_url : AVA;
  ['#spAva', '#hdAva'].forEach(s => { const i = $(s); i.src = ava; i.onerror = () => { i.onerror = null; i.src = AVA; }; });
  $('#spName').textContent = name; $('#hdName').textContent = name;
}

function applyCfg(d) {
  ['price_per_star', 'prem_3', 'prem_6', 'prem_12'].forEach(k => { if (d[k] > 0) S.cfg[k] = +d[k]; });
  if (d.support_username) S.cfg.support_username = d.support_username;
  if (d.bot_username) S.cfg.bot_username = d.bot_username;
}

/* ---------- екран завантаження ---------- */
async function boot() {
  setUser();
  if (tg) { try { tg.ready(); tg.expand(); tg.setHeaderColor('#06070d'); tg.setBackgroundColor('#06070d'); } catch (e) {} }
  const term = $('#term'), bar = $('#bar'), pct = $('#pct');
  const prog = v => { bar.style.width = v + '%'; pct.textContent = v + '%'; };
  const line = (t, cls) => { const d = document.createElement('div'); d.innerHTML = '&gt; ' + esc(t) + (cls ? ' <span class="' + cls + '">' + (cls === 'ok' ? '[OK]' : '[ПОМИЛКА]') + '</span>' : ''); term.appendChild(d); };
  line('Синхронізація сесії Telegram WebApp…'); prog(12); await sleep(350);
  line('Підключення до ' + API.replace('https://', '') + '…'); prog(35);
  const [cfg, info] = await Promise.all([api('/api/config'), user ? api('/api/user-info?user_id=' + user.id) : Promise.resolve(null), sleep(600)]);
  if (cfg.ok) { applyCfg(cfg); line('Зʼєднання встановлено', 'ok'); } else line('Сервер недоступний: ' + cfg.error, 'bad');
  prog(70); await sleep(250);
  line('Завантаження курсу зірок…', cfg.ok ? 'ok' : 'bad');
  S.admin = (user && user.id === ADMIN_ID) || !!(info && info.is_admin);
  prog(90); await sleep(250);
  line('Готово до оформлення замовлення', 'ok'); prog(100); await sleep(500);
  initShop();
  $('#splash').classList.add('out');
}

/* ---------- магазин ---------- */
const qty = () => { const q = S.custom ? +S.custom : S.pack; return q >= 50 && q <= 100000 ? q : 0; };
function calc() {
  let base = 0, label = '';
  if (S.cat === 'stars') {
    const q = qty();
    label = q ? num(q) + ' зірок' : S.custom ? 'Від 50 до 100 000 зірок' : 'Оберіть пакет';
    base = q ? r2(q * S.cfg.price_per_star) : 0;
  } else { label = 'Telegram Premium, ' + S.months + ' міс.'; base = +S.cfg['prem_' + S.months]; }
  const pct = S.promo ? S.promo.percent : 0, fin = r2(base * (100 - pct) / 100);
  return { label, base, pct, fin, disc: r2(base - fin) };
}
function render() {
  $('#rate').textContent = '1 ★ = ' + money(S.cfg.price_per_star);
  $('#packs').innerHTML = STARS.map(n => `<button class="pack${!S.custom && S.pack === n ? ' on' : ''}" data-n="${n}"><svg class="ic"><use href="#st"/></svg><b>${num(n)}</b><span>${money(n * S.cfg.price_per_star)}</span></button>`).join('');
  $('#months').innerHTML = MONTHS.map(m => `<button class="pack${S.months === m ? ' on' : ''}" data-m="${m}"><svg class="ic"><use href="#dm"/></svg><b>${m}</b><span>${money(S.cfg['prem_' + m])}</span></button>`).join('');
  const c = calc();
  $('#sum').innerHTML = `<div class="ln"><span>Товар</span><b>${esc(c.label)}</b></div>` +
    (c.pct ? `<div class="ln"><span>Сума без знижки</span><b>${money(c.base)}</b></div><div class="ln disc"><span>Промокод ${esc(S.promo.code)} (−${c.pct}%)</span><b>−${money(c.disc)}</b></div>` : '') +
    `<div class="tot"><span>До сплати</span><strong>${money(c.fin)}</strong></div>`;
  $('#toAdmin').hidden = !S.admin;
}
function setMsg(t, cls) { const m = $('#pmsg'); m.textContent = t || ''; m.className = 'hint ' + (cls || ''); }

function initShop() {
  if (user && user.username) $('#rcp').value = '@' + user.username;
  $('#seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.cat = b.dataset.cat; hap();
    $$('#seg button').forEach(x => x.classList.toggle('on', x === b));
    $('#starsBox').hidden = S.cat !== 'stars'; $('#premBox').hidden = S.cat !== 'premium'; render(); };
  $('#packs').onclick = e => { const b = e.target.closest('.pack'); if (!b) return; S.pack = +b.dataset.n; S.custom = ''; $('#custom').value = ''; hap(); render(); };
  $('#months').onclick = e => { const b = e.target.closest('.pack'); if (!b) return; S.months = +b.dataset.m; hap(); render(); };
  $('#custom').oninput = e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); e.target.value = v; S.custom = v; render(); };
  $('#self').onclick = () => { if (user && user.username) { $('#rcp').value = '@' + user.username; hap(); } else toast('У вашому акаунті немає @username. Вкажіть його вручну.', 'bad'); };
  $('#promo').oninput = () => { if (S.promo) { S.promo = null; setMsg(''); render(); } };
  $('#apply').onclick = applyPromo;
  $('#order').onclick = placeOrder;
  $('#support').onclick = () => { const u = 'https://t.me/' + S.cfg.support_username; tg && tg.openTelegramLink ? tg.openTelegramLink(u) : window.open(u, '_blank'); };
  $('#toAdmin').onclick = () => { $('#shop').hidden = true; $('#admin').hidden = false; scrollTo(0, 0); tab('orders'); };
  $('#toShop').onclick = () => { $('#admin').hidden = true; $('#shop').hidden = false; render(); };
  $('#tabs').onclick = e => { const b = e.target.closest('.tab'); if (b) tab(b.dataset.tab); };
  $('#adminBody').onclick = adminClick;
  render();
}

async function applyPromo() {
  const code = $('#promo').value.trim().toUpperCase();
  if (!code) return setMsg('Введіть промокод', 'bad');
  $('#apply').disabled = true; setMsg('Перевіряємо…');
  const d = await post('/api/promo/validate', { code });
  $('#apply').disabled = false;
  if (d.ok) { S.promo = { code: d.code || code, percent: d.percent }; setMsg('Знижка ' + d.percent + '% застосована', 'ok'); hap(); }
  else { S.promo = null; setMsg(d.error || 'Промокод недійсний', 'bad'); }
  render();
}

function toBot(id) {
  if (tg && typeof tg.sendData === 'function' && !(tg.initDataUnsafe && tg.initDataUnsafe.query_id)) {
    try { tg.sendData(JSON.stringify({ order_id: id })); return; } catch (e) {}
  }
  const bu = S.cfg.bot_username;
  if (!bu) { toast('Замовлення №' + id + ' створено. Відкрийте чат із ботом.', 'ok'); return; }
  const url = 'https://t.me/' + bu + '?start=order_' + id;
  if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
  setTimeout(() => { try { tg && tg.close(); } catch (e) {} }, 450);
}

async function placeOrder() {
  if (S.busy) return;
  const rec = $('#rcp').value.trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{5,32}$/.test(rec)) return toast('Вкажіть коректний @username отримувача (5–32 символи)', 'bad');
  const c = calc();
  if (S.cat === 'stars' && !qty()) return toast('Кількість зірок: від 50 до 100 000', 'bad');
  S.busy = true; const btn = $('#order'); btn.disabled = true; btn.textContent = 'Оформлюємо…';
  const d = await post('/api/orders', {
    product: S.cat, qty: S.cat === 'stars' ? qty() : S.months, recipient: rec, promo: S.promo ? S.promo.code : '', amount: c.fin,
    user: user ? { id: user.id, username: user.username || '', first_name: user.first_name || '' } : null });
  S.busy = false; btn.disabled = false; btn.textContent = 'Оформити замовлення';
  if (!d.ok) return toast(d.error || 'Не вдалося створити замовлення', 'bad');
  $('#doneT').textContent = 'Замовлення №' + d.order_id + ' створено';
  $('#doneP').textContent = 'До сплати ' + money(d.final_price) + '. Переходимо в чат із ботом…';
  $('#done').hidden = false; hap('heavy');
  await sleep(900); toBot(d.order_id);
  setTimeout(() => { $('#done').hidden = true; }, 2500);
}

/* ---------- адмін-панель ---------- */
const errH = d => `<p class="hint bad">${esc(d.error || 'Помилка')}</p>`;
const empty = t => `<p class="muted">${t}</p>`;
async function tab(name) {
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  const box = $('#adminBody'); box.innerHTML = empty('Завантаження…');
  let d, html;
  if (name === 'orders') {
    d = await api('/api/admin/orders'); if (!d.ok) return box.innerHTML = errH(d);
    html = d.orders.map(o => `<div class="item"><div class="top"><b>Замовлення №${o.id}</b><span class="chip ${esc(o.status)}">${esc(ST[o.status] || o.status)}</span></div>
      <div>${o.product === 'stars' ? num(o.qty) + ' зірок' : 'Premium, ' + o.qty + ' міс.'} для @${esc(o.recipient)}</div>
      <div class="muted">${money(o.final_price)}${o.promo ? ', промокод ' + esc(o.promo) + ' −' + o.percent + '%' : ''}</div>
      <div class="muted">Покупець: ${o.username ? '@' + esc(o.username) : esc(o.name || '—')} (ID ${o.user_id}), ${new Date(o.created * 1000).toLocaleString('uk-UA')}</div>
      <div class="row">${o.status !== 'done' ? `<button class="ghost" data-act="ost" data-id="${o.id}" data-st="done">Виконано</button>` : ''}${o.status !== 'cancelled' ? `<button class="ghost danger" data-act="ost" data-id="${o.id}" data-st="cancelled">Скасувати</button>` : ''}</div></div>`).join('');
    box.innerHTML = html || empty('Замовлень поки немає. Нові зʼявляться тут одразу після оформлення.');
  } else if (name === 'promos') {
    d = await api('/api/admin/promos'); if (!d.ok) return box.innerHTML = errH(d);
    box.innerHTML = `<div class="form"><input id="pc" placeholder="Код, наприклад STAR10" autocapitalize="characters"><input id="pp" inputmode="numeric" placeholder="Знижка, %"><input id="pm" inputmode="numeric" placeholder="Ліміт використань (0 — без ліміту)"><button class="cta" data-act="pnew">Створити промокод</button></div>` +
      (d.promos.map(p => `<div class="item"><div class="top"><b>${esc(p.code)}</b><span class="chip new">−${p.percent}%</span></div><div class="muted">Використано ${p.used}${p.max_uses ? ' із ' + p.max_uses : ', без ліміту'}</div><div class="row"><button class="ghost danger" data-act="pdel" data-code="${esc(p.code)}">Видалити</button></div></div>`).join('') || empty('Промокодів ще немає. Створіть перший у формі вище.'));
  } else if (name === 'bans') {
    d = await api('/api/admin/bans'); if (!d.ok) return box.innerHTML = errH(d);
    box.innerHTML = `<div class="form"><input id="bt" placeholder="@username або ID користувача" autocapitalize="off"><button class="cta" data-act="bnew">Заблокувати</button></div>` +
      (d.bans.map(b => `<div class="item"><div class="top"><b>${b.username ? '@' + esc(b.username) : 'ID ' + b.user_id}</b><span class="muted">${new Date(b.created * 1000).toLocaleDateString('uk-UA')}</span></div><div class="row"><button class="ghost" data-act="bdel" data-id="${b.id}">Розблокувати</button></div></div>`).join('') || empty('Список блокувань порожній.'));
  } else {
    box.innerHTML = `<div class="form"><label>Ціна за 1 зірку, ₴</label><input id="f0" inputmode="decimal" value="${S.cfg.price_per_star}">` +
      MONTHS.map((m, i) => `<label>Premium на ${m} міс., ₴</label><input id="f${i + 1}" inputmode="decimal" value="${S.cfg['prem_' + m]}">`).join('') +
      `<button class="cta" data-act="psave">Зберегти ціни</button></div>`;
  }
}

async function adminClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, v = id => ($('#' + id) || {}).value || '';
  let d;
  b.disabled = true;
  if (a === 'ost') { d = await post('/api/admin/orders/status', { order_id: +b.dataset.id, status: b.dataset.st }); if (d.ok) toast('Статус оновлено', 'ok'); }
  else if (a === 'pnew') { d = await post('/api/admin/promos', { code: v('pc'), percent: v('pp'), max_uses: v('pm') || 0 }); if (d.ok) toast('Промокод збережено', 'ok'); }
  else if (a === 'pdel') { d = await post('/api/admin/promos/delete', { code: b.dataset.code }); if (d.ok) toast('Промокод видалено', 'ok'); }
  else if (a === 'bnew') { d = await post('/api/admin/bans', { target: v('bt') }); if (d.ok) toast('Користувача заблоковано', 'ok'); }
  else if (a === 'bdel') { d = await post('/api/admin/bans/remove', { id: +b.dataset.id }); if (d.ok) toast('Користувача розблоковано', 'ok'); }
  else if (a === 'psave') {
    d = await post('/api/admin/prices', { price_per_star: v('f0'), prem_3: v('f1'), prem_6: v('f2'), prem_12: v('f3') });
    if (d.ok) { applyCfg(d); toast('Ціни збережено', 'ok'); }
  }
  b.disabled = false;
  if (!d.ok) return toast(d.error || 'Помилка', 'bad');
  if (a !== 'psave') tab($('.tab.on').dataset.tab);
}

boot();
