// ===== 状態管理 =====
const STORE_KEY = 'senro-study-v1';
const defaultState = () => ({ records: {}, plan: {}, examDate: '', log: {}, calc: { ok: 0, total: 0 } });
let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    return s ? { ...defaultState(), ...s } : defaultState();
  } catch { return defaultState(); }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* 保存不可でも動作は継続 */ }
}
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
function logAnswer(ok) {
  const t = today();
  const l = state.log[t] || { n: 0, ok: 0 };
  l.n++; if (ok) l.ok++;
  state.log[t] = l;
}

const $ = (sel) => document.querySelector(sel);
const view = () => $('#view');
const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || '';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ===== ルーティング =====
const routes = { home: renderHome, notes: renderNotes, quiz: renderQuizMenu, calc: renderCalcMenu, stats: renderStats };
function go() {
  const [name] = (location.hash.slice(1) || 'home').split('/');
  (routes[name] || renderHome)();
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === (routes[name] ? name : 'home')));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);

// ===== ホーム（試験日・学習プラン） =====
function daysLeft() {
  if (!state.examDate) return null;
  const ms = new Date(state.examDate + 'T00:00:00') - new Date(today() + 'T00:00:00');
  return Math.round(ms / 86400000);
}
function phaseRanges() {
  if (!state.examDate) return null;
  const start = new Date(today() + 'T00:00:00');
  const end = new Date(state.examDate + 'T00:00:00');
  const days = Math.max(0, Math.round((end - start) / 86400000));
  // 進行中フェーズ以降を残り日数で割り振る（完了済みは対象外）
  const pending = PLAN.filter((p) => !p.tasks.every((t) => state.plan[t.id]));
  const total = pending.reduce((s, p) => s + p.weight, 0) || 1;
  const out = {};
  let cur = 0;
  pending.forEach((p, i) => {
    const len = i === pending.length - 1 ? days - cur : Math.max(1, Math.round(days * p.weight / total));
    const s = new Date(start); s.setDate(s.getDate() + cur);
    const e = new Date(start); e.setDate(e.getDate() + Math.max(cur, cur + len - 1));
    out[p.id] = { s, e, len };
    cur += len;
  });
  return out;
}
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;

