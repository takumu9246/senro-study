// 計算ドリル：毎回数値が変わる問題を生成する
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const roundTo = (x, d) => Number(x.toFixed(d));
const fmt = (x, d) => roundTo(x, d).toFixed(d);
const log10 = Math.log10;

function makeChoices(ans, wrongs, d, unit = '') {
  const s = (v) => fmt(v, d) + unit;
  const set = new Set([s(ans)]);
  for (const w of wrongs) {
    if (Number.isFinite(w) && w >= 0) set.add(s(w));
    if (set.size >= 4) break;
  }
  const muls = [1.1, 0.9, 1.25, 0.8, 1.5, 0.5, 2, 1.05, 0.95];
  for (const m of muls) {
    if (set.size >= 4) break;
    set.add(s(ans * m));
  }
  let k = 1;
  while (set.size < 4) set.add(s(ans + k++ * Math.pow(10, -d)));
  const list = [...set];
  shuffle(list);
  return { choices: list, answer: list.indexOf(s(ans)) };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CALC_TYPES = [
  {
    id: 'avail', name: '稼働率', cat: 'reliability',
    gen() {
      const mtbf = pick([480, 990, 1990, 2400, 4990, 9990, 720, 1500]);
      const mttr = pick([2, 4, 5, 8, 10, 12, 20, 24]);
      const ans = mtbf / (mtbf + mttr);
      return {
        q: `MTBF が ${mtbf} 時間、MTTR が ${mttr} 時間の装置の稼働率はいくらか（小数第4位まで）。`,
        ...makeChoices(ans, [mttr / (mtbf + mttr), 1 - mttr / mtbf * 2, mtbf / (mtbf + 2 * mttr)], 4),
        steps: `A = MTBF / (MTBF + MTTR)<br>= ${mtbf} / (${mtbf} + ${mttr})<br>= ${mtbf} / ${mtbf + mttr}<br>≈ <b>${fmt(ans, 4)}</b>`,
      };
    },
  },
  {
    id: 'sysavail', name: '直列・並列系', cat: 'reliability',
    gen() {
      const a1 = pick([0.8, 0.85, 0.9, 0.95]);
      const a2 = pick([0.8, 0.9, 0.95]);
      const a3 = pick([0.9, 0.95, 0.98, 0.99]);
      const par = 1 - (1 - a1) * (1 - a2);
      const ans = par * a3;
      return {
        q: `稼働率 ${a1} の装置 X と稼働率 ${a2} の装置 Y を並列に接続し（どちらか一方が動けばよい）、それに稼働率 ${a3} の装置 Z を直列に接続した。システム全体の稼働率はいくらか（小数第4位まで）。`,
        ...makeChoices(ans, [a1 * a2 * a3, 1 - (1 - a1) * (1 - a2) * (1 - a3), (a1 + a2) / 2 * a3], 4),
        steps: `並列部：1 − (1 − ${a1})(1 − ${a2}) = 1 − ${fmt(1 - a1, 2)} × ${fmt(1 - a2, 2)} = ${fmt(par, 4)}<br>直列：${fmt(par, 4)} × ${a3} ≈ <b>${fmt(ans, 4)}</b>`,
      };
    },
  },
  {
    id: 'fit', name: '故障率・MTBF', cat: 'reliability',
    gen() {
      const n = pick([50, 100, 200, 500, 1000]);
      const h = pick([1000, 2000, 5000, 10000]);
      const k = R(1, 5);
      const total = n * h;
      const mtbf = total / k;
      return {
        q: `同じ装置 ${n} 台を ${h.toLocaleString()} 時間動作させたところ、合計 ${k} 件の故障が発生した。故障率が一定とすると、この装置の MTBF は何時間か。`,
        ...makeChoices(mtbf, [h / k, total * k, mtbf / 10, mtbf * 10], 0, ' 時間'),
        steps: `総動作時間 = ${n} × ${h.toLocaleString()} = ${total.toLocaleString()} 時間<br>故障率 λ = ${k} / ${total.toLocaleString()} = ${(k / total).toExponential(2)} /h（= ${roundTo(k / total * 1e9, 0).toLocaleString()} FIT）<br>MTBF = 1/λ = <b>${mtbf.toLocaleString()} 時間</b>`,
      };
    },
  },
  {
    id: 'rel', name: '信頼度 R(t)', cat: 'reliability',
    gen() {
      const mtbf = pick([1000, 2000, 5000, 10000, 20000]);
      const t = pick([100, 200, 500, 1000, 2000]);
      const x = t / mtbf;
      const ans = Math.exp(-x);
      return {
        q: `MTBF が ${mtbf.toLocaleString()} 時間で故障率一定の装置が、${t.toLocaleString()} 時間故障なく動作する確率（信頼度）はおよそいくらか（小数第3位まで）。`,
        ...makeChoices(ans, [1 - ans, 1 - x, Math.exp(-x / 2)], 3),
        steps: `λ = 1/MTBF = 1/${mtbf.toLocaleString()}<br>R(t) = e^(−λt) = e^(−${t}/${mtbf}) = e^(−${fmt(x, 3)})<br>≈ <b>${fmt(ans, 3)}</b><br><small>※ 試験では e^(−x) ≈ 1 − x（x が小さいとき）の近似も使われる：1 − ${fmt(x, 3)} = ${fmt(1 - x, 3)}</small>`,
      };
    },
  },
  {
    id: 'budget', name: '光損失バジェット', cat: 'connect',
    gen() {
      const pt = pick([0, 1, 2, 3, 5]);
      const a = pick([0.3, 0.35, 0.4]);
      const L = pick([5, 8, 10, 12, 15, 20]);
      const ns = R(2, 6);
      const ls = 0.1;
      const nc = R(2, 4);
      const lc = 0.5;
      const sp = pick([[8, 10], [16, 14], [32, 17]]);
      const fiber = a * L;
      const total = fiber + ns * ls + nc * lc + sp[1];
      const ans = pt - total;
      return {
        q: `送信光レベル ${pt >= 0 ? '+' : ''}${pt} dBm の PON 区間で、光ファイバ ${L} km（損失 ${a} dB/km）、融着接続 ${ns} 箇所（各 ${ls} dB）、コネクタ ${nc} 箇所（各 ${lc} dB）、1:${sp[0]} 光スプリッタ（挿入損失 ${sp[1]} dB）がある。受信光レベルは何 dBm か。`,
        ...fixNeg(ans, [ans + sp[1], ans + ns * ls + nc * lc, pt + total, ans + fiber]),
        steps: `ファイバ：${a} × ${L} = ${fmt(fiber, 2)} dB<br>融着：${ns} × ${ls} = ${fmt(ns * ls, 1)} dB<br>コネクタ：${nc} × ${lc} = ${fmt(nc * lc, 1)} dB<br>スプリッタ：${sp[1]} dB<br>合計損失 = ${fmt(total, 2)} dB<br>受信レベル = ${pt} − ${fmt(total, 2)} = <b>${fmt(ans, 1)} dBm</b>`,
      };
    },
  },
  {
    id: 'dbm', name: 'dBm ⇔ mW', cat: 'metal',
    gen() {
      const table = [[-30, 0.001], [-20, 0.01], [-10, 0.1], [-3, 0.5], [0, 1], [3, 2], [6, 4], [10, 10], [13, 20], [20, 100], [23, 200], [30, 1000]];
      const [db, mw] = pick(table);
      if (Math.random() < 0.5) {
        const opts = shuffle([...new Set([mw, ...shuffle(table.filter((t) => t[1] !== mw).map((t) => t[1])).slice(0, 3)])]);
        return {
          q: `${db} dBm はおよそ何 mW か。`,
          choices: opts.map((v) => v + ' mW'), answer: opts.indexOf(mw),
          steps: `P[mW] = 10^(dBm/10) = 10^(${db}/10) ≈ <b>${mw} mW</b><br>覚え方：+10 dB で 10 倍、+3 dB で約 2 倍、−3 dB で約 1/2`,
        };
      }
      const opts = shuffle([...new Set([db, ...shuffle(table.filter((t) => t[0] !== db).map((t) => t[0])).slice(0, 3)])]);
      return {
        q: `${mw} mW はおよそ何 dBm か。`,
        choices: opts.map((v) => v + ' dBm'), answer: opts.indexOf(db),
        steps: `dBm = 10 log₁₀(P[mW] / 1 mW) = 10 log₁₀(${mw}) ≈ <b>${db} dBm</b>`,
      };
    },
  },
  {
    id: 'loss', name: '伝送損失・レベル', cat: 'metal',
    gen() {
      const pin = pick([0, 5, 10, -5]);
      const a = pick([0.5, 1.2, 1.5, 2, 2.5, 3]);
      const L = pick([4, 6, 8, 10, 12]);
      const g = pick([0, 0, 10, 15, 20]);
      const ans = pin - a * L + g;
      const qAmp = g ? `、途中に利得 ${g} dB の増幅器を1台挿入した` : '';
      return {
        q: `入力レベル ${pin} dBm の信号を、減衰定数 ${a} dB/km の線路 ${L} km で伝送した${qAmp}。出力レベルは何 dBm か。`,
        ...fixNeg(ans, [pin - a * L - g, pin - a / L + g, pin - a * L, ans + 3, ans - 3]),
        steps: `線路損失 = ${a} × ${L} = ${fmt(a * L, 1)} dB<br>出力 = ${pin} − ${fmt(a * L, 1)}${g ? ` + ${g}` : ''} = <b>${fmt(ans, 1)} dBm</b><br>dB 表示なら損失は引き算、利得は足し算。`,
      };
    },
  },
  {
    id: 'refl', name: '反射係数・VSWR', cat: 'metal',
    gen() {
      const z0 = pick([50, 75, 100, 600]);
      const zl = pick([z0 / 3, z0 / 2, z0 * 2, z0 * 3, z0 * 1.5].map((v) => Math.round(v)));
      const g = (zl - z0) / (zl + z0);
      if (Math.random() < 0.5) {
        return {
          q: `特性インピーダンス ${z0} Ω の線路を ${zl} Ω の負荷で終端した。電圧反射係数 Γ はいくらか（小数第3位まで）。`,
          ...fixNeg(g, [-g, (zl + z0) / (zl - z0), 2 * zl / (zl + z0), zl / z0 - 1], 3),
          steps: `Γ = (Z_L − Z₀)/(Z_L + Z₀) = (${zl} − ${z0})/(${zl} + ${z0}) = ${zl - z0}/${zl + z0} ≈ <b>${fmt(g, 3)}</b>`,
        };
      }
      const ag = Math.abs(g);
      const v = (1 + ag) / (1 - ag);
      return {
        q: `特性インピーダンス ${z0} Ω の線路を ${zl} Ω の純抵抗負荷で終端した。電圧定在波比（VSWR）はいくらか（小数第2位まで）。`,
        ...makeChoices(v, [ag, 1 / v, 1 + ag, v * 2], 2),
        steps: `|Γ| = |${zl} − ${z0}|/(${zl} + ${z0}) = ${fmt(ag, 3)}<br>VSWR = (1 + |Γ|)/(1 − |Γ|) = ${fmt(1 + ag, 3)}/${fmt(1 - ag, 3)} ≈ <b>${fmt(v, 2)}</b><br><small>純抵抗終端なら VSWR = 大きい方/小さい方 = ${Math.max(zl, z0)}/${Math.min(zl, z0)} でも求まる</small>`,
      };
    },
  },
  {
    id: 'xtalk', name: '漏話減衰量', cat: 'metal',
    gen() {
      const p1 = pick([[1, 'mW', 1e-3], [10, 'mW', 1e-2], [0.1, 'mW', 1e-4]]);
      const p2 = pick([[1, 'μW', 1e-6], [10, 'nW', 1e-8], [1, 'nW', 1e-9], [100, 'nW', 1e-7], [10, 'μW', 1e-5]]);
      const ans = 10 * log10(p1[2] / p2[2]);
      return {
        q: `誘導回線の送端電力が ${p1[0]} ${p1[1]}、被誘導回線の近端に現れた漏話電力が ${p2[0]} ${p2[1]} であった。近端漏話減衰量は何 dB か。`,
        ...makeChoices(ans, [ans * 2, ans / 2, ans + 10, ans - 10], 0, ' dB'),
        steps: `漏話減衰量 = 10 log₁₀(P₁/P₂) = 10 log₁₀(${p1[2].toExponential(0)} / ${p2[2].toExponential(0)}) = 10 log₁₀(${(p1[2] / p2[2]).toExponential(0)}) = <b>${fmt(ans, 0)} dB</b>`,
      };
    },
  },
  {
    id: 'na', name: '開口数 NA', cat: 'optical',
    gen() {
      const n1 = pick([1.46, 1.465, 1.47, 1.48]);
      const d = pick([0.003, 0.005, 0.01, 0.02]);
      const n2 = roundTo(n1 * (1 - d), 4);
      const na = Math.sqrt(n1 * n1 - n2 * n2);
      return {
        q: `コアの屈折率 ${n1}、クラッドの屈折率 ${n2} のステップインデックス形光ファイバの開口数 NA はいくらか（小数第3位まで）。`,
        ...makeChoices(na, [n1 - n2, (n1 - n2) / n1, na * na, Math.sqrt(n1 - n2)], 3),
        steps: `NA = √(n₁² − n₂²) = √(${n1}² − ${n2}²) = √(${fmt(n1 * n1, 4)} − ${fmt(n2 * n2, 4)}) = √${fmt(n1 * n1 - n2 * n2, 4)} ≈ <b>${fmt(na, 3)}</b><br>比屈折率差 Δ ≈ (n₁−n₂)/n₁ = ${fmt((n1 - n2) / n1 * 100, 2)} %、近似式 n₁√(2Δ) ≈ ${fmt(n1 * Math.sqrt(2 * (n1 - n2) / n1), 3)}`,
      };
    },
  },
  {
    id: 'otdr', name: 'OTDR 距離', cat: 'connect',
    gen() {
      const n = pick([1.46, 1.47, 1.5]);
      const t = pick([10, 20, 49, 50, 98, 100, 147, 200]);
      const L = 3e8 * t * 1e-6 / (2 * n) / 1000;
      return {
        q: `群屈折率 ${n} の光ファイバで、OTDR から光パルスを入射して ${t} μs 後に破断点からの反射光が戻った。破断点までの距離は約何 km か（光速 3×10⁸ m/s、小数第2位まで）。`,
        ...makeChoices(L, [L * 2, L * n * n, 3e8 * t * 1e-6 / 2 / 1000, L / 2], 2, ' km'),
        steps: `L = c·t / (2n) = 3×10⁸ × ${t}×10⁻⁶ / (2 × ${n})<br>= ${fmt(3e8 * t * 1e-6, 0)} / ${fmt(2 * n, 2)} m ≈ <b>${fmt(L, 2)} km</b><br>往復時間なので 2 で割る。光速はファイバ中で c/n。`,
      };
    },
  },
  {
    id: 'split', name: '分岐損失', cat: 'connect',
    gen() {
      const N = pick([2, 4, 8, 16, 32, 64]);
      const ans = 10 * log10(N);
      return {
        q: `1:${N} 光スプリッタの理論的な分岐損失（過剰損失を除く）はおよそ何 dB か（小数第1位まで）。`,
        ...makeChoices(ans, [20 * log10(N), N / 2, ans + 3, ans - 3], 1, ' dB'),
        steps: `分岐損失 = 10 log₁₀ N = 10 log₁₀ ${N} ≈ <b>${fmt(ans, 1)} dB</b><br>分岐数が 2 倍になるごとに約 3 dB 増える。`,
      };
    },
  },
  {
    id: 'sag', name: '架空ケーブルの弛度', cat: 'facility',
    gen() {
      const W = pick([5, 8, 10, 12, 15]);
      const S = pick([30, 35, 40, 50, 60]);
      const T = pick([2000, 3000, 4000, 5000, 6000]);
      const D = W * S * S / (8 * T);
      return {
        q: `単位長さ当たりの荷重 ${W} N/m のケーブルを径間 ${S} m で水平張力 ${T.toLocaleString()} N で架設した。弛度 D はおよそ何 m か（D = WS²/8T、小数第2位まで）。`,
        ...makeChoices(D, [W * S / (8 * T), W * S * S / (4 * T), D * 2, W * S * S / T / 100], 2, ' m'),
        steps: `D = WS² / (8T) = ${W} × ${S}² / (8 × ${T.toLocaleString()})<br>= ${(W * S * S).toLocaleString()} / ${(8 * T).toLocaleString()} ≈ <b>${fmt(D, 2)} m</b>`,
      };
    },
  },
  {
    id: 'cp', name: '工程能力指数', cat: 'quality',
    gen() {
      const center = pick([50, 100, 20]);
      const half = pick([3, 4, 5, 6]);
      const s = pick([0.5, 0.75, 1, 1.25, 1.5]);
      const cp = (2 * half) / (6 * s);
      return {
        q: `上限規格値 ${center + half}、下限規格値 ${center - half} の製品で、工程の標準偏差が ${s} であった。工程能力指数 Cp はいくらか（小数第2位まで）。`,
        ...makeChoices(cp, [(2 * half) / (3 * s), half / (6 * s), (6 * s) / (2 * half)], 2),
        steps: `Cp = (S_U − S_L) / 6σ = (${center + half} − ${center - half}) / (6 × ${s}) = ${2 * half} / ${fmt(6 * s, 2)} ≈ <b>${fmt(cp, 2)}</b><br>判定：${cp >= 1.67 ? '1.67 以上：工程能力は十分すぎる' : cp >= 1.33 ? '1.33 以上：工程能力は十分' : cp >= 1 ? '1.00〜1.33：まずまず（注意が必要）' : '1.00 未満：工程能力不足'}`,
      };
    },
  },
  {
    id: 'cpath', name: 'クリティカルパス', cat: 'quality',
    gen() {
      const A = R(2, 5), B = R(3, 9), C = R(2, 5), E = R(2, 5), D = R(1, 4), F = R(2, 6);
      // A → B → D,  A → C → E → D,  F（A と並行）→ E
      const p1 = A + B + D, p2 = A + C + E + D, p3 = F + E + D;
      const ans = Math.max(p1, p2, p3);
      const path = ans === p2 ? 'A→C→E→D' : ans === p1 ? 'A→B→D' : 'F→E→D';
      return {
        q: `次の作業からなる工事の最短工期は何日か。<br>・A（${A}日）：最初に開始<br>・F（${F}日）：最初に開始（A と並行）<br>・B（${B}日）：A 完了後<br>・C（${C}日）：A 完了後<br>・E（${E}日）：C と F の両方完了後<br>・D（${D}日）：B と E の両方完了後（最終作業）`,
        ...makeChoices(ans, [Math.min(p1, p2, p3), A + B + C + D + E + F, ans + 1, ans - 1], 0, ' 日'),
        steps: `各経路の日数：<br>A→B→D = ${A}+${B}+${D} = ${p1} 日<br>A→C→E→D = ${A}+${C}+${E}+${D} = ${p2} 日<br>F→E→D = ${F}+${E}+${D} = ${p3} 日<br>最長経路（クリティカルパス）${path} の <b>${ans} 日</b>`,
      };
    },
  },
];

// 負の値も扱える選択肢生成
function fixNeg(ans, wrongs, d = 1) {
  const s = (v) => fmt(v, d);
  const set = new Set([s(ans)]);
  for (const w of wrongs) {
    if (Number.isFinite(w)) set.add(s(w));
    if (set.size >= 4) break;
  }
  let k = 1;
  while (set.size < 4) set.add(s(ans + (k % 2 ? 1 : -1) * Math.ceil(k++ / 2) * 2));
  const list = shuffle([...set]);
  return { choices: list, answer: list.indexOf(s(ans)) };
}

// ===== 過去問で頻出の計算（★） =====
CALC_TYPES.forEach((t) => { if (['avail', 'sysavail', 'rel', 'cpath', 'refl'].includes(t.id)) t.past = true; });
CALC_TYPES.push(
  {
    id: 'pull', name: '管路の張力', past: true,
    gen() {
      const T0 = pick([500, 600, 800, 1000, 1200]);
      const W = pick([0.4, 0.5, 0.6, 0.8, 1.0]);
      const L = pick([40, 50, 60, 80, 95, 100]);
      const mu = pick([0.1, 0.2, 0.3, 0.5]);
      const g = 10;
      if (Math.random() < 0.5) {
        const T = T0 + mu * W * g * L;
        return {
          q: `水平で直線の管路区間（長さ ${L} m）に光ファイバケーブルを布設する。入口直前の張力 ${T0} N、ケーブル質量 ${W} kg/m、摩擦係数 ${mu}、重力加速度 10 m/s² のとき、出口での張力は何 N か（整数に四捨五入）。`,
          ...makeChoices(T, [mu * W * g * L, T0 + W * g * L, T0 * Math.exp(mu), T0 + mu * W * L], 0, ' N'),
          steps: `水平・直線では摩擦力の分だけ増える。<br>T = T₀ + μWgL = ${T0} + ${mu} × ${W} × 10 × ${L} = ${T0} + ${fmt(mu * W * g * L, 1)} = <b>${fmt(T, 0)} N</b>`,
        };
      }
      const th = pick([[10, 0.98, 0.17], [15, 0.97, 0.26], [20, 0.94, 0.34], [30, 0.87, 0.5]]);
      const T = T0 + W * g * L * (mu * th[1] + th[2]);
      return {
        q: `傾斜角 ${th[0]} 度の上り坂の区間（長さ ${L} m）でケーブルを上方へ牽引する。下端直前の張力 ${T0} N、ケーブル質量 ${W} kg/m、摩擦係数 ${mu}、重力加速度 10 m/s²、cos${th[0]}° = ${th[1]}、sin${th[0]}° = ${th[2]} のとき、上端での張力は何 N か（整数に四捨五入）。`,
        ...makeChoices(T, [T0 + W * g * L * (mu * th[1] - th[2]), T0 + W * g * L * (mu * th[2] + th[1]), T0 + mu * W * g * L, T0 + W * g * L * th[2]], 0, ' N'),
        steps: `上り坂では「摩擦力（μ × 重さの斜面に垂直な成分）」＋「重さの斜面方向の成分」が加わる。<br>T = T₀ + WgL(μcosθ + sinθ)<br>= ${T0} + ${W} × 10 × ${L} × (${mu} × ${th[1]} + ${th[2]})<br>= ${T0} + ${fmt(W * g * L, 0)} × ${fmt(mu * th[1] + th[2], 3)} = <b>${fmt(T, 0)} N</b><br><small>下り坂なら sinθ の符号がマイナスになる。</small>`,
      };
    },
  },
  {
    id: 'sagT', name: '弛度から張力', past: true,
    gen() {
      const W = pick([0.3, 0.4, 0.5, 0.8, 1.2]);
      const S = pick([30, 40, 50, 60]);
      const d = pick([0.2, 0.3, 0.4, 0.5, 0.6]);
      const T = W * S * S / (8 * d);
      return {
        q: `高低差のない電柱間（スパン長 ${S} m）に、単位長さ当たり荷重 ${W} N/m の架空ケーブルを弛度 ${d} m で架設した。支持点の水平張力 T は何 N か（整数に四捨五入）。`,
        ...makeChoices(T, [W * S * S / (4 * d), W * S / (8 * d), W * S * S / (2 * d), T / 2], 0, ' N'),
        steps: `弛度の式 d = WS²/(8T) を T について解く。<br>T = WS²/(8d) = ${W} × ${S}² / (8 × ${d}) = ${fmt(W * S * S, 1)} / ${fmt(8 * d, 1)} ≈ <b>${fmt(T, 0)} N</b>`,
      };
    },
  },
  {
    id: 'mttr', name: '許容 MTTR', past: true,
    gen() {
      const lam = pick([0.5, 1, 2, 4, 5]);
      const A = pick([0.9, 0.95, 0.98, 0.99]);
      const mtbf = 100 / lam;
      const mttr = mtbf * (1 - A) / A;
      return {
        q: `故障率が ${lam} %/時間の装置で、固有アベイラビリティを ${A * 100} % より大きくするには、MTTR は何時間を超えてはならないか（小数第 1 位まで）。`,
        ...makeChoices(mttr, [mtbf * (1 - A), mtbf / A, mtbf * A / (1 - A) / 100, mttr * 2], 1, ' 時間'),
        steps: `MTBF = 1/λ = 1/${lam / 100} = ${fmt(mtbf, 1)} 時間<br>A = MTBF/(MTBF + MTTR) > ${A} より<br>MTTR < MTBF × (1 − A)/A = ${fmt(mtbf, 1)} × ${fmt(1 - A, 2)}/${A} ≈ <b>${fmt(mttr, 1)} 時間</b>`,
      };
    },
  },
  {
    id: 'avdata', name: '稼働データ', past: true,
    gen() {
      const k = pick([5, 8, 10, 12, 20]);
      const mtbf = pick([100, 150, 200, 250, 500]);
      const mttr = pick([5, 10, 20, 25, 50]);
      const up = k * mtbf, down = k * mttr;
      const A = up / (up + down);
      const t = pick([0.2, 0.4, 1]) * mtbf;
      const e = { 0.2: 1.22, 0.4: 1.49, 1: 2.72 }[t / mtbf];
      const R = 1 / e;
      if (Math.random() < 0.5) {
        return {
          q: `ある装置の稼働状況を調べたところ、故障 ${k} 回、動作時間の合計 ${up.toLocaleString()} 時間、修理による休止時間の合計 ${down.toLocaleString()} 時間であった。固有アベイラビリティは何 % か（整数に四捨五入）。`,
          ...makeChoices(A * 100, [down / up * 100, (1 - down / up) * 100 - 3, up / (up + down / k) * 100], 0, ' %'),
          steps: `MTBF = ${up.toLocaleString()} / ${k} = ${mtbf} h、MTTR = ${down.toLocaleString()} / ${k} = ${mttr} h<br>A = MTBF/(MTBF+MTTR) = ${mtbf}/${mtbf + mttr} ≈ <b>${fmt(A * 100, 0)} %</b>`,
        };
      }
      return {
        q: `ある装置で故障 ${k} 回、動作時間の合計 ${up.toLocaleString()} 時間であった。偶発故障期間にあるとして、稼働開始後 ${t} 時間経過時点の信頼度は何 % か。ただし e^${fmt(t / mtbf, 1)} = ${e} とし、整数に四捨五入する。`,
        ...makeChoices(R * 100, [(1 - R) * 100, e * 10, 100 - t / mtbf * 100 + 5], 0, ' %'),
        steps: `MTBF = ${up.toLocaleString()} / ${k} = ${mtbf} h、λ = 1/${mtbf}<br>R = e^(−λt) = e^(−${t}/${mtbf}) = 1 / e^${fmt(t / mtbf, 1)} = 1/${e} ≈ <b>${fmt(R * 100, 0)} %</b>`,
      };
    },
  },
  {
    id: 'irefl', name: '電流反射係数', past: true,
    gen() {
      const z0 = pick([100, 200, 300, 400, 600]);
      const z1 = pick([z0 / 4, z0 / 2, z0 * 1.5, z0 * 2, z0 * 3].map(Math.round));
      const gv = (z1 - z0) / (z1 + z0);
      return {
        q: `特性インピーダンス ${z0} Ω の一様線路をインピーダンス ${z1} Ω で終端した。接続点における<b>電流</b>反射係数はいくらか（小数第 2 位まで）。`,
        ...fixNeg(-gv, [gv, 2 * z0 / (z1 + z0), 2 * z1 / (z1 + z0), -2 * gv], 2),
        steps: `電圧反射係数 = (Z₁ − Z₀)/(Z₁ + Z₀) = (${z1} − ${z0})/(${z1} + ${z0}) = ${fmt(gv, 2)}<br>電流反射係数は電圧反射係数の<b>符号を反転</b>したもの → <b>${fmt(-gv, 2)}</b>`,
      };
    },
  },
);
