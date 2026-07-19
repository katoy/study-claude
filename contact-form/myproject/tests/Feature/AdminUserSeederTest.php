<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;
use Tests\TestCase;

class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_requires_configured_admin_credentials(): void
    {
        config([
            'admin.email' => null,
            'admin.password' => null,
        ]);

        $this->expectException(InvalidArgumentException::class);

        $this->seed(AdminUserSeeder::class);
    }

    public function test_seeder_creates_only_the_configured_admin_account(): void
    {
        config([
            'admin.name' => '運用管理者',
            'admin.email' => 'operator@example.com',
            'admin.password' => 'a-strong-admin-password',
        ]);

        $this->seed(AdminUserSeeder::class);

        $admin = User::query()->sole();

        $this->assertSame('運用管理者', $admin->name);
        $this->assertSame('operator@example.com', $admin->email);
        $this->assertTrue($admin->is_admin);
        $this->assertTrue(Hash::check('a-strong-admin-password', $admin->password));
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }
}
