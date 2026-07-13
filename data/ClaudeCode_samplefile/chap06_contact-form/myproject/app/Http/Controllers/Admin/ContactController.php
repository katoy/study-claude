<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\Request;

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
