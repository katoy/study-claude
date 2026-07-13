// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

// index.html のファイルURL
const APP_URL = `file://${path.resolve(__dirname, '../index.html')}`;

// localStorageキー
const STORAGE_KEY = 'todo-app-items';

/**
 * ヘルパー: localStorageをクリアしてページをリロード
 */
async function resetApp(page) {
  await page.goto(APP_URL);
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
}

/**
 * ヘルパー: localStorageにデータをセットしてリロード
 */
async function setStorageAndReload(page, data) {
  await page.goto(APP_URL);
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: data });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
}

/**
 * ヘルパー: localStorageからデータを取得
 */
async function getStorageData(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }, STORAGE_KEY);
}

/**
 * ヘルパー: 今日の日付文字列 (YYYY-MM-DD)
 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ヘルパー: 明日の日付文字列 (YYYY-MM-DD)
 */
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ヘルパー: 明後日の日付文字列 (YYYY-MM-DD)
 */
function dayAfterTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ヘルパー: 新規アイテムを作成して保存
 */
async function createItem(page, { title, dateType = 'none', dateValue = '', detail = '' }) {
  await page.getByRole('button', { name: '新規' }).click();

  // タイトル入力
  await page.getByPlaceholder('タイトルを入力').fill(title);

  // 日時選択
  if (dateType === 'none') {
    await page.getByLabel('なし').check();
  } else if (dateType === 'date') {
    await page.getByLabel('日のみ').check();
    await page.locator('input[type="date"]').fill(dateValue);
  } else if (dateType === 'datetime') {
    await page.getByLabel('時まで').check();
    await page.locator('input[type="datetime-local"]').fill(dateValue);
  }

  // 詳細入力（Quillエディタ）
  if (detail) {
    await page.locator('.ql-editor').fill(detail);
  }

  await page.getByRole('button', { name: '保存' }).click();
}

// =============================================================
// 1. 初期表示
// =============================================================
test.describe('1. 初期表示', () => {
  test('TC-1.1: 初期状態の画面表示', async ({ page }) => {
    await resetApp(page);

    // タイトル「TODOリスト」が表示される
    await expect(page.getByText('TODOリスト')).toBeVisible();

    // [新規]ボタンが表示される
    await expect(page.getByRole('button', { name: '新規' })).toBeVisible();

    // タブ「すべて」「未完了」「完了済」が表示される
    await expect(page.getByText('すべて')).toBeVisible();
    await expect(page.getByText('未完了')).toBeVisible();
    await expect(page.getByText('完了済')).toBeVisible();

    // 「すべて」タブがアクティブ状態
    const allTab = page.getByText('すべて');
    await expect(allTab).toHaveClass(/active/);

    // [完済を削除]ボタンが表示される
    await expect(page.getByRole('button', { name: '完済を削除' })).toBeVisible();

    // セクション見出しが表示されない（アイテムなしのため）
    await expect(page.getByText('本日中')).not.toBeVisible();
    await expect(page.getByText('明日まで')).not.toBeVisible();
    await expect(page.getByText('それ以外')).not.toBeVisible();
  });

  test('TC-1.2: 既存データの読み込み', async ({ page }) => {
    const data = [{
      id: 'test-1',
      title: 'テストタスク',
      detail: '',
      dateType: 'none',
      deadline: null,
      completed: false,
      createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 「テストタスク」が「それ以外」セクションに表示される
    await expect(page.getByText('それ以外')).toBeVisible();
    await expect(page.getByText('テストタスク')).toBeVisible();
  });
});

// =============================================================
// 2. 詳細画面（モーダル）- 新規登録
// =============================================================
test.describe('2. 詳細画面（モーダル）', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  test('TC-2.1: モーダルの表示', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();

    // モーダルが表示される
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).toBeVisible();

    // 背景オーバーレイが存在する
    const overlay = page.locator('.overlay, .modal-overlay, .modal-backdrop');
    await expect(overlay).toBeVisible();

    // タイトル入力欄が空欄で、プレースホルダー「タイトルを入力」
    const titleInput = page.getByPlaceholder('タイトルを入力');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('');

    // 日時ラジオボタン「なし」が選択されている
    await expect(page.getByLabel('なし')).toBeChecked();

    // 日付入力欄は非表示
    await expect(page.locator('input[type="date"]')).not.toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible();

    // Quillエディタが表示され内容は空
    const editor = page.locator('.ql-editor');
    await expect(editor).toBeVisible();
    const editorText = await editor.textContent();
    expect(editorText?.trim()).toBe('');

    // [保存]と[キャンセル]ボタン
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  });

  test('TC-2.2: モーダル外クリックで閉じない', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).toBeVisible();

    // オーバーレイ部分をクリック
    const overlay = page.locator('.overlay, .modal-overlay, .modal-backdrop');
    await overlay.click({ position: { x: 5, y: 5 } });

    // モーダルが閉じない
    await expect(modal).toBeVisible();
  });

  test('TC-2.3: ESCキーで閉じる', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(modal).not.toBeVisible();
  });

  test('TC-2.4: [キャンセル]ボタン', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();
    await page.getByPlaceholder('タイトルを入力').fill('テスト');
    await page.getByRole('button', { name: 'キャンセル' }).click();

    // モーダルが閉じる
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();

    // アイテムが追加されていない
    await expect(page.getByText('テスト')).not.toBeVisible();
  });
});

