// ===== 状態管理 =====
const STORE_KEY = 'senro-study-v1';
const defaultState = () => ({ records: {}, plan: {}, examDate: '', log: {}, calc: { ok: 0, total: 0 }, lessons: {} });
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
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dateKey(new Date());
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
const qById = (id) => QUESTIONS.find((q) => q.id === id);
const NUMS = '①②③④⑤⑥⑦⑧⑨⑩';

// ===== 用語リンク =====
// 描画済みの要素内のテキストから用語を探し、タップで意味を表示できるようにする
function linkTerms(root) {
  if (!root) return;
  const seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest('button, .term, code, .no, input, label, summary h2') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    GLOSSARY_RE.lastIndex = 0;
    let m, last = 0, frag = null;
    while ((m = GLOSSARY_RE.exec(text))) {
      if (seen.has(m[0])) continue; // 同じ用語は最初の1回だけリンク
      seen.add(m[0]);
      frag = frag || document.createDocumentFragment();
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const s = document.createElement('span');
      s.className = 'term'; s.textContent = m[0]; s.dataset.term = m[0];
      s.setAttribute('role', 'button'); s.tabIndex = 0;
      frag.appendChild(s);
      last = m.index + m[0].length;
    }
    if (frag) { frag.appendChild(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag, node); }
  }
}
function showTerm(term) {
  const g = GLOSSARY[term]; if (!g) return;
  $('#sheet').innerHTML = `<div class="sheet-card" role="dialog" aria-label="${esc(term)}">
    <div class="sheet-head"><b>${esc(term)}</b>${g.yomi ? `<span class="muted small">${esc(g.yomi)}</span>` : ''}<button class="link" id="sheetClose" aria-label="閉じる">✕</button></div>
    <p>${esc(g.desc)}</p></div>`;
  $('#sheet').classList.add('show');
  $('#sheetClose').addEventListener('click', hideTerm);
}
function hideTerm() { $('#sheet').classList.remove('show'); }
document.addEventListener('click', (e) => {
  const t = e.target.closest('.term');
  if (t) { e.preventDefault(); e.stopPropagation(); showTerm(t.dataset.term); return; }
  if (e.target.id === 'sheet') hideTerm();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTerm();
  if (e.key === 'Enter' && e.target.classList?.contains('term')) showTerm(e.target.dataset.term);
});

// ===== ルーティング =====
const routes = { home: renderHome, lessons: renderLessons, lesson: renderLesson, notes: renderNotes, glossary: renderGlossary, quiz: renderQuizMenu, calc: renderCalcMenu, stats: renderStats };
const navOf = { lesson: 'lessons', notes: 'lessons', glossary: 'lessons' };
function go() {
  const [name, arg] = (location.hash.slice(1) || 'home').split('/');
  const r = routes[name] ? name : 'home';
  hideTerm();
  routes[r](arg);
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === (navOf[r] || r)));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);

// ===== ホーム =====
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
const nextLesson = () => LESSONS.find((l) => !state.lessons[l.id]);

