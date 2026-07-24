import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveTodos, loadTodos } from '../../../src/storage/todoRepository.js';

// isValidTodoをモック化または本物を使用
// テストコードの実行時点では本物の isValidTodo が常に false を返すため、
// 読み込みの堅牢性テストで isValidTodo が true または false になるようモック化する
vi.mock('../../../src/models/todo.js', () => {
  return {
    isValidTodo: vi.fn((todo) => {
      // 簡易的なスタブ: タイトルが存在し "invalid" が含まれなければ有効と判定する
      if (!todo || typeof todo !== 'object') return false;
      if (todo.title && todo.title.includes('invalid')) return false;
      return true;
    }),
  };
});

describe('リポジトリ (todoRepository.js)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('UT-REP-001: 正常な保存と読み込み', () => {
    it('2件のToDo配列を保存し、再度読み込むと正しく復元されること', () => {
      const originalTodos = [
        {
          id: '1',
          title: 'タスク1',
          completed: false,
          createdAt: '2026-07-24T10:00:00Z',
          updatedAt: '2026-07-24T10:00:00Z',
        },
        {
          id: '2',
          title: 'タスク2',
          completed: true,
          createdAt: '2026-07-24T11:00:00Z',
          updatedAt: '2026-07-24T12:00:00Z',
        },
      ];

      saveTodos(originalTodos);
      const loaded = loadTodos();

      expect(loaded).toEqual(originalTodos);
      expect(loaded.length).toBe(2);
    });

    it('localStorage が空のとき、空の配列を返すこと', () => {
      const loaded = loadTodos();
      expect(loaded).toEqual([]);
    });
  });

  describe('UT-REP-002: 不正データへの防御（堅牢性）', () => {
    it('localStorageの値が不正なJSON文字列のとき、クラッシュせず空配列を返すこと', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      localStorage.setItem('todoapp.todos.v1', '{invalid-json...');
      const loaded = loadTodos();

      expect(loaded).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('破損した（isValidTodoでfalseになる）ToDoオブジェクトが含まれるとき、それを除外して正常値のみを返すこと', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mixedTodos = [
        { id: '1', title: '正常タスク', completed: false },
        { id: '2', title: 'invalidなタスク', completed: false }, // モック定義により false になる
      ];

      localStorage.setItem('todoapp.todos.v1', JSON.stringify(mixedTodos));
      const loaded = loadTodos();

      // id: 2 のタスクが除外され、正常なものだけになっていること
      expect(loaded).toEqual([{ id: '1', title: '正常タスク', completed: false }]);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('localStorage.setItemがエラーを投げる場合、警告を表示すること', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });

      saveTodos([]);

      expect(consoleWarnSpy).toHaveBeenCalled();
      Storage.prototype.setItem = originalSetItem;
    });

    it('localStorageの値が配列ではないとき、警告を表示し空配列を返すこと', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      localStorage.setItem('todoapp.todos.v1', '{"not": "an-array"}');
      const loaded = loadTodos();

      expect(loaded).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
