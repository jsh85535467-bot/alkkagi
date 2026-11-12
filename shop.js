/* 기억놀이터 - 장보기 계산 (게임 설정) : 화면은 quiz.js 가 만든다 */
(function () {
  'use strict';
  var S = window.AlkShop;
  window.__sh = window.AlkQuiz.create({
    id: 'sh', key: 'sh', chip: 'Sh', gameId: 'c', seenKey: 'shSeenHow', total: S.TOTAL,
    name: '장보기 계산', emoji: '🛒', hintMode: 'text',
    tagline: '시장에서 물건 값을 계산해요<br>얼마일까요?',
    stagesNote: '한 단계를 맞히면 다음 단계가 열려요. 틀리지 않을수록 별을 많이 받아요.',
    firstMsg: '값을 계산해서 알맞은 것을 눌러 보세요',
    generate: function (n) { return S.generate(n); },
    starsFor: S.starsFor,
    rightMsg: function (q) { return '👏 정답은 ' + (q.unit ? q.answer + q.unit : S.fmt(q.answer)) + '이에요!'; },
    doneMsg: '정말 대단해요. 장보기 박사님이세요!',
    how:
      '<p class="big">1. 계산해 보아요 🛒</p>' +
      '<p>장보는 상황이 나와요. 값을 계산해서 아래 보기 중 알맞은 것을 눌러 보세요.</p>' +
      '<p class="big">2. 틀려도 괜찮아요</p>' +
      '<p>틀린 보기는 흐려지고, 다시 고를 수 있어요. 시간 제한도 없어요. 한 번도 틀리지 않으면 별이 3개예요.</p>' +
      '<p class="big">3. 💡 힌트</p>' +
      '<p>힌트를 누르면 계산하는 방법을 알려 줘요. 몇 번이든 괜찮아요.</p>' +
      '<p class="big">4. 점점 어려워져요</p>' +
      '<p>처음에는 곱하기와 더하기, 다음에는 거스름돈과 여러 물건, 나중에는 단가 비교, 할인, 쿠폰, 평균이 나와요. 문제는 할 때마다 새로 만들어져요.</p>' +
      '<p class="big">5. 31단계부터는 고수 코스 🔥</p>' +
      '<p>부가세, 할인 전 원래 값 찾기, 할인과 쿠폰이 겹치는 여러 단계 계산이 나와요. 힌트를 보면 단계별 계산식이 나와요.</p>'
  });
})();
