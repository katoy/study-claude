import { describe, it, expect } from 'vitest';
import {
  convertToUtcForDate,
  convertToUtcForDateTime,
  formatDue,
  daysBetween,
} from '../../../src/date/dateFormat.js';

describe('日付・時刻フォーマット・変換 (dateFormat.js)', () => {
  describe('UT-DAT-001: 「日のみ」指定時のUTC変換', () => {
    it('JST日付文字列 "2026-07-24" が、JST 23:59:59に相当するUTC ISO文字列 "2026-07-24T14:59:59.000Z" に変換されること', () => {
      const jstDate = '2026-07-24';
      const expectedUtc = '2026-07-24T14:59:59.000Z';
      expect(convertToUtcForDate(jstDate)).toBe(expectedUtc);
    });
  });

  describe('UT-DAT-002: 「時まで」指定時のUTC変換', () => {
    it('JST日時文字列 "2026-07-24T09:00" が、JST 09:00に相当するUTC ISO文字列 "2026-07-24T00:00:00.000Z" に変換されること', () => {
      const jstDateTime = '2026-07-24T09:00';
      const expectedUtc = '2026-07-24T00:00:00.000Z';
      expect(convertToUtcForDateTime(jstDateTime)).toBe(expectedUtc);
    });
  });

  describe('UT-DAT-003: 曜日を含む日付表示用フォーマット', () => {
    it('dueType が "date" で "2026-07-24T14:59:59.000Z" (JST 2026-07-24 23:59:59) のとき、"2026-07-24 (金)" にフォーマットされること', () => {
      expect(formatDue('date', '2026-07-24T14:59:59.000Z')).toBe('2026-07-24 (金)');
    });

    it('dueType が "datetime" で "2026-07-24T00:00:00.000Z" (JST 2026-07-24 09:00) のとき、"2026-07-24 (金) 09:00" にフォーマットされること', () => {
      expect(formatDue('datetime', '2026-07-24T00:00:00.000Z')).toBe('2026-07-24 (金) 09:00');
    });

    it('dueType が "none" または dueAt が null のとき、"—" (ダッシュ) を返すこと', () => {
      expect(formatDue('none', null)).toBe('—');
      expect(formatDue('none', '2026-07-24T14:59:59.000Z')).toBe('—');
      expect(formatDue('date', null)).toBe('—');
    });

    it('dueAt が不正な日付文字列のとき、"—" を返すこと', () => {
      expect(formatDue('date', 'invalid-date')).toBe('—');
    });

    it('dueType が無効な値のとき、"—" を返すこと', () => {
      expect(formatDue('invalid-type', '2026-07-24T14:59:59.000Z')).toBe('—');
    });
  });

  describe('UT-DAT-004: 日付差の計算 (daysBetween)', () => {
    it('同日の場合は 0 を返すこと', () => {
      expect(daysBetween('2026-07-24T00:00:00.000Z', '2026-07-24T23:59:59.000Z')).toBe(0);
      expect(daysBetween('2026-07-24', '2026-07-24')).toBe(0);
    });

    it('翌日の場合は 1 を返すこと', () => {
      expect(daysBetween('2026-07-24T14:59:59.000Z', '2026-07-25T00:00:00.000Z')).toBe(1);
      expect(daysBetween('2026-07-24', '2026-07-25')).toBe(1);
    });

    it('昨日の場合は -1 を返すこと', () => {
      expect(daysBetween('2026-07-24T00:00:00.000Z', '2026-07-23T23:59:59.000Z')).toBe(-1);
      expect(daysBetween('2026-07-24', '2026-07-23')).toBe(-1);
    });

    it('タイムゾーン境界や夏時間などの微細なミリ秒差に左右されず、正しく計算されること', () => {
      // 23時間差や25時間差など、UTC正午基準での丸め処理を検証
      // JST 2026-07-24 00:00:00 (UTC 2026-07-23 15:00:00) と
      // JST 2026-07-25 23:59:59 (UTC 2026-07-25 14:59:59)
      expect(daysBetween('2026-07-23T15:00:00.000Z', '2026-07-25T14:59:59.000Z')).toBe(2);
    });
  });
});
