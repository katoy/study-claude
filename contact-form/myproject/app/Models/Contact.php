<?php

namespace App\Models;

use App\Enums\ContactStatus;
use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

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

    /**
     * 絞り込み条件を適用するローカルスコープ。
     * 呼び出し側で正規化済みの値が渡される前提。
     *
     * @param  array{status: string, keyword: string, date_from: ?Carbon, date_to: ?Carbon}  $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($filters['keyword'] !== '') {
            $keyword = $filters['keyword'];
            $query->where(function (Builder $q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhere('subject', 'like', "%{$keyword}%")
                    ->orWhere('body', 'like', "%{$keyword}%");
            });
        }

        if ($filters['date_from'] !== null) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if ($filters['date_to'] !== null) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        return $query;
    }
}
