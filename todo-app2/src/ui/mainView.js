import { buildSections } from '../logic/sections.js';
import { formatDue } from '../date/dateFormat.js';
import { sanitizeHtml } from '../sanitize/sanitizeHtml.js';

let currentTodos = [];
let viewContainer = null;

/**
 * メインビューの初期化
 * @param {HTMLElement} container
 * @param {object} callbacks { onEditRequest, onToggleComplete, onDeleteCompleted }
 */
export function initMainView(container, callbacks) {
  if (!container) {
    viewContainer = null;
    return;
  }
  viewContainer = container;

  // タブボタンのイベントリスナー
  const tabs = container.querySelector('#tabs');
  if (tabs) {
    tabs.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab]');
      if (tabButton) {
        const tab = tabButton.getAttribute('data-tab');
        renderMainView(currentTodos, tab);
      }
    });
  }

  // 完了済削除ボタンのイベントリスナー
  const deleteBtn = container.querySelector('#btn-delete-completed');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (window.confirm('完了済みのToDoを削除しますか？')) {
        callbacks.onDeleteCompleted();
      }
    });
  }

  // リストコンテナ内のイベントデリゲーション
  const listContainer = container.querySelector('#todo-list-container');
  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      // 完了トグルボタンクリック
      const toggleBtn = e.target.closest('[data-toggle-id]');
      if (toggleBtn) {
        const id = toggleBtn.getAttribute('data-toggle-id');
        callbacks.onToggleComplete(id);
        return;
      }

      // タイトルクリック (編集)
      const editEl = e.target.closest('[data-edit-id]');
      if (editEl) {
        const id = editEl.getAttribute('data-edit-id');
        callbacks.onEditRequest(id);
      }
    });
  }
}

/**
 * ToDoリストの描画
 * @param {Array<object>} todos
 * @param {string} activeTab 'all' | 'active' | 'completed'
 */
export function renderMainView(todos, activeTab = 'all') {
  currentTodos = todos;

  if (!viewContainer) return;

  // タブボタンのアクティブ状態の更新
  const tabButtons = viewContainer.querySelectorAll('[data-tab]');
  tabButtons.forEach((btn) => {
    if (btn.getAttribute('data-tab') === activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // フィルタリング
  let filteredTodos = todos;
  if (activeTab === 'active') {
    filteredTodos = todos.filter((t) => !t.completed);
  } else if (activeTab === 'completed') {
    filteredTodos = todos.filter((t) => t.completed);
  }

  // 完了済削除ボタンの disabled 制御
  const hasCompleted = todos.some((t) => t.completed);
  const deleteBtn = viewContainer.querySelector('#btn-delete-completed');
  if (deleteBtn) {
    deleteBtn.disabled = !hasCompleted;
  }

  // セクション分類
  const sections = buildSections(filteredTodos);

  // HTML 生成
  const listContainer = viewContainer.querySelector('#todo-list-container');
  if (listContainer) {
    let html = '';
    for (const sec of sections) {
      html += `<div class="todo-section">`;
      html += `<h3>${sec.label}</h3>`;
      html += `<ul class="todo-list">`;

      for (const todo of sec.items) {
        const titleStyle = todo.completed
          ? 'style="text-decoration: line-through; color: gray;"'
          : '';
        const btnText = todo.completed ? '未完了' : '完了';
        const formattedDate = formatDue(todo.dueType, todo.dueAt);

        // セキュリティのためタイトルをHTMLエスケープ
        const escapedTitle = (todo.title || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        html += `
          <li class="todo-item" data-id="${todo.id}">
            <span class="todo-title" data-edit-id="${todo.id}" ${titleStyle}>${escapedTitle}</span>
            <span class="todo-due">${formattedDate}</span>
            <button class="btn-toggle-complete" data-toggle-id="${todo.id}">${btnText}</button>
          </li>
        `;
      }

      html += `</ul></div>`;
    }

    // eslint-disable-next-line no-unsanitized/property
    listContainer.innerHTML = sanitizeHtml(html);
  }
}