function renderHome() {
  const left = daysLeft();
  const ranges = phaseRanges();
  const nowPhase = PLAN.find((p) => !p.tasks.every((t) => state.plan[t.id]));
  const todayLog = state.log[today()] || { n: 0, ok: 0 };
  const allTasks = PLAN.flatMap((p) => p.tasks);
  const doneTasks = allTasks.filter((t) => state.plan[t.id]).length;
  const doneLessons = LESSONS.filter((l) => state.lessons[l.id]).length;
  const nl = nextLesson();

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
      <div><b>${doneLessons}/${LESSONS.length}</b><span>レッスン</span></div>
      <div><b>${doneTasks}/${allTasks.length}</b><span>プラン達成</span></div>
    </div>
  </section>

  ${nl ? `<section class="card focus">
    <div class="muted small">次のレッスン（${nl.exam}）</div>
    <h3>${nl.title}</h3>
    <div class="btns"><a class="btn primary" href="#lesson/${nl.id}">読んで問題を解く</a><a class="btn" href="#lessons">レッスン一覧</a></div>
  </section>` : `<section class="card focus"><h3>全レッスン完了 🎉</h3><p>「問題」の苦手モード・過去問類題と計算ドリルで仕上げましょう。</p><a class="btn primary" href="#quiz">問題へ</a></section>`}

  ${partsSummaryCard()}

  <section class="card">
    <h2>勉強の進め方</h2>
    <ol class="howto">
      <li><b>レッスンを順番に</b>：短い解説を読む → すぐ関連問題を解く。わからない<span class="term-sample">青い下線の用語</span>はタップすると意味が出ます</li>
      <li><b>計算は毎日少しずつ</b>：信頼性（問6）・張力・dB・反射は「計算」タブで数値を変えて反復</li>
      <li><b>週末は過去問</b>：公式の過去問を本番と同じ 150 分で1回分 → 間違いを該当レッスンで復習</li>
      <li><b>仕上げ</b>：「問題」の「過去問類題」「苦手」モードで、本番形式（誤っているもの／A〜C の正誤）に慣れる</li>
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
        ${p.lessons ? `<div class="ph-lessons">${p.lessons.map((id) => { const l = LESSONS.find((x) => x.id === id); return `<a href="#lesson/${id}" class="chip ${state.lessons[id] ? 'on' : ''}">${state.lessons[id] ? '✓ ' : ''}${l.title}</a>`; }).join('')}</div>` : ''}
        <ul class="tasks">${p.tasks.map((t) => `<li><label><input type="checkbox" data-task="${t.id}" ${state.plan[t.id] ? 'checked' : ''}><span>${t.text}</span></label></li>`).join('')}</ul>
      </details>`;
    }).join('')}
  </section>

  <section class="card">
    <h2>試験について（令和8年度の問題用紙より）</h2>
    <ul class="small">
      <li>科目「線路設備及び設備管理」は <b>150 点満点・90 点以上で合格</b>。試験時間は 150 分（10:00〜12:30）。</li>
      <li>大問は <b>問1〜問8</b>：問1 光伝送技術（20点）／問2 線路の特性・ケーブル・架空（20点）／問3 設計・保守（20点）／問4 光海底ケーブル（15点）／問5 通信土木（15点）／問6 設備管理・信頼性（26点）／問7 施工管理・法令・安全（20点）／問8 情報セキュリティ（14点）</li>
      <li>形式は、語句の穴埋め、「誤っているもの／正しいもの」の選択、A〜C の正誤判定、計算。</li>
      <li>過去 20 回分を分析すると、同じテーマが繰り返し出題されています。「過去問類題」はその頻出テーマから作成しました。</li>
      <li>試験日・出題範囲は必ず公式情報で確認してください。</li>
    </ul>
  </section>`;

  $('#examDate').addEventListener('change', (e) => { state.examDate = e.target.value; save(); renderHome(); });
  view().querySelectorAll('[data-task]').forEach((cb) => cb.addEventListener('change', (e) => {
    state.plan[e.target.dataset.task] = e.target.checked; save(); renderHome();
  }));
}

