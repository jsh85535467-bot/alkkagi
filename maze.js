/* 기억놀이터 - 길 찾기 (화면과 조작)
   다람쥐를 움직여 미로를 지나 집으로 간다. 11단계부터 도토리, 26단계부터 열쇠를 모은다.
   조작: 화면을 손가락으로 누르고 있으면 누른 쪽으로 걸어간다(정확하게 그릴 필요 없음).
         설정에서 화살표 버튼 방식으로 바꿀 수 있다. 벌이 없고, 힌트는 무제한. */
(function () {
  'use strict';
  var A = window.KiokApp, M = window.AlkMaze, F = window.AlkFanfare;
  var $ = A.$;
  var TOTAL = M.TOTAL;
  var C = 60, PAD = 14;          // 한 칸 크기, 바깥 여백(그림 좌표)
  var STEP_MS = 150;             // 누르고 있을 때 한 칸 가는 시간
  var THEMES = [
    // bg 바깥 바탕 / hedge 울타리(벽) / dark·lite 울타리 무늬 / path 길 / edge 길 테두리 / trail 지나온 길 띠
    { name: '숲속', bg: '#1f4a52', hedge: '#2f8a82', dark: '#25706a', lite: '#6fc7bd', path: '#e6f4f2', edge: '#7fb5b0', trail: '#ffc847' },
    { name: '바닷가', bg: '#1d3f66', hedge: '#3b82c4', dark: '#2e69a3', lite: '#8cc0ee', path: '#e8f1fa', edge: '#7ea3c9', trail: '#ff8a6b' },
    { name: '들판', bg: '#2a3f78', hedge: '#5877c9', dark: '#4562ad', lite: '#9db3ee', path: '#ebeffa', edge: '#8e9fd2', trail: '#ffc847' },
    { name: '가을 산', bg: '#32306b', hedge: '#6a61bd', dark: '#564da1', lite: '#aaa4ea', path: '#eeedfa', edge: '#9b97d0', trail: '#ffa347' },
    { name: '눈 덮인 산', bg: '#2b4663', hedge: '#5f86b0', dark: '#4b6f98', lite: '#d3e3f3', path: '#eaf1f7', edge: '#8aa5c2', trail: '#ff7da6' },
    { name: '별밤 마을', bg: '#17254a', hedge: '#2e4a8a', dark: '#233b75', lite: '#ffd45e', path: '#e9eef9', edge: '#7d8fbd', trail: '#ffc847' },
    // 고수 코스(31~50단계)
    { name: '새벽 호수', bg: '#173d4d', hedge: '#2a8a9a', dark: '#206f7d', lite: '#8fe0e8', path: '#e6f5f7', edge: '#79b3bb', trail: '#ffc847' },
    { name: '오로라', bg: '#1b3a4a', hedge: '#3a9a7d', dark: '#2d7d66', lite: '#9af0c8', path: '#e8f6f0', edge: '#7ab8a4', trail: '#ff8fb0' },
    { name: '달빛 정원', bg: '#2a2858', hedge: '#6a5bb8', dark: '#54479a', lite: '#c4baf6', path: '#efecfa', edge: '#9a92cf', trail: '#ffd45e' },
    { name: '은하수', bg: '#101a3a', hedge: '#2b3f86', dark: '#1f3070', lite: '#9ec2ff', path: '#e8edfa', edge: '#7488bf', trail: '#ffd45e' }
  ];
  var ROAD = C * 0.64;           // 길의 굵기

  var canvas = $('#mzBoard'), ctx = canvas.getContext('2d');
  var G = null, token = 0, running = false, lastTs = 0, msgTimer = null;

  function st() { return A.store(); }
  function isUnlocked(n) { return n === 1 || st().mz[n - 2] > 0 || st().mz[n - 1] > 0; }
  function firstOpen() {
    for (var n = 1; n <= TOTAL; n++) if (st().mz[n - 1] === 0) return n;
    return TOTAL;
  }
  function allCleared() { return st().mz.every(function (s) { return s > 0; }); }
  function later(ms, fn) {
    var tok = G && G.token;
    setTimeout(function () { if (G && G.token === tok) fn(); }, ms);
  }

  /* ---------- 소리 ---------- */
  function cue(kind, idx) {
    var c = A.ctx();
    if (c && A.soundOn()) F.mazeCue(c, c.destination, kind, idx);
  }
  function winSound(stage) {
    A.ensureAudio();
    var c = A.ctx();
    if (c && A.soundOn()) F.playMaze(c, c.destination, stage);
  }

  /* ---------- 첫 화면 / 단계 고르기 / 방법 ---------- */
  function updateTitle() {
    var started = st().mz.some(function (s) { return s > 0; });
    $('#btnMzContinue').textContent = started ? (allCleared() ? '다시 도전하기' : '이어서 하기 · ' + firstOpen() + '단계') : '게임 시작';
  }

  function buildGrid() {
    var grid = $('#mzGrid');
    grid.innerHTML = '';
    var next = firstOpen();
    for (var n = 1; n <= TOTAL; n++) {
      if (n === 31) A.gridHead(grid);
      (function (n) {
        var s = st().mz[n - 1], unlocked = isUnlocked(n);
        var b = document.createElement('button');
        b.className = 'cell' + (!unlocked ? ' locked' : s > 0 ? ' cleared' : '') + (unlocked && n === next && !allCleared() ? ' next' : '');
        b.innerHTML = '<b>' + n + '</b><small>' + (unlocked ? A.starText(s) : '🔒') + '</small>';
        b.setAttribute('aria-label', n + '단계 ' + (unlocked ? '별 ' + s + '개' : '잠김'));
        if (unlocked) b.addEventListener('click', function () { startStage(n); });
        grid.appendChild(b);
      })(n);
    }
  }

  var HOW_HTML =
    '<p class="big">1. 다람쥐를 움직여요 🐿️</p>' +
    '<p>화면을 손가락으로 꾹 누르고 있으면, 누른 쪽으로 다람쥐가 걸어가요. 설정에서 화살표 버튼으로 바꿀 수도 있어요.</p>' +
    '<p class="big">2. 집으로 가요 🏡</p>' +
    '<p>미로를 지나 집에 도착하면 성공이에요.</p>' +
    '<p class="big">3. 모으기</p>' +
    '<p>11단계부터는 🌰 도토리를 모두 모아야 집 문이 열려요. 26단계부터는 🔑 열쇠를 모아서 🚪 문을 열어요. 31단계부터는 "고수 코스"로, 미로가 더 크고 안개가 짙어요.</p>' +
    '<p class="big">4. 막혀도 괜찮아요</p>' +
    '<p>막다른 길은 되돌아 나오면 돼요. 💡 힌트를 누르면 길을 알려 드려요.</p>';

  function showHow() {
    A.modal({ title: '게임 방법', html: '<div style="text-align:left">' + HOW_HTML + '</div>', buttons: [{ label: '알겠어요, 시작!' }] });
  }

  /* ---------- 단계 시작 ---------- */
  function mode() { return st().settings.mzControl; }

  function baseMsg() {
    var m = G.maze, s = G.st;
    if (m.totalAcorns) return s.acorns < m.totalAcorns ? '🌰 도토리 ' + (m.totalAcorns - s.acorns) + '개를 모으고 집으로 가요' : '🏡 도토리를 다 모았어요! 집으로 가요';
    if (m.totalKeys) return s.keys < m.totalKeys ? '🔑 열쇠 ' + (m.totalKeys - s.keys) + '개를 모아 문을 열어요' : '🚪 문이 열렸어요! 집으로 가요';
    return '🏡 집으로 가는 길을 찾아 보세요';
  }
  function setMsg(text, mine, hold) {
    var el = $('#mzMsg');
    el.textContent = text;
    el.classList.toggle('mine', !!mine);
    clearTimeout(msgTimer);
    if (hold) msgTimer = setTimeout(function () { if (G && G.phase === 'play') setMsg(baseMsg(), true); }, hold);
  }
  function firstMsg() {
    return (mode() === 'touch' ? '화면을 꾹 누르고 있으면 누른 쪽으로 걸어가요. ' : '아래 화살표 버튼을 눌러 보세요. ') + baseMsg().replace(/^[^ ]+ /, '');
  }

  function startStage(n) {
    A.ensureAudio();
    var cfg = M.config(n), maze = M.generate(cfg);
    G = {
      stage: n, cfg: cfg, maze: maze, st: M.newState(maze), phase: 'play', token: ++token,
      vx: maze.start.x, vy: maze.start.y, hold: null, holdDir: null, lastStep: 0,
      seen: {}, trail: {}, hint: null, hintUntil: 0, lastBump: 0,
      path: [{ x: maze.start.x, y: maze.start.y }]      // 지나온 길(그리기용)
    };
    G.trail[maze.start.x + ',' + maze.start.y] = true;
    markSeen();
    $('#mzStageTitle').textContent = n + '단계';
    A.show('mz-game');
    $('#mzPad').classList.toggle('hidden', mode() !== 'buttons');
    resize();
    updateStatus();
    setMsg(firstMsg(), true, 7000);
    startLoop();
    if (!st().settings.mzSeenHow) {
      st().settings.mzSeenHow = true; A.persist();
      showHow();
    }
  }

  function markSeen() {
    if (!G.cfg.fog) return;
    var r = G.cfg.fog + 0.01, n = G.maze.n;
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if (Math.hypot(x - G.st.x, y - G.st.y) <= r) G.seen[x + ',' + y] = true;
    }
  }

  function updateStatus() {
    var s = G.st, m = G.maze, html;
    if (m.totalAcorns) html = '<span>🌰 ' + s.acorns + ' / ' + m.totalAcorns + '</span>';
    else if (m.totalKeys) html = '<span>🔑 ' + s.keys + ' / ' + m.totalKeys + '</span>';
    else html = '<span>걸음 ' + s.steps + '</span>';
    html += '<span>막다른 길 ' + s.waste + '번</span>';
    $('#mzStatus').innerHTML = html;
  }

  /* ---------- 움직이기 ---------- */
  function currentDir() {
    if (G.holdDir) return G.holdDir;
    if (!G.hold) return null;
    // 손가락이 다람쥐보다 어느 쪽에 있는지 보고 걸어갈 방향을 정한다
    var dx = G.hold.x / C - (G.st.x + 0.5), dy = G.hold.y / C - (G.st.y + 0.5), T = 0.42, cand = [];
    var h = Math.abs(dx) >= T ? (dx > 0 ? 'right' : 'left') : null;
    var v = Math.abs(dy) >= T ? (dy > 0 ? 'down' : 'up') : null;
    if (Math.abs(dx) >= Math.abs(dy)) { if (h) cand.push(h); if (v) cand.push(v); } else { if (v) cand.push(v); if (h) cand.push(h); }
    if (!cand.length) return null;
    for (var i = 0; i < cand.length; i++) if (M.canStep(G.maze, G.st.x, G.st.y, cand[i])) return cand[i];   // 벽을 따라 미끄러지듯 간다
    return cand[0];
  }

  function bump(reason, now) {
    if (now - G.lastBump < 500) return;
    G.lastBump = now;
    var m = G.maze, s = G.st;
    if (reason === 'wall') { cue('bump'); return; }
    cue('locked');
    if (reason === 'door') setMsg('🚪 문이 잠겨 있어요. 열쇠가 ' + (m.totalKeys - s.keys) + '개 더 필요해요', true, 3500);
    else if (reason === 'goal') setMsg('🏡 도토리가 ' + (m.totalAcorns - s.acorns) + '개 남았어요. 다 모아서 오세요', true, 3500);
  }

  function tryMove(dir, now) {
    var res = M.move(G.maze, G.st, dir);
    G.lastStep = now;
    if (!res.moved) { bump(res.reason, now); return; }
    G.trail[G.st.x + ',' + G.st.y] = true;
    G.path.push({ x: G.st.x, y: G.st.y });
    markSeen();
    if (G.hint && now < G.hintUntil) G.hint = M.hintPath(G.maze, G.st);
    updateStatus();
    cue('step', G.st.steps);
    if (res.picked) {
      cue(res.picked === 'key' ? 'key' : 'pick');
      setMsg(res.picked === 'key' ? '🔑 열쇠를 주웠어요!' : '🌰 도토리를 주웠어요!', true, 2200);
    }
    if (res.doorOpened) { later(350, function () { cue('door'); }); setMsg('🚪 찰칵! 문이 열렸어요. 집으로 가요', true, 3500); }
    if (res.wasteEntered) setMsg('여기는 막다른 길이에요. 되돌아 나가면 돼요', true, 2800);
    if (res.reachedGoal) {
      G.phase = 'done'; G.hold = null; G.holdDir = null;
      setMsg('🏡 집에 도착했어요!', true);
      later(700, win);
    }
  }

  function useHint() {
    if (!G || G.phase !== 'play') return;
    G.hint = M.hintPath(G.maze, G.st);
    G.hintUntil = performance.now() + 9000;
    setMsg('💡 반짝이는 점선을 따라가 보세요', true, 5000);
  }

  /* ---------- 성공 ---------- */
  function win() {
    var n = G.stage, stars = M.starsFor(G.st.waste), mz = st().mz;
    if (stars > mz[n - 1]) { mz[n - 1] = stars; A.persist(); }
    A.logPlay('m', n, stars);
    var milestone = F.isMilestone(n);
    winSound(n);
    var msg = stars === 3 ? '막다른 길에 한 번도 안 들어가고 도착했어요. 대단해요!' : stars === 2 ? '아주 잘했어요!' : '무사히 도착했어요! 다음엔 별을 더 노려 봐요.';
    var buttons = [];
    if (n < TOTAL) buttons.push({ label: (n + 1) + '단계로 가기', onClick: function () { startStage(n + 1); } });
    buttons.push({ label: '다시 하기', sec: true, onClick: function () { startStage(n); } });
    buttons.push({ label: '단계 고르기', sec: true, onClick: function () { A.show('mz-stages'); } });
    var title = '🏡 ' + n + '단계 도착!';
    if (milestone) title = '✨ ' + n + '단계 돌파!';
    if (n === TOTAL) { title = '🏆 모든 단계 완료!'; msg = '정말 대단해요. 길 찾기 달인이세요!'; }
    var acc = F.accentName(n);
    var extra = milestone ? '<p>🎵 「' + F.name(n) + '」 · 🔔 ' + acc + '</p>' : '<p>🔔 ' + acc + ' 소리가 축하해 줘요</p>';
    A.modal({ title: title, html: '<div class="stars">' + A.starText(stars) + '</div><p>' + msg + '</p>' + extra, buttons: buttons });
  }

  /* ---------- 그리기 ---------- */
  function resize() {
    if (!G) return;
    var availW = Math.min(window.innerWidth - 16, 720);
    var availH = window.innerHeight - (mode() === 'buttons' ? 470 : 300);
    var size = Math.max(260, Math.min(availW, availH));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  window.addEventListener('resize', resize);

  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function emoji(ch, x, y, size) {
    ctx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';      // 앞에서 쓴 반투명 색이 남아 있으면 그림 글자도 흐려지므로 늘 불투명하게
    ctx.fillText(ch, x, y + size * 0.06);
  }

  // 미로 본체: 울타리, 길, 지나온 길, 힌트 점선, 집/문/도토리/열쇠 (다람쥐와 안개는 따로)
  // 얇은 선으로 벽을 긋는 대신, 진한 울타리 사이로 밝고 굵은 길이 나 있는 모양으로 그린다(길이 한눈에 보인다).
  function plate(cx, cy, r, fill, stroke, lw) {
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw || 4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill(); ctx.stroke();
  }
  function content(time) {
    var m = G.maze, n = m.n, W = n * C, th = THEMES[G.cfg.group], x, y, ga = ctx.globalAlpha;

    // 1) 울타리(벽) 바탕
    ctx.fillStyle = th.hedge; rrect(-7, -7, W + 14, W + 14, 20); ctx.fill();

    // 2) 울타리 무늬: 칸 모서리마다 작은 덤불(별밤 마을은 별, 눈 산은 눈송이처럼 보인다)
    for (y = 0; y <= n; y++) for (x = 0; x <= n; x++) {
      var px = x * C, py = y * C;
      ctx.fillStyle = th.dark;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.2832); ctx.fill();
      if ((x * 7 + y * 13) % 3 === 0) {
        ctx.fillStyle = th.lite;
        ctx.beginPath(); ctx.arc(px - 2, py - 2, 3.2, 0, 6.2832); ctx.fill();
      }
    }

    // 3) 길: 칸 가운데를 잇는 굵고 둥근 길(테두리를 먼저 깔고 그 위에 밝은 길)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      var w = m.walls[y * n + x], cx = (x + 0.5) * C, cy = (y + 0.5) * C;
      ctx.moveTo(cx, cy); ctx.lineTo(cx + 0.01, cy);
      if (!(w & 2)) { ctx.moveTo(cx, cy); ctx.lineTo(cx + C, cy); }
      if (!(w & 4)) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + C); }
    }
    ctx.strokeStyle = th.edge; ctx.lineWidth = ROAD + 9; ctx.stroke();
    ctx.strokeStyle = th.path; ctx.lineWidth = ROAD; ctx.stroke();

    // 4) 지나온 길: 또렷한 색 띠
    if (G.path.length > 1) {
      ctx.globalAlpha = ga * 0.6;
      ctx.strokeStyle = th.trail; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo((G.path[0].x + 0.5) * C, (G.path[0].y + 0.5) * C);
      for (var i = 1; i < G.path.length; i++) ctx.lineTo((G.path[i].x + 0.5) * C, (G.path[i].y + 0.5) * C);
      ctx.stroke();
      ctx.globalAlpha = ga;
    }

    // 5) 힌트: 흰 테두리가 있는 청록색 점선
    if (G.hint && G.hint.length) {
      ctx.beginPath(); ctx.moveTo((G.st.x + 0.5) * C, (G.st.y + 0.5) * C);
      G.hint.forEach(function (c) { ctx.lineTo((c.x + 0.5) * C, (c.y + 0.5) * C); });
      ctx.setLineDash([1, 22]);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 17; ctx.stroke();
      ctx.strokeStyle = '#00a58e'; ctx.lineWidth = 11; ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6) 집: 문이 열려 있으면 노란 마당, 잠겨 있으면 회색 마당
    var gx = (m.goal.x + 0.5) * C, gy = (m.goal.y + 0.5) * C, open = G.st.acorns >= m.totalAcorns;
    plate(gx, gy, C * 0.43, open ? '#ffe9a0' : '#cfd9e8', open ? '#f5b800' : '#9d9584', 5);
    emoji('🏡', gx, gy, C * 0.62);
    if (!open) emoji('🔒', gx + C * 0.3, gy - C * 0.3, C * 0.32);

    // 7) 잠긴 문: 길을 가로막는 나무 문
    if (m.door && G.st.keys < m.totalKeys) {
      var dx = (m.door.x + 0.5) * C, dy = (m.door.y + 0.5) * C, hw = ROAD / 2 + 3;
      ctx.fillStyle = '#ffe2a8'; rrect(dx - hw, dy - hw, hw * 2, hw * 2, 9); ctx.fill();
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 5; ctx.stroke();
      emoji('🚪', dx, dy, C * 0.56);
    }

    // 8) 도토리/열쇠: 반짝이는 흰 받침 위에서 살짝 떠 있다
    m.items.forEach(function (it) {
      if (G.st.got[it.x + ',' + it.y]) return;
      var ix = (it.x + 0.5) * C, iy = (it.y + 0.5) * C, wob = Math.sin(time * 4 + it.x + it.y);
      plate(ix, iy, C * 0.33 + wob * 1.5, 'rgba(234,241,249,.95)', it.type === 'acorn' ? '#f5b800' : '#2f80ed', 4);
      emoji(it.type === 'acorn' ? '🌰' : '🔑', ix, iy + wob * 1.5, C * 0.5);
    });
  }

  // 칸들의 합친 영역(벽 두께만큼 여유를 줌)으로 그리기 범위를 제한한다
  function clipCells(cells, extra) {
    ctx.beginPath();
    cells.forEach(function (c) { ctx.rect(c[0] * C - extra, c[1] * C - extra, C + 2 * extra, C + 2 * extra); });
    ctx.clip();
  }

  function draw(time) {
    var m = G.maze, n = m.n, W = n * C, VIEW = W + 2 * PAD, k = canvas.width / VIEW, th = THEMES[G.cfg.group];
    ctx.setTransform(k, 0, 0, k, PAD * k, PAD * k);
    if (!G.cfg.fog) {
      ctx.fillStyle = th.bg; ctx.fillRect(-PAD, -PAD, VIEW, VIEW);
      content(time);
    } else {
      // 안개: 안 가 본 곳은 어둡게(안 보임), 가 봤지만 지금은 안 보이는 곳은 흐리게, 지금 보이는 곳만 또렷하게
      ctx.fillStyle = '#2b3556'; ctx.fillRect(-PAD, -PAD, VIEW, VIEW);
      var r = G.cfg.fog + 0.01, seen = [], vis = [], x, y;
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
        if (G.seen[x + ',' + y]) seen.push([x, y]);
        if (Math.hypot(x - G.st.x, y - G.st.y) <= r) vis.push([x, y]);
      }
      ctx.save(); clipCells(seen, 5); ctx.globalAlpha = 0.5;
      ctx.fillStyle = th.bg; ctx.fillRect(-PAD, -PAD, VIEW, VIEW); content(time);
      ctx.restore();
      ctx.save(); clipCells(vis, 5);
      ctx.fillStyle = th.bg; ctx.fillRect(-PAD, -PAD, VIEW, VIEW); content(time);
      ctx.restore();
    }

    // 다람쥐: 밝은 동그란 받침과 그림자 위에 올려서 어디 있는지 한눈에 보이게
    var sx = (G.vx + 0.5) * C, sy = (G.vy + 0.5) * C;
    ctx.fillStyle = 'rgba(234,241,249,.94)'; ctx.strokeStyle = th.trail; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(sx, sy, C * 0.38, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(60,40,10,.2)';
    ctx.beginPath(); ctx.ellipse(sx, sy + C * 0.27, C * 0.22, C * 0.07, 0, 0, 6.2832); ctx.fill();
    emoji('🐿️', sx, sy + Math.sin(time * 7) * 1.2, C * 0.66);

    // 손가락 위치 표시
    if (G.hold) {
      ctx.strokeStyle = 'rgba(217,64,44,.75)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(G.hold.x, G.hold.y, 22, 0, 6.2832); ctx.stroke();
    }
  }

  /* ---------- 매 프레임 ---------- */
  function startLoop() { if (!running) { running = true; lastTs = 0; requestAnimationFrame(loop); } }
  function loop(ts) {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    if (!G) return;
    var now = performance.now();
    if (G.phase === 'play') {
      var dir = currentDir();
      if (dir && now - G.lastStep >= STEP_MS) tryMove(dir, now);
    }
    if (G.hint && now > G.hintUntil) G.hint = null;
    var f = Math.min(1, dt * 16);
    G.vx += (G.st.x - G.vx) * f; G.vy += (G.st.y - G.vy) * f;
    draw(ts / 1000);
  }

  /* ---------- 조작 ---------- */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect(), VIEW = G.maze.n * C + 2 * PAD;
    return { x: (e.clientX - r.left) / r.width * VIEW - PAD, y: (e.clientY - r.top) / r.height * VIEW - PAD };
  }
  canvas.addEventListener('pointerdown', function (e) {
    A.ensureAudio();
    if (!G || G.phase !== 'play' || mode() !== 'touch') return;
    G.hold = toWorld(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 일부 환경에서는 필요 없음 */ }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) { if (G && G.hold) { G.hold = toWorld(e); e.preventDefault(); } });
  function release() { if (G) G.hold = null; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // 화살표 버튼 방식
  [['up', '▲'], ['left', '◀'], ['down', '▼'], ['right', '▶']].forEach(function (d) {
    var b = document.createElement('button');
    b.className = 'dir ' + d[0];
    b.textContent = d[1];
    b.setAttribute('aria-label', { up: '위', left: '왼쪽', down: '아래', right: '오른쪽' }[d[0]]);
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); A.ensureAudio();
      if (G && G.phase === 'play') { G.holdDir = d[0]; G.lastStep = 0; }
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { if (G && G.holdDir === d[0]) G.holdDir = null; }); });
    $('#mzPad').appendChild(b);
  });
  // 컴퓨터 키보드 방향키
  var KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  document.addEventListener('keydown', function (e) {
    if (!G || !running || !KEYDIR[e.key] || !$('#s-mz-game').classList.contains('active')) return;
    G.holdDir = KEYDIR[e.key]; e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { if (G && KEYDIR[e.key] && G.holdDir === KEYDIR[e.key]) G.holdDir = null; });

  /* ---------- 설정: 조작 방법, 소리 미리듣기 ---------- */
  function renderSettings() {
    var cur = mode();
    $('#btnMzCtl').textContent = cur === 'touch' ? '화면을 눌러서 걷기 (지금)' : '화살표 버튼으로 걷기 (지금)';
    $('#mzCtlDesc').textContent = cur === 'touch'
      ? '화면을 손가락으로 꾹 누르고 있으면, 누른 쪽으로 다람쥐가 걸어가요.'
      : '화면 아래의 큰 화살표 버튼을 눌러서 한 칸씩 걸어가요. 꾹 누르면 계속 걸어요.';
    function fill(sel, items) {
      var box = $(sel);
      box.innerHTML = '';
      items.forEach(function (it) {
        var b = document.createElement('button');
        b.className = 'btn sec';
        b.textContent = it.text;
        b.addEventListener('click', function () {
          if (!st().settings.sound) { st().settings.sound = true; A.persist(); A.renderSettings(); }
          winSound(it.stage);
        });
        box.appendChild(b);
      });
    }
    fill('#mzFanList', F.list().map(function (f) { return { stage: f.stage, text: '✨ ' + f.stage + '단계 · ' + f.name + ' + ' + F.accentName(f.stage) }; }));
    fill('#mzAccList', F.accentList().map(function (a) { return { stage: a.stage, text: '🔔 ' + a.label + ' · ' + a.name }; }));
  }

  /* ---------- 연결 ---------- */
  A.onShow(function (name) {
    if (name !== 'mz-game') { G = null; token++; running = false; clearTimeout(msgTimer); }
    if (name === 'mz-title') updateTitle();
    if (name === 'mz-stages') buildGrid();
    if (name === 'settings') renderSettings();
  });
  $('#btnMzContinue').addEventListener('click', function () { startStage(allCleared() ? 1 : firstOpen()); });
  $('#btnMzStages').addEventListener('click', function () { A.show('mz-stages'); });
  $('#btnMzHow').addEventListener('click', function () { $('#mzHowText').innerHTML = HOW_HTML; A.show('mz-how'); });
  $('#btnMzLeave').addEventListener('click', function () { A.show('mz-stages'); });
  $('#btnMzHint').addEventListener('click', useHint);
  $('#btnMzCtl').addEventListener('click', function () {
    st().settings.mzControl = mode() === 'touch' ? 'buttons' : 'touch';
    A.persist(); renderSettings();
  });
  updateTitle();

  // 점검용
  window.__mz = { game: function () { return G; }, startStage: startStage };
})();