function renderHome() {
  const left = daysLeft();
  const ranges = phaseRanges();
  const nowPhase = PLAN.find((p) => !p.tasks.every((t) => state.plan[t.id]));
  const todayLog = state.log[today()] || { n: 0, ok: 0 };
  const allTasks = PLAN.flatMap((p) => p.tasks);
  const doneTasks = allTasks.filter((t) => state.plan[t.id]).length;
  const answered = Object.keys(state.records).length;

  view().innerHTML = `
  <section class="card hero">
    <div class="hero-row">
      <div>
        <div class="muted small">試験日</div>
        <input type="date" id="examDate" value="${state.examDate}" aria-label="試験日">
      </div>
      <div class="count">${left === null ? '<span class="muted small">試験日を設定すると<br>プランに日付が入ります</span>' : left >= 0 ? `あと <b>${left}</b> 日` : '試験日を過ぎました'}</div>
    </div>
    <div class="kpis">
      <div><b>${todayLog.n}</b><span>今日の解答数</span></div>
      <div><b>${answered}/${QUESTIONS.length}</b><span>学習済み問題</span></div>
      <div><b>${doneTasks}/${allTasks.length}</b><span>プラン達成</span></div>
    </div>
  </section>

  ${nowPhase ? `<section class="card focus">
    <div class="muted small">いま取り組むフェーズ</div>
    <h3>${nowPhase.title}</h3>
    <div class="btns">
      ${nowPhase.cat ? `<a class="btn primary" href="#quiz" data-start="${nowPhase.cat}">この分野の問題を解く</a><a class="btn" href="#notes" data-open="${nowPhase.cat}">要点を読む</a>` : `<a class="btn primary" href="#quiz" data-start="all">ランダム10問</a><a class="btn" href="#notes">要点を読む</a>`}
    </div>
  </section>` : '<section class="card focus"><h3>プランをすべて達成しました 🎉</h3><p>苦手モードと計算ドリルで仕上げましょう。</p></section>'}

  <section class="card">
    <h2>勉強の進め方</h2>
    <ol class="howto">
      <li><b>平日（30〜60分）</b>：このアプリで「要点」を読む → 一問一答10問 → 計算ドリル5問</li>
      <li><b>週末（2〜3時間）</b>：公式の過去問を1回分 → 間違えた所を要点と照らして復習</li>
      <li><b>計算問題は確実に取る</b>：稼働率・dB・光損失・反射係数・Cp・クリティカルパスは毎回数値が変わるドリルで反復</li>
      <li><b>暗記は「違い」で覚える</b>：近端/遠端漏話、G.652/653/655、生産者/消費者危険など対になる用語を比べる</li>
      <li><b>最後の2〜3週間は過去問中心</b>：本番と同じ時間で通し演習。6割が合格ライン</li>
    </ol>
  </section>

  <section class="card">
    <h2>学習プラン</h2>
    <p class="muted small">チェックはこの端末に保存されます。${state.examDate ? '未完了のフェーズに残り日数を自動で割り振ります。' : ''}</p>
    ${PLAN.map((p) => {
      const done = p.tasks.filter((t) => state.plan[t.id]).length;
      const r = ranges && ranges[p.id];
      const complete = done === p.tasks.length;
      return `<details class="phase ${complete ? 'done' : ''}" ${p === nowPhase ? 'open' : ''}>
        <summary><span class="ph-title">${p.title}</span><span class="ph-meta">${complete ? '完了' : r ? `${md(r.s)}〜${md(r.e)}` : `目安 ${Math.round(p.weight * 100)}%`} · ${done}/${p.tasks.length}</span></summary>
        <ul class="tasks">${p.tasks.map((t) => `<li><label><input type="checkbox" data-task="${t.id}" ${state.plan[t.id] ? 'checked' : ''}><span>${t.text}</span></label></li>`).join('')}</ul>
      </details>`;
    }).join('')}
  </section>

  <section class="card">
    <h2>試験について</h2>
    <ul class="small">
      <li>科目「線路設備及び設備管理」は 100 点満点中 <b>60 点以上</b>で合格。</li>
      <li>多くが選択式（語句の穴埋め、正誤の判定、計算）。</li>
      <li>過去問は電気通信国家試験センター（日本データ通信協会）の公式サイトで公開されています。</li>
      <li>試験日・出題範囲は必ず公式情報で確認してください。</li>
    </ul>
  </section>`;

  $('#examDate').addEventListener('change', (e) => { state.examDate = e.target.value; save(); renderHome(); });
  view().querySelectorAll('[data-task]').forEach((cb) => cb.addEventListener('change', (e) => {
    state.plan[e.target.dataset.task] = e.target.checked; save(); renderHome();
  }));
  view().querySelectorAll('[data-start]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); startQuiz(a.dataset.start, 'random');
  }));
  view().querySelectorAll('[data-open]').forEach((a) => a.addEventListener('click', () => { sessionStorage.setItem('openNote', a.dataset.open); }));
}