// ===== レッスン =====
function renderLessons() {
  const groups = [];
  LESSONS.forEach((l) => {
    const g = groups.find((x) => x.exam === l.exam);
    g ? g.list.push(l) : groups.push({ exam: l.exam, list: [l] });
  });
  const done = LESSONS.filter((l) => state.lessons[l.id]).length;
  view().innerHTML = `<h1 class="page-title">レッスン</h1>
  <section class="card">
    <p class="small">短い解説を読んでから、関連する問題を解きます。上から順に進めるのがおすすめです（${done}/${LESSONS.length} 完了）。</p>
    <div class="btns"><a class="btn" href="#glossary">📖 用語集</a><a class="btn" href="#notes">📝 要点まとめ</a></div>
  </section>
  <section class="card lesson-list">
    ${LESSONS.map((l, i) => {
      const r = state.lessons[l.id];
      return `<a class="lesson-row ${r ? 'done' : ''}" href="#lesson/${l.id}">
        <span class="ln">${r ? '✓' : i + 1}</span>
        <span class="lt"><b>${l.title}</b><span class="muted small">${l.exam} ・ ${l.qids.length}問${r ? ` ・ 前回 ${r.ok}/${r.n}` : ''}</span></span>
        <span class="chev">›</span>
      </a>`;
    }).join('')}
  </section>`;
}

function renderLesson(id) {
  const idx = LESSONS.findIndex((l) => l.id === id);
  const l = LESSONS[idx];
  if (!l) { location.hash = '#lessons'; return; }
  view().innerHTML = `
  <div class="qbar"><a class="link" href="#lessons">← レッスン一覧</a><span>${idx + 1} / ${LESSONS.length}</span></div>
  <section class="card lesson">
    <div class="tag">${l.exam} ・ ${catName(l.cat)}</div>
    <h1 class="lesson-title">${l.title}</h1>
    <div class="lesson-body">${l.body}</div>
    <p class="muted small hint">青い下線の用語はタップで意味を表示</p>
    <button class="btn primary wide" id="startLesson">関連問題を解く（${l.qids.length}問）→</button>
  </section>`;
  linkTerms(view().querySelector('.lesson-body'));
  $('#startLesson').addEventListener('click', () => {
    const list = l.qids.map(qById).filter(Boolean);
    quiz = { cat: l.cat, mode: 'lesson', lesson: l.id, list, i: 0, results: [] };
    renderQuestion();
  });
}

// ===== 要点まとめ =====
function renderNotes() {
  let open = '';
  try { open = sessionStorage.getItem('openNote') || ''; sessionStorage.removeItem('openNote'); } catch { /* noop */ }
  view().innerHTML = `<div class="qbar"><a class="link" href="#lessons">← レッスン</a></div><h1 class="page-title">要点まとめ</h1>
  ${NOTES.map((n) => `<details class="card note" ${n.cat === open ? 'open' : ''} id="note-${n.cat}">
    <summary><h2>${n.title}</h2></summary>
    <div class="note-body">${n.html}</div>
    <button class="btn primary" data-start="${n.cat}">この分野の問題を解く</button>
  </details>`).join('')}`;
  view().querySelectorAll('.note-body').forEach(linkTerms);
  view().querySelectorAll('[data-start]').forEach((a) => a.addEventListener('click', () => startQuiz(a.dataset.start, 'random')));
}

// ===== 用語集 =====
function renderGlossary() {
  view().innerHTML = `<div class="qbar"><a class="link" href="#lessons">← レッスン</a></div><h1 class="page-title">用語集</h1>
  <section class="card"><input type="search" id="gq" placeholder="用語を検索（例：分散、MTBF）" aria-label="用語を検索"></section>
  <section class="card" id="glist"></section>`;
  const draw = (q) => {
    const k = q.trim().toLowerCase();
    const list = GLOSSARY_LIST.filter(([t, y, d]) => !k || (t + y + d).toLowerCase().includes(k));
    $('#glist').innerHTML = list.length ? list.map(([t, y, d]) => `<div class="gitem"><b>${esc(t)}</b>${y ? ` <span class="muted small">${esc(y)}</span>` : ''}<p>${esc(d)}</p></div>`).join('') : '<p class="muted">見つかりませんでした</p>';
  };
  $('#gq').addEventListener('input', (e) => draw(e.target.value));
  draw('');
}

// ===== 一問一答 =====
let quiz = null;

