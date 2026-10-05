(() => {
  const $ = (id) => document.getElementById(id);
  const DAY_MS = 864e5;
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const VIBES = [
    "Monday. Coffee first, opinions later. ☕",          // Mon
    "Tuesday: the week finds its rhythm. 🎧",             // Tue
    "Midweek. The hump is officially being climbed. 🐪",  // Wed
    "Thursday: Friday's cooler older sibling. 😎",        // Thu
    "It's Friday. Ascend. ✨",                            // Fri
    "Weekend mode: ON. Touch grass. 🌱",                 // Sat
    "Sunday reset. Hydrate, plan, vibe. 🧘",              // Sun
  ];

  /* ---- date helpers ---- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const mondayIndex = (d) => (d.getDay() + 6) % 7; // Mon=0 … Sun=6

  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
    const isoYear = d.getUTCFullYear();
    const firstThu = new Date(Date.UTC(isoYear, 0, 4));
    const week = 1 + Math.round(((d - firstThu) / DAY_MS - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return { week, year: isoYear };
  }
  const weeksInIsoYear = (y) => isoWeek(new Date(y, 11, 28)).week; // Dec 28 is always in the last ISO week
  const daysInYear = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
  const fmt = (d, o) => d.toLocaleDateString(undefined, o);
  const pad = (n) => String(n).padStart(2, "0");

  /* ---- state ---- */
  let offset = 0; // weeks relative to the current one
  let lastWeekKey = "";

  /* ---- theme + style ---- */
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.dataset.theme = saved;
    else if (matchMedia("(prefers-color-scheme: light)").matches) root.dataset.theme = "light";
  } catch (_) {}
  function syncLabels() {
    const clear = root.dataset.style === "clear";
    $("styleTxt").textContent = clear ? "Colorful view" : "Simple view";
    $("styleBtn").setAttribute("aria-pressed", clear);
    $("themeTxt").textContent = root.dataset.theme === "dark" ? "Light mode" : "Dark mode";
    $("themeBtn").setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  try {
    const st = localStorage.getItem("style");
    root.dataset.style = st || (matchMedia("(prefers-contrast: more)").matches ? "clear" : "vibe");
  } catch (_) { root.dataset.style = "vibe"; }
  $("themeBtn").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (_) {}
    syncLabels();
  });
  $("styleBtn").addEventListener("click", () => {
    const next = root.dataset.style === "clear" ? "vibe" : "clear";
    root.dataset.style = next;
    try { localStorage.setItem("style", next); } catch (_) {}
    syncLabels();
  });
  syncLabels();

  /* ---- toast ---- */
  let toastT;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* ---- favicon with live week number ---- */
  function setFavicon(week) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='18' fill='#b6ff3c'/><text x='32' y='44' font-family='Arial Black,sans-serif' font-weight='900' font-size='${week > 9 ? 34 : 42}' text-anchor='middle' fill='#12160a'>${week}</text></svg>`;
    $("favicon").href = "data:image/svg+xml," + encodeURIComponent(svg);
  }

  /* ---- week strip ---- */
  function renderStrip(monday, today) {
    $("strip").innerHTML = DAYS.map((name, i) => {
      const d = addDays(monday, i);
      const cls = ["day", i >= 5 ? "weekend" : "", +d === +today ? "today" : "", d < today ? "past" : ""].join(" ");
      return `<div class="${cls}" ${+d === +today ? 'aria-current="date"' : ""}><span>${name}</span><strong>${d.getDate()}</strong>${+d === +today ? "<em>Today</em>" : ""}</div>`;
    }).join("");
  }

  /* ---- hero (depends on offset) ---- */
  function renderHero(now) {
    const today = startOfDay(now);
    const monday = addDays(today, -mondayIndex(today) + offset * 7);
    const sunday = addDays(monday, 6);
    const { week, year } = isoWeek(monday);
    const total = weeksInIsoYear(year);
    const key = `${year}-${week}`;

    if (key !== lastWeekKey) {
      lastWeekKey = key;
      const el = $("weekNum");
      el.textContent = week;
      el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
      $("range").textContent = `${fmt(monday, { month: "short", day: "numeric" })} – ${fmt(sunday, { month: "short", day: "numeric", year: "numeric" })} · of ${total}`;
      $("copyTxt").textContent = `Copy “W${pad(week)} · ${year}”`;
      document.title = `Week ${week} · WeekNow`;
      setFavicon(week);
      renderStrip(monday, today);
    }
    $("todayLine").textContent = "Today is " + fmt(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("relLabel").textContent = offset === 0 ? "It's currently" : offset > 0 ? `${offset} wk${offset > 1 ? "s" : ""} from now:` : `${-offset} wk${offset < -1 ? "s" : ""} ago:`;
    $("todayBtn").hidden = offset === 0;
    $("vibe").textContent = offset === 0 ? VIBES[mondayIndex(today)] : "Time travelling 🕰️ — hit “back” to return to now.";
  }

  /* ---- live stats ---- */
  function renderStats(now) {
    const y = now.getFullYear();
    const diy = daysInYear(y);
    const doy = Math.round((startOfDay(now) - new Date(y, 0, 1)) / DAY_MS) + 1;
    const yearPct = ((now - new Date(y, 0, 1)) / (new Date(y + 1, 0, 1) - new Date(y, 0, 1))) * 100;

    $("yearPct").textContent = Math.floor(yearPct);
    $("yearBar").firstElementChild.style.width = yearPct + "%";
    $("yearBar").setAttribute("aria-valuenow", Math.floor(yearPct));
    $("yearSub").textContent = `${diy - doy} days until ${y + 1}. Plenty of plot left.`;

    $("doy").textContent = doy;
    $("diy").textContent = diy;
    $("doySub").textContent = diy === 366 ? "Leap year bonus day 🐸" : "Not a leap year";

    const cur = isoWeek(now);
    $("weeksLeft").textContent = Math.max(0, weeksInIsoYear(cur.year) - cur.week);

    const q = Math.floor(now.getMonth() / 3);
    $("quarter").textContent = "Q" + (q + 1);
    $("qDots").innerHTML = [0, 1, 2, 3].map((i) => {
      if (i < q) return "<i class='on'></i>";
      if (i > q) return "<i></i>";
      const qs = new Date(y, q * 3, 1), qe = new Date(y, q * 3 + 3, 1);
      return `<i class='now' style='--p:${((now - qs) / (qe - qs)) * 100}%'></i>`;
    }).join("");

    const ms = new Date(y, now.getMonth(), 1), me = new Date(y, now.getMonth() + 1, 1);
    const mPct = ((now - ms) / (me - ms)) * 100;
    $("monthName").textContent = fmt(now, { month: "long" });
    $("monthPct").textContent = Math.floor(mPct);
    $("monthBar").firstElementChild.style.width = mPct + "%";
    $("monthSub").textContent = `${Math.round((me - startOfDay(now)) / DAY_MS) - 1} days left this month`;

    // weekend countdown (Saturday 00:00) or "weekend ends" countdown
    const idx = mondayIndex(now);
    const isWeekend = idx >= 5;
    const target = isWeekend ? addDays(startOfDay(now), 7 - idx) : addDays(startOfDay(now), 5 - idx);
    let s = Math.max(0, Math.floor((target - now) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    $("weekend").textContent = `${d}d ${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    $("wkTitle").textContent = isWeekend ? "Weekend ends in" : "Weekend loads in";
    $("weekendSub").textContent = isWeekend ? "Enjoy it while it lasts 🛋️" : "Hang in there. Almost.";

    $("clock").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  function staticInfo() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local";
    const off = -new Date().getTimezoneOffset();
    $("tz").textContent = tz.replace(/_/g, " ");
    $("utc").textContent = `UTC${off >= 0 ? "+" : "−"}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  }

  function tick() {
    const now = new Date();
    renderHero(now);
    renderStats(now);
  }

  /* ---- interactions ---- */
  const go = (n) => { offset = n === 0 ? 0 : offset + n; tick(); };
  $("prev").addEventListener("click", () => go(-1));
  $("next").addEventListener("click", () => go(1));
  $("todayBtn").addEventListener("click", () => go(0));
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "Escape") go(0);
  });
  $("copyBtn").addEventListener("click", async () => {
    const txt = $("copyTxt").textContent.replace(/^Copy “|”$/g, "");
    try { await navigator.clipboard.writeText(txt); toast(`Copied ${txt} ✓`); }
    catch (_) { toast("Couldn't copy — long-press to select instead"); }
  });

  document.querySelectorAll(".card").forEach((c, i) => c.style.setProperty("--i", i));
  staticInfo();
  tick();
  setInterval(tick, 1000);
})();
