/* 추억의 알까기 - 클리어 효과음 (요즘 느낌의 맑고 청량한 소리 + 새소리)
   소리 파일 없이 코드로 직접 만든다. 모두 이 게임을 위해 새로 만든 소리라 저작권 걱정이 없다.

   - 5단계마다(5·10·15·20·25·30): 특별한 효과음 6곡 + 그 구간의 새소리
   - 그 밖의 단계: 짧은 "팝!" 멜로디 + 그 구간의 새소리
   - 새소리는 5단계 묶음마다 다르다: 1~5 참새 / 6~10 휘파람새 / 11~15 뻐꾸기 /
     16~20 카나리아 / 21~25 꾀꼬리 / 26~30 종달새
   - 새소리 높이는 대부분 3kHz 이하로 맞췄다(나이가 들면 아주 높은 소리가 잘 안 들리기 때문). */
(function (root) {
  'use strict';
  var REVERB_SEC = 1.6;
  var TAIL = 0.4 + REVERB_SEC;       // 마지막 소리가 끝난 뒤 울림이 사라질 때까지

  function mtof(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function rngFor(seed) {            // 같은 단계는 늘 같은 소리가 나도록 고정된 난수
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function group(stage) { return Math.max(0, Math.min(5, Math.floor((stage - 1) / 5))); }

  /* ================= 악기 ================= */
  function noiseBuffer(ctx) {
    if (!ctx.__alkNoise) {
      var n = Math.floor(ctx.sampleRate * 1.8), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      var r = rngFor(4242);   // 고정된 난수: 들을 때마다 같은 소리
      for (var i = 0; i < n; i++) d[i] = r() * 2 - 1;
      ctx.__alkNoise = b;
    }
    return ctx.__alkNoise;
  }
  function reverbBuffer(ctx) {
    if (!ctx.__alkIR) {
      var n = Math.floor(ctx.sampleRate * REVERB_SEC), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      var r = rngFor(777);
      for (var i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 2.6);
      ctx.__alkIR = b;
    }
    return ctx.__alkIR;
  }

  // 말랑한 건반(칼림바·마림바 느낌): 짧게 "통-" 하고 사라지는 소리
  function pluck(ctx, dest, midi, t, vol, len) {
    len = len || 0.4;
    var f = mtof(midi);
    [[1, 1, 1], [2, 0.3, 0.6], [4, 0.1, 0.3]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain(), dl = len * p[2];
      o.type = 'sine';
      o.frequency.value = f * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * p[1], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dl);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dl + 0.05);
    });
  }

  // 맑은 종(유리 종소리): 약한 주파수 변조로 반짝이는 소리
  function bell(ctx, dest, midi, t, len, vol) {
    var f = mtof(midi);
    var car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.type = 'sine'; mod.type = 'sine';
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 3, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.04, t + len * 0.5);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    car.connect(g); g.connect(dest);
    car.start(t); car.stop(t + len + 0.05);
    mod.start(t); mod.stop(t + len + 0.05);
    var h = ctx.createOscillator(), hg = ctx.createGain();
    h.type = 'sine'; h.frequency.value = f * 2;
    hg.gain.setValueAtTime(0.0001, t);
    hg.gain.linearRampToValueAtTime(vol * 0.25, t + 0.005);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.4);
    h.connect(hg); hg.connect(dest);
    h.start(t); h.stop(t + len * 0.4 + 0.05);
  }

  // 포근하게 깔리는 화음
  function pad(ctx, dest, midis, t, dur, vol) {
    midis.forEach(function (m) {
      [-5, 5].forEach(function (cents) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = cents;
        f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.4;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.3);
        g.gain.linearRampToValueAtTime(vol * 0.8, t + Math.max(0.31, dur - 0.5));
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(f); f.connect(g); g.connect(dest);
        o.start(t); o.stop(t + dur + 0.05);
      });
    });
  }

  // 바람이 스치듯 올라가는 소리(기대감)
  function whoosh(ctx, dest, t, dur, f0, f1, vol) {
    var s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(ctx);
    bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.05);
  }

  function kick(ctx, dest, t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.3);
  }
  function shaker(ctx, dest, t, vol) {
    var s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(ctx);
    hp.type = 'highpass'; hp.frequency.value = 6500;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(hp); hp.connect(g); g.connect(dest);
    s.start(t); s.stop(t + 0.08);
  }
  // 물방울이 "퐁" 하고 터지는 소리
  function pop(ctx, dest, t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(1000, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + 0.16);
  }

  // 반짝이는 종소리가 흩뿌려지는 효과
  function sparkle(ctx, dest, t, count, scale, vol, gap, rng) {
    for (var i = 0; i < count; i++) {
      var m = scale[Math.floor(rng() * scale.length)];
      if (rng() > 0.55 && m + 12 <= 100) m += 12;
      bell(ctx, dest, m, t + i * gap + rng() * gap * 0.6, 0.6, vol * (0.6 + rng() * 0.5));
    }
  }

  /* ================= 새소리 ================= */
  // 새 한 마디: f0에서 f1로 미끄러지는 맑은 소리(가끔 떨림 vib Hz)
  function tweet(ctx, dest, t, dur, f0, f1, vol, vib) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine'; o2.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    o2.frequency.setValueAtTime(f0 * 2, t);
    o2.frequency.exponentialRampToValueAtTime(Math.max(60, f1) * 2, t + dur);
    var a = Math.min(0.015, dur * 0.3);
    [[g, vol], [g2, vol * 0.16]].forEach(function (p) {
      p[0].gain.setValueAtTime(0.0001, t);
      p[0].gain.linearRampToValueAtTime(p[1], t + a);
      p[0].gain.linearRampToValueAtTime(p[1] * 0.7, t + Math.max(a, dur * 0.7));
      p[0].gain.linearRampToValueAtTime(0.0001, t + dur);
    });
    if (vib) {
      var l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 26; lg.gain.value = vib;
      l.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      l.start(t); l.stop(t + dur + 0.02);
    }
    o.connect(g); g.connect(dest); o2.connect(g2); g2.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
    o2.start(t); o2.stop(t + dur + 0.02);
  }

  var BIRDS = [
    // 1~5단계 참새: 짧고 또박또박한 "짹짹 짹짹짹"
    { name: '참새', dur: 1.3, sing: function (ctx, d, t, rng) {
      var gaps = [0, 0.13, 0.24, 0.42, 0.53, 0.64, 0.86, 0.97];
      gaps.forEach(function (g, i) {
        var f0 = 2700 + rng() * 350;
        var up = i === 3 || i === 6;
        tweet(ctx, d, t + g, 0.07, up ? f0 * 0.8 : f0, up ? f0 : f0 * 0.78, i % 2 ? 0.12 : 0.17);
      });
    } },
    // 6~10단계 휘파람새: "호오오~ 호르르르 케쿄"
    { name: '휘파람새', dur: 1.9, sing: function (ctx, d, t) {
      tweet(ctx, d, t, 0.3, 1500, 2200, 0.2, 10);
      tweet(ctx, d, t + 0.3, 0.3, 2200, 2000, 0.18, 8);
      for (var i = 0; i < 9; i++) tweet(ctx, d, t + 0.85 + i * 0.056, 0.045, i % 2 ? 2900 : 2500, i % 2 ? 2500 : 2900, 0.12);
      tweet(ctx, d, t + 1.45, 0.09, 3000, 2400, 0.16);
      tweet(ctx, d, t + 1.58, 0.12, 2300, 3000, 0.17);
    } },
    // 11~15단계 뻐꾸기: 낮고 포근한 "뻐-꾹 뻐-꾹"
    { name: '뻐꾸기', dur: 1.7, sing: function (ctx, d, t) {
      [0, 0.85].forEach(function (o) {
        tweet(ctx, d, t + o, 0.17, 800, 720, 0.26);
        tweet(ctx, d, t + o + 0.22, 0.34, 640, 600, 0.26);
      });
    } },
    // 16~20단계 카나리아: 굴러가는 듯한 재잘거림
    { name: '카나리아', dur: 2.0, sing: function (ctx, d, t, rng) {
      for (var i = 0; i < 20; i++) {
        var f0 = 2200 + rng() * 1000, f1 = f0 * (0.85 + rng() * 0.35);
        tweet(ctx, d, t + i * 0.062, 0.05, f0, f1, 0.13, rng() > 0.5 ? 60 : 0);
      }
      tweet(ctx, d, t + 1.3, 0.26, 2200, 3100, 0.16, 40);
      tweet(ctx, d, t + 1.58, 0.3, 3100, 2100, 0.16, 40);
    } },
    // 21~25단계 꾀꼬리: 플루트처럼 맑은 "삐-오-리 삐-오-리"
    { name: '꾀꼬리', dur: 2.0, sing: function (ctx, d, t) {
      [[0, 0], [1.15, 200]].forEach(function (p) {
        var o = p[0], up = p[1];
        tweet(ctx, d, t + o, 0.2, 1700 + up, 2300 + up, 0.2, 8);
        tweet(ctx, d, t + o + 0.25, 0.28, 2300 + up, 1600 + up, 0.2, 12);
        tweet(ctx, d, t + o + 0.6, 0.38, 1700 + up, 2100 + up, 0.2, 12);
      });
    } },
    // 26~30단계 종달새: 끊임없이 솟아오르는 노래
    { name: '종달새', dur: 2.7, sing: function (ctx, d, t, rng) {
      for (var i = 0; i < 44; i++) {
        var base = 2000 + i * 22 + rng() * 420;
        var trill = (i % 8) > 4;
        tweet(ctx, d, t + i * 0.052, 0.045, trill ? base * 1.12 : base, trill ? base : base * 1.08, 0.04 + 0.11 * Math.sin(Math.PI * Math.min(1, i / 44)) + 0.03, 0);
      }
      tweet(ctx, d, t + 2.35, 0.2, 2600, 3300, 0.17, 20);
    } }
  ];

  /* ================= 5단계마다 울리는 효과음 6곡 ================= */
  var SONGS = {
    // 5단계: 도미솔도 반짝 올라가는 "반짝 팝"
    5: { name: '반짝 팝', body: 1.6, build: function (ctx, d, t, rng) {
      pop(ctx, d, t, 0.22);
      [72, 76, 79, 84, 88].forEach(function (m, i) { pluck(ctx, d, m, t + 0.02 + i * 0.11, 0.2, 0.45); });
      bell(ctx, d, 84, t + 0.6, 1.6, 0.14);
      bell(ctx, d, 91, t + 0.62, 1.5, 0.1);
      pad(ctx, d, [60, 64, 67, 72], t + 0.55, 1.6, 0.05);
      sparkle(ctx, d, t + 0.75, 6, [84, 86, 88, 91, 93], 0.07, 0.11, rng);
    } },
    // 10단계: 살랑 부는 봄바람 위의 말랑한 멜로디
    10: { name: '봄바람', body: 2.6, build: function (ctx, d, t, rng) {
      whoosh(ctx, d, t, 0.9, 600, 3500, 0.05);
      var notes = [79, 81, 83, 86, 83, 86, 88, 91], times = [0, 0.22, 0.44, 0.66, 1.0, 1.22, 1.44, 1.76];
      notes.forEach(function (m, i) { pluck(ctx, d, m, t + 0.1 + times[i], 0.2, 0.5); });
      pad(ctx, d, [55, 59, 62, 67], t + 0.1, 2.6, 0.05);
      bell(ctx, d, 91, t + 1.86, 1.6, 0.13);
      bell(ctx, d, 86, t + 1.88, 1.6, 0.1);
      sparkle(ctx, d, t + 2.0, 6, [86, 88, 91, 93, 95], 0.06, 0.1, rng);
    } },
    // 15단계: 통통 튀는 리듬
    15: { name: '통통 리듬', body: 2.2, build: function (ctx, d, t, rng) {
      var run = [74, 78, 81, 86, 81, 86, 90, 93];
      run.forEach(function (m, i) { pluck(ctx, d, m, t + i * 0.114, 0.19, 0.22); });
      [0, 0.455, 0.91, 1.365].forEach(function (x) { kick(ctx, d, t + x, 0.3); });
      for (var i = 0; i < 8; i++) shaker(ctx, d, t + i * 0.228, 0.05);
      pop(ctx, d, t + 0.46, 0.16); pop(ctx, d, t + 0.91, 0.16);
      [86, 90, 93, 98].forEach(function (m, i) { pluck(ctx, d, m, t + 1.37 + i * 0.09, 0.2, 0.3); });
      bell(ctx, d, 93, t + 1.7, 1.4, 0.13);
      bell(ctx, d, 86, t + 1.72, 1.4, 0.1);
      pad(ctx, d, [62, 66, 69, 74], t + 1.3, 1.6, 0.05);
      sparkle(ctx, d, t + 1.8, 5, [86, 90, 93, 95], 0.06, 0.09, rng);
    } },
    // 20단계: 맑은 종소리가 하늘로 번지는 "맑은 종소리"
    20: { name: '맑은 종소리', body: 3.4, build: function (ctx, d, t, rng) {
      [77, 81, 84, 89].forEach(function (m, i) { bell(ctx, d, m, t + i * 0.4, 1.8, 0.16); });
      [72, 77, 81, 84].forEach(function (m) { bell(ctx, d, m, t + 1.9, 2.2, 0.12); });
      sparkle(ctx, d, t + 2.1, 12, [77, 79, 81, 84, 86], 0.06, 0.07, rng);
      pad(ctx, d, [53, 57, 60, 65], t + 0.2, 3.2, 0.055);
      whoosh(ctx, d, t + 1.2, 0.8, 800, 4200, 0.04);
    } },
    // 25단계: 쑥 올라가 "펑!" 터지는 별빛 폭죽
    25: { name: '별빛 폭죽', body: 3.0, build: function (ctx, d, t, rng) {
      whoosh(ctx, d, t, 1.3, 400, 5000, 0.08);
      kick(ctx, d, t + 1.3, 0.35);
      [69, 73, 76, 81, 85].forEach(function (m) { bell(ctx, d, m, t + 1.3, 2.0, 0.12); });
      [81, 85, 88, 93].forEach(function (m, i) { pluck(ctx, d, m, t + 1.32 + i * 0.07, 0.2, 0.3); });
      sparkle(ctx, d, t + 1.4, 16, [81, 83, 85, 88, 90, 93], 0.065, 0.09, rng);
      pad(ctx, d, [57, 61, 64, 69], t + 1.2, 2.4, 0.06);
      for (var i = 0; i < 6; i++) shaker(ctx, d, t + 1.3 + i * 0.117, 0.05);
    } },
    // 30단계: 모든 소리가 한꺼번에 터지는 대축제
    30: { name: '대축제', body: 6.0, build: function (ctx, d, t, rng) {
      whoosh(ctx, d, t, 1.0, 500, 5000, 0.08);
      kick(ctx, d, t + 1.0, 0.36);
      [60, 64, 67, 72, 76].forEach(function (m) { bell(ctx, d, m, t + 1.0, 2.2, 0.12); });
      [72, 74, 76, 79, 81, 84, 88, 91].forEach(function (m, i) { pluck(ctx, d, m, t + 1.0 + i * 0.1, 0.2, 0.35); });
      for (var k = 0; k < 6; k++) kick(ctx, d, t + 1.0 + k * 0.5, 0.26);
      for (var s = 0; s < 14; s++) shaker(ctx, d, t + 1.0 + s * 0.25, 0.045);
      [84, 88, 91, 96].forEach(function (m, i) { bell(ctx, d, m, t + 2.0 + i * 0.35, 1.5, 0.13); });
      pad(ctx, d, [48, 55, 60, 64], t + 1.0, 2.6, 0.055);
      // 한 단계 높여서 한 번 더
      whoosh(ctx, d, t + 3.2, 0.5, 700, 4000, 0.06);
      kick(ctx, d, t + 3.6, 0.36);
      [62, 66, 69, 74, 78].forEach(function (m) { bell(ctx, d, m, t + 3.6, 2.0, 0.12); });
      [74, 76, 78, 81, 83, 86, 90, 93].forEach(function (m, i) { pluck(ctx, d, m, t + 3.6 + i * 0.09, 0.2, 0.35); });
      pad(ctx, d, [50, 57, 62, 66], t + 3.6, 2.0, 0.055);
      // 마지막 큰 화음과 반짝이는 소나기
      kick(ctx, d, t + 5.0, 0.4);
      [64, 68, 71, 76, 80, 83].forEach(function (m) { bell(ctx, d, m, t + 5.0, 2.6, 0.12); });
      pad(ctx, d, [52, 56, 59, 64], t + 5.0, 2.2, 0.06);
      sparkle(ctx, d, t + 5.0, 30, [76, 78, 80, 83, 85, 88], 0.055, 0.07, rng);
    } }
  };

  // 5의 배수가 아닌 단계: 짧은 "퐁-도미솔~" (구간마다 음이 조금씩 다름)
  var CHIME_ROOTS = [72, 74, 76, 77, 79, 81];
  var CHIME_SHAPES = [[0, 4, 7], [0, 4, 9], [0, 5, 9], [0, 2, 7], [0, 4, 11], [0, 7, 12]];
  var CHIME_BODY = 0.9;
  function chime(ctx, d, t, g) {
    var r = CHIME_ROOTS[g], sh = CHIME_SHAPES[g];
    pop(ctx, d, t, 0.2);
    sh.forEach(function (o, i) { pluck(ctx, d, r + o, t + 0.04 + i * 0.09, 0.2, 0.4); });
    bell(ctx, d, r + 12, t + 0.3, 1.0, 0.13);
  }

  /* ================= 재생 ================= */
  var current = [];     // 앞 소리가 아직 울리고 있으면 부드럽게 끄기 위해
  // 효과음(종·건반·팝 등)의 음량 배율. 1이면 이전 그대로, 작을수록 조용해진다.
  // 새소리는 이 값의 영향을 받지 않는다(아래 LEVELS 값 그대로).
  var EFFECT_GAIN = 0.65;
  var LEVEL_CHIME = 2.0;                                   // 기본값
  var CHIME_LEVELS = [2.3, 2.15, 1.75, 2.3, 2.05, 2.25];    // 일반 단계 소리(새 구간별)
  var LEVELS = { 5: 1.75, 10: 1.4, 15: 1.2, 20: 1.35, 25: 1.15, 30: 1.0 };   // 5단계마다 울리는 곡

  // level: 곡마다 음량을 맞추는 값(게임 안의 다른 소리와 비슷하게 들리도록)
  function fadePrevious(ctx) {
    current.forEach(function (m) {
      try { if (m.context === ctx) m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.06); } catch (e) { /* 이미 끝난 소리 */ }
    });
    current = [];
  }
  function chain(ctx, dest, level) {
    var master = ctx.createGain();
    master.gain.value = 0.9;
    var comp = ctx.createDynamicsCompressor();   // 소리가 갑자기 커져도 깨지지 않게 부드럽게 눌러 준다
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    var out = ctx.createGain();
    out.gain.value = level == null ? LEVEL_CHIME : level;   // 0도 올바른 값(소리 끄기)으로 취급
    var wet = ctx.createGain(), conv = ctx.createConvolver();
    wet.gain.value = 0.26;
    conv.buffer = reverbBuffer(ctx);
    master.connect(comp);
    master.connect(conv); conv.connect(wet); wet.connect(comp);
    comp.connect(out); out.connect(dest);
    current.push(master);
    return master;
  }

  function bodyOf(stage) { return SONGS[stage] ? SONGS[stage].body : CHIME_BODY; }
  function birdAt(stage) { return bodyOf(stage) * (SONGS[stage] ? 0.8 : 0.5); }   // 효과음 여운 위로 새가 노래
  function duration(stage) {
    var g = group(stage);
    return 0.06 + birdAt(stage) + BIRDS[g].dur + TAIL;
  }

  // 클리어 소리 전체(효과음 + 새소리). 끝날 때까지의 초를 돌려준다
  // opts(점검용): { effectGain, birdGain } 로 효과음/새소리 음량 배율을 따로 바꿔 볼 수 있다
  function playWin(ctx, dest, stage, opts) {
    stage = Math.max(1, Math.min(30, stage | 0));
    opts = opts || {};
    var g = group(stage), level = LEVELS[stage] || CHIME_LEVELS[g];
    var effGain = opts.effectGain == null ? EFFECT_GAIN : opts.effectGain;
    var birdGain = opts.birdGain == null ? 1 : opts.birdGain;
    fadePrevious(ctx);
    // 효과음과 새소리는 각자 따로 음량을 조절하는 통로를 쓴다
    var fx = chain(ctx, dest, level * effGain);
    var bird = chain(ctx, dest, level * birdGain);
    var t0 = ctx.currentTime + 0.06, rng = rngFor(stage * 7919 + 13);
    if (SONGS[stage]) SONGS[stage].build(ctx, fx, t0, rng);
    else chime(ctx, fx, t0, g);
    BIRDS[g].sing(ctx, bird, t0 + birdAt(stage), rngFor(g * 104729 + 7));
    return duration(stage);
  }
  // 새소리만(점검·미리듣기용)
  function playBird(ctx, dest, g) {
    g = Math.max(0, Math.min(5, g | 0));
    fadePrevious(ctx);
    BIRDS[g].sing(ctx, chain(ctx, dest, CHIME_LEVELS[g]), ctx.currentTime + 0.06, rngFor(g * 104729 + 7));
    return 0.06 + BIRDS[g].dur + TAIL;
  }

  /* ================= 순서 기억하기: 버튼 소리와 안내 소리 ================= */
  // 버튼마다 전혀 다른 악기 소리가 난다. 높이·음색·리듬이 모두 달라서 귀로 구별하기 쉽다.
  // (예전에는 새소리 6종이었는데, 셋이 비슷한 높이의 "삐리릭"이라 구별이 어려워서 바꿨다)
  //   0 북 "둥"(낮고 묵직) / 1 종 "딩~"(높고 길게 울림) / 2 나팔 "빰~"(중간 높이, 길게 이어짐)
  //   3 물방울 "또록"(위로 올라가는 소리) / 4 실로폰 "통통"(나무 소리 두 번) / 5 탬버린 "찰찰찰"(쇳소리)
  // 끝나는 데 걸리는 초를 돌려준다.
  var PAD_LEVEL = 2.0;
  var PAD_NAMES = ['북', '종', '나팔', '물방울', '실로폰', '탬버린'];
  function drum(ctx, d, t, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';                                   // 폰 스피커에서도 들리도록 배음이 있는 파형
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(105, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.45);
    var s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();   // 북채가 닿는 "탁"
    s.buffer = noiseBuffer(ctx);
    lp.type = 'lowpass'; lp.frequency.value = 900;
    ng.gain.setValueAtTime(vol * 0.6, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(lp); lp.connect(ng); ng.connect(d); s.start(t); s.stop(t + 0.07);
  }
  function trumpet(ctx, d, t, midi, dur, vol) {
    [-6, 6].forEach(function (cents) {
      var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = cents;
      f.type = 'lowpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(500, t);
      f.frequency.linearRampToValueAtTime(1700, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.035);
      g.gain.linearRampToValueAtTime(vol * 0.85, t + dur - 0.06);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.03);
    });
  }
  function rattle(ctx, d, t, len, vol) {
    var s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(ctx);
    bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.7;
    hp.type = 'highpass'; hp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(hp); hp.connect(g); g.connect(d);
    s.start(t, (t * 7.3) % 1); s.stop(t + len + 0.03);
  }
  var PAD_CALLS = [
    function (ctx, d, t) { drum(ctx, d, t, 0.34); return 0.42; },                                   // 북 "둥"
    function (ctx, d, t) { bell(ctx, d, 93, t, 0.8, 0.22); return 0.6; },                           // 종 "딩~"
    function (ctx, d, t) { trumpet(ctx, d, t, 60, 0.42, 0.11); return 0.45; },                       // 나팔 "빰~"
    function (ctx, d, t) { drop(ctx, d, t, 650, 1350, 0.26); drop(ctx, d, t + 0.16, 800, 1550, 0.24); return 0.4; },    // 물방울 "또록"
    function (ctx, d, t) { pluck(ctx, d, 76, t, 0.3, 0.26); pluck(ctx, d, 76, t + 0.2, 0.3, 0.3); return 0.48; },      // 실로폰 "통통"
    function (ctx, d, t) { rattle(ctx, d, t, 0.07, 0.3); rattle(ctx, d, t + 0.1, 0.07, 0.3); rattle(ctx, d, t + 0.2, 0.16, 0.32); return 0.4; }   // 탬버린 "찰찰찰"
  ];
  function padBus(ctx, dest) {
    if (!ctx.__alkPad || ctx.__alkPadDest !== dest) {
      var comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3;
      comp.attack.value = 0.004; comp.release.value = 0.25;
      out.gain.value = PAD_LEVEL;
      comp.connect(out); out.connect(dest);
      ctx.__alkPad = comp; ctx.__alkPadDest = dest;
    }
    return ctx.__alkPad;
  }
  // 버튼마다 소리 크기가 비슷하게 들리도록 맞춘 값(크기가 단서가 되지 않게)
  var PAD_TRIM = [2.0, 1.9, 1.3, 1.05, 0.85, 0.95];
  function padSound(ctx, dest, idx) {
    var i = Math.max(0, Math.min(5, idx | 0));
    var trim = ctx.createGain();
    trim.gain.value = PAD_TRIM[i];
    trim.connect(padBus(ctx, dest));
    return PAD_CALLS[i](ctx, trim, ctx.currentTime + 0.01);
  }
  function padNames() { return PAD_NAMES.slice(); }

  // 순서 기억하기 클리어 소리: 효과음(5단계마다 특별한 곡) + 그 단계에 나온 악기들의 짧은 합주. 새소리는 쓰지 않는다
  var SEQ_ENSEMBLE_LEVEL = 0.95;   // 합주 음량(단계와 상관없이 일정하게)
  var SEQ_GAP = 0.2;
  function playSeq(ctx, dest, stage, padCount, opts) {
    stage = Math.max(1, Math.min(30, stage | 0));
    opts = opts || {};
    var n = Math.max(3, Math.min(6, (padCount | 0) || 3));
    var g = group(stage), level = LEVELS[stage] || CHIME_LEVELS[g];
    var effGain = opts.effectGain == null ? EFFECT_GAIN : opts.effectGain;
    var ensGain = opts.ensembleGain == null ? 1 : opts.ensembleGain;
    fadePrevious(ctx);
    var fx = chain(ctx, dest, level * effGain);
    var ens = chain(ctx, dest, SEQ_ENSEMBLE_LEVEL * ensGain);
    var t0 = ctx.currentTime + 0.06, rng = rngFor(stage * 7919 + 13);
    if (SONGS[stage]) SONGS[stage].build(ctx, fx, t0, rng);
    else chime(ctx, fx, t0, g);
    var t = t0 + birdAt(stage);
    function hit(i, when, vol) {
      var tr = ctx.createGain();
      tr.gain.value = PAD_TRIM[i] * vol;
      tr.connect(ens);
      PAD_CALLS[i](ctx, tr, when);
    }
    for (var i = 0; i < n; i++) hit(i, t + i * SEQ_GAP, 0.8);      // 악기들이 차례로 한 번씩
    hit(0, t + n * SEQ_GAP + 0.1, 0.6);                            // 마지막에 북과 종이 함께 "둥-딩~"
    hit(1, t + n * SEQ_GAP + 0.1, 0.6);
    return 0.06 + birdAt(stage) + n * SEQ_GAP + 1.0 + TAIL;
  }
  // 안내 소리: 'wrong' = 틀렸을 때(부드럽게 내려가는 두 음, 삑 소리 아님), 'go' = 이제 내 차례
  function cue(ctx, dest, kind) {
    var d = padBus(ctx, dest), t = ctx.currentTime + 0.01;
    if (kind === 'wrong') {
      [[392, 0], [330, 0.2]].forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain(), s = t + n[1];
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, s);
        g.gain.linearRampToValueAtTime(0.16, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.32);
        o.connect(g); g.connect(d); o.start(s); o.stop(s + 0.35);
      });
      return 0.55;
    }
    pop(ctx, d, t, 0.14);
    bell(ctx, d, 84, t + 0.05, 0.7, 0.1);
    return 0.8;
  }

  /* ================= 길 찾기: 새소리 대신 쓰는 효과음 ================= */
  // 물방울 한 방울: 낮은 음에서 높은 음으로 "또록"
  function drop(ctx, d, t, f0, f1, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(d);
    o.start(t); o.stop(t + 0.25);
  }
  // 5단계 구간마다 다른 소리 하나가 효과음 위로 얹힌다 (길 찾기에서는 새소리 대신 이것을 쓴다)
  var ACCENTS = [
    { name: '물방울', dur: 1.2, ring: function (ctx, d, t) {            // 1~5단계 "또로로롱"
      [[1250, 1900, 0], [900, 1500, 0.17], [1100, 1700, 0.31], [800, 1300, 0.47], [1000, 1650, 0.6]].forEach(function (p) { drop(ctx, d, t + p[2], p[0], p[1], 0.2); });
    } },
    { name: '풍경', dur: 1.9, ring: function (ctx, d, t, rng) {          // 6~10단계 바람에 흔들리는 "딩~ 딩~"
      var sc = [84, 86, 88, 91, 93];
      for (var i = 0; i < 9; i++) bell(ctx, d, sc[Math.floor(rng() * sc.length)], t + i * 0.13 + rng() * 0.05, 0.9, 0.09);
    } },
    { name: '하프', dur: 1.5, ring: function (ctx, d, t) {               // 11~15단계 줄을 쓸어 올리는 "쪼로롱~"
      [67, 71, 74, 79, 83, 86, 91].forEach(function (m, i) { pluck(ctx, d, m, t + i * 0.075, 0.2, 0.9); });
      bell(ctx, d, 91, t + 0.55, 1.0, 0.08);
    } },
    { name: '마림바', dur: 1.3, ring: function (ctx, d, t) {             // 16~20단계 통통 튀는 "통통통통~"
      [60, 64, 67, 72, 76, 72, 67, 72, 76].forEach(function (m, i) { pluck(ctx, d, m, t + i * 0.1, 0.22, 0.5); });
      pluck(ctx, d, 79, t + 0.95, 0.2, 0.7);
    } },
    { name: '오르골', dur: 1.9, ring: function (ctx, d, t) {             // 21~25단계 또르르 맑은 "띠리링~"
      [84, 88, 91, 88, 93, 91, 88, 84].forEach(function (m, i) { bell(ctx, d, m, t + i * 0.17, 0.8, 0.09); });
    } },
    { name: '종소리', dur: 2.1, ring: function (ctx, d, t) {             // 26~30단계 "딩-동-댕~"
      [72, 76, 79].forEach(function (m, i) { bell(ctx, d, m, t + i * 0.32, 1.7, 0.15); });
      [72, 76, 79, 84].forEach(function (m) { bell(ctx, d, m, t + 1.0, 1.5, 0.1); });
    } }
  ];
  var ACCENT_LEVEL = [1.35, 1.7, 0.95, 0.9, 2.0, 0.85];   // 구간별 음량 보정(측정해서 맞춘 값: 소리마다 최대 음량이 0.7~0.8로 비슷해짐)

  // 길 찾기 클리어 소리: 효과음(5단계마다 특별한 곡) + 구간별 소리 하나. 새소리는 쓰지 않는다
  function playMaze(ctx, dest, stage, opts) {
    stage = Math.max(1, Math.min(30, stage | 0));
    opts = opts || {};
    var g = group(stage), level = LEVELS[stage] || CHIME_LEVELS[g];
    var effGain = opts.effectGain == null ? EFFECT_GAIN : opts.effectGain;
    var accGain = opts.accentGain == null ? 1 : opts.accentGain;
    fadePrevious(ctx);
    var fx = chain(ctx, dest, level * effGain);
    var acc = chain(ctx, dest, level * ACCENT_LEVEL[g] * accGain);
    var t0 = ctx.currentTime + 0.06, rng = rngFor(stage * 7919 + 13);
    if (SONGS[stage]) SONGS[stage].build(ctx, fx, t0, rng);
    else chime(ctx, fx, t0, g);
    ACCENTS[g].ring(ctx, acc, t0 + birdAt(stage), rngFor(g * 104729 + 11), g);
    return 0.06 + birdAt(stage) + ACCENTS[g].dur + TAIL;
  }
  function accentName(stage) { return ACCENTS[group(stage)].name; }
  function accentList() {
    return ACCENTS.map(function (a, i) { return { stage: i * 5 + 1, label: (i * 5 + 1) + '~' + (i * 5 + 5) + '단계', name: a.name }; });
  }

  // 길 찾기 중에 나는 작은 소리: 걸음 / 벽에 닿음 / 잠겨 있음 / 도토리 줍기 / 열쇠 줍기 / 문 열림
  function mazeCue(ctx, dest, kind, idx) {
    var d = padBus(ctx, dest), t = ctx.currentTime + 0.01;
    function tick(f, s, vol, len) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, s + len);
      o.connect(g); g.connect(d); o.start(s); o.stop(s + len + 0.02);
    }
    if (kind === 'step') { tick((idx | 0) % 2 ? 600 : 520, t, 0.12, 0.07); return 0.1; }
    if (kind === 'bump') {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(95, t + 0.1);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.16);
      return 0.16;
    }
    if (kind === 'locked') { tick(220, t, 0.14, 0.1); tick(196, t + 0.14, 0.14, 0.14); return 0.3; }
    if (kind === 'pick') { pluck(ctx, d, 79, t, 0.2, 0.35); pluck(ctx, d, 84, t + 0.08, 0.2, 0.4); bell(ctx, d, 91, t + 0.14, 0.6, 0.09); return 0.8; }
    if (kind === 'key') { bell(ctx, d, 84, t, 0.9, 0.13); pluck(ctx, d, 88, t + 0.1, 0.2, 0.4); return 1.0; }
    if (kind === 'door') {
      whoosh(ctx, d, t, 0.5, 500, 3500, 0.05);
      [72, 76, 79, 84].forEach(function (m) { bell(ctx, d, m, t + 0.35, 1.1, 0.065); });
      return 1.5;
    }
    return 0;
  }

  function isMilestone(stage) { return !!SONGS[stage]; }
  function name(stage) { return SONGS[stage] ? SONGS[stage].name : ''; }
  function birdName(stage) { return BIRDS[group(stage)].name; }
  function list() {
    return Object.keys(SONGS).map(Number).sort(function (a, b) { return a - b; })
      .map(function (n) { return { stage: n, name: SONGS[n].name, bird: birdName(n) }; });
  }
  function birdList() {
    return BIRDS.map(function (b, i) { return { stage: i * 5 + 1, label: (i * 5 + 1) + '~' + (i * 5 + 5) + '단계', name: b.name }; });
  }

  var api = {
    play: playWin, playWin: playWin, playBird: playBird, isMilestone: isMilestone, name: name,
    birdName: birdName, list: list, birdList: birdList, duration: duration, group: group,
    padSound: padSound, padNames: padNames, playSeq: playSeq, cue: cue,
    playMaze: playMaze, accentName: accentName, accentList: accentList, mazeCue: mazeCue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkFanfare = api;
})(typeof window !== 'undefined' ? window : this);
