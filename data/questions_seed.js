// SKCT 오답노트 시드 데이터 (사용자 직접 등록을 위해 초기화됨)
const questionsSeedData = [];
if (typeof window !== 'undefined') {
  window.questionsSeedData = questionsSeedData;
  window.SEED_QUESTIONS = questionsSeedData;
}
if (typeof module !== 'undefined') { module.exports = questionsSeedData; }
