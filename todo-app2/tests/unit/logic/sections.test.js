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

  describe('UT-SEC-003: JST タイムゾーン境界での正しい分類（バグ再現テスト）', () => {
    it('UTC 0時をまたぐ JST 日付で正しく分類されること', () => {
      // 重要: 現在時刻が JST 日付で「本日」と「明日」をまたぐ UTC 時刻の場合でも
      // JST ベースで正しく分類される必要がある

      // 現在: JST 2026-07-25 05:07:34 = UTC 2026-07-24 20:07:34
      vi.setSystemTime(new Date('2026-07-24T20:07:34Z'));

      const todos = [
        {
          id: 'task_today',
          title: 'JST 2026-07-25 中のタスク（本日中）',
          dueType: 'datetime',
          // JST 2026-07-25 23:00 = UTC 2026-07-25 14:00
          dueAt: '2026-07-25T14:00:00.000Z',
          completed: false,
        },
        {
          id: 'task_tomorrow',
          title: 'JST 2026-07-26 のタスク（明日）',
          dueType: 'datetime',
          // JST 2026-07-26 06:03 = UTC 2026-07-25 21:03
          dueAt: '2026-07-25T21:03:00.000Z',
          completed: false,
        },
        {
          id: 'task_later',
          title: 'JST 2026-07-27 のタスク（それ以外）',
          dueType: 'date',
          // JST 2026-07-27 23:59:59 = UTC 2026-07-27 14:59:59
          dueAt: '2026-07-27T14:59:59.000Z',
          completed: false,
        },
      ];

      const sections = buildSections(todos, new Date('2026-07-24T20:07:34Z'));

      // JST ベース計算で正しく分類されることを検証
      const todaySection = sections.find((s) => s.label === '本日中');
      const tomorrowSection = sections.find((s) => s.label === '明日まで');
      const otherSection = sections.find((s) => s.label === 'それ以外');

      expect(todaySection?.items.map((t) => t.id)).toEqual(['task_today']);
      expect(tomorrowSection?.items.map((t) => t.id)).toEqual(['task_tomorrow']);
      expect(otherSection?.items.map((t) => t.id)).toEqual(['task_later']);
    });

    it('JST 日付が切り替わる瞬間（UTC 15:00）での分類が正確であること', () => {
      // JST 00:00:00 = UTC 15:00:00 (前日)
      // 現在: JST 2026-07-25 00:00:00 = UTC 2026-07-24 15:00:00
      vi.setSystemTime(new Date('2026-07-24T15:00:00Z'));

      const todos = [
        {
          id: 'same_second',
          title: 'JST 2026-07-25 00:00:01 のタスク（本日中）',
          dueType: 'datetime',
          // JST 2026-07-25 00:00:01 = UTC 2026-07-24 15:00:01
          dueAt: '2026-07-24T15:00:01.000Z',
          completed: false,
        },
        {
          id: 'next_day',
          title: 'JST 2026-07-26 00:00:00 のタスク（明日）',
          dueType: 'datetime',
          // JST 2026-07-26 00:00:00 = UTC 2026-07-25 15:00:00
          dueAt: '2026-07-25T15:00:00.000Z',
          completed: false,
        },
      ];

      const sections = buildSections(todos, new Date('2026-07-24T15:00:00Z'));

      const todaySection = sections.find((s) => s.label === '本日中');
      const tomorrowSection = sections.find((s) => s.label === '明日まで');

      expect(todaySection?.items.map((t) => t.id)).toEqual(['same_second']);
      expect(tomorrowSection?.items.map((t) => t.id)).toEqual(['next_day']);
    });
  });

  describe('UT-SEC-004: セクション境界時刻での誤分類バグ検出', () => {
    it('「本日中」セクション内での時刻順序が一貫していること', () => {
      // 現在時刻: JST 2026-07-25 12:00:00 (UTC 2026-07-25 03:00:00)
      vi.setSystemTime(new Date('2026-07-25T03:00:00Z'));

      const todos = [
        {
          id: '1',
          title: 'タスク1 - 23:59',
          dueType: 'datetime',
          dueAt: '2026-07-25T14:59:59.000Z', // JST 2026-07-25 23:59:59（本日中）
          completed: false,
        },
        {
          id: '2',
          title: 'タスク2 - 14:59',
          dueType: 'datetime',
          dueAt: '2026-07-25T05:59:00.000Z', // JST 2026-07-25 14:59:00（本日中、より早い時刻）
          completed: false,
        },
      ];

      const sections = buildSections(todos);
      const todaySection = sections.find((s) => s.label === '本日中');

      // 両方が「本日中」に分類されることを確認
      expect(todaySection?.items.length).toBe(2);

      // セクション内にタスク1, 2がともに含まれることを確認
      expect(todaySection?.items.map((t) => t.id)).toContain('1');
      expect(todaySection?.items.map((t) => t.id)).toContain('2');
    });

    it('「本日中」から「明日まで」の境界での分類が正確であること', () => {
      // 現在時刻: JST 2026-07-25 00:00:00 (UTC 2026-07-24 15:00:00)
      vi.setSystemTime(new Date('2026-07-24T15:00:00Z'));

      const todos = [
        {
          id: 'x',
          title: 'タスクX - JST 25日中',
          dueType: 'datetime',
          dueAt: '2026-07-25T14:59:59.000Z', // JST 2026-07-25 23:59:59（本日中）
          completed: false,
        },
        {
          id: 'y',
          title: 'タスクY - JST 25日中（別の時刻）',
          dueType: 'datetime',
          dueAt: '2026-07-25T05:00:00.000Z', // JST 2026-07-25 14:00:00（本日中、より早い時刻）
          completed: false,
        },
        {
          id: 'z',
          title: 'タスクZ - JST 26日中',
          dueType: 'datetime',
          dueAt: '2026-07-26T14:59:59.000Z', // JST 2026-07-26 23:59:59（明日）
          completed: false,
        },
      ];

      const sections = buildSections(todos);
      const todaySection = sections.find((s) => s.label === '本日中');
      const tomorrowSection = sections.find((s) => s.label === '明日まで');
      const otherSection = sections.find((s) => s.label === 'それ以外');

      // セクション分類の確認
      expect(todaySection?.items.map((t) => t.id)).toEqual(['x', 'y']);
      expect(tomorrowSection?.items.map((t) => t.id)).toEqual(['z']);
      expect(otherSection).toBeUndefined(); // 「それ以外」のタスクはない
    });
  });
});

