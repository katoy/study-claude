<?php

namespace Tests\Feature;

use App\Models\Contact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CSVエクスポート機能テスト
 */
class CSVExportTest extends TestCase
{
    use RefreshDatabase;

    private function loginAsAdmin(): void
    {
        config(['app.admin_password' => 'test-password']);
        $this->post('/admin/login', ['password' => 'test-password']);
    }

    // ----------------------------------------
    // CSVダウンロード
    // ----------------------------------------

    /** @test CSVファイルがダウンロードされること */
    public function test_CSVファイルがダウンロードされること(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response = $this->get('/admin/contacts/export');

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $response->assertDownload();
    }

    /** @test 管理者しか使用できないこと */
    public function test_管理者しか使用できないこと(): void
    {
        $response = $this->get('/admin/contacts/export');

        $response->assertRedirect(route('admin.login'));
    }

    /** @test CSVにヘッダー行が含まれること */
    public function test_CSVにヘッダー行が含まれること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts/export');

        $response->assertStatus(200);

        $content = $response->streamedContent();
        $lines = explode("\n", $content);
        // BOMを除去してヘッダー行を検証
        $header = ltrim($lines[0], "\xEF\xBB\xBF");
        $columns = str_getcsv($header);

        $this->assertEquals('ID', $columns[0]);
        $this->assertEquals('名前', $columns[1]);
        $this->assertEquals('メールアドレス', $columns[2]);
        $this->assertEquals('件名', $columns[3]);
        $this->assertEquals('ステータス', $columns[4]);
        $this->assertEquals('受信日時', $columns[5]);
    }

    /** @test ステータスで絞り込みができること */
    public function test_ステータスで絞り込みができること(): void
    {
        $this->loginAsAdmin();

        Contact::create([
            'name' => '新規ユーザー',
            'email' => 'new@example.com',
            'subject' => '件名A',
            'body' => '本文A',
            'status' => '新規',
        ]);

        Contact::create([
            'name' => '対応中ユーザー',
            'email' => 'progress@example.com',
            'subject' => '件名B',
            'body' => '本文B',
            'status' => '対応中',
        ]);

        Contact::create([
            'name' => '解決済みユーザー',
            'email' => 'done@example.com',
            'subject' => '件名C',
            'body' => '本文C',
            'status' => '解決済み',
        ]);

        $response = $this->get('/admin/contacts/export?status=対応中');

        $response->assertStatus(200);

        $content = $response->streamedContent();
        $lines = array_filter(explode("\n", $content), fn ($line) => $line !== '');
        // ヘッダー行 + データ1行 = 2行
        $this->assertCount(2, $lines);
        $this->assertStringContainsString('対応中ユーザー', $content);
        $this->assertStringNotContainsString('新規ユーザー', $content);
        $this->assertStringNotContainsString('解決済みユーザー', $content);
    }

    /** @test 文字コードがUTF-8のBOM付きであること */
    public function test_文字コードがUTF8のBOM付きであること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts/export');

        $response->assertStatus(200);

        $content = $response->streamedContent();
        // UTF-8 BOM: 0xEF 0xBB 0xBF
        $this->assertTrue(
            str_starts_with($content, "\xEF\xBB\xBF"),
            'CSVがUTF-8 BOM付きではありません'
        );
    }

    // ----------------------------------------
    // CSVダウンロードUI（管理画面一覧）
    // ----------------------------------------

    /** @test 一覧画面にCSVダウンロードボタンが表示されること */
    public function test_一覧画面にCSVダウンロードボタンが表示されること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $response->assertSee('CSVダウンロード');
    }

    /** @test CSVダウンロードボタンのリンク先がエクスポートURLであること */
    public function test_CSVダウンロードボタンのリンク先がエクスポートURLであること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $response->assertSee(route('admin.contacts.export'), false);
    }

    /** @test CSVダウンロード欄にステータス選択ドロップダウンがあること */
    public function test_CSVダウンロード欄にステータス選択ドロップダウンがあること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $content = $response->getContent();
        // CSVエクスポートフォーム内にselectがある
        $this->assertMatchesRegularExpression(
            '/<form[^>]*contacts\/export[^>]*>.*?<select[^>]*name=["\']status["\'][^>]*>.*?<\/form>/s',
            $content
        );
    }

    /** @test CSVダウンロードのドロップダウンにステータス選択肢があること */
    public function test_CSVダウンロードのドロップダウンにステータス選択肢があること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $content = $response->getContent();
        // CSVエクスポートフォーム内に各ステータスのoptionがある
        $this->assertMatchesRegularExpression(
            '/<form[^>]*contacts\/export[^>]*>.*?<option[^>]*>新規<\/option>.*?<\/form>/s',
            $content
        );
        $this->assertMatchesRegularExpression(
            '/<form[^>]*contacts\/export[^>]*>.*?<option[^>]*>対応中<\/option>.*?<\/form>/s',
            $content
        );
        $this->assertMatchesRegularExpression(
            '/<form[^>]*contacts\/export[^>]*>.*?<option[^>]*>解決済み<\/option>.*?<\/form>/s',
            $content
        );
    }

    /** @test CSVダウンロードのドロップダウンに「すべて」の選択肢があること */
    public function test_CSVダウンロードのドロップダウンにすべての選択肢があること(): void
    {
        $this->loginAsAdmin();

        $response = $this->get('/admin/contacts');

        $response->assertStatus(200);
        $content = $response->getContent();
        $this->assertMatchesRegularExpression(
            '/<form[^>]*contacts\/export[^>]*>.*?<option[^>]*value=["\']["\'][^>]*>.*?すべて.*?<\/option>.*?<\/form>/s',
            $content
        );
    }

    // ----------------------------------------
    // CSVダウンロード（データ検証）
    // ----------------------------------------

    /** @test データベースのレコードがCSVに含まれること */
    public function test_データベースのレコードがCSVに含まれること(): void
    {
        $this->loginAsAdmin();

        $contact = Contact::create([
            'name' => '山田花子',
            'email' => 'hanako@example.com',
            'subject' => 'お問い合わせの件',
            'body' => '本文です',
            'status' => '新規',
        ]);

        $response = $this->get('/admin/contacts/export');

        $response->assertStatus(200);

        $content = $response->streamedContent();
        $lines = array_filter(explode("\n", $content), fn ($line) => $line !== '');
        // ヘッダー行 + データ1行 = 2行
        $this->assertCount(2, $lines);

        // BOMを除去してパース
        $cleanContent = ltrim($content, "\xEF\xBB\xBF");
        $rows = array_filter(explode("\n", $cleanContent), fn ($line) => $line !== '');
        $data = str_getcsv($rows[1]);

        $this->assertEquals($contact->id, $data[0]);
        $this->assertEquals('山田花子', $data[1]);
        $this->assertEquals('hanako@example.com', $data[2]);
        $this->assertEquals('お問い合わせの件', $data[3]);
        $this->assertEquals('新規', $data[4]);
        $this->assertEquals($contact->created_at, $data[5]);
    }
}
