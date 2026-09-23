/**
 * SKCT Master Error Notes - Single Bundle Script
 * (봉봉TV 170제 문제/해설 자동 로드 & 세부유형 매핑 & 드래그 순서변경 지원)
 */

// ==========================================
// 1. Categories & Subtypes Management
// ==========================================
const DEFAULT_SKCT_AREAS = [
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

function getCustomAreas() {
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

function saveCustomAreas(areas) {
  const cleaned = areas.filter(a => a.id !== 'execution');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  document.dispatchEvent(new CustomEvent('areas-updated', { detail: { areas: cleaned } }));
}

function resetCustomAreas() {
  localStorage.removeItem(STORAGE_KEY);
  const defaults = JSON.parse(JSON.stringify(DEFAULT_SKCT_AREAS));
  saveCustomAreas(defaults);
  return defaults;
}

function getAllAreasWithAll() {
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

function getAreaById(id) {
  const areas = getAllAreasWithAll();
  return areas.find(a => a.id === id) || areas[0];
}

function getAllSubtypesForArea(areaId) {
  const area = getAreaById(areaId);
  return area ? (area.subtypes || []) : [];
}

function cleanSubtypeName(st) {
  if (!st) return '';
  return String(st).replace(/^\d+[\.\)\-\s]+\s*/, '').trim();
}

function formatSubtypeName(index, rawName) {
  const clean = cleanSubtypeName(rawName);
  return clean ? `${index + 1}. ${clean}` : `${index + 1}. 세부유형`;
}


// ==========================================
// 2. IndexedDB Storage Service
// ==========================================
const DB_NAME = 'SKCT_ErrorNotes_DB';
const DB_VERSION = 1;
const STORE_QUESTIONS = 'questions';
const STORE_NOTES = 'notes';

class StorageService {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
          const qStore = db.createObjectStore(STORE_QUESTIONS, { keyPath: 'id' });
          qStore.createIndex('area', 'area', { unique: false });
          qStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          const nStore = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
          nStore.createIndex('area', 'area', { unique: false });
          nStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async ready() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  async getAllQuestions() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_QUESTIONS], 'readonly');
      const store = transaction.objectStore(STORE_QUESTIONS);
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getQuestionById(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_QUESTIONS], 'readonly');
      const store = transaction.objectStore(STORE_QUESTIONS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveQuestion(question) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_QUESTIONS], 'readwrite');
      const store = transaction.objectStore(STORE_QUESTIONS);
      const item = {
        ...question,
        updatedAt: Date.now(),
        createdAt: question.createdAt || Date.now()
      };
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteQuestion(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_QUESTIONS], 'readwrite');
      const store = transaction.objectStore(STORE_QUESTIONS);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clearQuestions() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_QUESTIONS], 'readwrite');
      const store = transaction.objectStore(STORE_QUESTIONS);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotes() {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NOTES], 'readonly');
      const store = transaction.objectStore(STORE_NOTES);
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveNote(note) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NOTES], 'readwrite');
      const store = transaction.objectStore(STORE_NOTES);
      const item = {
        ...note,
        updatedAt: Date.now(),
        createdAt: note.createdAt || Date.now()
      };
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id) {
    await this.ready();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NOTES], 'readwrite');
      const store = transaction.objectStore(STORE_NOTES);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async exportAllData() {
    const questions = await this.getAllQuestions();
    const notes = await this.getAllNotes();
    return {
      version: 1,
      appName: 'SKCT_ErrorNotes',
      exportedAt: new Date().toISOString(),
      questions,
      notes
    };
  }

  async importAllData(data) {
    if (!data || !data.questions) {
      throw new Error('유효한 SKCT 오답노트 데이터 파일이 아닙니다.');
    }
    await this.ready();
    for (const q of (data.questions || [])) {
      await this.saveQuestion(q);
    }
    for (const n of (data.notes || [])) {
      await this.saveNote(n);
    }
    return true;
  }
}

const dbService = new StorageService();

// ==========================================
// 3. Clipboard Manager (Ctrl+V)
// ==========================================
class ClipboardManager {
  constructor(options = {}) {
    this.slots = {
      question: null,
      solution: null,
      answer: null
    };
    this.activeSlot = 'question';
    this.autoAdvance = true;
    this.onImageChange = options.onImageChange || (() => {});
  }

  initSlots(containerEl) {
    this.container = containerEl;
    ['question', 'solution', 'answer'].forEach(slotName => {
      const slotEl = containerEl.querySelector(`[data-slot="${slotName}"]`);
      if (!slotEl) return;

      // 클릭 시 해당 슬롯을 활성화 슬롯으로 지정
      slotEl.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-clear-slot') && !e.target.closest('.btn-choose-file') && !e.target.closest('.slot-file-input')) {
          this.setActiveSlot(slotName);
        }
      });

