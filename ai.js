/* 추억의 알까기 - 상대(AI)와 힌트 계산
   후보 샷을 실제로 시뮬레이션해서 가장 좋은 샷을 고르고,
   단계가 낮을수록 고르는 폭이 좁고 조준이 흔들리게 만든다. */
(function (root) {
  'use strict';
  var P = (typeof module !== 'undefined' && module.exports) ? require('./physics.js') : root.AlkPhys;
  var C = P.C;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function gauss(rng) {
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function runSettled(w, maxSteps) {
    for (var i = 0; i < maxSteps; i++) {
      P.step(w, C.DT);
      if (i % 6 === 5 && P.isSettled(w)) break;
    }
  }

  function edgeDanger(s) {
    var e = Math.min(s.x, C.S - s.x, s.y, C.S - s.y);
    return Math.max(0, 100 - e) / 100;
  }

  function evaluate(world, team, c) {
    var w = P.cloneWorld(world);
    var shooter = w.stones[c.id];
    P.shoot(shooter, c.angle, c.power);
    var own0 = P.aliveCount(w, team), foe0 = P.aliveCount(w, 1 - team);
    runSettled(w, 1800);
    var removed = foe0 - P.aliveCount(w, 1 - team);
    var lost = own0 - P.aliveCount(w, team);
    var dFoe = 0, dOwn = 0;
    for (var i = 0; i < w.stones.length; i++) {
      var s = w.stones[i];
      if (!s.alive) continue;
      if (s.team === team) dOwn += edgeDanger(s); else dFoe += edgeDanger(s);
    }
    return 100 * removed - 120 * lost + 25 * (dFoe - 1.2 * dOwn);
  }

  function candidates(world, team) {
    var own = [], foes = [], out = [], i, j;
    for (i = 0; i < world.stones.length; i++) {
      var s = world.stones[i];
      if (!s.alive) continue;
      (s.team === team ? own : foes).push(s);
    }
    var offs = [-0.06, 0, 0.06], pows = [0.5, 0.75, 1.0];
    for (i = 0; i < own.length; i++) {
      for (j = 0; j < foes.length; j++) {
        var base = Math.atan2(foes[j].y - own[i].y, foes[j].x - own[i].x);
        for (var a = 0; a < offs.length; a++)
          for (var p = 0; p < pows.length; p++)
            out.push({ id: own[i].id, angle: base + offs[a], power: pows[p] });
      }
    }
    return out;
  }

  // opts: { level: 0~1, perfect: true면 실수 없이 최선의 샷(힌트용), rng }
  function chooseShot(world, team, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var level = opts.level == null ? 1 : opts.level;
    var perfect = !!opts.perfect;
    var cands = candidates(world, team);
    if (!cands.length) return null;

    var pick;
    var pRandom = perfect ? 0 : lerp(0.4, 0, Math.min(1, level * 3));
    if (rng() < pRandom) {
      pick = cands[Math.floor(rng() * cands.length)];
    } else {
      var pool = cands;
      if (!perfect) {
        var m = Math.max(3, Math.round(cands.length * lerp(0.06, 1, level)));
        pool = cands.slice();
        for (var i = pool.length - 1; i > 0; i--) {
          var k = Math.floor(rng() * (i + 1));
          var t = pool[i]; pool[i] = pool[k]; pool[k] = t;
        }
        pool = pool.slice(0, m);
      }
      var best = -1e9;
      for (var q = 0; q < pool.length; q++) {
        var sc = evaluate(world, team, pool[q]) + rng() * 3;
        if (sc > best) { best = sc; pick = pool[q]; }
      }
    }

    var angle = pick.angle, power = pick.power;
    if (!perfect) {
      var sa = lerp(0.28, 0.012, Math.pow(level, 0.7));
      var sp = lerp(0.30, 0.03, level);
      angle += gauss(rng) * sa;
      power = Math.max(0.15, Math.min(1, power * (1 + gauss(rng) * sp)));
    }
    return { id: pick.id, angle: angle, power: power };
  }

  var api = { chooseShot: chooseShot, evaluate: evaluate, candidates: candidates, runSettled: runSettled };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkAI = api;
})(typeof window !== 'undefined' ? window : this);
