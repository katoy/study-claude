<?php

namespace App\Http\Controllers\Admin;

use App\DTO\ContactFilter;
use App\Enums\ContactStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateContactStatusRequest;
use App\Models\Contact;
use App\Services\ContactCsvExporter;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    /**
     * お問い合わせ一覧を表示する。
     */
    public function index(Request $request): View
    {
        $filters = ContactFilter::fromRequest($request);

        $contacts = $this->buildFilteredQuery($filters)
            ->paginate($filters->perPage)
            ->withQueryString();

        $filtersForCounts = new ContactFilter(
            status: [],
            keyword: $filters->keyword,
            bodyKeyword: $filters->bodyKeyword,
            dateFrom: $filters->dateFrom,
            dateTo: $filters->dateTo,
            dateFromDisplay: $filters->dateFromDisplay,
            dateToDisplay: $filters->dateToDisplay,
            sort: $filters->sort,
            perPage: $filters->perPage
        );

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

        return view($view, [
            'contacts' => $contacts,
            'statusCounts' => $statusCounts,
            'exportQuery' => $filters->toQueryArray(),
            'filters' => $filters->toDisplayArray(),
        ]);
    }

    /**
     * お問い合わせ詳細を表示する。
     */
    public function show(Request $request, Contact $contact): View
    {
        $filters = ContactFilter::fromRequest($request);

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

        return view('admin.contacts.show', [
            'contact' => $contact,
            'position' => $position,
            'totalCount' => $totalCount,
            'previousContactId' => $previousContactId,
            'nextContactId' => $nextContactId,
            'queryParams' => $filters->toQueryArray(),
        ]);
    }

    /**
     * お問い合わせのステータスを更新する。
     */
    public function update(UpdateContactStatusRequest $request, Contact $contact): RedirectResponse
    {
        $filters = ContactFilter::fromRequest($request);
        $queryParams = $filters->toQueryArray();

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
        $filters = ContactFilter::fromRequest($request);
        $query = $this->buildFilteredQuery($filters);

        $count = $query->count();
        $limit = config('contact.export_limit', 10000);

        if ($count > $limit) {
            return response()->view('admin.contacts.export-limit-exceeded', [], 422);
        }

        Log::info('CSVエクスポートを実行しました。', [
            'admin_id' => auth()->id(),
            'filters' => $filters->toDisplayArray(),
            'count' => $count,
        ]);

        return $exporter->export($query);
    }

    /**
     * フィルターと統一されたソート順を適用したクエリビルダーを取得する。
     */
    private function buildFilteredQuery(ContactFilter $filters): Builder
    {
        return Contact::query()
            ->filter($filters)
            ->orderBy($filters->getSortColumn(), $filters->getSortDirection())
            ->orderBy('id', 'desc'); // IDによるタイブレーカー
    }
}
