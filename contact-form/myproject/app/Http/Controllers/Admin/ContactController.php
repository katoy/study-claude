<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ContactStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateContactStatusRequest;
use App\Models\Contact;
use App\Services\ContactCsvExporter;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
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
     * デフォルトの1ページあたり表示件数。
     */
    private const DEFAULT_PER_PAGE = 20;

    /**
     * 選択可能な1ページあたり表示件数の一覧。
     *
     * @var array<int, int>
     */
    private const PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 200];

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

        $contacts = $this->buildFilteredQuery($filters)
            ->paginate($filters['per_page'])
            ->withQueryString();

        $filtersForCounts = array_merge($filters, ['status' => []]);
        $statusCountsRaw = Contact::query()
            ->filter($filtersForCounts)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $statusCounts = [
            ContactStatus::New->value => $statusCountsRaw[ContactStatus::New->value] ?? 0,
            ContactStatus::InProgress->value => $statusCountsRaw[ContactStatus::InProgress->value] ?? 0,
            ContactStatus::Resolved->value => $statusCountsRaw[ContactStatus::Resolved->value] ?? 0,
        ];

        // Ajax リクエスト時は一覧部分のパーシャルのみ返却し、通常時はフルページを返す
        $view = $request->ajax() ? 'admin.contacts._list' : 'admin.contacts.index';

        $exportQuery = array_filter([
            'status' => $filters['status'],
            'keyword' => $filters['keyword'],
            'body_keyword' => $filters['body_keyword'],
            'date_from' => $filters['date_from_display'],
            'date_to' => $filters['date_to_display'],
            'sort' => $filters['sort'],
        ], fn ($val) => $val !== null && $val !== '' && $val !== []);

        return view($view, [
            'contacts' => $contacts,
            'statusCounts' => $statusCounts,
            'exportQuery' => $exportQuery,
            'filters' => [
                'status' => $filters['status'],
                'keyword' => $filters['keyword'],
                'body_keyword' => $filters['body_keyword'],
                'date_from' => $filters['date_from_display'],
                'date_to' => $filters['date_to_display'],
                'sort' => $filters['sort'],
                'per_page' => $filters['per_page'],
            ],
        ]);
    }

    /**
     * お問い合わせ詳細を表示する。
     */
    public function show(Request $request, Contact $contact): View
    {
        $filters = $this->normalizeFilters($request);

        $contactIds = $this->buildFilteredQuery($filters)
            ->pluck('id')
            ->toArray();

        $currentIndex = array_search($contact->id, $contactIds, true);

        if ($currentIndex === false) {
            $totalCount = count($contactIds);
            $position = null;
            $previousContactId = null;
            $nextContactId = null;
        } else {
            $totalCount = count($contactIds);
            $position = $currentIndex + 1;
            $previousContactId = $currentIndex > 0 ? $contactIds[$currentIndex - 1] : null;
            $nextContactId = $currentIndex < $totalCount - 1 ? $contactIds[$currentIndex + 1] : null;
        }

        $queryParams = array_filter([
            'status' => $request->query('status'),
            'keyword' => $request->query('keyword'),
            'body_keyword' => $request->query('body_keyword'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'sort' => $request->query('sort'),
            'per_page' => $request->query('per_page'),
            'page' => $request->query('page'),
        ], fn ($val) => $val !== null && $val !== '');

        return view('admin.contacts.show', [
            'contact' => $contact,
            'position' => $position,
            'totalCount' => $totalCount,
            'previousContactId' => $previousContactId,
            'nextContactId' => $nextContactId,
            'queryParams' => $queryParams,
        ]);
    }

    /**
     * お問い合わせのステータスを更新する。
     */
    public function update(UpdateContactStatusRequest $request, Contact $contact): RedirectResponse
    {
        $queryParams = array_filter([
            'status' => $request->query('status'),
            'keyword' => $request->query('keyword'),
            'body_keyword' => $request->query('body_keyword'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'sort' => $request->query('sort'),
            'per_page' => $request->query('per_page'),
            'page' => $request->query('page'),
        ], fn ($val) => $val !== null && $val !== '');

        try {
            $contact->update(['status' => $request->validated('status')]);
        } catch (\Exception $e) {
            Log::error('お問い合わせのステータス更新に失敗しました。', [
                'contact_id' => $contact->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()
                ->route('admin.contacts.show', array_merge(['contact' => $contact], $queryParams))
                ->with('error', 'ステータスの更新中にエラーが発生しました。時間をおいて再度お試しください。');
        }

        return redirect()
            ->route('admin.contacts.show', array_merge(['contact' => $contact], $queryParams))
            ->with('status_updated', 'ステータスを更新しました。');
    }

    /**
     * お問い合わせデータをCSV形式でエクスポートする。
     */
    public function export(Request $request, ContactCsvExporter $exporter)
    {
        $filters = $this->normalizeFilters($request);
        $query = $this->buildFilteredQuery($filters);

        $count = $query->count();
        $limit = config('contact.export_limit', 10000);

        if ($count > $limit) {
            return response()->view('admin.contacts.export-limit-exceeded', [], 422);
        }

        Log::info('CSVエクスポートを実行しました。', [
            'admin_id' => auth()->id(),
            'filters' => [
                'status' => $filters['status'],
                'keyword' => $filters['keyword'],
                'body_keyword' => $filters['body_keyword'],
                'date_from' => $filters['date_from_display'],
                'date_to' => $filters['date_to_display'],
                'sort' => $filters['sort'],
            ],
            'count' => $count,
        ]);

        return $exporter->export($query);
    }

    /**
     * フィルターと統一されたソート順を適用したクエリビルダーを取得する。
     *
     * @param  array  $filters  正規化済みのフィルター条件
     */
    private function buildFilteredQuery(array $filters): Builder
    {
        [$sortColumn, $sortDirection] = self::SORT_OPTIONS[$filters['sort']];

        return Contact::query()
            ->filter($filters)
            ->orderBy($sortColumn, $sortDirection)
            ->orderBy('id', 'desc'); // IDによるタイブレーカー
    }

    /**
     * 一覧の絞り込み・並び替え条件を安全な値に正規化する。
     * 内部管理画面の絞り込みという性質上、不正値はエラーにせずデフォルトへフォールバックする。
     *
     * @return array{status: array<string>, keyword: string, body_keyword: string, date_from: ?Carbon, date_to: ?Carbon, date_from_display: string, date_to_display: string, sort: string, per_page: int}
     */
    private function normalizeFilters(Request $request): array
    {
        $allStatuses = array_map(fn ($case) => $case->value, ContactStatus::cases());

        $statusInput = $request->query('status');
        if ($statusInput === null) {
            $statusInput = $request->query('statuses');
        }

        $rawStatuses = [];
        if (is_array($statusInput)) {
            $rawStatuses = $statusInput;
        } elseif (is_string($statusInput) && $statusInput !== '') {
            $rawStatuses = explode(',', $statusInput);
        }

        $statuses = array_values(array_intersect($rawStatuses, $allStatuses));
        $keyword = trim((string) $request->query('keyword', ''));
        $bodyKeyword = trim((string) $request->query('body_keyword', ''));

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

        $perPageInput = (int) $request->query('per_page', self::DEFAULT_PER_PAGE);
        $perPage = in_array($perPageInput, self::PER_PAGE_OPTIONS, true) ? $perPageInput : self::DEFAULT_PER_PAGE;

        return [
            'status' => $statuses,
            'keyword' => $keyword,
            'body_keyword' => $bodyKeyword,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'date_from_display' => $dateFromDisplayOutput,
            'date_to_display' => $dateToDisplayOutput,
            'sort' => $sort,
            'per_page' => $perPage,
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
