import { expect, test } from '@playwright/test';

test.describe('ToDoアプリ VRT テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 2026-07-27 12:00:00 JST (UTC 2026-07-27T03:00:00Z) に時刻を固定
    await page.clock.install({ time: new Date('2026-07-27T03:00:00Z') });

    // アプリケーションを開き、localStorageをクリアして初期状態を保証
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    // localStorageクリアを反映するためにリロード
    await page.reload();
  });

  test('初期表示（タスクが空の状態）', async ({ page }) => {
    // 空の状態のスクリーンショット
    await expect(page).toHaveScreenshot('01-empty-state.png');
  });

  test('新規登録ダイアログの表示', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('#btn-new');

    // ダイアログが表示されるのを待つ
    await expect(page.locator('#todo-detail-dialog')).toBeVisible();

    // ダイアログが開いた状態のスクリーンショット
    await expect(page).toHaveScreenshot('02-new-dialog-state.png');
  });

  test('タスクを登録した状態とタブ切り替え', async ({ page }) => {
    // 1. タスクの追加
    await page.click('#btn-new');
    await page.fill('#todo-title', '本日締切のタスク');

    // 日時を「日だけ指定」にする
    await page.click('#due-date');

    // 日付を入力 (Playwrightのhidden-pickerに値を設定)
    // 2026-07-27（本日中）に設定
    await page.locator('#due-date-picker').fill('2026-07-27');

    // Quillエディタに詳細を入力
    await page.fill('.ql-editor', 'これは本日中のタスク詳細です。');

    // 保存ボタンをクリック (有効になるまで少し待つ)
    const saveBtn = page.locator('#btn-save-todo');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // ダイアログが閉じるのを待つ
    await expect(page.locator('#todo-detail-dialog')).toBeHidden();

    // タスクが追加されたメイン表示
    await expect(page).toHaveScreenshot('03-task-added-today.png');

    // 2. 完了状態にする
    // 最初のタスクの「完了」ボタンをクリック
    await page.click('text=完了');

    // 完了済み状態（取り消し線が入った状態）
    await expect(page).toHaveScreenshot('04-task-completed.png');

    // 3. タブ切り替え：「完了済」タブ
    await page.click('#tab-completed');
    await expect(page).toHaveScreenshot('05-tab-completed.png');

    // 4. タブ切り替え：「未完了」タブ
    await page.click('#tab-active');
    await expect(page).toHaveScreenshot('06-tab-active-empty.png');
  });
});