function catStats(cat, filter = () => true) {
  const qs = QUESTIONS.filter((q) => (cat === 'all' || q.cat === cat) && filter(q));
  const seen = qs.filter((q) => state.records[q.id]);
  const weak = qs.filter((q) => state.records[q.id] && state.records[q.id].last === 0);
  const ok = seen.reduce((s, q) => s + state.records[q.id].c, 0);
  const tot = seen.reduce((s, q) => s + state.records[q.id].c + state.records[q.id].w, 0);
  return { total: qs.length, seen: seen.length, weak: weak.length, rate: tot ? Math.round(ok / tot * 100) : null };
}

function renderQuizMenu() {
  let sel = 'all';
  try { sel = sessionStorage.getItem('quizCat') || 'all'; } catch { /* noop */ }
  const st = catStats(sel);
  const pastN = catStats(sel, (q) => q.past).total;
  view().innerHTML = `<h1 class="page-title">問題演習</h1>
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
      <button class="btn" data-mode="past">過去問類題（本番形式）<span class="badge info">${pastN}</span></button>
      <button class="btn" data-mode="new">未学習の問題</button>
      <button class="btn" data-mode="weak">苦手（前回間違えた問題）<span class="badge">${st.weak}</span></button>
      <button class="btn" data-mode="all">全問（順番どおり）</button>
    </div>
  </section>`;
  view().querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { try { sessionStorage.setItem('quizCat', b.dataset.cat); } catch { /* noop */ } renderQuizMenu(); }));
  view().querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => startQuiz(sel, b.dataset.mode)));
}

