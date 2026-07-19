<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateContactStatusRequest;
use App\Models\Contact;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * 管理画面向けお問い合わせ管理コントローラー。
 */
class ContactController extends Controller
{
    /**
     * お問い合わせ一覧を表示する。
     */
    public function index(): View
    {
        $contacts = Contact::query()->latest()->paginate(20);

        return view('admin.contacts.index', ['contacts' => $contacts]);
    }

    /**
     * お問い合わせ詳細を表示する。
     */
    public function show(Contact $contact): View
    {
        return view('admin.contacts.show', ['contact' => $contact]);
    }

    /**
     * お問い合わせのステータスを更新する。
     */
    public function update(UpdateContactStatusRequest $request, Contact $contact): RedirectResponse
    {
        $contact->update(['status' => $request->validated('status')]);

        return redirect()
            ->route('admin.contacts.show', $contact)
            ->with('status_updated', true);
    }
}
