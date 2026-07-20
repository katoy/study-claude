<?php

namespace Database\Seeders;

use App\Enums\ContactStatus;
use App\Models\Contact;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Contact::factory(100)->create(function () {
            $createdAt = fake()->dateTimeBetween('-60 days', 'now');

            return [
                'status' => fake()->randomElement(ContactStatus::cases()),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];
        });
    }
}
