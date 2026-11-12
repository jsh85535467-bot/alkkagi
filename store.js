/* 기억놀이터 - 저장 / 이어하기 코드 (게임 기록을 코드 하나로)
   서버 없이 진행 상황을 짧은 코드 하나로 옮길 수 있게 한다.

   현재 코드(KM): KM-XXXXX-XXXXX-...-C
     별 개수(0~3)를 한 단계에 2비트씩 담는다.
     순서: 알까기 50칸, 순서 기억하기 50칸, 길 찾기 50칸, 속담 완성 30칸, 장보기 계산 30칸 (LENS 참고).
     글자는 헷갈리는 O, I, L, U 를 뺀 32가지만 쓴다. 마지막 글자는 확인용.
   옛 코드(KN): 알까기·순서 기억하기·길 찾기 각 30칸만 담긴 예전 코드. 지금도 읽을 수 있다.
   옛 코드(AL): AL-33321-00000-...-K  → 알까기 기록만 담긴 예전 코드. 지금도 읽을 수 있다.
   게임이 늘어도 예전 코드는 그대로 읽힌다(없는 게임 칸은 비어 있는 것으로 본다). */
(function (root) {
  'use strict';
  var KEY = 'alkkagi.v1';   // 예전 저장 위치를 그대로 써서 기존 기록이 유지된다
  var TOTAL = 50;           // 가장 긴 게임의 단계 수 (알까기·순서 기억·길 찾기의 31~50단계는 '고수 코스')
  var KEYS = ['stars', 'sq', 'mz', 'pv', 'sh'];   // 알까기, 순서 기억하기, 길 찾기, 속담 완성, 장보기 계산
  var LENS = { stars: 50, sq: 50, mz: 50, pv: 30, sh: 30 };
  var GAME_IDS = 'asmpc';                          // 놀이 기록에 쓰는 게임 글자(KEYS와 같은 순서)
  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var SPEEDS = ['slow', 'normal', 'fast'];
  var DEFAULT_SETTINGS = {
    sound: true, aim: 'pull', seenHow: false, sqSpeed: 'slow', sqSeenHow: false, mzControl: 'touch', mzSeenHow: false,
    pvSeenHow: false, shSeenHow: false, theme: 'pop'   // 화면 스타일: pop(팝아트) / neon(네온 야간) / blue(푸른 기본)
  };

  function blankStars(n) { var a = []; for (var i = 0; i < (n || TOTAL); i++) a.push(0); return a; }
  function clean(list, n) {
    n = n || TOTAL;
    var out = blankStars(n);
    for (var i = 0; i < n; i++) out[i] = Math.max(0, Math.min(3, (list && list[i]) | 0));
    return out;
  }
  function blank(key) { return blankStars(LENS[key]); }
  function cleanFor(key, list) { return clean(list, LENS[key]); }

  /* ---- 비트 묶기 / 확인 글자 ---- */
  function checksum32(data) {
    var s = 11;
    for (var i = 0; i < data.length; i++) s += ALPHABET.indexOf(data.charAt(i)) * (i + 3);
    return ALPHABET.charAt(s % 32);
  }
  function packStars(list) {
    var bits = '', i;
    for (i = 0; i < list.length; i++) bits += ((list[i] >> 1) & 1) + '' + (list[i] & 1);
    while (bits.length % 5) bits += '0';
    var out = '';
    for (i = 0; i < bits.length; i += 5) out += ALPHABET.charAt(parseInt(bits.slice(i, i + 5), 2));
    return out;
  }
  function unpackStars(data) {
    var bits = '', i;
    for (i = 0; i < data.length; i++) {
      var v = ALPHABET.indexOf(data.charAt(i)).toString(2);
      while (v.length < 5) v = '0' + v;
      bits += v;
    }
    var out = [];
    for (i = 0; i + 2 <= bits.length; i += 2) out.push(parseInt(bits.slice(i, i + 2), 2));
    return out;
  }

  /* ---- 현재 코드 (KM) ---- */
  function encode(stars, sq, mz, pv, sh) {
    var all = [];
    [stars, sq, mz, pv, sh].forEach(function (list, i) { all = all.concat(clean(list, LENS[KEYS[i]])); });
    var data = packStars(all);
    var groups = [];
    for (var g = 0; g < data.length; g += 5) groups.push(data.slice(g, g + 5));
    return 'KM-' + groups.join('-') + '-' + checksum32(data);
  }

  // 게임마다 칸 수가 다른 목록으로 쪼갠다(all: 별 개수 전체, lens: 게임별 칸 수)
  function split(all, lens) {
    var out = {}, pos = 0;
    KEYS.forEach(function (k, i) {
      var len = lens[i];
      out[k] = len ? cleanFor(k, all.slice(pos, pos + len)) : blank(k);
      pos += len || 0;
    });
    return out;
  }

  /* ---- 옛 코드 (AL) ---- */
  function checksumLegacy(digits) {
    var s = 7;
    for (var i = 0; i < digits.length; i++) s += (digits.charCodeAt(i) - 48) * (i + 3);
    return (s % 36).toString(36).toUpperCase();
  }
  function decodeLegacy(s) {
    s = s.slice(2);
    if (s.length < 2) return { ok: false, error: '코드가 너무 짧아요. 전체를 붙여넣어 주세요.' };
    var chk = s.slice(-1);
    var d = s.slice(0, -1).replace(/O/g, '0').replace(/[IL]/g, '1');
    if (!/^[0-3]+$/.test(d) || d.length > 200) return { ok: false, error: '코드에 잘못된 글자가 있어요. 다시 확인해 주세요.' };
    if (checksumLegacy(d) !== chk) return { ok: false, error: '코드가 맞지 않아요. 한 글자씩 다시 확인해 주세요.' };
    var stars = [];
    for (var i = 0; i < 30 && i < d.length; i++) stars.push(Number(d.charAt(i)));
    var r = split(stars, [30, 0, 0, 0, 0]);
    r.ok = true;
    return r;
  }

  function decode(text) {
    var s = String(text == null ? '' : text).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (s.indexOf('AL') === 0) return decodeLegacy(s);
    var current = s.indexOf('KM') === 0;
    if (!current && s.indexOf('KN') !== 0) return { ok: false, error: '코드가 "KM"으로 시작해야 해요. 다시 확인해 주세요.' };
    s = s.slice(2);
    if (s.length < 2) return { ok: false, error: '코드가 너무 짧아요. 전체를 붙여넣어 주세요.' };
    var chk = s.slice(-1).replace(/O/g, '0').replace(/[IL]/g, '1');
    var data = s.slice(0, -1).replace(/O/g, '0').replace(/[IL]/g, '1');
    for (var i = 0; i < data.length; i++) {
      if (ALPHABET.indexOf(data.charAt(i)) < 0) return { ok: false, error: '코드에 잘못된 글자가 있어요. 다시 확인해 주세요.' };
    }
    if (data.length > 120 || ALPHABET.indexOf(chk) < 0 || checksum32(data) !== chk) {
      return { ok: false, error: '코드가 맞지 않아요. 한 글자씩 다시 확인해 주세요.' };
    }
    var all = unpackStars(data);
    var r = split(all, current ? [50, 50, 50, 30, 30] : [30, 30, 30, 0, 0]);   // KN 은 예전 배치(30칸씩 3게임)
    r.ok = true;
    return r;
  }

  function merge(a, b) {
    var n = Math.max(a ? a.length : 0, b ? b.length : 0) || TOTAL, out = blankStars(n);
    for (var i = 0; i < n; i++) out[i] = Math.max((a && a[i]) | 0, (b && b[i]) | 0);
    return out;
  }

  // 놀이 기록: 판을 끝낼 때마다 한 줄씩 쌓는다
  //   { t: 시각(밀리초), g: 'a' 알까기 / 's' 순서 기억 / 'm' 길 찾기 / 'p' 속담 완성 / 'c' 장보기 계산, s: 단계, r: 별 0~3 }
  // 폰 저장소가 가득 차지 않도록 최근 400판까지만 남긴다. 잘못된 줄은 버린다.
  var LOG_MAX = 400;
  function cleanLog(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e !== 'object') continue;
      var t = Number(e.t), s = e.s | 0, r = e.r | 0;
      if (!(t > 0) || typeof e.g !== 'string' || e.g.length !== 1 || GAME_IDS.indexOf(e.g) < 0 || s < 1 || s > TOTAL || r < 0 || r > 3) continue;
      out.push({ t: Math.round(t), g: e.g, s: s, r: r });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out.length > LOG_MAX ? out.slice(out.length - LOG_MAX) : out;
  }

  function sanitize(raw) {
    var settings = {}, k;
    for (k in DEFAULT_SETTINGS) settings[k] = DEFAULT_SETTINGS[k];
    if (raw && raw.settings) {
      var r = raw.settings;
      if (typeof r.sound === 'boolean') settings.sound = r.sound;
      if (r.aim === 'pull' || r.aim === 'push') settings.aim = r.aim;
      if (typeof r.seenHow === 'boolean') settings.seenHow = r.seenHow;
      if (SPEEDS.indexOf(r.sqSpeed) >= 0) settings.sqSpeed = r.sqSpeed;
      if (typeof r.sqSeenHow === 'boolean') settings.sqSeenHow = r.sqSeenHow;
      if (r.mzControl === 'touch' || r.mzControl === 'buttons') settings.mzControl = r.mzControl;
      if (typeof r.mzSeenHow === 'boolean') settings.mzSeenHow = r.mzSeenHow;
      if (typeof r.pvSeenHow === 'boolean') settings.pvSeenHow = r.pvSeenHow;
      if (typeof r.shSeenHow === 'boolean') settings.shSeenHow = r.shSeenHow;
      if (r.theme === 'pop' || r.theme === 'neon' || r.theme === 'blue') settings.theme = r.theme;
    }
    var out = { log: cleanLog(raw && raw.log), settings: settings };
    KEYS.forEach(function (key) { out[key] = cleanFor(key, raw && raw[key]); });
    return out;
  }

  function load() {
    try {
      var txt = root.localStorage.getItem(KEY);
      if (txt) return sanitize(JSON.parse(txt));
    } catch (e) { /* 저장소를 못 쓰는 환경이면 기본값으로 시작 */ }
    return sanitize(null);
  }

  function save(store) {
    try { root.localStorage.setItem(KEY, JSON.stringify(store)); return true; }
    catch (e) { return false; }
  }

  var api = {
    TOTAL: TOTAL, KEYS: KEYS, LENS: LENS, GAME_IDS: GAME_IDS, LOG_MAX: LOG_MAX, SPEEDS: SPEEDS, cleanLog: cleanLog,
    encode: encode, decode: decode, merge: merge, load: load, save: save, sanitize: sanitize, blankStars: blankStars, blank: blank
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkStore = api;
})(typeof window !== 'undefined' ? window : this);
