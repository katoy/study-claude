<?php

namespace App\Http\Controllers;

use App\Enums\ContactStatus;
use App\Http\Requests\StoreContactRequest;
use App\Models\Contact;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * 公開お問い合わせフォームのコントローラー。
 */
class ContactController extends Controller
{
    private const SESSION_KEY = 'contact.input';

    private const COMPLETED_KEY = 'contact.completed';

    /**
     * 入力フォームを表示する。
     */
    public function create(): View
    {
        return view('contacts.create', [
            'input' => session(self::SESSION_KEY, []),
        ]);
    }

    /**
     * 入力内容を検証し、確認画面を表示する。
     */
    public function confirm(StoreContactRequest $request): View
    {
        $validated = $request->validated();
        session([self::SESSION_KEY => $validated]);

        return view('contacts.confirm', ['input' => $validated]);
    }

    /**
     * 確認済みの内容をDBへ保存し、完了画面へリダイレクトする。
     */
    public function store(): RedirectResponse
    {
        $input = session(self::SESSION_KEY);

        if (!$input) {
            return redirect()->route('contact.create');
        }

        Contact::create([...$input, 'status' => ContactStatus::New]);

        session()->forget(self::SESSION_KEY);
        session()->flash(self::COMPLETED_KEY, true);

        return redirect()->route('contact.complete');
    }

    /**
     * 送信完了画面を表示する。
     */
    public function complete(): View|RedirectResponse
    {
        if (!session()->pull(self::COMPLETED_KEY)) {
            return redirect()->route('contact.create');
        }

        return view('contacts.complete');
    }
}
