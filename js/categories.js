/**
 * SKCT 인적성 시험 5대 영역 및 수리/추리 세부 유형 정의
 * (봉봉TV 온라인 SKCT 문제집 완벽 매핑 체계)
 */

export const DEFAULT_SKCT_AREAS = [
  {
    id: 'verbal',
    name: '언어이해',
    shortName: '언어',
    icon: '📖',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    description: '지문 독해, 글의 논지 파악, 문맥적 어휘 추론',
    subtypes: [
      '1. 출제예상문제',
      '2. PSAT 기출문제'
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
      '1. 자료해석 출제예상',
      '2. 증가율 / 변화율 비교',
      '3. 비중 / 구성비 산출',
      '4. 배율 및 지수 분석',
      '5. 분수 대소 비교 및 가평균',
      '6. 복합 차트 분석 및 빈칸 추론'
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
      '1. 소금물 문제',
      '2. 일의 양 문제',
      '3. 거속시 문제',
      '4. 부등식 문제',
      '5. 비율 문제',
      '6. 응용수리 실전문제',
      '7. 경우의 수 기초',
      '8. 이웃 / 위치고정',
      '9. 정수의 개수',
      '10. 중복순열',
      '11. 같은것이 있는 순열',
      '12. 원순열',
      '13. 조합(콤비네이션)',
      '14. 중복조합',
      '15. 팀 구성',
      '16. 조건부 확률'
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
      '1. 명제추리',
      '2. 조건퀴즈',
      '3. 실전모의'
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
      '1. 수열 및 도형 규칙',
      '2. 등차 / 등비수열',
      '3. 계차수열 (차이의 규칙)',
      '4. 군수열 및 교대수열'
    ]
  }
];

const STORAGE_KEY = 'skct_custom_areas_v3';

export function getCustomAreas() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.filter(a => a.id !== 'execution');
    }
  } catch (e) {
    console.warn('Failed to parse custom areas:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_SKCT_AREAS));
}

export function saveCustomAreas(areas) {
  const cleaned = areas.filter(a => a.id !== 'execution');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  document.dispatchEvent(new CustomEvent('areas-updated', { detail: { areas: cleaned } }));
}

export function resetCustomAreas() {
  localStorage.removeItem(STORAGE_KEY);
  const defaults = JSON.parse(JSON.stringify(DEFAULT_SKCT_AREAS));
  saveCustomAreas(defaults);
  return defaults;
}

export function getAllAreasWithAll() {
  const custom = getCustomAreas();
  return [
    {
      id: 'all',
      name: '전체 보기',
      shortName: '전체',
      icon: '📚',
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.15)',
      description: '모든 영역의 오답 문항을 종합적으로 확인합니다.',
      subtypes: []
    },
    ...custom
  ];
}

export function getAreaById(id) {
  const areas = getAllAreasWithAll();
  return areas.find(a => a.id === id) || areas[0];
}

export function getAllSubtypesForArea(areaId) {
  const area = getAreaById(areaId);
  return area ? (area.subtypes || []) : [];
}

export function cleanSubtypeName(st) {
  if (!st) return '';
  return String(st).replace(/^\d+[\.\)\-\s]+\s*/, '').trim();
}

export function formatSubtypeName(index, rawName) {
  const clean = cleanSubtypeName(rawName);
  return clean ? `${index + 1}. ${clean}` : `${index + 1}. 세부유형`;
}

