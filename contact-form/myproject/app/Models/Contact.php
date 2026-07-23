<?php

namespace App\Models;

use App\DTO\ContactFilter;
use App\Enums\ContactStatus;
use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

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
     */
    public function scopeFilter(Builder $query, array|ContactFilter $filters): Builder
    {
        if (is_array($filters)) {
            $request = new Request;
            $request->query->replace($filters);
            $filters = ContactFilter::fromRequest($request);
        }

        $allStatuses = array_map(fn ($case) => $case->value, ContactStatus::cases());
        $statuses = $filters->status;

        // 1つもチェックしない (0件) または すべてチェック (全件) の場合はステータス絞り込みを行わない
        if (! empty($statuses) && count($statuses) < count($allStatuses)) {
            if (count($statuses) === 1) {
                $query->where('status', $statuses[0]);
            } else {
                $query->whereIn('status', $statuses);
            }
        }

        if ($filters->keyword !== '') {
            $keyword = $filters->keyword;
            $query->where(function (Builder $q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhere('subject', 'like', "%{$keyword}%");
            });
        }

        if ($filters->bodyKeyword !== '') {
            $bodyKeyword = $filters->bodyKeyword;
            $query->where('body', 'like', "%{$bodyKeyword}%");
        }

        if ($filters->dateFrom !== null) {
            $query->where('created_at', '>=', $filters->dateFrom);
        }

        if ($filters->dateTo !== null) {
            $query->where('created_at', '<=', $filters->dateTo);
        }

        return $query;
    }

    /**
     * 登録日時を表示用フォーマット「YYYY-MM-DD (ddd) HH:mm」に変換する。
     * 例: 2026-07-20 (月) 09:13
     */
    public function getFormattedCreatedAtAttribute(): string
    {
        $week = ['日', '月', '火', '水', '木', '金', '土'];
        $date = $this->created_at->copy()->setTimezone(config('app.display_timezone', 'Asia/Tokyo'));

        return sprintf(
            '%s (%s) %s',
            $date->format('Y-m-d'),
            $week[$date->dayOfWeek],
            $date->format('H:i')
        );
    }
}
