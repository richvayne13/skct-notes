/**
 * SKCT 1분 실전 모의 타이머 모듈
 */

export class PracticeTimer {
  constructor(displayEl, onExpire) {
    this.displayEl = displayEl;
    this.onExpire = onExpire;
    this.totalSeconds = 60; // 기본 1분 (60초)
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
    
    // 경고 스타일
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
