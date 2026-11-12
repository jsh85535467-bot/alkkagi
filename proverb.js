/* 기억놀이터 - 속담 완성 (게임 설정) : 화면은 quiz.js 가 만든다 */
(function () {
  'use strict';
  var P = window.AlkProverb;
  window.__pv = window.AlkQuiz.create({
    id: 'pv', key: 'pv', chip: 'Pv', gameId: 'p', seenKey: 'pvSeenHow', total: P.TOTAL,
    name: '속담 완성', emoji: '📖', hintMode: 'eliminate',
    tagline: '빈칸에 알맞은 말을 골라<br>속담을 완성해요',
    stagesNote: '한 단계를 맞히면 다음 단계가 열려요. 틀리지 않을수록 별을 많이 받아요.',
    firstMsg: '빈칸에 들어갈 말을 눌러 보세요',
    generate: function (n) { return P.generate(n); },
    starsFor: P.starsFor,
    rightMsg: function (q) { return '👏 정답이에요! 속담이 완성됐어요'; },
    doneMsg: '정말 대단해요. 속담 박사님이세요!',
    how:
      '<p class="big">1. 빈칸을 채워요 📖</p>' +
      '<p>속담의 뒷부분이 비어 있어요. 아래 보기 중에서 알맞은 말을 눌러 보세요.</p>' +
      '<p class="big">2. 틀려도 괜찮아요</p>' +
      '<p>틀린 보기는 흐려지고, 다시 고를 수 있어요. 시간 제한도 없어요. 한 번도 틀리지 않으면 별이 3개예요.</p>' +
      '<p class="big">3. 💡 힌트</p>' +
      '<p>힌트를 누르면 틀린 보기 하나를 지워 줘요. 몇 번이든 괜찮아요.</p>' +
      '<p class="big">4. 점점 어려워져요</p>' +
      '<p>처음에는 누구나 아는 속담이에요. 21단계부터는 사자성어도 나와요. 괄호 안의 뜻을 힌트로 삼으세요.</p>'
  });
})();
