<?php

namespace Tests\Feature;

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
}
