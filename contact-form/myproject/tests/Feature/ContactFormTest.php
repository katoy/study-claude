<?php

namespace Tests\Feature;

use App\Models\Contact;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactFormTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_form_display(): void
    {
        $response = $this->get(route('contact.create'));

        $response->assertStatus(200)
            ->assertViewIs('contacts.create');
    }

    public function test_confirm_with_valid_input(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        $response = $this->post(route('contact.confirm'), $data);

        $response->assertStatus(200)
            ->assertViewIs('contacts.confirm');

        $this->assertEquals(session('contact.input'), $data);
    }

    public function test_confirm_with_missing_name(): void
    {
        $response = $this->post(route('contact.confirm'), [
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors('name');
    }

    public function test_confirm_with_invalid_email(): void
    {
        $response = $this->post(route('contact.confirm'), [
            'name' => 'テスト太郎',
            'email' => 'invalid-email',
            'subject' => 'テスト件名',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_confirm_with_missing_subject(): void
    {
        $response = $this->post(route('contact.confirm'), [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'body' => 'テスト本文',
        ]);

        $response->assertSessionHasErrors('subject');
    }

    public function test_confirm_with_missing_body(): void
    {
        $response = $this->post(route('contact.confirm'), [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
        ]);

        $response->assertSessionHasErrors('body');
    }

    public function test_confirm_with_body_exceeding_max_length(): void
    {
        $response = $this->post(route('contact.confirm'), [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => str_repeat('a', 2001),
        ]);

        $response->assertSessionHasErrors('body');
    }

    public function test_store_saves_to_database(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        $this->post(route('contact.confirm'), $data);

        $this->post(route('contact.store'));

        $this->assertDatabaseHas('contacts', [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
            'status' => 'new',
        ]);
    }

    public function test_complete_page_display_after_store(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        $this->post(route('contact.confirm'), $data);
        $response = $this->post(route('contact.store'));

        $response->assertRedirectToRoute('contact.complete');

        $completeResponse = $this->get(route('contact.complete'));
        $completeResponse->assertStatus(200)
            ->assertViewIs('contacts.complete');
    }

    public function test_store_without_confirm_redirects_to_create(): void
    {
        $response = $this->post(route('contact.store'));

        $response->assertRedirectToRoute('contact.create');
        $this->assertDatabaseMissing('contacts', []);
    }

    public function test_complete_direct_access_redirects_to_create(): void
    {
        $response = $this->get(route('contact.complete'));

        $response->assertRedirectToRoute('contact.create');
    }

    public function test_confirmation_back_link_returns_to_populated_form(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        $confirmResponse = $this->post(route('contact.confirm'), $data);

        $this->assertMatchesRegularExpression(
            '/<a[^>]+href="'.preg_quote(route('contact.create'), '/').'"[^>]*>\s*戻る\s*<\/a>/u',
            $confirmResponse->getContent()
        );

        $this->get(route('contact.create'))
            ->assertSee('value="テスト太郎"', false)
            ->assertSee('value="test@example.com"', false)
            ->assertSee('value="テスト件名"', false)
            ->assertSee('テスト本文です。');
    }

    public function test_contact_confirmation_is_rate_limited(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->post(route('contact.confirm'), $data)->assertOk();
        }

        $this->post(route('contact.confirm'), $data)->assertTooManyRequests();
    }

    public function test_contact_submissions_are_rate_limited(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->post(route('contact.confirm'), $data);
            $this->post(route('contact.store'))->assertRedirectToRoute('contact.complete');
        }

        $this->post(route('contact.confirm'), $data);
        $this->post(route('contact.store'))->assertTooManyRequests();
        $this->assertDatabaseCount('contacts', 5);
    }

    public function test_store_handles_database_exception_gracefully(): void
    {
        $data = [
            'name' => 'テスト太郎',
            'email' => 'test@example.com',
            'subject' => 'テスト件名',
            'body' => 'テスト本文です。',
        ];

        $this->post(route('contact.confirm'), $data);

        Contact::creating(function () {
            throw new \Exception('DB Error');
        });

        $response = $this->post(route('contact.store'));

        $response->assertRedirectToRoute('contact.create');
        $response->assertSessionHas('error');
        $this->assertEquals($data, session('contact.input'));
    }
}
