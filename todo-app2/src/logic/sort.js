/**
 * ToDoリストを仕様に沿ってソートする
 * @param {Array<object>} todos
 * @returns {Array<object>} ソート済みのコピー
 */
export function sortTodos(todos) {
  return [...todos].sort((a, b) => {
    const hasDueA = a.dueType !== 'none' && a.dueAt !== null;
    const hasDueB = b.dueType !== 'none' && b.dueAt !== null;

    if (hasDueA && !hasDueB) {
      return -1;
    }
    if (!hasDueA && hasDueB) {
      return 1;
    }

    if (hasDueA && hasDueB) {
      const dueTimeA = new Date(a.dueAt).getTime();
      const dueTimeB = new Date(b.dueAt).getTime();
      if (dueTimeA !== dueTimeB) {
        return dueTimeA - dueTimeB;
      }
    }

    const createTimeA = new Date(a.createdAt).getTime();
    const createTimeB = new Date(b.createdAt).getTime();
    return createTimeA - createTimeB;
  });
}
