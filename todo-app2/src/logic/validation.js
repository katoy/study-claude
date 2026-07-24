import { MAX_TITLE_LENGTH, MAX_DETAIL_LENGTH } from '../constants.js';

/**
 * タイトル文字数検証（1〜100文字、トリム後）
 * @param {string} title
 * @returns {boolean}
 */
export function isValidTitle(title) {
  if (typeof title !== 'string') return false;
  const trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_TITLE_LENGTH;
}

/**
 * 詳細文字数検証（2000文字以内、プレーンテキスト換算）
 * @param {string} detailText
 * @returns {boolean}
 */
export function isValidDetail(detailText) {
  if (typeof detailText !== 'string') return false;
  return detailText.length <= MAX_DETAIL_LENGTH;
}

/**
 * Quillの末尾改行文字 (\n) を考慮したプレーンテキストの取得とクリーンアップ
 * @param {string} quillText
 * @returns {string}
 */
export function getCleanDetailText(quillText) {
  if (typeof quillText !== 'string') return '';
  if (quillText.endsWith('\n')) {
    return quillText.slice(0, -1);
  }
  return quillText;
}
