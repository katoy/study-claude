import Quill from 'quill';

let quillInstance = null;

/**
 * Quillエディタの初期化
 * @param {HTMLElement} element
 */
export function initEditor(element) {
  quillInstance = new Quill(element, {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
    },
  });
}

/**
 * エディタのHTMLを取得
 * @returns {string}
 */
export function getEditorHTML() {
  return quillInstance ? quillInstance.root.innerHTML : '';
}

/**
 * エディタのHTMLを設定
 * @param {string} html
 */
export function setEditorHTML(html) {
  if (quillInstance) {
    // eslint-disable-next-line no-unsanitized/property
    quillInstance.root.innerHTML = html;
  }
}

/**
 * エディタのプレーンテキストを取得
 * @returns {string}
 */
export function getEditorText() {
  return quillInstance ? quillInstance.getText() : '';
}

/**
 * エディタの変更監視リスナーの登録
 * @param {Function} callback
 */
export function onChange(callback) {
  if (quillInstance) {
    quillInstance.on('text-change', callback);
  }
}
