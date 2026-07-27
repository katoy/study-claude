/**
 * 「日のみ」指定時のJST日付文字列(YYYY-MM-DD)をUTCのISO文字列に変換
 * JSTのその日の 23:59:59 に相当するUTC時刻にする。
 * @param {string} jstDateStr
 * @returns {string}
 */
export function convertToUtcForDate(jstDateStr) {
  // JST 23:59:59 の Date オブジェクトを作成し UTC 変換
  const date = new Date(`${jstDateStr}T23:59:59.000+09:00`);
  return date.toISOString();
}

/**
 * 「時まで」指定時のJST日時文字列(YYYY-MM-DDTHH:mm)をUTCのISO文字列に変換
 * @param {string} jstDateTimeStr
 * @returns {string}
 */
export function convertToUtcForDateTime(jstDateTimeStr) {
  // JST の日時 Date オブジェクトを作成し UTC 変換
  const date = new Date(`${jstDateTimeStr}:00.000+09:00`);
  return date.toISOString();
}

/**
 * UTC ISO 文字列から JST の構成要素を抽出
 * @param {string} utcStr UTC ISO文字列
 * @returns {object} { yyyy, mm, dd, hh, mi, weekday }
 */
export function toJstParts(utcStr) {
  const d = new Date(utcStr);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jstTime.getUTCFullYear();
  const mm = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstTime.getUTCDate()).padStart(2, '0');
  const hh = String(jstTime.getUTCHours()).padStart(2, '0');
  const mi = String(jstTime.getUTCMinutes()).padStart(2, '0');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[jstTime.getUTCDay()];

  return { yyyy, mm, dd, hh, mi, weekday };
}

/**
 * 期限を曜日を含む形式でフォーマットする
 * @param {string} dueType 'none' | 'date' | 'datetime'
 * @param {string|null} dueAt UTC ISO文字列
 * @returns {string}
 */
export function formatDue(dueType, dueAt) {
  if (dueType === 'none' || !dueAt) {
    return '—';
  }

  const parts = toJstParts(dueAt);
  if (!parts) {
    return '—';
  }

  const { yyyy, mm, dd, hh, mi, weekday } = parts;

  if (dueType === 'date') {
    return `${yyyy}-${mm}-${dd} (${weekday})`;
  } else if (dueType === 'datetime') {
    return `${yyyy}-${mm}-${dd} (${weekday}) ${hh}:${mi}`;
  }

  return '—';
}

/**
 * UTC ISO文字列を JST 日付文字列に変換
 * @param {string} utcStr UTC ISO文字列
 * @returns {string} YYYY-MM-DD
 */
function getJstDateString(utcStr) {
  const d = new Date(utcStr);
  const jstTime = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jstTime.getUTCFullYear();
  const mm = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstTime.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 2つの日付間の日数差を JST ベースで計算する (toDateStr - fromDateStr)
 * 常に JST での日付で比較して、タイムゾーン差による誤分類を防ぐ
 * @param {string} fromDateStr UTC ISO文字列
 * @param {string} toDateStr UTC ISO文字列
 * @returns {number}
 */
export function daysBetween(fromDateStr, toDateStr) {
  const fromJst = getJstDateString(fromDateStr);
  const toJst = getJstDateString(toDateStr);

  const fromNoon = new Date(`${fromJst}T12:00:00.000Z`).getTime();
  const toNoon = new Date(`${toJst}T12:00:00.000Z`).getTime();

  const diffMs = toNoon - fromNoon;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}
