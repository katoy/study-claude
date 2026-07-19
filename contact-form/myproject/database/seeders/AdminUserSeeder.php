<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use InvalidArgumentException;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $name = config('admin.name');
        $email = config('admin.email');
        $password = config('admin.password');

        if (! is_string($name) || trim($name) === '') {
            throw new InvalidArgumentException('ADMIN_NAME を設定してください。');
        }

        if (! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('有効な ADMIN_EMAIL を設定してください。');
        }

        if (! is_string($password) || mb_strlen($password) < 12) {
            throw new InvalidArgumentException('ADMIN_PASSWORD は12文字以上で設定してください。');
        }

        $admin = User::firstOrNew(['email' => $email]);
        $admin->forceFill([
            'name' => $name,
            'password' => $password,
            'email_verified_at' => now(),
            'is_admin' => true,
        ])->save();
    }
}
