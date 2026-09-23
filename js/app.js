/**
 * SKCT 오답노트 메인 애플리케이션 컨트롤러
 * (봉봉TV 170제 문제/해설 자동 로드 & 세부유형 매핑 & 드래그 순서변경 지원)
 */

import { getAllAreasWithAll, getAreaById, getAllSubtypesForArea, getCustomAreas, saveCustomAreas, resetCustomAreas } from './categories.js';
import { dbService } from './store.js';
import { ClipboardManager } from './clipboard.js';
import { NotesManager } from './notes.js';
import { PracticeTimer } from './timer.js';

class SKCTApp {
  constructor() {
    this.currentView = 'questions'; // 'questions' | 'notes'
    this.currentArea = 'all';
    this.currentSubtype = 'all';
    this.filterStatus = 'all'; // 'all' | 'need_review' | 'resolved'
    this.searchKeyword = '';
    this.globalBlur = true; // 기본적으로 풀이와 정답 블러 처리

    this.clipboardMgr = new ClipboardManager({
      onImageChange: (slot, dataUrl) => this.checkSaveButtonState()
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

    // 봉봉TV 170제 동기화 버튼
    const btnLoadBongbong = document.getElementById('btnLoadBongbongData');
    if (btnLoadBongbong) {
      btnLoadBongbong.addEventListener('click', async () => {
        await this.syncBongbongQuestions(true);
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
              <button class="subtype-item ${this.currentSubtype === 'all' && isSelected ? 'active' : ''}" data-subtype="all">
                • 전체 세부유형
              </button>
              ${area.subtypes.map(st => `
                <button class="subtype-item ${this.currentSubtype === st && isSelected ? 'active' : ''}" data-subtype="${this.escapeHtml(st)}">
                  ${this.escapeHtml(st)}
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
                <input type="text" class="subtype-input" value="${this.escapeHtml(st)}" placeholder="세부항목 이름" data-area-idx="${aIdx}" data-sub-idx="${sIdx}">
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
        this.manageAreasData[aIdx].subtypes[sIdx] = e.target.value;
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
        const newNum = (this.manageAreasData[aIdx].subtypes.length + 1);
        this.manageAreasData[aIdx].subtypes.push(`${newNum}. 새 세부유형`);
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

  saveManagedAreas() {
    this.manageAreasData.forEach(area => {
      if (!area.name.trim()) area.name = '시험 영역';
      area.subtypes = (area.subtypes || []).map(s => s.trim()).filter(s => s.length > 0);
    });

    saveCustomAreas(this.manageAreasData);
    this.manageAreasModal.classList.remove('active');
    this.clipboardMgr.showToast('💾 시험 영역 및 세부항목 설정이 저장되었습니다!', 'success');
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
          <p>상단의 <strong>[📚 봉봉TV 170제 동기화]</strong> 버튼을 누르거나, <strong>Ctrl + V</strong>로 새 문제를 등록해 보세요!</p>
          <button class="btn btn-primary btn-add-q-inline">
            <span class="btn-icon">📚</span> 봉봉TV 170문항 불러오기
          </button>
        </div>
      `;
      const btn = this.questionsGridEl.querySelector('.btn-add-q-inline');
      if (btn) btn.addEventListener('click', () => this.syncBongbongQuestions(true));
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
            ${qImg ? `<img src="${qImg}" alt="문제" loading="lazy">` : '<div class="no-img">문제 이미지 없음</div>'}
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
                ${sImg ? `<img src="${sImg}" alt="해설" loading="lazy">` : '<div class="no-img">해설 이미지 없음</div>'}
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

    const titleStr = q.title ? ` • ${this.escapeHtml(q.title)}` : '';
    document.getElementById('detailAreaBadge').innerHTML = `${area.icon} ${this.escapeHtml(area.name)} ${q.subtype ? '• ' + this.escapeHtml(q.subtype) : ''}${titleStr}`;
    document.getElementById('detailQuestionImg').src = q.questionImg || q.questionImage || '';
    document.getElementById('detailSolutionImg').src = q.solutionImg || q.solutionImage || '';
    document.getElementById('detailAnswerImg').src = q.answerImg || '';
    
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
    const SEED_VERSION_KEY = 'skct_seed_version_20260923_1to1_final_v6';
    const savedVersion = localStorage.getItem(SEED_VERSION_KEY);
    const seed = window.SEED_QUESTIONS || window.questionsSeedData || [];
    const existing = await dbService.getAllQuestions();
    const existingNotes = await dbService.getAllNotes();

    // 1. 봉봉TV 279제 1:1 정밀 매칭 시드 자동 적재 및 마이그레이션 (기존 불일치 캐시 클린 초기화)
    if (seed.length > 0 && (savedVersion !== 'v7_279_items_clean' || existing.length < 200)) {
      console.log('새 1:1 정밀 매칭 279문항 데이터베이스 자동 적재 중...');
      await dbService.clearQuestions();
      for (const q of seed) {
        await dbService.saveQuestion(q);
      }
      localStorage.setItem(SEED_VERSION_KEY, 'v7_279_items_clean');
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

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  window.skctApp = new SKCTApp();
});
