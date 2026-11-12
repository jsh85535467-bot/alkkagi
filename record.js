/* 기억놀이터 - 나의 기록 (화면)
   놀이 달력, 연속 놀이 일수, 게임별 놀이 점수(레이더 그래프), 게임별 진행, 최근 놀이를 보여 준다.
   점수는 놀이 기록일 뿐이며 검사나 진단이 아니다. */
(function () {
  'use strict';
  var A = window.KiokApp, R = window.AlkRecord;
  var $ = A.$;
  var vy, vm;      // 달력에 보이는 해, 월(0~11)

  function st() { return A.store(); }
  function log() { return st().log || []; }
  function resetView() { var d = new Date(); vy = d.getFullYear(); vm = d.getMonth(); }

  function homeChip() {
    var L = log(), now = Date.now(), el = $('#progRec');
    if (!el) return;
    if (!L.length) { el.textContent = '아직 기록이 없어요'; return; }
    var s = R.streak(L, now);
    el.textContent = (s > 0 ? '연속 ' + s + '일 · ' : '') + '이번 주 ' + R.weekDays(L, now) + '일';
  }

  function dateLabel(t, now) {
    var d = new Date(t), k = R.dayKey(t), today = R.dayKey(now), y = new Date(now);
    y.setDate(y.getDate() - 1);
    if (k === today) return '오늘';
    if (k === R.dayKey(y.getTime())) return '어제';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  /* ---------- 달력 ---------- */
  function calendarCard(now) {
    var L = log(), g = R.monthGrid(vy, vm, L, now), cur = new Date(now);
    var atNow = vy === cur.getFullYear() && vm === cur.getMonth();
    var s = R.streak(L, now), html = '<div class="card">';
    html += '<div class="calnav"><button class="btn small sec" id="recPrev" aria-label="이전 달">◀</button>' +
      '<h3>' + g.year + '년 ' + (g.month + 1) + '월</h3>' +
      '<button class="btn small sec" id="recNext" aria-label="다음 달"' + (atNow ? ' disabled' : '') + '>▶</button></div>';
    html += '<div class="recstats">' +
      '<div><b>' + s + '일</b><span>연속 놀이</span></div>' +
      '<div><b>' + R.weekDays(L, now) + '일</b><span>이번 주</span></div>' +
      '<div><b>' + R.todayPlays(L, now) + '판</b><span>오늘</span></div></div>';
    html += '<div class="cal">';
    ['일', '월', '화', '수', '목', '금', '토'].forEach(function (n) { html += '<div class="dow">' + n + '</div>'; });
    g.weeks.forEach(function (w) {
      w.forEach(function (c) {
        if (!c) { html += '<div class="day empty"></div>'; return; }
        html += '<div class="day' + (c.plays ? ' on' : '') + (c.today ? ' today' : '') + '"' +
          ' aria-label="' + (g.month + 1) + '월 ' + c.d + '일' + (c.plays ? ' ' + c.plays + '판 놀이' : '') + '">' + c.d + '</div>';
      });
    });
    html += '</div><p class="small">노란 동그라미는 놀이한 날이에요. 이 달에 <b>' + g.playedDays + '일</b> 놀았어요.</p></div>';
    return html;
  }

  /* ---------- 레이더 그래프(다섯 갈래) ---------- */
  var AX = [
    { g: 's', icon: '🧠', sub: '순서 기억하기', lx: 160, ly: 24, anc: 'middle' },
    { g: 'p', icon: '📖', sub: '속담 완성', lx: 262, ly: 100, anc: 'middle' },
    { g: 'c', icon: '🛒', sub: '장보기 계산', lx: 232, ly: 252, anc: 'middle' },
    { g: 'a', icon: '🎯', sub: '알까기', lx: 88, ly: 252, anc: 'middle' },
    { g: 'm', icon: '🧭', sub: '길 찾기', lx: 58, ly: 100, anc: 'middle' }
  ];
  function radarSvg(sc) {
    var cx = 160, cy = 150, R0 = 82, N = AX.length, i;
    function pt(k, v) { var a = (-90 + 360 * k / N) * Math.PI / 180, r = R0 * v / 100; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function poly(vals) { return vals.map(function (v, k) { var p = pt(k, v || 0); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    var same = function (v) { var o = []; for (var k = 0; k < N; k++) o.push(v); return o; };
    var s = '<svg viewBox="0 0 320 280" role="img" aria-label="게임별 놀이 점수 그래프">';
    [33, 66, 100].forEach(function (v) { s += '<polygon points="' + poly(same(v)) + '" style="fill:' + (v === 100 ? 'var(--rg-fill)' : 'none') + ';stroke:var(--rg-grid)" stroke-width="2"/>'; });
    for (i = 0; i < N; i++) { var e = pt(i, 100); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" style="stroke:var(--rg-grid)" stroke-width="2"/>'; }
    var firsts = AX.map(function (a) { return sc[a.g].first; }), recents = AX.map(function (a) { return sc[a.g].recent; });
    if (firsts.every(function (v) { return v !== null; })) {
      s += '<polygon points="' + poly(firsts) + '" style="fill:none;stroke:var(--rg-first)" stroke-width="3" stroke-dasharray="7 6" stroke-linejoin="round"/>';
    }
    s += '<polygon points="' + poly(recents) + '" style="fill:var(--rg-recent-fill);stroke:var(--rg-recent)" stroke-width="4" stroke-linejoin="round"/>';
    for (i = 0; i < N; i++) if (recents[i] !== null) { var p = pt(i, recents[i]); s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="6" style="fill:var(--rg-recent);stroke:var(--rg-dot-ring)" stroke-width="2"/>'; }
    for (i = 0; i < N; i++) {
      s += '<text x="' + AX[i].lx + '" y="' + AX[i].ly + '" text-anchor="' + AX[i].anc + '" font-family="Gowun Dodum, sans-serif" font-weight="bold" font-size="20" style="fill:var(--rg-text)">' + AX[i].icon + ' ' + R.AXES[AX[i].g] + '</text>';
    }
    return s + '</svg>';
  }

  function radarCard() {
    var L = log(), sc = {}, anyRecent = false;
    R.GAMES.forEach(function (g) { sc[g] = R.gameScore(L, g); if (sc[g].recent !== null) anyRecent = true; });
    var html = '<div class="card radar"><h3>내 놀이 점수</h3>';
    if (!anyRecent) {
      html += '<p>게임마다 <b>3판</b> 이상 하면 그래프가 그려져요. 지금까지 놀이한 판: ' + L.length + '판</p>';
    } else {
      html += radarSvg(sc);
      var firstsAll = AX.every(function (a) { return sc[a.g].first !== null; });
      html += '<p class="legend"><i class="lg-recent"></i> 최근 10판' + (firstsAll ? ' &nbsp; <i class="lg-first"></i> 처음 10판' : '') + '</p>';
    }
    html += '<ul class="scorelist">';
    AX.forEach(function (a) {
      var v = sc[a.g], line;
      if (v.recent === null) line = '아직 몰라요 <small>(' + v.plays + '판 · 3판 이상 하면 나와요)</small>';
      else {
        line = '<b>' + v.recent + '점</b>';
        if (v.first !== null) { var diff = v.recent - v.first; line += diff > 0 ? ' <em class="up">처음보다 ▲' + diff + '</em>' : diff < 0 ? ' <em class="down">처음보다 ▼' + (-diff) + '</em>' : ' <em>처음과 같아요</em>'; }
        line += ' <small>(' + v.plays + '판)</small>';
      }
      html += '<li><span>' + a.icon + ' ' + R.AXES[a.g] + ' <small>' + a.sub + '</small></span><span>' + line + '</span></li>';
    });
    html += '</ul><p class="small">점수는 "높은 단계를 얼마나 깔끔하게 깼는지"를 보여 주는 <b>놀이 기록</b>일 뿐, 검사나 진단이 아니에요.</p></div>';
    return html;
  }

  /* ---------- 게임별 진행, 최근 놀이 ---------- */
  function gamesCard(now) {
    var s = st(), L = log(), html = '<div class="card"><h3>게임별 진행</h3>';
    [['a', '🎯', s.stars], ['s', '🧠', s.sq], ['m', '🐿️', s.mz], ['p', '📖', s.pv], ['c', '🛒', s.sh]].forEach(function (x) {
      var p = R.progress(x[2], L, x[0]), pct = Math.round(p.cleared / x[2].length * 100);
      html += '<div class="gamerow"><div class="top"><span>' + x[1] + ' ' + R.NAMES[x[0]] + '</span><span>' + p.cleared + ' / 30단계</span></div>' +
        '<div class="meter"><i style="width:' + pct + '%"></i></div>' +
        '<div class="sub">별 ' + p.stars + ' / 90' + (p.top ? ' · 가장 높이 깬 단계 ' + p.top : '') + (p.last ? ' · 마지막 ' + dateLabel(p.last, now) : '') + '</div></div>';
    });
    return html + '</div>';
  }

  function recentCard(now) {
    var items = R.recent(log(), 8), html = '<div class="card"><h3>최근 놀이</h3>';
    if (!items.length) return html + '<p>아직 없어요. 게임을 한 판 끝내면 여기에 쌓여요.</p></div>';
    html += '<ul class="recent">';
    items.forEach(function (e) {
      var res = (e.g === 'a' && e.r === 0) ? '<span class="miss">아쉬움</span>' : '<span class="stars3">' + A.starText(e.r) + '</span>';
      html += '<li><span class="when">' + dateLabel(e.t, now) + '</span><span class="what">' + R.NAMES[e.g] + ' ' + e.s + '단계</span>' + res + '</li>';
    });
    return html + '</ul></div>';
  }

  function render() {
    var now = Date.now();
    var html = '';
    if (!log().length) html += '<div class="card"><h3>기록을 쌓아 보세요</h3><p>게임을 한 판 끝낼 때마다 언제, 어떤 게임을, 몇 단계 했는지 기록돼요. 달력에 놀이한 날이 노랗게 표시되고, 연속으로 놀면 일수가 올라가요.</p></div>';
    html += calendarCard(now) + radarCard() + gamesCard(now) + recentCard(now);
    html += '<p class="note">달력과 점수는 이 폰에만 쌓여요. 단계와 별은 "다른 폰으로 옮기기" 코드로 옮겨져요.</p>';
    $('#recBody').innerHTML = html;
    var prev = $('#recPrev'), next = $('#recNext');
    if (prev) prev.addEventListener('click', function () { vm--; if (vm < 0) { vm = 11; vy--; } render(); });
    if (next) next.addEventListener('click', function () {
      var c = new Date();
      if (vy > c.getFullYear() || (vy === c.getFullYear() && vm >= c.getMonth())) return;
      vm++; if (vm > 11) { vm = 0; vy++; } render();
    });
  }

  A.onShow(function (name) {
    if (name === 'record') { resetView(); render(); }
    if (name === 'home') homeChip();
  });
  resetView();
  homeChip();

  window.__rec = { render: render, logs: log };
})();
