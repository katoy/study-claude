<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Models\Contact;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * 入力フォーム表示
     */
    public function create()
    {
        // セッションに確認画面から戻ったデータがあれば取得
        $contact = session('contact_data', []);

        return view('contacts.create', compact('contact'));
    }

    /**
     * 確認画面表示
     */
    public function confirm(ContactRequest $request)
    {
        $data = $request->validated();

        // セッションにバリデーション済みデータを保存
        session(['contact_data' => $data]);

        return view('contacts.confirm', ['contact' => $data]);
    }

    /**
     * データ保存
     */
    public function store(Request $request)
    {
        // 「戻る」ボタンが押された場合
        if ($request->has('back')) {
            return redirect()->route('contact.create');
        }

        // セッションからデータ取得
        $data = session('contact_data');

        // セッション切れの場合はフォームにリダイレクト
        if (!$data) {
            return redirect()->route('contact.create');
        }

        // DB保存
        Contact::create($data);

        // セッションから確認データを削除
        session()->forget('contact_data');

        return redirect()->route('contact.thanks');
    }

    /**
     * 完了画面表示
     */
    public function thanks()
    {
        return view('contacts.thanks');
    }
}
