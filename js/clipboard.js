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
        // 삭제 버튼 클릭이 아닐 때만 슬롯 활성화
        if (!e.target.closest('.btn-clear-slot')) {
          this.setActiveSlot(slotName);
        }
      });

      // 슬롯 자체 paste 이벤트
      slotEl.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePasteEvent(e, slotName);
      });

      // 버튼으로 클립보드 붙여넣기
      const pasteBtn = slotEl.querySelector('.btn-paste-clipboard');
      if (pasteBtn) {
        pasteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.pasteFromClipboardApi(slotName);
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

    // 컨테이너 전체에 전역 paste 리스너 부착 (포커스가 슬롯 밖이어도 현재 활성 슬롯에 붙여넣기)
    this.container.addEventListener('paste', (e) => {
      // 만약 텍스트 입력창(textarea, input)에 포커스되어 있다면 텍스트 붙여넣기를 방해하지 않음
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

  // 브라우저 paste 이벤트 핸들러
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

  // 이미지 파일 읽기 및 슬롯 할당
  processImageFile(file, slotName) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.setSlotImage(slotName, dataUrl);

      // 스마트 순차 이동
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
