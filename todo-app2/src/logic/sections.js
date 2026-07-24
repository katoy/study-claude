import { daysBetween } from '../date/dateFormat.js';

/**
 * ToDoリストをセクション分類（本日中、明日まで、それ以外）する
 * @param {Array<object>} todos
 * @param {Date|string} [now] 基準日時
 * @returns {Array<object>} { label, items } の配列
 */
export function buildSections(todos, now = new Date()) {
  const todayItems = [];
  const tomorrowItems = [];
  const otherItems = [];

  const nowStr = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  for (const todo of todos) {
    if (todo.dueType === 'none' || !todo.dueAt) {
      otherItems.push(todo);
      continue;
    }

    const diffDays = daysBetween(nowStr, todo.dueAt);

    if (diffDays === 0) {
      todayItems.push(todo);
    } else if (diffDays === 1) {
      tomorrowItems.push(todo);
    } else {
      otherItems.push(todo);
    }
  }

  const sections = [];
  if (todayItems.length > 0) {
    sections.push({ label: '本日中', items: todayItems });
  }
  if (tomorrowItems.length > 0) {
    sections.push({ label: '明日まで', items: tomorrowItems });
  }
  if (otherItems.length > 0) {
    sections.push({ label: 'それ以外', items: otherItems });
  }

  return sections;
}
