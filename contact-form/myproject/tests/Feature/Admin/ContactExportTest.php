<?php

namespace Tests\Feature\Admin;

use App\Enums\ContactStatus;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_export_csv(): void
    {
        $response = $this->get(route('admin.contacts.export'));

        $response->assertRedirectToRoute('login');
    }

    public function test_authenticated_non_admin_user_cannot_export_csv(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertForbidden();
    }

    public function test_export_csv_metadata(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('Cache-Control', 'no-store, private');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    }

    public function test_export_csv_has_utf8_bom(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertStatus(200);
        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
    }

    public function test_export_csv_respects_filters(): void
    {
        $user = User::factory()->admin()->create();

        Contact::factory()->create([
            'name' => 'ターゲット太郎',
            'email' => 'target@example.com',
            'subject' => 'ターゲット件名',
            'body' => 'ターゲット本文です。',
            'status' => ContactStatus::New,
        ]);
        Contact::factory()->create([
            'name' => '除外次郎',
            'email' => 'exclude@example.com',
            'subject' => '除外件名',
            'body' => '除外本文です。',
            'status' => ContactStatus::Resolved,
        ]);

        $response = $this->actingAs($user)->get(route('admin.contacts.export', [
            'status' => [ContactStatus::New->value],
            'keyword' => 'ターゲット',
        ]));

        $response->assertStatus(200);
        $content = $response->streamedContent();

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = explode("\n", rtrim($content, "\n"));
        $this->assertCount(2, $lines);

        $header = str_getcsv($lines[0]);
        $row = str_getcsv($lines[1]);

        $this->assertEquals(['ID', 'お名前', 'メールアドレス', '件名', '本文', 'ステータス', '受信日時'], $header);
        $this->assertEquals('ターゲット太郎', $row[1]);
        $this->assertEquals('target@example.com', $row[2]);
        $this->assertEquals('新規', $row[5]);
    }

    public function test_export_csv_respects_sort_order(): void
    {
        $user = User::factory()->admin()->create();

        $c1 = Contact::factory()->create(['name' => 'Contact A', 'body' => 'body A', 'created_at' => now()->subMinutes(2)]);
        $c2 = Contact::factory()->create(['name' => 'Contact B', 'body' => 'body B', 'created_at' => now()->subMinute()]);
        $c3 = Contact::factory()->create(['name' => 'Contact C', 'body' => 'body C', 'created_at' => now()]);

        $response = $this->actingAs($user)->get(route('admin.contacts.export', [
            'sort' => 'created_at-desc',
        ]));

        $response->assertStatus(200);
        $content = $response->streamedContent();

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = explode("\n", rtrim($content, "\n"));
        $this->assertCount(4, $lines);

        $row1 = str_getcsv($lines[1]);
        $row2 = str_getcsv($lines[2]);
        $row3 = str_getcsv($lines[3]);

        $this->assertEquals($c3->id, $row1[0]);
        $this->assertEquals($c2->id, $row2[0]);
        $this->assertEquals($c1->id, $row3[0]);
    }

    public function test_export_csv_sanitizes_dangerous_prefixes(): void
    {
        $user = User::factory()->admin()->create();

        Contact::factory()->create([
            'name' => '=NameInjected',
            'email' => '+email@example.com',
            'subject' => '-SubjectInjected',
            'body' => '@BodyInjected',
            'status' => ContactStatus::New,
        ]);

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertStatus(200);
        $content = $response->streamedContent();

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = explode("\n", rtrim($content, "\n"));
        $row = str_getcsv($lines[1]);

        $this->assertEquals("\t=NameInjected", $row[1]);
        $this->assertEquals("\t+email@example.com", $row[2]);
        $this->assertEquals("\t-SubjectInjected", $row[3]);
        $this->assertEquals("\t@BodyInjected", $row[4]);
    }

    public function test_csv_export_rate_limit(): void
    {
        $user = User::factory()->admin()->create();

        // 1回目
        $this->actingAs($user)->get(route('admin.contacts.export'))->assertStatus(200);
        // 2回目
        $this->get(route('admin.contacts.export'))->assertStatus(200);
        // 3回目 (制限超過で 429)
        $this->get(route('admin.contacts.export'))->assertStatus(429);
    }

    public function test_export_csv_rejects_more_than_limit(): void
    {
        $user = User::factory()->admin()->create();

        // 6件作成（改行を含まない単純なbody）
        Contact::factory(6)->create(['body' => 'body text']);

        // 上限を5件に設定
        config(['contact.export_limit' => 5]);

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertStatus(422);
        $response->assertViewIs('admin.contacts.export-limit-exceeded');
    }

    public function test_export_csv_handles_null_and_empty_fields(): void
    {
        $user = User::factory()->admin()->create();

        Contact::factory()->create([
            'name' => '',
            'email' => 'empty@example.com',
            'subject' => 'subject',
            'body' => '',
            'status' => ContactStatus::New,
        ]);

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertStatus(200);
        $content = $response->streamedContent();

        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = explode("\n", rtrim($content, "\n"));
        $row = str_getcsv($lines[1]);

        $this->assertEquals('', $row[1]); // name (empty string)
        $this->assertEquals('', $row[4]); // body (empty string)
    }
}
