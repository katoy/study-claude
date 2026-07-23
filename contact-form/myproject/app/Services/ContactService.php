<?php

namespace App\Services;

use App\Enums\ContactStatus;
use App\Models\Contact;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * お問い合わせ関連のビジネスロジックを扱うサービス。
 */
class ContactService
{
    /**
     * お問い合わせ情報を保存する。
     *
     *
     * @throws \Exception
     */
    public function createContact(array $input): Contact
    {
        try {
            return DB::transaction(function () use ($input) {
                return Contact::create([
                    ...$input,
                    'status' => ContactStatus::New,
                ]);
            });
        } catch (\Exception $e) {
            Log::error('お問い合わせの保存に失敗しました。', [
                'error' => $e->getMessage(),
                // bodyは長文かつ個人情報を含む可能性があるためログ出力から除外
                'input' => array_diff_key($input, ['body' => '']),
            ]);
            throw $e;
        }
    }
}
