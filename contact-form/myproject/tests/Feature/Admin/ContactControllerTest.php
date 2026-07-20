<?php

namespace Tests\Feature\Admin;

use App\Enums\ContactStatus;
use App\Models\Contact;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_redirected_to_login(): void
    {
        $response = $this->get(route('admin.contacts.index'));

        $response->assertRedirectToRoute('login');
    }

    public function test_authenticated_non_admin_user_cannot_view_index(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $response->assertForbidden();
    }

    public function test_admin_user_can_view_index(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(3)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $response->assertStatus(200)
            ->assertViewIs('admin.contacts.index')
            ->assertViewHas('contacts')
            ->assertViewHas('statusCounts');
    }

    public function test_index_shows_latest_contacts_first(): void
    {
        $user = User::factory()->admin()->create();
        $contact1 = Contact::factory()->create(['name' => 'First']);
        sleep(1);
        $contact2 = Contact::factory()->create(['name' => 'Second']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $contacts = $response->viewData('contacts');
        $this->assertEquals($contact2->id, $contacts->first()->id);
    }

    public function test_unauthenticated_user_cannot_view_show(): void
    {
        $contact = Contact::factory()->create();

        $response = $this->get(route('admin.contacts.show', $contact));

        $response->assertRedirectToRoute('login');
    }

    public function test_admin_user_can_view_show(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create([
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
        ]);

        $response = $this->actingAs($user)->get(route('admin.contacts.show', $contact));

        $response->assertStatus(200)
            ->assertViewIs('admin.contacts.show')
            ->assertViewHas('contact', $contact);
    }

    public function test_show_displays_position_and_prev_next_links(): void
    {
        $user = User::factory()->admin()->create();
        $contact1 = Contact::factory()->create(['created_at' => now()->subMinutes(2)]);
        $contact2 = Contact::factory()->create(['created_at' => now()->subMinute()]);
        $contact3 = Contact::factory()->create(['created_at' => now()]);

        $response = $this->actingAs($user)->get(route('admin.contacts.show', $contact2));

        $response->assertStatus(200)
            ->assertViewHas('position', 2)
            ->assertViewHas('totalCount', 3)
            ->assertViewHas('previousContactId', $contact3->id)
            ->assertViewHas('nextContactId', $contact1->id)
            ->assertSee('3 件中 2 件目');
    }

    public function test_show_handles_contact_not_in_filtered_results(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create(['status' => ContactStatus::New]);

        $response = $this->actingAs($user)->get(route('admin.contacts.show', [
            'contact' => $contact,
            'status' => ContactStatus::Resolved->value,
        ]));

        $response->assertStatus(200)
            ->assertViewHas('position', null)
            ->assertViewHas('previousContactId', null)
            ->assertViewHas('nextContactId', null);
    }

    public function test_list_detail_and_status_update_preserve_pagination_state(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(12)->create();
        $query = ['per_page' => 5, 'page' => 2];

        $indexResponse = $this->actingAs($user)->get(route('admin.contacts.index', $query));
        $contact = $indexResponse->viewData('contacts')->first();
        $showUrl = route('admin.contacts.show', array_merge(['contact' => $contact], $query));

        $indexResponse->assertSee($showUrl);

        $showResponse = $this->get($showUrl);
        $showResponse
            ->assertViewHas('queryParams', ['per_page' => '5', 'page' => '2'])
            ->assertSee(route('admin.contacts.index', $query));

        $this->patch(route('admin.contacts.update', array_merge(['contact' => $contact], $query)), [
            'status' => ContactStatus::InProgress->value,
        ])->assertRedirect($showUrl);
    }

    public function test_unauthenticated_user_cannot_update_status(): void
    {
        $contact = Contact::factory()->create();

        $response = $this->patch(route('admin.contacts.update', $contact), [
            'status' => 'in_progress',
        ]);

        $response->assertRedirectToRoute('login');
    }

    public function test_admin_user_can_update_status(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create(['status' => ContactStatus::New]);

        $response = $this->actingAs($user)->patch(route('admin.contacts.update', $contact), [
            'status' => ContactStatus::InProgress->value,
        ]);

        $response->assertRedirectToRoute('admin.contacts.show', $contact)
            ->assertSessionHas('status_updated', 'ステータスを更新しました。');

        $this->get(route('admin.contacts.show', $contact))
            ->assertSee('ステータスを更新しました。');

        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => ContactStatus::InProgress->value,
        ]);
    }

    public function test_invalid_status_value_fails_validation(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create();

        $response = $this->actingAs($user)->patch(route('admin.contacts.update', $contact), [
            'status' => 'invalid_status',
        ]);

        $response->assertSessionHasErrors('status');
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => ContactStatus::New->value,
        ]);
    }

    public function test_missing_status_fails_validation(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create();

        $response = $this->actingAs($user)->patch(route('admin.contacts.update', $contact), []);

        $response->assertSessionHasErrors('status');
    }

    public function test_admin_pages_display_contact_time_in_japan_timezone(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create([
            'created_at' => CarbonImmutable::parse('2026-07-19 00:00:00', 'UTC'),
        ]);

        $this->actingAs($user)
            ->get(route('admin.contacts.index'))
            ->assertSee('2026年07月19日 09:00');

        $this->get(route('admin.contacts.show', $contact))
            ->assertSee('2026年07月19日 09:00:00');
    }

    public function test_index_filters_by_status(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['status' => ContactStatus::New]);
        Contact::factory()->create(['status' => ContactStatus::InProgress]);
        Contact::factory()->create(['status' => ContactStatus::Resolved]);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['status' => ContactStatus::InProgress->value]));

        $response->assertStatus(200);
        $contacts = $response->viewData('contacts');
        $this->assertCount(1, $contacts);
        $this->assertEquals(ContactStatus::InProgress->value, $contacts->first()->status->value);
    }

    public function test_index_filters_by_keyword_matching_name(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['name' => '太郎']);
        Contact::factory()->create(['name' => '花子']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['keyword' => '太郎']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(1, $contacts);
        $this->assertEquals('太郎', $contacts->first()->name);
    }

    public function test_index_filters_by_keyword_matching_email(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['email' => 'taro@example.com']);
        Contact::factory()->create(['email' => 'hanako@example.com']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['keyword' => 'taro']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(1, $contacts);
        $this->assertEquals('taro@example.com', $contacts->first()->email);
    }

    public function test_index_filters_by_keyword_matching_subject(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['subject' => 'テスト件名1']);
        Contact::factory()->create(['subject' => 'テスト件名2']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['keyword' => '件名1']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(1, $contacts);
        $this->assertStringContainsString('件名1', $contacts->first()->subject);
    }

    public function test_index_filters_by_body_keyword_matching_body(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['body' => 'お問い合わせの特別な本文内容です。']);
        Contact::factory()->create(['body' => '一般的な別の本文です。']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['body_keyword' => '特別な本文']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(1, $contacts);
        $this->assertStringContainsString('特別な本文', $contacts->first()->body);
    }

    public function test_index_keyword_filter_does_not_match_body(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['name' => 'テスト太郎', 'body' => '特別な本文']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['keyword' => '特別な本文']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(0, $contacts);
    }

    public function test_index_filters_by_date_range(): void
    {
        $user = User::factory()->admin()->create();
        // JST 2026-07-19 12:00 → UTC 2026-07-19 03:00
        Contact::factory()->create(['created_at' => CarbonImmutable::parse('2026-07-19 03:00:00', 'UTC')]);
        // JST 2026-07-20 01:00 → UTC 2026-07-19 16:00
        Contact::factory()->create(['created_at' => CarbonImmutable::parse('2026-07-19 16:00:00', 'UTC')]);
        // JST 2026-07-21 09:00 → UTC 2026-07-21 00:00
        Contact::factory()->create(['created_at' => CarbonImmutable::parse('2026-07-21 00:00:00', 'UTC')]);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', [
            'date_from' => '2026-07-19',
            'date_to' => '2026-07-20',
        ]));

        $contacts = $response->viewData('contacts');
        $this->assertCount(2, $contacts);
    }

    public function test_index_date_range_uses_display_timezone_boundaries(): void
    {
        $user = User::factory()->admin()->create();
        // JST 2026-07-19 00:30 → UTC 2026-07-18 15:30（JSTの19日だが UTC では18日）
        Contact::factory()->create(['created_at' => CarbonImmutable::parse('2026-07-18 15:30:00', 'UTC')]);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['date_from' => '2026-07-19']));

        // JST で 2026-07-19 を選んだら、UTC 2026-07-18 15:30 (JST 00:30) も含まれるべき
        $contacts = $response->viewData('contacts');
        $this->assertCount(1, $contacts);
    }

    public function test_index_swaps_reversed_date_range(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['created_at' => CarbonImmutable::parse('2026-07-19 03:00:00', 'UTC')]);
        Contact::factory()->create(['created_at' => CarbonImmutable::parse('2026-07-20 03:00:00', 'UTC')]);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', [
            'date_from' => '2026-07-20',
            'date_to' => '2026-07-19',
        ]));

        // 逆転していても日付を入れ替えて絞り込まれるべき
        $contacts = $response->viewData('contacts');
        $this->assertCount(2, $contacts);
    }

    public function test_index_ignores_invalid_status_and_shows_all(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(3)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['status' => 'invalid_status']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(3, $contacts);
    }

    public function test_index_ignores_invalid_date_format(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(2)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['date_from' => 'not-a-date']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(2, $contacts);
    }

    public function test_index_sorts_by_created_at_ascending(): void
    {
        $user = User::factory()->admin()->create();
        $contact1 = Contact::factory()->create(['name' => 'First']);
        sleep(1);
        $contact2 = Contact::factory()->create(['name' => 'Second']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['sort' => 'created_at-asc']));

        $contacts = $response->viewData('contacts');
        $this->assertEquals($contact1->id, $contacts->first()->id);
        $this->assertEquals($contact2->id, $contacts->last()->id);
    }

    public function test_index_sorts_by_status(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['status' => ContactStatus::Resolved]);
        Contact::factory()->create(['status' => ContactStatus::New]);
        Contact::factory()->create(['status' => ContactStatus::InProgress]);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['sort' => 'status-asc']));

        $contacts = $response->viewData('contacts');
        $this->assertEquals(ContactStatus::InProgress->value, $contacts->first()->status->value);
        $this->assertEquals(ContactStatus::New->value, $contacts[1]->status->value);
        $this->assertEquals(ContactStatus::Resolved->value, $contacts->last()->status->value);
    }

    public function test_index_sorts_by_name(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create(['name' => 'Charlie']);
        Contact::factory()->create(['name' => 'Alice']);
        Contact::factory()->create(['name' => 'Bob']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['sort' => 'name-asc']));

        $contacts = $response->viewData('contacts');
        $this->assertEquals('Alice', $contacts->first()->name);
        $this->assertEquals('Bob', $contacts[1]->name);
        $this->assertEquals('Charlie', $contacts->last()->name);
    }

    public function test_index_falls_back_to_default_sort_for_invalid_sort_value(): void
    {
        $user = User::factory()->admin()->create();
        $contact1 = Contact::factory()->create(['name' => 'First']);
        sleep(1);
        $contact2 = Contact::factory()->create(['name' => 'Second']);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['sort' => 'invalid_sort']));

        // デフォルト（created_at-desc）で新しい順
        $contacts = $response->viewData('contacts');
        $this->assertEquals($contact2->id, $contacts->first()->id);
    }

    public function test_index_returns_partial_view_for_ajax_request(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create();

        $response = $this->actingAs($user)->get(
            route('admin.contacts.index'),
            ['X-Requested-With' => 'XMLHttpRequest']
        );

        $response->assertStatus(200)->assertViewIs('admin.contacts._list');
    }

    public function test_index_returns_full_view_for_normal_request(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $response->assertStatus(200)->assertViewIs('admin.contacts.index');
    }

    public function test_index_pagination_links_preserve_filters(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(25)->create(['status' => ContactStatus::InProgress]);

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['status' => ContactStatus::InProgress->value]));

        $html = $response->getContent();
        // ページネーションリンクにステータスフィルタが含まれることを確認
        $this->assertStringContainsString('status='.urlencode(ContactStatus::InProgress->value), $html);
    }

    public function test_update_handles_database_exception_gracefully(): void
    {
        $user = User::factory()->admin()->create();
        $contact = Contact::factory()->create(['status' => ContactStatus::New]);

        Contact::updating(function () {
            throw new \Exception('DB Error');
        });

        $response = $this->actingAs($user)->patch(route('admin.contacts.update', $contact), [
            'status' => ContactStatus::InProgress->value,
        ]);

        $response->assertRedirectToRoute('admin.contacts.show', $contact);
        $response->assertSessionHas('error', 'ステータスの更新中にエラーが発生しました。時間をおいて再度お試しください。');
    }

    public function test_index_handles_out_of_range_calendar_date(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(2)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['date_from' => '2026-02-31']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(2, $contacts);
    }

    public function test_index_displays_sequence_numbers(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(3)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $response->assertStatus(200);
        $response->assertSee('>1<', false);
        $response->assertSee('>2<', false);
        $response->assertSee('>3<', false);
    }

    public function test_index_defaults_to_20_per_page(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(25)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $contacts = $response->viewData('contacts');
        $this->assertCount(20, $contacts);
    }

    public function test_index_filters_by_custom_per_page(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(25)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['per_page' => '10']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(10, $contacts);
    }

    public function test_index_supports_5_and_200_per_page_options(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(25)->create();

        $response5 = $this->actingAs($user)->get(route('admin.contacts.index', ['per_page' => '5']));
        $this->assertCount(5, $response5->viewData('contacts'));

        $response200 = $this->actingAs($user)->get(route('admin.contacts.index', ['per_page' => '200']));
        $this->assertCount(25, $response200->viewData('contacts'));
    }

    public function test_index_falls_back_to_default_per_page_for_invalid_value(): void
    {
        $user = User::factory()->admin()->create();
        Contact::factory(25)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index', ['per_page' => 'invalid']));

        $contacts = $response->viewData('contacts');
        $this->assertCount(20, $contacts);
    }

    public function test_pagination_translations_for_japanese_and_english(): void
    {
        app()->setLocale('ja');
        $this->assertSame('&laquo; 前へ', __('pagination.previous'));
        $this->assertSame('次へ &raquo;', __('pagination.next'));

        app()->setLocale('en');
        $this->assertSame('&laquo; Previous', __('pagination.previous'));
        $this->assertSame('Next &raquo;', __('pagination.next'));

        app()->setLocale(config('app.locale'));
    }

    public function test_multilingual_screen_labels_render_in_english(): void
    {
        app()->setLocale('en');
        $user = User::factory()->admin()->create();
        Contact::factory(1)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $response->assertStatus(200);
        $response->assertSee('Contact List');
        $response->assertSee('Filter Conditions');
        $response->assertSee('Per Page:');

        app()->setLocale(config('app.locale'));
    }
}
