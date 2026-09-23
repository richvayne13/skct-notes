/**
 * SKCT Master Error Notes - Batch Upload Studio Manager
 * (문제/해설 한꺼번에 올리기 대량 일괄 등록 시스템)
 */

export class BatchUploadManager {
  constructor(app) {
    this.app = app;
    this.items = []; // [{ id, questionImg, solutionImg, area, subtype, mistakeReason, memo, tags }]
    this.pasteMode = 'questionOnly'; // 'questionOnly' | 'alternate'
    this.isSaving = false;
  }

  init() {
    this.modalEl = document.getElementById('batchModal');
    this.btnOpen = document.getElementById('btnOpenBatchModal');
    this.btnClose = document.getElementById('btnCloseBatchModal');
    this.btnCancel = document.getElementById('btnCancelBatchModal');

    this.selectGlobalArea = document.getElementById('batchGlobalArea');
    this.selectGlobalSubtype = document.getElementById('batchGlobalSubtype');
    this.inputGlobalTags = document.getElementById('batchGlobalTags');
    this.btnApplyGlobal = document.getElementById('btnBatchApplyGlobal');

    this.fileInputQuestions = document.getElementById('batchQuestionsFileInput');
    this.fileInputSolutions = document.getElementById('batchSolutionsFileInput');
    this.dropZone = document.getElementById('batchDropZone');
    this.pasteZone = document.getElementById('batchPasteZone');

    this.listContainer = document.getElementById('batchItemsContainer');
    this.listCountBadge = document.getElementById('batchListCount');
    this.btnAddEmptyRow = document.getElementById('btnBatchAddEmptyRow');
    this.btnClearAll = document.getElementById('btnBatchClearAll');

    this.progressWrapper = document.getElementById('batchProgressWrapper');
    this.progressBar = document.getElementById('batchProgressBar');
    this.progressText = document.getElementById('batchProgressText');
    this.progressPercent = document.getElementById('batchProgressPercent');

    this.btnSave = document.getElementById('btnSaveBatchQuestions');
    this.btnSaveText = document.getElementById('btnSaveBatchText');

    if (!this.modalEl) return;

    // 모달 열기/닫기
    if (this.btnOpen) this.btnOpen.addEventListener('click', () => this.openModal());
    if (this.btnClose) this.btnClose.addEventListener('click', () => this.closeModal());
    if (this.btnCancel) this.btnCancel.addEventListener('click', () => this.closeModal());

    // 상단 일괄 설정
    if (this.selectGlobalArea) {
      this.selectGlobalArea.addEventListener('change', () => this.updateGlobalSubtypes());
    }
    if (this.btnApplyGlobal) {
      this.btnApplyGlobal.addEventListener('click', () => this.applyGlobalSettingsToAll());
    }

    // 파일 일괄 업로드 (다중 선택)
    if (this.fileInputQuestions) {
      this.fileInputQuestions.addEventListener('change', (e) => this.handleBatchFiles(e.target.files, 'question'));
    }
    if (this.fileInputSolutions) {
      this.fileInputSolutions.addEventListener('change', (e) => this.handleBatchFiles(e.target.files, 'solution'));
    }

    // 드래그 앤 드롭
    if (this.dropZone) {
      this.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
      });
      this.dropZone.addEventListener('dragleave', () => {
        this.dropZone.classList.remove('drag-over');
      });
      this.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        if (e.dataTransfer?.files?.length > 0) {
          this.handleBatchFiles(e.dataTransfer.files, 'question');
        }
      });
    }

    // 고속 연속 캡처 존 이벤트
    if (this.pasteZone) {
      this.pasteZone.addEventListener('click', () => {
        this.pasteZone.classList.add('active');
        this.pasteZone.focus();
      });
      this.pasteZone.addEventListener('paste', (e) => {
        e.preventDefault();
        this.handlePasteInBatch(e);
      });

      // 라디오 변경
      const radios = this.modalEl.querySelectorAll('input[name="batchPasteMode"]');
      radios.forEach(r => {
        r.addEventListener('change', (e) => {
          this.pasteMode = e.target.value;
        });
      });
    }

    // 행 추가 / 전체 비우기
    if (this.btnAddEmptyRow) {
      this.btnAddEmptyRow.addEventListener('click', () => this.addEmptyRow());
    }
    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => {
        if (this.items.length === 0) return;
        if (confirm('대량 등록 목록의 모든 문항을 비우시겠습니까?')) {
          this.items = [];
          this.renderList();
        }
      });
    }

    // 저장 버튼
    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => this.saveAllQuestions());
    }
  }

  openModal() {
    this.updateGlobalAreaOptions();
    this.renderList();
    this.modalEl.classList.add('active');
    if (this.pasteZone) {
      setTimeout(() => this.pasteZone.focus(), 100);
    }
  }

  closeModal() {
    if (this.isSaving) return;
    this.modalEl.classList.remove('active');
  }

  updateGlobalAreaOptions() {
    const areas = window.SKCT_AREAS || [];
    this.selectGlobalArea.innerHTML = areas
      .map(a => `<option value="${a.id}">${a.icon} ${a.name}</option>`)
      .join('');
    this.updateGlobalSubtypes();
  }

  updateGlobalSubtypes() {
    const areaId = this.selectGlobalArea.value;
    const subtypes = window.getAllSubtypesForArea ? window.getAllSubtypesForArea(areaId) : [];
    if (subtypes.length === 0) {
      this.selectGlobalSubtype.innerHTML = '<option value="">선택 가능한 세부유형 없음</option>';
      this.selectGlobalSubtype.disabled = true;
    } else {
      this.selectGlobalSubtype.disabled = false;
      this.selectGlobalSubtype.innerHTML = `
        <option value="">세부유형 선택 (권장)</option>
        ${subtypes.map(s => `<option value="${s}">${s}</option>`).join('')}
      `;
    }
  }

  applyGlobalSettingsToAll() {
    const area = this.selectGlobalArea.value;
    const subtype = this.selectGlobalSubtype.value;
    const tags = this.inputGlobalTags.value.trim();

    if (this.items.length === 0) {
      this.showToast('적용할 문항이 없습니다. 먼저 문제를 추가해 주세요!', 'warning');
      return;
    }

    this.items.forEach(item => {
      item.area = area;
      item.subtype = subtype;
      if (tags) {
        item.tags = tags;
      }
    });

    this.renderList();
    this.showToast(`✨ ${this.items.length}개 전체 문항에 설정이 일괄 적용되었습니다!`, 'success');
  }

  // 다중 파일 업로드 처리 (자연 정렬로 1:1 매칭)
  async handleBatchFiles(fileList, targetSlot = 'question') {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter(f => 
      f.type.startsWith('image/') || f.name.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i)
    );

    if (files.length === 0) {
      this.showToast('이미지 파일(PNG, JPG, WebP 등)만 선택해 주세요.', 'warning');
      return;
    }

    // 파일 이름 자연 정렬 (Natural Sort: 1, 2, 10 순서 정렬)
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    this.showToast(`⏳ ${files.length}개 이미지를 읽어 대량 등록 목록을 구성하는 중입니다...`, 'info');

    const defaultArea = this.selectGlobalArea.value || 'math';
    const defaultSubtype = this.selectGlobalSubtype.value || '';
    const defaultTags = this.inputGlobalTags.value.trim();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await this.readFileAsDataUrl(file);

      if (targetSlot === 'question') {
        // 문제 이미지 다중 등록: 필요한 만큼 행 자동 생성
        if (i < this.items.length) {
          this.items[i].questionImg = dataUrl;
        } else {
          this.items.push({
            id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            questionImg: dataUrl,
            solutionImg: null,
            answerImg: null,
            area: defaultArea,
            subtype: defaultSubtype,
            mistakeReason: '',
            memo: '',
            tags: defaultTags
          });
        }
      } else if (targetSlot === 'solution') {
        // 해설 이미지 다중 등록: 1번부터 순차적으로 해설 슬롯에 1:1 매칭
        if (i < this.items.length) {
          this.items[i].solutionImg = dataUrl;
        } else {
          // 문제 행보다 해설이 더 많으면 새 행 생성
          this.items.push({
            id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            questionImg: null,
            solutionImg: dataUrl,
            answerImg: null,
            area: defaultArea,
            subtype: defaultSubtype,
            mistakeReason: '',
            memo: '',
            tags: defaultTags
          });
        }
      }
    }

    this.renderList();
    this.showToast(`🎉 ${files.length}개 ${targetSlot === 'question' ? '문제' : '해설'} 파일이 일괄 등록되었습니다!`, 'success');
  }

  // 연속 캡처 존에서 Ctrl+V 처리
  async handlePasteInBatch(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let imageFile = null;

    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        if (clipboardData.items[i].type?.indexOf('image') !== -1) {
          imageFile = clipboardData.items[i].getAsFile();
          if (imageFile) break;
        }
      }
    }

    if (!imageFile && clipboardData.files?.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        if (clipboardData.files[i].type?.startsWith('image/') || clipboardData.files[i].size > 0) {
          imageFile = clipboardData.files[i];
          break;
        }
      }
    }

    if (!imageFile) {
      this.showToast('클립보드에 복사된 이미지가 없습니다. 캡처(Win+Shift+S) 후 다시 붙여넣어 주세요.', 'warning');
      return;
    }

    const dataUrl = await this.readFileAsDataUrl(imageFile);
    const defaultArea = this.selectGlobalArea.value || 'math';
    const defaultSubtype = this.selectGlobalSubtype.value || '';
    const defaultTags = this.inputGlobalTags.value.trim();

    if (this.pasteMode === 'questionOnly') {
      // 문제만 연속 추가
      this.items.push({
        id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        questionImg: dataUrl,
        solutionImg: null,
        answerImg: null,
        area: defaultArea,
        subtype: defaultSubtype,
        mistakeReason: '',
        memo: '',
        tags: defaultTags
      });
      this.showToast(`✅ #${this.items.length} 문제 추가 완료! 다음 문제를 계속 캡처하세요.`, 'success');
    } else {
      // [문제 -> 풀이] 번갈아 추가
      const lastItem = this.items[this.items.length - 1];
      if (lastItem && lastItem.questionImg && !lastItem.solutionImg) {
        lastItem.solutionImg = dataUrl;
        this.showToast(`✅ #${this.items.length} 해설 등록 완료! 이제 다음 문제를 캡처하세요.`, 'success');
      } else {
        this.items.push({
          id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          questionImg: dataUrl,
          solutionImg: null,
          answerImg: null,
          area: defaultArea,
          subtype: defaultSubtype,
          mistakeReason: '',
          memo: '',
          tags: defaultTags
        });
        this.showToast(`✅ #${this.items.length} 문제 추가 완료! ➡️ 이제 해설을 캡처해서 붙여넣으세요.`, 'info');
      }
    }

    this.renderList();
  }

  addEmptyRow() {
    const defaultArea = this.selectGlobalArea.value || 'math';
    const defaultSubtype = this.selectGlobalSubtype.value || '';
    const defaultTags = this.inputGlobalTags.value.trim();

    this.items.push({
      id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      questionImg: null,
      solutionImg: null,
      answerImg: null,
      area: defaultArea,
      subtype: defaultSubtype,
      mistakeReason: '',
      memo: '',
      tags: defaultTags
    });
    this.renderList();
  }

  renderList() {
    const count = this.items.length;
    this.listCountBadge.textContent = count;
    this.btnSave.disabled = count === 0 || !this.items.some(it => it.questionImg);
    this.btnSaveText.textContent = `${count}개 문제 한꺼번에 저장하기`;

    if (count === 0) {
      this.listContainer.innerHTML = `
        <div class="batch-empty-placeholder">
          <div class="placeholder-icon">📦</div>
          <div class="placeholder-title">등록 대기 중인 문항이 없습니다.</div>
          <p>위의 <strong>[📷 문제 파일들 일괄 선택]</strong> 버튼을 누르거나, 오른쪽 영역을 클릭하고 <strong>Ctrl + V</strong>로 연속 캡처해 보세요!</p>
        </div>
      `;
      return;
    }

    const areas = window.SKCT_AREAS || [];

    this.listContainer.innerHTML = this.items.map((item, idx) => {
      const subtypes = window.getAllSubtypesForArea ? window.getAllSubtypesForArea(item.area) : [];
      return `
        <div class="batch-row" data-index="${idx}">
          <div class="batch-row-index">#${idx + 1}</div>

          <!-- 문제 슬롯 -->
          <div class="batch-thumb-slot slot-q" data-slot="question" data-index="${idx}" title="클릭하여 문제 이미지 변경 / 파일 선택">
            ${item.questionImg ? `
              <img src="${item.questionImg}" alt="문제 #${idx + 1}">
              <div class="batch-thumb-overlay">
                <button type="button" class="btn-thumb-clear" data-type="q" data-index="${idx}" title="이미지 삭제">&times;</button>
              </div>
            ` : `
              <div class="batch-thumb-placeholder">
                <span>📷 문제</span>
                <small>클릭/붙여넣기</small>
              </div>
            `}
            <input type="file" class="batch-row-file-input q-file-input" accept="image/*" style="display:none;">
          </div>

          <!-- 해설 슬롯 -->
          <div class="batch-thumb-slot slot-s" data-slot="solution" data-index="${idx}" title="클릭하여 해설 이미지 변경 / 파일 선택">
            ${item.solutionImg ? `
              <img src="${item.solutionImg}" alt="해설 #${idx + 1}">
              <div class="batch-thumb-overlay">
                <button type="button" class="btn-thumb-clear" data-type="s" data-index="${idx}" title="이미지 삭제">&times;</button>
              </div>
            ` : `
              <div class="batch-thumb-placeholder">
                <span>📝 해설</span>
                <small>클릭/붙여넣기</small>
              </div>
            `}
            <input type="file" class="batch-row-file-input s-file-input" accept="image/*" style="display:none;">
          </div>

          <!-- 메타데이터 설정 -->
          <div class="batch-meta-inputs">
            <div class="batch-meta-row">
              <select class="select-filter row-area-select" data-index="${idx}">
                ${areas.map(a => `<option value="${a.id}" ${a.id === item.area ? 'selected' : ''}>${a.icon} ${a.name}</option>`).join('')}
              </select>
              <select class="select-filter row-subtype-select" data-index="${idx}">
                <option value="">세부유형 선택</option>
                ${subtypes.map(s => `<option value="${s}" ${s === item.subtype ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="batch-meta-row">
              <input type="text" class="form-control row-memo-input" data-index="${idx}" placeholder="문제 메모 / 주의할 점" value="${this.escapeHtml(item.memo || '')}">
              <input type="text" class="form-control row-tags-input" data-index="${idx}" placeholder="태그 (쉼표 구분)" value="${this.escapeHtml(item.tags || '')}">
            </div>
          </div>

          <!-- 행 삭제 -->
          <button type="button" class="btn-remove-batch-row" data-index="${idx}" title="이 행 삭제">&times;</button>
        </div>
      `;
    }).join('');

    this.bindRowEvents();
  }

  bindRowEvents() {
    // 썸네일 클릭 시 파일 선택
    this.listContainer.querySelectorAll('.batch-thumb-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        if (e.target.closest('.btn-thumb-clear')) return;
        const fileInput = slot.querySelector('.batch-row-file-input');
        if (fileInput) fileInput.click();
      });
    });

    // 개별 파일 선택 리스너
    this.listContainer.querySelectorAll('.q-file-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = parseInt(e.target.closest('.batch-thumb-slot').dataset.index, 10);
        if (e.target.files && e.target.files[0]) {
          this.items[idx].questionImg = await this.readFileAsDataUrl(e.target.files[0]);
          this.renderList();
        }
      });
    });
    this.listContainer.querySelectorAll('.s-file-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = parseInt(e.target.closest('.batch-thumb-slot').dataset.index, 10);
        if (e.target.files && e.target.files[0]) {
          this.items[idx].solutionImg = await this.readFileAsDataUrl(e.target.files[0]);
          this.renderList();
        }
      });
    });

    // 썸네일 삭제 버튼
    this.listContainer.querySelectorAll('.btn-thumb-clear').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const type = btn.dataset.type;
        if (type === 'q') this.items[idx].questionImg = null;
        if (type === 's') this.items[idx].solutionImg = null;
        this.renderList();
      });
    });

    // 영역 셀렉트 변경 시 세부유형 옵션 갱신
    this.listContainer.querySelectorAll('.row-area-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.items[idx].area = e.target.value;
        const subSelect = this.listContainer.querySelector(`.row-subtype-select[data-index="${idx}"]`);
        if (subSelect) {
          const subtypes = window.getAllSubtypesForArea ? window.getAllSubtypesForArea(e.target.value) : [];
          subSelect.innerHTML = `<option value="">세부유형 선택</option>` + 
            subtypes.map(s => `<option value="${s}">${s}</option>`).join('');
          this.items[idx].subtype = '';
        }
      });
    });

    // 세부유형 셀렉트 변경
    this.listContainer.querySelectorAll('.row-subtype-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.items[idx].subtype = e.target.value;
      });
    });

    // 메모 / 태그 인풋
    this.listContainer.querySelectorAll('.row-memo-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.items[idx].memo = e.target.value;
      });
    });
    this.listContainer.querySelectorAll('.row-tags-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.items[idx].tags = e.target.value;
      });
    });

    // 행 삭제
    this.listContainer.querySelectorAll('.btn-remove-batch-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.items.splice(idx, 1);
        this.renderList();
      });
    });
  }

  // 전체 문항 IndexedDB 일괄 저장
  async saveAllQuestions() {
    const validItems = this.items.filter(it => it.questionImg);
    if (validItems.length === 0) {
      this.showToast('문제 이미지가 등록된 문항이 없습니다!', 'warning');
      return;
    }

    if (!confirm(`총 ${validItems.length}개의 문제를 오답노트에 한꺼번에 저장하시겠습니까?`)) {
      return;
    }

    this.isSaving = true;
    this.btnSave.disabled = true;
    this.progressWrapper.style.display = 'block';

    const dbService = window.dbService;
    let savedCount = 0;

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      const tags = (item.tags || '')
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(t => t.length > 0);

      const questionData = {
        id: 'q_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
        area: item.area || 'math',
        subtype: item.subtype || '',
        mistakeReason: item.mistakeReason || '',
        memo: item.memo || '',
        tags: tags,
        isResolved: false,
        questionImg: item.questionImg,
        solutionImg: item.solutionImg || null,
        answerImg: null,
        createdAt: Date.now() + i
      };

      try {
        await dbService.saveQuestion(questionData);
        savedCount++;
        const percent = Math.round((savedCount / validItems.length) * 100);
        this.progressBar.style.width = percent + '%';
        this.progressPercent.textContent = percent + '%';
        this.progressText.textContent = `${savedCount} / ${validItems.length} 문항 저장 중...`;
      } catch (err) {
        console.error('Batch save error at index', i, err);
      }
    }

    this.isSaving = false;
    this.progressWrapper.style.display = 'none';
    this.closeModal();

    this.items = [];
    this.showToast(`🎉 총 ${savedCount}개 문제가 오답노트에 성공적으로 일괄 등록되었습니다!`, 'success');

    if (this.app?.render) {
      await this.app.render();
    }
  }

  readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => {
        try {
          resolve(URL.createObjectURL(file));
        } catch (e) {
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  showToast(message, type = 'info') {
    if (this.app?.clipboardMgr?.showToast) {
      this.app.clipboardMgr.showToast(message, type);
    } else {
      alert(message);
    }
  }
}
