/**
 * 新規ToDoオブジェクト生成
 * @param {string} title
 * @param {string} detail
 * @param {string} dueType
 * @param {string|null} dueAt
 * @returns {object}
 */
export function createTodo(title, detail = '', dueType = 'none', dueAt = null) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: (title || '').trim(),
    detail: detail,
    detailHtml: detail, // HTMLエディタ用プレースホルダー
    dueType,
    dueAt,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 既存ToDoオブジェクト更新
 * @param {object} todo
 * @param {object} updates
 * @returns {object}
 */
export function updateTodo(todo, updates) {
  const now = new Date().toISOString();
  return {
    ...todo,
    ...updates,
    id: todo.id, // idは不変
    createdAt: todo.createdAt, // createdAtは不変
    updatedAt: now,
  };
}

/**
 * 防御的バリデータ
 * @param {any} todo
 * @returns {boolean}
 */
export function isValidTodo(todo) {
  if (!todo || typeof todo !== 'object') {
    return false;
  }

  // 必須キーの型チェック
  if (typeof todo.id !== 'string' || todo.id === '') {
    return false;
  }
  if (typeof todo.title !== 'string' || todo.title.trim() === '') {
    return false;
  }
  if (typeof todo.completed !== 'boolean') {
    return false;
  }

  // dueType
  if (!['none', 'date', 'datetime'].includes(todo.dueType)) {
    return false;
  }

  // dueAt
  if (todo.dueType === 'none') {
    if (todo.dueAt !== null) {
      return false;
    }
  } else {
    if (typeof todo.dueAt !== 'string' || todo.dueAt === '') {
      return false;
    }
  }

  // createdAt / updatedAt
  if (typeof todo.createdAt !== 'string' || typeof todo.updatedAt !== 'string') {
    return false;
  }

  // 日付の有効性チェック
  const createdDate = new Date(todo.createdAt);
  const updatedDate = new Date(todo.updatedAt);
  if (isNaN(createdDate.getTime()) || isNaN(updatedDate.getTime())) {
    return false;
  }

  return true;
}
