import { describe, it, expect } from 'vitest';
import { isValidTitle, isValidDetail, getCleanDetailText } from '../../../src/logic/validation.js';

describe('バリデーションロジック (validation.js)', () => {
  describe('UT-VAL-001: タイトル文字数検証', () => {
    it('trim後 0文字 (空文字) は失敗すること', () => {
      expect(isValidTitle('')).toBe(false);
      expect(isValidTitle('   ')).toBe(false);
    });

    it('1文字は成功すること', () => {
      expect(isValidTitle('A')).toBe(true);
      expect(isValidTitle(' あ ')).toBe(true); // trim後1文字
    });

    it('100文字は成功すること', () => {
      const title100 = 'a'.repeat(100);
      expect(isValidTitle(title100)).toBe(true);
    });

    it('101文字は失敗すること', () => {
      const title101 = 'a'.repeat(101);
      expect(isValidTitle(title101)).toBe(false);
    });
  });

  describe('UT-VAL-002: 詳細文字数検証', () => {
    it('0文字 (空文字) は成功すること', () => {
      expect(isValidDetail('')).toBe(true);
    });

    it('1文字は成功すること', () => {
      expect(isValidDetail('A')).toBe(true);
    });

    it('2000文字は成功すること', () => {
      const detail2000 = 'a'.repeat(2000);
      expect(isValidDetail(detail2000)).toBe(true);
    });

    it('2001文字は失敗すること', () => {
      const detail2001 = 'a'.repeat(2001);
      expect(isValidDetail(detail2001)).toBe(false);
    });
  });

  describe('UT-VAL-003: Quill特有の末尾改行文字 (\n) 処理検証', () => {
    it('Quillエディタが空（"\\n"を返す）とき、クリーンアップ後の文字数が0文字となること', () => {
      const rawText = '\n';
      const cleanText = getCleanDetailText(rawText);
      expect(cleanText).toBe('');
      expect(cleanText.length).toBe(0);
      expect(isValidDetail(cleanText)).toBe(true);
    });

    it('ユーザーが「あ」と入力（"あ\\n"を返す）とき、クリーンアップ後の文字数が1文字となること', () => {
      const rawText = 'あ\n';
      const cleanText = getCleanDetailText(rawText);
      expect(cleanText).toBe('あ');
      expect(cleanText.length).toBe(1);
      expect(isValidDetail(cleanText)).toBe(true);
    });

    it('改行が複数ある場合、末尾の1つの改行文字だけをトリムすること', () => {
      const rawText = 'あ\nい\n';
      const cleanText = getCleanDetailText(rawText);
      expect(cleanText).toBe('あ\nい');
      expect(cleanText.length).toBe(3);
    });

    it('非文字列が渡された場合に安全に処理できること', () => {
      expect(isValidTitle(123)).toBe(false);
      expect(isValidTitle(null)).toBe(false);
      expect(isValidDetail(123)).toBe(false);
      expect(isValidDetail(null)).toBe(false);
      expect(getCleanDetailText(123)).toBe('');
      expect(getCleanDetailText(null)).toBe('');
    });
  });
});
