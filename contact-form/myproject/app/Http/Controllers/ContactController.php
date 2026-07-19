<?php

namespace App\Http\Controllers;

use App\Enums\ContactStatus;
use App\Http\Requests\StoreContactRequest;
use App\Models\Contact;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        // 多重送信防止のため、セッションからデータを引き出すと同時に削除する
        $input = session()->pull(self::SESSION_KEY);

        if (! $input) {
            return redirect()->route('contact.create');
        }

        try {
            DB::transaction(function () use ($input) {
                Contact::create([...$input, 'status' => ContactStatus::New]);
            });
        } catch (\Exception $e) {
            // エラーログの記録
            Log::error('お問い合わせの保存に失敗しました。', [
                'error' => $e->getMessage(),
                // bodyは長文かつ個人情報を含む可能性があるためログ出力から除外
                'input' => array_diff_key($input, ['body' => '']),
            ]);

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
