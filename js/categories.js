/**
 * SKCT 인적성 시험 5대 영역 및 수리/추리 세부 유형 정의
 */

export const SKCT_AREAS = [
  {
    id: 'all',
    name: '전체 보기',
    shortName: '전체',
    icon: '📚',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    description: '모든 영역의 오답 문항을 종합적으로 확인합니다.'
  },
  {
    id: 'verbal',
    name: '언어이해',
    shortName: '언어',
    icon: '📖',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    description: '지문 독해, 글의 논지 파악, 문맥적 어휘 추론',
    subtypes: [
      '지문 독해 및 중심 내용 파악',
      '문단 간 논리적 전개 방식',
      '세부 사실 일치 / 불일치',
      '빈칸 추론 및 문맥적 어휘'
    ]
  },
  {
    id: 'data',
    name: '자료해석 (수리)',
    shortName: '자료해석',
    icon: '📊',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    description: '표, 그래프, 통계 데이터 분석 및 수치 연산',
    subtypes: [
      '증가율 / 변화율 비교',
      '비중 / 구성비 산출',
      '배율 및 지수 분석',
      '분수 대소 비교 및 가평균',
      '복합 차트 분석 및 빈칸 추론',
      '선지 소거 및 핀셋 분석'
    ]
  },
  {
    id: 'math',
    name: '창의수리 (수리)',
    shortName: '창의수리',
    icon: '📐',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    description: '방정식, 부등식, 수리적 문제 해결 및 응용 수리',
    subtypes: [
      '거속시 (거리·속력·시간)',
      '농도 및 소금물 섞기',
      '일률 (작업량 및 기간)',
      '원가·정가·할인율·이익률',
      '경우의 수 및 확률',
      '정수론 (배수, 약수, 나머지)',
      '도형 응용 및 기타 수리'
    ]
  },
  {
    id: 'logic',
    name: '언어추리 (추리)',
    shortName: '언어추리',
    icon: '🧩',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    description: '명제 논리, 조건 추리(매칭/배치), 참/거짓 판단',
    subtypes: [
      '명제추리 (삼단논법, 대우명제)',
      '조건추리 (속성 매칭)',
      '조건추리 (순서 나열 및 랭킹)',
      '조건추리 (좌석 및 위치 배치)',
      '진실게임 (참/거짓 진술 모순)',
      '논리적 오류 및 타당성 평가'
    ]
  },
  {
    id: 'sequence',
    name: '수열추리 (추리)',
    shortName: '수열추리',
    icon: '🔢',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    description: '숫자 및 기호의 규칙 발견 및 빈칸 수치 추론',
    subtypes: [
      '등차 / 등비수열',
      '계차수열 (차이값의 규칙)',
      '군수열 (묶음 단위 규칙)',
      '피보나치 / 누적 연산 수열',
      '건너뛰기 / 교대 수열',
      '분수 / 거듭제곱 / 특수 수열'
    ]
  },
  {
    id: 'execution',
    name: '실행역량 (보너스)',
    shortName: '실행역량',
    icon: '🎯',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    description: '직무 및 비즈니스 실제 상황 판단 및 우선순위 결정',
    subtypes: [
      '업무 우선순위 판단',
      '조직 내 갈등 관리 및 협업',
      '고객 응대 및 위기 대응',
      'SK Values 인재상 부합 행동'
    ]
  }
];

export function getAreaById(id) {
  return SKCT_AREAS.find(a => a.id === id) || SKCT_AREAS[0];
}

export function getAllSubtypesForArea(areaId) {
  const area = getAreaById(areaId);
  return area ? (area.subtypes || []) : [];
}
