/**
 * 文字カウンターの初期化とイベント設定
 * @param {HTMLInputElement|HTMLTextAreaElement} inputElement
 * @param {HTMLElement} counterElement
 * @param {number} maxLength
 * @param {Function} [onLengthChange] 文字数が変わった時のコールバック (引数: length, isValid)
 */
export function initCharCounter(inputElement, counterElement, maxLength, onLengthChange = null) {
  const updateCounter = () => {
    const length = inputElement.value.length;
    counterElement.textContent = `${length} / ${maxLength}`;
    const isValid = length <= maxLength;
    if (onLengthChange) {
      onLengthChange(length, isValid);
    }
  };

  inputElement.addEventListener('input', updateCounter);
  // 初期設定
  updateCounter();
}
