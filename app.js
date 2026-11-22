(() => {
"use strict";
const tg = window.Telegram && Telegram.WebApp;
const { API_URL, BOT_USERNAME } = window.AROX;
const $ = s => document.querySelector(s), app = $("#app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => { n = Math.round(n * 100) / 100; return Number.isInteger(n) ? String(n) : n.toFixed(2); };
const ST = { pending: "⏳ Очікує оплати", review: "🔎 Чек на перевірці", confirmed: "✅ Підтверджено", done: "🚀 Виконано", rejected: "❌ Відхилено", cancelled: "🚫 Скасовано" };
const S = { user: null, cfg: null, tab: "stars", qty: 100, months: 3, self: true, recipient: "", promo: "", promoOk: null, busy: false, adm: "orders" };
let initData = "";
const kbTok = (() => { try { return new URLSearchParams(location.search).get("kb") || ""; } catch { return ""; } })();

// --- Зоряне небо
(() => { const c = $("#sky"), x = c.getContext("2d"); let w, h, st = [];
  const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; st = Array.from({ length: Math.min(110, w * h / 7000 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .2, s: Math.random() * .25 + .03, p: Math.random() * 6 })); };
  const loop = t => { x.clearRect(0, 0, w, h); for (const s of st) { s.y += s.s; if (s.y > h) s.y = 0; x.globalAlpha = .35 + .65 * Math.abs(Math.sin(t / 1100 + s.p)); x.fillStyle = s.r > 1.1 ? "#ffc94d" : "#cfe8ff"; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.3); x.fill(); } requestAnimationFrame(loop); };
  addEventListener("resize", rs); rs(); requestAnimationFrame(loop); })();

function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
function openLink(u) { if (tg && /^https:\/\/t\.me\//.test(u)) tg.openTelegramLink(u); else if (tg) tg.openLink(u); else window.open(u, "_blank"); }

async function api(path, body) {
  const o = { headers: { Authorization: initData ? "tma " + initData : "kb " + kbTok } };
  if (body !== undefined) { o.method = "POST"; o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(body); }
  let r; try { r = await fetch(API_URL + path, o); } catch { throw Object.assign(new Error("Сервер недоступний. Спробуйте за хвилину."), { net: true }); }
  let d = {}; try { d = await r.json(); } catch {}
  if (!r.ok || d.ok === false) throw Object.assign(new Error(d.error || "Помилка запиту"), { status: r.status });
  return d;
}

// --- Стабільне отримання initData (працює для inline-кнопки, меню, BotFather Main App, посилань)
async function getInitData() {
  for (let i = 0; i < 25; i++) {
    let d = tg && tg.initData;
    if (!d) { try { d = new URLSearchParams(location.hash.slice(1)).get("tgWebAppData") || ""; } catch {} }
    if (d) { try { sessionStorage.setItem("arox_init", d); } catch {} return d; }
    await new Promise(r => setTimeout(r, 120));
  }
  return "";
}

function fatal(msg, retry) {
  app.innerHTML = `<div class="fatal"><div class="logo">✦</div><h1>Arox Stars</h1><p>${esc(msg)}</p>
  ${retry ? '<button class="btn gold" id="rt">Повторити</button>' : ""}
  ${BOT_USERNAME ? `<button class="btn ghost" id="ob">Відкрити бота</button>` : ""}</div>`;
  $("#rt") && ($("#rt").onclick = boot); $("#ob") && ($("#ob").onclick = () => openLink(`https://t.me/${BOT_USERNAME}`));
}

async function boot() {
  app.innerHTML = '<div class="splash"><div class="logo">✦</div><p>Завантаження…</p></div>';
  if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor("#07060d"); tg.setBackgroundColor("#07060d"); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch {} }
  initData = (kbTok && !(tg && tg.initData)) ? "" : await getInitData();
  if (!initData && !kbTok) return fatal("Не вдалося отримати дані акаунта. Відкрийте Mini App у Telegram через бота.", true);
  try { const d = await api("/api/bootstrap"); S.user = d.user; S.cfg = d.config; }
  catch (e) { return fatal(e.status === 401 ? e.message : e.status === 403 ? "Доступ заборонено." : e.message, true); }
  render();
}

const price = () => S.tab === "stars" ? S.qty * S.cfg.star_price : S.cfg.premium[S.months];
const qtyValid = () => S.tab === "premium" || (Number.isInteger(S.qty) && S.qty >= S.cfg.min && S.qty <= S.cfg.max);
const discount = () => S.promoOk ? Math.round(price() * S.promoOk.percent) / 100 : 0;
const total = () => { const t = price() - discount(); return t > 0 ? Math.round(t * 100) / 100 : 1; };

function render() {
  const u = S.user, c = S.cfg, name = u.name || u.username || "Користувач";
  const tabs = [["stars", "⭐ Stars"], ["premium", "💎 Premium"]].concat(u.is_admin ? [["admin", "🛠 Адмін"]] : []);
  app.innerHTML = `
  <div class="top"><div class="ava">${u.photo_url ? `<img src="${esc(u.photo_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : esc(name[0].toUpperCase())}</div>
  <div class="who"><b>${esc(name)}</b><small>${u.username ? "@" + esc(u.username) : "ID " + u.id}</small></div>${u.is_admin ? '<span class="badge">ADMIN</span>' : ""}</div>
  <h1>Arox Stars</h1><p class="sub">Telegram Stars та Premium — миттєво й вигідно.</p>
  <div class="tabs">${tabs.map(t => `<button class="tab ${S.tab === t[0] ? "on" : ""}" data-tab="${t[0]}">${t[1]}</button>`).join("")}</div>
  <div id="view"></div>
  <div class="row" style="margin-top:4px"><button class="btn ghost" style="flex:1" id="sup">💬 Підтримка</button>${c.main_site ? '<button class="btn ghost" style="flex:1" id="site">🌐 Головний сайт</button>' : ""}</div>`;
  app.querySelectorAll(".tab").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; render(); });
  $("#sup").onclick = () => openLink(c.support_url); if ($("#site")) $("#site").onclick = () => openLink(c.main_site);
  S.tab === "admin" ? adminView() : shopView();
}

function shopView() {
  const c = S.cfg, v = $("#view"), st = S.tab === "stars";
  const packs = [50, 100, 250, 500, 1000, 2500];
  v.innerHTML = `<div class="card"><h3>${st ? "Кількість зірок" : "Тривалість підписки"}</h3>
  ${st ? `<div class="grid">${packs.map(p => `<button class="pack ${S.qty === p ? "on" : ""}" data-q="${p}"><b>${p}</b><span>${fmt(p * c.star_price)} грн</span></button>`).join("")}</div>
    <div class="row"><input id="qty" inputmode="numeric" pattern="[0-9]*" placeholder="Своя кількість (${c.min}–${c.max})" value="${packs.includes(S.qty) ? "" : (S.qty || "")}"></div><div class="hint" id="qh"></div>`
  : `<div class="grid">${[3, 6, 12].map(m => `<button class="pack prem ${S.months === m ? "on" : ""}" data-m="${m}"><b>${m} міс.</b><em>${fmt(c.premium[m])} грн</em></button>`).join("")}</div>`}</div>
  <div class="card"><h3>Отримувач</h3><div class="row" style="margin:0"><div class="atw"><span>@</span><input id="rcp" placeholder="username" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="32" value="${esc(S.self ? (S.user.username || "") : S.recipient)}"></div>
  <button class="btn ${S.self ? "gold" : ""}" id="me">Собі</button></div>${S.self && !S.user.username ? '<div class="hint">У вас немає @username — замовлення оформиться на ваш ID.</div>' : ""}</div>
  <div class="card"><h3>Промокод</h3><div class="row" style="margin:0"><input id="pr" placeholder="PROMO" autocapitalize="characters" value="${esc(S.promo)}" ${S.promoOk ? "readonly" : ""}>
  <button class="btn" id="pa">${S.promoOk ? "Скасувати" : "Застосувати"}</button></div><div class="hint ${S.promoOk ? "ok" : ""}" id="ph">${S.promoOk ? `Знижка ${fmt(S.promoOk.percent)}% застосована` : ""}</div></div>
  <div class="card sum"><div><span>Товар</span><span>${st ? S.qty + " ⭐" : "Premium " + S.months + " міс."}</span></div><div><span>Ціна</span><span>${fmt(price())} грн</span></div>
  ${S.promoOk ? `<div class="d"><span>Знижка</span><span>−${fmt(discount())} грн</span></div>` : ""}<div class="t"><span>До сплати</span><span>${fmt(total())} грн</span></div>
  <button class="btn gold block" id="go" ${qtyValid() && !S.busy ? "" : "disabled"}>${S.busy ? "Оформлення…" : "Оформити замовлення"}</button></div>`;
  v.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { S.qty = +b.dataset.q; reprice(); });
  v.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { S.months = +b.dataset.m; reprice(); });
  const qi = $("#qty"); if (qi) qi.oninput = () => { const t = qi.value.replace(/\D/g, ""); qi.value = t; S.qty = t ? +t : 0; const h = $("#qh"), bad = !qtyValid(); h.className = "hint" + (bad ? " err" : ""); h.textContent = bad ? `Від ${c.min} до ${c.max} зірок, лише ціле число` : ""; reprice(true); };
  $("#rcp").onfocus = e => { if (S.self) { e.target.value = ""; S.self = false; S.recipient = ""; $("#me").classList.remove("gold"); } };
  $("#rcp").oninput = e => { const t = e.target.value.replace(/[^A-Za-z0-9_]/g, ""); if (t !== e.target.value) e.target.value = t; S.recipient = t; S.self = false; $("#me").classList.remove("gold"); };
  $("#me").onclick = () => { S.self = true; S.recipient = ""; shopView(); };
  $("#pa").onclick = promoToggle; $("#go").onclick = order;
}
async function reprice(keepFocus) {
  if (S.promoOk) await checkPromo(true);
  if (keepFocus) { const s = document.querySelector(".sum"); if (s) { const g = s.querySelector("#go"); const act = document.activeElement.id, val = document.activeElement.value, pos = document.activeElement.selectionStart; shopView(); const el = $("#" + act); if (el) { el.focus(); el.value = val; try { el.setSelectionRange(pos, pos); } catch {} } } }
  else shopView();
}
async function checkPromo(silent) {
  try { const d = await api("/api/promo/check", { kind: S.tab, qty: S.tab === "stars" ? S.qty : S.months, promo: S.promo }); S.promoOk = { percent: d.percent }; return true; }
  catch (e) { S.promoOk = null; if (!silent) { const h = $("#ph"); h.className = "hint err"; h.textContent = e.message; } else toast(e.message); return false; }
}
async function promoToggle() {
  if (S.promoOk) { S.promoOk = null; S.promo = ""; return shopView(); }
  S.promo = $("#pr").value.trim().toUpperCase(); if (!S.promo) return;
  if (!qtyValid()) return toast("Спершу вкажіть коректну кількість");
  if (await checkPromo(false)) { shopView(); tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred("success"); }
}
async function order() {
  if (S.busy || !qtyValid()) return;
  let rc = S.self ? "self" : "@" + S.recipient;
  if (!S.self && !/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(rc)) return toast("Вкажіть отримувача: @username");
  S.busy = true; shopView();
  try {
    const d = await api("/api/order", { kind: S.tab, qty: S.tab === "stars" ? S.qty : S.months, recipient: rc, promo: S.promoOk ? S.promo : "" });
    tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred("success");
    toast(`Замовлення #${d.order.id} створено`);
    const bot = S.cfg.bot || BOT_USERNAME, link = `https://t.me/${bot}?start=order_${d.order.id}`;
    S.busy = false; S.promoOk = null; S.promo = "";
    // перехід у чат із ботом (працює й при запуску через BotFather), далі закриваємо Mini App
    setTimeout(() => { if (bot) openLink(link); setTimeout(() => tg && tg.close(), 400); }, 700);
    shopView();
  } catch (e) { S.busy = false; toast(e.message); shopView(); }
}

// --- Адмін-панель
function adminView() {
  const v = $("#view"), tabs = [["orders", "Замовлення"], ["promos", "Промокоди"], ["bans", "Блокування"], ["prices", "Ціни"]];
  v.innerHTML = `<div class="sec">${tabs.map(t => `<button class="btn sm ${S.adm === t[0] ? "on" : ""}" data-a="${t[0]}">${t[1]}</button>`).join("")}</div><div id="av"></div>`;
  v.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { S.adm = b.dataset.a; adminView(); });
  ({ orders: aOrders, promos: aPromos, bans: aBans, prices: aPrices })[S.adm]();
}
const fail = e => toast(e.message);
async function aOrders() {
  const av = $("#av"); av.innerHTML = '<div class="card">Завантаження…</div>';
  try {
    const f = S.filter || "", d = await api("/api/admin/orders" + (f ? "?status=" + f : ""));
    av.innerHTML = `<div class="card"><select id="fl"><option value="">Усі статуси</option>${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${f === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    ${d.orders.map(o => `<div class="ord"><div><b>#${o.id}</b> · ${o.kind === "stars" ? o.qty + " ⭐" : "Premium " + o.qty + " міс."} · <b>${fmt(o.total)} грн</b></div>
    <div>Отримувач: ${esc(o.recipient)} · Клієнт: ${esc(o.name || o.user_id)} ${o.username ? "@" + esc(o.username) : ""}</div><div class="st">${ST[o.status]}${o.promo ? " · " + esc(o.promo) : ""}</div>
    <div class="acts">${["confirmed", "done", "rejected", "cancelled", "pending"].filter(s => s !== o.status).map(s => `<button class="btn sm ${s === "rejected" || s === "cancelled" ? "bad" : ""}" data-o="${o.id}" data-s="${s}">${ST[s]}</button>`).join("")}<button class="btn sm bad" data-del="${o.id}">🗑 Видалити</button></div></div>`).join("") || "<p class=hint>Замовлень немає</p>"}</div>`;
    $("#fl").onchange = e => { S.filter = e.target.value; aOrders(); };
    av.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      const id = +b.dataset.del, q = `Видалити замовлення #${id} назавжди?`;
      const go = async () => { try { await api("/api/admin/order/delete", { id }); toast("Замовлення видалено"); aOrders(); } catch (e) { fail(e); } };
      tg && tg.showConfirm ? tg.showConfirm(q, ok => ok && go()) : (confirm(q) && go());
    });
    av.querySelectorAll("[data-o]").forEach(b => b.onclick = async () => { try { await api("/api/admin/order/status", { id: +b.dataset.o, status: b.dataset.s }); toast("Статус оновлено, клієнта сповіщено"); aOrders(); } catch (e) { fail(e); } });
  } catch (e) { av.innerHTML = ""; fail(e); }
}
async function aPromos() {
  const av = $("#av");
  try {
    const d = await api("/api/admin/promos");
    av.innerHTML = `<div class="card"><h3>Новий промокод</h3><input id="pc" placeholder="КОД" autocapitalize="characters"><div class="row"><input id="pp" inputmode="decimal" placeholder="Знижка, %"><input id="pl" inputmode="numeric" placeholder="Ліміт (0 = безліміт)"></div><button class="btn gold block" id="pn" style="font-size:14px;padding:13px">Створити</button></div>
    <div class="card">${d.promos.map(p => `<div class="ord"><div><b>${esc(p.code)}</b> · −${fmt(p.percent)}% · використано ${p.used}/${p.max_uses || "∞"}</div><div class="acts"><button class="btn sm bad" data-d="${esc(p.code)}">Видалити</button></div></div>`).join("") || "<p class=hint>Промокодів немає</p>"}</div>`;
    $("#pn").onclick = async () => { try { const r = await api("/api/admin/promo", { code: $("#pc").value, percent: $("#pp").value.replace(",", "."), max_uses: $("#pl").value }); toast(r.message); aPromos(); } catch (e) { fail(e); } };
    av.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => { try { await api("/api/admin/promo/delete", { code: b.dataset.d }); aPromos(); } catch (e) { fail(e); } });
  } catch (e) { fail(e); }
}
async function aBans() {
  const av = $("#av");
  try {
    const d = await api("/api/admin/bans");
    av.innerHTML = `<div class="card"><h3>Бан / розбан</h3><input id="bt" placeholder="@username або ID" autocapitalize="off"><div class="row"><button class="btn bad" style="flex:1" id="b1">Заблокувати</button><button class="btn" style="flex:1" id="b2">Розблокувати</button></div></div>
    <div class="card"><h3>Заблоковані</h3>${d.bans.map(b => `<div class="hint">${esc(b)}</div>`).join("") || "<p class=hint>Список порожній</p>"}</div>`;
    const go = ban => async () => { try { const r = await api("/api/admin/ban", { target: $("#bt").value, ban }); toast(r.message); aBans(); } catch (e) { fail(e); } };
    $("#b1").onclick = go(true); $("#b2").onclick = go(false);
  } catch (e) { fail(e); }
}
async function aPrices() {
  const av = $("#av");
  try {
    const s = (await api("/api/admin/settings")).settings;
    av.innerHTML = `<div class="card"><h3>Ціни (грн)</h3><label class="hint">1 ⭐</label><input id="s0" inputmode="decimal" value="${esc(s.star_price)}">
    <label class="hint">Premium 3 міс.</label><input id="s3" inputmode="decimal" value="${esc(s.p3)}"><label class="hint">Premium 6 міс.</label><input id="s6" inputmode="decimal" value="${esc(s.p6)}">
    <label class="hint">Premium 12 міс.</label><input id="s12" inputmode="decimal" value="${esc(s.p12)}"><label class="hint">Реквізити оплати</label><textarea id="sp" rows="4">${esc(s.pay_details)}</textarea>
    <button class="btn gold block" id="sv" style="font-size:14px;padding:13px">Зберегти</button></div>`;
    $("#sv").onclick = async () => { const n = id => $(id).value.replace(",", ".");
      try { const r = await api("/api/admin/settings", { star_price: n("#s0"), p3: n("#s3"), p6: n("#s6"), p12: n("#s12"), pay_details: $("#sp").value }); S.cfg = r.config; toast("Збережено"); } catch (e) { fail(e); } };
  } catch (e) { fail(e); }
}
boot();
})();