// ===== 要点 =====
function renderNotes() {
  let open = '';
  try { open = sessionStorage.getItem('openNote') || ''; sessionStorage.removeItem('openNote'); } catch { /* noop */ }
  view().innerHTML = `<h1 class="page-title">要点まとめ</h1>
  ${NOTES.map((n) => `<details class="card note" ${n.cat === open ? 'open' : ''} id="note-${n.cat}">
    <summary><h2>${n.title}</h2></summary>
    <div class="note-body">${n.html}</div>
    <a class="btn primary" href="#quiz" data-start="${n.cat}">この分野の問題を解く</a>
  </details>`).join('')}`;
  view().querySelectorAll('[data-start]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); startQuiz(a.dataset.start, 'random'); }));
  if (open) document.getElementById('note-' + open)?.scrollIntoView({ block: 'start' });
}

// ===== 一問一答 =====
let quiz = null;

function catStats(cat) {
  const qs = QUESTIONS.filter((q) => cat === 'all' || q.cat === cat);
  const seen = qs.filter((q) => state.records[q.id]);
  const weak = qs.filter((q) => state.records[q.id] && state.records[q.id].last === 0);
  const ok = seen.reduce((s, q) => s + state.records[q.id].c, 0);
  const tot = seen.reduce((s, q) => s + state.records[q.id].c + state.records[q.id].w, 0);
  return { total: qs.length, seen: seen.length, weak: weak.length, rate: tot ? Math.round(ok / tot * 100) : null };
}

function renderQuizMenu() {
  const sel = sessionStorage.getItem('quizCat') || 'all';
  const st = catStats(sel);
  view().innerHTML = `<h1 class="page-title">一問一答</h1>
  <section class="card">
    <h2>分野</h2>
    <div class="chips" id="cats">
      <button class="chip ${sel === 'all' ? 'on' : ''}" data-cat="all">すべて</button>
      ${CATEGORIES.map((c) => `<button class="chip ${sel === c.id ? 'on' : ''}" data-cat="${c.id}">${c.name}</button>`).join('')}
    </div>
    <p class="muted small">${st.total}問 ・ 学習済み ${st.seen} ・ 苦手 ${st.weak}${st.rate !== null ? ` ・ 正答率 ${st.rate}%` : ''}</p>
  </section>
  <section class="card">
    <h2>モード</h2>
    <div class="modes">
      <button class="btn primary" data-mode="random">ランダム 10 問</button>
      <button class="btn" data-mode="new">未学習の問題</button>
      <button class="btn" data-mode="weak">苦手（前回間違えた問題）<span class="badge">${st.weak}</span></button>
      <button class="btn" data-mode="all">全問（順番どおり）</button>
    </div>
  </section>`;
  view().querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { sessionStorage.setItem('quizCat', b.dataset.cat); renderQuizMenu(); }));
  view().querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => startQuiz(sel, b.dataset.mode)));
}

function startQuiz(cat, mode) {
  try { sessionStorage.setItem('quizCat', cat); } catch { /* noop */ }
  let qs = QUESTIONS.filter((q) => cat === 'all' || q.cat === cat);
  if (mode === 'new') qs = qs.filter((q) => !state.records[q.id]);
  if (mode === 'weak') qs = qs.filter((q) => state.records[q.id] && state.records[q.id].last === 0);
  if (mode !== 'all') qs = shuffle([...qs]);
  if (mode === 'random') qs = qs.slice(0, 10);
  if (!qs.length) {
    if (location.hash !== '#quiz') location.hash = '#quiz';
    setTimeout(() => toast(mode === 'weak' ? '苦手な問題はありません 👍' : '該当する問題はありません'), 50);
    return;
  }
  quiz = { cat, mode, list: qs, i: 0, results: [] };
  if (location.hash !== '#quiz') { history.replaceState(null, '', '#quiz'); }
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === 'quiz'));
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.list[quiz.i];
  const order = shuffle(q.c.map((_, i) => i));
  view().innerHTML = `
  <div class="qbar"><button class="link" id="quit">← やめる</button><span>${quiz.i + 1} / ${quiz.list.length}</span></div>
  <div class="progress"><div style="width:${(quiz.i) / quiz.list.length * 100}%"></div></div>
  <section class="card question">
    <div class="tag">${catName(q.cat)}</div>
    <p class="qtext">${q.q}</p>
    <div class="choices">${order.map((oi, k) => `<button class="choice" data-i="${oi}"><span class="no">${'アイウエオ'[k]}</span><span>${q.c[oi]}</span></button>`).join('')}</div>
    <div id="feedback"></div>
  </section>`;
  $('#quit').addEventListener('click', () => { quiz = null; renderQuizMenu(); });
  view().querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => answer(q, Number(b.dataset.i))));
  window.scrollTo(0, 0);
}

