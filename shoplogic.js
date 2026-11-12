/* 기억놀이터 - 장보기 계산: 문제 만들기와 단계별 난이도 (화면과 무관한 순수 계산 코드)
   - 한 단계 = 문제 5개. 장보기 상황에서 값을 계산해 보기 중 고른다. 틀려도 벌이 없고 다시 고를 수 있다.
   - 문제는 매번 새로 만들어진다(물건, 값, 개수가 달라짐). 힌트로 계산식을 볼 수 있다(무제한).
   - 별: 틀리게 누른 횟수가 0번이면 3개, 1~2번이면 2개, 그 이상이면 1개
   - 쉬운 곱셈·덧셈(1~10) → 거스름돈, 세 가지 합계(11~20) → 몇 개까지 살 수 있나, 할인(21~30) */
(function (root) {
  'use strict';
  var TOTAL = 30;
  var PER_STAGE = 5;

  // [이름, 그림, 단위]
  var ITEMS = [
    ['사과', '🍎', '개'], ['귤', '🍊', '봉지'], ['우유', '🥛', '팩'], ['식빵', '🍞', '봉지'], ['계란', '🥚', '판'],
    ['바나나', '🍌', '송이'], ['배추', '🥬', '포기'], ['고등어', '🐟', '마리'], ['당근', '🥕', '봉지'], ['감자', '🥔', '봉지'],
    ['수박', '🍉', '통'], ['사탕', '🍬', '봉지'], ['휴지', '🧻', '묶음'], ['비누', '🧼', '개'], ['소고기', '🥩', '근'], ['포도', '🍇', '송이']
  ];

  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }
  function rint(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function stepPick(rng, lo, hi, step) { return lo + step * Math.floor(rng() * ((hi - lo) / step + 1)); }
  function pickOne(rng, list) { return list[Math.floor(rng() * list.length)]; }
  function shuffle(a, rng) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pickItems(rng, k) { return shuffle(ITEMS, rng).slice(0, k); }

  /* ---------- 문제 종류 ----------
     각 함수는 { text, answer(숫자), unit('원'|'단위'), hint, traps(헷갈리기 쉬운 틀린 값들) } 를 돌려준다.
     r = 그 단계의 값 범위 설정 */
  var TYPES = {
    qty: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = stepPick(rng, r.lo, r.hi, r.step), q = rint(rng, 2, r.q);
      return {
        text: it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. ' + q + it[2] + ' 값은 모두 얼마일까요?',
        answer: p * q, hint: fmt(p) + '을 ' + q + '번 더하면? (' + fmt(p) + ' × ' + q + ')', traps: [p + q * 100, p * (q + 1)]
      };
    },
    sum2: function (rng, r) {
      var it = pickItems(rng, 2), a = stepPick(rng, r.lo, r.hi, r.step), b = stepPick(rng, r.lo, r.hi, r.step);
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + fmt(a) + ', ' + it[1][1] + ' ' + it[1][0] + ' ' + fmt(b) + '. 두 가지를 모두 사면 얼마일까요?',
        answer: a + b, hint: fmt(a) + ' + ' + fmt(b) + ' = ?', traps: [Math.abs(a - b) || a + b + 100]
      };
    },
    sum3: function (rng, r) {
      var it = pickItems(rng, 3), a = stepPick(rng, r.lo, r.hi, r.step), b = stepPick(rng, r.lo, r.hi, r.step), c = stepPick(rng, r.lo, r.hi, r.step);
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + fmt(a) + ', ' + it[1][1] + ' ' + it[1][0] + ' ' + fmt(b) + ', ' + it[2][1] + ' ' + it[2][0] + ' ' + fmt(c) + '. 세 가지를 모두 사면 얼마일까요?',
        answer: a + b + c, hint: '차례로 더해 보세요. ' + fmt(a) + ' + ' + fmt(b) + ' = ' + fmt(a + b) + ', 거기에 ' + fmt(c) + '을 더해요.', traps: [a + b, b + c]
      };
    },
    change: function (rng, r) {
      var it = pickItems(rng, 1)[0], pay = pickOne(rng, r.pays), p = stepPick(rng, r.lo, Math.min(r.hi, pay - r.step), r.step);
      return {
        text: it[1] + ' ' + it[0] + ' ' + fmt(p) + '짜리를 사고 ' + fmt(pay) + '을 냈어요. 거스름돈은 얼마일까요?',
        answer: pay - p, hint: fmt(pay) + ' − ' + fmt(p) + ' = ?', traps: [p, pay + p]
      };
    },
    combo: function (rng, r) {
      var it = pickItems(rng, 1)[0], pay = pickOne(rng, r.pays), q = rint(rng, 2, r.q), p, tries = 0;
      do { p = stepPick(rng, r.lo, r.hi, r.step); tries++; } while (p * q >= pay && tries < 40);
      if (p * q >= pay) p = r.lo, q = 2;
      return {
        text: it[1] + ' ' + it[0] + ' ' + q + it[2] + ' (한 ' + it[2] + '에 ' + fmt(p) + '). 낸 돈은 ' + fmt(pay) + '. 거스름돈은 얼마일까요?',
        answer: pay - p * q, hint: '먼저 값을 구해요. ' + fmt(p) + ' × ' + q + ' = ' + fmt(p * q) + ', 그다음 ' + fmt(pay) + '에서 빼요.', traps: [p * q, pay - p]
      };
    },
    budget: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = stepPick(rng, r.lo, r.hi, r.step), cnt = rint(rng, 2, r.q), left = rint(rng, 0, 1) ? 0 : stepPick(rng, r.step, p - r.step > r.step ? p - r.step : r.step, r.step);
      if (left >= p) left = 0;
      var pay = p * cnt + left;
      return {
        text: '가진 돈 ' + fmt(pay) + '. ' + it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. 몇 ' + it[2] + '까지 살 수 있을까요?',
        answer: cnt, unit: it[2], hint: fmt(p) + '씩 더해 가며 ' + fmt(pay) + '을 넘지 않는 데까지 세어 보세요.', traps: [cnt + 1, Math.max(1, cnt - 1)]
      };
    },
    disc: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = pickOne(rng, r.prices), d = pickOne(rng, [10, 20, 50]);
      var cut = p * d / 100;
      return {
        text: it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '인데 ' + d + '% 할인이래요. 할인된 값은 얼마일까요?',
        answer: p - cut, hint: fmt(p) + '의 ' + d + '%는 ' + fmt(cut) + '이에요. ' + fmt(p) + ' − ' + fmt(cut) + ' = ?', traps: [cut, p + cut]
      };
    },
    disc2: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = pickOne(rng, r.prices), d = pickOne(rng, [10, 20, 50]), q = rint(rng, 2, 3);
      var total = p * q, cut = total * d / 100;
      return {
        text: it[1] + ' ' + it[0] + ' ' + q + it[2] + ', 한 ' + it[2] + '에 ' + fmt(p) + '. 전부 ' + d + '% 할인받으면 얼마일까요?',
        answer: total - cut, hint: '먼저 ' + fmt(p) + ' × ' + q + ' = ' + fmt(total) + '. 그 ' + d + '%는 ' + fmt(cut) + '이니 ' + fmt(total) + '에서 빼요.', traps: [total, cut]
      };
    },
    split: function (rng, r) {
      var it = pickItems(rng, 1)[0], who = pickOne(rng, [2, 3, 4, 5]), each = stepPick(rng, r.lo, r.hi, r.step);
      var total = each * who;
      return {
        text: it[1] + ' ' + it[0] + ' 값이 모두 ' + fmt(total) + '. ' + who + '명이 똑같이 나눠 내면 한 사람은 얼마일까요?',
        answer: each, hint: fmt(total) + '을 ' + who + '명이 나누어요. (' + fmt(total) + ' ÷ ' + who + ')', traps: [total - each, each * 2]
      };
    }
  };

  // 단계별 설정: 어떤 종류의 문제를, 어떤 값 범위로 낼지, 보기 개수
  function config(stage) {
    var s = Math.max(1, Math.min(TOTAL, stage | 0)), c;
    if (s <= 3)       c = { types: ['qty', 'sum2'], r: { lo: 100, hi: 500, step: 100, q: 3 } };
    else if (s <= 6)  c = { types: ['qty', 'sum2', 'change'], r: { lo: 100, hi: 900, step: 100, q: 4, pays: [1000] } };
    else if (s <= 10) c = { types: ['sum2', 'change', 'qty'], r: { lo: 500, hi: 2500, step: 100, q: 4, pays: [2000, 5000] } };
    else if (s <= 15) c = { types: ['sum3', 'combo', 'change'], r: { lo: 300, hi: 2000, step: 100, q: 4, pays: [5000, 10000] } };
    else if (s <= 20) c = { types: ['budget', 'combo', 'sum3'], r: { lo: 500, hi: 3500, step: 100, q: 6, pays: [10000, 20000] } };
    else if (s <= 25) c = { types: ['disc', 'combo', 'budget'], r: { lo: 700, hi: 4500, step: 100, q: 7, pays: [20000, 30000], prices: [1000, 2000, 3000, 4000, 5000, 8000, 10000] } };
    else              c = { types: ['disc2', 'split', 'combo', 'budget', 'disc'], r: { lo: 1000, hi: 6000, step: 500, q: 7, pays: [30000, 50000], prices: [2000, 3000, 4000, 5000, 8000, 10000, 15000, 20000] } };
    return { stage: s, types: c.types, r: c.r, options: s <= 5 ? 3 : 4 };
  }

  function label(n, unit) { return unit ? n + unit : fmt(n); }

  // 보기: 정답과 헷갈리기 쉬운 값(traps) + 정답 근처 값으로 채운다
  function makeOptions(q, count, rng) {
    var a = q.answer, unit = q.unit ? 1 : (a % 1000 === 0 ? 1000 : a % 500 === 0 ? 500 : 100);
    var pool = [], seen = {};
    seen[a] = true;
    (q.traps || []).forEach(function (t) { if (t > 0 && !seen[t]) { seen[t] = true; pool.push(t); } });
    var near = shuffle([-3, -2, -1, 1, 2, 3], rng);
    near.forEach(function (k) { var v = a + k * unit; if (v > 0 && !seen[v]) { seen[v] = true; pool.push(v); } });
    var extra = 4;
    while (pool.length < count - 1) { var v2 = a + (extra++) * unit; if (!seen[v2]) { seen[v2] = true; pool.push(v2); } }
    var chosen = shuffle(pool, rng).slice(0, count - 1);
    var opts = shuffle(chosen.concat([a]), rng);
    return opts;
  }

  // 한 단계 문제 만들기. 같은 글이 한 단계에 두 번 나오지 않는다.
  function generate(stage, rng) {
    rng = rng || Math.random;
    var cfg = config(stage), out = [], texts = {}, tries = 0;
    var order = [], i;
    for (i = 0; i < PER_STAGE; i++) order.push(cfg.types[i % cfg.types.length]);
    order = shuffle(order, rng);
    for (i = 0; i < PER_STAGE; i++) {
      var q;
      do { q = TYPES[order[i]](rng, cfg.r); tries++; } while (texts[q.text] && tries < 200);
      texts[q.text] = true;
      var opts = makeOptions(q, cfg.options, rng);
      out.push({
        text: q.text, hint: q.hint, answer: q.answer, unit: q.unit || null,
        options: opts, labels: opts.map(function (v) { return label(v, q.unit); }), answerIndex: opts.indexOf(q.answer)
      });
    }
    return out;
  }

  function starsFor(mistakes) { return mistakes <= 0 ? 3 : mistakes <= 2 ? 2 : 1; }

  var api = { TOTAL: TOTAL, PER_STAGE: PER_STAGE, ITEMS: ITEMS, config: config, generate: generate, starsFor: starsFor, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkShop = api;
})(typeof window !== 'undefined' ? window : this);
