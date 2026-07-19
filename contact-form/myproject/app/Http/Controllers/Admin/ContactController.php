<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ContactStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateContactStatusRequest;
use App\Models\Contact;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * 管理画面向けお問い合わせ管理コントローラー。
 */
class ContactController extends Controller
{
    /**
     * デフォルトの並び順。
     */
    private const DEFAULT_SORT = 'created_at-desc';

    /**
     * 許可された並び順（列, 方向）の一覧。
     *
     * @var array<string, array{0: string, 1: string}>
     */
    private const SORT_OPTIONS = [
        'created_at-desc' => ['created_at', 'desc'],
        'created_at-asc' => ['created_at', 'asc'],
        'status-asc' => ['status', 'asc'],
        'name-asc' => ['name', 'asc'],
    ];

    /**
     * お問い合わせ一覧を表示する。
     */
    public function index(Request $request): View
    {
        $filters = $this->normalizeFilters($request);
        [$sortColumn, $sortDirection] = self::SORT_OPTIONS[$filters['sort']];

        $contacts = Contact::query()
            ->filter($filters)
            ->orderBy($sortColumn, $sortDirection)
            ->paginate(20)
            ->withQueryString();

        // Ajax リクエスト時は一覧部分のパーシャルのみ返却し、通常時はフルページを返す
        $view = $request->ajax() ? 'admin.contacts._list' : 'admin.contacts.index';

        return view($view, [
            'contacts' => $contacts,
            'filters' => [
                'status' => $filters['status'],
                'keyword' => $filters['keyword'],
                'date_from' => $filters['date_from_display'],
                'date_to' => $filters['date_to_display'],
                'sort' => $filters['sort'],
            ],
        ]);
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
        try {
            $contact->update(['status' => $request->validated('status')]);
        } catch (\Exception $e) {
            Log::error('お問い合わせのステータス更新に失敗しました。', [
                'contact_id' => $contact->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()
                ->route('admin.contacts.show', $contact)
                ->with('error', 'ステータスの更新中にエラーが発生しました。時間をおいて再度お試しください。');
        }

        return redirect()
            ->route('admin.contacts.show', $contact)
            ->with('status_updated', 'ステータスを更新しました。');
    }

    /**
     * 一覧の絞り込み・並び替え条件を安全な値に正規化する。
     * 内部管理画面の絞り込みという性質上、不正値はエラーにせずデフォルトへフォールバックする。
     *
     * @return array{status: string, keyword: string, date_from: ?Carbon, date_to: ?Carbon, date_from_display: string, date_to_display: string, sort: string}
     */
    private function normalizeFilters(Request $request): array
    {
        $status = ContactStatus::tryFrom((string) $request->query('status', ''))?->value ?? '';
        $keyword = trim((string) $request->query('keyword', ''));

        $dateFromDisplay = $request->query('date_from');
        $dateToDisplay = $request->query('date_to');

        // 日付の逆転をチェック（表示用文字列で比較）
        if (is_string($dateFromDisplay) && is_string($dateToDisplay) && $dateFromDisplay && $dateToDisplay && $dateFromDisplay > $dateToDisplay) {
            [$dateFromDisplay, $dateToDisplay] = [$dateToDisplay, $dateFromDisplay];
        }

        [$dateFrom, $dateFromDisplayOutput] = $this->normalizeDate($dateFromDisplay, isEndOfDay: false);
        [$dateTo, $dateToDisplayOutput] = $this->normalizeDate($dateToDisplay, isEndOfDay: true);

        $sortInput = (string) $request->query('sort', self::DEFAULT_SORT);
        $sort = array_key_exists($sortInput, self::SORT_OPTIONS) ? $sortInput : self::DEFAULT_SORT;

        return [
            'status' => $status,
            'keyword' => $keyword,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'date_from_display' => $dateFromDisplayOutput,
            'date_to_display' => $dateToDisplayOutput,
            'sort' => $sort,
        ];
    }

    /**
     * "Y-m-d" 形式の日付文字列を検証し、UTC に変換して返す。
     * 不正な場合は null と空文字列のペアを返す。
     *
     * @param  bool  $isEndOfDay  true の場合、その日の23:59:59として扱う（終了日用）
     * @return array{0: ?Carbon, 1: string}
     */
    private function normalizeDate(mixed $value, bool $isEndOfDay = false): array
    {
        if (! is_string($value) || $value === '') {
            return [null, ''];
        }

        try {
            $date = Carbon::createFromFormat('Y-m-d', $value, config('app.display_timezone'));
        } catch (\Exception) {
            return [null, ''];
        }

        // createFromFormat は "2026-99-99" のような値も部分的に解釈するため厳密に再検証する
        if (! ($date && $date->format('Y-m-d') === $value)) {
            return [null, ''];
        }

        // 時刻を明示的に設定（createFromFormat は現在時刻を含む可能性があるため）
        if ($isEndOfDay) {
            $date = $date->setTime(23, 59, 59);
        } else {
            $date = $date->setTime(0, 0, 0);
        }

        // 表示タイムゾーン（JST）の時刻をUTCに変換する
        return [$date->utc(), $value];
    }
}
