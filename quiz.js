/* 기억놀이터 - 퀴즈형 게임 공통 화면 (속담 완성, 장보기 계산)
   한 단계 = 문제 5개. 보기를 눌러 답을 고르고, 틀려도 벌 없이 다시 고를 수 있다. 힌트는 무제한.
   화면(첫 화면, 단계 고르기, 게임, 방법)은 이 파일이 만들어 넣는다. 게임마다 다른 것은 spec 으로 넘긴다. */
(function () {
  'use strict';
  var A = window.KiokApp, F = window.AlkFanfare;
  var $ = A.$;

  /* ---------- 소리(간단한 효과음) ---------- */
  function tone(c, freq, t0, dur, type, gain) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function cue(kind) {
    var c = A.ctx();
    if (!c || !A.soundOn()) return;
    var t = c.currentTime + 0.01;
    if (kind === 'right') { tone(c, 659.25, t, 0.28, 'sine', 0.16); tone(c, 987.77, t + 0.11, 0.42, 'sine', 0.14); tone(c, 1318.5, t + 0.11, 0.42, 'triangle', 0.04); }
    else if (kind === 'wrong') { tone(c, 246.94, t, 0.3, 'triangle', 0.12); tone(c, 220, t + 0.12, 0.34, 'triangle', 0.1); }
    else if (kind === 'hint') { tone(c, 783.99, t, 0.2, 'sine', 0.1); tone(c, 880, t + 0.1, 0.25, 'sine', 0.08); }
  }
  function winSound(stage) {
    A.ensureAudio();
    var c = A.ctx();
    if (c && A.soundOn()) F.playMaze(c, c.destination, stage);
  }

  function create(spec) {
    var G = null;
    var gid = spec.id;                       // 화면 이름 접두어: pv / sh
    function st() { return A.store(); }
    function list() { return st()[spec.key]; }
    function isUnlocked(n) { return n === 1 || list()[n - 2] > 0 || list()[n - 1] > 0; }
    function firstOpen() {
      for (var n = 1; n <= spec.total; n++) if (list()[n - 1] === 0) return n;
      return spec.total;
    }
    function allCleared() { return list().every(function (s) { return s > 0; }); }
    function cleared() { return list().filter(function (s) { return s > 0; }).length; }

    /* ---------- 화면 만들기 ---------- */
    var app = document.getElementById('app');
    function section(id, html) {
      var s = document.createElement('section');
      s.id = 's-' + id; s.className = 'screen'; s.innerHTML = html;
      app.appendChild(s);
    }
    section(gid + '-title',
      '<div class="hero"><div class="bigemoji" aria-hidden="true">' + spec.emoji + '</div><h1>' + spec.name + '</h1><p class="tagline">' + spec.tagline + '</p></div>' +
      '<div class="menu"><button class="btn" id="' + gid + 'Continue">이어서 하기</button>' +
      '<button class="btn sec" id="' + gid + 'Stages">단계 고르기</button>' +
      '<button class="btn sec" id="' + gid + 'How">게임 방법</button>' +
      '<button class="btn sec" data-go="home">← 기억놀이터로</button></div>');
    section(gid + '-stages',
      '<header class="bar"><button class="btn small sec" data-go="' + gid + '-title">← 뒤로</button><h2>단계 고르기</h2></header>' +
      '<p class="note">' + spec.stagesNote + '</p><div id="' + gid + 'Grid" class="grid"></div>');
    section(gid + '-game',
      '<header class="bar"><button class="btn small sec" id="' + gid + 'Leave">← 나가기</button><h2 id="' + gid + 'StageTitle">1단계</h2>' +
      '<button class="btn small hint" id="' + gid + 'Hint">💡 힌트</button></header>' +
      '<div id="' + gid + 'Dots" class="dots" aria-hidden="true"></div>' +
      '<div class="card qcard"><p class="qno" id="' + gid + 'No"></p><p class="qtext" id="' + gid + 'Text" aria-live="polite"></p></div>' +
      '<p id="' + gid + 'Msg" class="turnmsg" aria-live="polite"></p>' +
      '<div id="' + gid + 'Opts" class="qopts"></div>' +
      '<button class="btn qnext hidden" id="' + gid + 'Next">다음 문제 ▶</button>');
    section(gid + '-how',
      '<header class="bar"><button class="btn small sec" data-go="' + gid + '-title">← 뒤로</button><h2>게임 방법</h2></header>' +
      '<div class="card howtext" id="' + gid + 'HowText"></div>');

    /* ---------- 첫 화면 / 단계 고르기 / 방법 ---------- */
    function updateTitle() {
      var started = list().some(function (s) { return s > 0; });
      $('#' + gid + 'Continue').textContent = started ? (allCleared() ? '다시 도전하기' : '이어서 하기 · ' + firstOpen() + '단계') : '게임 시작';
    }
    function updateHome() { var el = $('#prog' + spec.chip); if (el) el.textContent = cleared() + ' / ' + spec.total + '단계'; }

    function buildGrid() {
      var grid = $('#' + gid + 'Grid');
      grid.innerHTML = '';
      var next = firstOpen();
      for (var n = 1; n <= spec.total; n++) {
        (function (n) {
          var s = list()[n - 1], unlocked = isUnlocked(n), b = document.createElement('button');
          b.className = 'cell' + (!unlocked ? ' locked' : s > 0 ? ' cleared' : '') + (unlocked && n === next && !allCleared() ? ' next' : '');
          b.innerHTML = '<b>' + n + '</b><small>' + (unlocked ? A.starText(s) : '🔒') + '</small>';
          b.setAttribute('aria-label', n + '단계 ' + (unlocked ? '별 ' + s + '개' : '잠김'));
          if (unlocked) b.addEventListener('click', function () { startStage(n); });
          grid.appendChild(b);
        })(n);
      }
    }
    function showHow() {
      A.modal({ title: '게임 방법', html: '<div style="text-align:left">' + spec.how + '</div>', buttons: [{ label: '알겠어요, 시작!' }] });
    }

    /* ---------- 단계 진행 ---------- */
    function startStage(n) {
      A.ensureAudio();
      G = { stage: n, qs: spec.generate(n), i: 0, mistakes: 0, dead: {}, solved: false };
      $('#' + gid + 'StageTitle').textContent = n + '단계';
      A.show(gid + '-game');
      showQuestion();
      if (!st().settings[spec.seenKey]) { st().settings[spec.seenKey] = true; A.persist(); showHow(); }
    }

    function setMsg(text, mine) { var el = $('#' + gid + 'Msg'); el.textContent = text; el.classList.toggle('mine', !!mine); }

    function questionHtml(q, filled) {
      var parts = q.text.split('___');
      if (parts.length < 2) return q.text;
      return parts[0] + '<span class="blank' + (filled ? ' filled' : '') + '">' + (filled ? q.answerText : '＿＿＿') + '</span>' + parts.slice(1).join('');
    }

    function showQuestion() {
      var q = G.qs[G.i];
      q.answerText = q.labels ? q.labels[q.answerIndex] : q.options[q.answerIndex];
      G.solved = false; G.dead = {}; G.hinted = false;
      $('#' + gid + 'No').textContent = '문제 ' + (G.i + 1) + ' / ' + G.qs.length;
      $('#' + gid + 'Text').innerHTML = questionHtml(q, false);
      var dots = '';
      for (var d = 0; d < G.qs.length; d++) dots += '<i class="' + (d < G.i ? 'on' : d === G.i ? 'cur' : '') + '"></i>';
      $('#' + gid + 'Dots').innerHTML = dots;
      var box = $('#' + gid + 'Opts');
      box.innerHTML = '';
      (q.labels || q.options).forEach(function (label, idx) {
        var b = document.createElement('button');
        b.className = 'qopt';
        b.textContent = label;
        b.addEventListener('click', function () { choose(idx); });
        box.appendChild(b);
      });
      $('#' + gid + 'Next').classList.add('hidden');
      setMsg(G.i === 0 ? spec.firstMsg : '알맞은 것을 눌러 보세요', true);
    }

    function optButtons() { return $('#' + gid + 'Opts').children; }

    function choose(idx) {
      if (!G || G.solved || G.dead[idx]) return;
      var q = G.qs[G.i], btns = optButtons();
      if (idx === q.answerIndex) {
        G.solved = true;
        btns[idx].classList.add('right');
        for (var k = 0; k < btns.length; k++) if (k !== idx) btns[k].disabled = true;
        $('#' + gid + 'Text').innerHTML = questionHtml(q, true);
        cue('right');
        var last = G.i === G.qs.length - 1;
        setMsg(spec.rightMsg(q), false);
        var nx = $('#' + gid + 'Next');
        nx.textContent = last ? '결과 보기 ▶' : '다음 문제 ▶';
        nx.classList.remove('hidden');
        try { nx.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* 오래된 브라우저는 그냥 둔다 */ }
      } else {
        G.dead[idx] = true; G.mistakes++;
        btns[idx].classList.add('wrong'); btns[idx].disabled = true;
        cue('wrong');
        setMsg('아쉬워요! 괜찮아요, 다시 골라 보세요', false);
      }
    }

    function onHint() {
      if (!G || G.solved) return;
      var q = G.qs[G.i], btns = optButtons();
      cue('hint');
      var msg = '';
      if (spec.hintMode === 'text' && q.hint) { msg = '💡 ' + q.hint; }
      else {
        var cands = [];
        for (var k = 0; k < btns.length; k++) if (k !== q.answerIndex && !G.dead[k]) cands.push(k);
        if (cands.length > 1) {                              // 틀린 보기 하나를 지워 준다(정답은 항상 남긴다)
          var pick = cands[Math.floor(Math.random() * cands.length)];
          G.dead[pick] = true; btns[pick].classList.add('gone'); btns[pick].disabled = true;
          msg = '💡 틀린 보기 하나를 지웠어요';
        } else msg = '💡 남은 보기 중에 정답이 있어요. 천천히 읽어 보세요';
      }
      setMsg(msg, false);
    }

    function onNext() {
      if (!G || !G.solved) return;
      if (G.i < G.qs.length - 1) { G.i++; showQuestion(); } else win();
    }

    function win() {
      var n = G.stage, stars = spec.starsFor(G.mistakes), l = list();
      if (stars > l[n - 1]) { l[n - 1] = stars; A.persist(); }
      A.logPlay(spec.gameId, n, stars);
      var milestone = F.isMilestone(n);
      winSound(n);
      var msg = stars === 3 ? '하나도 틀리지 않았어요. 대단해요!' : stars === 2 ? '아주 잘했어요!' : '끝까지 해냈어요! 다음엔 별을 더 노려 봐요.';
      var buttons = [];
      if (n < spec.total) buttons.push({ label: (n + 1) + '단계로 가기', onClick: function () { startStage(n + 1); } });
      buttons.push({ label: '다시 하기', sec: true, onClick: function () { startStage(n); } });
      buttons.push({ label: '단계 고르기', sec: true, onClick: function () { A.show(gid + '-stages'); } });
      var title = '🎉 ' + n + '단계 성공!';
      if (milestone) title = '✨ ' + n + '단계 돌파!';
      if (n === spec.total) { title = '🏆 모든 단계 완료!'; msg = spec.doneMsg; }
      A.modal({ title: title, html: '<div class="stars">' + A.starText(stars) + '</div><p>' + msg + '</p><p>🎶 축하 소리가 울려요' + (milestone ? ' · 「' + F.name(n) + '」' : '') + '</p>', buttons: buttons });
    }

    /* ---------- 연결 ---------- */
    A.onShow(function (name) {
      if (name !== gid + '-game') G = null;
      if (name === gid + '-title') updateTitle();
      if (name === gid + '-stages') buildGrid();
      if (name === 'home') updateHome();
    });
    $('#' + gid + 'Continue').addEventListener('click', function () { startStage(allCleared() ? 1 : firstOpen()); });
    $('#' + gid + 'Stages').addEventListener('click', function () { A.show(gid + '-stages'); });
    $('#' + gid + 'How').addEventListener('click', function () { $('#' + gid + 'HowText').innerHTML = spec.how; A.show(gid + '-how'); });
    $('#' + gid + 'Leave').addEventListener('click', function () { A.show(gid + '-stages'); });
    $('#' + gid + 'Hint').addEventListener('click', onHint);
    $('#' + gid + 'Next').addEventListener('click', onNext);
    updateHome();
    updateTitle();
    return { game: function () { return G; }, startStage: startStage, choose: choose };
  }

  window.AlkQuiz = { create: create };
})();
