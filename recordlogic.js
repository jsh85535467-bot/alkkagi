/* 기억놀이터 - 나의 기록: 계산 (화면과 무관한 순수 코드)
   판마다 쌓인 기록(log)에서 연속 놀이 일수, 달력, 게임별 놀이 점수를 계산한다.
   ※ 점수는 "얼마나 높은 단계를 얼마나 깔끔하게 깼는지"를 보여 주는 놀이 기록일 뿐, 검사나 진단이 아니다. */
(function (root) {
  'use strict';
  var GAMES = ['a', 's', 'm', 'p', 'c'];
  var NAMES = { a: '추억의 알까기', s: '순서 기억하기', m: '길 찾기', p: '속담 완성', c: '장보기 계산' };
  var AXES = { s: '기억력', m: '방향감각', a: '집중·계획', p: '언어력', c: '계산력' };   // 레이더 그래프의 다섯 갈래
  var WINDOW = 10;       // 점수는 최근 10판으로 계산
  var MIN_PLAYS = 3;     // 3판 이상 해야 점수를 보여 준다
  var MAX_POINTS = 6;    // 한 판 최고점: 별 3개 × 가중치 2(최고 단계)

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function dayCounts(log) {
    var c = {};
    for (var i = 0; i < log.length; i++) { var k = dayKey(log[i].t); c[k] = (c[k] || 0) + 1; }
    return c;
  }

  // 연속 놀이 일수: 오늘 놀았으면 오늘부터, 아직 안 놀았으면 어제부터 거꾸로 센다(오늘 안 했다고 바로 끊기지 않게)
  function streak(log, now) {
    var c = dayCounts(log), d = new Date(now);
    d.setHours(12, 0, 0, 0);
    if (!c[dayKey(d.getTime())]) {
      d.setDate(d.getDate() - 1);
      if (!c[dayKey(d.getTime())]) return 0;
    }
    var n = 0;
    while (c[dayKey(d.getTime())]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // 최근 7일(오늘 포함) 중 놀이한 날 수
  function weekDays(log, now) {
    var c = dayCounts(log), d = new Date(now), n = 0;
    d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 7; i++) { if (c[dayKey(d.getTime())]) n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function todayPlays(log, now) { return dayCounts(log)[dayKey(now)] || 0; }

  // 달력: month 는 0~11. 일요일부터 시작하는 주 단위 표
  function monthGrid(year, month, log, now) {
    var c = dayCounts(log), first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate();
    var today = dayKey(now), cells = [], i;
    for (i = 0; i < first; i++) cells.push(null);
    for (var d = 1; d <= days; d++) {
      var key = year + '-' + pad(month + 1) + '-' + pad(d);
      cells.push({ d: d, plays: c[key] || 0, today: key === today });
    }
    while (cells.length % 7) cells.push(null);
    var weeks = [];
    for (i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { year: year, month: month, weeks: weeks, playedDays: Object.keys(c).filter(function (k) { return k.indexOf(year + '-' + pad(month + 1) + '-') === 0; }).length };
  }

  // 높은 단계를 깬 판에 더 점수를 준다(1단계 ×1.0 ~ 30단계 ×2.0, 고수 코스는 더 높게). 안 그러면 단계가 오를수록 별이 줄어 점수가 떨어져 보인다
  function weight(stage) { return 1 + (Math.max(1, Math.min(50, stage)) - 1) / 29; }
  function points(e) { return e.r * weight(e.s); }
  function score(entries) {
    if (!entries.length) return null;
    var sum = 0;
    for (var i = 0; i < entries.length; i++) sum += points(entries[i]);
    return Math.min(100, Math.round(sum / entries.length / MAX_POINTS * 100));   // 고수 코스에서는 100점이 만점
  }

  function gameEntries(log, g) { return log.filter(function (e) { return e.g === g; }); }

  // recent: 최근 10판 점수(3판 미만이면 null). first: 처음 10판 점수(겹치지 않게 20판 이상일 때만)
  function gameScore(log, g) {
    var e = gameEntries(log, g);
    return {
      plays: e.length,
      recent: e.length >= MIN_PLAYS ? score(e.slice(-WINDOW)) : null,
      first: e.length >= WINDOW * 2 ? score(e.slice(0, WINDOW)) : null
    };
  }

  // 게임별 진행 요약: 깬 단계 수, 별 합계, 가장 높이 깬 단계, 마지막 놀이 시각
  function progress(stars, log, g) {
    var cleared = 0, sum = 0, top = 0;
    for (var i = 0; i < stars.length; i++) { if (stars[i] > 0) { cleared++; top = i + 1; } sum += stars[i]; }
    var e = gameEntries(log, g);
    return { cleared: cleared, stars: sum, top: top, last: e.length ? e[e.length - 1].t : null };
  }

  function recent(log, k) { return log.slice(Math.max(0, log.length - k)).reverse(); }

  var api = {
    GAMES: GAMES, NAMES: NAMES, AXES: AXES, WINDOW: WINDOW, MIN_PLAYS: MIN_PLAYS,
    dayKey: dayKey, dayCounts: dayCounts, streak: streak, weekDays: weekDays, todayPlays: todayPlays, monthGrid: monthGrid,
    weight: weight, points: points, score: score, gameScore: gameScore, progress: progress, recent: recent
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkRecord = api;
})(typeof window !== 'undefined' ? window : this);