      // 슬롯 자체 paste 이벤트
      slotEl.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePasteEvent(e, slotName);
      });

      // 드래그 앤 드롭 지원
      slotEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.add('drag-over');
      });

      slotEl.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.remove('drag-over');
      });

      slotEl.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        slotEl.classList.remove('drag-over');
        this.setActiveSlot(slotName);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
              this.processImageFile(files[i], slotName);
              return;
            }
          }
        }
        this.showToast('이미지 파일(PNG, JPG 등)을 드래그해 놓아주세요.', 'warning');
      });

      // 버튼으로 클립보드 붙여넣기
      const pasteBtn = slotEl.querySelector('.btn-paste-clipboard');
      if (pasteBtn) {
        pasteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.pasteFromClipboardApi(slotName);
        });
      }

      // 파일 직접 선택 (파일 탐색기 열기)
      const chooseFileBtn = slotEl.querySelector('.btn-choose-file');
      const fileInput = slotEl.querySelector('.slot-file-input');
      if (chooseFileBtn && fileInput) {
        chooseFileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setActiveSlot(slotName);
          fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.processImageFile(e.target.files[0], slotName);
            e.target.value = '';
          }
        });
      }

      // 슬롯 이미지 삭제 버튼
      const clearBtn = slotEl.querySelector('.btn-clear-slot');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clearSlot(slotName);
        });
      }
    });

    // 컨테이너 및 윈도우 전역에 paste 리스너 부착
    this.container.addEventListener('paste', (e) => {
      this.handleGlobalPaste(e, this.activeSlot);
    });

    if (!window._skctGlobalPasteAttached) {
      window._skctGlobalPasteAttached = true;
      window.addEventListener('paste', (e) => {
        const qModal = document.getElementById('questionModal');
        if (qModal && qModal.classList.contains('active')) {
          this.handleGlobalPaste(e, this.activeSlot || 'question');
        } else {
          // 모달이 닫혀있더라도 클립보드에 이미지가 들어있으면 자동 모달 열기 및 문제 슬롯 붙여넣기
          const isTextInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
          if (isTextInput) return;

          const clipboardData = e.clipboardData || window.clipboardData;
          let hasImage = false;
          if (clipboardData?.items) {
            for (let i = 0; i < clipboardData.items.length; i++) {
              if (clipboardData.items[i].type?.indexOf('image') !== -1) {
                hasImage = true;
                break;
              }
            }
          }
          if (!hasImage && clipboardData?.files?.length > 0) {
            hasImage = true;
          }

          if (hasImage) {
            e.preventDefault();
            const btnOpen = document.getElementById('btnOpenQuestionModal');
            if (btnOpen) {
              btnOpen.click();
              // 모달 오픈 직후 문제 슬롯에 붙여넣기
              setTimeout(() => {
                this.setActiveSlot('question');
                this.handlePasteEvent(e, 'question');
              }, 50);
            }
          }
        }
      });
    }

    this.updateSlotUI();
  }

  // 전역/컨테이너 paste 이벤트 처리 (입력창 텍스트 입력 방해 방지 및 이미지 100% 가로채기)
  handleGlobalPaste(e, targetSlot) {
    const isTextInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // 클립보드에 이미지가 포함되어 있는지 확인
    let hasImage = false;
    if (clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        if (clipboardData.items[i].type && clipboardData.items[i].type.indexOf('image') !== -1) {
          hasImage = true;
          break;
        }
      }
    }
    if (!hasImage && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        if (clipboardData.files[i].type?.startsWith('image/') || clipboardData.files[i].name?.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i)) {
          hasImage = true;
          break;
        }
      }
    }

    // 텍스트 입력창 포커스 중인데 이미지 데이터가 없다면 기본 텍스트 붙여넣기 동작 허용
    if (isTextInput && !hasImage) {
      return;
    }

    // 이미지가 포함되어 있거나 텍스트 입력 중이 아니면 슬롯 붙여넣기로 가로챔
    e.preventDefault();
    this.handlePasteEvent(e, targetSlot || this.activeSlot || 'question');
  }

  setActiveSlot(slotName) {
    this.activeSlot = slotName;
    this.updateSlotUI();
  }

  setAutoAdvance(enabled) {
    this.autoAdvance = enabled;
  }

  updateSlotUI() {
    if (!this.container) return;
    ['question', 'solution', 'answer'].forEach(name => {
      const slotEl = this.container.querySelector(`[data-slot="${name}"]`);
      if (!slotEl) return;

      const isActive = this.activeSlot === name;
      slotEl.classList.toggle('slot-active', isActive);

      const previewEl = slotEl.querySelector('.slot-preview');
      const placeholderEl = slotEl.querySelector('.slot-placeholder');
      const clearBtn = slotEl.querySelector('.btn-clear-slot');

      if (this.slots[name]) {
        previewEl.src = this.slots[name];
        previewEl.style.display = 'block';
        placeholderEl.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'flex';
      } else {
        previewEl.removeAttribute('src');
        previewEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
        if (clearBtn) clearBtn.style.display = 'none';
      }
    });
  }

  // 브라우저 paste 이벤트 핸들러 (5단계 다중 소스 추출 엔진)
  handlePasteEvent(e, targetSlot) {
    const slot = targetSlot || this.activeSlot || 'question';
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let imageFile = null;

    // 1단계: clipboardData.items 먼저 확인 (화면 캡처 클립보드 최우선)
    if (clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type && item.type.indexOf('image') !== -1) {
          imageFile = item.getAsFile();
          if (imageFile) break;
        }
      }
    }

    // 2단계: clipboardData.files 확인 (파일 탐색기 Ctrl+C 복사)
    if (!imageFile && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type?.startsWith('image/') || file.name?.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i) || file.size > 0) {
          imageFile = file;
          break;
        }
      }
    }

    // 3단계: items에서 kind === 'file'인 항목 재검색
    if (!imageFile && clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            imageFile = file;
            break;
          }
        }
      }
    }

    // 이미지 파일이 발견된 경우 처리
    if (imageFile) {
      this.processImageFile(imageFile, slot);
      return;
    }

    // 4단계: HTML 클립보드 파싱 (웹/PDF 뷰어 우클릭 '이미지 복사' 대응)
    if (clipboardData.getData) {
      try {
        const html = clipboardData.getData('text/html');
        if (html) {
          const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match && match[1]) {
            this.applyDataUrlDirectly(match[1], slot);
            return;
          }
        }
      } catch (err) {
        console.warn('HTML clipboard parse error:', err);
      }
    }

    // 5단계: Plain text 파싱 (Base64 dataURL 또는 이미지 URL 텍스트 복사 대응)
    if (clipboardData.getData) {
      try {
        const text = clipboardData.getData('text/plain')?.trim();
        if (text && (text.startsWith('data:image/') || text.match(/\.(png|jpg|jpeg|webp|gif|bmp)(\?.*)?$/i))) {
          this.applyDataUrlDirectly(text, slot);
          return;
        }
      } catch (err) {
        console.warn('Text clipboard parse error:', err);
      }
    }

    this.showToast('⚠️ 클립보드에 이미지가 없습니다. 캡처(Win+Shift+S) 후 다시 붙여넣거나 [📂 파일 직접 선택]을 이용해 주세요.', 'warning');
  }

  // 이미지 URL 또는 dataURL 직접 슬롯에 적용
  applyDataUrlDirectly(url, slotName) {
    this.setSlotImage(slotName, url);
    this.handleSlotAdvance(slotName);
  }

  // 슬롯 순차 자동 이동 및 안내 토스트 처리
  handleSlotAdvance(slotName) {
    if (this.autoAdvance) {
      if (slotName === 'question') {
        this.setActiveSlot('solution');
        this.showToast('✅ [문제] 등록 완료! ➡️ 이제 [풀이]를 붙여넣으세요.', 'success');
      } else if (slotName === 'solution') {
        this.setActiveSlot('answer');
        this.showToast('✅ [풀이] 등록 완료! ➡️ 이제 [답]을 붙여넣으세요.', 'success');
      } else if (slotName === 'answer') {
        this.showToast('🎉 문제, 풀이, 답 3종 이미지 등록 완료!', 'success');
      }
    } else {
      this.showToast(`✅ [${this.getSlotKoreanName(slotName)}] 등록 완료!`, 'success');
    }
  }

  // navigator.clipboard.read()를 통한 원클릭 붙여넣기
  async pasteFromClipboardApi(targetSlot) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        this.showToast('키보드로 Ctrl + V 를 눌러 바로 붙여넣어 주세요!', 'info');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      let imageFound = false;

      for (const item of clipboardItems) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          this.processImageFile(blob, targetSlot);
          imageFound = true;
          break;
        }
      }

      if (!imageFound) {
        this.showToast('⚠️ 클립보드에 이미지가 없습니다. 캡처(Win+Shift+S) 후 눌러주세요!', 'warning');
      }
    } catch (err) {
      console.warn('Clipboard read error or permission denied:', err);
      this.showToast('브라우저 권한에 의해 차단되었습니다. 키보드로 Ctrl + V 를 눌러주세요!', 'info');
    }
  }

  // 이미지 파일 읽기 및 슬롯 할당 (즉시 반영 + 백그라운드 비동기 최적화)
  processImageFile(file, slotName) {
    if (!file) return;

    const slot = slotName || this.activeSlot || 'question';
    const reader = new FileReader();

    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      if (!rawDataUrl) {
        this.showToast('⚠️ 이미지 데이터가 비어 있습니다. 다시 캡처해 주세요.', 'error');
        return;
      }

      // 1. [핵심] 지연 없이 원본 데이터를 슬롯에 즉시 할당 (UI 즉각 반응 보장!)
      this.setSlotImage(slot, rawDataUrl);
      this.handleSlotAdvance(slot);

      // 2. 백그라운드에서 Canvas 압축/최적화 시도 (너비 1600 초과 또는 1.5MB 초과 시)
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_WIDTH = 1600;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH || rawDataUrl.length > 1.5 * 1024 * 1024) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.90);
              // 최적화된 용량으로 부드럽게 교체
              this.setSlotImage(slot, compressedUrl);
            }
          } catch (canvasErr) {
            // 캔버스 에러 시 이미 rawDataUrl이 등록되어 있으므로 무시
          }
        };

        // 이미지 로드 실패 시에도 이미 rawDataUrl이 등록되어 있으므로 안전
        img.onerror = () => {};
        img.src = rawDataUrl;
      } catch (err) {
        // 무시
      }
    };

    reader.onerror = () => {
      // FileReader 실패 시 URL.createObjectURL로 최후의 수단 복구
      try {
        const blobUrl = URL.createObjectURL(file);
        this.setSlotImage(slot, blobUrl);
        this.handleSlotAdvance(slot);
      } catch (blobErr) {
        this.showToast('⚠️ 파일을 읽는 도중 오류가 발생했습니다. 다시 캡처해 주세요.', 'error');
      }
    };

    reader.readAsDataURL(file);
  }

  getSlotKoreanName(slot) {
    if (slot === 'question') return '문제';
    if (slot === 'solution') return '풀이';
    if (slot === 'answer') return '답';
    return slot;
  }

  setSlotImage(slotName, dataUrl) {
    this.slots[slotName] = dataUrl;
    this.updateSlotUI();
    this.onImageChange(slotName, dataUrl);
  }

  clearSlot(slotName) {
    this.slots[slotName] = null;
    this.updateSlotUI();
    this.onImageChange(slotName, null);
    this.setActiveSlot(slotName);
  }

  resetAll() {
    this.slots = {
      question: null,
      solution: null,
      answer: null
    };
    this.activeSlot = 'question';
    this.updateSlotUI();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `skct-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}

// ==========================================
// 4. Practice Timer
// ==========================================
class PracticeTimer {
  constructor(displayEl, onExpire) {
    this.displayEl = displayEl;
    this.onExpire = onExpire;
    this.totalSeconds = 60;
    this.remainingSeconds = 60;
    this.timerId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => {
      this.remainingSeconds--;
      this.updateDisplay();

      if (this.remainingSeconds <= 0) {
        this.stop();
        if (this.onExpire) this.onExpire();
      }
    }, 1000);
    this.updateDisplay();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.updateDisplay();
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      if (this.remainingSeconds <= 0) {
        this.reset();
      }
      this.start();
    }
  }

  reset(seconds = 60) {
    this.stop();
    this.totalSeconds = seconds;
    this.remainingSeconds = seconds;
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.displayEl) return;
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    this.displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    if (this.remainingSeconds <= 15 && this.remainingSeconds > 0) {
      this.displayEl.classList.add('timer-warning');
      this.displayEl.classList.remove('timer-danger');
    } else if (this.remainingSeconds <= 0) {
      this.displayEl.classList.remove('timer-warning');
      this.displayEl.classList.add('timer-danger');
    } else {
      this.displayEl.classList.remove('timer-warning', 'timer-danger');
    }
  }
}

// ==========================================
// 5. Notes Manager (줄글 메모 오답노트)
// ==========================================
class NotesManager {
  constructor(containerEl, onCountChange) {
    this.container = containerEl;
    this.onCountChange = onCountChange;
    this.activeFilter = 'all';
    this.searchKeyword = '';
  }

  setFilter(areaId) {
    this.activeFilter = areaId;
    this.render();
  }

  setSearch(keyword) {
    this.searchKeyword = keyword.trim().toLowerCase();
    this.render();
  }

  async render() {
    const notes = await dbService.getAllNotes();
    let filtered = notes;

    if (this.activeFilter && this.activeFilter !== 'all') {
      filtered = filtered.filter(n => n.area === this.activeFilter);
    }

    if (this.searchKeyword) {
      filtered = filtered.filter(n => 
        (n.title && n.title.toLowerCase().includes(this.searchKeyword)) ||
        (n.content && n.content.toLowerCase().includes(this.searchKeyword)) ||
        (n.subtype && n.subtype.toLowerCase().includes(this.searchKeyword)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(this.searchKeyword)))
      );
    }

    if (this.onCountChange) {
      this.onCountChange(filtered.length, notes.length);
    }

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>등록된 줄글 오답 메모가 없습니다</h3>
          <p>자주 틀리는 공식, 풀이 접근법, 실수 패턴을 텍스트로 정리해 보세요!</p>
          <button class="btn btn-primary btn-add-note-inline">
            <span class="btn-icon">✍️</span> 첫 오답 메모 작성하기
          </button>
        </div>
      `;
      const btn = this.container.querySelector('.btn-add-note-inline');
      if (btn) {
        btn.addEventListener('click', () => {
          document.dispatchEvent(new CustomEvent('open-note-modal'));
        });
      }
      return;
    }

    this.container.innerHTML = `
      <div class="notes-grid">
        ${filtered.map(note => this.createNoteCardHtml(note)).join('')}
      </div>
    `;

    this.container.querySelectorAll('.btn-note-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        document.dispatchEvent(new CustomEvent('edit-note', { detail: { id } }));
      });
    });

    this.container.querySelectorAll('.btn-note-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('이 줄글 오답 메모를 삭제하시겠습니까?')) {
          await dbService.deleteNote(id);
          await this.render();
        }
      });
    });
  }

  createNoteCardHtml(note) {
    const area = getAreaById(note.area);
    const dateStr = new Date(note.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedContent = this.escapeHtml(note.content || '')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    return `
      <div class="note-card glass-panel" data-id="${note.id}">
        <div class="note-card-header">
          <div class="note-card-badges">
            <span class="badge" style="background:${area.bgColor}; color:${area.color}; border: 1px solid ${area.color}40;">
              ${area.icon} ${this.escapeHtml(area.name)}
            </span>
            ${note.subtype ? `<span class="badge badge-sub">${this.escapeHtml(note.subtype)}</span>` : ''}
          </div>
          <div class="note-card-actions">
            <button class="icon-btn btn-note-edit" data-id="${note.id}" title="메모 수정">✏️</button>
            <button class="icon-btn btn-note-delete" data-id="${note.id}" title="메모 삭제">🗑️</button>
          </div>
        </div>

        <h3 class="note-card-title">${this.escapeHtml(note.title)}</h3>
        <div class="note-card-content">${formattedContent}</div>

        ${note.tips ? `
          <div class="note-card-tips">
            <span class="tips-label">💡 핵심 팁 / 피해야 할 실수:</span>
            <p>${this.escapeHtml(note.tips)}</p>
          </div>
        ` : ''}

        <div class="note-card-footer">
          <div class="note-tags">
            ${(note.tags || []).map(t => `<span class="tag-pill">#${this.escapeHtml(t)}</span>`).join('')}
          </div>
          <span class="note-date">${dateStr}</span>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ==========================================
// 6. SKCT App Main Controller
// ==========================================
class SKCTApp {
  constructor() {
    this.currentView = 'questions';
    this.currentArea = 'all';
    this.currentSubtype = 'all';
    this.filterStatus = 'all';
    this.searchKeyword = '';
    this.globalBlur = true;

    this.clipboardMgr = new ClipboardManager({
      onImageChange: () => this.checkSaveButtonState()
    });

    this.init();
  }

  async init() {
    this.bindDOMElements();
    this.initSidebar();
    this.initClipboardModal();
    this.initNotesView();
    this.initDetailModal();
    this.initGitModal();
    this.initManageAreasModal();
    this.initTheme();

    document.addEventListener('areas-updated', () => {
      this.renderSidebar();
      this.updateModalSubtypeOptions();
      this.render();
    });

    // 170문항 자동 시딩 로드
    await this.seedInitialDataIfEmpty();
    await this.render();
  }

  bindDOMElements() {
    this.tabQuestionsBtn = document.getElementById('tabQuestionsBtn');
    this.tabNotesBtn = document.getElementById('tabNotesBtn');
    this.questionsViewEl = document.getElementById('questionsView');
    this.notesViewEl = document.getElementById('notesView');

    this.searchInput = document.getElementById('searchInput');
    this.statusFilter = document.getElementById('statusFilter');
    this.toggleMasterBlurBtn = document.getElementById('toggleMasterBlurBtn');

    this.questionModal = document.getElementById('questionModal');
    this.noteModal = document.getElementById('noteModal');
    this.detailModal = document.getElementById('detailModal');
    this.gitModal = document.getElementById('gitModal');

    this.btnOpenQuestionModal = document.getElementById('btnOpenQuestionModal');
    this.btnOpenNoteModal = document.getElementById('btnOpenNoteModal');

    this.sidebarCategoriesEl = document.getElementById('sidebarCategories');
    this.questionsGridEl = document.getElementById('questionsGrid');
    this.notesContainerEl = document.getElementById('notesContainer');

    this.tabQuestionsBtn.addEventListener('click', () => this.switchView('questions'));
    this.tabNotesBtn.addEventListener('click', () => this.switchView('notes'));

    this.searchInput.addEventListener('input', (e) => {
      this.searchKeyword = e.target.value;
      this.render();
    });

    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.render();
      });
    }

    if (this.toggleMasterBlurBtn) {
      this.toggleMasterBlurBtn.addEventListener('click', () => {
        this.globalBlur = !this.globalBlur;
        this.toggleMasterBlurBtn.innerHTML = this.globalBlur 
          ? '<span class="icon">🔒</span> 전체 풀이/답 숨김' 
          : '<span class="icon">👁️</span> 전체 풀이/답 공개';
        this.render();
      });
    }

    // 전체 문제 비우기 버튼
    const btnClearAll = document.getElementById('btnClearAllQuestions') || document.getElementById('btnLoadBongbongData');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        if (confirm('등록된 모든 오답 문제를 삭제하고 빈 상태로 초기화하시겠습니까?\n(새로운 문제를 직접 등록하실 수 있도록 깨끗하게 비워집니다.)')) {
          await dbService.clearQuestions();
          this.clipboardMgr.showToast('🗑️ 모든 문제가 삭제되어 빈 상태로 초기화되었습니다.', 'info');
          await this.render();
        }
      });
    }

    this.btnOpenQuestionModal.addEventListener('click', () => this.openQuestionModal());
    this.btnOpenNoteModal.addEventListener('click', () => this.openNoteModal());

    document.addEventListener('open-note-modal', () => this.openNoteModal());
    document.addEventListener('edit-note', (e) => this.openNoteModal(e.detail.id));

    const btnGitSync = document.getElementById('btnGitSync');
    if (btnGitSync) {
      btnGitSync.addEventListener('click', () => this.openGitModal());
    }

    const btnExportData = document.getElementById('btnExportData');
    if (btnExportData) {
      btnExportData.addEventListener('click', () => this.exportBackupFile());
    }

    const fileImportInput = document.getElementById('fileImportInput');
    if (fileImportInput) {
      fileImportInput.addEventListener('change', (e) => this.handleImportFile(e));
    }
  }

  async syncBongbongQuestions(confirmUser = false) {
    const seed = window.SEED_QUESTIONS || window.questionsSeedData;
    if (!seed || seed.length === 0) {
      this.clipboardMgr.showToast('시드 데이터 파일(questions_seed.js)을 불러올 수 없습니다.', 'warning');
      return;
    }

    if (confirmUser) {
      if (!confirm(`봉봉TV 온라인 SKCT 문제집 279문항 전체(1:1 개별 문제 크롭 및 해설 매칭)를 오답노트에 반영하시겠습니까?`)) {
        return;
      }
    }

    this.clipboardMgr.showToast(`⏳ ${seed.length}개 1:1 정밀 매칭 문항을 등록하는 중입니다...`, 'info');

    await dbService.clearQuestions();
    for (const q of seed) {
      await dbService.saveQuestion(q);
    }

    localStorage.setItem('skct_seed_version_20260923_1to1_final_v7', 'v7_279_items_clean');
    this.clipboardMgr.showToast(`🎉 봉봉TV ${seed.length}문항(1:1 문제·해설·정답) 반영 완료!`, 'success');
    await this.render();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('skct_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.textContent = savedTheme === 'dark' ? '☀️ 라이트' : '🌙 다크';
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('skct_theme', next);
        themeBtn.textContent = next === 'dark' ? '☀️ 라이트' : '🌙 다크';
      });
    }
  }

  switchView(viewName) {
    this.currentView = viewName;
    if (viewName === 'questions') {
      this.tabQuestionsBtn.classList.add('active');
      this.tabNotesBtn.classList.remove('active');
      this.questionsViewEl.style.display = 'block';
      this.notesViewEl.style.display = 'none';
      this.btnOpenQuestionModal.style.display = 'inline-flex';
      this.btnOpenNoteModal.style.display = 'none';
    } else {
      this.tabQuestionsBtn.classList.remove('active');
      this.tabNotesBtn.classList.add('active');
      this.questionsViewEl.style.display = 'none';
      this.notesViewEl.style.display = 'block';
      this.btnOpenQuestionModal.style.display = 'none';
      this.btnOpenNoteModal.style.display = 'inline-flex';
    }
    this.render();
  }

  initSidebar() {
    this.renderSidebar();
  }

  renderSidebar() {
    const areas = getAllAreasWithAll();

    this.sidebarCategoriesEl.innerHTML = areas.map(area => {
      const isSelected = this.currentArea === area.id;
      const hasSubtypes = area.subtypes && area.subtypes.length > 0;
      const isExpanded = isSelected && hasSubtypes;

      return `
        <div class="sidebar-category-group ${isSelected ? 'active-group' : ''}">
          <button class="nav-item ${isSelected ? 'active' : ''}" data-area-id="${area.id}">
            <span class="nav-icon">${area.icon}</span>
            <span class="nav-label">${this.escapeHtml(area.name)}</span>
            ${hasSubtypes ? `<span class="nav-arrow ${isExpanded ? 'rotated' : ''}">▾</span>` : ''}
          </button>

          ${hasSubtypes ? `
            <div class="subtype-accordion ${isExpanded ? 'show' : ''}">
              <div class="subtype-item-wrapper ${this.currentSubtype === 'all' && isSelected ? 'active' : ''}">
                <button class="subtype-item ${this.currentSubtype === 'all' && isSelected ? 'active' : ''}" data-subtype="all">
                  • 전체 세부유형
                </button>
              </div>
              ${area.subtypes.map(st => `
                <div class="subtype-item-wrapper ${this.currentSubtype === st && isSelected ? 'active' : ''}">
                  <button class="subtype-item ${this.currentSubtype === st && isSelected ? 'active' : ''}" data-subtype="${this.escapeHtml(st)}">
                    • ${this.escapeHtml(st)}
                  </button>
                  <button type="button" class="btn-edit-subtype-sidebar" data-area-id="${area.id}" data-subtype="${this.escapeHtml(st)}" title="'${this.escapeHtml(cleanSubtypeName(st))}' 세부유형 제목 수정">
                    ✏️
                  </button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    this.sidebarCategoriesEl.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const areaId = e.currentTarget.dataset.areaId;
        this.selectArea(areaId);
      });
    });

    this.sidebarCategoriesEl.querySelectorAll('.subtype-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const subtype = e.currentTarget.dataset.subtype;
        this.selectSubtype(subtype);
      });
    });

    this.sidebarCategoriesEl.querySelectorAll('.btn-edit-subtype-sidebar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const areaId = btn.dataset.areaId;
        const oldSubtype = btn.dataset.subtype;
        const currentClean = cleanSubtypeName(oldSubtype);

        const newName = prompt(`'${currentClean}' 세부유형의 새로운 제목을 입력하세요:`, currentClean);
        if (newName !== null) {
          const trimmed = newName.trim();
          if (trimmed && trimmed !== currentClean) {
            const res = await this.renameSubtype(areaId, oldSubtype, trimmed);
            if (res) {
              if (this.currentSubtype === oldSubtype || cleanSubtypeName(this.currentSubtype) === currentClean) {
                this.currentSubtype = res.formattedNew;
              }
              this.clipboardMgr.showToast(`✏️ 세부유형이 '${res.formattedNew}'(으)로 변경되었습니다!${res.updatedCount > 0 ? ` (${res.updatedCount}문항 동기화)` : ''}`, 'success');
              this.renderSidebar();
              await this.render();
            }
          }
        }
      });
    });
  }

  async renameSubtype(areaId, oldSubtype, newSubtypeRaw) {
    const cleanNew = cleanSubtypeName(newSubtypeRaw);
    if (!cleanNew) {
      this.clipboardMgr.showToast('세부유형 제목을 입력해주세요.', 'warning');
      return null;
    }

    const customAreas = getCustomAreas();
    const area = customAreas.find(a => a.id === areaId);
    if (!area) return null;

    const subIdx = (area.subtypes || []).findIndex(s => s === oldSubtype || cleanSubtypeName(s) === cleanSubtypeName(oldSubtype));
    if (subIdx === -1) return null;

    const formattedNew = `${subIdx + 1}. ${cleanNew}`;
    area.subtypes[subIdx] = formattedNew;
    saveCustomAreas(customAreas);

    // 저장된 기존 문제들 중 subtype 일치 항목 동기화
    const allQuestions = await dbService.getAllQuestions();
    let updatedCount = 0;
    for (const q of allQuestions) {
      if (q.area === areaId && (q.subtype === oldSubtype || cleanSubtypeName(q.subtype) === cleanSubtypeName(oldSubtype))) {
        q.subtype = formattedNew;
        await dbService.saveQuestion(q);
        updatedCount++;
      }
    }

    // 저장된 기존 노트들 중 subtype 일치 항목 동기화
    const allNotes = await dbService.getAllNotes();
    for (const n of allNotes) {
      if (n.area === areaId && (n.subtype === oldSubtype || cleanSubtypeName(n.subtype) === cleanSubtypeName(oldSubtype))) {
        n.subtype = formattedNew;
        await dbService.saveNote(n);
      }
    }

    return { formattedNew, updatedCount };
  }

  async addNewSubtype(areaId, rawName) {
    const clean = cleanSubtypeName(rawName);
    if (!clean) return null;

    const customAreas = getCustomAreas();
    const area = customAreas.find(a => a.id === areaId);
    if (!area) return null;

    if (!area.subtypes) area.subtypes = [];
    const formatted = `${area.subtypes.length + 1}. ${clean}`;
    area.subtypes.push(formatted);
    saveCustomAreas(customAreas);
    return formatted;
  }

  selectArea(areaId) {
    this.currentArea = areaId;
    this.currentSubtype = 'all';
    this.renderSidebar();
    this.render();
  }

  selectSubtype(subtype) {
    this.currentSubtype = subtype;
    this.renderSidebar();
    this.render();
  }

  initManageAreasModal() {
    this.btnManageAreas = document.getElementById('btnManageAreas');
    this.manageAreasModal = document.getElementById('manageAreasModal');
    this.manageAreasList = document.getElementById('manageAreasList');
    this.btnCloseManageModal = document.getElementById('btnCloseManageModal');
    this.btnResetAreasDefault = document.getElementById('btnResetAreasDefault');
    this.btnSaveAreasChanges = document.getElementById('btnSaveAreasChanges');

    if (this.btnManageAreas) {
      this.btnManageAreas.addEventListener('click', () => this.openManageAreasModal());
    }
    if (this.btnCloseManageModal) {
      this.btnCloseManageModal.addEventListener('click', () => {
        this.manageAreasModal.classList.remove('active');
      });
    }
    if (this.btnResetAreasDefault) {
      this.btnResetAreasDefault.addEventListener('click', () => {
        if (confirm('모든 시험 영역과 세부항목을 초기 기본값으로 복원하시겠습니까?')) {
          resetCustomAreas();
          this.manageAreasData = getCustomAreas();
          this.renderManageAreasList();
          this.clipboardMgr.showToast('🔄 기본값으로 초기화되었습니다.', 'info');
        }
      });
    }
    if (this.btnSaveAreasChanges) {
      this.btnSaveAreasChanges.addEventListener('click', () => {
        this.saveManagedAreas();
      });
    }
  }

  openManageAreasModal() {
    this.manageAreasData = JSON.parse(JSON.stringify(getCustomAreas()));
    this.renderManageAreasList();
    this.manageAreasModal.classList.add('active');
  }

  renderManageAreasList() {
    this.manageAreasList.innerHTML = this.manageAreasData.map((area, aIdx) => {
      const subtypes = area.subtypes || [];

      return `
        <div class="manage-area-card" data-area-idx="${aIdx}">
          <div class="manage-area-header">
            <span class="manage-area-icon">${area.icon}</span>
            <input type="text" class="manage-area-title-input" value="${this.escapeHtml(area.name)}" placeholder="시험 영역 제목 입력" data-area-idx="${aIdx}">
          </div>

          <div class="manage-subtype-list" data-area-idx="${aIdx}">
            ${subtypes.map((st, sIdx) => `
              <div class="manage-subtype-item draggable" draggable="true" data-area-idx="${aIdx}" data-sub-idx="${sIdx}">
                <span class="drag-handle" title="위아래로 드래그하여 순서 변경">☰</span>
                <span class="subtype-number">${sIdx + 1}.</span>
                <input type="text" class="subtype-input" value="${this.escapeHtml(cleanSubtypeName(st))}" placeholder="세부항목 제목 입력" data-area-idx="${aIdx}" data-sub-idx="${sIdx}">
                <button type="button" class="btn-delete-subtype" data-area-idx="${aIdx}" data-sub-idx="${sIdx}" title="항목 삭제">🗑️</button>
              </div>
            `).join('')}
          </div>

          <button type="button" class="btn-add-subtype" data-area-idx="${aIdx}">
            + 세부항목 추가
          </button>
        </div>
      `;
    }).join('');

    this.bindManageDragAndDropEvents();
  }

  bindManageDragAndDropEvents() {
    this.manageAreasList.querySelectorAll('.manage-area-title-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const aIdx = parseInt(e.target.dataset.areaIdx, 10);
        this.manageAreasData[aIdx].name = e.target.value.trim();
      });
    });

    this.manageAreasList.querySelectorAll('.subtype-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const aIdx = parseInt(e.target.dataset.areaIdx, 10);
        const sIdx = parseInt(e.target.dataset.subIdx, 10);
        this.manageAreasData[aIdx].subtypes[sIdx] = cleanSubtypeName(e.target.value);
      });
    });

    this.manageAreasList.querySelectorAll('.btn-delete-subtype').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const aIdx = parseInt(e.currentTarget.dataset.areaIdx, 10);
        const sIdx = parseInt(e.currentTarget.dataset.subIdx, 10);
        this.manageAreasData[aIdx].subtypes.splice(sIdx, 1);
        this.renderManageAreasList();
      });
    });

    this.manageAreasList.querySelectorAll('.btn-add-subtype').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const aIdx = parseInt(e.currentTarget.dataset.areaIdx, 10);
        this.manageAreasData[aIdx].subtypes.push('새 세부유형');
        this.renderManageAreasList();
      });
    });

    let draggedItem = null;
    let draggedAreaIdx = null;
    let draggedSubIdx = null;

    this.manageAreasList.querySelectorAll('.manage-subtype-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        draggedAreaIdx = parseInt(item.dataset.areaIdx, 10);
        draggedSubIdx = parseInt(item.dataset.subIdx, 10);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        if (draggedItem) {
          draggedItem.classList.remove('dragging');
        }
        this.manageAreasList.querySelectorAll('.manage-subtype-item').forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetAreaIdx = parseInt(item.dataset.areaIdx, 10);
        if (targetAreaIdx === draggedAreaIdx) {
          item.classList.add('drag-over');
        }
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');

        const targetAreaIdx = parseInt(item.dataset.areaIdx, 10);
        const targetSubIdx = parseInt(item.dataset.subIdx, 10);

        if (draggedAreaIdx === targetAreaIdx && draggedSubIdx !== targetSubIdx) {
          const list = this.manageAreasData[draggedAreaIdx].subtypes;
          const [movedItem] = list.splice(draggedSubIdx, 1);
          list.splice(targetSubIdx, 0, movedItem);
          this.renderManageAreasList();
        }
      });
    });
  }

  async saveManagedAreas() {
    const oldAreas = getCustomAreas();
    const renamePairs = [];

    this.manageAreasData.forEach((area) => {
      if (!area.name.trim()) area.name = '시험 영역';
      const oldArea = oldAreas.find(oa => oa.id === area.id);
      const oldSubs = oldArea ? (oldArea.subtypes || []) : [];

      const newSubtypes = [];
      (area.subtypes || []).forEach((s, sIdx) => {
        const clean = cleanSubtypeName(s);
        if (clean) {
          const formatted = `${newSubtypes.length + 1}. ${clean}`;
          newSubtypes.push(formatted);
          if (oldSubs[sIdx] && oldSubs[sIdx] !== formatted) {
            renamePairs.push({ areaId: area.id, oldName: oldSubs[sIdx], newName: formatted });
          }
        }
      });
      area.subtypes = newSubtypes;
    });

    saveCustomAreas(this.manageAreasData);

    // 변경된 세부유형 이름 기존 문제 동기화
    if (renamePairs.length > 0) {
      const allQuestions = await dbService.getAllQuestions();
      for (const q of allQuestions) {
        for (const pair of renamePairs) {
          if (q.area === pair.areaId && (q.subtype === pair.oldName || cleanSubtypeName(q.subtype) === cleanSubtypeName(pair.oldName))) {
            q.subtype = pair.newName;
            await dbService.saveQuestion(q);
          }
        }
      }
    }

    this.manageAreasModal.classList.remove('active');
    this.clipboardMgr.showToast('💾 시험 영역 및 세부항목 설정이 저장되었습니다!', 'success');
    this.renderSidebar();
    await this.render();
  }

  initNotesView() {
    this.notesMgr = new NotesManager(this.notesContainerEl, (filteredCount) => {
      const countBadge = document.getElementById('notesCountBadge');
      if (countBadge) countBadge.textContent = `${filteredCount}건`;
    });
  }

  async render() {
    this.updateStats();

    if (this.currentView === 'questions') {
      await this.renderQuestions();
    } else {
      this.notesMgr.setFilter(this.currentArea);
      this.notesMgr.setSearch(this.searchKeyword);
    }
  }

  async updateStats() {
    const allQuestions = await dbService.getAllQuestions();
    const resolvedCount = allQuestions.filter(q => q.isResolved).length;
    const needReviewCount = allQuestions.length - resolvedCount;

    const statTotalEl = document.getElementById('statTotalQuestions');
    const statReviewEl = document.getElementById('statNeedReview');
    const statResolvedEl = document.getElementById('statResolved');

    if (statTotalEl) statTotalEl.textContent = allQuestions.length;
    if (statReviewEl) statReviewEl.textContent = needReviewCount;
    if (statResolvedEl) statResolvedEl.textContent = resolvedCount;
  }

  async renderQuestions() {
    const questions = await dbService.getAllQuestions();
    let filtered = questions;

    if (this.currentArea && this.currentArea !== 'all') {
      filtered = filtered.filter(q => q.area === this.currentArea);
    }

    if (this.currentSubtype && this.currentSubtype !== 'all') {
      filtered = filtered.filter(q => q.subtype === this.currentSubtype);
    }

    if (this.filterStatus === 'need_review') {
      filtered = filtered.filter(q => !q.isResolved);
    } else if (this.filterStatus === 'resolved') {
      filtered = filtered.filter(q => q.isResolved);
    }

    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(q => 
        (q.memo && q.memo.toLowerCase().includes(kw)) ||
        (q.subtype && q.subtype.toLowerCase().includes(kw)) ||
        (q.mistakeReason && q.mistakeReason.toLowerCase().includes(kw)) ||
        (q.tags && q.tags.some(t => t.toLowerCase().includes(kw)))
      );
    }

    const countBadge = document.getElementById('questionsCountBadge');
    if (countBadge) countBadge.textContent = `${filtered.length}문항`;

    // 상단 뷰 헤더 제목 동적 갱신 및 세부유형 제목 수정 버튼
    const titleEl = document.getElementById('questionsViewTitle');
    if (titleEl) {
      if (this.currentArea === 'all') {
        titleEl.innerHTML = '문제 오답 피드';
      } else {
        const area = getAreaById(this.currentArea);
        if (this.currentSubtype === 'all') {
          titleEl.innerHTML = `<span>${area.icon} ${this.escapeHtml(area.name)}</span> <span style="font-size:0.8em; font-weight:normal; opacity:0.7;">(전체 세부유형)</span>`;
        } else {
          titleEl.innerHTML = `
            <span>${area.icon} ${this.escapeHtml(area.name)}</span>
            <span style="color:var(--text-sub); margin: 0 6px; font-weight:300;">&gt;</span>
            <span style="color:var(--color-primary); font-weight:700;">📌 ${this.escapeHtml(this.currentSubtype)}</span>
            <button type="button" id="btnHeaderRenameSubtype" class="btn-header-edit-subtype" title="현재 선택된 '${this.escapeHtml(cleanSubtypeName(this.currentSubtype))}' 제목 수정">
              ✏️ 제목 수정
            </button>
          `;
          const btnHeaderEdit = document.getElementById('btnHeaderRenameSubtype');
          if (btnHeaderEdit) {
            btnHeaderEdit.addEventListener('click', async () => {
              const currentClean = cleanSubtypeName(this.currentSubtype);
              const newName = prompt(`'${currentClean}' 세부유형의 새로운 제목을 입력하세요:`, currentClean);
              if (newName !== null) {
                const trimmed = newName.trim();
                if (trimmed && trimmed !== currentClean) {
                  const res = await this.renameSubtype(this.currentArea, this.currentSubtype, trimmed);
                  if (res) {
                    this.currentSubtype = res.formattedNew;
                    this.clipboardMgr.showToast(`✏️ 세부유형 제목이 '${res.formattedNew}'(으)로 변경되었습니다!${res.updatedCount > 0 ? ` (${res.updatedCount}문항 동기화)` : ''}`, 'success');
                    this.renderSidebar();
                    await this.render();
                  }
                }
              }
            });
          }
        }
      }
    }

    if (filtered.length === 0) {
      this.questionsGridEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <h3>등록된 오답 문제가 없습니다</h3>
          <p>화면을 캡처한 후 아래 버튼을 누르거나, <strong>Ctrl + V</strong>로 쉽게 새 문제를 등록해 보세요!</p>
          <button class="btn btn-vivid-gradient btn-add-q-inline" style="margin-top: 16px;">
            <span class="btn-icon">📷</span> + 새 문제 캡처 등록 (Ctrl+V)
          </button>
        </div>
      `;
      const btn = this.questionsGridEl.querySelector('.btn-add-q-inline');
      if (btn) btn.addEventListener('click', () => this.openQuestionModal());
      return;
    }

    this.questionsGridEl.innerHTML = filtered.map(q => this.createQuestionCardHtml(q)).join('');

    this.questionsGridEl.querySelectorAll('.btn-toggle-blur').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.question-card');
        card.classList.toggle('revealed');
      });
    });

    this.questionsGridEl.querySelectorAll('.btn-open-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openDetailModal(id);
      });
    });

    this.questionsGridEl.querySelectorAll('.btn-card-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm('이 오답 문제를 삭제하시겠습니까?')) {
          await dbService.deleteQuestion(id);
          await this.render();
        }
      });
    });

    this.questionsGridEl.querySelectorAll('.checkbox-resolve').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const id = e.currentTarget.dataset.id;
        const q = await dbService.getQuestionById(id);
        if (q) {
          q.isResolved = e.currentTarget.checked;
          await dbService.saveQuestion(q);
          await this.render();
        }
      });
    });
  }

  createQuestionCardHtml(q) {
    const area = getAreaById(q.area);
    const dateStr = new Date(q.createdAt).toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric'
    });

    const qImg = q.questionImg || q.questionImage;
    const sImg = q.solutionImg || q.solutionImage;

    return `
      <div class="question-card glass-panel ${q.isResolved ? 'is-resolved' : ''} ${!this.globalBlur ? 'revealed' : ''}" data-id="${q.id}">
        <div class="card-header">
          <div class="card-header-left">
            <label class="resolve-label" title="복습 완료 여부 체크">
              <input type="checkbox" class="checkbox-resolve" data-id="${q.id}" ${q.isResolved ? 'checked' : ''}>
              <span class="custom-checkbox"></span>
              <span class="resolve-text">${q.isResolved ? '복습 완료' : '다시 풀기'}</span>
            </label>
            <span class="badge" style="background:${area.bgColor}; color:${area.color}; border: 1px solid ${area.color}40;">
              ${area.icon} ${this.escapeHtml(area.shortName || area.name)}
            </span>
            ${q.subtype ? `<span class="badge badge-sub">${this.escapeHtml(q.subtype)}</span>` : ''}
            ${q.title ? `<span class="badge" style="background:rgba(255,255,255,0.08); font-weight:700;">${this.escapeHtml(q.title)}</span>` : ''}
          </div>
          <div class="card-header-right">
            <span class="card-date">${dateStr}</span>
            <button class="icon-btn btn-open-detail" data-id="${q.id}" title="실전 풀이 모드 (1분 타이머)">⏱️ 실전</button>
            <button class="icon-btn btn-card-delete" data-id="${q.id}" title="삭제">🗑️</button>
          </div>
        </div>

        <div class="card-section card-question-section">
          <div class="section-label">
            <span class="label-badge badge-q">문제</span>
            ${q.mistakeReason ? `<span class="mistake-badge">실수 요인: ${this.escapeHtml(q.mistakeReason)}</span>` : ''}
          </div>
          <div class="img-container question-img-box">
            ${qImg && qImg.trim() ? `
              <img src="${qImg}" alt="문제" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="no-img" style="display:none;">⚠️ 이미지 로드 오류</div>
            ` : '<div class="no-img">문제 이미지 없음</div>'}
          </div>
        </div>

        <div class="card-secret-section">
          <div class="card-blur-overlay">
            <button class="btn btn-reveal btn-toggle-blur">
              <span class="btn-icon">👁️</span> 정답 &amp; 풀이과정 확인
            </button>
            <span class="blur-hint">문제를 다 푼 뒤 클릭해서 정답을 확인하세요!</span>
          </div>

          <div class="secret-content">
            <div class="card-section card-solution-section">
              <div class="section-label">
                <span class="label-badge badge-s">풀이 및 정답</span>
                ${q.correctAnswer ? `<span class="badge" style="background:#10B981; color:#fff; font-weight:700; margin-left:8px;">정답: ${this.escapeHtml(q.correctAnswer)}</span>` : ''}
                <button class="btn-mini-hide btn-toggle-blur" title="다시 가리기">🔒 다시 가리기</button>
              </div>
              <div class="img-container solution-img-box">
                ${sImg && sImg.trim() ? `
                  <img src="${sImg}" alt="해설" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="no-img" style="display:none;">⚠️ 해설 이미지 로드 오류</div>
                ` : '<div class="no-img">해설 이미지 없음</div>'}
              </div>
              ${q.answerImg && q.answerImg.trim() ? `
                <div class="img-container answer-img-box" style="margin-top: 10px;">
                  <div class="section-label"><span class="label-badge" style="background:#10B981; color:#fff;">정답 이미지</span></div>
                  <img src="${q.answerImg}" alt="정답" loading="lazy" onerror="this.style.display='none';">
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        ${q.memo ? `
          <div class="card-memo">
            <span class="memo-icon">💡</span>
            <span class="memo-text">${this.escapeHtml(q.memo)}</span>
          </div>
        ` : ''}

        ${q.tags && q.tags.length > 0 ? `
          <div class="card-footer-tags">
            ${q.tags.map(t => `<span class="tag-pill">#${this.escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  initClipboardModal() {
    this.clipboardContainer = document.getElementById('clipboardSlotsContainer');
    this.clipboardMgr.initSlots(this.clipboardContainer);

    this.selectModalArea = document.getElementById('modalAreaSelect');
    this.selectModalSubtype = document.getElementById('modalSubtypeSelect');
    this.inputMistakeReason = document.getElementById('modalMistakeReason');
    this.inputMemo = document.getElementById('modalMemo');
    this.inputTags = document.getElementById('modalTags');
    this.chkAutoAdvance = document.getElementById('chkAutoAdvance');
    this.btnSaveQuestion = document.getElementById('btnSaveQuestion');
    this.btnCloseQModal = document.getElementById('btnCloseQModal');

    this.updateModalAreaOptions();

    this.selectModalArea.addEventListener('change', () => this.updateModalSubtypeOptions());
    this.updateModalSubtypeOptions();

    if (this.chkAutoAdvance) {
      this.chkAutoAdvance.addEventListener('change', (e) => {
        this.clipboardMgr.setAutoAdvance(e.target.checked);
      });
    }

    this.btnCloseQModal.addEventListener('click', () => this.closeQuestionModal());
    this.btnSaveQuestion.addEventListener('click', () => this.saveNewQuestion());

    document.querySelectorAll('.btn-quick-reason').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.inputMistakeReason.value = e.target.textContent;
      });
    });

    const btnQuickAddSubtype = document.getElementById('btnQuickAddSubtype');
    if (btnQuickAddSubtype) {
      btnQuickAddSubtype.addEventListener('click', async () => {
        const areaId = this.selectModalArea.value;
        const area = getAreaById(areaId);
        const name = prompt(`'${area.name}' 영역에 추가할 새로운 세부유형 제목을 입력하세요:`);
        if (name && name.trim()) {
          const added = await this.addNewSubtype(areaId, name.trim());
          if (added) {
            this.updateModalSubtypeOptions();
            this.selectModalSubtype.value = added;
            this.renderSidebar();
            this.clipboardMgr.showToast(`✨ 새 세부유형 '${added}'이(가) 추가되었습니다!`, 'success');
          }
        }
      });
    }
  }

  updateModalAreaOptions() {
    const areas = getAllAreasWithAll().filter(a => a.id !== 'all');
    this.selectModalArea.innerHTML = areas
      .map(a => `<option value="${a.id}">${a.icon} ${this.escapeHtml(a.name)}</option>`)
      .join('');
  }

  updateModalSubtypeOptions() {
    const areaId = this.selectModalArea.value;
    const subtypes = getAllSubtypesForArea(areaId);
    if (subtypes.length === 0) {
      this.selectModalSubtype.innerHTML = '<option value="">선택 가능한 세부유형 없음</option>';
      this.selectModalSubtype.disabled = true;
    } else {
      this.selectModalSubtype.disabled = false;
      this.selectModalSubtype.innerHTML = `
        <option value="">세부유형 선택 (권장)</option>
        ${subtypes.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('')}
      `;
    }
  }

  openQuestionModal() {
    this.clipboardMgr.resetAll();
    this.inputMistakeReason.value = '';
    this.inputMemo.value = '';
    this.inputTags.value = '';

    this.updateModalAreaOptions();

    if (this.currentArea && this.currentArea !== 'all') {
      this.selectModalArea.value = this.currentArea;
      this.updateModalSubtypeOptions();
      if (this.currentSubtype && this.currentSubtype !== 'all') {
        this.selectModalSubtype.value = this.currentSubtype;
      }
    } else {
      this.updateModalSubtypeOptions();
    }

    this.questionModal.classList.add('active');
    this.clipboardMgr.setActiveSlot('question');
  }

  closeQuestionModal() {
    this.questionModal.classList.remove('active');
  }

  checkSaveButtonState() {
    const hasQuestion = !!this.clipboardMgr.slots.question;
    this.btnSaveQuestion.disabled = !hasQuestion;
  }

  async saveNewQuestion() {
    try {
      if (!this.clipboardMgr.slots.question) {
        this.clipboardMgr.showToast('⚠️ 문제 이미지를 최소 1장 붙여넣어 주세요! (Ctrl+V)', 'warning');
        this.clipboardMgr.setActiveSlot('question');
        return;
      }

      this.btnSaveQuestion.disabled = true;
      this.btnSaveQuestion.textContent = '⏳ 저장 중...';

      const tags = this.inputTags.value
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(t => t.length > 0);

      const questionData = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        area: this.selectModalArea.value,
        subtype: this.selectModalSubtype.value || '',
        mistakeReason: this.inputMistakeReason.value.trim(),
        memo: this.inputMemo.value.trim(),
        tags: tags,
        isResolved: false,
        questionImg: this.clipboardMgr.slots.question,
        solutionImg: this.clipboardMgr.slots.solution,
        answerImg: this.clipboardMgr.slots.answer,
        createdAt: Date.now()
      };

      await dbService.saveQuestion(questionData);
      this.closeQuestionModal();
      this.clipboardMgr.showToast('🎉 오답 문제가 성공적으로 등록되었습니다!', 'success');
      await this.render();
    } catch (err) {
      console.error('saveNewQuestion error:', err);
      alert('오답 문제를 저장하는 도중 오류가 발생했습니다: ' + (err.message || err));
    } finally {
      this.btnSaveQuestion.disabled = false;
      this.btnSaveQuestion.textContent = '💾 오답 문제 저장하기';
      this.checkSaveButtonState();
    }
  }

  initDetailModal() {
    this.detailTimerDisplay = document.getElementById('detailTimerDisplay');
    this.btnDetailTimerToggle = document.getElementById('btnDetailTimerToggle');
    this.btnDetailTimerReset = document.getElementById('btnDetailTimerReset');
    this.btnDetailReveal = document.getElementById('btnDetailReveal');
    this.detailSecretBox = document.getElementById('detailSecretBox');
    this.btnCloseDetailModal = document.getElementById('btnCloseDetailModal');

    this.practiceTimer = new PracticeTimer(this.detailTimerDisplay, () => {
      this.clipboardMgr.showToast('⏰ 1분이 경과했습니다! 답을 선택해 보세요.', 'warning');
    });

    this.btnDetailTimerToggle.addEventListener('click', () => {
      this.practiceTimer.toggle();
      this.btnDetailTimerToggle.textContent = this.practiceTimer.isRunning ? '⏸️ 일시정지' : '▶️ 타이머 시작';
    });

    this.btnDetailTimerReset.addEventListener('click', () => {
      this.practiceTimer.reset(60);
      this.btnDetailTimerToggle.textContent = '▶️ 타이머 시작';
    });

    this.btnDetailReveal.addEventListener('click', () => {
      this.detailSecretBox.classList.toggle('revealed');
      this.btnDetailReveal.textContent = this.detailSecretBox.classList.contains('revealed') 
        ? '🔒 정답 & 풀이 다시 가리기' 
        : '👁️ 정답 & 풀이과정 확인하기';
    });

    this.btnCloseDetailModal.addEventListener('click', () => {
      this.practiceTimer.stop();
      this.detailModal.classList.remove('active');
    });
  }

  async openDetailModal(id) {
    const q = await dbService.getQuestionById(id);
    if (!q) return;

    this.currentDetailId = id;
    const area = getAreaById(q.area);

    const titleStr = q.title ? ` • ${this.escapeHtml(q.title)}` : '';
    document.getElementById('detailAreaBadge').innerHTML = `${area.icon} ${this.escapeHtml(area.name)} ${q.subtype ? '• ' + this.escapeHtml(q.subtype) : ''}${titleStr}`;
    
    // 1. 문제 이미지 처리 (엑박 방지)
    const qImgEl = document.getElementById('detailQuestionImg');
    const qNoMsg = document.getElementById('detailNoQuestionMsg');
    const qSrc = q.questionImg || q.questionImage;
    if (qSrc && qSrc.trim()) {
      qImgEl.src = qSrc;
      qImgEl.style.display = 'block';
      if (qNoMsg) qNoMsg.style.display = 'none';
    } else {
      qImgEl.removeAttribute('src');
      qImgEl.style.display = 'none';
      if (qNoMsg) qNoMsg.style.display = 'block';
    }

    // 2. 해설 이미지 처리 (엑박 방지)
    const sImgEl = document.getElementById('detailSolutionImg');
    const sBlock = document.getElementById('detailSolutionBlock');
    const sNoMsg = document.getElementById('detailNoSolutionMsg');
    const sSrc = q.solutionImg || q.solutionImage;
    if (sSrc && sSrc.trim()) {
      sImgEl.src = sSrc;
      sImgEl.style.display = 'block';
      if (sNoMsg) sNoMsg.style.display = 'none';
      if (sBlock) sBlock.style.display = 'block';
    } else {
      sImgEl.removeAttribute('src');
      sImgEl.style.display = 'none';
      if (sNoMsg) sNoMsg.style.display = 'block';
    }

    // 3. 정답 이미지 처리 (엑박 방지)
    const aImgEl = document.getElementById('detailAnswerImg');
    const aBlock = document.getElementById('detailAnswerBlock');
    const aNoMsg = document.getElementById('detailNoAnswerMsg');
    const aSrc = q.answerImg;
    if (aSrc && aSrc.trim()) {
      aImgEl.src = aSrc;
      aImgEl.style.display = 'block';
      if (aNoMsg) aNoMsg.style.display = 'none';
      if (aBlock) aBlock.style.display = 'block';
    } else {
      aImgEl.removeAttribute('src');
      aImgEl.style.display = 'none';
      if (aBlock) aBlock.style.display = 'none';
    }
    
    let memoText = q.memo ? `💡 핵심 메모: ${q.memo}` : '';
    if (q.correctAnswer) {
      memoText = `🎯 정답: ${q.correctAnswer} ${memoText ? ' | ' + memoText : ''}`;
    }
    document.getElementById('detailMemo').textContent = memoText;

    this.detailSecretBox.classList.remove('revealed');
    this.btnDetailReveal.textContent = '👁️ 정답 & 풀이과정 확인하기';

    this.practiceTimer.reset(60);
    this.btnDetailTimerToggle.textContent = '▶️ 1분 타이머 시작';

    this.detailModal.classList.add('active');
  }

  openNoteModal(id = null) {
    const noteAreaSelect = document.getElementById('noteModalAreaSelect');
    const noteSubtypeSelect = document.getElementById('noteModalSubtypeSelect');
    const noteTitle = document.getElementById('noteModalTitle');
    const noteContent = document.getElementById('noteModalContent');
    const noteTips = document.getElementById('noteModalTips');
    const noteTags = document.getElementById('noteModalTags');
    const btnSaveNote = document.getElementById('btnSaveNote');
    const btnCloseNoteModal = document.getElementById('btnCloseNoteModal');

    const areas = getAllAreasWithAll().filter(a => a.id !== 'all');
    noteAreaSelect.innerHTML = areas
      .map(a => `<option value="${a.id}">${a.icon} ${this.escapeHtml(a.name)}</option>`)
      .join('');

    const updateSubtypes = () => {
      const subtypes = getAllSubtypesForArea(noteAreaSelect.value);
      noteSubtypeSelect.innerHTML = `<option value="">세부유형 선택 (권장)</option>` + 
        subtypes.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('');
    };

    noteAreaSelect.onchange = updateSubtypes;
    updateSubtypes();

    let editingId = id;

    if (editingId) {
      dbService.getAllNotes().then(notes => {
        const target = notes.find(n => n.id === editingId);
        if (target) {
          noteAreaSelect.value = target.area;
          updateSubtypes();
          noteSubtypeSelect.value = target.subtype || '';
          noteTitle.value = target.title || '';
          noteContent.value = target.content || '';
          noteTips.value = target.tips || '';
          noteTags.value = (target.tags || []).join(', ');
        }
      });
    } else {
      noteTitle.value = '';
      noteContent.value = '';
      noteTips.value = '';
      noteTags.value = '';
      if (this.currentArea && this.currentArea !== 'all') {
        noteAreaSelect.value = this.currentArea;
        updateSubtypes();
      }
    }

    this.noteModal.classList.add('active');

    btnSaveNote.onclick = async () => {
      if (!noteTitle.value.trim() || !noteContent.value.trim()) {
        alert('제목과 메모 내용을 입력해 주세요!');
        return;
      }

      const tags = noteTags.value.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0);

      const noteItem = {
        id: editingId || ('note_' + Date.now()),
        area: noteAreaSelect.value,
        subtype: noteSubtypeSelect.value,
        title: noteTitle.value.trim(),
        content: noteContent.value.trim(),
        tips: noteTips.value.trim(),
        tags: tags,
        createdAt: editingId ? undefined : Date.now()
      };

      await dbService.saveNote(noteItem);
      this.noteModal.classList.remove('active');
      this.clipboardMgr.showToast('📝 줄글 오답 메모가 저장되었습니다!', 'success');
      await this.render();
    };

    btnCloseNoteModal.onclick = () => {
      this.noteModal.classList.remove('active');
    };
  }

  initGitModal() {
    const btnCloseGitModal = document.getElementById('btnCloseGitModal');
    if (btnCloseGitModal) {
      btnCloseGitModal.addEventListener('click', () => {
        this.gitModal.classList.remove('active');
      });
    }
  }

  openGitModal() {
    this.gitModal.classList.add('active');
  }

  async exportBackupFile() {
    const data = await dbService.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `SKCT_오답노트_백업_${now}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.clipboardMgr.showToast('💾 오답노트 백업 파일(.json)이 다운로드되었습니다!', 'success');
  }

  async handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (confirm('가져온 데이터로 기존 데이터를 병합/복원하시겠습니까?')) {
        await dbService.importAllData(parsed);
        this.clipboardMgr.showToast('🎉 데이터 복원이 완료되었습니다!', 'success');
        await this.render();
      }
    } catch (err) {
      alert('데이터 파일 형식이 올바르지 않습니다: ' + err.message);
    }
  }

  async seedInitialDataIfEmpty() {
    const CLEAN_SLATE_KEY = 'skct_clean_slate_user_fresh_v8';
    const hasCleaned = localStorage.getItem(CLEAN_SLATE_KEY);
    const existingNotes = await dbService.getAllNotes();

    // 사용자의 "문제, 풀이 싹 지워줘 내가 새로 업로드할게" 요청에 따라 기존 문제 전면 초기화
    if (!hasCleaned) {
      console.log('사용자 요청: 모든 기존 문제를 깨끗하게 초기화합니다 (Clean Slate).');
      await dbService.clearQuestions();
      localStorage.setItem(CLEAN_SLATE_KEY, 'cleared');
    }

    // 2. 줄글 공식 메모장 초기 시드
    if (existingNotes.length === 0) {
      await dbService.saveNote({
        id: 'note_sample_1',
        area: 'math',
        subtype: '1. 소금물 문제',
        title: '소금물 농도 & 가중평균 지렛대 공식',
        content: `1. **가중평균 지렛대 공식**:\n   - 섞인 농도는 두 소금물 농도의 거리 비와 질량비의 역수 관계!\n   - (소금물A 질량) : (소금물B 질량) = (섞인농도 - B농도) : (A농도 - 섞인농도)\n2. **물 증발/추가 시**:\n   - 물의 농도는 0%\n   - 소금 추가 시 소금의 농도는 100%로 계산`,
        tips: '복잡한 방정식 세우지 말고 시소(지렛대) 비율로 풀면 20초 단축!',
        tags: ['소금물', '지렛대공식', '창의수리'],
        createdAt: Date.now() - 3600000 * 2
      });

      await dbService.saveNote({
        id: 'note_sample_2',
        area: 'math',
        subtype: '3. 거속시 문제',
        title: '거속시 마주보고 달릴 때 & 터널 통과 공식',
        content: `1. **마주보고 달릴 때**: 만나는 시간 = 거리 / (속력합)\n2. **같은 방향 추월 시**: 추월 시간 = 거리 / (속력차)\n3. **열차와 터널 통과**: 이동 거리 = (터널 길이 + 열차 길이)`,
        tips: '시속(km/h)과 분속, 초속(m/s) 단위 일치 필수 (x 5/18)',
        tags: ['거속시', '필수공식'],
        createdAt: Date.now() - 3600000 * 5
      });
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.skctApp = new SKCTApp();
});
