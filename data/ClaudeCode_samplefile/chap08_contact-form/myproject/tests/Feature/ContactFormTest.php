<?php

namespace Tests\Feature;

use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * お問い合わせフォーム機能テスト
 *
 * テストケース.md に基づく全63件の機能テスト
 */
class ContactFormTest extends TestCase
{
    use RefreshDatabase;

    // ========================================
    // 1. お問い合わせフォーム側
    // ========================================

    // ----------------------------------------
    // 1.1 入力画面（GET /）
    // ----------------------------------------

    /** @test 1-1-1 入力フォームが表示される */
    public function test_1_1_1_入力フォームが表示される(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertSee('名前');
        $response->assertSee('メールアドレス');
        $response->assertSee('件名');
        $response->assertSee('本文');
    }

    /** @test 1-1-2 各項目に必須マークが表示されている */
    public function test_1_1_2_各項目に必須マークが表示されている(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        // 必須マーク（*）がHTMLに含まれていることを確認
        $response->assertSee('*', false);
    }

    // ----------------------------------------
    // 1.2 バリデーション（POST /contact/confirm）
    // ----------------------------------------

    // --- 必須チェック ---

    /** @test 1-2-1 全項目未入力でエラーメッセージが表示される */
    public function test_1_2_1_全項目未入力でエラーメッセージが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => '',
            'email' => '',
            'subject' => '',
            'body' => '',
        ]);

        $response->assertSessionHasErrors(['name', 'email', 'subject', 'body']);
    }

    /** @test 1-2-2 名前未入力でエラーメッセージが表示される */
    public function test_1_2_2_名前未入力でエラーメッセージが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => '',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['name']);
        $this->assertEquals(
            '名前を入力してください。',
            session('errors')->get('name')[0]
        );
    }

    /** @test 1-2-3 メールアドレス未入力でエラーメッセージが表示される */
    public function test_1_2_3_メールアドレス未入力でエラーメッセージが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => '',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertEquals(
            'メールアドレスを入力してください。',
            session('errors')->get('email')[0]
        );
    }

    /** @test 1-2-4 件名未入力でエラーメッセージが表示される */
    public function test_1_2_4_件名未入力でエラーメッセージが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => '',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['subject']);
        $this->assertEquals(
            '件名を入力してください。',
            session('errors')->get('subject')[0]
        );
    }

    /** @test 1-2-5 本文未入力でエラーメッセージが表示される */
    public function test_1_2_5_本文未入力でエラーメッセージが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => '',
        ]);

        $response->assertSessionHasErrors(['body']);
        $this->assertEquals(
            '本文を入力してください。',
            session('errors')->get('body')[0]
        );
    }

    // --- 形式チェック ---

    /** @test 1-2-6 メールアドレス形式不正（abc）でエラーが表示される */
    public function test_1_2_6_メールアドレス形式不正でエラーが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'abc',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertEquals(
            '正しいメールアドレスの形式で入力してください。',
            session('errors')->get('email')[0]
        );
    }

    /** @test 1-2-7 メールアドレス形式不正（@なし）でエラーが表示される */
    public function test_1_2_7_メールアドレス形式不正_アットマークなし_でエラーが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test.example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['email']);
    }

    /** @test 1-2-8 メールアドレス正常形式でバリデーションエラーが出ない */
    public function test_1_2_8_メールアドレス正常形式でバリデーションエラーが出ない(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionDoesntHaveErrors(['email']);
    }

    // --- 文字数チェック ---

    /** @test 1-2-9 名前255文字でエラーなく確認画面に遷移する */
    public function test_1_2_9_名前255文字でエラーなく確認画面に遷移する(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => str_repeat('あ', 255),
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionDoesntHaveErrors(['name']);
    }

    /** @test 1-2-10 名前256文字でエラーが表示される */
    public function test_1_2_10_名前256文字でエラーが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => str_repeat('あ', 256),
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['name']);
        $this->assertEquals(
            '名前は255文字以内で入力してください。',
            session('errors')->get('name')[0]
        );
    }

    /** @test 1-2-11 メールアドレス255文字でエラーなく確認画面に遷移する */
    public function test_1_2_11_メールアドレス255文字でエラーなく確認画面に遷移する(): void
    {
        // 255文字のメールアドレスを生成（user...@example.com 形式）
        $email = str_repeat('a', 243) . '@example.com';

        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => $email,
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionDoesntHaveErrors(['email']);
    }

    /** @test 1-2-12 メールアドレス256文字でエラーが表示される */
    public function test_1_2_12_メールアドレス256文字でエラーが表示される(): void
    {
        $email = str_repeat('a', 244) . '@example.com';

        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => $email,
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertEquals(
            'メールアドレスは255文字以内で入力してください。',
            session('errors')->get('email')[0]
        );
    }

    /** @test 1-2-13 件名255文字でエラーなく確認画面に遷移する */
    public function test_1_2_13_件名255文字でエラーなく確認画面に遷移する(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => str_repeat('あ', 255),
            'body' => 'テスト本文',
        ]);

        $response->assertSessionDoesntHaveErrors(['subject']);
    }

    /** @test 1-2-14 件名256文字でエラーが表示される */
    public function test_1_2_14_件名256文字でエラーが表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => str_repeat('あ', 256),
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['subject']);
        $this->assertEquals(
            '件名は255文字以内で入力してください。',
            session('errors')->get('subject')[0]
        );
    }

    // --- 入力値の復元 ---

    /** @test 1-2-15 バリデーションエラー後の入力値が復元される */
    public function test_1_2_15_バリデーションエラー後の入力値が復元される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => '',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors(['name']);
        // old入力値がセッションに保存されていることを確認
        $this->assertEquals('test@example.com', session()->getOldInput('email'));
        $this->assertEquals('テスト件名', session()->getOldInput('subject'));
        $this->assertEquals('テスト本文', session()->getOldInput('body'));
    }

    // ----------------------------------------
    // 1.3 確認画面（POST /contact/confirm → 確認画面表示）
    // ----------------------------------------

    /** @test 1-3-1 確認画面に入力内容が表示される */
    public function test_1_3_1_確認画面に入力内容が表示される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertStatus(200);
        $response->assertSee('入力内容の確認');
    }

    /** @test 1-3-2 確認画面で名前が正しく表示されている */
    public function test_1_3_2_確認画面で名前が正しく表示されている(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSee('テスト太郎');
    }

    /** @test 1-3-3 確認画面でメールアドレスが正しく表示されている */
    public function test_1_3_3_確認画面でメールアドレスが正しく表示されている(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSee('test@example.com');
    }

    /** @test 1-3-4 確認画面で件名が正しく表示されている */
    public function test_1_3_4_確認画面で件名が正しく表示されている(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSee('テスト件名');
    }

    /** @test 1-3-5 確認画面で本文が正しく表示されている */
    public function test_1_3_5_確認画面で本文が正しく表示されている(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ]);

        $response->assertSee('テスト本文です。');
    }

    /** @test 1-3-6 確認画面で本文の改行が保持される */
    public function test_1_3_6_確認画面で本文の改行が保持される(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => "1行目\n2行目",
        ]);

        $response->assertStatus(200);
        // nl2br によって改行が <br /> に変換されることを確認
        $response->assertSee('1行目<br />' . "\n" . '2行目', false);
    }

    /** @test 1-3-7 確認画面でHTMLがエスケープされる */
    public function test_1_3_7_確認画面でHTMLがエスケープされる(): void
    {
        $response = $this->post('/contact/confirm', [
            'name' => "<script>alert('XSS')</script>",
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertStatus(200);
        // スクリプトタグがそのまま出力されないことを確認
        $response->assertDontSee("<script>alert('XSS')</script>", false);
        // エスケープされた文字列が含まれていることを確認
        $response->assertSee('&lt;script&gt;', false);
    }

    /** @test 1-3-8 確認画面で「戻る」ボタンを押すと入力画面に戻る */
    public function test_1_3_8_確認画面で戻るボタンを押すと入力画面に戻る(): void
    {
        // まず確認画面を表示してセッションにデータを保存
        $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        // 「戻る」ボタン（back パラメータ付き）で送信
        $response = $this->post('/contact', [
            'back' => '1',
        ]);

        $response->assertRedirect(route('contact.create'));
    }

    /** @test 1-3-9 確認画面で「送信する」ボタンを押すと完了画面にリダイレクトされる */
    public function test_1_3_9_確認画面で送信するボタンを押すと完了画面にリダイレクトされる(): void
    {
        // 確認画面を表示してセッションにデータを保存
        $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        // 「送信する」ボタンで送信
        $response = $this->post('/contact');

        $response->assertRedirect(route('contact.thanks'));
    }

    // ----------------------------------------
    // 1.4 送信処理・完了画面（POST /contact → GET /contact/thanks）
    // ----------------------------------------

    /** @test 1-4-1 contactsテーブルに入力データが保存される */
    public function test_1_4_1_contactsテーブルに入力データが保存される(): void
    {
        // セッションにデータを保存
        $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $this->post('/contact');

        $this->assertDatabaseHas('contacts', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);
    }

    /** @test 1-4-2 保存されたデータのステータスが「新規」になっている */
    public function test_1_4_2_保存されたデータのステータスが新規になっている(): void
    {
        $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $this->post('/contact');

        $this->assertDatabaseHas('contacts', [
            'name' => 'テスト太郎',
            'status' => '新規',
        ]);
    }

    /** @test 1-4-3 完了画面に「お問い合わせありがとうございました」と表示される */
    public function test_1_4_3_完了画面にお問い合わせありがとうございましたと表示される(): void
    {
        $response = $this->get('/contact/thanks');

        $response->assertStatus(200);
        $response->assertSee('お問い合わせありがとうございました');
    }

    /** @test 1-4-4 完了画面にお問い合わせフォームへのリンクが表示されている */
    public function test_1_4_4_完了画面にフォームへのリンクが表示されている(): void
    {
        $response = $this->get('/contact/thanks');

        $response->assertStatus(200);
        $response->assertSee(route('contact.create'), false);
    }

    /** @test 1-4-5 送信完了後にセッションデータがクリアされている */
    public function test_1_4_5_送信完了後にセッションデータがクリアされている(): void
    {
        $this->post('/contact/confirm', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $this->post('/contact');

        // セッションからcontact_dataが削除されていることを確認
        $this->assertNull(session('contact_data'));
    }

    // ----------------------------------------
    // 1.5 CSRF保護
    // ----------------------------------------

    /** @test 1-5-1 CSRFトークンなしでPOST /contact/confirmに419エラーが返される */
    public function test_1_5_1_CSRFトークンなしで確認リクエストすると419エラーが返される(): void
    {
        // テスト環境ではCSRF検証がバイパスされるため、ミドルウェアを差し替えて検証する
        $this->app->bind(
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
            function ($app) {
                return new class ($app, $app['encrypter']) extends \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken {
                    protected function runningUnitTests()
                    {
                        return false;
                    }
                };
            }
        );

        $response = $this->call('POST', '/contact/confirm', [], [], [], [
            'HTTP_ACCEPT' => 'text/html',
        ]);

        $response->assertStatus(419);
    }

    /** @test 1-5-2 CSRFトークンなしでPOST /contactに419エラーが返される */
    public function test_1_5_2_CSRFトークンなしで送信リクエストすると419エラーが返される(): void
    {
        // テスト環境ではCSRF検証がバイパスされるため、ミドルウェアを差し替えて検証する
        $this->app->bind(
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
            function ($app) {
                return new class ($app, $app['encrypter']) extends \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken {
                    protected function runningUnitTests()
                    {
                        return false;
                    }
                };
            }
        );

        $response = $this->call('POST', '/contact', [], [], [], [
            'HTTP_ACCEPT' => 'text/html',
        ]);

        $response->assertStatus(419);
    }

    // ----------------------------------------
    // 1.6 不正アクセス
    // ----------------------------------------

    /** @test 1-6-1 完了画面への直接アクセスでエラーにならない */
    public function test_1_6_1_完了画面への直接アクセスでエラーにならない(): void
    {
        $response = $this->get('/contact/thanks');

        $response->assertStatus(200);
    }

    /** @test 1-6-2 セッションなしでの送信がエラーにならず適切に処理される */
    public function test_1_6_2_セッションなしでの送信がエラーにならず適切に処理される(): void
    {
        // セッションにデータがない状態でPOST /contact
        $response = $this->post('/contact');

        // フォームにリダイレクトされる
        $response->assertRedirect(route('contact.create'));
    }

    // ========================================
    // 2. 管理ページ側
    // ========================================

    /**
     * 管理者としてログインするヘルパー
     */
    private function loginAsAdmin(): void
    {
        config(['app.admin_password' => 'test-password']);
        $this->post('/admin/login', ['password' => 'test-password']);
    }

    // ----------------------------------------
    // 2.1 ログイン画面（GET /admin/login）
    // ----------------------------------------

    /** @test 2-1-1 ログイン画面にパスワード入力欄とログインボタンが表示される */
    public function test_2_1_1_ログイン画面が表示される(): void
    {
        $response = $this->get('/admin/login');

        $response->assertStatus(200);
        $response->assertSee('パスワード');
        $response->assertSee('ログイン');
    }

    /** @test 2-1-2 正しいパスワードでログインすると管理画面にリダイレクトされる */
    public function test_2_1_2_正しいパスワードでログインできる(): void
    {
        config(['app.admin_password' => 'test-password']);

        $response = $this->post('/admin/login', [
            'password' => 'test-password',
        ]);

        $response->assertRedirect(route('admin.contacts.index'));
    }

    /** @test 2-1-3 誤ったパスワードでログインするとエラーが表示される */
    public function test_2_1_3_誤ったパスワードでログインするとエラーが表示される(): void
    {
        config(['app.admin_password' => 'test-password']);

        $response = $this->post('/admin/login', [
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors(['password']);
    }

    /** @test 2-1-4 パスワード未入力でログインするとバリデーションエラーが表示される */
    public function test_2_1_4_パスワード未入力でバリデーションエラーが表示される(): void
    {
        $response = $this->post('/admin/login', [
            'password' => '',
        ]);

        $response->assertSessionHasErrors(['password']);
    }

    // ----------------------------------------
    // 2.2 認証・アクセス制御
    // ----------------------------------------

    /** @test 2-2-1 未ログインで一覧にアクセスするとログイン画面にリダイレクトされる */
    public function test_2_2_1_未ログインで一覧にアクセスするとリダイレクトされる(): void
    {
        $response = $this->get('/admin/contacts');

        $response->assertRedirect(route('admin.login'));
    }

    /** @test 2-2-2 未ログインで詳細にアクセスするとログイン画面にリダイレクトされる */
    public function test_2_2_2_未ログインで詳細にアクセスするとリダイレクトされる(): void
    {
        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        $response->assertRedirect(route('admin.login'));
    }

    /** @test 2-2-3 未ログインでステータス更新するとログイン画面にリダイレクトされる */
    public function test_2_2_3_未ログインでステータス更新するとリダイレクトされる(): void
    {
        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '対応中',
        ]);

        $response->assertRedirect(route('admin.login'));
    }

    /** @test 2-2-4 ログアウトするとログイン画面にリダイレクトされる */
    public function test_2_2_4_ログアウトするとログイン画面にリダイレクトされる(): void
    {
        $this->loginAsAdmin();

        $response = $this->post('/admin/logout');

        $response->assertRedirect(route('admin.login'));
    }

    /** @test 2-2-5 ログアウト後に管理画面にアクセスするとログイン画面にリダイレクトされる */
    public function test_2_2_5_ログアウト後に管理画面にアクセスするとリダイレクトされる(): void
    {
        $this->loginAsAdmin();
        $this->post('/admin/logout');

        $response = $this->get('/admin/contacts');

        $response->assertRedirect(route('admin.login'));
    }

    // ----------------------------------------
    // 2.3 お問い合わせ一覧（GET /admin/contacts）
    // ----------------------------------------

    // --- 一覧表示 ---

    /** @test 2-3-1 ログイン後に一覧画面が表示される */
    public function test_2_3_1_一覧画面が表示される(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $response->assertSee('お問い合わせ一覧');
    }

    /** @test 2-3-2 一覧にID・名前・件名・ステータス・受信日時が表示されている */
    public function test_2_3_2_一覧の表示項目が正しい(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get('/admin/contacts');

        $response->assertSee((string) $contact->id);
        $response->assertSee('テスト太郎');
        $response->assertSee('テスト件名');
        $response->assertSee('新規');
        $response->assertSee($contact->created_at->format('Y/m/d H:i'));
    }

    /** @test 2-3-3 ステータス「新規」が赤色のバッジで表示される */
    public function test_2_3_3_ステータス新規が赤色バッジで表示される(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '新規',
        ]);

        $response = $this->get('/admin/contacts');

        $response->assertSee('badge-new', false);
    }

    /** @test 2-3-4 ステータス「対応中」がオレンジ色のバッジで表示される */
    public function test_2_3_4_ステータス対応中がオレンジ色バッジで表示される(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '対応中',
        ]);

        $response = $this->get('/admin/contacts');

        $response->assertSee('badge-progress', false);
    }

    /** @test 2-3-5 ステータス「解決済み」が緑色のバッジで表示される */
    public function test_2_3_5_ステータス解決済みが緑色バッジで表示される(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '解決済み',
        ]);

        $response = $this->get('/admin/contacts');

        $response->assertSee('badge-resolved', false);
    }

    /** @test 2-3-6 一覧の名前をクリックすると詳細画面に遷移するリンクがある */
    public function test_2_3_6_詳細へのリンクが表示される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get('/admin/contacts');

        $response->assertSee(route('admin.contacts.show', $contact), false);
    }

    /** @test 2-3-7 データが0件の場合にエラーにならず適切に表示される */
    public function test_2_3_7_データなしの場合に適切に表示される(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $response->assertSee('お問い合わせはまだありません');
    }

    // --- ページネーション ---

    /** @test 2-3-8 11件以上のデータでページネーションが表示される */
    public function test_2_3_8_ページネーションが表示される(): void
    {
        $this->loginAsAdmin();

        // 11件のデータを作成
        for ($i = 0; $i < 11; $i++) {
            Contact::create([
                'name' => "テスト{$i}",
                'email' => "test{$i}@example.com",
                'subject' => "件名{$i}",
                'body' => "本文{$i}",
            ]);
        }

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        // ページネーションリンクが存在することを確認
        $response->assertSee('page=2', false);
    }

    /** @test 2-3-9 1ページに10件表示される */
    public function test_2_3_9_1ページあたり10件表示される(): void
    {
        $this->loginAsAdmin();

        for ($i = 0; $i < 15; $i++) {
            Contact::create([
                'name' => "テスト{$i}",
                'email' => "test{$i}@example.com",
                'subject' => "件名{$i}",
                'body' => "本文{$i}",
            ]);
        }

        $response = $this->get('/admin/contacts');

        // tbody内の<tr>の数で1ページあたりの表示件数を確認
        $content = $response->getContent();
        preg_match('/<tbody>(.*?)<\/tbody>/s', $content, $match);
        $rowCount = substr_count($match[1] ?? '', '<tr>');
        $this->assertEquals(10, $rowCount);
    }

    /** @test 2-3-10 2ページ目への遷移ができる */
    public function test_2_3_10_2ページ目に遷移できる(): void
    {
        $this->loginAsAdmin();

        for ($i = 0; $i < 15; $i++) {
            Contact::create([
                'name' => "テスト{$i}",
                'email' => "test{$i}@example.com",
                'subject' => "件名{$i}",
                'body' => "本文{$i}",
            ]);
        }

        $response = $this->get('/admin/contacts?page=2');

        $response->assertStatus(200);
        // 2ページ目のtbody内の<tr>数を確認（残り5件）
        $content = $response->getContent();
        preg_match('/<tbody>(.*?)<\/tbody>/s', $content, $match);
        $rowCount = substr_count($match[1] ?? '', '<tr>');
        $this->assertEquals(5, $rowCount);
    }

    /** @test 2-3-11 検索条件がページネーション遷移で保持される */
    public function test_2_3_11_検索条件がページネーションで保持される(): void
    {
        $this->loginAsAdmin();

        // 「田中」を含むデータを11件以上作成
        for ($i = 0; $i < 15; $i++) {
            Contact::create([
                'name' => "田中{$i}",
                'email' => "tanaka{$i}@example.com",
                'subject' => "件名{$i}",
                'body' => "本文{$i}",
            ]);
        }

        $response = $this->get('/admin/contacts?name=田中&page=2');

        $response->assertStatus(200);
        // ページネーションリンクに検索条件が含まれていることを確認
        $response->assertSee('name=', false);
    }

    // --- 検索・フィルタ ---

    /** @test 2-3-12 名前で検索できる */
    public function test_2_3_12_名前で検索できる(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => '田中太郎',
            'email' => 'tanaka@example.com',
            'subject' => '件名A',
            'body' => '本文A',
        ]);
        Contact::create([
            'name' => '佐藤花子',
            'email' => 'sato@example.com',
            'subject' => '件名B',
            'body' => '本文B',
        ]);

        $response = $this->get('/admin/contacts?name=田中');

        $response->assertSee('田中太郎');
        $response->assertDontSee('佐藤花子');
    }

    /** @test 2-3-13 名前の部分一致で検索できる */
    public function test_2_3_13_名前の部分一致で検索できる(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => '田中太郎',
            'email' => 'tanaka@example.com',
            'subject' => '件名A',
            'body' => '本文A',
        ]);
        Contact::create([
            'name' => '田村花子',
            'email' => 'tamura@example.com',
            'subject' => '件名B',
            'body' => '本文B',
        ]);
        Contact::create([
            'name' => '佐藤一郎',
            'email' => 'sato@example.com',
            'subject' => '件名C',
            'body' => '本文C',
        ]);

        $response = $this->get('/admin/contacts?name=田');

        $response->assertSee('田中太郎');
        $response->assertSee('田村花子');
        $response->assertDontSee('佐藤一郎');
    }

    /** @test 2-3-14 開始日で絞り込みできる */
    public function test_2_3_14_開始日で絞り込みできる(): void
    {
        $this->loginAsAdmin();

        $this->travelTo(Carbon::parse('2026-01-01'));
        Contact::create([
            'name' => '古いデータ',
            'email' => 'old@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);

        $this->travelTo(Carbon::parse('2026-02-15'));
        Contact::create([
            'name' => '新しいデータ',
            'email' => 'new@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);
        $this->travelBack();

        $response = $this->get('/admin/contacts?date_from=2026-02-01');

        $response->assertSee('新しいデータ');
        $response->assertDontSee('古いデータ');
    }

    /** @test 2-3-15 終了日で絞り込みできる */
    public function test_2_3_15_終了日で絞り込みできる(): void
    {
        $this->loginAsAdmin();

        $this->travelTo(Carbon::parse('2026-01-15'));
        Contact::create([
            'name' => '古いデータ',
            'email' => 'old@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);

        $this->travelTo(Carbon::parse('2026-02-15'));
        Contact::create([
            'name' => '新しいデータ',
            'email' => 'new@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);
        $this->travelBack();

        $response = $this->get('/admin/contacts?date_to=2026-01-31');

        $response->assertSee('古いデータ');
        $response->assertDontSee('新しいデータ');
    }

    /** @test 2-3-16 日付範囲で絞り込みできる */
    public function test_2_3_16_日付範囲で絞り込みできる(): void
    {
        $this->loginAsAdmin();

        $this->travelTo(Carbon::parse('2026-01-01'));
        Contact::create([
            'name' => '範囲前',
            'email' => 'before@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);

        $this->travelTo(Carbon::parse('2026-01-15'));
        Contact::create([
            'name' => '範囲内',
            'email' => 'within@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);

        $this->travelTo(Carbon::parse('2026-02-15'));
        Contact::create([
            'name' => '範囲後',
            'email' => 'after@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);
        $this->travelBack();

        $response = $this->get('/admin/contacts?date_from=2026-01-10&date_to=2026-01-31');

        $response->assertSee('範囲内');
        $response->assertDontSee('範囲前');
        $response->assertDontSee('範囲後');
    }

    /** @test 2-3-17 ステータス（単一）で絞り込みできる */
    public function test_2_3_17_ステータス単一で絞り込みできる(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => '新規のデータ',
            'email' => 'new@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '新規',
        ]);
        Contact::create([
            'name' => '対応中のデータ',
            'email' => 'progress@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '対応中',
        ]);

        $response = $this->get('/admin/contacts?' . http_build_query(['status' => ['新規']]));

        $response->assertSee('新規のデータ');
        $response->assertDontSee('対応中のデータ');
    }

    /** @test 2-3-18 ステータス（複数）で絞り込みできる */
    public function test_2_3_18_ステータス複数で絞り込みできる(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => '新規のデータ',
            'email' => 'new@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '新規',
        ]);
        Contact::create([
            'name' => '対応中のデータ',
            'email' => 'progress@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '対応中',
        ]);
        Contact::create([
            'name' => '解決済みのデータ',
            'email' => 'resolved@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '解決済み',
        ]);

        $response = $this->get('/admin/contacts?' . http_build_query(['status' => ['新規', '対応中']]));

        $response->assertSee('新規のデータ');
        $response->assertSee('対応中のデータ');
        $response->assertDontSee('解決済みのデータ');
    }

    /** @test 2-3-19 複合検索ができる */
    public function test_2_3_19_複合検索ができる(): void
    {
        $this->loginAsAdmin();

        $this->travelTo(Carbon::parse('2026-01-15'));
        Contact::create([
            'name' => '田中太郎',
            'email' => 'tanaka@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '新規',
        ]);
        Contact::create([
            'name' => '田中花子',
            'email' => 'tanaka2@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '解決済み',
        ]);
        Contact::create([
            'name' => '佐藤一郎',
            'email' => 'sato@example.com',
            'subject' => '件名',
            'body' => '本文',
            'status' => '新規',
        ]);
        $this->travelBack();

        $query = http_build_query([
            'name' => '田中',
            'date_from' => '2026-01-01',
            'date_to' => '2026-01-31',
            'status' => ['新規'],
        ]);

        $response = $this->get("/admin/contacts?{$query}");

        $response->assertSee('田中太郎');
        $response->assertDontSee('田中花子');
        $response->assertDontSee('佐藤一郎');
    }

    /** @test 2-3-20 検索条件クリアで全件表示される */
    public function test_2_3_20_検索条件クリアで全件表示される(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);
        Contact::create([
            'name' => 'テスト花子',
            'email' => 'test2@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);

        // クリアボタンは条件なしで一覧にアクセスすることと同等
        $response = $this->get('/admin/contacts');

        $response->assertSee('テスト太郎');
        $response->assertSee('テスト花子');
    }

    /** @test 2-3-21 検索結果が0件でもエラーにならない */
    public function test_2_3_21_該当なしの検索でエラーにならない(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => '件名',
            'body' => '本文',
        ]);

        $response = $this->get('/admin/contacts?name=存在しない名前');

        $response->assertStatus(200);
        $response->assertSee('お問い合わせはまだありません');
    }

    // ----------------------------------------
    // 2.4 お問い合わせ詳細（GET /admin/contacts/{id}）
    // ----------------------------------------

    /** @test 2-4-1 詳細画面が表示される */
    public function test_2_4_1_詳細画面が表示される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        $response->assertStatus(200);
        $response->assertSee('お問い合わせ詳細');
    }

    /** @test 2-4-2 詳細画面にID・名前・メールアドレス・件名・本文・受信日時が表示されている */
    public function test_2_4_2_詳細画面の表示項目が正しい(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        $response->assertSee((string) $contact->id);
        $response->assertSee('テスト太郎');
        $response->assertSee('test@example.com');
        $response->assertSee('テスト件名');
        $response->assertSee('テスト本文');
        $response->assertSee($contact->created_at->format('Y/m/d H:i'));
    }

    /** @test 2-4-3 詳細画面で本文の改行が反映される */
    public function test_2_4_3_詳細画面で本文の改行が表示される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => "1行目\n2行目",
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        // nl2br によって改行が <br /> に変換されることを確認
        $response->assertSee('1行目<br />' . "\n" . '2行目', false);
    }

    /** @test 2-4-4 詳細画面でHTMLタグがエスケープされる */
    public function test_2_4_4_詳細画面でHTMLがエスケープされる(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => "<script>alert('XSS')</script>",
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        $response->assertDontSee("<script>alert('XSS')</script>", false);
        $response->assertSee('&lt;script&gt;', false);
    }

    /** @test 2-4-5 ステータスドロップダウンに3つの選択肢が表示される */
    public function test_2_4_5_ステータスドロップダウンが表示される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        $response->assertSee('<option', false);
        $response->assertSee('新規');
        $response->assertSee('対応中');
        $response->assertSee('解決済み');
    }

    /** @test 2-4-6 現在のステータスが選択状態になっている */
    public function test_2_4_6_現在のステータスが選択状態になっている(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '対応中',
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        // 「対応中」のoptionにselectedが付いていることを確認
        $response->assertSee('selected', false);
    }

    /** @test 2-4-7 「一覧に戻る」リンクが表示される */
    public function test_2_4_7_一覧に戻るリンクが表示される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get("/admin/contacts/{$contact->id}");

        $response->assertSee(route('admin.contacts.index'), false);
        $response->assertSee('一覧に戻る');
    }

    /** @test 2-4-8 存在しないIDへのアクセスで404エラーが返される */
    public function test_2_4_8_存在しないIDへのアクセスで404が返される(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts/99999');

        $response->assertStatus(404);
    }

    // ----------------------------------------
    // 2.5 ステータス更新（PATCH /admin/contacts/{id}）
    // ----------------------------------------

    /** @test 2-5-1 「新規」→「対応中」に変更できる */
    public function test_2_5_1_新規から対応中に変更できる(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '新規',
        ]);

        $response = $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '対応中',
        ]);

        $response->assertRedirect(route('admin.contacts.show', $contact));
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => '対応中',
        ]);
    }

    /** @test 2-5-2 「対応中」→「解決済み」に変更できる */
    public function test_2_5_2_対応中から解決済みに変更できる(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '対応中',
        ]);

        $response = $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '解決済み',
        ]);

        $response->assertRedirect(route('admin.contacts.show', $contact));
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => '解決済み',
        ]);
    }

    /** @test 2-5-3 「解決済み」→「新規」に変更できる */
    public function test_2_5_3_解決済みから新規に変更できる(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '解決済み',
        ]);

        $response = $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '新規',
        ]);

        $response->assertRedirect(route('admin.contacts.show', $contact));
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => '新規',
        ]);
    }

    /** @test 2-5-4 ステータス更新後に成功メッセージが表示される */
    public function test_2_5_4_ステータス更新後に成功メッセージが表示される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '新規',
        ]);

        $response = $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '対応中',
        ]);

        $response->assertSessionHas('success', 'ステータスを更新しました。');
    }

    /** @test 2-5-5 ステータス更新が一覧画面にも反映される */
    public function test_2_5_5_ステータス更新がDB及び一覧に反映される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '新規',
        ]);

        $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '解決済み',
        ]);

        // 一覧画面で確認
        $response = $this->get('/admin/contacts');
        $response->assertSee('badge-resolved', false);
    }

    /** @test 2-5-6 不正なステータス値でバリデーションエラーが返される */
    public function test_2_5_6_不正なステータス値でバリデーションエラーが返される(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
            'status' => '新規',
        ]);

        $response = $this->patch("/admin/contacts/{$contact->id}", [
            'status' => '不正値',
        ]);

        $response->assertSessionHasErrors(['status']);
    }

    // ----------------------------------------
    // 2.6 ログアウト（POST /admin/logout）
    // ----------------------------------------

    /** @test 2-6-1 ログアウトするとログイン画面にリダイレクトされる */
    public function test_2_6_1_ログアウトでログイン画面にリダイレクトされる(): void
    {
        $this->loginAsAdmin();

        $response = $this->post('/admin/logout');

        $response->assertRedirect(route('admin.login'));
    }

    /** @test 2-6-2 ログアウト後に管理画面URLにアクセスするとログイン画面にリダイレクトされる */
    public function test_2_6_2_ログアウト後のセッションが無効になっている(): void
    {
        $this->loginAsAdmin();
        $this->post('/admin/logout');

        $response = $this->get('/admin/contacts');

        $response->assertRedirect(route('admin.login'));
    }
}
