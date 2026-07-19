<?php

namespace App\Models;

use App\Enums\ContactStatus;
use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * お問い合わせを表すモデル。
 */
#[Fillable(['name', 'email', 'subject', 'body', 'status'])]
class Contact extends Model
{
    /** @use HasFactory<ContactFactory> */
    use HasFactory;

    /**
     * キャスト定義。
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ContactStatus::class,
        ];
    }
}
