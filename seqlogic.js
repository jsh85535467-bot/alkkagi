/* 기억놀이터 - 순서 기억하기: 규칙과 난이도 (화면과 무관한 순수 계산 코드)
   - 한 단계 = 새와 색깔 버튼이 차례로 반짝이는 순서를 보고, 그대로 따라 누르기
   - 틀려도 벌은 없고, 같은 순서를 다시 보여 준다(다시 본 횟수로 별 개수가 정해진다) */
(function (root) {
  'use strict';
  var TOTAL = 50;   // 31~50단계는 고수 코스

  // 단계별 설정: 버튼 수, 외울 개수, 거꾸로 누르기 여부
  function config(stage) {
    var s = Math.max(1, Math.min(TOTAL, stage | 0));
    var pads, len, reverse = false;
    if (s <= 5)        { pads = 3; len = [2, 3, 3, 4, 4][s - 1]; }
    else if (s <= 15)  { pads = 4; len = [3, 3, 4, 4, 4, 5, 5, 5, 6, 6][s - 6]; }
    else if (s <= 25)  { pads = 6; len = [4, 4, 5, 5, 5, 6, 6, 7, 7, 8][s - 16]; }
    else if (s <= 30) { pads = 6; len = [3, 4, 4, 5, 5][s - 26]; reverse = true; }
    // 고수 코스: 31~40 바로 따라 누르기(길어짐), 41~50 거꾸로 누르기(길어짐)
    else if (s <= 40)  { pads = 6; len = [5, 6, 6, 7, 7, 8, 8, 9, 9, 10][s - 31]; }
    else               { pads = 6; len = [4, 5, 5, 6, 6, 7, 7, 8, 8, 9][s - 41]; reverse = true; }
    return { stage: s, pads: pads, length: len, reverse: reverse };
  }

  // 새 순서 만들기: 같은 버튼이 세 번 연속 나오지 않게, 전부 똑같은 순서도 피한다
  function generate(pads, length, rng) {
    rng = rng || Math.random;
    var seq = [], i;
    for (i = 0; i < length; i++) {
      var r = Math.floor(rng() * pads);
      if (i >= 2 && seq[i - 1] === r && seq[i - 2] === r) r = (r + 1 + Math.floor(rng() * (pads - 1))) % pads;
      seq.push(r);
    }
    var allSame = seq.every(function (v) { return v === seq[0]; });
    if (allSame && length > 1) seq[length - 1] = (seq[length - 1] + 1) % pads;
    return seq;
  }

  // 틀려서 다시 도전할 때의 새 순서: 직전 순서와 절반 이상 자리가 다르게 만든다(같은 순서가 나오지 않는다)
  function distance(a, b) {
    var d = 0;
    for (var i = 0; i < a.length; i++) if (!b || a[i] !== b[i]) d++;
    return d;
  }
  function generateDifferent(pads, length, rng, prev) {
    var need = Math.max(1, Math.floor(length / 2)), best = null, bestDist = -1;
    for (var t = 0; t < 80; t++) {
      var s = generate(pads, length, rng), d = distance(s, prev);
      if (d >= need) return s;
      if (d > bestDist) { best = s; bestDist = d; }
    }
    return best;
  }

  function expected(seq, reverse) { return reverse ? seq.slice().reverse() : seq.slice(); }

  // 지금까지 누른 것(input)이 맞는지: 'ok'(아직 가는 중), 'done'(다 맞힘), 'wrong'(틀림)
  function check(seq, reverse, input) {
    var exp = expected(seq, reverse);
    for (var i = 0; i < input.length; i++) if (input[i] !== exp[i]) return 'wrong';
    return input.length === exp.length ? 'done' : 'ok';
  }

  function starsFor(replays) { return replays <= 0 ? 3 : replays === 1 ? 2 : 1; }

  // 보여 주는 속도(밀리초): 켜져 있는 시간, 다음 것까지 쉬는 시간
  var SPEEDS = { slow: { on: 1000, gap: 450 }, normal: { on: 750, gap: 350 }, fast: { on: 520, gap: 250 } };
  function speed(name) { return SPEEDS[name] || SPEEDS.slow; }

  var api = { TOTAL: TOTAL, config: config, generate: generate, generateDifferent: generateDifferent, distance: distance, expected: expected, check: check, starsFor: starsFor, speed: speed, SPEEDS: SPEEDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkSeq = api;
})(typeof window !== 'undefined' ? window : this);