function startQuiz(cat, mode) {
  try { sessionStorage.setItem('quizCat', cat); } catch { /* noop */ }
  let qs = QUESTIONS.filter((q) => cat === 'all' || q.cat === cat);
  if (mode === 'new') qs = qs.filter((q) => !state.records[q.id]);
  if (mode === 'weak') qs = qs.filter((q) => state.records[q.id] && state.records[q.id].last === 0);
  if (mode === 'past') qs = qs.filter((q) => q.past);
  if (mode !== 'all') qs = shuffle([...qs]);
  if (mode === 'random' || mode === 'past') qs = qs.slice(0, 10);
  if (!qs.length) {
    if (location.hash !== '#quiz') location.hash = '#quiz';
    setTimeout(() => toast(mode === 'weak' ? '苦手な問題はありません 👍' : '該当する問題はありません'), 50);
    return;
  }
  quiz = { cat, mode, list: qs, i: 0, results: [] };
  if (location.hash !== '#quiz') history.replaceState(null, '', '#quiz');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === 'quiz'));
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.list[quiz.i];
  // A〜C 判定問題と「〜のうち」形式は選択肢の順番を固定（本番と同じ）
  const order = q.abc ? q.c.map((_, i) => i) : shuffle(q.c.map((_, i) => i));
  const long = q.c.some((c) => c.length > 30);
  view().innerHTML = `
  <div class="qbar"><button class="link" id="quit">← やめる</button><span>${quiz.i + 1} / ${quiz.list.length}</span></div>
  <div class="progress"><div style="width:${(quiz.i) / quiz.list.length * 100}%"></div></div>
  <section class="card question">
    <div class="tag">${catName(q.cat)}</div>${q.past ? '<span class="tag past">過去問類題</span>' : ''}
    <div class="qtext">${q.q}</div>
    <div class="choices ${long ? 'long' : ''}">${order.map((oi, k) => `<button class="choice" data-i="${oi}"><span class="no">${NUMS[k]}</span><span>${q.c[oi]}</span></button>`).join('')}</div>
    <div id="feedback"></div>
  </section>`;
  $('#quit').addEventListener('click', () => {
    const lid = quiz.lesson, theme = quiz.mode === 'theme'; quiz = null;
    if (theme) { location.hash = '#stats'; go(); return; }
    lid ? renderLesson(lid) : renderQuizMenu();
  });
  view().querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => answer(q, Number(b.dataset.i))));
  linkTerms(view().querySelector('.qtext'));
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
  linkTerms($('#feedback .explain'));
  $('#next').addEventListener('click', () => { quiz.i++; last ? renderQuizResult() : renderQuestion(); });
  $('#feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderQuizResult() {
  const ok = quiz.results.filter((r) => r.ok).length;
  const n = quiz.results.length;
  const wrong = quiz.results.filter((r) => !r.ok).map((r) => qById(r.id));
  const { cat, mode, lesson } = quiz;
  let nl = null;
  if (lesson) {
    state.lessons[lesson] = { ok, n, t: today() };
    save();
    const idx = LESSONS.findIndex((l) => l.id === lesson);
    nl = LESSONS[idx + 1];
  }
  view().innerHTML = `
  <section class="card center">
    <div class="muted small">${lesson ? LESSONS.find((l) => l.id === lesson).title : quiz.title || (cat === 'all' ? 'すべての分野' : catName(cat))}</div>
    <div class="score">${ok} / ${n}</div>
    <div class="muted">正答率 ${Math.round(ok / n * 100)}%（合格ライン 60%）</div>
    <div class="btns center">
      ${nl ? `<a class="btn primary" href="#lesson/${nl.id}">次のレッスンへ →</a>` : ''}
      ${wrong.length ? `<button class="btn ${nl ? '' : 'primary'}" id="retryWrong">間違えた問題をもう一度</button>` : ''}
      ${lesson ? `<a class="btn" href="#lesson/${lesson}">解説を読み直す</a>` : '<button class="btn" id="again">同じ条件でもう一度</button>'}
      <a class="btn" href="${lesson ? '#lessons' : '#quiz'}" id="menu">${lesson ? 'レッスン一覧' : 'メニューへ'}</a>
    </div>
  </section>
  ${wrong.length ? `<section class="card"><h2>間違えた問題</h2>${wrong.map((q) => `<div class="review"><div>${q.q}</div><p class="ans">正解：${q.c[q.a]}</p><p class="muted small">${q.e}</p></div>`).join('')}</section>` : ''}`;
  $('#again')?.addEventListener('click', () => (mode === 'theme' ? startList(quiz.list.map((q) => q.id), quiz.title) : startQuiz(cat, mode)));
  if (mode === 'theme') $('#menu').setAttribute('href', '#stats');
  $('#menu').addEventListener('click', () => { quiz = null; });
  if (wrong.length) $('#retryWrong').addEventListener('click', () => { quiz = { cat, mode, lesson: null, list: shuffle([...wrong]), i: 0, results: [] }; renderQuestion(); });
  view().querySelectorAll('.review').forEach(linkTerms);
}