// =============================================================
// 3. 日時選択
// =============================================================
test.describe('3. 日時選択', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
    await page.getByRole('button', { name: '新規' }).click();
  });

  test('TC-3.1: ラジオボタン「なし」選択', async ({ page }) => {
    await page.getByLabel('なし').check();
    await expect(page.locator('input[type="date"]')).not.toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible();
  });

  test('TC-3.2: ラジオボタン「日のみ」選択', async ({ page }) => {
    await page.getByLabel('日のみ').check();
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('TC-3.3: ラジオボタン「時まで」選択', async ({ page }) => {
    await page.getByLabel('時まで').check();
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible();
  });

  test('TC-3.4: ラジオボタン切り替え', async ({ page }) => {
    // 「時まで」を選択して日時入力
    await page.getByLabel('時まで').check();
    await expect(page.locator('input[type="datetime-local"]')).toBeVisible();

    // 「なし」に切り替え
    await page.getByLabel('なし').check();
    await expect(page.locator('input[type="date"]')).not.toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible();

    // 「日のみ」に切り替え
    await page.getByLabel('日のみ').check();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible();
  });
});

// =============================================================
// 4. バリデーション
// =============================================================
test.describe('4. バリデーション', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
    await page.getByRole('button', { name: '新規' }).click();
  });

  test('TC-4.1: タイトル未入力で保存', async ({ page }) => {
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('タイトルを入力してください')).toBeVisible();
  });

  test('TC-4.2: タイトルが空白のみで保存', async ({ page }) => {
    await page.getByPlaceholder('タイトルを入力').fill('   ');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('タイトルを入力してください')).toBeVisible();
  });

  test('TC-4.3: タイトル101文字で保存', async ({ page }) => {
    const longTitle = 'あ'.repeat(101);
    await page.getByPlaceholder('タイトルを入力').fill(longTitle);
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('タイトルは100文字以内で入力してください')).toBeVisible();
  });

  test('TC-4.4: タイトル100文字で保存（正常）', async ({ page }) => {
    const title100 = 'あ'.repeat(100);
    await page.getByPlaceholder('タイトルを入力').fill(title100);
    await page.getByRole('button', { name: '保存' }).click();

    // バリデーションエラーなし → モーダルが閉じる
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();
  });

  test('TC-4.5: 詳細2001文字で保存', async ({ page }) => {
    await page.getByPlaceholder('タイトルを入力').fill('テスト');
    const longDetail = 'あ'.repeat(2001);
    await page.locator('.ql-editor').fill(longDetail);
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('詳細は2000文字以内で入力してください')).toBeVisible();
  });

  test('TC-4.6: 詳細2000文字で保存（正常）', async ({ page }) => {
    await page.getByPlaceholder('タイトルを入力').fill('テスト');
    const detail2000 = 'あ'.repeat(2000);
    await page.locator('.ql-editor').fill(detail2000);
    await page.getByRole('button', { name: '保存' }).click();

    // バリデーションエラーなし → モーダルが閉じる
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();
  });

  test('TC-4.7: 日時「日のみ」で日付未入力', async ({ page }) => {
    await page.getByPlaceholder('タイトルを入力').fill('テスト');
    await page.getByLabel('日のみ').check();
    // 日付を入力せずに保存
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('日時を入力してください')).toBeVisible();
  });

  test('TC-4.8: 日時「時まで」で日時未入力', async ({ page }) => {
    await page.getByPlaceholder('タイトルを入力').fill('テスト');
    await page.getByLabel('時まで').check();
    // 日時を入力せずに保存
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('日時を入力してください')).toBeVisible();
  });
});

