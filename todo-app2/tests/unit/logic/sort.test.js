import { describe, it, expect } from 'vitest';
import { sortTodos } from '../../../src/logic/sort.js';

describe('ソートロジック (sort.js)', () => {
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
