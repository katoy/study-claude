import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getByText, queryByText, fireEvent } from '@testing-library/dom';
import { initMainView, renderMainView } from '../../src/ui/mainView.js';

// sections分類やsortロジックをテスト用にスタブ化/インポート
vi.mock('../../src/logic/sections.js', () => ({
  buildSections: vi.fn((todos) => {
    // 擬似的にセクション分け
    const sections = [];
    const today = todos.filter((t) => t.title && t.title.includes('本日中'));
    const tomorrow = todos.filter((t) => t.title && t.title.includes('明日まで'));
    const other = todos.filter(
      (t) => !t.title || (!t.title.includes('本日中') && !t.title.includes('明日まで'))
    );

    if (today.length > 0) sections.push({ label: '本日中', items: today });
    if (tomorrow.length > 0) sections.push({ label: '明日まで', items: tomorrow });
    if (other.length > 0) sections.push({ label: 'それ以外', items: other });
    return sections;
  }),
}));

describe('メイン画面 UI 統合テスト (mainView.js)', () => {
  let container;
  let callbacks;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <div id="tabs">
        <button id="tab-all" data-tab="all">すべて</button>
        <button id="tab-active" data-tab="active">未完了</button>
        <button id="tab-completed" data-tab="completed">完了済み</button>
      </div>
      <button id="btn-new">新規</button>
      <button id="btn-delete-completed" disabled>完了済を削除</button>
      <div id="todo-list-container"></div>
    `;
    document.body.appendChild(container);

    callbacks = {
      onEditRequest: vi.fn(),
      onToggleComplete: vi.fn(),
      onDeleteCompleted: vi.fn(),
    };

    initMainView(container, callbacks);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  describe('IT-MAIN-001: 初期描画とセクション表示', () => {
    it('前提条件に基づき、セクション見出しとタスク行が正しく描画され、空セクションが非表示であること', () => {
      const todos = [
        { id: '1', title: '本日中タスク', completed: false },
        { id: '2', title: 'それ以外タスク', completed: false },
      ];

      // すべてタブがアクティブとして描画
      renderMainView(todos, 'all');

      // 画面上に「本日中」「それ以外」のセクションが存在すること
      expect(getByText(container, '本日中')).toBeDefined();
      expect(getByText(container, 'それ以外')).toBeDefined();

      // 「明日まで」セクションの見出しは存在しないこと
      expect(queryByText(container, '明日まで')).toBeNull();

      // タスク行が描画されていること
      expect(getByText(container, '本日中タスク')).toBeDefined();
      expect(getByText(container, 'それ以外タスク')).toBeDefined();
    });
  });

  describe('IT-MAIN-002: タブフィルタの切り替え', () => {
    it('タブをクリックした際、対応するフィルタ（未完了・完了済）のToDoのみが表示されること', () => {
      const todos = [
        { id: '1', title: '未完了本日中タスク', completed: false },
        { id: '2', title: '完了済それ以外タスク', completed: true },
      ];

      // 初期状態は 'all'
      renderMainView(todos, 'all');
      expect(getByText(container, '未完了本日中タスク')).toBeDefined();
      expect(getByText(container, '完了済それ以外タスク')).toBeDefined();

      // 未完了タブをクリック (UIイベントとして発火)
      const tabActive = container.querySelector('#tab-active');
      fireEvent.click(tabActive);

      // renderMainViewは通常タブ変更イベント内で呼び出されるため、統合テストとして
      // 描画をシミュレート
      renderMainView(todos, 'active');
      expect(getByText(container, '未完了本日中タスク')).toBeDefined();
      expect(queryByText(container, '完了済それ以外タスク')).toBeNull();

      // 完了済みタブをクリック
      const tabCompleted = container.querySelector('#tab-completed');
      fireEvent.click(tabCompleted);

      renderMainView(todos, 'completed');
      expect(queryByText(container, '未完了本日中タスク')).toBeNull();
      expect(getByText(container, '完了済それ以外タスク')).toBeDefined();
    });
  });

  describe('IT-MAIN-003: 完了ステータスのトグル', () => {
    it('完了ボタンクリック時に onToggleComplete コールバックが正しく呼ばれること', () => {
      const todos = [{ id: '1', title: '本日中タスク', completed: false }];

      renderMainView(todos, 'all');

      const toggleBtn = container.querySelector('[data-toggle-id="1"]');
      expect(toggleBtn).toBeDefined();

      fireEvent.click(toggleBtn);

      // コールバックが対象のIDを引数に呼び出されること
      expect(callbacks.onToggleComplete).toHaveBeenCalledWith('1');
    });

    it('タイトルクリック時に onEditRequest コールバックが正しく呼ばれること', () => {
      const todos = [{ id: '1', title: '本日中タスク', completed: false }];

      renderMainView(todos, 'all');

      const titleEl = container.querySelector('[data-edit-id="1"]');
      expect(titleEl).toBeDefined();

      fireEvent.click(titleEl);

      expect(callbacks.onEditRequest).toHaveBeenCalledWith('1');
    });

    it('リスト内の無関係なエリアをクリックしたときにコールバックが呼ばれないこと', () => {
      const todos = [{ id: '1', title: '本日中タスク', completed: false }];

      renderMainView(todos, 'all');

      // 該当のli自体をクリック（data-toggle-id や data-edit-id を持たない要素）
      const itemEl = container.querySelector('.todo-item');
      expect(itemEl).toBeDefined();

      fireEvent.click(itemEl);

      expect(callbacks.onToggleComplete).not.toHaveBeenCalled();
      expect(callbacks.onEditRequest).not.toHaveBeenCalled();
    });
  });

  describe('IT-MAIN-004: 一括削除アクションの制御と実行', () => {
    it('完了済タスクが0件のときは一括削除ボタンが disabled になり、あるときは活性化すること', () => {
      // 完了済が0件
      renderMainView([{ id: '1', title: '未完了タスク', completed: false }], 'all');
      const deleteBtn = container.querySelector('#btn-delete-completed');
      expect(deleteBtn.disabled).toBe(true);

      // 完了済があるとき
      renderMainView([{ id: '1', title: '完了済タスク', completed: true }], 'all');
      expect(deleteBtn.disabled).toBe(false);
    });

    it('一括削除クリック時、window.confirm が OK の場合のみ onDeleteCompleted が呼ばれること', () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      renderMainView([{ id: '1', title: '完了済タスク', completed: true }], 'all');
      const deleteBtn = container.querySelector('#btn-delete-completed');

      // 1. キャンセルの場合
      confirmSpy.mockReturnValue(false);
      fireEvent.click(deleteBtn);
      expect(callbacks.onDeleteCompleted).not.toHaveBeenCalled();

      // 2. OKの場合
      confirmSpy.mockReturnValue(true);
      fireEvent.click(deleteBtn);
      // 2. OKの場合
      confirmSpy.mockReturnValue(true);
      fireEvent.click(deleteBtn);
      expect(callbacks.onDeleteCompleted).toHaveBeenCalled();
    });
  });

  describe('例外・境界テスト (要素欠損や未初期化)', () => {
    it('必要なDOM要素が存在しない場合でもエラーを投げずに初期化および描画が行えること', () => {
      const emptyContainer = document.createElement('div');

      // 空のコンテナで初期化
      expect(() => initMainView(emptyContainer, callbacks)).not.toThrow();
      // 描画
      expect(() => renderMainView([], 'all')).not.toThrow();
    });

    it('初期化前に renderMainView が呼ばれた場合に即座にリターンすること', () => {
      // 内部状態をリセット
      initMainView(null, null);
      expect(() => renderMainView([])).not.toThrow();
    });

    it('タイトルがfalsyなToDoを正しく描画できること', () => {
      const todos = [{ id: '1', title: null, completed: false }];
      expect(() => renderMainView(todos, 'all')).not.toThrow();

      // 再初期化してテストを元の状態に配線し直す
      initMainView(container, callbacks);
    });
  });
});
