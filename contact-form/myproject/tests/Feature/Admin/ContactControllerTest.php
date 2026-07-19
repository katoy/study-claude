<?php

namespace Tests\Feature\Admin;

use App\Enums\ContactStatus;
use App\Models\Contact;
use App\Models\User;
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

    public function test_authenticated_user_can_view_index(): void
    {
        $user = User::factory()->create();
        Contact::factory(3)->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.index'));

        $response->assertStatus(200)
            ->assertViewIs('admin.contacts.index')
            ->assertViewHas('contacts');
    }

    public function test_index_shows_latest_contacts_first(): void
    {
        $user = User::factory()->create();
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

    public function test_authenticated_user_can_view_show(): void
    {
        $user = User::factory()->create();
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

    public function test_unauthenticated_user_cannot_update_status(): void
    {
        $contact = Contact::factory()->create();

        $response = $this->patch(route('admin.contacts.update', $contact), [
            'status' => 'in_progress',
        ]);

        $response->assertRedirectToRoute('login');
    }

    public function test_authenticated_user_can_update_status(): void
    {
        $user = User::factory()->create();
        $contact = Contact::factory()->create(['status' => ContactStatus::New]);

        $response = $this->actingAs($user)->patch(route('admin.contacts.update', $contact), [
            'status' => ContactStatus::InProgress->value,
        ]);

        $response->assertRedirectToRoute('admin.contacts.show', $contact)
            ->assertSessionHas('status_updated', true);

        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => ContactStatus::InProgress->value,
        ]);
    }

    public function test_invalid_status_value_fails_validation(): void
    {
        $user = User::factory()->create();
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
        $user = User::factory()->create();
        $contact = Contact::factory()->create();

        $response = $this->actingAs($user)->patch(route('admin.contacts.update', $contact), []);

        $response->assertSessionHasErrors('status');
    }
}