// =============================================================
// 5. 新規登録（正常系）
// =============================================================
test.describe('5. 新規登録（正常系）', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  test('TC-5.1: 最小構成で保存（タイトルのみ）', async ({ page }) => {
    await createItem(page, { title: '買い物リスト' });

    // モーダルが閉じる
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();

    // 「それ以外」セクションに表示
    await expect(page.getByText('それ以外')).toBeVisible();
    await expect(page.getByText('買い物リスト')).toBeVisible();

    // [完了]ボタンが表示
    await expect(page.getByRole('button', { name: '完了' }).first()).toBeVisible();

    // localStorage の確認
    const data = await getStorageData(page);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('買い物リスト');
    expect(data[0].completed).toBe(false);
    expect(data[0].dateType).toBe('none');
    expect(data[0].deadline).toBeNull();
    // UUID形式の確認
    expect(data[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('TC-5.2: 日付ありで保存', async ({ page }) => {
    const today = todayStr();
    await createItem(page, { title: 'レポート提出', dateType: 'date', dateValue: today });

    // 「本日中」セクションに表示
    await expect(page.getByText('本日中')).toBeVisible();
    await expect(page.getByText('レポート提出')).toBeVisible();

    // 日時が「○月○日」形式で表示（月と日を含む）
    const now = new Date();
    const expectedDate = `${now.getMonth() + 1}月${now.getDate()}日`;
    await expect(page.getByText(expectedDate)).toBeVisible();

    // localStorage
    const data = await getStorageData(page);
    expect(data[0].dateType).toBe('date');
  });

  test('TC-5.3: 日時ありで保存', async ({ page }) => {
    const todayDatetime = `${todayStr()}T14:30`;
    await createItem(page, { title: '会議', dateType: 'datetime', dateValue: todayDatetime });

    // 「本日中」セクションに表示
    await expect(page.getByText('本日中')).toBeVisible();
    await expect(page.getByText('会議')).toBeVisible();

    // 日時が「○月○日○時○分」形式で表示
    const now = new Date();
    const expectedDateTime = `${now.getMonth() + 1}月${now.getDate()}日14時30分`;
    await expect(page.getByText(expectedDateTime)).toBeVisible();

    // localStorage
    const data = await getStorageData(page);
    expect(data[0].dateType).toBe('datetime');
  });

  test('TC-5.4: 詳細入力ありで保存', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();
    await page.getByPlaceholder('タイトルを入力').fill('企画書作成');

    // Quillエディタで太字テキストを入力
    const editor = page.locator('.ql-editor');
    await editor.click();
    // ツールバーの太字ボタンをクリック
    await page.locator('.ql-bold').click();
    await editor.pressSequentially('重要な内容');

    await page.getByRole('button', { name: '保存' }).click();

    // localStorage の detail にHTMLが含まれる
    const data = await getStorageData(page);
    expect(data[0].detail).toContain('<strong>');
  });
});

// =============================================================
// 6. 編集
// =============================================================
test.describe('6. 編集', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  test('TC-6.1: 編集モードで開く', async ({ page }) => {
    // アイテムを作成
    await createItem(page, { title: '買い物リスト' });

    // タイトルをクリック
    await page.getByText('買い物リスト').click();

    // モーダルが開く
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).toBeVisible();

    // タイトルに「買い物リスト」が入っている
    await expect(page.getByPlaceholder('タイトルを入力')).toHaveValue('買い物リスト');

    // 日時ラジオボタンが登録時の選択状態（なし）
    await expect(page.getByLabel('なし')).toBeChecked();
  });

  test('TC-6.2: タイトルを編集して保存', async ({ page }) => {
    await createItem(page, { title: '買い物リスト' });

    // 元のIDを取得
    const dataBefore = await getStorageData(page);
    const originalId = dataBefore[0].id;

    // 編集
    await page.getByText('買い物リスト').click();
    await page.getByPlaceholder('タイトルを入力').fill('買い物リスト（更新）');
    await page.getByRole('button', { name: '保存' }).click();

    // モーダルが閉じる
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();

    // 更新後の表示
    await expect(page.getByText('買い物リスト（更新）')).toBeVisible();

    // idが変わっていない
    const dataAfter = await getStorageData(page);
    expect(dataAfter[0].id).toBe(originalId);
  });

  test('TC-6.3: 日時を変更して保存', async ({ page }) => {
    await createItem(page, { title: 'タスクX' });

    // 「それ以外」にある
    await expect(page.getByText('それ以外')).toBeVisible();

    // 編集して明日の日付にする
    await page.getByText('タスクX').click();
    await page.getByLabel('日のみ').check();
    await page.locator('input[type="date"]').fill(tomorrowStr());
    await page.getByRole('button', { name: '保存' }).click();

    // 「明日まで」セクションに移動
    await expect(page.getByText('明日まで')).toBeVisible();
    await expect(page.getByText('タスクX')).toBeVisible();
  });

  test('TC-6.4: 詳細を編集して保存', async ({ page }) => {
    // 詳細付きアイテムをlocalStorageに直接設定
    const data = [{
      id: 'edit-test-1',
      title: '詳細付きタスク',
      detail: '<p>元の詳細内容</p>',
      dateType: 'none',
      deadline: null,
      completed: false,
      createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 編集
    await page.getByText('詳細付きタスク').click();
    const editor = page.locator('.ql-editor');
    await editor.fill('更新された詳細');
    await page.getByRole('button', { name: '保存' }).click();

    // localStorageが更新されている
    const updatedData = await getStorageData(page);
    expect(updatedData[0].detail).toContain('更新された詳細');
  });

  test('TC-6.5: 編集をキャンセル', async ({ page }) => {
    await createItem(page, { title: '買い物リスト' });

    // 編集モードで開いてタイトルを変更
    await page.getByText('買い物リスト').click();
    await page.getByPlaceholder('タイトルを入力').fill('変更後タイトル');
    await page.getByRole('button', { name: 'キャンセル' }).click();

    // 元のタイトルのまま
    await expect(page.getByText('買い物リスト')).toBeVisible();
    await expect(page.getByText('変更後タイトル')).not.toBeVisible();
  });
});

// =============================================================
// 7. 完了/未完了トグル
// =============================================================
test.describe('7. 完了/未完了トグル', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  test('TC-7.1: 未完了 → 完了', async ({ page }) => {
    await createItem(page, { title: 'タスクA' });

    // [完了]ボタンをクリック
    await page.getByRole('button', { name: '完了' }).first().click();

    // 完了状態の表示に変わる（打ち消し線やグレーアウト等）
    const item = page.getByText('タスクA');
    await expect(item).toBeVisible();

    // localStorage の completed が true
    const data = await getStorageData(page);
    expect(data[0].completed).toBe(true);
  });

  test('TC-7.2: 完了 → 未完了', async ({ page }) => {
    // 完了済みアイテムを直接セット
    const data = [{
      id: 'toggle-test-1',
      title: 'タスクA',
      detail: '',
      dateType: 'none',
      deadline: null,
      completed: true,
      createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 完了ボタン（トグル）をクリック
    await page.getByRole('button', { name: /完了/ }).first().click();

    // localStorage の completed が false
    const updated = await getStorageData(page);
    expect(updated[0].completed).toBe(false);
  });
});

// =============================================================
// 8. タブ（フィルター）
// =============================================================
test.describe('8. タブ（フィルター）', () => {
  const testData = [
    { id: 'tab-1', title: '未完了A', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T01:00:00' },
    { id: 'tab-2', title: '未完了B', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T02:00:00' },
    { id: 'tab-3', title: '完了済C', detail: '', dateType: 'none', deadline: null, completed: true, createdAt: '2026-03-14T03:00:00' },
  ];

  test.beforeEach(async ({ page }) => {
    await setStorageAndReload(page, testData);
  });

  test('TC-8.1: 「すべて」タブ', async ({ page }) => {
    await page.getByText('すべて').click();
    await expect(page.getByText('未完了A')).toBeVisible();
    await expect(page.getByText('未完了B')).toBeVisible();
    await expect(page.getByText('完了済C')).toBeVisible();
  });

  test('TC-8.2: 「未完了」タブ', async ({ page }) => {
    await page.getByText('未完了', { exact: true }).click();
    await expect(page.getByText('未完了A')).toBeVisible();
    await expect(page.getByText('未完了B')).toBeVisible();
    await expect(page.getByText('完了済C')).not.toBeVisible();

    // タブがアクティブ状態
    await expect(page.getByText('未完了', { exact: true })).toHaveClass(/active/);
  });

  test('TC-8.3: 「完了済」タブ', async ({ page }) => {
    await page.getByText('完了済', { exact: true }).click();
    await expect(page.getByText('未完了A')).not.toBeVisible();
    await expect(page.getByText('未完了B')).not.toBeVisible();
    await expect(page.getByText('完了済C')).toBeVisible();

    // タブがアクティブ状態
    await expect(page.getByText('完了済', { exact: true })).toHaveClass(/active/);
  });

  test('TC-8.4: タブ切り替え後の完了トグル', async ({ page }) => {
    await page.getByText('未完了', { exact: true }).click();

    // 未完了2件が表示
    await expect(page.getByText('未完了A')).toBeVisible();
    await expect(page.getByText('未完了B')).toBeVisible();

    // 1件を完了にする
    const buttons = page.getByRole('button', { name: '完了' });
    await buttons.first().click();

    // 完了になったアイテムがリストから消える（未完了フィルタのため）
    const visibleItems = await page.getByText(/未完了[AB]/).count();
    expect(visibleItems).toBe(1);
  });

  test('TC-8.5: タブの状態保持', async ({ page }) => {
    await page.getByText('完了済', { exact: true }).click();
    await expect(page.getByText('完了済C')).toBeVisible();

    // 完了トグルをクリック（未完了に戻す）
    await page.getByRole('button', { name: /完了/ }).first().click();

    // 「完了済」タブのままであること
    await expect(page.getByText('完了済', { exact: true })).toHaveClass(/active/);
  });
});

// =============================================================
// 9. [完済を削除]
// =============================================================
test.describe('9. [完済を削除]', () => {
  test('TC-9.1: 確認ダイアログでOK', async ({ page }) => {
    const data = [
      { id: 'del-1', title: '完了A', detail: '', dateType: 'none', deadline: null, completed: true, createdAt: '2026-03-14T01:00:00' },
      { id: 'del-2', title: '完了B', detail: '', dateType: 'none', deadline: null, completed: true, createdAt: '2026-03-14T02:00:00' },
      { id: 'del-3', title: '未完了C', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T03:00:00' },
    ];
    await setStorageAndReload(page, data);

    // ダイアログでOKを押す
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '完済を削除' }).click();

    // 完了済が削除、未完了は残る
    await expect(page.getByText('完了A')).not.toBeVisible();
    await expect(page.getByText('完了B')).not.toBeVisible();
    await expect(page.getByText('未完了C')).toBeVisible();

    // localStorage確認
    const updated = await getStorageData(page);
    expect(updated).toHaveLength(1);
    expect(updated[0].title).toBe('未完了C');
  });

  test('TC-9.2: 確認ダイアログでキャンセル', async ({ page }) => {
    const data = [
      { id: 'del-1', title: '完了A', detail: '', dateType: 'none', deadline: null, completed: true, createdAt: '2026-03-14T01:00:00' },
    ];
    await setStorageAndReload(page, data);

    // ダイアログでキャンセルを押す
    page.on('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '完済を削除' }).click();

    // 削除されていない
    await expect(page.getByText('完了A')).toBeVisible();
    const updated = await getStorageData(page);
    expect(updated).toHaveLength(1);
  });

  test('TC-9.3: 完了済アイテムがない状態で削除', async ({ page }) => {
    const data = [
      { id: 'del-1', title: '未完了A', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T01:00:00' },
    ];
    await setStorageAndReload(page, data);

    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '完済を削除' }).click();

    // 未完了は削除されない
    await expect(page.getByText('未完了A')).toBeVisible();
    const updated = await getStorageData(page);
    expect(updated).toHaveLength(1);
  });
});

// =============================================================
// 10. セクション分け
// =============================================================
test.describe('10. セクション分け', () => {
  test('TC-10.1: 「本日中」セクション', async ({ page }) => {
    await resetApp(page);
    const today = todayStr();
    await createItem(page, { title: '本日タスク', dateType: 'date', dateValue: today });
    await expect(page.getByText('本日中')).toBeVisible();
    await expect(page.getByText('本日タスク')).toBeVisible();
  });

  test('TC-10.2: 「明日まで」セクション', async ({ page }) => {
    await resetApp(page);
    const tomorrow = tomorrowStr();
    await createItem(page, { title: '明日タスク', dateType: 'date', dateValue: tomorrow });
    await expect(page.getByText('明日まで')).toBeVisible();
    await expect(page.getByText('明日タスク')).toBeVisible();
  });

  test('TC-10.3: 「それ以外」セクション - 明後日以降', async ({ page }) => {
    await resetApp(page);
    const dayAfter = dayAfterTomorrowStr();
    await createItem(page, { title: '将来タスク', dateType: 'date', dateValue: dayAfter });
    await expect(page.getByText('それ以外')).toBeVisible();
    await expect(page.getByText('将来タスク')).toBeVisible();
  });

  test('TC-10.4: 「それ以外」セクション - 日時なし', async ({ page }) => {
    await resetApp(page);
    await createItem(page, { title: '期限なしタスク' });
    await expect(page.getByText('それ以外')).toBeVisible();
    await expect(page.getByText('期限なしタスク')).toBeVisible();
  });

  test('TC-10.5: 空セクションの非表示', async ({ page }) => {
    await resetApp(page);
    // 明日のタスクのみ登録 → 「本日中」は非表示
    const tomorrow = tomorrowStr();
    await createItem(page, { title: '明日のみ', dateType: 'date', dateValue: tomorrow });
    await expect(page.getByText('本日中')).not.toBeVisible();
    await expect(page.getByText('明日まで')).toBeVisible();
  });

  test('TC-10.6: dateType "date" の境界判定', async ({ page }) => {
    // 明日の日付を「日のみ」で設定 → deadline は明日の 00:00:00
    // → 今日時点では「明日まで」に分類される
    await resetApp(page);
    const tomorrow = tomorrowStr();
    await createItem(page, { title: '境界テスト', dateType: 'date', dateValue: tomorrow });

    // 「明日まで」に表示されること
    await expect(page.getByText('明日まで')).toBeVisible();
    await expect(page.getByText('境界テスト')).toBeVisible();
  });
});

// =============================================================
// 11. ソート順
// =============================================================
test.describe('11. ソート順', () => {
  test('TC-11.1: deadline あり → なし の順', async ({ page }) => {
    const today = todayStr();
    const data = [
      { id: 'sort-1', title: '期限なし', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T01:00:00' },
      { id: 'sort-2', title: '期限あり', detail: '', dateType: 'date', deadline: `${today}T00:00:00`, completed: false, createdAt: '2026-03-14T02:00:00' },
    ];
    await setStorageAndReload(page, data);

    // 「それ以外」セクション内で「期限あり」→「期限なし」の順（ただし期限ありは「本日中」に行く可能性）
    // 全件表示で確認：期限ありが先に来るセクションがあるはず
    const allItems = page.locator('[class*="todo-item"], [class*="item"], li, tr').filter({ hasText: /期限/ });
    const texts = await allItems.allTextContents();
    const idxWithDeadline = texts.findIndex(t => t.includes('期限あり'));
    const idxWithout = texts.findIndex(t => t.includes('期限なし'));
    // 同セクションにいる場合、deadline ありが先
    // セクション違いの場合は本日中 > それ以外なのでどちらにせよ先に来る
    expect(idxWithDeadline).toBeLessThan(idxWithout);
  });

  test('TC-11.2: deadline 昇順', async ({ page }) => {
    const today = todayStr();
    const data = [
      { id: 'sort-1', title: '遅い方', detail: '', dateType: 'datetime', deadline: `${today}T18:00:00`, completed: false, createdAt: '2026-03-14T01:00:00' },
      { id: 'sort-2', title: '早い方', detail: '', dateType: 'datetime', deadline: `${today}T09:00:00`, completed: false, createdAt: '2026-03-14T02:00:00' },
    ];
    await setStorageAndReload(page, data);

    // 「本日中」セクション内で「早い方」→「遅い方」の順
    const section = page.getByText('本日中').locator('..');
    const items = page.locator('[class*="todo-item"], [class*="item"], li, tr').filter({ hasText: /方/ });
    const texts = await items.allTextContents();
    const idxEarly = texts.findIndex(t => t.includes('早い方'));
    const idxLate = texts.findIndex(t => t.includes('遅い方'));
    expect(idxEarly).toBeLessThan(idxLate);
  });

  test('TC-11.3: 同一 deadline の場合 createdAt 昇順', async ({ page }) => {
    const today = todayStr();
    const data = [
      { id: 'sort-1', title: '新しく作成', detail: '', dateType: 'datetime', deadline: `${today}T12:00:00`, completed: false, createdAt: '2026-03-14T10:00:00' },
      { id: 'sort-2', title: '古く作成', detail: '', dateType: 'datetime', deadline: `${today}T12:00:00`, completed: false, createdAt: '2026-03-14T08:00:00' },
    ];
    await setStorageAndReload(page, data);

    const items = page.locator('[class*="todo-item"], [class*="item"], li, tr').filter({ hasText: /作成/ });
    const texts = await items.allTextContents();
    const idxOld = texts.findIndex(t => t.includes('古く作成'));
    const idxNew = texts.findIndex(t => t.includes('新しく作成'));
    expect(idxOld).toBeLessThan(idxNew);
  });

  test('TC-11.4: deadline なし同士は createdAt 昇順', async ({ page }) => {
    const data = [
      { id: 'sort-1', title: '新しいタスク', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T10:00:00' },
      { id: 'sort-2', title: '古いタスク', detail: '', dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T08:00:00' },
    ];
    await setStorageAndReload(page, data);

    const items = page.locator('[class*="todo-item"], [class*="item"], li, tr').filter({ hasText: /タスク/ });
    const texts = await items.allTextContents();
    const idxOld = texts.findIndex(t => t.includes('古いタスク'));
    const idxNew = texts.findIndex(t => t.includes('新しいタスク'));
    expect(idxOld).toBeLessThan(idxNew);
  });
});

// =============================================================
// 12. 日時の表示形式
// =============================================================
test.describe('12. 日時の表示形式', () => {
  test('TC-12.1: dateType "none" の表示', async ({ page }) => {
    const data = [{
      id: 'fmt-1', title: '日時なしタスク', detail: '', dateType: 'none',
      deadline: null, completed: false, createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 「日時なしタスク」の行に日時表示がない
    await expect(page.getByText('日時なしタスク')).toBeVisible();
    // 月日が含まれていないことを確認（同行内で）
    const itemRow = page.getByText('日時なしタスク').locator('..');
    const rowText = await itemRow.textContent();
    expect(rowText).not.toMatch(/月.*日/);
  });

  test('TC-12.2: dateType "date" の表示', async ({ page }) => {
    const data = [{
      id: 'fmt-2', title: '日付タスク', detail: '', dateType: 'date',
      deadline: '2026-03-15T00:00:00', completed: false, createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 「3月15日」と表示される
    await expect(page.getByText('3月15日')).toBeVisible();
    // 時分は表示されない
    await expect(page.getByText(/3月15日\d+時/)).not.toBeVisible();
  });

  test('TC-12.3: dateType "datetime" の表示', async ({ page }) => {
    const data = [{
      id: 'fmt-3', title: '日時タスク', detail: '', dateType: 'datetime',
      deadline: '2026-03-15T14:30:00', completed: false, createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 「3月15日14時30分」と表示される
    await expect(page.getByText('3月15日14時30分')).toBeVisible();
  });
});

// =============================================================
// 13. Quillエディタ
// =============================================================
test.describe('13. Quillエディタ', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
  });

  test('TC-13.1: ツールバー構成', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();

    // ツールバーボタンの確認
    await expect(page.locator('.ql-bold')).toBeVisible();
    await expect(page.locator('.ql-italic')).toBeVisible();
    await expect(page.locator('.ql-underline')).toBeVisible();
    await expect(page.locator('.ql-list[value="bullet"]')).toBeVisible();
    await expect(page.locator('.ql-list[value="ordered"]')).toBeVisible();
  });

  test('TC-13.2: リッチテキスト入力', async ({ page }) => {
    await page.getByRole('button', { name: '新規' }).click();
    await page.getByPlaceholder('タイトルを入力').fill('リッチテスト');

    const editor = page.locator('.ql-editor');
    await editor.click();

    // 太字で入力
    await page.locator('.ql-bold').click();
    await editor.pressSequentially('太字テキスト');
    await page.locator('.ql-bold').click(); // 太字解除

    // 箇条書き
    await page.keyboard.press('Enter');
    await page.locator('.ql-list[value="bullet"]').click();
    await editor.pressSequentially('リスト項目');

    await page.getByRole('button', { name: '保存' }).click();

    // localStorage確認
    const data = await getStorageData(page);
    expect(data[0].detail).toContain('<strong>');
    expect(data[0].detail).toMatch(/<li/);
  });

  test('TC-13.3: 編集時のリッチテキスト復元', async ({ page }) => {
    // リッチテキストを含むデータをセット
    const data = [{
      id: 'quill-1', title: 'リッチ復元テスト',
      detail: '<p><strong>太字</strong></p><ul><li>リスト項目</li></ul>',
      dateType: 'none', deadline: null, completed: false, createdAt: '2026-03-14T00:00:00',
    }];
    await setStorageAndReload(page, data);

    // 編集モードで開く
    await page.getByText('リッチ復元テスト').click();

    // Quillエディタ内に太字とリストが復元されている
    const editor = page.locator('.ql-editor');
    await expect(editor.locator('strong')).toHaveText('太字');
    await expect(editor.locator('li')).toHaveText('リスト項目');
  });
});

// =============================================================
// 14. データ永続化（localStorage）
// =============================================================
test.describe('14. データ永続化', () => {
  test('TC-14.1: 保存後のリロード', async ({ page }) => {
    await resetApp(page);
    await createItem(page, { title: 'アイテム1' });
    await createItem(page, { title: 'アイテム2' });
    await createItem(page, { title: 'アイテム3' });

    // リロード
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 3件とも表示される
    await expect(page.getByText('アイテム1')).toBeVisible();
    await expect(page.getByText('アイテム2')).toBeVisible();
    await expect(page.getByText('アイテム3')).toBeVisible();
  });

  test('TC-14.2: 完了状態のリロード', async ({ page }) => {
    await resetApp(page);
    await createItem(page, { title: '完了テスト' });

    // 完了にする
    await page.getByRole('button', { name: '完了' }).first().click();

    // リロード
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 完了状態が保持
    const data = await getStorageData(page);
    expect(data[0].completed).toBe(true);
  });

  test('TC-14.3: 削除後のリロード', async ({ page }) => {
    const data = [
      { id: 'persist-1', title: '削除対象', detail: '', dateType: 'none', deadline: null, completed: true, createdAt: '2026-03-14T00:00:00' },
    ];
    await setStorageAndReload(page, data);

    // 完済を削除
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '完済を削除' }).click();

    // リロード
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 復活しない
    await expect(page.getByText('削除対象')).not.toBeVisible();
    const updated = await getStorageData(page);
    expect(updated).toHaveLength(0);
  });

  test('TC-14.4: データ形式の確認', async ({ page }) => {
    await resetApp(page);
    await createItem(page, { title: 'フォーマットテスト', dateType: 'date', dateValue: todayStr() });

    const data = await getStorageData(page);
    expect(data).toHaveLength(1);

    const item = data[0];
    // 全フィールドが存在
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('detail');
    expect(item).toHaveProperty('dateType');
    expect(item).toHaveProperty('deadline');
    expect(item).toHaveProperty('completed');
    expect(item).toHaveProperty('createdAt');

    // UUID v4 形式
    expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // ISO 8601 形式
    expect(new Date(item.createdAt).toISOString()).toBeTruthy();
  });
});

// =============================================================
// 15. 複合シナリオ
// =============================================================
test.describe('15. 複合シナリオ', () => {
  test('TC-15.1: 全機能を通したE2Eテスト', async ({ page }) => {
    await resetApp(page);

    // 1. 初期状態 → アイテムなし
    await expect(page.getByText('本日中')).not.toBeVisible();
    await expect(page.getByText('明日まで')).not.toBeVisible();
    await expect(page.getByText('それ以外')).not.toBeVisible();

    // 2. アイテムA（本日、時まで）を登録
    const todayDatetime = `${todayStr()}T14:00`;
    await createItem(page, { title: 'アイテムA', dateType: 'datetime', dateValue: todayDatetime });
    await expect(page.getByText('本日中')).toBeVisible();
    await expect(page.getByText('アイテムA')).toBeVisible();

    // 3. アイテムB（明日、日のみ）を登録
    await createItem(page, { title: 'アイテムB', dateType: 'date', dateValue: tomorrowStr() });
    await expect(page.getByText('明日まで')).toBeVisible();
    await expect(page.getByText('アイテムB')).toBeVisible();

    // 4. アイテムC（日時なし）を登録
    await createItem(page, { title: 'アイテムC' });
    await expect(page.getByText('それ以外')).toBeVisible();
    await expect(page.getByText('アイテムC')).toBeVisible();

    // 5. 「未完了」タブ → 3件表示
    await page.getByText('未完了', { exact: true }).click();
    await expect(page.getByText('アイテムA')).toBeVisible();
    await expect(page.getByText('アイテムB')).toBeVisible();
    await expect(page.getByText('アイテムC')).toBeVisible();

    // 6. アイテムAを完了にする
    // アイテムAの行にある完了ボタンをクリック
    const itemARow = page.getByText('アイテムA').locator('..');
    await itemARow.getByRole('button', { name: /完了/ }).click();

    // 7. 「完了済」タブ → アイテムAのみ
    await page.getByText('完了済', { exact: true }).click();
    await expect(page.getByText('アイテムA')).toBeVisible();
    await expect(page.getByText('アイテムB')).not.toBeVisible();
    await expect(page.getByText('アイテムC')).not.toBeVisible();

    // 8. 「未完了」タブ → B, Cのみ
    await page.getByText('未完了', { exact: true }).click();
    await expect(page.getByText('アイテムA')).not.toBeVisible();
    await expect(page.getByText('アイテムB')).toBeVisible();
    await expect(page.getByText('アイテムC')).toBeVisible();

    // 9. アイテムBを編集
    await page.getByText('すべて').click();
    await page.getByText('アイテムB').click();
    await page.getByPlaceholder('タイトルを入力').fill('アイテムB（更新）');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('アイテムB（更新）')).toBeVisible();

    // 10. [完済を削除] → アイテムAが削除
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '完済を削除' }).click();
    await expect(page.getByText('アイテムA')).not.toBeVisible();

    // 11. 「すべて」タブ → B（更新）、Cの2件
    await page.getByText('すべて').click();
    await expect(page.getByText('アイテムB（更新）')).toBeVisible();
    await expect(page.getByText('アイテムC')).toBeVisible();
    const data = await getStorageData(page);
    expect(data).toHaveLength(2);

    // 12. リロード → 同じ状態
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('アイテムB（更新）')).toBeVisible();
    await expect(page.getByText('アイテムC')).toBeVisible();
  });

  test('TC-15.2: 大量データ', async ({ page }) => {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    const dayAfter = dayAfterTomorrowStr();
    const items = [];

    for (let i = 0; i < 50; i++) {
      let dateType, deadline;
      if (i % 3 === 0) {
        dateType = 'datetime';
        deadline = `${today}T${String(10 + (i % 12)).padStart(2, '0')}:00:00`;
      } else if (i % 3 === 1) {
        dateType = 'date';
        deadline = `${tomorrow}T00:00:00`;
      } else {
        dateType = 'none';
        deadline = null;
      }
      items.push({
        id: `bulk-${i}`,
        title: `タスク${String(i).padStart(3, '0')}`,
        detail: '',
        dateType,
        deadline,
        completed: i % 5 === 0,
        createdAt: `2026-03-14T${String(i % 24).padStart(2, '0')}:00:00`,
      });
    }
    await setStorageAndReload(page, items);

    // 各セクションが表示される
    await expect(page.getByText('本日中')).toBeVisible();
    await expect(page.getByText('明日まで')).toBeVisible();
    await expect(page.getByText('それ以外')).toBeVisible();

    // 「すべて」タブで50件表示
    const allItems = await page.locator('[class*="todo-item"], [class*="item"]').filter({ hasText: 'タスク' }).count();
    expect(allItems).toBe(50);
  });
});

// =============================================================
// 16. エラーケース・境界値
// =============================================================
test.describe('16. エラーケース・境界値', () => {
  test('TC-16.1: localStorage が空の場合', async ({ page }) => {
    await page.goto(APP_URL);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // エラーなく表示される
    await expect(page.getByText('TODOリスト')).toBeVisible();
    await expect(page.getByText('本日中')).not.toBeVisible();
  });

  test('TC-16.2: localStorage に不正データ', async ({ page }) => {
    await page.goto(APP_URL);
    await page.evaluate((key) => {
      localStorage.setItem(key, 'これは不正なJSONです{{{');
    }, STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // クラッシュせず表示される
    await expect(page.getByText('TODOリスト')).toBeVisible();
  });

  test('TC-16.3: タイトルの境界値（1文字）', async ({ page }) => {
    await resetApp(page);
    await createItem(page, { title: 'あ' });

    // 正常に保存される
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('あ')).toBeVisible();
  });

  test('TC-16.4: 詳細が空で保存', async ({ page }) => {
    await resetApp(page);
    await createItem(page, { title: '詳細なしタスク' });

    // 正常に保存される
    const modal = page.locator('#modal, .modal, [role="dialog"]');
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('詳細なしタスク')).toBeVisible();
  });
});
