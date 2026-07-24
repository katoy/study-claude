import { isValidTodo } from '../models/todo.js';
import { STORAGE_KEY } from '../constants.js';

/**
 * ToDoリストを localStorage に保存する
 * @param {Array<object>} todos
 */
export function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

/**
 * ToDoリストを localStorage から読み込む
 * @returns {Array<object>} 防御的パース後のToDoリスト
 */
export function loadTodos() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(rawData);
  } catch (e) {
    console.warn('Failed to parse localStorage:', e);
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn('LocalStorage data is not an array');
    return [];
  }

  const validTodos = [];
  let hasInvalid = false;

  for (const todo of parsed) {
    if (isValidTodo(todo)) {
      validTodos.push(todo);
    } else {
      hasInvalid = true;
    }
  }

  if (hasInvalid) {
    console.warn('Some invalid todos were filtered out from localStorage');
  }

  return validTodos;
}
