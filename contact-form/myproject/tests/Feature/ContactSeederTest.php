<?php

namespace Tests\Feature;

use App\Models\Contact;
use Database\Seeders\ContactSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_seeder_creates_100_shopping_site_contacts(): void
    {
        $this->seed(ContactSeeder::class);

        $this->assertDatabaseCount('contacts', 100);
        $this->assertSame(100, Contact::query()->count());

        $nonExampleCount = Contact::query()
            ->where('email', 'not like', '%@example.com')
            ->count();
        $this->assertSame(0, $nonExampleCount);

        $firstContact = Contact::query()->first();
        $this->assertNotNull($firstContact);
        $this->assertNotEmpty($firstContact->name);
        $this->assertNotEmpty($firstContact->subject);
        $this->assertNotEmpty($firstContact->body);
    }
}
