import { getCleanDetailText, isValidTitle, isValidDetail } from '../logic/validation.js';
import { convertToUtcForDate, convertToUtcForDateTime } from '../date/dateFormat.js';
import { initCharCounter } from './charCounter.js';
import { MAX_TITLE_LENGTH, MAX_DETAIL_LENGTH } from '../constants.js';
import {
  initEditor,
  getEditorHTML,
  setEditorHTML,
  getEditorText,
  onChange as onEditorChange,
} from '../editor/richEditorAdapter.js';

let dialogEl = null;
let callbacksObj = null;

/**
 * UTC ISO 8601 文字列を JST 日付文字列に変換
 * @param {string} utcString ISO 8601 形式
 * @returns {string} YYYY-MM-DD 形式
 */
function formatUtcToDateString(utcString) {
  const d = new Date(utcString);
  const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jstTime.getUTCFullYear();
  const mm = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstTime.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * UTC ISO 8601 文字列を JST 日時文字列に変換
 * @param {string} utcString ISO 8601 形式
 * @returns {object} { datetime, display }
 */
function formatUtcToDateTimeStrings(utcString) {
  const d = new Date(utcString);
  const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jstTime.getUTCFullYear();
  const mm = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstTime.getUTCDate()).padStart(2, '0');
  const hh = String(jstTime.getUTCHours()).padStart(2, '0');
  const mi = String(jstTime.getUTCMinutes()).padStart(2, '0');
  return {
    datetime: `${yyyy}-${mm}-${dd}T${hh}:${mi}`,
    display: `${yyyy}-${mm}-${dd} ${hh}:${mi}`,
  };
}

/**
 * 日時指定ラジオボタンの UI 状態を更新
 */
function updateDueTypeUI() {
  const radioNone = dialogEl.querySelector('#due-none');
  const radioDate = dialogEl.querySelector('#due-date');
  const radioDatetime = dialogEl.querySelector('#due-datetime');
  const datePicker = dialogEl.querySelector('#due-date-picker');
  const datetimePicker = dialogEl.querySelector('#due-datetime-picker');
  const dateWrapper = dialogEl.querySelector('#due-date-wrapper');
  const datetimeWrapper = dialogEl.querySelector('#due-datetime-wrapper');
  const dateDisplay = dialogEl.querySelector('#due-date-display');
  const datetimeDisplay = dialogEl.querySelector('#due-datetime-display');

  const resetDateFields = () => {
    datePicker.value = '';
    datePicker.disabled = true;
    dateDisplay.value = '';
    dateWrapper.style.display = 'none';
  };

  const resetDateTimeFields = () => {
    datetimePicker.value = '';
    datetimePicker.disabled = true;
    datetimeDisplay.value = '';
    datetimeWrapper.style.display = 'none';
  };

  if (radioNone.checked) {
    resetDateFields();
    resetDateTimeFields();
  } else if (radioDate.checked) {
    resetDateTimeFields();
    datePicker.disabled = false;
    dateWrapper.style.display = 'block';
    dateDisplay.value = datePicker.value;
  } else if (radioDatetime.checked) {
    resetDateFields();
    datetimePicker.disabled = false;
    datetimeWrapper.style.display = 'block';
    datetimeDisplay.value = datetimePicker.value.replace('T', ' ');
  }
}

/**
 * 保存ボタンの有効状態を更新
 */
function updateSaveButtonState() {
  const titleInput = dialogEl.querySelector('#todo-title');
  const saveBtn = dialogEl.querySelector('#btn-save-todo');

  const isTitleValid = isValidTitle(titleInput.value);
  const cleanDetailText = getCleanDetailText(getEditorText());
  const isDetailValid = isValidDetail(cleanDetailText);

  saveBtn.disabled = !(isTitleValid && isDetailValid);
}

/**
 * フォーム内容を初期化（新規作成時）
 */
function resetForm() {
  const titleInput = dialogEl.querySelector('#todo-title');
  const radioNone = dialogEl.querySelector('#due-none');
  const datePicker = dialogEl.querySelector('#due-date-picker');
  const datetimePicker = dialogEl.querySelector('#due-datetime-picker');
  const dateDisplay = dialogEl.querySelector('#due-date-display');
  const datetimeDisplay = dialogEl.querySelector('#due-datetime-display');

  titleInput.value = '';
  setEditorHTML('');
  radioNone.checked = true;
  datePicker.value = '';
  datetimePicker.value = '';
  dateDisplay.value = '';
  datetimeDisplay.value = '';
}

/**
 * フォーム内容を既存 ToDo で初期化（編集時）
 */
function populateFormFromTodo(todo) {
  const titleInput = dialogEl.querySelector('#todo-title');
  const radioNone = dialogEl.querySelector('#due-none');
  const radioDate = dialogEl.querySelector('#due-date');
  const radioDatetime = dialogEl.querySelector('#due-datetime');
  const datePicker = dialogEl.querySelector('#due-date-picker');
  const datetimePicker = dialogEl.querySelector('#due-datetime-picker');
  const dateDisplay = dialogEl.querySelector('#due-date-display');
  const datetimeDisplay = dialogEl.querySelector('#due-datetime-display');

  titleInput.value = todo.title || '';
  setEditorHTML(todo.detailHtml || todo.detail || '');

  if (todo.dueType === 'date') {
    radioDate.checked = true;
    const dateStr = formatUtcToDateString(todo.dueAt);
    datePicker.value = dateStr;
    dateDisplay.value = dateStr;
  } else if (todo.dueType === 'datetime') {
    radioDatetime.checked = true;
    const { datetime, display } = formatUtcToDateTimeStrings(todo.dueAt);
    datetimePicker.value = datetime;
    datetimeDisplay.value = display;
  } else {
    radioNone.checked = true;
  }
}

