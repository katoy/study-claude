<?php

namespace App\DTO;

use App\Enums\ContactStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * お問い合わせ一覧の検索条件・ソート・ページング設定を保持するDTO。
 */
class ContactFilter
{
    private const DEFAULT_SORT = 'created_at-desc';

    private const DEFAULT_PER_PAGE = 20;

    private const PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 200];

    private const SORT_OPTIONS = [
        'created_at-desc' => ['created_at', 'desc'],
        'created_at-asc' => ['created_at', 'asc'],
        'status-asc' => ['status', 'asc'],
        'name-asc' => ['name', 'asc'],
    ];

    public readonly array $rawQueryParams;

    public function __construct(
        public readonly array $status,
        public readonly string $keyword,
        public readonly string $bodyKeyword,
        public readonly ?Carbon $dateFrom,
        public readonly ?Carbon $dateTo,
        public readonly string $dateFromDisplay,
        public readonly string $dateToDisplay,
        public readonly string $sort,
        public readonly int $perPage,
        public readonly ?int $page = null,
        array $rawQueryParams = []
    ) {
        $this->rawQueryParams = $rawQueryParams;
    }

    /**
     * HTTPリクエストからフィルタ条件を抽出し、正規化されたインスタンスを生成する。
     */
    public static function fromRequest(Request $request): self
    {
        $allStatuses = array_map(fn ($case) => $case->value, ContactStatus::cases());

        $statusInput = $request->query('status') ?? $request->query('statuses');
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

        // 日付の逆転チェック
        if (is_string($dateFromDisplay) && is_string($dateToDisplay) && $dateFromDisplay && $dateToDisplay && $dateFromDisplay > $dateToDisplay) {
            [$dateFromDisplay, $dateToDisplay] = [$dateToDisplay, $dateFromDisplay];
        }

        [$dateFrom, $dateFromDisplayOutput] = self::normalizeDate($dateFromDisplay, false);
        [$dateTo, $dateToDisplayOutput] = self::normalizeDate($dateToDisplay, true);

        $sortInput = (string) $request->query('sort', self::DEFAULT_SORT);
        $sort = array_key_exists($sortInput, self::SORT_OPTIONS) ? $sortInput : self::DEFAULT_SORT;

        $perPageInput = (int) $request->query('per_page', self::DEFAULT_PER_PAGE);
        $perPage = in_array($perPageInput, self::PER_PAGE_OPTIONS, true) ? $perPageInput : self::DEFAULT_PER_PAGE;

        $pageInput = $request->query('page');
        $page = $pageInput !== null ? (int) $pageInput : null;

        // リクエストで明示的に指定された生のクエリパラメータを抽出（空値除外）
        $rawQueryParams = array_filter([
            'status' => $request->query('status'),
            'keyword' => $request->query('keyword'),
            'body_keyword' => $request->query('body_keyword'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'sort' => $request->query('sort'),
            'per_page' => $request->query('per_page'),
            'page' => $request->query('page'),
        ], fn ($val) => $val !== null && $val !== '' && $val !== []);

        return new self(
            status: $statuses,
            keyword: $keyword,
            bodyKeyword: $bodyKeyword,
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            dateFromDisplay: $dateFromDisplayOutput,
            dateToDisplay: $dateToDisplayOutput,
            sort: $sort,
            perPage: $perPage,
            page: $page,
            rawQueryParams: $rawQueryParams
        );
    }

    /**
     * "Y-m-d" 形式の日付文字列を検証し、UTCに変換して返す。
     */
    private static function normalizeDate(mixed $value, bool $isEndOfDay = false): array
    {
        if (! is_string($value) || $value === '') {
            return [null, ''];
        }

        try {
            $date = Carbon::createFromFormat('Y-m-d', $value, config('app.display_timezone'));
        } catch (\Exception) {
            return [null, ''];
        }

        if (! ($date && $date->format('Y-m-d') === $value)) {
            return [null, ''];
        }

        if ($isEndOfDay) {
            $date = $date->setTime(23, 59, 59);
        } else {
            $date = $date->setTime(0, 0, 0);
        }

        return [$date->utc(), $value];
    }

    public function getSortColumn(): string
    {
        return self::SORT_OPTIONS[$this->sort][0];
    }

    public function getSortDirection(): string
    {
        return self::SORT_OPTIONS[$this->sort][1];
    }

    /**
     * URLのクエリパラメータ構築用の配列を生成する。
     */
    public function toQueryArray(): array
    {
        return $this->rawQueryParams;
    }

    /**
     * ビュー表示用のフィルタ条件配列を生成する。
     */
    public function toDisplayArray(): array
    {
        return [
            'status' => $this->status,
            'keyword' => $this->keyword,
            'body_keyword' => $this->bodyKeyword,
            'date_from' => $this->dateFromDisplay,
            'date_to' => $this->dateToDisplay,
            'sort' => $this->sort,
            'per_page' => $this->perPage,
        ];
    }
}
