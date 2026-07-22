<?php

namespace Tests\Feature\Admin;

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

    public function test_admin_user_can_export_csv(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user)->get(route('admin.contacts.export'));

        $response->assertStatus(200);
    }
}
