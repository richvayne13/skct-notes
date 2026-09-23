/**
 * SKCT Master Error Notes - Single Bundle Script
 * file:/// 로컬 직접 열기 및 GitHub Pages 온라인 배포 완벽 지원
 */

// ==========================================
// 1. Categories & Subtypes
// ==========================================
const SKCT_AREAS = [
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

function getAreaById(id) {
  return SKCT_AREAS.find(a => a.id === id) || SKCT_AREAS[0];
}

function getAllSubtypesForArea(areaId) {
  const area = getAreaById(areaId);
  return area ? (area.subtypes || []) : [];
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

      slotEl.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-clear-slot')) {
          this.setActiveSlot(slotName);
        }
      });

      slotEl.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePasteEvent(e, slotName);
      });

      const pasteBtn = slotEl.querySelector('.btn-paste-clipboard');
      if (pasteBtn) {
        pasteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.pasteFromClipboardApi(slotName);
        });
      }

      const clearBtn = slotEl.querySelector('.btn-clear-slot');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clearSlot(slotName);
        });
      }
    });

    this.container.addEventListener('paste', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      e.preventDefault();
      this.handlePasteEvent(e, this.activeSlot);
    });

    this.updateSlotUI();
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
        previewEl.src = '';
        previewEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
        if (clearBtn) clearBtn.style.display = 'none';
      }
    });
  }

  handlePasteEvent(e, targetSlot) {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    let imageFound = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        this.processImageFile(file, targetSlot);
        imageFound = true;
        break;
      }
    }

    if (!imageFound) {
      this.showToast('클립보드에 복사된 이미지가 없습니다. 캡처 후 다시 붙여넣어 주세요.', 'warning');
    }
  }

  async pasteFromClipboardApi(targetSlot) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        this.showToast('Ctrl + V 단축키로 직접 붙여넣어 주세요!', 'info');
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
        this.showToast('클립보드에 이미지가 없습니다. 화면을 캡처한 후 눌러주세요!', 'warning');
      }
    } catch (err) {
      console.warn('Clipboard read error or permission denied:', err);
      this.showToast('Ctrl + V 키를 눌러 붙여넣어 주세요!', 'info');
    }
  }

  processImageFile(file, slotName) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.setSlotImage(slotName, dataUrl);

      if (this.autoAdvance) {
        if (slotName === 'question') {
          this.setActiveSlot('solution');
          this.showToast('✅ [문제] 등록 완료! ➡️ 이제 [풀이]를 Ctrl+V 하세요.', 'success');
        } else if (slotName === 'solution') {
          this.setActiveSlot('answer');
          this.showToast('✅ [풀이] 등록 완료! ➡️ 이제 [답]을 Ctrl+V 하세요.', 'success');
        } else if (slotName === 'answer') {
          this.showToast('🎉 문제, 풀이, 답 3종 이미지 등록 완료!', 'success');
        }
      } else {
        this.showToast(`✅ [${this.getSlotKoreanName(slotName)}] 등록 완료!`, 'success');
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
              ${area.icon} ${area.name}
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
    this.initTheme();

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
    this.sidebarCategoriesEl.innerHTML = SKCT_AREAS.map(area => {
      const isSelected = this.currentArea === area.id;
      const hasSubtypes = area.subtypes && area.subtypes.length > 0;
      const isExpanded = isSelected && hasSubtypes;

      return `
        <div class="sidebar-category-group ${isSelected ? 'active-group' : ''}">
          <button class="nav-item ${isSelected ? 'active' : ''}" data-area-id="${area.id}">
            <span class="nav-icon">${area.icon}</span>
            <span class="nav-label">${area.name}</span>
            ${hasSubtypes ? `<span class="nav-arrow ${isExpanded ? 'rotated' : ''}">▾</span>` : ''}
          </button>

          ${hasSubtypes ? `
            <div class="subtype-accordion ${isExpanded ? 'show' : ''}">
              <button class="subtype-item ${this.currentSubtype === 'all' && isSelected ? 'active' : ''}" data-subtype="all">
                • 전체 세부유형
              </button>
              ${area.subtypes.map(st => `
                <button class="subtype-item ${this.currentSubtype === st && isSelected ? 'active' : ''}" data-subtype="${this.escapeHtml(st)}">
                  • ${this.escapeHtml(st)}
                </button>
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

    if (filtered.length === 0) {
      this.questionsGridEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <h3>등록된 오답 문제가 없습니다</h3>
          <p>화면 캡처 후 <strong>Ctrl + V</strong>로 문제, 풀이, 답을 빠르게 등록해 보세요!</p>
          <button class="btn btn-primary btn-add-q-inline">
            <span class="btn-icon">➕</span> 새 오답 문제 등록하기
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
              ${area.icon} ${area.shortName}
            </span>
            ${q.subtype ? `<span class="badge badge-sub">${this.escapeHtml(q.subtype)}</span>` : ''}
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
            ${q.questionImg ? `<img src="${q.questionImg}" alt="문제" loading="lazy">` : '<div class="no-img">문제 이미지 없음</div>'}
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
                <span class="label-badge badge-s">풀이과정</span>
                <button class="btn-mini-hide btn-toggle-blur" title="다시 가리기">🔒 다시 가리기</button>
              </div>
              <div class="img-container solution-img-box">
                ${q.solutionImg ? `<img src="${q.solutionImg}" alt="풀이" loading="lazy">` : '<div class="no-img">풀이 이미지 없음 (하단 메모 참조)</div>'}
              </div>
            </div>

            <div class="card-section card-answer-section">
              <div class="section-label">
                <span class="label-badge badge-a">정답</span>
              </div>
              <div class="img-container answer-img-box">
                ${q.answerImg ? `<img src="${q.answerImg}" alt="정답" loading="lazy">` : '<div class="no-img">정답 이미지 없음</div>'}
              </div>
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

    this.selectModalArea.innerHTML = SKCT_AREAS
      .filter(a => a.id !== 'all')
      .map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`)
      .join('');

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

    if (this.currentArea && this.currentArea !== 'all') {
      this.selectModalArea.value = this.currentArea;
      this.updateModalSubtypeOptions();
      if (this.currentSubtype && this.currentSubtype !== 'all') {
        this.selectModalSubtype.value = this.currentSubtype;
      }
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
    if (!this.clipboardMgr.slots.question) {
      alert('문제 이미지를 최소 1장 붙여넣어 주세요! (Ctrl+V)');
      return;
    }

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

    document.getElementById('detailAreaBadge').innerHTML = `${area.icon} ${area.name} ${q.subtype ? '• ' + q.subtype : ''}`;
    document.getElementById('detailQuestionImg').src = q.questionImg || '';
    document.getElementById('detailSolutionImg').src = q.solutionImg || '';
    document.getElementById('detailAnswerImg').src = q.answerImg || '';
    document.getElementById('detailMemo').textContent = q.memo ? `💡 핵심 메모: ${q.memo}` : '';

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

    noteAreaSelect.innerHTML = SKCT_AREAS
      .filter(a => a.id !== 'all')
      .map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`)
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
    const existing = await dbService.getAllQuestions();
    const existingNotes = await dbService.getAllNotes();

    if (existing.length === 0 && existingNotes.length === 0) {
      await dbService.saveNote({
        id: 'note_sample_1',
        area: 'math',
        subtype: '거속시 (거리·속력·시간)',
        title: '거속시 마주보고 달릴 때 & 같은 방향 추월 공식',
        content: `1. **서로 마주보고 달릴 때**: 두 사람의 속력 합으로 계산\n   - 만나는 시간 = 전체 거리 / (속력A + 속력B)\n2. **같은 방향으로 추월할 때**: 두 사람의 속력 차로 계산\n   - 추월 시간 = 앞선 거리 / (빠른속력 - 느린속력)\n3. **열차와 터널 통과 문제**: 이동 거리 = (터널 길이 + 열차 길이)`,
        tips: '단위 일치 필수! (km/h를 m/s로 바꿀 때는 18분의 5 곱하기)',
        tags: ['거속시', '필수공식', '시간단축'],
        createdAt: Date.now() - 3600000 * 2
      });

      await dbService.saveNote({
        id: 'note_sample_2',
        area: 'data',
        subtype: '증가율 / 변화율 비교',
        title: '자료해석 분수 대소 비교 및 증가율 어림산 스킬',
        content: `1. **자릿수 줄이기**: 분모와 분자를 앞 2~3자리 유효숫자만 남기고 과감히 절삭\n2. **차이법 활용**: 두 분수의 분자 차와 분모 차로 만든 새로운 분수를 기준 분수와 비교\n3. **증가율 공식**: (금년 - 전년) / 전년\n   - 분모가 커지는 비율보다 분자가 커지는 비율이 크면 전체 분수값은 상승함`,
        tips: '모든 숫자를 정밀하게 나누려 하지 말고, 선지(보기) 간의 격차를 먼저 확인할 것!',
        tags: ['자료해석', '어림산', '분수비교'],
        createdAt: Date.now() - 3600000 * 5
      });

      await dbService.saveNote({
        id: 'note_sample_3',
        area: 'logic',
        subtype: '명제추리 (삼단논법, 대우명제)',
        title: '명제추리 삼단논법 공식과 벤다이어그램 판별',
        content: `1. **대우 명제**: P -> Q 이면 ~Q -> ~P (항상 참)\n2. **어떤(Some)의 규칙**: 어떤 A는 B이다 = 어떤 B는 A이다 (단순 역 성립)\n3. **모든(All)의 부정**: '어떤 ~이 아니다'\n4. **삼단논법 결론 도출**: 전제 1(P->Q) + 전제 2(Q->R) = 결론(P->R)`,
        tips: '부정 진술이 나오면 대우를 취해 긍정문으로 바꾼 뒤 화살표 연결망을 그릴 것!',
        tags: ['명제추리', '삼단논법', '언어추리'],
        createdAt: Date.now() - 3600000 * 8
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
