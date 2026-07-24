import { describe, it, expect } from 'vitest';
import { sortTodos } from '../../../src/logic/sort.js';

describe('ソートロジック (sort.js)', () => {
  describe('UT-SOR-001: デフォルトソート（締切順 → 作成順）', () => {
    it('締切ありの複数項目で、締切順にソートされること', () => {
      const todos = [
        {
          id: '1',
          title: 'タスク1',
          dueType: 'datetime',
          dueAt: '2026-07-26T10:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
        {
          id: '2',
          title: 'タスク2',
          dueType: 'datetime',
          dueAt: '2026-07-25T10:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('2'); // 早い締切が先
      expect(sorted[1].id).toBe('1');
    });

    it('締切なしの複数項目で、作成順にソートされること', () => {
      const todos = [
        {
          id: '1',
          title: 'タスク1',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T10:00:00Z',
        },
        {
          id: '2',
          title: 'タスク2',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T09:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('2'); // 古い作成日時が先
      expect(sorted[1].id).toBe('1');
    });

    it('混在時の優先順序：締切ありの項目がグループの先頭に来ること', () => {
      const todos = [
        {
          id: '1',
          title: '締切なし古い',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T01:00:00Z',
        },
        {
          id: '2',
          title: '締切あり新しい',
          dueType: 'datetime',
          dueAt: '2026-07-24T18:00:00Z',
          createdAt: '2026-07-24T02:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('2'); // 締切ありが先
      expect(sorted[1].id).toBe('1');
    });
  });

  describe('UT-SOR-002: 同一条件下でのソート安定性', () => {
    it('同じ dueAt を持つ複数項目で、元の配列の順序が保たれること（安定ソート）', () => {
      const todos = [
        {
          id: '1',
          title: 'アイテム1',
          dueType: 'datetime',
          dueAt: '2026-07-24T09:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
        {
          id: '2',
          title: 'アイテム2',
          dueType: 'datetime',
          dueAt: '2026-07-24T09:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
        {
          id: '3',
          title: 'アイテム3',
          dueType: 'datetime',
          dueAt: '2026-07-24T09:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('1'); // 元の順序が保たれる
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('同じ createdAt を持つ複数の締切なしアイテムで、元の順序が保たれること', () => {
      const todos = [
        {
          id: '1',
          title: 'アイテム1',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T10:00:00Z',
        },
        {
          id: '2',
          title: 'アイテム2',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T10:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
    });
  });

  describe('UT-SRT-001: 同一セクション内でのソート基準', () => {
    it('締切あり同士の場合、締切時間が早い方が前にソートされること', () => {
      const todos = [
        {
          id: '1',
          title: '遅い締切',
          dueType: 'datetime',
          dueAt: '2026-07-24T09:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
        {
          id: '2',
          title: '早い締切',
          dueType: 'datetime',
          dueAt: '2026-07-24T05:00:00Z',
          createdAt: '2026-07-24T00:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
    });

    it('締切なし同士の場合、作成日時が古い方が前にソートされること', () => {
      const todos = [
        {
          id: '1',
          title: '新しい作成',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T02:00:00Z',
        },
        {
          id: '2',
          title: '古い作成',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T01:00:00Z',
        },
      ];

      const sorted = sortTodos(todos);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
    });

    it('締切ありと締切なしが混在する場合、締切ありの項目が常に前にソートされること', () => {
      // 1. 締切なしが先、締切ありの後
      const todos1 = [
        {
          id: '1',
          title: '締切なし古い',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T01:00:00Z',
        },
        {
          id: '2',
          title: '締切あり新しい',
          dueType: 'datetime',
          dueAt: '2026-07-24T18:00:00Z',
          createdAt: '2026-07-24T02:00:00Z',
        },
      ];

      const sorted1 = sortTodos(todos1);
      expect(sorted1[0].id).toBe('2');
      expect(sorted1[1].id).toBe('1');

      // 2. 締切あり先、締切なしの後 (逆パターンで別ブランチをカバー)
      const todos2 = [
        {
          id: '1',
          title: '締切あり新しい',
          dueType: 'datetime',
          dueAt: '2026-07-24T18:00:00Z',
          createdAt: '2026-07-24T02:00:00Z',
        },
        {
          id: '2',
          title: '締切なし古い',
          dueType: 'none',
          dueAt: null,
          createdAt: '2026-07-24T01:00:00Z',
        },
      ];

      const sorted2 = sortTodos(todos2);
      expect(sorted2[0].id).toBe('1');
      expect(sorted2[1].id).toBe('2');
    });
  });
});
