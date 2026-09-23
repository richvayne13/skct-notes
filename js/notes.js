/**
 * 줄글 메모 오답노트 및 핵심 전략 노트 모듈
 */

import { dbService } from './store.js';
import { getAreaById } from './categories.js';

export class NotesManager {
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

    // 이벤트 리스너 바인딩 (수정, 삭제, 태그 클릭 등)
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
            ${note.subtype ? `<span class="badge badge-sub">${note.subtype}</span>` : ''}
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
