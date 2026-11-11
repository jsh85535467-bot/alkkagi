/* 추억의 알까기 - 저장 / 이어하기 코드
   서버 없이 진행 상황을 짧은 코드 하나로 옮길 수 있게 한다.
   코드 형태: AL-33321-00000-...-K  (단계별 별 개수 0~3 + 확인 글자) */
(function (root) {
  'use strict';
  var KEY = 'alkkagi.v1';
  var TOTAL = 30;
  var DEFAULT_SETTINGS = { sound: true, aim: 'pull', seenHow: false };

  function blankStars() { var a = []; for (var i = 0; i < TOTAL; i++) a.push(0); return a; }

  function checksum(digits) {
    var s = 7;
    for (var i = 0; i < digits.length; i++) s += (digits.charCodeAt(i) - 48) * (i + 3);
    return (s % 36).toString(36).toUpperCase();
  }

  function encode(stars) {
    var d = '';
    for (var i = 0; i < TOTAL; i++) {
      var v = Math.max(0, Math.min(3, (stars[i] | 0)));
      d += v;
    }
    var groups = [];
    for (var g = 0; g < d.length; g += 5) groups.push(d.slice(g, g + 5));
    return 'AL-' + groups.join('-') + '-' + checksum(d);
  }

  function decode(text) {
    var s = String(text == null ? '' : text).toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (s.indexOf('AL') !== 0) return { ok: false, error: '코드가 "AL"로 시작해야 해요. 다시 확인해 주세요.' };
    s = s.slice(2);
    if (s.length < 2) return { ok: false, error: '코드가 너무 짧아요. 전체를 붙여넣어 주세요.' };
    var chk = s.slice(-1);
    var d = s.slice(0, -1).replace(/O/g, '0').replace(/[IL]/g, '1');
    if (!/^[0-3]+$/.test(d) || d.length > 200) return { ok: false, error: '코드에 잘못된 글자가 있어요. 다시 확인해 주세요.' };
    if (checksum(d) !== chk) return { ok: false, error: '코드가 맞지 않아요. 한 글자씩 다시 확인해 주세요.' };
    var stars = blankStars();
    for (var i = 0; i < TOTAL && i < d.length; i++) stars[i] = Number(d.charAt(i));
    return { ok: true, stars: stars };
  }

  function merge(a, b) {
    var out = blankStars();
    for (var i = 0; i < TOTAL; i++) out[i] = Math.max(a[i] | 0, b[i] | 0);
    return out;
  }

  function sanitize(raw) {
    var stars = blankStars();
    var settings = {};
    var k;
    for (k in DEFAULT_SETTINGS) settings[k] = DEFAULT_SETTINGS[k];
    if (raw && Array.isArray(raw.stars)) {
      for (var i = 0; i < TOTAL; i++) stars[i] = Math.max(0, Math.min(3, raw.stars[i] | 0));
    }
    if (raw && raw.settings) {
      if (typeof raw.settings.sound === 'boolean') settings.sound = raw.settings.sound;
      if (raw.settings.aim === 'pull' || raw.settings.aim === 'push') settings.aim = raw.settings.aim;
      if (typeof raw.settings.seenHow === 'boolean') settings.seenHow = raw.settings.seenHow;
    }
    return { stars: stars, settings: settings };
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

  var api = { TOTAL: TOTAL, encode: encode, decode: decode, merge: merge, load: load, save: save, sanitize: sanitize, blankStars: blankStars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlkStore = api;
})(typeof window !== 'undefined' ? window : this);
