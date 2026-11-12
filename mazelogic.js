/* 기억놀이터 - 길 찾기: 미로 규칙과 난이도 (화면과 무관한 순수 계산 코드)
   - 미로는 코드가 자동으로 만들고, 시작에서 집까지 길이 반드시 하나 있다(막다른 길 많음)
   - 11단계부터 도토리를 모아야 집 문이 열리고, 26단계부터는 열쇠를 모아야 문이 열린다
   - 벌이 없다: 막다른 길에 들어간 횟수가 적을수록 별이 많다 */
(function (root) {
  'use strict';
  var TOTAL = 50;   // 31~50단계는 고수 코스
  var DIRS = ['up', 'right', 'down', 'left'];
  var BIT = { up: 1, right: 2, down: 4, left: 8 };
  var OPP = { up: 'down', right: 'left', down: 'up', left: 'right' };
  var DX = { up: 0, right: 1, down: 0, left: -1 };
  var DY = { up: -1, right: 0, down: 1, left: 0 };

  function group(stage) { return Math.max(0, Math.min(9, Math.floor((Math.max(1, stage | 0) - 1) / 5))); }

  // 단계별 설정: 미로 크기, 만드는 방식, 도토리/열쇠 개수, 안개(보이는 칸 반경)
  function config(stage) {
    var s = Math.max(1, Math.min(TOTAL, stage | 0));
    var g = group(s), k = (s - 1) % 5;
    // 처음부터 너무 쉽지 않도록 초급(1~10단계)도 미로를 키웠다. 난이도는 크기와 bias(갈래 정도)로 조금씩 올린다
    var SIZES = [[7, 7, 8, 8, 9], [9, 9, 9, 9, 10], [10, 10, 10, 11, 11], [10, 11, 11, 11, 11], [10, 10, 11, 11, 11], [10, 10, 11, 11, 11],
      // 고수 코스: 11~12칸
      [11, 11, 12, 12, 12], [12, 12, 12, 12, 12], [12, 12, 12, 12, 12], [12, 12, 12, 12, 12]];
    // 갈래 정도(bias): 1에 가까울수록 길게 구불구불(쉬움), 0에 가까울수록 갈림길과 막다른 길이 많음(어려움)
    var BIAS = [0.9, 0.7, 0.65, 0.5, 0.45, 0.35, 0.28, 0.2, 0.12, 0.08];
    return {
      stage: s, group: g, n: SIZES[g][k],
      bias: s <= 10 ? BIAS[s - 1] : Math.max(0, Math.round((0.08 - (s - 10) * 0.04) * 100) / 100),   // 12단계부터 0(갈래 가장 많음)
      acorns: g === 2 ? 3 : (g === 3 || g === 4) ? 4 : g === 8 ? 5 : g === 9 ? 6 : 0,
      keys: g === 5 ? (k < 2 ? 2 : 3) : g === 6 ? 3 : g === 7 ? 4 : 0,
      fog: g === 4 ? 2 : g === 5 ? 3 : g >= 6 ? 2 : 0       // 0이면 안개 없음
    };
  }

  function carve(walls, n, x, y, dir) {
    var i = y * n + x, j = (y + DY[dir]) * n + (x + DX[dir]);
    walls[i] &= ~BIT[dir];
    walls[j] &= ~BIT[OPP[dir]];
  }
  function blankWalls(n) { var w = []; for (var i = 0; i < n * n; i++) w.push(15); return w; }

  // 자라나는 나무 방식으로 미로를 만든다.
  //  bias 가 1이면 가장 최근에 뚫은 칸에서 계속 이어 가서 길이 길게 구불구불하고 갈림길이 적다(쉬움).
  //  bias 가 0이면 아무 칸에서나 가지를 뻗어서 갈림길과 막다른 길이 많다(어려움).
  //  그 사이 값으로 단계마다 조금씩 어려워지게 한다.
  function makeTree(n, rng, bias) {
    var walls = blankWalls(n), seen = [], i;
    for (i = 0; i < n * n; i++) seen.push(false);
    var sx = Math.floor(rng() * n), sy = Math.floor(rng() * n);
    seen[sy * n + sx] = true;
    var active = [[sx, sy]];
    while (active.length) {
      var idx = rng() < bias ? active.length - 1 : Math.floor(rng() * active.length);
      var cur = active[idx], opts = [];
      DIRS.forEach(function (d) {
        var nx = cur[0] + DX[d], ny = cur[1] + DY[d];
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]) opts.push(d);
      });
      if (!opts.length) { active.splice(idx, 1); continue; }
      var d = opts[Math.floor(rng() * opts.length)];
      carve(walls, n, cur[0], cur[1], d);
      var nx2 = cur[0] + DX[d], ny2 = cur[1] + DY[d];
      seen[ny2 * n + nx2] = true;
      active.push([nx2, ny2]);
    }
    return walls;
  }

  // 너비 우선 탐색: from 에서 갈 수 있는 모든 칸까지의 거리와 이전 칸. blocked 는 지나갈 수 없는 칸들
  function bfs(maze, sx, sy, blocked) {
    var n = maze.n, dist = [], prev = [], i;
    for (i = 0; i < n * n; i++) { dist.push(-1); prev.push(-1); }
    var q = [sy * n + sx], qi = 0;
    dist[sy * n + sx] = 0;
    while (qi < q.length) {
      var c = q[qi++], cx = c % n, cy = (c - cx) / n;
      for (var di = 0; di < 4; di++) {
        var d = DIRS[di];
        if (maze.walls[c] & BIT[d]) continue;
        var j = (cy + DY[d]) * n + (cx + DX[d]);
        if (dist[j] >= 0 || (blocked && blocked[j])) continue;
        dist[j] = dist[c] + 1; prev[j] = c; q.push(j);
      }
    }
    return { dist: dist, prev: prev };
  }

  function manhattan(a, b, n) { return Math.abs(a % n - b % n) + Math.abs(Math.floor(a / n) - Math.floor(b / n)); }

  // pool 에서 count 개를 서로 떨어지게 뽑는다(너무 가까우면 다시 뽑고, 끝내 안 되면 간격을 줄인다)
  function pickSpread(pool, count, n, rng, taken) {
    var chosen = [], gap = 3, tries = 0;
    var avail = pool.slice();
    while (chosen.length < count && avail.length) {
      var idx = Math.floor(rng() * avail.length), c = avail[idx];
      var ok = chosen.concat(taken || []).every(function (o) { return manhattan(c, o, n) >= gap; });
      if (ok) { chosen.push(c); avail.splice(idx, 1); tries = 0; }
      else if (++tries > 60) { if (gap > 1) { gap--; tries = 0; } else { chosen.push(c); avail.splice(idx, 1); } }
    }
    return chosen;
  }

  function generate(cfg, rng) {
    rng = rng || Math.random;
    var n = cfg.n;
    var walls = makeTree(n, rng, cfg.bias);
    var corners = [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1]];
    var sc = corners[Math.floor(rng() * 4)];
    var maze = { n: n, walls: walls, start: { x: sc[0], y: sc[1] }, goal: null, items: [], door: null, useful: [], totalAcorns: cfg.acorns, totalKeys: cfg.keys, cfg: cfg };
    var si = sc[1] * n + sc[0];
    var b = bfs(maze, sc[0], sc[1], null), i;

    // 집: 시작에서 가장 먼 칸
    var best = -1, cands = [];
    for (i = 0; i < n * n; i++) { if (b.dist[i] > best) { best = b.dist[i]; cands = [i]; } else if (b.dist[i] === best) cands.push(i); }
    var gi = cands[Math.floor(rng() * cands.length)];
    maze.goal = { x: gi % n, y: (gi - gi % n) / n };
    var targets = [gi];
    function cellOf(c) { return { x: c % n, y: (c - c % n) / n }; }

    if (cfg.acorns > 0) {
      var pool = [];
      for (i = 0; i < n * n; i++) if (b.dist[i] >= 3 && i !== gi && i !== si) pool.push(i);
      pickSpread(pool, cfg.acorns, n, rng).forEach(function (c) { var p = cellOf(c); maze.items.push({ x: p.x, y: p.y, type: 'acorn' }); targets.push(c); });
    }
    if (cfg.keys > 0) {
      var path = [], c = gi;
      while (c !== -1) { path.unshift(c); c = b.prev[c]; }                 // 시작 → 집
      var di = Math.max(2, Math.min(path.length - 2, Math.floor(path.length * 0.6)));
      var doorIdx = path[di];
      maze.door = cellOf(doorIdx);
      var blocked = {}; blocked[doorIdx] = true;
      var bb = bfs(maze, sc[0], sc[1], blocked);                          // 문을 못 지나는 상태에서 갈 수 있는 곳
      var kpool = [];
      for (i = 0; i < n * n; i++) if (bb.dist[i] >= 2 && i !== si && i !== doorIdx) kpool.push(i);
      pickSpread(kpool, cfg.keys, n, rng).forEach(function (c2) { var p = cellOf(c2); maze.items.push({ x: p.x, y: p.y, type: 'key' }); targets.push(c2); });
    }

    // 꼭 지나야 하는 길(시작→집, 시작→각 도토리/열쇠). 그 밖의 가지는 '막다른 길'
    for (i = 0; i < n * n; i++) maze.useful.push(false);
    maze.useful[si] = true;
    targets.forEach(function (t) { var c3 = t; while (c3 !== -1) { maze.useful[c3] = true; c3 = b.prev[c3]; } });
    maze.pathLength = b.dist[gi];
    return maze;
  }

  function canStep(maze, x, y, dir) {
    var nx = x + DX[dir], ny = y + DY[dir];
    if (nx < 0 || ny < 0 || nx >= maze.n || ny >= maze.n) return false;
    return !(maze.walls[y * maze.n + x] & BIT[dir]);
  }

  function newState(maze) {
    return { x: maze.start.x, y: maze.start.y, got: {}, acorns: 0, keys: 0, waste: 0, steps: 0, inWaste: false, done: false };
  }

  // 한 칸 움직이기. 결과: moved(움직였나), reason(wall/door/goal/done), picked, wasteEntered, doorOpened, reachedGoal
  function move(maze, st, dir) {
    if (st.done) return { moved: false, reason: 'done' };
    if (!canStep(maze, st.x, st.y, dir)) return { moved: false, reason: 'wall' };
    var nx = st.x + DX[dir], ny = st.y + DY[dir];
    if (maze.door && nx === maze.door.x && ny === maze.door.y && st.keys < maze.totalKeys) return { moved: false, reason: 'door' };
    if (nx === maze.goal.x && ny === maze.goal.y && st.acorns < maze.totalAcorns) return { moved: false, reason: 'goal' };
    st.x = nx; st.y = ny; st.steps++;
    var res = { moved: true, picked: null, wasteEntered: false, doorOpened: false, reachedGoal: false };
    if (!maze.useful[ny * maze.n + nx]) {
      if (!st.inWaste) { st.waste++; st.inWaste = true; res.wasteEntered = true; }
    } else st.inWaste = false;
    for (var k = 0; k < maze.items.length; k++) {
      var it = maze.items[k], key = it.x + ',' + it.y;
      if (it.x === nx && it.y === ny && !st.got[key]) {
        st.got[key] = true; res.picked = it.type;
        if (it.type === 'acorn') st.acorns++;
        else { st.keys++; if (st.keys === maze.totalKeys) res.doorOpened = true; }
      }
    }
    if (nx === maze.goal.x && ny === maze.goal.y) { st.done = true; res.reachedGoal = true; }
    return res;
  }

  // 힌트: 지금 칸에서 다음 목표(남은 도토리 → 남은 열쇠 → 집)까지 가는 길(현재 칸 제외)
  function hintPath(maze, st) {
    var n = maze.n, blocked = {};
    if (maze.door && st.keys < maze.totalKeys) blocked[maze.door.y * n + maze.door.x] = true;
    var left = maze.items.filter(function (it) { return !st.got[it.x + ',' + it.y]; });
    var acorns = left.filter(function (it) { return it.type === 'acorn'; });
    var keys = left.filter(function (it) { return it.type === 'key'; });
    var wanted = acorns.length ? acorns : keys.length ? keys : [maze.goal];
    var b = bfs(maze, st.x, st.y, blocked), bestCell = -1;
    wanted.forEach(function (w) {
      var c = w.y * n + w.x;
      if (b.dist[c] >= 0 && (bestCell < 0 || b.dist[c] < b.dist[bestCell])) bestCell = c;
    });
    if (bestCell < 0) return [];
    var path = [], cur = bestCell, from = st.y * n + st.x;
    while (cur !== -1 && cur !== from) { path.unshift({ x: cur % n, y: (cur - cur % n) / n }); cur = b.prev[cur]; }
    return path;
  }

  function starsFor(waste) { return waste <= 0 ? 3 : waste <= 2 ? 2 : 1; }

  var api = {
    TOTAL: TOTAL, DIRS: DIRS, BIT: BIT, DX: DX, DY: DY, group: group, config: config, generate: generate, bfs: bfs,
    canStep: canStep, newState: newState, move: move, hintPath: hintPath, starsFor: starsFor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkMaze = api;
})(typeof window !== 'undefined' ? window : this);