function answer(q, i) {
  const ok = i === q.a;
  const r = state.records[q.id] || { c: 0, w: 0, last: null };
  ok ? r.c++ : r.w++;
  r.last = ok ? 1 : 0;
  state.records[q.id] = r;
  logAnswer(ok);
  save();
  quiz.results.push({ id: q.id, ok });
  view().querySelectorAll('.choice').forEach((b) => {
    b.disabled = true;
    const bi = Number(b.dataset.i);
    if (bi === q.a) b.classList.add('correct');
    else if (bi === i) b.classList.add('wrong');
  });
  const last = quiz.i === quiz.list.length - 1;
  $('#feedback').innerHTML = `
    <div class="result ${ok ? 'ok' : 'ng'}">${ok ? '⭕ 正解' : '❌ 不正解'}</div>
    <div class="explain">${q.e}</div>
    <button class="btn primary wide" id="next">${last ? '結果を見る' : '次の問題 →'}</button>`;
  $('#next').addEventListener('click', () => { quiz.i++; last ? renderQuizResult() : renderQuestion(); });
  $('#feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderQuizResult() {
  const ok = quiz.results.filter((r) => r.ok).length;
  const n = quiz.results.length;
  const wrong = quiz.results.filter((r) => !r.ok).map((r) => QUESTIONS.find((q) => q.id === r.id));
  const { cat, mode } = quiz;
  view().innerHTML = `
  <section class="card center">
    <div class="muted small">${cat === 'all' ? 'すべての分野' : catName(cat)}</div>
    <div class="score">${ok} / ${n}</div>
    <div class="muted">正答率 ${Math.round(ok / n * 100)}%（合格ライン 60%）</div>
    <div class="btns center">
      ${wrong.length ? '<button class="btn primary" id="retryWrong">間違えた問題をもう一度</button>' : ''}
      <button class="btn" id="again">同じ条件でもう一度</button>
      <a class="btn" href="#quiz" id="menu">メニューへ</a>
    </div>
  </section>
  ${wrong.length ? `<section class="card"><h2>間違えた問題</h2>${wrong.map((q) => `<div class="review"><p>${q.q}</p><p class="ans">正解：${q.c[q.a]}</p><p class="muted small">${q.e}</p></div>`).join('')}</section>` : ''}`;
  $('#again').addEventListener('click', () => startQuiz(cat, mode));
  $('#menu').addEventListener('click', () => { quiz = null; });
  if (wrong.length) $('#retryWrong').addEventListener('click', () => { quiz = { cat, mode, list: shuffle([...wrong]), i: 0, results: [] }; renderQuestion(); });
}

// ===== 計算ドリル =====
let calcSel = 'random';
function renderCalcMenu() {
  view().innerHTML = `<h1 class="page-title">計算ドリル</h1>
  <section class="card">
    <p class="muted small">数値は毎回変わります。式を書いて解いてから選んでください。正答 ${state.calc.ok} / ${state.calc.total}</p>
    <div class="chips" id="ctypes">
      <button class="chip ${calcSel === 'random' ? 'on' : ''}" data-t="random">ランダム</button>
      ${CALC_TYPES.map((t) => `<button class="chip ${calcSel === t.id ? 'on' : ''}" data-t="${t.id}">${t.name}</button>`).join('')}
    </div>
  </section>
  <div id="calcArea"></div>`;
  view().querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => {
    calcSel = b.dataset.t;
    view().querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b));
    newCalc();
  }));
  newCalc();
}

