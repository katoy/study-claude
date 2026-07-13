<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    /**
     * お問い合わせ一覧表示
     */
    public function index(Request $request)
    {
        $query = Contact::query();

        // 氏名で部分一致検索
        if ($request->filled('name')) {
            $query->where('name', 'LIKE', '%' . $request->input('name') . '%');
        }

        // 開始日で絞り込み
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        // 終了日で絞り込み
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        // ステータスで絞り込み
        if ($request->filled('status')) {
            $query->whereIn('status', $request->input('status'));
        }

        $contacts = $query->latest()->paginate(10)->appends($request->query());

        return view('admin.contacts.index', compact('contacts'));
    }

    /**
     * CSVエクスポート
     */
    public function export(Request $request): StreamedResponse
    {
        $query = Contact::query();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $contacts = $query->latest()->get();

        $callback = function () use ($contacts) {
            // UTF-8 BOM
            echo "\xEF\xBB\xBF";

            $handle = fopen('php://output', 'w');

            // ヘッダー行
            fputcsv($handle, ['ID', '名前', 'メールアドレス', '件名', 'ステータス', '受信日時']);

            // データ行
            foreach ($contacts as $contact) {
                fputcsv($handle, [
                    $contact->id,
                    $contact->name,
                    $contact->email,
                    $contact->subject,
                    $contact->status,
                    $contact->created_at,
                ]);
            }

            fclose($handle);
        };

        $filename = 'contacts_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * お問い合わせ詳細表示
     */
    public function show(Contact $contact)
    {
        return view('admin.contacts.show', compact('contact'));
    }

    /**
     * ステータス更新
     */
    public function update(Request $request, Contact $contact)
    {
        $request->validate([
            'status' => ['required', 'in:新規,対応中,解決済み'],
        ]);

        $contact->update([
            'status' => $request->input('status'),
        ]);

        return redirect()
            ->route('admin.contacts.show', $contact)
            ->with('success', 'ステータスを更新しました。');
    }
}
