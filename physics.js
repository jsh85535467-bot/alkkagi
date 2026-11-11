/* 추억의 알까기 - 물리 엔진 (화면과 무관한 순수 계산 코드) */
(function (root) {
  'use strict';

  var C = {
    S: 640,            // 판 한 변의 길이
    R: 38,             // 돌 반지름(큼직하게: 눈과 손가락이 편하도록)
    VMAX: 1500,        // 최대 발사 속도
    PULL_CAP: 150,     // 최대 세기에 해당하는 당기는 거리
    DT: 1 / 240,       // 계산 간격(초)
    TOTAL: 30,         // 전체 단계 수
    E_STONE: 0.93,     // 돌끼리 튕김 정도
    E_ROCK: 0.6,       // 바위에 튕김 정도
    STOP: 6,           // 이 속도 미만이면 멈춤
    MU: 80             // 바닥 마찰(일정 감속)
  };

  function lerp(a, b, t) { return a + (b - a) * t; }

  // 단계별 설정: 돌 개수, 상대 실력(0~1), 미끄러움, 바위
  function stageConfig(stage) {
    var t = (stage - 1) / (C.TOTAL - 1);
    var n = stage <= 5 ? 3 : stage <= 12 ? 4 : stage <= 20 ? 5 : 6;
    var rocks = [];
    if (stage >= 16 && stage < 24) rocks = [{ x: 320, y: 320, r: 34 }];
    else if (stage >= 24) rocks = [{ x: 200, y: 320, r: 32 }, { x: 440, y: 320, r: 32 }];
    return { stage: stage, n: n, level: t, k: lerp(2.1, 1.7, t), rocks: rocks };
  }

  function createWorld(stage) {
    var cfg = stageConfig(stage);
    var stones = [];
    var id = 0;
    var x0 = 110, x1 = C.S - 110;
    for (var team = 0; team < 2; team++) {
      for (var i = 0; i < cfg.n; i++) {
        var x = cfg.n === 1 ? C.S / 2 : x0 + (x1 - x0) * i / (cfg.n - 1);
        stones.push({ id: id++, team: team, x: x, y: team === 0 ? C.S - 110 : 110, vx: 0, vy: 0, alive: true });
      }
    }
    return { stones: stones, rocks: cfg.rocks, k: cfg.k, mu: C.MU, cfg: cfg };
  }

  function cloneWorld(w) {
    return {
      stones: w.stones.map(function (s) {
        return { id: s.id, team: s.team, x: s.x, y: s.y, vx: s.vx, vy: s.vy, alive: s.alive };
      }),
      rocks: w.rocks, k: w.k, mu: w.mu
    };
  }

  function shoot(s, angle, power) {
    var p = Math.max(0, Math.min(1, power));
    s.vx = Math.cos(angle) * p * C.VMAX;
    s.vy = Math.sin(angle) * p * C.VMAX;
  }

  // dt초만큼 시간을 진행시키고, 일어난 일(부딪힘/탈락)을 돌려준다
  function step(w, dt) {
    var ev = [];
    var st = w.stones, n = st.length, i, j, a, b;
    var decay = Math.exp(-w.k * dt);

    for (i = 0; i < n; i++) {
      a = st[i];
      if (!a.alive) continue;
      var sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
      if (sp > 0) {
        var ns = Math.max(0, sp - w.mu * dt) * decay;
        if (ns < C.STOP) { a.vx = 0; a.vy = 0; }
        else { var f = ns / sp; a.vx *= f; a.vy *= f; }
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
    }

    var md = 2 * C.R;
    for (i = 0; i < n; i++) {
      a = st[i];
      if (!a.alive) continue;
      for (j = i + 1; j < n; j++) {
        b = st[j];
        if (!b.alive) continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 >= md * md || d2 === 0) continue;
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (md - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov;
        b.x += nx * ov; b.y += ny * ov;
        var vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn > 0) {
          var imp = (1 + C.E_STONE) / 2 * vn;
          a.vx -= imp * nx; a.vy -= imp * ny;
          b.vx += imp * nx; b.vy += imp * ny;
          ev.push({ type: 'hit', speed: vn });
        }
      }
    }

    var rocks = w.rocks;
    for (i = 0; i < n; i++) {
      a = st[i];
      if (!a.alive) continue;
      for (j = 0; j < rocks.length; j++) {
        var r = rocks[j];
        var rx = a.x - r.x, ry = a.y - r.y;
        var rd2 = rx * rx + ry * ry, lim = C.R + r.r;
        if (rd2 >= lim * lim || rd2 === 0) continue;
        var rd = Math.sqrt(rd2), qx = rx / rd, qy = ry / rd;
        a.x = r.x + qx * lim; a.y = r.y + qy * lim;
        var rv = a.vx * qx + a.vy * qy;
        if (rv < 0) {
          a.vx -= (1 + C.E_ROCK) * rv * qx;
          a.vy -= (1 + C.E_ROCK) * rv * qy;
          ev.push({ type: 'hit', speed: -rv });
        }
      }
    }

    for (i = 0; i < n; i++) {
      a = st[i];
      if (a.alive && (a.x < 0 || a.x > C.S || a.y < 0 || a.y > C.S)) {
        a.alive = false;
        ev.push({ type: 'out', stone: a });
      }
    }
    return ev;
  }

  function isSettled(w) {
    for (var i = 0; i < w.stones.length; i++) {
      var s = w.stones[i];
      if (s.alive && (s.vx !== 0 || s.vy !== 0)) return false;
    }
    return true;
  }

  function aliveCount(w, team) {
    var c = 0;
    for (var i = 0; i < w.stones.length; i++) if (w.stones[i].alive && w.stones[i].team === team) c++;
    return c;
  }

  var api = {
    C: C, stageConfig: stageConfig, createWorld: createWorld, cloneWorld: cloneWorld,
    shoot: shoot, step: step, isSettled: isSettled, aliveCount: aliveCount
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkPhys = api;
})(typeof window !== 'undefined' ? window : this);
