import { createTodo, updateTodo } from './models/todo.js';
import { loadTodos, saveTodos } from './storage/todoRepository.js';
import { initMainView, renderMainView } from './ui/mainView.js';
import { initDetailView, openDetailModal } from './ui/detailView.js';
import { sortTodos } from './logic/sort.js';

let todos = [];
let activeTab = 'all';

function updateUI() {
  const sorted = sortTodos(todos);
  renderMainView(sorted, activeTab);
}

// アプリケーションの初期化
function init() {
  todos = loadTodos();

  const appContainer = document.getElementById('app');
  const detailDialog = document.getElementById('todo-detail-dialog');

  // メインビュー初期化
  initMainView(appContainer, {
    onEditRequest: (id) => {
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        detailDialog.setAttribute('data-editing-id', id);
        openDetailModal(todo);
      }
    },
    onToggleComplete: (id) => {
      todos = todos.map((t) => {
        if (t.id === id) {
          return updateTodo(t, { completed: !t.completed });
        }
        return t;
      });
      saveTodos(todos);
      updateUI();
    },
    onDeleteCompleted: () => {
      todos = todos.filter((t) => !t.completed);
      saveTodos(todos);
      updateUI();
    },
  });

  // 詳細ビュー初期化
  initDetailView(detailDialog, {
    onSave: (formData) => {
      const editingId = detailDialog.getAttribute('data-editing-id');

      if (editingId) {
        // 編集
        todos = todos.map((t) => {
          if (t.id === editingId) {
            return updateTodo(t, formData);
          }
          return t;
        });
      } else {
        // 新規
        const newTodo = createTodo(
          formData.title,
          formData.detail,
          formData.dueType,
          formData.dueAt
        );
        newTodo.detailHtml = formData.detailHtml; // リッチHTMLを保存
        todos.push(newTodo);
      }

      saveTodos(todos);
      updateUI();
    },
  });

  // 新規ボタンイベント
  const btnNew = document.getElementById('btn-new');
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      detailDialog.removeAttribute('data-editing-id');
      openDetailModal(null);
    });
  }

  // タブ切り替えの同期（mainView内のイベントデリゲーションからタブが切り替わったときに activeTab を同期する）
  const tabs = document.getElementById('tabs');
  if (tabs) {
    tabs.addEventListener('click', (e) => {
      const tabButton = e.target.closest('[data-tab]');
      if (tabButton) {
        activeTab = tabButton.getAttribute('data-tab');
      }
    });
  }

  // 初期表示
  updateUI();
}

// ドキュメント読み込み完了時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
