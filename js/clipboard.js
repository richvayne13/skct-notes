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

    // 컨테이너 전체에 전역 paste 리스너 부착
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
        previewEl.removeAttribute('src');
        previewEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
        if (clearBtn) clearBtn.style.display = 'none';
      }
    });
  }

  // 브라우저 paste 이벤트 핸들러
  handlePasteEvent(e, targetSlot) {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let imageFile = null;

    // 1. clipboardData.files 먼저 확인 (파일 탐색기 파일 복사 대응)
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        if (clipboardData.files[i].type.startsWith('image/')) {
          imageFile = clipboardData.files[i];
          break;
        }
      }
    }

    // 2. clipboardData.items 확인 (스크린샷 클립보드 복사 대응)
    if (!imageFile && clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1 || (item.kind === 'file' && item.type.startsWith('image/'))) {
          imageFile = item.getAsFile();
          if (imageFile) break;
        }
      }
    }

    if (imageFile) {
      this.processImageFile(imageFile, targetSlot);
    } else {
      this.showToast('클립보드에 복사된 이미지가 없습니다. 캡처(Win+Shift+S) 후 다시 붙여넣어 주세요.', 'warning');
    }
  }

  // navigator.clipboard.read()를 통한 원클릭 붙여넣기
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

  // 이미지 파일 읽기 및 캔버스 압축/최적화 후 슬롯 할당 (엑박 및 용량 초과 원천 방지)
  processImageFile(file, slotName) {
    if (!file || (!file.type.startsWith('image/') && !file.name?.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i))) {
      this.showToast('이미지 파일(PNG, JPG, WebP 등)만 첨부할 수 있습니다.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;

      // 이미지 로드 검증 및 캔버스 압축
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1600;
        let width = img.width;
        let height = img.height;
        let finalDataUrl = rawDataUrl;

        // 해상도가 크거나 Base64 용량이 2MB 초과 시 캔버스 리사이징/압축
        if (width > MAX_WIDTH || rawDataUrl.length > 2 * 1024 * 1024) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.90);
        }

        this.setSlotImage(slotName, finalDataUrl);

        // 스마트 순차 이동
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
      };

      img.onerror = () => {
        this.showToast('⚠️ 이미지 데이터를 브라우저에서 읽을 수 없습니다.', 'error');
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      this.showToast('⚠️ 파일을 읽는 도중 오류가 발생했습니다.', 'error');
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
