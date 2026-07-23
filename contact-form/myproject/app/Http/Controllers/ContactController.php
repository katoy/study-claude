<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContactRequest;
use App\Services\ContactService;
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
    public function store(ContactService $contactService): RedirectResponse
    {
        // 多重送信防止のため、セッションからデータを引き出すと同時に削除する
        $input = session()->pull(self::SESSION_KEY);

        if (! $input) {
            return redirect()->route('contact.create');
        }

        try {
            $contactService->createContact($input);
        } catch (\Exception $e) {
            // 保存失敗時はセッション値を復元して入力画面へ戻す
            session()->put(self::SESSION_KEY, $input);

            return redirect()->route('contact.create')
                ->withInput($input)
                ->with('error', '送信処理中にエラーが発生しました。お手数ですが、時間をおいて再度お試しください。');
        }

        session()->flash(self::COMPLETED_KEY, true);

        return redirect()->route('contact.complete');
    }

    /**
     * 送信完了画面を表示する。
     */
    public function complete(): View|RedirectResponse
    {
        if (! session()->pull(self::COMPLETED_KEY)) {
            return redirect()->route('contact.create');
        }

        return view('contacts.complete');
    }
}
