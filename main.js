/* 추억의 알까기 - 화면과 조작 */
(function () {
  'use strict';
  var P = window.AlkPhys, AI = window.AlkAI, ST = window.AlkStore;
  var C = P.C;
  var TOTAL = C.TOTAL;
  var $ = function (s) { return document.querySelector(s); };

  var M = 40;                       // 판 바깥 여백(떨어지는 돌이 보이는 곳)
  var VIEW = C.S + 2 * M;
  var canvas = $('#board'), ctx = canvas.getContext('2d');
  var dpr = 1;

  var store = ST.load();
  var THEMES = { pop: { name: '팝아트', desc: '어두운 잿빛 남색 바탕에 크림색 카드, 굵은 테두리의 만화 같은 화면이에요.', table: '#272e49', meta: '#161b2d' },
    neon: { name: '네온 야간', desc: '깊은 남색 바탕에 민트·분홍 불빛이 은은하게 빛나요.', table: '#101846', meta: '#0b0e24' },
    blue: { name: '푸른 기본', desc: '전에 쓰던 편안한 푸른 화면이에요.', table: '#4a6c93', meta: '#243a58' } };
  var THEME_ORDER = ['pop', 'neon', 'blue'];
  var tableColor = THEMES.pop.table;   // 알까기 판 바깥 색(화면 스타일마다 다름)
  var G = null;                     // 지금 진행 중인 판
  var gameToken = 0;
  var acc = 0, lastTs = 0;

  /* ---------- 화면 전환 ---------- */
  var hooks = [];                   // 다른 게임(순서 기억하기)이 화면 전환을 알아채는 통로
  function show(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $('#s-' + name).classList.add('active');
    if (name !== 'game') { G = null; gameToken++; }
    if (name === 'home') updateHome();
    if (name === 'title') updateTitle();
    if (name === 'stages') buildStageGrid();
    if (name === 'save') renderSave();
    if (name === 'settings') renderSettings();
    if (name === 'game') resize();
    hooks.forEach(function (h) { try { h(name); } catch (e) { /* 한 게임의 오류가 전체를 멈추지 않게 */ } });
    window.scrollTo(0, 0);
  }

  function modal(opts) {
    $('#modalTitle').textContent = opts.title || '';
    var body = $('#modalBody');
    body.innerHTML = opts.html || '';
    var btns = $('#modalBtns');
    btns.innerHTML = '';
    (opts.buttons || []).forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'btn' + (b.sec ? ' sec' : '');
      el.textContent = b.label;
      el.addEventListener('click', function () { closeModal(); if (b.onClick) b.onClick(); });
      btns.appendChild(el);
    });
    $('#modal').classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); }

  /* ---------- 진행 상황 ---------- */
  function isUnlocked(n) { return n === 1 || store.stars[n - 2] > 0 || store.stars[n - 1] > 0; }
  function firstOpenStage() {
    for (var n = 1; n <= TOTAL; n++) if (store.stars[n - 1] === 0) return n;
    return TOTAL;
  }
  function allCleared() { return store.stars.every(function (s) { return s > 0; }); }
  function starText(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
  function persist() { ST.save(store); }

  function allCode() { return ST.encode(store.stars, store.sq, store.mz, store.pv, store.sh); }
  function totalCleared() { return ST.KEYS.reduce(function (n, k) { return n + clearedCount(store[k]); }, 0); }
  // 고수 코스(31단계~)가 시작되는 곳에 넣는 제목 줄
  function gridHead(grid) {
    var h = document.createElement('div');
    h.className = 'gridhead';
    h.innerHTML = '🔥 고수 코스 <small>31~50단계 · 더 어려워요</small>';
    grid.appendChild(h);
  }
  function clearedCount(list) { return list.filter(function (s) { return s > 0; }).length; }
  function updateHome() {
    $('#progAlk').textContent = clearedCount(store.stars) + ' / ' + TOTAL + '단계';
    $('#progSq').textContent = clearedCount(store.sq) + ' / ' + TOTAL + '단계';
    $('#progMz').textContent = clearedCount(store.mz) + ' / ' + TOTAL + '단계';
  }

  function updateTitle() {
    var n = firstOpenStage();
    var started = store.stars.some(function (s) { return s > 0; });
    $('#btnContinue').textContent = started ? (allCleared() ? '다시 도전하기' : '이어서 하기 · ' + n + '단계') : '게임 시작';
  }

  function buildStageGrid() {
    var grid = $('#stageGrid');
    grid.innerHTML = '';
    var next = firstOpenStage();
    for (var n = 1; n <= TOTAL; n++) {
      if (n === 31) gridHead(grid);
      (function (n) {
        var b = document.createElement('button');
        var s = store.stars[n - 1];
        var unlocked = isUnlocked(n);
        b.className = 'cell' + (!unlocked ? ' locked' : s > 0 ? ' cleared' : '') + (unlocked && n === next && !allCleared() ? ' next' : '');
        b.innerHTML = '<b>' + n + '</b><small>' + (unlocked ? starText(s) : '🔒') + '</small>';
        b.setAttribute('aria-label', n + '단계 ' + (unlocked ? '별 ' + s + '개' : '잠김'));
        if (unlocked) b.addEventListener('click', function () { startStage(n); });
        grid.appendChild(b);
      })(n);
    }
  }

  /* ---------- 설정 / 옮기기 ---------- */
  /* ---------- 화면 스타일 ---------- */
  function applyTheme() {
    var t = THEMES[store.settings.theme] ? store.settings.theme : 'pop';
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[t].meta);
    tableColor = THEMES[t].table;
  }

  function renderSettings() {
    var th = THEMES[store.settings.theme] ? store.settings.theme : 'pop';
    $('#btnTheme').textContent = THEMES[th].name + ' (누르면 바뀜)';
    $('#themeDesc').textContent = THEMES[th].desc;
    $('#btnSound').textContent = store.settings.sound ? '🔊 소리 켜짐 (누르면 끔)' : '🔇 소리 꺼짐 (누르면 켬)';
    $('#btnAim').textContent = store.settings.aim === 'pull' ? '뒤로 당겨서 쏘기 (지금)' : '밀어서 쏘기 (지금)';
    $('#aimDesc').textContent = store.settings.aim === 'pull'
      ? '돌을 누른 채 뒤로 당겼다 놓으면 앞으로 날아가요. (새총처럼)'
      : '돌을 누른 채 보내고 싶은 쪽으로 끌었다 놓으면 그쪽으로 날아가요.';
    function fill(sel, items) {
      var box = $(sel);
      box.innerHTML = '';
      items.forEach(function (it) {
        var b = document.createElement('button');
        b.className = 'btn sec';
        b.textContent = it.text;
        b.addEventListener('click', function () {
          if (!store.settings.sound) { store.settings.sound = true; persist(); renderSettings(); }
          playFanfare(it.stage);
        });
        box.appendChild(b);
      });
    }
    fill('#fanList', AlkFanfare.list().map(function (f) {
      return { stage: f.stage, text: '✨ ' + f.stage + '단계 · ' + f.name + ' + ' + f.bird };
    }));
    fill('#birdList', AlkFanfare.birdList().map(function (b) {
      return { stage: b.stage, text: '🐦 ' + b.label + ' · ' + b.name };
    }));
  }

  function renderSave() {
    $('#codeBox').textContent = allCode();
    $('#saveMsg').textContent = '';
    $('#saveMsg').className = 'msg';
    $('#codeInput').value = '';
    $('#btnShare').style.display = navigator.share ? '' : 'none';
  }
  function saveMsg(text, ok) { var m = $('#saveMsg'); m.textContent = text; m.className = 'msg ' + (ok ? 'ok' : 'err'); }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  var HOW_HTML =
    '<p class="big">1. 내 돌은 검은 돌이에요 ⚫</p>' +
    '<p>아래쪽에 있는 검은 돌을 손가락으로 꾹 누르세요.</p>' +
    '<p class="big">2. 뒤로 당겼다 놓으세요</p>' +
    '<p>새총처럼 뒤로 당기면 화살표가 가는 방향과 세기를 보여줘요. 멀리 당길수록 세게 날아가요.</p>' +
    '<p class="big">3. 상대 돌을 판 밖으로!</p>' +
    '<p>흰 돌을 판 밖으로 모두 내보내면 이겨요. 내 돌이 밖으로 나가면 지는 거예요. 한 번씩 번갈아 쏴요.</p>' +
    '<p class="big">💡 막막하면 힌트 버튼</p>' +
    '<p>힌트를 누르면 쏘기 좋은 돌과 방향을 알려줘요. 몇 번이든 눌러도 괜찮아요.</p>' +
    '<p class="big">🔥 31단계부터는 고수 코스</p>' +
    '<p>상대 돌이 나보다 더 많고, 바위도 늘어나요. 힌트를 잘 활용해 보세요.</p>';

  /* ---------- 소리 ---------- */
  var actx = null, lastClack = 0;
  function ensureAudio() {
    if (!store.settings.sound) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
  }
  function tone(freq, start, dur, type, vol) {
    if (!actx || !store.settings.sound) return;
    var t = actx.currentTime + start;
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function clack(speed) {
    if (!actx || !store.settings.sound) return;
    var now = performance.now();
    if (now - lastClack < 45) return;
    lastClack = now;
    var t = actx.currentTime;
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(800 + Math.random() * 250, t);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.07);
    g.gain.setValueAtTime(Math.min(1, speed / 700) * 0.35 + 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + 0.1);
  }
  function playFanfare(stage) {
    ensureAudio();
    if (!actx || !store.settings.sound) return;
    AlkFanfare.play(actx, actx.destination, stage);
  }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 지원 안 하면 무시 */ } }

  /* ---------- 게임 진행 ---------- */
  function startStage(n) {
    ensureAudio();
    var w = P.createWorld(n);
    G = {
      stage: n, world: w, phase: 'player', startN: w.cfg.n,
      selected: null, anchor: null, pull: null, hint: null, aiAim: null,
      falling: [], token: ++gameToken, shots: 0
    };
    acc = 0;
    $('#stageTitle').textContent = n + '단계';
    show('game');
    G = G || null;
    updateCounts();
    setMsg();
    if (!store.settings.seenHow) {
      store.settings.seenHow = true; persist();
      showHow(true);
    }
  }

  function showHow(fromGame) {
    modal({ title: '게임 방법', html: '<div style="text-align:left">' + HOW_HTML + '</div>', buttons: [{ label: '알겠어요, 시작!' }] });
  }

  function later(ms, fn) {
    var tok = G && G.token;
    setTimeout(function () { if (G && G.token === tok) fn(); }, ms);
  }

  function setMsg() {
    var el = $('#turnMsg');
    if (!G) return;
    el.classList.remove('mine');
    var pull = store.settings.aim === 'pull';
    switch (G.phase) {
      case 'player':
        el.classList.add('mine');
        el.textContent = G.shots === 0 && G.world.cfg.nFoe > G.world.cfg.n
          ? '🔥 고수 코스! 상대 돌이 ' + (G.world.cfg.nFoe - G.world.cfg.n) + '개 더 많아요. 내 차례예요'
          : G.shots === 0
          ? (pull ? '내 차례예요! 검은 돌을 꾹 누르고 뒤로 당겼다 놓으세요' : '내 차례예요! 검은 돌을 꾹 누르고 보낼 쪽으로 끌었다 놓으세요')
          : '내 차례예요! 검은 돌을 쏘세요';
        break;
      case 'thinking': el.textContent = '상대가 생각하는 중…'; break;
      case 'aim_ai': el.textContent = '상대가 쏩니다!'; break;
      case 'moving': el.textContent = ''; break;
      default: break;
    }
  }

  function updateCounts() {
    if (!G) return;
    $('#counts').innerHTML =
      '<span><i class="dot b"></i>내 돌 ' + P.aliveCount(G.world, 0) + '</span>' +
      '<span><i class="dot w"></i>상대 돌 ' + P.aliveCount(G.world, 1) + '</span>';
    $('#btnHint').disabled = G.phase !== 'player';
  }

  function fire(id, angle, power, team) {
    var s = G.world.stones[id];
    P.shoot(s, angle, power);
    G.phase = 'moving';
    G.mover = team;
    G.hint = null; G.aiAim = null; G.selected = null; G.pull = null;
    G.shots++;
    acc = 0;
    clack(300);
    setMsg(); updateCounts();
  }

  function afterSettled() {
    var me = P.aliveCount(G.world, 0), foe = P.aliveCount(G.world, 1);
    updateCounts();
    if (me === 0 || foe === 0) {
      G.phase = 'over';
      setMsg();
      var result = (me === 0 && foe === 0) ? 'draw' : (foe === 0 ? 'win' : 'lose');
      later(800, function () { showResult(result, me); });
      return;
    }
    if (G.mover === 0) startAiTurn();
    else { G.phase = 'player'; setMsg(); updateCounts(); }
  }

  function startAiTurn() {
    G.phase = 'thinking'; setMsg(); updateCounts();
    later(650, function () {
      var shot = AI.chooseShot(G.world, 1, { level: G.world.cfg.level });
      if (!shot) { G.phase = 'player'; setMsg(); updateCounts(); return; }
      G.phase = 'aim_ai';
      G.aiAim = shot;
      setMsg();
      later(750, function () { fire(shot.id, shot.angle, shot.power, 1); });
    });
  }

  function showResult(result, remaining) {
    var n = G.stage;
    if (result === 'win') {
      var lost = G.startN - remaining;
      var stars = lost === 0 ? 3 : (remaining >= Math.ceil(G.startN / 2) ? 2 : 1);
      var better = stars > store.stars[n - 1];
      if (better) { store.stars[n - 1] = stars; persist(); }
      logPlay('a', n, stars);
      var milestone = AlkFanfare.isMilestone(n);
      playFanfare(n);   // 5단계마다 특별한 효과음, 모든 단계에 구간별 새소리
      var msg = stars === 3 ? '내 돌을 하나도 안 잃었어요. 대단해요!' : stars === 2 ? '아주 잘했어요!' : '이겼어요! 다음엔 별을 더 노려 봐요.';
      var buttons = [];
      if (n < TOTAL) buttons.push({ label: (n + 1) + '단계로 가기', onClick: function () { startStage(n + 1); } });
      buttons.push({ label: '다시 하기', sec: true, onClick: function () { startStage(n); } });
      buttons.push({ label: '단계 고르기', sec: true, onClick: function () { show('stages'); } });
      var title = '🎉 ' + n + '단계 성공!';
      if (milestone) title = '✨ ' + n + '단계 돌파!';
      if (n === TOTAL) { title = '🏆 모든 단계 완료!'; msg = '정말 대단해요. 알까기 달인이세요!'; }
      var bird = AlkFanfare.birdName(n);
      var extra = milestone ? '<p>🎵 「' + AlkFanfare.name(n) + '」 · 🐦 ' + bird + '</p>' : '<p>🐦 ' + bird + '가 축하해 줘요</p>';
      modal({ title: title, html: '<div class="stars">' + starText(stars) + '</div><p>' + msg + '</p>' + extra, buttons: buttons });
    } else {
      logPlay('a', n, 0);   // 졌을 때도 한 판으로 기록(별 0개)
      tone(330, 0, 0.25, 'sine', 0.22); tone(262, 0.22, 0.4, 'sine', 0.22);
      var tips = [
        '약하게 톡 쏘면 내 돌이 판 안에 남아서 안전해요.',
        '힌트 버튼을 눌러 보세요. 몇 번이든 괜찮아요.',
        '상대 돌의 한가운데를 겨누면 더 멀리 날아가요.',
        '판 가장자리에 있는 상대 돌부터 노려 보세요.'
      ];
      modal({
        title: result === 'draw' ? '비겼어요' : '아쉬워요',
        html: '<p>' + (result === 'draw' ? '서로 돌이 다 나갔어요.' : '내 돌이 모두 나갔어요.') + '</p><p>💡 ' + tips[Math.floor(Math.random() * tips.length)] + '</p>',
        buttons: [
          { label: '다시 도전', onClick: function () { startStage(n); } },
          { label: '단계 고르기', sec: true, onClick: function () { show('stages'); } }
        ]
      });
    }
  }

  function useHint() {
    if (!G || G.phase !== 'player') return;
    ensureAudio();
    var el = $('#turnMsg');
    el.classList.remove('mine');
    el.textContent = '좋은 수를 찾는 중…';
    var tok = G.token;
    setTimeout(function () {
      if (!G || G.token !== tok || G.phase !== 'player') return;
      G.hint = AI.chooseShot(G.world, 0, { perfect: true });
      el.classList.add('mine');
      el.textContent = store.settings.aim === 'pull'
        ? '💡 반짝이는 돌을 화살표 반대쪽으로 당기세요'
        : '💡 반짝이는 돌을 화살표 쪽으로 끄세요';
    }, 30);
  }

  /* ---------- 조작(터치/마우스) ---------- */
  function toWorld(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * VIEW - M, y: (e.clientY - r.top) / r.height * VIEW - M };
  }

  canvas.addEventListener('pointerdown', function (e) {
    ensureAudio();
    if (!G || G.phase !== 'player') return;
    var p = toWorld(e), best = null, bd = 1e9;
    G.world.stones.forEach(function (s) {
      if (!s.alive || s.team !== 0) return;
      var d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < C.R * 2.1 && d < bd) { bd = d; best = s; }
    });
    if (!best) return;
    G.selected = best; G.anchor = p; G.pull = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 일부 환경에서는 불필요 */ }
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!G || !G.selected) return;
    var p = toWorld(e);
    var dx = p.x - G.anchor.x, dy = p.y - G.anchor.y;
    var len = Math.hypot(dx, dy);
    var angle = store.settings.aim === 'pull' ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
    G.pull = { angle: angle, power: Math.min(1, len / C.PULL_CAP), len: len };
    e.preventDefault();
  });

  function endPointer() {
    if (!G || !G.selected) return;
    if (G.pull && G.pull.len >= 14 && G.phase === 'player') fire(G.selected.id, G.pull.angle, G.pull.power, 0);
    else { G.selected = null; G.pull = null; }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', function () { if (G) { G.selected = null; G.pull = null; } });

  /* ---------- 그리기 ---------- */
  function resize() {
    var availW = Math.min(window.innerWidth - 16, 720);
    var availH = window.innerHeight - 270;
    var size = Math.max(280, Math.min(availW, availH));
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  window.addEventListener('resize', resize);

  function drawBoard() {
    var S = C.S, i;
    ctx.fillStyle = tableColor;
    ctx.fillRect(-M, -M, VIEW, VIEW);
    var g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#ecd9a6'); g.addColorStop(1, '#dcc07c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(150,95,30,.42)';
    ctx.lineWidth = 1.5;
    for (i = 0; i <= 8; i++) {
      var p = 40 + (S - 80) * i / 8;
      ctx.beginPath(); ctx.moveTo(p, 40); ctx.lineTo(p, S - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, p); ctx.lineTo(S - 40, p); ctx.stroke();
    }
    ctx.strokeStyle = '#b48a4e';
    ctx.lineWidth = 10;
    ctx.strokeRect(-5, -5, S + 10, S + 10);
  }

  function drawRock(r) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.arc(r.x + 3, r.y + 5, r.r, 0, 6.2832); ctx.fill();
    var g = ctx.createRadialGradient(r.x - r.r * 0.3, r.y - r.r * 0.4, r.r * 0.1, r.x, r.y, r.r);
    g.addColorStop(0, '#b9b2a6'); g.addColorStop(1, '#6e675c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#4a443b'; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawStone(x, y, team, scale, alpha) {
    var r = C.R * scale;
    if (r <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(110,70,20,.32)';
    ctx.beginPath(); ctx.arc(x + 3 * scale, y + 5 * scale, r, 0, 6.2832); ctx.fill();
    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (team === 0) { g.addColorStop(0, '#6a6a6a'); g.addColorStop(1, '#0a0a0a'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c4c4c4'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = team === 0 ? '#000' : '#9a8f80';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function ring(x, y, color, width, extra) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(x, y, C.R + (extra || 6), 0, 6.2832); ctx.stroke();
  }

  function arrow(s, angle, power, color, label) {
    var len = 50 + power * 190;
    var ex = s.x + Math.cos(angle) * len, ey = s.y + Math.sin(angle) * len;
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.setLineDash([2, 16]);
    ctx.beginPath(); ctx.moveTo(s.x + Math.cos(angle) * C.R, s.y + Math.sin(angle) * C.R); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.setLineDash([]);
    var a1 = angle + 2.6, a2 = angle - 2.6;
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(angle) * 14, ey + Math.sin(angle) * 14);
    ctx.lineTo(ex + Math.cos(a1) * 26, ey + Math.sin(a1) * 26);
    ctx.lineTo(ex + Math.cos(a2) * 26, ey + Math.sin(a2) * 26);
    ctx.closePath(); ctx.fill();
    if (label) {
      ctx.font = "bold 32px 'Gowun Dodum', sans-serif"; ctx.textAlign = 'center'; ctx.lineWidth = 7;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(74,52,38,.9)'; ctx.fillStyle = '#fff';
      var lx = ex + Math.cos(angle) * 42, ly = ey + Math.sin(angle) * 42 + 10;
      lx = Math.max(40, Math.min(C.S - 40, lx)); ly = Math.max(30, Math.min(C.S - 10, ly));
      ctx.strokeText(label, lx, ly); ctx.fillText(label, lx, ly);
    }
  }

  function powerColor(p) { return p < 0.4 ? '#22a84a' : p < 0.75 ? '#f08a00' : '#e5392b'; }

  function draw(time) {
    var k = canvas.width / VIEW;
    ctx.setTransform(k, 0, 0, k, M * k, M * k);
    ctx.clearRect(-M, -M, VIEW, VIEW);
    drawBoard();
    if (!G) return;

    G.world.rocks.forEach(drawRock);

    var pulse = 0.5 + 0.5 * Math.sin(time * 5);
    var myTurn = G.phase === 'player';

    // 쏘는 돌 뒤로 당기는 고무줄 표시
    if (G.selected && G.pull) {
      var s0 = G.selected, back = G.pull.angle + Math.PI, bl = G.pull.power * 60;
      ctx.strokeStyle = 'rgba(150,90,30,.75)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s0.x + Math.cos(back) * bl, s0.y + Math.sin(back) * bl); ctx.stroke();
    }

    G.world.stones.forEach(function (s) {
      if (!s.alive) return;
      var sel = G.selected && G.selected.id === s.id;
      drawStone(s.x, s.y, s.team, 1, 1);
      if (myTurn && s.team === 0 && !sel) {
        ctx.globalAlpha = 0.55 + 0.45 * pulse; ring(s.x, s.y, '#ff8a00', 5, 4); ctx.globalAlpha = 1;
      }
      if (sel) ring(s.x, s.y, '#2f80ed', 6, 6);
    });

    if (G.selected && G.pull && G.pull.len >= 14) {
      arrow(G.selected, G.pull.angle, G.pull.power, powerColor(G.pull.power), Math.round(G.pull.power * 100) + '%');
    }
    if (G.hint) {
      var hs = G.world.stones[G.hint.id];
      ctx.globalAlpha = 0.55 + 0.45 * pulse; ring(hs.x, hs.y, '#00a58e', 7, 8); ctx.globalAlpha = 1;
      arrow(hs, G.hint.angle, G.hint.power, '#00a58e', null);
    }
    if (G.aiAim) {
      var as = G.world.stones[G.aiAim.id];
      ring(as.x, as.y, '#ff6b5a', 6, 7);
      arrow(as, G.aiAim.angle, G.aiAim.power, '#ff6b5a', null);
    }

    // 판 밖으로 떨어지는 돌
    G.falling.forEach(function (f) {
      var t = f.t / 0.55;
      drawStone(f.x, f.y, f.team, Math.max(0, 1 - t * 0.7), Math.max(0, 1 - t));
    });
  }

  /* ---------- 매 프레임 ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    if (G) {
      if (G.phase === 'moving') {
        acc += dt;
        var steps = 0;
        while (acc >= C.DT && steps < 40 && G.phase === 'moving') {
          var ev = P.step(G.world, C.DT);
          for (var i = 0; i < ev.length; i++) {
            if (ev[i].type === 'hit') clack(ev[i].speed);
            else if (ev[i].type === 'out') {
              var s = ev[i].stone;
              G.falling.push({ x: s.x, y: s.y, vx: s.vx, vy: s.vy, team: s.team, t: 0 });
              if (s.team === 0) vibrate(60);
              tone(s.team === 0 ? 220 : 440, 0, 0.18, 'sine', 0.18);
            }
          }
          acc -= C.DT; steps++;
          if (P.isSettled(G.world)) { acc = 0; afterSettled(); }
        }
      }
      for (var j = G.falling.length - 1; j >= 0; j--) {
        var f = G.falling[j];
        f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.t > 0.55) G.falling.splice(j, 1);
      }
    }
    draw(ts / 1000);
  }

  /* ---------- 버튼 연결 ---------- */
  document.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('[data-go]');
    if (go) show(go.getAttribute('data-go'));
  });
  $('#btnContinue').addEventListener('click', function () { startStage(allCleared() ? 1 : firstOpenStage()); });
  $('#btnStages').addEventListener('click', function () { show('stages'); });
  $('#btnHow').addEventListener('click', function () { $('#howText').innerHTML = HOW_HTML; show('how'); });
  $('#btnSave').addEventListener('click', function () { show('save'); });
  $('#btnSettings').addEventListener('click', function () { show('settings'); });
  $('#btnLeave').addEventListener('click', function () { show('stages'); });
  $('#btnHint').addEventListener('click', useHint);

  $('#btnSound').addEventListener('click', function () {
    store.settings.sound = !store.settings.sound; persist(); renderSettings(); ensureAudio();
    if (store.settings.sound) tone(660, 0, 0.12, 'triangle', 0.25);
  });
  $('#btnTheme').addEventListener('click', function () {
    store.settings.theme = THEME_ORDER[(THEME_ORDER.indexOf(store.settings.theme) + 1) % THEME_ORDER.length];
    persist(); applyTheme(); renderSettings();
  });
  $('#btnAim').addEventListener('click', function () {
    store.settings.aim = store.settings.aim === 'pull' ? 'push' : 'pull'; persist(); renderSettings();
  });
  $('#btnReset').addEventListener('click', function () {
    modal({
      title: '정말 지울까요?', html: '<p>모든 단계 기록이 사라지고 되돌릴 수 없어요.</p>',
      buttons: [
        { label: '아니요, 그대로 둘게요' },
        { label: '네, 지울게요', sec: true, onClick: function () { ST.KEYS.forEach(function (k) { store[k] = ST.blank(k); }); store.log = []; persist(); show('home'); } }
      ]
    });
  });

  $('#btnCopy').addEventListener('click', function () {
    copyText(allCode()).then(
      function () { saveMsg('복사했어요! 카카오톡 "나에게 보내기"에 붙여넣으세요.', true); },
      function () { saveMsg('복사가 안 돼요. 위 코드를 손가락으로 길게 눌러 직접 복사해 주세요.', false); }
    );
  });
  $('#btnShare').addEventListener('click', function () {
    navigator.share({ title: '기억놀이터 이어하기 코드', text: allCode() }).catch(function () { /* 취소하면 무시 */ });
  });
  $('#btnLoad').addEventListener('click', function () {
    var r = ST.decode($('#codeInput').value);
    if (!r.ok) { saveMsg(r.error, false); return; }
    var before = totalCleared();
    store.stars = ST.merge(store.stars, r.stars);
    store.sq = ST.merge(store.sq, r.sq);
    store.mz = ST.merge(store.mz, r.mz);
    store.pv = ST.merge(store.pv, r.pv);
    store.sh = ST.merge(store.sh, r.sh);
    persist();
    var after = totalCleared();
    saveMsg('불러왔어요! 알까기 ' + clearedCount(store.stars) + '단계, 순서 기억하기 ' + clearedCount(store.sq) + '단계, 길 찾기 ' + clearedCount(store.mz) + '단계, 속담 완성 ' + clearedCount(store.pv) + '단계, 장보기 계산 ' + clearedCount(store.sh) + '단계를 클리어한 기록이에요' +
      (after > before ? ' (+' + (after - before) + ')' : '') + '. 놀이터로 돌아가서 이어서 하세요.', true);
    $('#codeBox').textContent = allCode();
  });

  /* ---------- 시작 ---------- */
  applyTheme();
  updateHome();
  updateTitle();
  resize();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* 오프라인 기능만 빠짐 */ }); });
  }

  // 다른 게임(순서 기억하기)이 함께 쓰는 기능: 화면 전환, 알림창, 저장, 소리
  // 판을 끝낼 때마다 한 줄 기록(언제, 어느 게임, 몇 단계, 별 몇 개). 달력·연속 일수·점수 변화가 여기서 나온다
  function logPlay(game, stage, stars) {
    if (!Array.isArray(store.log)) store.log = [];
    store.log.push({ t: Date.now(), g: game, s: stage, r: stars });
    if (store.log.length > ST.LOG_MAX) store.log = store.log.slice(store.log.length - ST.LOG_MAX);
    persist();
  }

  window.KiokApp = {
    $: $, show: show, gridHead: gridHead, modal: modal, closeModal: closeModal, persist: persist, starText: starText, logPlay: logPlay,
    store: function () { return store; },
    ensureAudio: ensureAudio,
    ctx: function () { return actx; },
    soundOn: function () { return !!store.settings.sound; },
    playFanfare: playFanfare,
    renderSettings: renderSettings,
    onShow: function (fn) { hooks.push(fn); }
  };

  // 점검용(개발 중 브라우저 콘솔에서 상태를 볼 때 사용)
  window.__alk = { game: function () { return G; }, store: function () { return store; }, startStage: startStage };
})();
