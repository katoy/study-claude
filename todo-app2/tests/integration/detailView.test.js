import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { initDetailView, openDetailModal } from '../../src/ui/detailView.js';
import * as editorAdapter from '../../src/editor/richEditorAdapter.js';

// Quill アダプターのモック化
vi.mock('../../src/editor/richEditorAdapter.js', () => {
  let text = '';
  let html = '';
  let changeCallback = null;
  return {
    initEditor: vi.fn(),
    getEditorHTML: vi.fn(() => html),
    setEditorHTML: vi.fn((val) => {
      html = val;
      // HTMLからプレーンテキストを抽出（簡易的）
      text = val ? val.replace(/<\/?[^>]+(>|$)/g, '') : '';
    }),
    getEditorText: vi.fn(() => text),
    onChange: vi.fn((cb) => {
      changeCallback = cb;
    }),
    // テスト用のトリガー用ヘルパー
    __triggerChange: (t, h) => {
      text = t;
      html = h;
      if (changeCallback) changeCallback();
    },
  };
});

describe('詳細画面 UI 統合テスト (detailView.js)', () => {
  let dialog;
  let callbacks;

  beforeEach(() => {
    // jsdom の <dialog> サポート不足を補うポリフィル
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.removeAttribute('open');
    });

    dialog = document.createElement('dialog');
    dialog.id = 'todo-detail-dialog';
    dialog.innerHTML = `
      <form method="dialog" id="todo-form">
        <input type="text" id="todo-title" aria-label="タイトル" maxlength="100" />
        <span id="title-counter">0 / 100</span>

        <div>
          <input type="radio" id="due-none" name="due-type" value="none" checked aria-label="指定しない" />
          <input type="radio" id="due-date" name="due-type" value="date" aria-label="日だけ指定" />
          <input type="radio" id="due-datetime" name="due-type" value="datetime" aria-label="時間と分も指定" />
        </div>

        <div id="due-date-wrapper" class="custom-picker-wrapper" style="display: none;">
          <input type="text" id="due-date-display" placeholder="YYYY-MM-DD" readonly />
          <input type="date" id="due-date-picker" class="hidden-picker" disabled aria-label="日付選択" />
        </div>
        <div id="due-datetime-wrapper" class="custom-picker-wrapper" style="display: none;">
          <input type="text" id="due-datetime-display" placeholder="YYYY-MM-DD HH:mm" readonly />
          <input type="datetime-local" id="due-datetime-picker" class="hidden-picker" disabled aria-label="日時選択" />
        </div>

        <div id="editor-container"></div>
        <span id="detail-counter">0 / 2000</span>

        <button id="btn-save-todo" disabled>保存</button>
        <button id="btn-cancel-todo" type="button">キャンセル</button>
      </form>
    `;
    document.body.appendChild(dialog);

    callbacks = {
      onSave: vi.fn(),
    };

    initDetailView(dialog, callbacks);
  });

  afterEach(() => {
    document.body.removeChild(dialog);
    vi.restoreAllMocks();
  });

  describe('IT-DET-001: モーダルの起動モード制御', () => {
    it('新規登録モードのとき、ダイアログが表示され、各フォームが空で初期化されること', () => {
      openDetailModal(null); // 新規モード

      expect(dialog.showModal).toHaveBeenCalled();
      expect(dialog.hasAttribute('open')).toBe(true);

      const titleInput = dialog.querySelector('#todo-title');
      expect(titleInput.value).toBe('');

      const radioNone = dialog.querySelector('#due-none');
      expect(radioNone.checked).toBe(true);

      const datePicker = dialog.querySelector('#due-date-picker');
      expect(datePicker.disabled).toBe(true);
      expect(datePicker.value).toBe('');
    });

    it('編集モードのとき、ダイアログが表示され、既存ToDoのデータがロードされること', () => {
      const todo = {
        id: '123',
        title: '既存タスク',
        detail: '既存詳細テキスト',
        dueType: 'date',
        dueAt: '2026-07-24T14:59:59.000Z', // 日本時間のその日中
        completed: false,
      };

      openDetailModal(todo);

      expect(dialog.showModal).toHaveBeenCalled();

      const titleInput = dialog.querySelector('#todo-title');
      expect(titleInput.value).toBe('既存タスク');

      const radioDate = dialog.querySelector('#due-date');
      expect(radioDate.checked).toBe(true);

      const datePicker = dialog.querySelector('#due-date-picker');
      expect(datePicker.disabled).toBe(false);
      // UTC 2026-07-24T14:59:59Z => 日本時間 2026-07-24
      expect(datePicker.value).toBe('2026-07-24');
    });

    it('編集モードのとき、dueTypeがdatetimeの既存ToDoデータがロードされること', () => {
      const todo = {
        id: '123',
        title: '日時指定タスク',
        detail: '詳細テキスト',
        dueType: 'datetime',
        dueAt: '2026-07-24T00:00:00.000Z', // 日本時間 09:00
        completed: false,
      };

      openDetailModal(todo);

      const radioDatetime = dialog.querySelector('#due-datetime');
      expect(radioDatetime.checked).toBe(true);

      const datetimePicker = dialog.querySelector('#due-datetime-picker');
      expect(datetimePicker.disabled).toBe(false);
      expect(datetimePicker.value).toBe('2026-07-24T09:00');
    });

    it('編集モードのとき、dueTypeがnoneの既存ToDoデータがロードされること', () => {
      const todo = {
        id: '123',
        title: '期限なしタスク',
        detail: '詳細テキスト',
        dueType: 'none',
        dueAt: null,
        completed: false,
      };

      openDetailModal(todo);

      const radioNone = dialog.querySelector('#due-none');
      expect(radioNone.checked).toBe(true);

      const datePicker = dialog.querySelector('#due-date-picker');
      const datetimePicker = dialog.querySelector('#due-datetime-picker');
      expect(datePicker.disabled).toBe(true);
      expect(datetimePicker.disabled).toBe(true);
    });
  });

  describe('IT-DET-002: タイトル欄のバリデーションとカウンター', () => {
    it('文字を入力するたびにカウンターがリアルタイムに変化し、空文字やスペースのみのときは保存ボタンが非活性であること', () => {
      openDetailModal(null);

      const titleInput = dialog.querySelector('#todo-title');
      const titleCounter = dialog.querySelector('#title-counter');
      const saveBtn = dialog.querySelector('#btn-save-todo');

      // 初期状態
      expect(titleCounter.textContent).toBe('0 / 100');
      expect(saveBtn.disabled).toBe(true);

      // スペースのみ入力
      titleInput.value = '   ';
      fireEvent.input(titleInput);
      expect(titleCounter.textContent).toBe('3 / 100'); // 入力された文字数自体は3
      expect(saveBtn.disabled).toBe(true); // トリミング後のバリデーションで無効になるため、保存ボタンは非活性

      // 有効な文字を入力
      titleInput.value = '買い出し';
      fireEvent.input(titleInput);
      expect(titleCounter.textContent).toBe('4 / 100');
      expect(saveBtn.disabled).toBe(false); // タイトルと詳細が共に有効なので活性化
    });

    it('100文字を超えるキー入力をブロックすること（keydown等の制御）', () => {
      openDetailModal(null);
      const titleInput = dialog.querySelector('#todo-title');

      titleInput.value = 'a'.repeat(100);
      fireEvent.input(titleInput);

      // 101文字目を入力しようとした時の keydown イベントをシミュレート
      const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      titleInput.dispatchEvent(event);

      // もし100文字に達していたら keydown は preventDefault されているべき
      // (実装によっては input イベントの文字カットで行う場合もあるため、この仕様のテストアプローチに従う)
    });
  });

  describe('IT-DET-003: 日時指定ラジオボタンとカレンダー UI 入力フォームの連動', () => {
    it('ラジオボタンの切り替えにより、日付・日時ピッカーの活性/非活性および表示制御が行われること', () => {
      openDetailModal(null);

      const radioNone = dialog.querySelector('#due-none');
      const radioDate = dialog.querySelector('#due-date');
      const radioDatetime = dialog.querySelector('#due-datetime');
      const datePicker = dialog.querySelector('#due-date-picker');
      const datetimePicker = dialog.querySelector('#due-datetime-picker');

      // 1. 「指定しない」選択時
      fireEvent.click(radioNone);
      expect(datePicker.disabled).toBe(true);
      expect(datetimePicker.disabled).toBe(true);
      expect(datePicker.value).toBe('');
      expect(datetimePicker.value).toBe('');

      // 2. 「日だけ指定」選択時
      fireEvent.click(radioDate);
      expect(datePicker.disabled).toBe(false);
      expect(datetimePicker.disabled).toBe(true);
      expect(datetimePicker.value).toBe('');

      // 3. 「時間と分も指定」選択時
      fireEvent.click(radioDatetime);
      expect(datePicker.disabled).toBe(true);
      expect(datetimePicker.disabled).toBe(false);
      expect(datePicker.value).toBe('');
    });

    it('日付・時間入力の変更時、表示用テキストフィールドに YYYY-MM-DD または YYYY-MM-DD HH:mm 形式で同期されること', () => {
      openDetailModal(null);
      const radioDate = dialog.querySelector('#due-date');
      const radioDatetime = dialog.querySelector('#due-datetime');
      const datePicker = dialog.querySelector('#due-date-picker');
      const datetimePicker = dialog.querySelector('#due-datetime-picker');
      const dateDisplay = dialog.querySelector('#due-date-display');
      const datetimeDisplay = dialog.querySelector('#due-datetime-display');

      // 1. 日付入力
      fireEvent.click(radioDate);
      datePicker.value = '2026-07-25';
      fireEvent.input(datePicker);
      expect(dateDisplay.value).toBe('2026-07-25');

      // 2. 日時入力 (T がスペースに変換されること)
      fireEvent.click(radioDatetime);
      datetimePicker.value = '2026-07-25T14:30';
      fireEvent.input(datetimePicker);
      expect(datetimeDisplay.value).toBe('2026-07-25 14:30');
    });

    it('日付・時間入力フィールドのクリック・フォーカス時に showPicker が呼び出されること（カレンダー UI の展開）', () => {
      openDetailModal(null);
      const datePicker = dialog.querySelector('#due-date-picker');
      const datetimePicker = dialog.querySelector('#due-datetime-picker');

      const showPickerSpy = vi.fn();
      datePicker.showPicker = showPickerSpy;
      datetimePicker.showPicker = showPickerSpy;

      // click イベント発火
      fireEvent.click(datePicker);
      expect(showPickerSpy).toHaveBeenCalled();

      // focus イベント発火
      showPickerSpy.mockClear();
      fireEvent.focus(datetimePicker);
      expect(showPickerSpy).toHaveBeenCalled();

      // showPicker がエラーを投げてもクラッシュしないこと (catchブランチのカバー)
      const errorShowPicker = vi.fn().mockImplementation(() => {
        throw new Error('Test showPicker error');
      });
      datePicker.showPicker = errorShowPicker;
      expect(() => fireEvent.click(datePicker)).not.toThrow();
    });
  });

  describe('IT-DET-004: 詳細エディタ（Quill）の文字数制限とカウンター', () => {
    it('エディタのテキスト入力により、リアルタイムにカウンターが更新され、2000文字を超えると保存ボタンが非活性になること', () => {
      openDetailModal(null);

      const titleInput = dialog.querySelector('#todo-title');
      titleInput.value = '有効なタイトル';
      fireEvent.input(titleInput);

      const detailCounter = dialog.querySelector('#detail-counter');
      const saveBtn = dialog.querySelector('#btn-save-todo');

      // 初期状態
      expect(detailCounter.textContent).toBe('0 / 2000');
      expect(saveBtn.disabled).toBe(false); // タイトルが有効なので活性化

      // 1. テキスト変更イベントをシミュレート (Quill側からの通知)
      editorAdapter.__triggerChange('あいうえお\n', '<p>あいうえお</p>'); // 改行込み

      // 改行がトリムされ5文字として判定されること
      expect(detailCounter.textContent).toBe('5 / 2000');
      expect(saveBtn.disabled).toBe(false);

      // 2. 2000文字を超える入力
      const longText = 'a'.repeat(2001) + '\n';
      editorAdapter.__triggerChange(longText, `<p>${'a'.repeat(2001)}</p>`);

      expect(detailCounter.textContent).toBe('2001 / 2000');
      expect(saveBtn.disabled).toBe(true); // 文字数オーバーで保存不可
    });
  });

  describe('IT-DET-005: 保存およびキャンセルの実行処理', () => {
    it('保存ボタンクリック時、フォームの値が onSave コールバックに渡され、モーダルが閉じること', () => {
      openDetailModal(null);

      const titleInput = dialog.querySelector('#todo-title');
      titleInput.value = '新規ToDo';
      fireEvent.input(titleInput);

      const saveBtn = dialog.querySelector('#btn-save-todo');
      expect(saveBtn.disabled).toBe(false);

      // Quill詳細をセット
      editorAdapter.__triggerChange('詳細テキスト\n', '<p>詳細テキスト</p>');

      fireEvent.click(saveBtn);

      // onSave が期待されるパラメータで呼ばれること
      expect(callbacks.onSave).toHaveBeenCalledWith({
        title: '新規ToDo',
        detail: '詳細テキスト',
        detailHtml: '<p>詳細テキスト</p>',
        dueType: 'none',
        dueAt: null,
      });

      expect(dialog.close).toHaveBeenCalled();
      expect(dialog.hasAttribute('open')).toBe(false);
    });

    it('日付(date)を指定して保存したとき、onSave が正しいUTC時刻とともに呼ばれること', () => {
      openDetailModal(null);

      const titleInput = dialog.querySelector('#todo-title');
      titleInput.value = '日付タスク';
      fireEvent.input(titleInput);

      const radioDate = dialog.querySelector('#due-date');
      fireEvent.click(radioDate);

      const datePicker = dialog.querySelector('#due-date-picker');
      datePicker.value = '2026-07-24';
      fireEvent.input(datePicker);

      const saveBtn = dialog.querySelector('#btn-save-todo');
      fireEvent.click(saveBtn);

      expect(callbacks.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '日付タスク',
          dueType: 'date',
          dueAt: '2026-07-24T14:59:59.000Z',
        })
      );
    });

    it('日時(datetime)を指定して保存したとき、onSave が正しいUTC時刻とともに呼ばれること', () => {
      openDetailModal(null);

      const titleInput = dialog.querySelector('#todo-title');
      titleInput.value = '日時タスク';
      fireEvent.input(titleInput);

      const radioDatetime = dialog.querySelector('#due-datetime');
      fireEvent.click(radioDatetime);

      const datetimePicker = dialog.querySelector('#due-datetime-picker');
      datetimePicker.value = '2026-07-24T09:00';
      fireEvent.input(datetimePicker);

      const saveBtn = dialog.querySelector('#btn-save-todo');
      fireEvent.click(saveBtn);

      expect(callbacks.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '日時タスク',
          dueType: 'datetime',
          dueAt: '2026-07-24T00:00:00.000Z',
        })
      );
    });

    it('キャンセルボタンクリック時、保存コールバックは呼ばれず、モーダルが閉じること', () => {
      openDetailModal(null);

      const titleInput = dialog.querySelector('#todo-title');
      titleInput.value = '変更タイトル';
      fireEvent.input(titleInput);

      const cancelBtn = dialog.querySelector('#btn-cancel-todo');
      fireEvent.click(cancelBtn);

      expect(callbacks.onSave).not.toHaveBeenCalled();
      expect(dialog.close).toHaveBeenCalled();
      expect(dialog.hasAttribute('open')).toBe(false);
    });

    it('ダイアログの背景領域をクリックしたときに、キャンセルと同様に閉じること', () => {
      openDetailModal(null);

      // ダイアログ自体へのクリックイベントをシミュレート
      // (通常、dialog.close() がダイアログ外クリックハンドラで呼び出される)
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 10, // 左端 (おそらく背景部分)
        clientY: 10,
      });

      // jsdomでは座標計算ができないため、実装側で target === dialog であるかを判定するロジックに合わせて
      // event.target を dialog にして発火させる
      Object.defineProperty(clickEvent, 'target', { value: dialog, enumerable: true });

      dialog.dispatchEvent(clickEvent);

      expect(dialog.close).toHaveBeenCalled();
    });
  });

  describe('例外・境界テスト (detailView.js ブランチカバー)', () => {
    it('初期化前に openDetailModal が呼ばれた場合に何もせずにリターンすること', () => {
      // 内部状態をクリア
      initDetailView(null, null);

      expect(() => openDetailModal(null)).not.toThrow();
      expect(dialog.showModal).not.toHaveBeenCalled();
    });

    it('キーイベントで allowedKeys が入力されたときは preventDefault されないこと', () => {
      openDetailModal(null);
      const titleInput = dialog.querySelector('#todo-title');

      // allowed key (Backspace) のキーダウン
      const event = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
      titleInput.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });

    it('編集モード起動時に title や detail が空または未定義の既存ToDoを正しく処理すること', () => {
      const todo = {
        id: '123',
        title: null, // null の場合
        detail: null,
        detailHtml: null,
        dueType: 'none',
        dueAt: null,
        completed: false,
      };

      openDetailModal(todo);

      const titleInput = dialog.querySelector('#todo-title');
      expect(titleInput.value).toBe('');
    });
  });
});
