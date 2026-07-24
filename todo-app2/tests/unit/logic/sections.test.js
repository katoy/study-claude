import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildSections } from '../../../src/logic/sections.js';

describe('セクション分類ロジック (sections.js)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 基準現在時刻を 2026-07-24T10:00:00Z (JST 2026-07-24 19:00:00) に固定
    vi.setSystemTime(new Date('2026-07-24T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('UT-SEC-001: セクション判定分類', () => {
    it('各ToDoが締切日に応じて正しいセクションに分類されること', () => {
      const todos = [
        {
          id: '1',
          title: '本日中タスク(date)',
          dueType: 'date',
          dueAt: '2026-07-24T14:59:59.000Z', // JST 23:59:59
          completed: false,
        },
        {
          id: '2',
          title: '本日中タスク(datetime)',
          dueType: 'datetime',
          dueAt: '2026-07-24T14:59:00.000Z', // JST 23:59:00
          completed: false,
        },
        {
          id: '3',
          title: '明日までタスク',
          dueType: 'date',
          dueAt: '2026-07-25T14:59:59.000Z', // JST 7/25 23:59:59
          completed: false,
        },
        {
          id: '4',
          title: '昨日締切タスク',
          dueType: 'date',
          dueAt: '2026-07-23T14:59:59.000Z', // JST 7/23 23:59:59
          completed: false,
        },
        {
          id: '5',
          title: '明後日締切タスク',
          dueType: 'date',
          dueAt: '2026-07-26T14:59:59.000Z', // JST 7/26 23:59:59
          completed: false,
        },
        {
          id: '6',
          title: '締切なしタスク',
          dueType: 'none',
          dueAt: null,
          completed: false,
        },
      ];

      const sections = buildSections(todos, new Date());

      // 期待されるセクション: 「本日中」「明日まで」「それ以外」
      expect(sections.length).toBe(3);

      const todaySec = sections.find((s) => s.label === '本日中');
      const tomorrowSec = sections.find((s) => s.label === '明日まで');
      const otherSec = sections.find((s) => s.label === 'それ以外');

      expect(todaySec).toBeDefined();
      expect(tomorrowSec).toBeDefined();
      expect(otherSec).toBeDefined();

      // 本日中セクションの中身 (id: 1, 2)
      expect(todaySec.items.map((item) => item.id)).toContain('1');
      expect(todaySec.items.map((item) => item.id)).toContain('2');

      // 明日までセクションの中身 (id: 3)
      expect(tomorrowSec.items.map((item) => item.id)).toEqual(['3']);

      // それ以外セクションの中身 (id: 4, 5, 6)
      expect(otherSec.items.map((item) => item.id)).toContain('4');
      expect(otherSec.items.map((item) => item.id)).toContain('5');
      expect(otherSec.items.map((item) => item.id)).toContain('6');
    });
  });

  describe('UT-SEC-002: 空セクションの除外', () => {
    it('該当するToDoがないセクションは出力に含まれないこと', () => {
      const todos = [
        {
          id: '1',
          title: '本日中タスク',
          dueType: 'date',
          dueAt: '2026-07-24T14:59:59.000Z',
          completed: false,
        },
        {
          id: '2',
          title: '昨日締切タスク (それ以外)',
          dueType: 'date',
          dueAt: '2026-07-23T14:59:59.000Z',
          completed: false,
        },
      ];

      // 「明日まで」のタスクは存在しない
      const sections = buildSections(todos, new Date());

      // 「本日中」「それ以外」のみが含まれ、「明日まで」は含まれないこと
      expect(sections.length).toBe(2);
      expect(sections.map((s) => s.label)).toContain('本日中');
      expect(sections.map((s) => s.label)).toContain('それ以外');
      expect(sections.map((s) => s.label)).not.toContain('明日まで');
    });

    it('基準日時 now に日付文字列を渡した場合でも正しく分類されること', () => {
      const todos = [
        {
          id: '1',
          title: '本日中タスク',
          dueType: 'date',
          dueAt: '2026-07-24T14:59:59.000Z',
          completed: false,
        },
      ];
      const sections = buildSections(todos, '2026-07-24T10:00:00Z');
      expect(sections.length).toBe(1);
      expect(sections[0].label).toBe('本日中');
    });
  });
});
