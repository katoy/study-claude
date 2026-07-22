<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactCsvExporter
{
    /**
     * お問い合わせデータをCSVとしてストリーム出力するレスポンスを生成する。
     */
    public function export(Builder $query): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($query) {
            $handle = fopen('php://output', 'w');

            // UTF-8のBOMを出力
            fwrite($handle, "\xEF\xBB\xBF");

            // ヘッダー行
            $headers = [
                'ID',
                __('お名前'),
                __('メールアドレス'),
                __('件名'),
                __('本文'),
                __('ステータス'),
                __('受信日時'),
            ];
            fputcsv($handle, $headers);

            // cursor() を利用してメモリ効率よく1件ずつ取得
            foreach ($query->cursor() as $contact) {
                // ステータスのローカライズ
                $statusLabel = __($contact->status->label());

                $row = [
                    $contact->id,
                    $this->sanitizeField($contact->name),
                    $this->sanitizeField($contact->email),
                    $this->sanitizeField($contact->subject),
                    $this->sanitizeField($contact->body),
                    $statusLabel,
                    $contact->formatted_created_at,
                ];

                fputcsv($handle, $row);
            }

            fclose($handle);
        });

        // ヘッダーの設定
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Content-Disposition', 'attachment; filename="contacts.csv"');

        return $response;
    }

    /**
     * CSVインジェクション対策として危険な文字で始まるフィールドをサニタイズする。
     */
    private function sanitizeField(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $firstChar = mb_substr($value, 0, 1);
        $dangerousChars = ['=', '+', '-', '@', '＝', '＋', '－', '＠'];

        if (in_array($firstChar, $dangerousChars, true)) {
            return "\t".$value;
        }

        return $value;
    }
}
