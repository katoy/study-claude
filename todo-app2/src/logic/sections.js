import { daysBetween } from '../date/dateFormat.js';

/**
 * 基準日時を ISO 8601 文字列に正規化
 * @param {Date|string} now
 * @returns {string}
 */
function normalizeNow(now) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

/**
 * ToDoを日数差で分類（0=本日、1=明日、その他=null）
 * @param {object} todo
 * @param {string} nowStr ISO 8601文字列
 * @returns {number|null}
 */
function categorizeByDueDays(todo, nowStr) {
  if (todo.dueType === 'none' || !todo.dueAt) {
    return null;
  }
  return daysBetween(nowStr, todo.dueAt);
}

/**
 * ToDoリストをセクション分類（本日中、明日まで、それ以外）する
 * @param {Array<object>} todos
 * @param {Date|string} [now] 基準日時
 * @returns {Array<object>} { label, items } の配列
 */
export function buildSections(todos, now = new Date()) {
  const nowStr = normalizeNow(now);
  const sections = {
    today: { label: '本日中', items: [] },
    tomorrow: { label: '明日まで', items: [] },
    other: { label: 'それ以外', items: [] },
  };

  for (const todo of todos) {
    const diffDays = categorizeByDueDays(todo, nowStr);

    if (diffDays === 0) {
      sections.today.items.push(todo);
    } else if (diffDays === 1) {
      sections.tomorrow.items.push(todo);
    } else {
      sections.other.items.push(todo);
    }
  }

  return [sections.today, sections.tomorrow, sections.other].filter(
    (section) => section.items.length > 0
  );
}
