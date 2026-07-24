import DOMPurify from 'dompurify';

/**
 * HTML文字列のサニタイズ処理を行う（DOMPurifyを使用）
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html);
}
