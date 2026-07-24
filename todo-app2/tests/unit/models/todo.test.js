import { describe, it, expect } from 'vitest';
import { createTodo, updateTodo, isValidTodo } from '../../../src/models/todo.js';

describe('ToDoモデル (todo.js)', () => {
  describe('createTodo', () => {
    it('UT-MOD-001: 新規ToDoオブジェクトを仕様通りに生成できること', () => {
      const title = '  買出しに行く  ';
      const detail = '牛乳';
      const dueType = 'none';
      const dueAt = null;

      const todo = createTodo(title, detail, dueType, dueAt);

      // id が crypto.randomUUID() 形式 (UUIDv4) であること
      expect(todo.id).toBeDefined();
      expect(todo.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // title が trim されていること
      expect(todo.title).toBe('買出しに行く');

      // details, dueType, dueAt, completed の検証
      expect(todo.detail).toBe('牛乳');
      expect(todo.dueType).toBe('none');
      expect(todo.dueAt).toBeNull();
      expect(todo.completed).toBe(false);

      // title が falsy な場合のデフォルト値設定の検証
      const emptyTitleTodo = createTodo(null, detail, dueType, dueAt);
      expect(emptyTitleTodo.title).toBe('');

      // createdAt と updatedAt が同一の有効な ISO 8601 UTC文字列であること
      expect(todo.createdAt).toBeDefined();
      expect(todo.updatedAt).toBeDefined();
      expect(todo.createdAt).toBe(todo.updatedAt);
      expect(() => new Date(todo.createdAt)).not.toThrow();
      expect(todo.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('updateTodo', () => {
    it('UT-MOD-002: 既存ToDoオブジェクトを正しく更新でき、createdAtなどが不変であること', async () => {
      const originalTodo = {
        id: 'existing-uuid-1234',
        title: '元のタイトル',
        detail: '元の詳細',
        dueType: 'none',
        dueAt: null,
        completed: false,
        createdAt: '2026-07-24T10:00:00.000Z',
        updatedAt: '2026-07-24T10:00:00.000Z',
      };

      const updates = {
        title: '本を買う',
        detail: '技術書',
      };

      // タイムスタンプに差分を出すためにわずかに待つか、擬似的に時間を進める
      // ここでは、updateTodo内部で新しい Date().toISOString() が使われるため、updatedAtが変化する
      const updatedTodo = updateTodo(originalTodo, updates);

      // id と createdAt が変更されないこと
      expect(updatedTodo.id).toBe(originalTodo.id);
      expect(updatedTodo.createdAt).toBe(originalTodo.createdAt);

      // 指定されたフィールドが更新されること
      expect(updatedTodo.title).toBe('本を買う');
      expect(updatedTodo.detail).toBe('技術書');

      // updatedAt が更新され、createdAt より後の時刻になっていること
      expect(updatedTodo.updatedAt).not.toBe(originalTodo.updatedAt);
      const createdTime = new Date(updatedTodo.createdAt).getTime();
      const updatedTime = new Date(updatedTodo.updatedAt).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(createdTime);
    });
  });

  describe('isValidTodo', () => {
    it('UT-MOD-003: 有効な全フィールドを持つToDoオブジェクトに対して true を返すこと', () => {
      const validTodo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '有効なタイトル',
        detail: '詳細情報',
        dueType: 'none',
        dueAt: null,
        completed: false,
        createdAt: '2026-07-24T10:00:00.000Z',
        updatedAt: '2026-07-24T10:00:00.000Z',
      };

      expect(isValidTodo(validTodo)).toBe(true);
    });

    it('UT-MOD-004: 異常値に対して false を返すこと', () => {
      // null や非オブジェクト
      expect(isValidTodo(null)).toBe(false);
      expect(isValidTodo(undefined)).toBe(false);
      expect(isValidTodo('not-an-object')).toBe(false);

      // id が欠損または非文字列
      expect(
        isValidTodo({
          title: 'A',
          dueType: 'none',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);
      expect(
        isValidTodo({
          id: 123,
          title: 'A',
          dueType: 'none',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);

      // title が欠損、非文字列、または空文字(trim後)
      expect(
        isValidTodo({
          id: 'a',
          dueType: 'none',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);
      expect(
        isValidTodo({
          id: 'a',
          title: 123,
          dueType: 'none',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);
      expect(
        isValidTodo({
          id: 'a',
          title: '   ',
          dueType: 'none',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);

      // dueType が 'none' | 'date' | 'datetime' 以外
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'invalid',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);

      // dueAt が 'none' なのに null 以外
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'none',
          dueAt: '2026-07-24T10:00:00.000Z',
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);

      // dueType が 'date' または 'datetime' なのに dueAt が非文字列・空文字
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'date',
          dueAt: null,
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'datetime',
          dueAt: '',
          completed: false,
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);

      // completed が非boolean
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'none',
          dueAt: null,
          completed: 'false',
          createdAt: '2026-07-24T10:00:00.000Z',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);

      // createdAt/updatedAt が欠損または不正な日付文字列
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'none',
          dueAt: null,
          completed: false,
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);
      expect(
        isValidTodo({
          id: 'a',
          title: 'A',
          dueType: 'none',
          dueAt: null,
          completed: false,
          createdAt: 'invalid-date',
          updatedAt: '2026-07-24T10:00:00.000Z',
        })
      ).toBe(false);
    });
  });
});