/**
 * 詳細画面ビュー（モーダルダイアログ）の初期化
 * @param {HTMLDialogElement} dialogElement
 * @param {object} callbacks { onSave }
 */
export function initDetailView(dialogElement, callbacks) {
  if (!dialogElement) {
    dialogEl = null;
    callbacksObj = null;
    return;
  }
  dialogEl = dialogElement;
  callbacksObj = callbacks;

  const titleInput = dialogElement.querySelector('#todo-title');
  const titleCounter = dialogElement.querySelector('#title-counter');
  const saveBtn = dialogElement.querySelector('#btn-save-todo');
  const cancelBtn = dialogElement.querySelector('#btn-cancel-todo');

  const radioNone = dialogElement.querySelector('#due-none');
  const radioDate = dialogElement.querySelector('#due-date');
  const radioDatetime = dialogElement.querySelector('#due-datetime');

  const datePicker = dialogElement.querySelector('#due-date-picker');
  const datetimePicker = dialogElement.querySelector('#due-datetime-picker');

  const editorContainer = dialogElement.querySelector('#editor-container');
  const detailCounter = dialogElement.querySelector('#detail-counter');

  initEditor(editorContainer);
  initCharCounter(titleInput, titleCounter, MAX_TITLE_LENGTH, () => {
    updateSaveButtonState();
  });

  // タイトル入力の最大文字数制限
  titleInput.addEventListener('keydown', (e) => {
    const allowedKeys = [
      'Backspace',
      'Tab',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Enter',
    ];
    if (allowedKeys.includes(e.key)) return;

    if (titleInput.value.length >= MAX_TITLE_LENGTH) {
      e.preventDefault();
    }
  });

  // エディタ変更時にカウンター更新
  onEditorChange(() => {
    const cleanText = getCleanDetailText(getEditorText());
    detailCounter.textContent = `${cleanText.length} / ${MAX_DETAIL_LENGTH}`;
    updateSaveButtonState();
  });

  // 日付ピッカーの自動ポップアップ
  const autoShowPicker = (e) => {
    if (typeof e.target.showPicker === 'function') {
      try {
        e.target.showPicker();
      } catch {
        // ignore
      }
    }
  };
  [datePicker, datetimePicker].forEach((picker) => {
    picker.addEventListener('click', autoShowPicker);
    picker.addEventListener('focus', autoShowPicker);
  });

  // 日付ピッカー変更
  datePicker.addEventListener('input', () => {
    const dateDisplay = dialogElement.querySelector('#due-date-display');
    dateDisplay.value = datePicker.value;
    updateSaveButtonState();
  });

  // 日時ピッカー変更
  datetimePicker.addEventListener('input', () => {
    const datetimeDisplay = dialogElement.querySelector('#due-datetime-display');
    datetimeDisplay.value = datetimePicker.value.replace('T', ' ');
    updateSaveButtonState();
  });

  // 日時指定ラジオボタン変更
  [radioNone, radioDate, radioDatetime].forEach((radio) => {
    radio.addEventListener('change', updateDueTypeUI);
    radio.addEventListener('click', updateDueTypeUI);
  });

  // 保存ボタンクリック
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const detailText = getCleanDetailText(getEditorText());
    const detailHtml = getEditorHTML();

    let dueType = 'none';
    let dueAt = null;

    if (radioDate.checked) {
      dueType = 'date';
      dueAt = convertToUtcForDate(datePicker.value);
    } else if (radioDatetime.checked) {
      dueType = 'datetime';
      dueAt = convertToUtcForDateTime(datetimePicker.value);
    }

    callbacksObj.onSave({
      title,
      detail: detailText,
      detailHtml,
      dueType,
      dueAt,
    });

    closeDetailModal();
  });

  // キャンセルボタンクリック
  cancelBtn.addEventListener('click', () => {
    closeDetailModal();
  });

  // 背景クリック
  dialogElement.addEventListener('click', (e) => {
    if (e.target === dialogElement) {
      closeDetailModal();
    }
  });
}

/**
 * 詳細画面をモーダルとして開く
 * @param {object|null} todo 編集対象のToDoオブジェクト、新規の場合は null
 */
export function openDetailModal(todo = null) {
  if (!dialogEl) return;

  if (todo) {
    populateFormFromTodo(todo);
  } else {
    resetForm();
  }

  updateDueTypeUI();

  const titleInput = dialogEl.querySelector('#todo-title');
  const detailCounter = dialogEl.querySelector('#detail-counter');

  titleInput.dispatchEvent(new Event('input'));

  const cleanText = getCleanDetailText(getEditorText());
  detailCounter.textContent = `${cleanText.length} / ${MAX_DETAIL_LENGTH}`;

  updateSaveButtonState();

  dialogEl.showModal();
}

/**
 * 詳細画面を閉じる
 */
export function closeDetailModal() {
  if (dialogEl) {
    dialogEl.close();
  }
}
