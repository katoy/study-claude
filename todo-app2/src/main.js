import { createTodo, updateTodo } from './models/todo.js';
import { loadTodos, saveTodos } from './storage/todoRepository.js';
import { initMainView, renderMainView } from './ui/mainView.js';
import { initDetailView, openDetailModal } from './ui/detailView.js';
import { sortTodos } from './logic/sort.js';

// グローバル状態
let appState = {
  todos: [],
  activeTab: 'all',
};

const appElements = {
  app: null,
  detailDialog: null,
  btnNew: null,
  tabs: null,
};

/**
 * 状態を保存し UI を更新
 */
function persistAndRender() {
  saveTodos(appState.todos);
  renderUI();
}

/**
 * UI を再レンダリング
 */
function renderUI() {
  const sorted = sortTodos(appState.todos);
  renderMainView(sorted, appState.activeTab);
}

/**
 * DOM 要素への参照を確保
 */
function cacheElements() {
  appElements.app = document.getElementById('app');
  appElements.detailDialog = document.getElementById('todo-detail-dialog');
  appElements.btnNew = document.getElementById('btn-new');
  appElements.tabs = document.getElementById('tabs');
}

/**
 * 新規/編集フォームデータから ToDo を作成または更新
 * @param {object} formData
 * @returns {object}
 */
function createOrUpdateTodoFromFormData(formData, editingId = null) {
  if (editingId) {
    const todo = appState.todos.find((t) => t.id === editingId);
    return todo ? updateTodo(todo, formData) : null;
  }

  const newTodo = createTodo(
    formData.title,
    formData.detail,
    formData.dueType,
    formData.dueAt
  );
  newTodo.detailHtml = formData.detailHtml;
  return newTodo;
}

/**
 * メインビュー初期化時のコールバックを生成
 */
function createMainViewCallbacks() {
  return {
    onEditRequest: (id) => {
      const todo = appState.todos.find((t) => t.id === id);
      if (todo) {
        appElements.detailDialog.setAttribute('data-editing-id', id);
        openDetailModal(todo);
      }
    },
    onToggleComplete: (id) => {
      appState.todos = appState.todos.map((t) =>
        t.id === id ? updateTodo(t, { completed: !t.completed }) : t
      );
      persistAndRender();
    },
    onDeleteCompleted: () => {
      appState.todos = appState.todos.filter((t) => !t.completed);
      persistAndRender();
    },
  };
}

/**
 * 詳細ビュー初期化時のコールバックを生成
 */
function createDetailViewCallbacks() {
  return {
    onSave: (formData) => {
      const editingId = appElements.detailDialog.getAttribute('data-editing-id');
      const todo = createOrUpdateTodoFromFormData(formData, editingId);

      if (todo) {
        if (editingId) {
          appState.todos = appState.todos.map((t) => (t.id === editingId ? todo : t));
        } else {
          appState.todos.push(todo);
        }
        persistAndRender();
      }
    },
  };
}

/**
 * イベントリスナーを設定
 */
function attachEventListeners() {
  if (appElements.btnNew) {
    appElements.btnNew.addEventListener('click', () => {
      appElements.detailDialog.removeAttribute('data-editing-id');
      openDetailModal(null);
    });
  }

  if (appElements.tabs) {
    appElements.tabs.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab]');
      if (tabButton) {
        appState.activeTab = tabButton.getAttribute('data-tab');
      }
    });
  }
}

/**
 * アプリケーション初期化
 */
function init() {
  cacheElements();

  if (!appElements.app || !appElements.detailDialog) {
    console.error('Required DOM elements not found');
    return;
  }

  appState.todos = loadTodos();

  initMainView(appElements.app, createMainViewCallbacks());
  initDetailView(appElements.detailDialog, createDetailViewCallbacks());
  attachEventListeners();
  renderUI();
}

// ドキュメント読み込み完了時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