// ===== 計算ドリル =====
let calcSel = 'random';
function renderCalcMenu() {
  view().innerHTML = `<h1 class="page-title">計算ドリル</h1>
  <section class="card">
    <p class="muted small">数値は毎回変わります。式を書いて解いてから選んでください。正答 ${state.calc.ok} / ${state.calc.total}</p>
    <div class="chips" id="ctypes">
      <button class="chip ${calcSel === 'random' ? 'on' : ''}" data-t="random">ランダム</button>
      ${CALC_TYPES.map((t) => `<button class="chip ${calcSel === t.id ? 'on' : ''}" data-t="${t.id}">${t.name}${t.past ? ' ★' : ''}</button>`).join('')}
    </div>
    <p class="muted small">★ は過去問で繰り返し出題されている形式</p>
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
    <div class="qtext">${p.q}</div>
    <div class="choices">${p.choices.map((c, i) => `<button class="choice" data-i="${i}"><span class="no">${NUMS[i]}</span><span>${esc(c)}</span></button>`).join('')}</div>
    <div id="cfeed"></div>
  </section>`;
  linkTerms($('#calcArea .qtext'));
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

// ===== 大問別の到達度 =====
// テーマの習得度：そのテーマの問題のうち「前回正解」の割合
function themeMastery(t) {
  const ok = t.qids.filter((id) => state.records[id] && state.records[id].last === 1).length;
  const tried = t.qids.filter((id) => state.records[id]).length;
  return { ok, tried, n: t.qids.length, m: t.qids.length ? ok / t.qids.length : 0 };
}
// 大問のカバー率：出題頻度で重み付けした習得度
function partCoverage(p) {
  const total = p.themes.reduce((s, t) => s + t.freq, 0);
  return p.themes.reduce((s, t) => s + t.freq * themeMastery(t).m, 0) / total;
}
// 頻出テーマ（★）だけで過去の出題の何割を占めるか
function frequentShare(p) {
  const total = p.themes.reduce((s, t) => s + t.freq, 0);
  return p.themes.filter((t) => t.freq >= FREQUENT).reduce((s, t) => s + t.freq, 0) / total;
}
function partStatus(cov) {
  if (cov >= 0.8) return { cls: 'ok', label: '仕上がり' };
  if (cov >= 0.6) return { cls: 'mid', label: '合格ライン付近' };
  if (cov > 0) return { cls: 'low', label: '学習中' };
  return { cls: 'none', label: '未着手' };
}
const estScore = () => EXAM_PARTS.reduce((s, p) => s + p.points * partCoverage(p), 0);

function openPart() { try { return sessionStorage.getItem('openPart'); } catch { return null; } }

function partsSummaryCard() {
  const est = Math.round(estScore());
  return `<section class="card">
    <h2>大問別の到達度</h2>
    <div class="parts-mini">${EXAM_PARTS.map((p) => {
      const c = partCoverage(p);
      return `<a href="#stats" class="pm"><span class="pm-no">問${p.no}</span><span class="meter"><span class="${partStatus(c).cls}" style="width:${Math.round(c * 100)}%"></span></span><span class="pm-v">${Math.round(c * 100)}%</span></a>`;
    }).join('')}</div>
    <p class="small">推定 <b>${est}</b> / 150 点（合格 90 点）<span class="muted">　※このアプリの問題の正答状況からの目安</span></p>
    <a class="btn" href="#stats">テーマ別に見る</a>
  </section>`;
}

function partsDetail() {
  const est = Math.round(estScore());
  return `<section class="card">
    <h2>大問別の到達度</h2>
    <p class="small">各大問のテーマと、直近 ${EXAM_ROUNDS} 回（令和3年度〜令和8年度第1回）で出題された回数です。<b>★ のテーマ（${EXAM_ROUNDS} 回中 ${FREQUENT} 回以上）をすべて「クリア」</b>（そのテーマの問題を 8 割以上正解）すれば、その大問の過去出題の大部分をカバーできます。</p>
    <div class="est"><span>推定</span><b>${est}</b><span>/ 150 点</span><span class="muted small">合格 90 点</span></div>
    <p class="muted small">推定点 ＝ 各大問の配点 × カバー率（出題回数で重み付けした正答状況）。アプリの問題での目安で、本番の点数を保証するものではありません。</p>
  </section>
  ${EXAM_PARTS.map((p) => {
    const c = partCoverage(p);
    const st = partStatus(c);
    const freqThemes = p.themes.filter((t) => t.freq >= FREQUENT);
    const cleared = freqThemes.filter((t) => themeMastery(t).m >= 0.8).length;
    return `<details class="card part" ${openPart() == p.no ? 'open' : ''} data-part="${p.no}">
      <summary>
        <div class="part-head"><b>問${p.no} ${p.title}</b><span class="muted small">${p.points}点</span></div>
        <div class="part-bar"><span class="meter big"><span class="${st.cls}" style="width:${Math.round(c * 100)}%"></span></span><span class="pill ${st.cls}">${st.label} ${Math.round(c * 100)}%</span></div>
        <div class="muted small">★ 頻出テーマ ${cleared}/${freqThemes.length} クリア ・ ★だけで過去出題の約 ${Math.round(frequentShare(p) * 100)}%</div>
      </summary>
      <div class="goal">🎯 <b>目標</b>：★ の ${freqThemes.length} テーマをクリア${freqThemes.length < p.themes.length ? '。余裕があれば残りのテーマも' : ''}</div>
      ${p.themes.map((t, ti) => {
        const m = themeMastery(t);
        const done = m.m >= 0.8;
        return `<div class="theme ${done ? 'done' : ''}">
          <div class="theme-head"><span class="star">${t.freq >= FREQUENT ? '★' : '　'}</span><span class="tn">${t.name}</span>${done ? '<span class="pill ok">クリア</span>' : ''}</div>
          <div class="theme-meta"><span class="freq" title="出題回数"><span class="dots">${'●'.repeat(t.freq)}${'○'.repeat(EXAM_ROUNDS - t.freq)}</span> ${EXAM_ROUNDS}回中${t.freq}回</span></div>
          <div class="theme-prog"><span class="meter"><span class="${done ? 'ok' : m.m > 0 ? 'mid' : 'none'}" style="width:${Math.round(m.m * 100)}%"></span></span><span class="muted small">${m.ok}/${m.n}問 正解</span></div>
          <div class="theme-btns">
            <button class="btn sm primary" data-theme="${p.no}-${ti}">解く</button>
            ${t.lessons.map((id) => `<a class="btn sm" href="#lesson/${id}">${id}</a>`).join('')}
            ${t.calc ? `<button class="btn sm" data-calc="${t.calc[0]}">計算ドリル</button>` : ''}
          </div>
          ${t.qids.length <= 2 ? '<div class="muted small thin">※アプリの問題が少ないテーマです。過去問でも確認してください</div>' : ''}
        </div>`;
      }).join('')}
    </details>`;
  }).join('')}`;
}

function bindParts() {
  view().querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
    const [pn, ti] = b.dataset.theme.split('-').map(Number);
    const p = EXAM_PARTS.find((x) => x.no === pn);
    try { sessionStorage.setItem('openPart', pn); } catch { /* noop */ }
    startList(p.themes[ti].qids, `問${pn} ${p.themes[ti].name}`);
  }));
  view().querySelectorAll('[data-calc]').forEach((b) => b.addEventListener('click', () => { calcSel = b.dataset.calc; location.hash = '#calc'; }));
  view().querySelectorAll('details.part').forEach((d) => d.addEventListener('toggle', () => {
    try { if (d.open) sessionStorage.setItem('openPart', d.dataset.part); } catch { /* noop */ }
  }));
}

function startList(ids, title) {
  const list = shuffle(ids.map(qById).filter(Boolean));
  quiz = { cat: 'all', mode: 'theme', title, list, i: 0, results: [] };
  if (location.hash !== '#quiz') history.replaceState(null, '', '#quiz');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === 'stats'));
  renderQuestion();
}

// ===== 記録 =====
function renderStats() {
  const days = [];
  for (let k = 13; k >= 0; k--) {
    const d = new Date(); d.setDate(d.getDate() - k);
    days.push({ d, n: (state.log[dateKey(d)] || {}).n || 0 });
  }
  const max = Math.max(5, ...days.map((x) => x.n));
  let streak = 0;
  for (let k = days.length - 1; k >= 0; k--) { if (days[k].n > 0) streak++; else if (k !== days.length - 1) break; }

  view().innerHTML = `<h1 class="page-title">到達度と記録</h1>
  ${partsDetail()}
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
        <div class="meter"><div style="width:${s.total ? s.seen / s.total * 100 : 0}%"></div></div>
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
  bindParts();
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

// 同じタブをもう一度押したときも再描画する
document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', () => {
  if (location.hash === a.getAttribute('href')) { quiz = null; go(); }
}));

go();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
