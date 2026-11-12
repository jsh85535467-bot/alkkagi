/* 기억놀이터 - 장보기 계산: 문제 만들기와 단계별 난이도 (화면과 무관한 순수 계산 코드)
   - 한 단계 = 문제 5개. 장보기 상황에서 값을 계산해 보기 중 고른다. 틀려도 벌이 없고 다시 고를 수 있다.
   - 문제는 매번 새로 만들어진다(물건, 값, 개수가 달라짐). 힌트로 계산식을 볼 수 있다(무제한).
   - 별: 틀리게 누른 횟수가 0번이면 3개, 1~2번이면 2개, 그 이상이면 1개
   - 난이도(50단계): 곱하기·더하기(1~5) → 거스름돈·여러 물건(6~12) → 단가 비교·할인(13~20) →
     할인+쿠폰+거스름돈, 평균, 부가세, 원래 값 거꾸로 찾기(21~30) → 여러 단계를 거치는 계산(31~50, 고수 코스) */
(function (root) {
  'use strict';
  var TOTAL = 50;
  var PER_STAGE = 5;

  // [이름, 그림, 단위]
  var ITEMS = [
    ['사과', '🍎', '개'], ['귤', '🍊', '봉지'], ['우유', '🥛', '팩'], ['식빵', '🍞', '봉지'], ['계란', '🥚', '판'],
    ['바나나', '🍌', '송이'], ['배추', '🥬', '포기'], ['고등어', '🐟', '마리'], ['당근', '🥕', '봉지'], ['감자', '🥔', '봉지'],
    ['수박', '🍉', '통'], ['사탕', '🍬', '봉지'], ['휴지', '🧻', '묶음'], ['비누', '🧼', '개'], ['두유', '🥤', '팩'], ['포도', '🍇', '송이'],
    ['참기름', '🍶', '병'], ['오이', '🥒', '봉지'], ['치즈', '🧀', '봉지'], ['커피', '☕', '상자']
  ];
  var MEATS = [['소고기', '🥩'], ['돼지고기', '🥓'], ['닭고기', '🍗'], ['생선살', '🐟']];

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
  function money(rng, r) { return stepPick(rng, r.lo, r.hi, r.step); }
  function bigPrice(rng, r) { return 200 * rint(rng, Math.ceil(r.pLo / 200), Math.floor(r.pHi / 200)); }   // 200원 단위(할인율을 곱해도 딱 떨어짐)
  function pctOf(v, d) { return v * d / 100; }

  /* ---------- 문제 종류 ----------
     각 함수는 { text, answer(숫자), unit('원'이 아니면 단위), hint, traps(헷갈리기 쉬운 틀린 값들) } 를 돌려준다.
     r = 그 단계의 값 범위 설정 */
  var TYPES = {
    qty: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = money(rng, r), q = rint(rng, 2, r.q);
      return {
        text: it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. ' + q + it[2] + ' 값은 모두 얼마일까요?',
        answer: p * q, hint: fmt(p) + '을 ' + q + '번 더하면? (' + fmt(p) + ' × ' + q + ')', traps: [p + q * 100, p * (q + 1), p * (q - 1)]
      };
    },
    sum2: function (rng, r) {
      var it = pickItems(rng, 2), a = money(rng, r), b = money(rng, r);
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + fmt(a) + ', ' + it[1][1] + ' ' + it[1][0] + ' ' + fmt(b) + '. 두 가지를 모두 사면 얼마일까요?',
        answer: a + b, hint: fmt(a) + ' + ' + fmt(b) + ' = ?', traps: [Math.abs(a - b) || a + b + 100]
      };
    },
    sum3: function (rng, r) {
      var it = pickItems(rng, 3), a = money(rng, r), b = money(rng, r), c = money(rng, r);
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + fmt(a) + ', ' + it[1][1] + ' ' + it[1][0] + ' ' + fmt(b) + ', ' + it[2][1] + ' ' + it[2][0] + ' ' + fmt(c) + '. 세 가지를 모두 사면 얼마일까요?',
        answer: a + b + c, hint: '차례로 더해 보세요. ' + fmt(a) + ' + ' + fmt(b) + ' = ' + fmt(a + b) + ', 거기에 ' + fmt(c) + '을 더해요.', traps: [a + b, b + c, a + c]
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
      do { p = money(rng, r); tries++; } while (p * q >= pay && tries < 40);
      if (p * q >= pay) { p = r.lo; q = 2; }
      return {
        text: it[1] + ' ' + it[0] + ' ' + q + it[2] + ' (한 ' + it[2] + '에 ' + fmt(p) + '). 낸 돈은 ' + fmt(pay) + '. 거스름돈은 얼마일까요?',
        answer: pay - p * q, hint: '먼저 값을 구해요. ' + fmt(p) + ' × ' + q + ' = ' + fmt(p * q) + ', 그다음 ' + fmt(pay) + '에서 빼요.', traps: [p * q, pay - p]
      };
    },
    mixed2: function (rng, r) {
      var it = pickItems(rng, 2), p1 = money(rng, r), p2 = money(rng, r), q1 = rint(rng, 2, r.q), q2 = rint(rng, 2, r.q);
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + q1 + it[0][2] + ' (한 ' + it[0][2] + '에 ' + fmt(p1) + '), ' + it[1][1] + ' ' + it[1][0] + ' ' + q2 + it[1][2] + ' (한 ' + it[1][2] + '에 ' + fmt(p2) + '). 모두 얼마일까요?',
        answer: p1 * q1 + p2 * q2,
        hint: fmt(p1) + ' × ' + q1 + ' = ' + fmt(p1 * q1) + ', ' + fmt(p2) + ' × ' + q2 + ' = ' + fmt(p2 * q2) + '. 두 값을 더해요.',
        traps: [p1 + p2, p1 * q1 + p2, p1 + p2 * q2]
      };
    },
    mixed3: function (rng, r) {
      var it = pickItems(rng, 3), p = [money(rng, r), money(rng, r), money(rng, r)], q = [rint(rng, 2, r.q), rint(rng, 1, r.q), rint(rng, 2, r.q)];
      var t = [p[0] * q[0], p[1] * q[1], p[2] * q[2]];
      return {
        text: [0, 1, 2].map(function (i) { return it[i][1] + ' ' + it[i][0] + ' ' + q[i] + it[i][2] + '(한 ' + it[i][2] + '에 ' + fmt(p[i]) + ')'; }).join(', ') + '. 모두 얼마일까요?',
        answer: t[0] + t[1] + t[2],
        hint: '각각 곱해서 더해요. ' + fmt(t[0]) + ' + ' + fmt(t[1]) + ' + ' + fmt(t[2]) + ' = ?',
        traps: [p[0] + p[1] + p[2], t[0] + t[1] + p[2], t[0] + t[1]]
      };
    },
    change2: function (rng, r) {
      var it = pickItems(rng, 2), p1 = money(rng, r), p2 = money(rng, r), q = rint(rng, 2, r.q), pay = pickOne(rng, r.pays), tries = 0;
      while (p1 + p2 * q >= pay && tries++ < 40) { p1 = money(rng, r); p2 = money(rng, r); q = rint(rng, 2, r.q); }
      if (p1 + p2 * q >= pay) { p1 = r.lo; p2 = r.lo; q = 2; }
      var tot = p1 + p2 * q;
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + fmt(p1) + ', ' + it[1][1] + ' ' + it[1][0] + ' ' + q + it[1][2] + '(한 ' + it[1][2] + '에 ' + fmt(p2) + '). 낸 돈은 ' + fmt(pay) + '. 거스름돈은 얼마일까요?',
        answer: pay - tot,
        hint: fmt(p2) + ' × ' + q + ' = ' + fmt(p2 * q) + ', 거기에 ' + fmt(p1) + '을 더하면 ' + fmt(tot) + '. ' + fmt(pay) + '에서 빼요.',
        traps: [tot, pay - p1, pay - p2 * q]
      };
    },
    weight: function (rng, r) {
      var it = pickOne(rng, MEATS), p100 = 100 * rint(rng, 8, 48), g = pickOne(rng, [150, 250, 350, 450, 550, 650]);
      return {
        text: it[1] + ' ' + it[0] + ' 100g에 ' + fmt(p100) + '. ' + g + 'g을 사면 얼마일까요?',
        answer: p100 * g / 100,
        hint: g + 'g은 100g의 ' + (g / 100) + '배예요. ' + fmt(p100) + ' × ' + (g / 100) + ' = ?',
        traps: [p100 * Math.floor(g / 100), p100 * Math.ceil(g / 100), p100 * g / 50]
      };
    },
    bulk: function (rng, r) {
      var it = pickItems(rng, 1)[0], k = rint(rng, 2, 4), m = rint(rng, 2, 3), p = money(rng, r), t = (k + 1) * m;
      return {
        text: it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. "' + k + it[2] + ' 사면 1' + it[2] + ' 덤" 행사 중이에요. 모두 ' + t + it[2] + ' 받으려면 얼마를 내야 할까요?',
        answer: k * m * p,
        hint: (k + 1) + it[2] + '을 받으려면 ' + k + it[2] + ' 값만 내요. 그런 묶음이 ' + m + '번이니 ' + fmt(p) + ' × ' + k + ' × ' + m + ' = ?',
        traps: [t * p, (t - 1) * p, k * p]
      };
    },
    unit: function (rng, r) {
      var it = pickItems(rng, 1)[0], n = rint(rng, 3, 6), m = n + rint(rng, 1, 6), u = money(rng, r), total = u * n;
      return {
        text: it[1] + ' ' + it[0] + ' ' + n + it[2] + '에 ' + fmt(total) + '. 같은 값이면 ' + m + it[2] + '는 얼마일까요?',
        answer: u * m,
        hint: '먼저 한 ' + it[2] + ' 값을 구해요. ' + fmt(total) + ' ÷ ' + n + ' = ' + fmt(u) + ', 그다음 ' + m + '배.',
        traps: [total * m, u * (m - n), u * (m + n)]
      };
    },
    unit2: function (rng, r) {
      var it = pickOne(rng, MEATS), n = rint(rng, 2, 5), m = n + rint(rng, 1, 5), u100 = 100 * rint(rng, 8, 40), total = u100 * n;
      return {
        text: it[1] + ' ' + it[0] + ' ' + (n * 100) + 'g에 ' + fmt(total) + '. 같은 ' + it[0] + ' ' + (m * 100) + 'g은 얼마일까요?',
        answer: u100 * m,
        hint: '100g 값은 ' + fmt(total) + ' ÷ ' + n + ' = ' + fmt(u100) + '. ' + (m * 100) + 'g은 100g의 ' + m + '배예요.',
        traps: [total * m, u100 * n, u100 * (m + n)]
      };
    },
    compare: function (rng, r) {
      var it = pickItems(rng, 1)[0], n1 = rint(rng, 2, 5), n2 = n1 + rint(rng, 1, 3), u1 = money(rng, r), u2 = money(rng, r), tries = 0;
      while (u1 === u2 && tries++ < 20) u2 = money(rng, r);
      var t1 = u1 * n1, t2 = u2 * n2;
      return {
        text: it[1] + ' ' + it[0] + ': 가게 A는 ' + n1 + it[2] + '에 ' + fmt(t1) + ', 가게 B는 ' + n2 + it[2] + '에 ' + fmt(t2) + '. 한 ' + it[2] + '에 더 싼 값은 얼마일까요?',
        answer: Math.min(u1, u2),
        hint: '한 ' + it[2] + ' 값을 각각 구해요. A는 ' + fmt(t1) + ' ÷ ' + n1 + ' = ' + fmt(u1) + ', B는 ' + fmt(t2) + ' ÷ ' + n2 + ' = ' + fmt(u2) + '.',
        traps: [Math.max(u1, u2), Math.abs(u1 - u2) || u1 + 10, Math.min(t1, t2)]
      };
    },
    budget: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = money(rng, r), cnt = rint(rng, 2, r.q), left = rint(rng, 0, 1) ? 0 : stepPick(rng, r.step, p - r.step > r.step ? p - r.step : r.step, r.step);
      if (left >= p) left = 0;
      var pay = p * cnt + left;
      return {
        text: '가진 돈 ' + fmt(pay) + '. ' + it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. 몇 ' + it[2] + '까지 살 수 있을까요?',
        answer: cnt, unit: it[2], hint: fmt(p) + '씩 더해 가며 ' + fmt(pay) + '을 넘지 않는 데까지 세어 보세요.', traps: [cnt + 1, Math.max(1, cnt - 1)]
      };
    },
    budget2: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = money(rng, r), cnt = rint(rng, 2, r.q), left = stepPick(rng, r.step, Math.max(r.step, p - r.step), r.step);
      if (left >= p) left = Math.max(r.step, p - r.step);
      var pay = p * cnt + left;
      return {
        text: '가진 돈 ' + fmt(pay) + '. ' + it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. 가장 많이 산 뒤 남는 돈은 얼마일까요?',
        answer: left,
        hint: fmt(p) + '씩 ' + cnt + it[2] + '을 사면 ' + fmt(p * cnt) + '. ' + fmt(pay) + '에서 빼면 남는 돈이에요. (한 ' + it[2] + ' 더 사려면 ' + fmt(p * (cnt + 1)) + '이 필요해요)',
        traps: [p - left, pay - p, cnt * 100]
      };
    },
    disc: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = bigPrice(rng, r), d = pickOne(rng, [10, 20, 25, 30, 40, 50]), cut = pctOf(p, d);
      return {
        text: it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '인데 ' + d + '% 할인이래요. 할인된 값은 얼마일까요?',
        answer: p - cut, hint: fmt(p) + '의 ' + d + '%는 ' + fmt(cut) + '이에요. ' + fmt(p) + ' − ' + fmt(cut) + ' = ?', traps: [cut, p + cut, p - pctOf(p, d / 2)]
      };
    },
    disc2: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = bigPrice(rng, r), d = pickOne(rng, [10, 20, 25, 30, 40, 50]), q = rint(rng, 2, 4);
      var total = p * q, cut = pctOf(total, d);
      return {
        text: it[1] + ' ' + it[0] + ' ' + q + it[2] + ', 한 ' + it[2] + '에 ' + fmt(p) + '. 전부 ' + d + '% 할인받으면 얼마일까요?',
        answer: total - cut, hint: '먼저 ' + fmt(p) + ' × ' + q + ' = ' + fmt(total) + '. 그 ' + d + '%는 ' + fmt(cut) + '이니 ' + fmt(total) + '에서 빼요.', traps: [total, cut, p * q - pctOf(p, d)]
      };
    },
    disc_stack: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = bigPrice(rng, r), d = pickOne(rng, [10, 20, 25, 30, 40]), after = p - pctOf(p, d), coupon = 100 * rint(rng, 2, 10);
      if (after - coupon < 500) coupon = 300;
      return {
        text: it[1] + ' ' + it[0] + ' 한 ' + it[2] + '에 ' + fmt(p) + '. ' + d + '% 할인된 값에서 다시 ' + fmt(coupon) + ' 쿠폰을 쓰면 낼 돈은 얼마일까요?',
        answer: after - coupon,
        hint: fmt(p) + '의 ' + d + '%는 ' + fmt(pctOf(p, d)) + ' → 할인된 값 ' + fmt(after) + '. 거기서 쿠폰 ' + fmt(coupon) + '을 빼요.',
        traps: [after, p - coupon, after + coupon]
      };
    },
    cart: function (rng, r) {
      var it = pickItems(rng, 2), p1 = 100 * rint(rng, 5, 30), p2 = 100 * rint(rng, 5, 30), q1 = rint(rng, 2, 4), q2 = rint(rng, 2, 4);
      var d = pickOne(rng, [10, 20, 30, 50]), total = p1 * q1 + p2 * q2, due = total - pctOf(total, d), pay = Math.ceil((due + 100) / 5000) * 5000;
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + q1 + it[0][2] + '(한 ' + it[0][2] + '에 ' + fmt(p1) + '), ' + it[1][1] + ' ' + it[1][0] + ' ' + q2 + it[1][2] + '(한 ' + it[1][2] + '에 ' + fmt(p2) + '). 전체 ' + d + '% 할인을 받고 ' + fmt(pay) + '을 냈어요. 거스름돈은 얼마일까요?',
        answer: pay - due,
        hint: '① 값: ' + fmt(p1 * q1) + ' + ' + fmt(p2 * q2) + ' = ' + fmt(total) + ' ② ' + d + '% 할인: ' + fmt(total) + ' − ' + fmt(pctOf(total, d)) + ' = ' + fmt(due) + ' ③ ' + fmt(pay) + ' − ' + fmt(due),
        traps: [pay - total, due, pay - pctOf(total, d)]
      };
    },
    cart3: function (rng, r) {
      var it = pickItems(rng, 3), p = [100 * rint(rng, 5, 40), 100 * rint(rng, 5, 40), 100 * rint(rng, 5, 40)], q = [rint(rng, 2, 4), rint(rng, 1, 3), rint(rng, 2, 5)];
      var t = [p[0] * q[0], p[1] * q[1], p[2] * q[2]], total = t[0] + t[1] + t[2], d = pickOne(rng, [10, 20, 30, 50]), after = total - pctOf(total, d);
      var coupon = 500 * rint(rng, 1, 4), due = after - coupon, pay = Math.ceil((due + 100) / 10000) * 10000;
      return {
        text: [0, 1, 2].map(function (i) { return it[i][1] + ' ' + it[i][0] + ' ' + q[i] + it[i][2] + '(한 ' + it[i][2] + '에 ' + fmt(p[i]) + ')'; }).join(', ') +
          '. ' + d + '% 할인을 받고 ' + fmt(coupon) + ' 쿠폰도 쓴 뒤 ' + fmt(pay) + '을 냈어요. 거스름돈은 얼마일까요?',
        answer: pay - due,
        hint: '① 값: ' + fmt(t[0]) + ' + ' + fmt(t[1]) + ' + ' + fmt(t[2]) + ' = ' + fmt(total) + ' ② ' + d + '% 할인: ' + fmt(after) + ' ③ 쿠폰: ' + fmt(after) + ' − ' + fmt(coupon) + ' = ' + fmt(due) + ' ④ ' + fmt(pay) + ' − ' + fmt(due),
        traps: [pay - after, due, pay - total]
      };
    },
    split2: function (rng, r) {
      var it = pickItems(rng, 2), who = pickOne(rng, [2, 3, 4, 5, 6]), each = 100 * rint(rng, 8, 60), total = each * who;
      var a = 100 * rint(rng, 5, Math.floor(total / 100) - 5), b = total - a;
      return {
        text: it[0][1] + ' ' + it[0][0] + ' ' + fmt(a) + ', ' + it[1][1] + ' ' + it[1][0] + ' ' + fmt(b) + '. 합친 값을 ' + who + '명이 똑같이 나눠 내면 한 사람은 얼마일까요?',
        answer: each,
        hint: '먼저 더해요. ' + fmt(a) + ' + ' + fmt(b) + ' = ' + fmt(total) + '. 그다음 ' + who + '로 나눠요.',
        traps: [total, Math.floor(a / who), total - each]
      };
    },
    tax: function (rng, r) {
      var it = pickItems(rng, 1)[0], p = 100 * rint(rng, 20, 160), q = rint(rng, 1, 3), base = p * q;
      return {
        text: it[1] + ' ' + it[0] + ' ' + q + it[2] + '(한 ' + it[2] + '에 ' + fmt(p) + '). 부가세 10%가 따로 붙어요. 모두 얼마를 내야 할까요?',
        answer: base + base / 10,
        hint: '값 ' + fmt(base) + '의 10%는 ' + fmt(base / 10) + '이에요. ' + fmt(base) + ' + ' + fmt(base / 10) + ' = ?',
        traps: [base / 10, base - base / 10, base + base / 100]
      };
    },
    avg: function (rng, r) {
      var n = rint(rng, 4, 5), A = 100 * rint(rng, 30, 120), vals = [], sum = 0, i;
      for (i = 0; i < n - 1; i++) { var dev = 100 * rint(rng, -Math.floor(A / 300), Math.floor(A / 300)); vals.push(A + dev); sum += A + dev; }
      vals.push(A * n - sum);
      if (vals[n - 1] < 1000) { vals[n - 1] = A; vals[0] = A * n - (sum - vals[0]) - A; }
      var total = vals.reduce(function (x, y) { return x + y; }, 0);
      return {
        text: n + '일 동안 장 본 돈이 ' + vals.map(function (v) { return fmt(v); }).join(', ') + '이에요. 하루 평균은 얼마일까요?',
        answer: total / n,
        hint: '모두 더하면 ' + fmt(total) + '. ' + n + '일로 나눠요. (' + fmt(total) + ' ÷ ' + n + ')',
        traps: [total, Math.round(total / (n - 1) / 10) * 10, Math.round(total / (n + 1) / 10) * 10]
      };
    },
    orig: function (rng, r) {
      var it = pickItems(rng, 1)[0], d = pickOne(rng, [20, 25, 40, 50]), o = 400 * rint(rng, 5, 40), sale = o - pctOf(o, d);
      return {
        text: it[1] + ' ' + it[0] + ' 값을 ' + d + '% 할인받아 ' + fmt(sale) + '에 샀어요. 할인 전 원래 값은 얼마였을까요?',
        answer: o,
        hint: d + '% 깎았으니 원래 값의 ' + (100 - d) + '%가 ' + fmt(sale) + '이에요. 원래 값의 1%는 ' + fmt(sale / (100 - d)) + ' → 100%는 ' + fmt(o) + '.',
        traps: [Math.round(sale * (100 + d) / 100 / 100) * 100, sale + 1000, o + 1000]
      };
    }
  };

  // 단계별 설정: 어떤 종류의 문제를, 어떤 값 범위로 낼지, 보기 개수
  var BASE_R = { lo: 450, hi: 4800, step: 10, q: 6, pays: [20000, 30000, 50000], pLo: 1200, pHi: 12000 };
  var BANDS = [
    [2,  ['qty', 'sum2'], { lo: 200, hi: 900, step: 50, q: 4 }],
    [5,  ['qty', 'sum2', 'change'], { lo: 300, hi: 2500, step: 50, q: 5, pays: [2000, 5000] }],
    [8,  ['sum3', 'combo', 'mixed2'], { lo: 350, hi: 3500, step: 50, q: 5, pays: [10000, 20000] }],
    [12, ['mixed2', 'change2', 'weight', 'bulk'], BASE_R],
    [16, ['unit', 'budget2', 'disc', 'compare', 'mixed3'], BASE_R],
    [20, ['disc', 'disc_stack', 'weight', 'compare', 'change2'], BASE_R],
    [25, ['disc2', 'cart', 'split2', 'budget2', 'disc_stack'], BASE_R],
    [30, ['cart', 'disc_stack', 'split2', 'unit2', 'tax', 'avg'], BASE_R],
    [35, ['cart', 'cart3', 'orig', 'avg', 'unit2', 'tax'], BASE_R],
    [40, ['cart3', 'orig', 'avg', 'split2', 'disc_stack', 'unit2'], BASE_R],
    [45, ['cart3', 'orig', 'avg', 'tax', 'disc_stack', 'cart'], BASE_R],
    [50, ['cart3', 'cart3', 'orig', 'avg', 'unit2', 'split2'], BASE_R]
  ];
  function config(stage) {
    var s = Math.max(1, Math.min(TOTAL, stage | 0)), band = BANDS[BANDS.length - 1];
    for (var i = 0; i < BANDS.length; i++) if (s <= BANDS[i][0]) { band = BANDS[i]; break; }
    return { stage: s, types: band[1], r: band[2], options: s <= 2 ? 3 : s <= 8 ? 4 : 5 };
  }

  function label(n, unit) { return unit ? n + unit : fmt(n); }

  // 보기: 정답과 헷갈리기 쉬운 값(traps) + 정답 근처 값으로 채운다. 단계가 높을수록 근처 값이 더 가깝다.
  function makeOptions(q, count, rng, stage) {
    var a = q.answer, unit;
    if (q.unit) unit = 1;
    else if (stage <= 8) unit = a % 1000 === 0 ? 1000 : a % 500 === 0 ? 500 : a % 100 === 0 ? 100 : a % 50 === 0 ? 50 : 10;
    else unit = a % 1000 === 0 ? 500 : a % 100 === 0 ? 100 : a % 50 === 0 ? 50 : 10;
    var pool = [], seen = {};
    seen[a] = true;
    (q.traps || []).forEach(function (t) { t = Math.round(t); if (t > 0 && !seen[t]) { seen[t] = true; pool.push(t); } });
    shuffle([-3, -2, -1, 1, 2, 3, 4], rng).forEach(function (k) { var v = a + k * unit; if (v > 0 && !seen[v]) { seen[v] = true; pool.push(v); } });
    var extra = 5;
    while (pool.length < count - 1) { var v2 = a + (extra++) * unit; if (!seen[v2]) { seen[v2] = true; pool.push(v2); } }
    return shuffle(shuffle(pool, rng).slice(0, count - 1).concat([a]), rng);
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
      do { q = TYPES[order[i]](rng, cfg.r); tries++; } while (texts[q.text] && tries < 300);
      texts[q.text] = true;
      var opts = makeOptions(q, cfg.options, rng, cfg.stage);
      out.push({
        text: q.text, hint: q.hint, answer: q.answer, unit: q.unit || null,
        options: opts, labels: opts.map(function (v) { return label(v, q.unit); }), answerIndex: opts.indexOf(q.answer)
      });
    }
    return out;
  }

  function starsFor(mistakes) { return mistakes <= 0 ? 3 : mistakes <= 2 ? 2 : 1; }

  var api = { TOTAL: TOTAL, PER_STAGE: PER_STAGE, ITEMS: ITEMS, TYPES: TYPES, config: config, generate: generate, starsFor: starsFor, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkShop = api;
})(typeof window !== 'undefined' ? window : this);
