/* 기억놀이터 - 순서 기억하기 (화면과 조작)
   색깔 버튼이 차례로 반짝이며 저마다 다른 악기 소리를 낸다 → 잘 보고 들은 뒤 같은 순서로 누른다.
   틀려도 벌은 없고, 틀리면 새로운 순서로 다시 보여 준다. 다시 보지 않고 맞힐수록 별이 많다. */
(function () {
  'use strict';
  var A = window.KiokApp, S = window.AlkSeq, F = window.AlkFanfare;
  var $ = A.$;
  var TOTAL = S.TOTAL;

  // 버튼 6개: 둥근 버튼 위 '무대'에 악기를 올린다. 악기는 빛이 비치는 방향(왼쪽 위), 그림자, 반짝임, 나뭇결·금속 광택을 넣어
  // 사진에 가깝게 그렸다(그림 파일 없이 코드로 그린 그림이라 오프라인에서도 그대로 나온다).
  // 색깔만으로 구분하지 않도록 악기 그림과 이름을 함께 보여 준다(모양이 서로 완전히 달라 색을 못 봐도 구별된다).
  // 둥근 관(나팔 관)을 입체로 보이게 하는 방법: 어두운 굵은 선 → 밝은 선 → 가는 하이라이트 선을 겹친다.
  function tube(d, w, dark, mid, light) {
    return '<path d="' + d + '" fill="none" stroke="' + dark + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + mid + '" stroke-width="' + (w - 2.2) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + light + '" stroke-width="' + Math.max(1, w * 0.22) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.6 -1.1)" opacity=".85"/>';
  }
  function lin(id, x1, y1, x2, y2, stops) {
    return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
  }
  function rad(id, cx, cy, r, stops, fx, fy) {
    return '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (fx != null ? ' fx="' + fx + '" fy="' + fy + '"' : '') + '>' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</radialGradient>';
  }
  function stick(x1, y1, x2, y2, id) {
    var ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    return '<g><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#4a2c12" stroke-width="5.2" stroke-linecap="round"/>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#b9803f" stroke-width="3.4" stroke-linecap="round"/>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#f1cf95" stroke-width="1.1" stroke-linecap="round" transform="translate(-0.7 -0.9)"/>' +
      '<circle cx="' + x1 + '" cy="' + y1 + '" r="5.6" fill="url(#' + id + ')" stroke="#4a2c12" stroke-width="1.2"/></g>';
  }
  var ART = {
    drum: (function () {
      var studs = '';
      [15, 45, 75, 105, 135, 165].forEach(function (t) {
        var r = t * Math.PI / 180, x = 50 + 31 * Math.cos(r), y = 40 + 10.5 * Math.sin(r);
        studs += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.5" fill="url(#drS)" stroke="#6a4308" stroke-width=".6"/>';
      });
      return '<svg viewBox="0 0 100 100"><defs>' +
        lin('drB', 0, 0, 1, 0, [[0, '#4a170f'], [0.22, '#a83d29'], [0.48, '#e2634a'], [0.72, '#a63a27'], [1, '#3e130c']]) +
        rad('drH', 0.42, 0.38, 0.75, [[0, '#fffaea'], [0.7, '#ecdcb3'], [1, '#c9b27c']]) +
        rad('drS', 0.35, 0.3, 0.8, [[0, '#fff3b0'], [1, '#a8741a']]) +
        rad('drT', 0.35, 0.3, 0.8, [[0, '#e0b27a'], [1, '#6a3f19']]) +
        '</defs>' +
        '<ellipse cx="50" cy="90" rx="34" ry="5.5" fill="#000" opacity=".28"/>' +
        '<path d="M18 40C11 53 11 71 20 81C31 90 69 90 80 81C89 71 89 53 82 40Z" fill="url(#drB)" stroke="#34100a" stroke-width="1.6"/>' +
        '<path d="M14 56C30 63 70 63 86 56M15.5 68C31 75 69 75 84.5 68" fill="none" stroke="#f3c860" stroke-width="2.4" opacity=".9"/>' +
        '<path d="M26 46C22 58 22 70 27 80" stroke="#fff" stroke-width="3" fill="none" opacity=".22" stroke-linecap="round"/>' +
        '<ellipse cx="50" cy="40" rx="32" ry="11.5" fill="#b78a46" stroke="#34100a" stroke-width="1.4"/>' +
        '<ellipse cx="50" cy="39.5" rx="29" ry="9.6" fill="url(#drH)" stroke="#a88a52" stroke-width="1"/>' +
        '<ellipse cx="43" cy="37" rx="15" ry="3.6" fill="#fff" opacity=".42"/>' + studs +
        stick(63, 11, 49, 34, 'drT') + stick(83, 19, 60, 36, 'drT') + '</svg>';
    })(),
    bell: '<svg viewBox="0 0 100 100"><defs>' +
      lin('beB', 0, 0, 1, 0, [[0, '#6d410a'], [0.2, '#c88f22'], [0.42, '#ffe590'], [0.6, '#e3a932'], [0.84, '#935f0f'], [1, '#5a3205']]) +
      lin('beR', 0, 0, 1, 0, [[0, '#8a5a0e'], [0.45, '#f6cf6a'], [1, '#7c4d0b']]) +
      rad('beC', 0.35, 0.3, 0.8, [[0, '#ffe9a0'], [1, '#8a560c']]) +
      '</defs>' +
      '<ellipse cx="50" cy="91" rx="26" ry="4.5" fill="#000" opacity=".27"/>' +
      '<path d="M43 20a7 7 0 0 1 14 0" fill="none" stroke="#6d410a" stroke-width="3.4" stroke-linecap="round"/>' +
      '<rect x="41" y="18" width="18" height="6" rx="2.5" fill="url(#beR)" stroke="#5a3205" stroke-width="1"/>' +
      '<path d="M50 23C33 23 29 38 27 52C25 64 16 69 14 79H86C84 69 75 64 73 52C71 38 67 23 50 23Z" fill="url(#beB)" stroke="#53300a" stroke-width="1.5"/>' +
      '<path d="M29 47C42 53 58 53 71 47M22 67C39 73 61 73 78 67" fill="none" stroke="#5a3205" stroke-width="1.6" opacity=".55"/>' +
      '<path d="M37 36C34 48 32 58 29 68" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/>' +
      '<ellipse cx="50" cy="79" rx="36" ry="6.6" fill="url(#beR)" stroke="#53300a" stroke-width="1.3"/>' +
      '<ellipse cx="50" cy="79.5" rx="31" ry="4.4" fill="#2f1b03"/>' +
      '<circle cx="50" cy="83" r="6.2" fill="url(#beC)" stroke="#53300a" stroke-width="1.1"/></svg>',
    trumpet: '<svg viewBox="0 0 100 100"><defs>' +
      lin('trF', 0, 0, 0, 1, [[0, '#8a5a10'], [0.3, '#ffe28a'], [0.55, '#e3aa30'], [1, '#7a4c0b']]) +
      lin('trV', 0, 0, 1, 0, [[0, '#8e99a6'], [0.4, '#f4f7fa'], [1, '#7d8794']]) +
      rad('trP', 0.35, 0.3, 0.8, [[0, '#ffffff'], [1, '#c4d6e6']]) +
      '</defs>' +
      '<ellipse cx="50" cy="90" rx="38" ry="4.6" fill="#000" opacity=".26"/>' +
      tube('M24 58C24 84 58 84 58 60', 7.4, '#6a420a', '#d9a02c', '#fff0a6') +
      tube('M13 58H62', 7.4, '#6a420a', '#d9a02c', '#fff0a6') +
      '<path d="M60 51C72 51 82 41 92 27L92 89C82 75 72 65 60 65Z" fill="url(#trF)" stroke="#5f3a08" stroke-width="1.5"/>' +
      '<ellipse cx="92" cy="58" rx="5.4" ry="31" fill="url(#trF)" stroke="#5f3a08" stroke-width="1.4"/>' +
      '<ellipse cx="92" cy="58" rx="3.2" ry="27" fill="#3a2305" opacity=".85"/>' +
      '<path d="M68 53C78 52 86 44 91 34" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>' +
      '<g stroke="#5a6572" stroke-width="1"><rect x="29" y="43" width="7.4" height="17" rx="2.4" fill="url(#trV)"/><rect x="39" y="43" width="7.4" height="17" rx="2.4" fill="url(#trV)"/><rect x="49" y="43" width="7.4" height="17" rx="2.4" fill="url(#trV)"/></g>' +
      '<g stroke="#5a6572" stroke-width=".9"><circle cx="32.7" cy="40" r="3.8" fill="url(#trP)"/><circle cx="42.7" cy="40" r="3.8" fill="url(#trP)"/><circle cx="52.7" cy="40" r="3.8" fill="url(#trP)"/></g>' +
      '<path d="M8 52L14 55.5V60.5L8 64Z" fill="url(#trV)" stroke="#5a6572" stroke-width="1"/></svg>',
    drop: '<svg viewBox="0 0 100 100"><defs>' +
      rad('dpA', 0.42, 0.64, 0.62, [[0, '#d8f4ff', 0.95], [0.5, '#5fc0f5', 0.95], [1, '#1668b4']], 0.38, 0.7) +
      lin('dpB', 0, 0, 0, 1, [[0, '#ffffff', 0.0], [1, '#0b4f95', 0.45]]) +
      '</defs>' +
      '<ellipse cx="50" cy="91" rx="30" ry="5" fill="none" stroke="#3fa9e8" stroke-width="2.2" opacity=".75"/>' +
      '<ellipse cx="50" cy="91" rx="19" ry="3.2" fill="none" stroke="#3fa9e8" stroke-width="1.8" opacity=".6"/>' +
      '<path d="M50 9C41 29 21 44 21 63a29 29 0 0 0 58 0C79 44 59 29 50 9Z" fill="url(#dpA)" stroke="#0f5aa4" stroke-width="1.6"/>' +
      '<path d="M50 9C41 29 21 44 21 63a29 29 0 0 0 58 0C79 44 59 29 50 9Z" fill="url(#dpB)"/>' +
      '<path d="M26 66C27 78 36 87 50 89" fill="none" stroke="#c9efff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
      '<ellipse cx="37" cy="56" rx="5.2" ry="13" transform="rotate(20 37 56)" fill="#fff" opacity=".85"/>' +
      '<circle cx="62" cy="74" r="3.2" fill="#fff" opacity=".6"/><circle cx="66" cy="68" r="1.5" fill="#fff" opacity=".7"/></svg>',
    xylo: (function () {
      var cols = ['#d9473a', '#ef8a24', '#f2c02e', '#47ad5b', '#2e9ec8', '#3b64cf', '#8753c6'], bars = '', bolts = '';
      cols.forEach(function (c, i) {
        var len = 58 - i * 4.2, x = 9 + i * 12.1, y = 56 - len / 2;
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="10.4" height="' + len.toFixed(1) + '" rx="3.2" fill="' + c + '" stroke="#3a2210" stroke-width="1"/>' +
          '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="10.4" height="' + len.toFixed(1) + '" rx="3.2" fill="url(#xyH)"/>';
        bolts += '<circle cx="' + (x + 5.2).toFixed(1) + '" cy="46" r="1.5" fill="#3a2a1a"/><circle cx="' + (x + 5.2).toFixed(1) + '" cy="68" r="1.5" fill="#3a2a1a"/>';
      });
      return '<svg viewBox="0 0 100 100"><defs>' +
        lin('xyR', 0, 0, 0, 1, [[0, '#d9a86a'], [0.5, '#8a5a2b'], [1, '#4a2c12']]) +
        lin('xyH', 0, 0, 1, 0, [[0, '#fff', 0.5], [0.3, '#fff', 0.08], [0.62, '#000', 0], [1, '#000', 0.3]]) +
        rad('xyM', 0.35, 0.3, 0.8, [[0, '#fff'], [0.4, '#f5d9c9'], [1, '#d99a7a']]) +
        '</defs>' +
        '<ellipse cx="50" cy="91" rx="42" ry="4" fill="#000" opacity=".25"/>' +
        '<rect x="5" y="43" width="90" height="6" rx="3" fill="url(#xyR)" stroke="#3a2210" stroke-width="1"/>' +
        '<rect x="5" y="65" width="90" height="6" rx="3" fill="url(#xyR)" stroke="#3a2210" stroke-width="1"/>' +
        bars + bolts +
        stick(70, 10, 56, 32, 'xyM') + stick(90, 17, 74, 36, 'xyM') + '</svg>';
    })(),
    tambo: (function () {
      var jingles = '';
      for (var k = 0; k < 8; k++) {
        var a = (k * 45 + 22.5) * Math.PI / 180, cx = 50 + 32.5 * Math.cos(a), cy = 50 + 32.5 * Math.sin(a), tx = -Math.sin(a), ty = Math.cos(a);
        jingles += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="7.4" ry="2.6" transform="rotate(' + (k * 45 + 22.5 + 90).toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')" fill="#2a1808" opacity=".75"/>';
        [-1, 1].forEach(function (s) {
          jingles += '<circle cx="' + (cx + tx * 3.6 * s).toFixed(1) + '" cy="' + (cy + ty * 3.6 * s).toFixed(1) + '" r="3.7" fill="url(#tbJ)" stroke="#5e6b78" stroke-width=".8"/>';
        });
      }
      return '<svg viewBox="0 0 100 100"><defs>' +
        lin('tbW', 0, 0, 1, 1, [[0, '#d99a58'], [0.5, '#9a6330'], [1, '#5e3615']]) +
        rad('tbH', 0.4, 0.36, 0.8, [[0, '#fffaf0'], [0.7, '#ecdcb6'], [1, '#cdb582']]) +
        rad('tbJ', 0.35, 0.3, 0.8, [[0, '#ffffff'], [0.5, '#cfd9e3'], [1, '#8795a3']]) +
        '</defs>' +
        '<ellipse cx="50" cy="92" rx="34" ry="4.4" fill="#000" opacity=".26"/>' +
        '<circle cx="50" cy="50" r="38" fill="url(#tbW)" stroke="#3e2410" stroke-width="1.6"/>' +
        '<circle cx="50" cy="50" r="29" fill="url(#tbH)" stroke="#8a6a38" stroke-width="1.4"/>' +
        '<circle cx="50" cy="50" r="20" fill="none" stroke="#b78a4a" stroke-width="1" opacity=".5"/>' +
        '<ellipse cx="42" cy="38" rx="14" ry="6" transform="rotate(-28 42 38)" fill="#fff" opacity=".5"/>' +
        '<path d="M18 30A38 38 0 0 1 48 12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".32"/>' +
        jingles +
        '<path d="M76 20c4-6 10-7 13-3M78 23c6-3 11 0 13 5" fill="none" stroke="#e0483a" stroke-width="3.2" stroke-linecap="round"/></svg>';
    })()
  };
  var PADS = [
    { name: '북', dot: '🔴', color: '#dc5444', light: '#f59a86', deep: '#9c382c', art: ART.drum },
    { name: '종', dot: '🔵', color: '#4a80d8', light: '#92b4f2', deep: '#2f559a', art: ART.bell },
    { name: '나팔', dot: '🟢', color: '#34a057', light: '#7ccf95', deep: '#22703a', art: ART.trumpet },
    { name: '물방울', dot: '🟡', color: '#f2bc3c', light: '#ffdf84', deep: '#a8801f', art: ART.drop },
    { name: '실로폰', dot: '🟣', color: '#9468d2', light: '#bea4ee', deep: '#64449c', art: ART.xylo },
    { name: '탬버린', dot: '🟠', color: '#f4903d', light: '#fabb85', deep: '#bc6c26', art: ART.tambo }
  ];
  var SPEED_NAMES = { slow: '느리게', normal: '보통', fast: '빠르게' };
  var SPEED_ORDER = ['slow', 'normal', 'fast'];

  var G = null;          // 지금 진행 중인 단계
  var gameToken = 0;

  function st() { return A.store(); }
  function isUnlocked(n) { return n === 1 || st().sq[n - 2] > 0 || st().sq[n - 1] > 0; }
  function firstOpen() {
    for (var n = 1; n <= TOTAL; n++) if (st().sq[n - 1] === 0) return n;
    return TOTAL;
  }
  function allCleared() { return st().sq.every(function (s) { return s > 0; }); }

  function later(ms, fn) {
    var tok = G && G.token;
    setTimeout(function () { if (G && G.token === tok) fn(); }, ms);
  }

  /* ---------- 첫 화면 / 단계 고르기 / 방법 ---------- */
  function updateTitle() {
    var started = st().sq.some(function (s) { return s > 0; });
    $('#btnSqContinue').textContent = started ? (allCleared() ? '다시 도전하기' : '이어서 하기 · ' + firstOpen() + '단계') : '게임 시작';
  }

  function buildGrid() {
    var grid = $('#sqGrid');
    grid.innerHTML = '';
    var next = firstOpen();
    for (var n = 1; n <= TOTAL; n++) {
      if (n === 31) A.gridHead(grid);
      (function (n) {
        var s = st().sq[n - 1], unlocked = isUnlocked(n);
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
    '<p class="big">1. 시작을 누르세요 ▶</p>' +
    '<p>색깔 버튼이 차례로 반짝이면서 저마다 다른 악기 소리를 내요. 잘 보고 잘 들으세요.</p>' +
    '<p class="big">2. 같은 순서로 눌러요</p>' +
    '<p>반짝인 순서 그대로 버튼을 눌러 보세요. 위쪽 동그라미가 몇 번 눌렀는지 알려 줘요.</p>' +
    '<p class="big">3. 틀려도 괜찮아요</p>' +
    '<p>틀리면 순서를 바꿔서 새로 보여 드려요. 👀 다시 보기를 누르면 같은 순서를 한 번 더 볼 수 있어요. 한 번에 맞히면 별이 3개예요.</p>' +
    '<p class="big">4. 26단계부터는 거꾸로!</p>' +
    '<p>마지막에 나온 것부터 눌러요. 너무 빠르면 설정에서 속도를 바꿀 수 있어요.</p>' +
    '<p class="big">5. 31단계부터는 고수 코스 🔥</p>' +
    '<p>외울 개수가 더 많아져요(최대 10개). 41단계부터는 다시 거꾸로 눌러요.</p>';

  function showHow() {
    A.modal({ title: '게임 방법', html: '<div style="text-align:left">' + HOW_HTML + '</div>', buttons: [{ label: '알겠어요, 시작!' }] });
  }

  /* ---------- 단계 시작 ---------- */
  function startStage(n) {
    A.ensureAudio();
    var cfg = S.config(n);
    G = {
      stage: n, cfg: cfg, seq: S.generate(cfg.pads, cfg.length),
      phase: 'ready', input: [], replays: 0, started: false, cur: -1, token: ++gameToken
    };
    $('#sqStageTitle').textContent = n + '단계';
    A.show('sq-game');
    renderPads();
    refresh();
    setMsg(cfg.reverse ? '이번에는 거꾸로 눌러요! 준비되면 ▶ 시작을 눌러 주세요' : '준비되면 위쪽의 ▶ 시작을 눌러 주세요', false);
    if (!st().settings.sqSeenHow) {
      st().settings.sqSeenHow = true; A.persist();
      showHow();
    }
  }

  function renderPads() {
    var box = $('#sqPads');
    box.innerHTML = '';
    box.className = 'pads p' + G.cfg.pads + ' locked';
    for (var i = 0; i < G.cfg.pads; i++) {
      (function (i) {
        var p = PADS[i], b = document.createElement('button');
        b.className = 'pad';
        b.style.setProperty('--c', p.color);
        b.style.setProperty('--c2', p.light);
        b.style.setProperty('--cd', p.deep);
        b.setAttribute('data-i', i);
        b.setAttribute('aria-label', p.name);
        b.innerHTML = '<span class="art">' + p.art + '</span><span class="name">' + p.name + '</span>';
        b.addEventListener('pointerdown', function (e) { e.preventDefault(); onPad(i); });
        b.addEventListener('click', function (e) { if (e.detail === 0) onPad(i); });   // 키보드로 누를 때
        box.appendChild(b);
      })(i);
    }
  }

  /* ---------- 화면 갱신 ---------- */
  function setMsg(text, mine) {
    var el = $('#sqMsg');
    el.textContent = text;
    el.classList.toggle('mine', !!mine);
  }
  function refresh() { setDots(); updateInfo(); updateButton(); $('#sqPads').classList.toggle('locked', G.phase !== 'input'); }

  function setDots() {
    var box = $('#sqDots'), html = '';
    var filled = G.phase === 'show' ? G.cur : G.input.length;   // 몇 개까지 채웠나
    var ring = G.phase === 'show' ? G.cur : (G.phase === 'input' ? G.input.length : -1);
    for (var i = 0; i < G.cfg.length; i++) {
      var cls = i === ring ? 'cur' : (i < filled ? 'on' : '');
      html += '<i class="' + cls + '"></i>';
    }
    box.innerHTML = html;
  }
  function updateInfo() {
    $('#sqInfo').innerHTML = '<span>외울 개수 ' + G.cfg.length + (G.cfg.reverse ? ' · 거꾸로' : '') + '</span><span>다시 본 횟수 ' + G.replays + '</span>';
  }
  function updateButton() {
    var b = $('#btnSqReplay');
    b.textContent = !G.started ? '▶ 시작' : '👀 다시 보기';
    b.disabled = G.phase === 'show' || G.phase === 'lock' || G.phase === 'done';
  }

  /* ---------- 소리와 반짝임 ---------- */
  function soundPad(i) {
    var c = A.ctx();
    if (c && A.soundOn()) F.padSound(c, c.destination, i);
  }
  function winSound(stage, pads) {
    A.ensureAudio();
    var c = A.ctx();
    if (c && A.soundOn()) F.playSeq(c, c.destination, stage, pads);
  }
  function soundCue(kind) {
    var c = A.ctx();
    if (c && A.soundOn()) F.cue(c, c.destination, kind);
  }
  function flash(i, ms) {
    var b = $('#sqPads').children[i];
    if (!b) return;
    b.classList.add('lit');
    soundPad(i);
    setTimeout(function () { b.classList.remove('lit'); }, ms);
  }

  /* ---------- 순서 보여주기 ---------- */
  function play() {
    G.phase = 'show'; G.input = []; G.cur = -1;
    setMsg('잘 보고 들으세요 👀', false);
    refresh();
    var sp = S.speed(st().settings.sqSpeed), t = 700;
    G.seq.forEach(function (idx, k) {
      later(t, function () { G.cur = k; setDots(); flash(idx, sp.on); });
      t += sp.on + sp.gap;
    });
    later(t, function () {
      G.phase = 'input'; G.cur = -1;
      soundCue('go');
      setMsg(G.cfg.reverse ? '거꾸로! 마지막에 나온 것부터 눌러요' : '이제 같은 순서로 눌러 보세요', true);
      refresh();
    });
  }

  function onStartOrReplay() {
    if (!G || G.phase === 'show' || G.phase === 'lock' || G.phase === 'done') return;
    A.ensureAudio();
    if (!G.started) { G.started = true; }
    else { G.replays++; }
    updateInfo();
    play();
  }

  /* ---------- 버튼 누르기 ---------- */
  function onPad(i) {
    if (!G || G.phase !== 'input') return;
    A.ensureAudio();
    flash(i, 300);
    G.input.push(i);
    var r = S.check(G.seq, G.cfg.reverse, G.input);
    setDots();
    if (r === 'wrong') wrong();
    else if (r === 'done') { G.phase = 'done'; refresh(); later(600, win); }
  }

  function wrong() {
    G.phase = 'lock'; refresh();
    later(420, function () {
      soundCue('wrong');
      G.replays++; updateInfo();
      setMsg('앗, 괜찮아요! 순서를 바꿔서 다시 보여 드릴게요', false);
    });
    later(2200, function () {
      G.seq = S.generateDifferent(G.cfg.pads, G.cfg.length, null, G.seq);   // 틀리면 새로운 순서로 다시 도전
      play();
    });
  }

  /* ---------- 성공 ---------- */
  function win() {
    var n = G.stage, stars = S.starsFor(G.replays);
    var sq = st().sq;
    if (stars > sq[n - 1]) { sq[n - 1] = stars; A.persist(); }
    A.logPlay('s', n, stars);
    var milestone = F.isMilestone(n);
    winSound(n, G.cfg.pads);   // 5단계마다 특별한 효과음 + 이 단계에 나온 악기들의 짧은 합주(새소리 없음)
    var msg = stars === 3 ? '다시 보지 않고 한 번에 맞혔어요. 대단해요!' : stars === 2 ? '아주 잘했어요!' : '끝까지 해냈어요! 다음엔 별을 더 노려 봐요.';
    var buttons = [];
    if (n < TOTAL) buttons.push({ label: (n + 1) + '단계로 가기', onClick: function () { startStage(n + 1); } });
    buttons.push({ label: '다시 하기', sec: true, onClick: function () { startStage(n); } });
    buttons.push({ label: '단계 고르기', sec: true, onClick: function () { A.show('sq-stages'); } });
    var title = '🎉 ' + n + '단계 성공!';
    if (milestone) title = '✨ ' + n + '단계 돌파!';
    if (n === TOTAL) { title = '🏆 모든 단계 완료!'; msg = '정말 대단해요. 순서 기억 달인이세요!'; }
    var extra = milestone ? '<p>🎵 「' + F.name(n) + '」 · 🎶 악기 합주</p>' : '<p>🎶 악기들이 축하해 줘요</p>';
    A.modal({ title: title, html: '<div class="stars">' + A.starText(stars) + '</div><p>' + msg + '</p>' + extra, buttons: buttons });
  }

  /* ---------- 설정: 보여 주는 속도 ---------- */
  function renderSpeed() {
    var cur = st().settings.sqSpeed;
    $('#btnSqSpeed').textContent = '속도: ' + SPEED_NAMES[cur] + ' (누르면 바뀜)';
    // 악기 소리 미리듣기
    var box = $('#sqPadList');
    box.innerHTML = '';
    function addBtn(text, fn) {
      var b = document.createElement('button');
      b.className = 'btn sec';
      b.textContent = text;
      b.addEventListener('click', function () {
        if (!st().settings.sound) { st().settings.sound = true; A.persist(); A.renderSettings(); }
        A.ensureAudio();
        fn();
      });
      box.appendChild(b);
    }
    PADS.forEach(function (p, i) { addBtn(p.dot + ' ' + p.name, function () { soundPad(i); }); });
    addBtn('🎶 클리어할 때 나는 합주', function () { winSound(16, 6); });
    $('#sqSpeedDesc').textContent = cur === 'slow' ? '순서를 천천히 보여 드려요. 처음에는 이 속도를 권해요.'
      : cur === 'normal' ? '보통 속도로 보여 드려요.' : '빠르게 보여 드려요. 익숙해지면 도전해 보세요.';
  }

  /* ---------- 연결 ---------- */
  A.onShow(function (name) {
    if (name !== 'sq-game') { G = null; gameToken++; }
    if (name === 'sq-title') updateTitle();
    if (name === 'sq-stages') buildGrid();
    if (name === 'settings') renderSpeed();
  });
  $('#btnSqContinue').addEventListener('click', function () { startStage(allCleared() ? 1 : firstOpen()); });
  $('#btnSqStages').addEventListener('click', function () { A.show('sq-stages'); });
  $('#btnSqHow').addEventListener('click', function () { $('#sqHowText').innerHTML = HOW_HTML; A.show('sq-how'); });
  $('#btnSqLeave').addEventListener('click', function () { A.show('sq-stages'); });
  $('#btnSqReplay').addEventListener('click', onStartOrReplay);
  $('#btnSqSpeed').addEventListener('click', function () {
    var i = SPEED_ORDER.indexOf(st().settings.sqSpeed);
    st().settings.sqSpeed = SPEED_ORDER[(i + 1) % SPEED_ORDER.length];
    A.persist(); renderSpeed();
  });
  updateTitle();

  // 점검용
  window.__sq = { game: function () { return G; }, startStage: startStage };
})();