function newCalc() {
  const type = calcSel === 'random' ? pick(CALC_TYPES) : CALC_TYPES.find((t) => t.id === calcSel);
  const p = type.gen();
  $('#calcArea').innerHTML = `<section class="card question">
    <div class="tag">${type.name}</div>
    <p class="qtext">${p.q}</p>
    <div class="choices">${p.choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="no">${'アイウエ'[i]}</span><span>${esc(c)}</span></button>`).join('')}</div>
    <div id="cfeed"></div>
  </section>`;
  $('#calcArea').querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    const ok = i === p.answer;
    state.calc.total++; if (ok) state.calc.ok++;
    logAnswer(ok); save();
    $('#calcArea').querySelectorAll('.choice').forEach((x) => {
      x.disabled = true;
      const xi = Number(x.dataset.i);
      if (xi === p.answer) x.classList.add('correct'); else if (xi === i) x.classList.add('wrong');
    });
    $('#cfeed').innerHTML = `<div class="result ${ok ? 'ok' : 'ng'}">${ok ? '⭕ 正解' : '❌ 不正解'}</div>
      <div class="explain"><div class="muted small">解き方</div>${p.steps}</div>
      <button class="btn primary wide" id="cnext">次の問題 →</button>`;
    $('#cnext').addEventListener('click', () => { newCalc(); $('#calcArea').scrollIntoView({ block: 'start' }); });
    $('#cfeed').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
}

// ===== 記録 =====
function renderStats() {
  const days = [];
  for (let k = 13; k >= 0; k--) {
    const d = new Date(); d.setDate(d.getDate() - k);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ d, n: (state.log[key] || {}).n || 0 });
  }
  const max = Math.max(5, ...days.map((x) => x.n));
  let streak = 0;
  for (let k = days.length - 1; k >= 0; k--) { if (days[k].n > 0) streak++; else if (k !== days.length - 1) break; }

  view().innerHTML = `<h1 class="page-title">学習記録</h1>
  <section class="card">
    <h2>直近14日の解答数</h2>
    <p class="muted small">連続学習 ${streak} 日</p>
    <div class="bars">${days.map((x) => `<div class="bar"><div class="fill" style="height:${x.n / max * 100}%"></div><span class="v">${x.n || ''}</span><span class="l">${x.d.getDate()}</span></div>`).join('')}</div>
  </section>
  <section class="card">
    <h2>分野別の状況</h2>
    ${CATEGORIES.map((c) => {
      const s = catStats(c.id);
      return `<div class="stat-row">
        <div class="stat-head"><span>${c.name}</span><span class="muted small">${s.rate === null ? '未学習' : `正答率 ${s.rate}%`}</span></div>
        <div class="meter"><div style="width:${s.seen / s.total * 100}%"></div></div>
        <div class="muted small">学習済み ${s.seen}/${s.total}・苦手 ${s.weak}</div>
      </div>`;
    }).join('')}
    <p class="muted small">計算ドリル：${state.calc.ok} / ${state.calc.total} 正解</p>
  </section>
  <section class="card">
    <h2>データ</h2>
    <p class="muted small">記録はこのブラウザ内にのみ保存されます。機種変更時などはバックアップを使ってください。</p>
    <div class="btns">
      <button class="btn" id="exp">バックアップをコピー</button>
      <button class="btn" id="imp">バックアップから復元</button>
      <button class="btn danger" id="reset">記録をリセット</button>
    </div>
  </section>`;
  $('#exp').addEventListener('click', async () => {
    const txt = JSON.stringify(state);
    try { await navigator.clipboard.writeText(txt); toast('コピーしました'); } catch { prompt('この文字列を保存してください', txt); }
  });
  $('#imp').addEventListener('click', () => {
    const txt = prompt('バックアップの文字列を貼り付けてください');
    if (!txt) return;
    try { state = { ...defaultState(), ...JSON.parse(txt) }; save(); toast('復元しました'); renderStats(); } catch { toast('読み込めませんでした'); }
  });
  $('#reset').addEventListener('click', () => {
    if (confirm('すべての学習記録とプランのチェックを消去します。よろしいですか？')) { state = defaultState(); save(); renderStats(); }
  });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('show'), 2000);
}

go();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// 同じタブをもう一度押したときも再描画する
document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
  if (location.hash === a.getAttribute('href')) { quiz = null; go(); }
}));
