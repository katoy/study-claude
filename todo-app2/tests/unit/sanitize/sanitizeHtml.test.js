import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../../../src/sanitize/sanitizeHtml.js';

describe('サニタイズロジック (sanitizeHtml.js)', () => {
  describe('UT-SAN-001: 許可タグの維持', () => {
    it('太字、斜体、下線、取り消し線、段落、リスト等のリッチテキストタグがそのまま維持されること', () => {
      const input =
        '<p><strong>太字</strong>, <em>斜体</em>, <u>下線</u>, <s>取り消し線</s></p><ol><li>リスト</li></ol>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).toBe(input);
    });
  });

  describe('UT-SAN-002: 危険スクリプトの除去', () => {
    it('scriptタグ、onerror属性、javascript:スキームのaタグが適切に除去または無効化されること', () => {
      const input =
        '<script>alert(1)</script><img src="x" onerror="alert(2)"> <a href="javascript:alert(3)">リンク</a>';
      const sanitized = sanitizeHtml(input);

      // script タグがないこと
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert(1)');

      // onerror 属性がないこと
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert(2)');

      // javascript: スキームが無効化されていること
      expect(sanitized).not.toContain('href="javascript:');
    });

    it('非文字列が渡された場合、空文字を返すこと', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(123)).toBe('');
    });
  });
});
