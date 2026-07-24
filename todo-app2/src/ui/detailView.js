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
  const dateWrapper = dialogElement.querySelector('#due-date-wrapper');
  const datetimeWrapper = dialogElement.querySelector('#due-datetime-wrapper');
  const dateDisplay = dialogElement.querySelector('#due-date-display');
  const datetimeDisplay = dialogElement.querySelector('#due-datetime-display');

  const editorContainer = dialogElement.querySelector('#editor-container');
  const detailCounter = dialogElement.querySelector('#detail-counter');

  // Quillエディタの初期化
  initEditor(editorContainer);

  // 保存ボタンの状態更新
  const updateSaveButtonState = () => {
    const titleVal = titleInput.value;
    const isTitleValid = isValidTitle(titleVal);

    const rawDetailText = getEditorText();
    const cleanDetailText = getCleanDetailText(rawDetailText);
    const isDetailValid = isValidDetail(cleanDetailText);

    saveBtn.disabled = !(isTitleValid && isDetailValid);
  };

  // タイトルの文字数カウンター初期設定
  initCharCounter(titleInput, titleCounter, MAX_TITLE_LENGTH, () => {
    updateSaveButtonState();
  });

  // 100文字制限のブロック
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

  // Quillエディタの入力監視
  onEditorChange(() => {
    const rawText = getEditorText();
    const cleanText = getCleanDetailText(rawText);
    detailCounter.textContent = `${cleanText.length} / ${MAX_DETAIL_LENGTH}`;
    updateSaveButtonState();
  });

  // カレンダーUIを自動でポップアップ表示させるイベント
  const autoShowPicker = (e) => {
    if (typeof e.target.showPicker === 'function') {
      try {
        e.target.showPicker();
      } catch {
        // ignore
      }
    }
  };
  datePicker.addEventListener('click', autoShowPicker);
  datePicker.addEventListener('focus', autoShowPicker);
  datetimePicker.addEventListener('click', autoShowPicker);
  datetimePicker.addEventListener('focus', autoShowPicker);

  datePicker.addEventListener('input', () => {
    dateDisplay.value = datePicker.value;
    updateSaveButtonState();
  });
  datetimePicker.addEventListener('input', () => {
    datetimeDisplay.value = datetimePicker.value.replace('T', ' ');
    updateSaveButtonState();
  });

  // 日時指定ラジオボタンの制御
  const handleDueTypeChange = () => {
    if (radioNone.checked) {
      datePicker.disabled = true;
      datetimePicker.disabled = true;
      datePicker.value = '';
      datetimePicker.value = '';
      dateDisplay.value = '';
      datetimeDisplay.value = '';
      dateWrapper.style.display = 'none';
      datetimeWrapper.style.display = 'none';
    } else if (radioDate.checked) {
      datePicker.disabled = false;
      datetimePicker.disabled = true;
      datetimePicker.value = '';
      datetimeDisplay.value = '';
      dateWrapper.style.display = 'block';
      datetimeWrapper.style.display = 'none';
      dateDisplay.value = datePicker.value;
    } else if (radioDatetime.checked) {
      datePicker.disabled = true;
      datetimePicker.disabled = false;
      datePicker.value = '';
      dateDisplay.value = '';
      dateWrapper.style.display = 'none';
      datetimeWrapper.style.display = 'block';
      datetimeDisplay.value = datetimePicker.value.replace('T', ' ');
    }
  };

  [radioNone, radioDate, radioDatetime].forEach((radio) => {
    radio.addEventListener('change', handleDueTypeChange);
    radio.addEventListener('click', handleDueTypeChange);
  });

  // 保存イベント
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

  // キャンセルイベント
  cancelBtn.addEventListener('click', () => {
    closeDetailModal();
  });

  // 背景クリックイベントで閉じる
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

  const titleInput = dialogEl.querySelector('#todo-title');
  const radioNone = dialogEl.querySelector('#due-none');
  const radioDate = dialogEl.querySelector('#due-date');
  const radioDatetime = dialogEl.querySelector('#due-datetime');
  const datePicker = dialogEl.querySelector('#due-date-picker');
  const datetimePicker = dialogEl.querySelector('#due-datetime-picker');
  const dateWrapper = dialogEl.querySelector('#due-date-wrapper');
  const datetimeWrapper = dialogEl.querySelector('#due-datetime-wrapper');
  const dateDisplay = dialogEl.querySelector('#due-date-display');
  const datetimeDisplay = dialogEl.querySelector('#due-datetime-display');
  const detailCounter = dialogEl.querySelector('#detail-counter');

  if (todo) {
    titleInput.value = todo.title || '';
    setEditorHTML(todo.detailHtml || todo.detail || '');

    if (todo.dueType === 'date') {
      radioDate.checked = true;
      const d = new Date(todo.dueAt);
      const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const yyyy = jstTime.getUTCFullYear();
      const mm = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(jstTime.getUTCDate()).padStart(2, '0');
      datePicker.value = `${yyyy}-${mm}-${dd}`;
      dateDisplay.value = `${yyyy}-${mm}-${dd}`;
    } else if (todo.dueType === 'datetime') {
      radioDatetime.checked = true;
      const d = new Date(todo.dueAt);
      const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const yyyy = jstTime.getUTCFullYear();
      const mm = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(jstTime.getUTCDate()).padStart(2, '0');
      const hh = String(jstTime.getUTCHours()).padStart(2, '0');
      const mi = String(jstTime.getUTCMinutes()).padStart(2, '0');
      datetimePicker.value = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      datetimeDisplay.value = `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    } else {
      radioNone.checked = true;
    }
  } else {
    titleInput.value = '';
    setEditorHTML('');
    radioNone.checked = true;
    datePicker.value = '';
    datetimePicker.value = '';
    dateDisplay.value = '';
    datetimeDisplay.value = '';
  }

  // 日時指定ラジオボタンの連動を反映
  if (radioNone.checked) {
    datePicker.disabled = true;
    datetimePicker.disabled = true;
    datePicker.value = '';
    datetimePicker.value = '';
    dateDisplay.value = '';
    datetimeDisplay.value = '';
    dateWrapper.style.display = 'none';
    datetimeWrapper.style.display = 'none';
  } else if (radioDate.checked) {
    datePicker.disabled = false;
    datetimePicker.disabled = true;
    datetimePicker.value = '';
    datetimeDisplay.value = '';
    dateWrapper.style.display = 'block';
    datetimeWrapper.style.display = 'none';
    dateDisplay.value = datePicker.value;
  } else if (radioDatetime.checked) {
    datePicker.disabled = true;
    datetimePicker.disabled = false;
    datePicker.value = '';
    dateDisplay.value = '';
    dateWrapper.style.display = 'none';
    datetimeWrapper.style.display = 'block';
    datetimeDisplay.value = datetimePicker.value.replace('T', ' ');
  }

  // カウンターおよび保存ボタン状態の初期同期
  titleInput.dispatchEvent(new Event('input'));

  const rawText = getEditorText();
  const cleanText = getCleanDetailText(rawText);
  detailCounter.textContent = `${cleanText.length} / 2000`;

  const saveBtn = dialogEl.querySelector('#btn-save-todo');
  if (saveBtn) {
    const isTitleValid = isValidTitle(titleInput.value);
    const isDetailValid = isValidDetail(cleanText);
    saveBtn.disabled = !(isTitleValid && isDetailValid);
  }

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
