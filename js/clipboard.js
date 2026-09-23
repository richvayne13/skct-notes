/**
 * 클립보드(Ctrl+V) 이미지 붙여넣기 및 스마트 순차 슬롯 모듈
 */

export class ClipboardManager {
  constructor(options = {}) {
    this.slots = {
      question: null,
      solution: null,
      answer: null
    };

    this.activeSlot = 'question'; // 'question' | 'solution' | 'answer'
    this.autoAdvance = true; // 순차 자동 이동 모드
    this.onImageChange = options.onImageChange || (() => {});
  }

  // 슬롯 요소 바인딩
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

  loadImages({ question = null, solution = null, answer = null } = {}) {
    this.slots.question = question;
    this.slots.solution = solution;
    this.slots.answer = answer;
    this.activeSlot = 'question';
    this.updateSlotUI();
    this.onImageChange('load', null);
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
