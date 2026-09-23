/**
 * IndexedDB 기반 로컬 영구 저장소 모듈
 * 용량 한계가 있는 LocalStorage 대신 고화질 이미지를 수백 장 이상 저장 가능한 IndexedDB 사용
 */

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
        
        // 오답 문항 저장소
        if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
          const qStore = db.createObjectStore(STORE_QUESTIONS, { keyPath: 'id' });
          qStore.createIndex('area', 'area', { unique: false });
          qStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 줄글 메모 저장소
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

  // --- Questions (문제 오답노트) ---
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

  // --- Notes (줄글 메모 오답노트) ---
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

  // --- Export / Import ---
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

    // 일괄 저장
    for (const q of (data.questions || [])) {
      await this.saveQuestion(q);
    }
    for (const n of (data.notes || [])) {
      await this.saveNote(n);
    }
    return true;
  }
}

export const dbService = new StorageService();
