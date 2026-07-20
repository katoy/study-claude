

import Alpine from 'alpinejs';

window.Alpine = Alpine;

/**
 * お問い合わせ一覧の絞り込み・ソート・ページネーション Ajax コンポーネント。
 * initial にはサーバー側で正規化済みの現在の絞り込み条件（filters）を渡す。
 */
Alpine.data('contactFilters', (initial) => ({
    status: initial.status ?? '',
    keyword: initial.keyword ?? '',
    bodyKeyword: initial.body_keyword ?? '',
    dateFrom: initial.date_from ?? '',
    dateTo: initial.date_to ?? '',
    sort: initial.sort ?? 'created_at-desc',
    keywordHistory: [],
    bodyKeywordHistory: [],
    dateHistory: [],
    loading: false,

    /**
     * 現在適用されている絞り込み条件の数を返す。
     */
    get activeFilterCount() {
        let count = 0;
        if (this.status) count++;
        if (this.keyword) count++;
        if (this.bodyKeyword) count++;
        if (this.dateFrom) count++;
        if (this.dateTo) count++;
        if (this.sort && this.sort !== 'created_at-desc') count++;
        return count;
    },

    get hasActiveFilters() {
        return this.activeFilterCount > 0;
    },

    init() {
        this.loadHistory();
        this.saveCurrentKeywordsToHistory();
        // ブラウザの戻る/進むでURLが変化したら一覧を再取得する
        window.addEventListener('popstate', () => this.fetchResults(window.location.href, false));
    },

    /**
     * LocalStorage から過去の検索履歴を読み込む。
     */
    loadHistory() {
        try {
            this.keywordHistory = JSON.parse(localStorage.getItem('contact_keyword_history') || '[]');
            this.bodyKeywordHistory = JSON.parse(localStorage.getItem('contact_body_keyword_history') || '[]');
            this.dateHistory = JSON.parse(localStorage.getItem('contact_date_history') || '[]');
        } catch {
            this.keywordHistory = [];
            this.bodyKeywordHistory = [];
            this.dateHistory = [];
        }
    },

    /**
     * 現在入力されているキーワードおよび日付指定を履歴に保存する（直近10件、重複除去）。
     */
    saveCurrentKeywordsToHistory() {
        if (this.keyword.trim()) {
            const val = this.keyword.trim();
            this.keywordHistory = [val, ...this.keywordHistory.filter((item) => item !== val)].slice(0, 10);
            try {
                localStorage.setItem('contact_keyword_history', JSON.stringify(this.keywordHistory));
            } catch {}
        }

        if (this.bodyKeyword.trim()) {
            const val = this.bodyKeyword.trim();
            this.bodyKeywordHistory = [val, ...this.bodyKeywordHistory.filter((item) => item !== val)].slice(0, 10);
            try {
                localStorage.setItem('contact_body_keyword_history', JSON.stringify(this.bodyKeywordHistory));
            } catch {}
        }

        if (this.dateFrom || this.dateTo) {
            const from = this.dateFrom || '';
            const to = this.dateTo || '';
            let label = '';
            if (from && to) {
                label = `${from} ～ ${to}`;
            } else if (from) {
                label = `${from} ～`;
            } else {
                label = `～ ${to}`;
            }

            const item = { from, to, label };
            this.dateHistory = [
                item,
                ...this.dateHistory.filter((i) => i.from !== from || i.to !== to),
            ].slice(0, 10);

            try {
                localStorage.setItem('contact_date_history', JSON.stringify(this.dateHistory));
            } catch {}
        }
    },

    selectKeywordHistory(val) {
        this.keyword = val;
        this.fetchResults();
    },

    selectBodyKeywordHistory(val) {
        this.bodyKeyword = val;
        this.fetchResults();
    },

    selectDateHistory(item) {
        this.dateFrom = item.from;
        this.dateTo = item.to;
        this.fetchResults();
    },

    removeKeywordHistoryItem(val) {
        this.keywordHistory = this.keywordHistory.filter((item) => item !== val);
        try {
            localStorage.setItem('contact_keyword_history', JSON.stringify(this.keywordHistory));
        } catch {}
    },

    removeBodyKeywordHistoryItem(val) {
        this.bodyKeywordHistory = this.bodyKeywordHistory.filter((item) => item !== val);
        try {
            localStorage.setItem('contact_body_keyword_history', JSON.stringify(this.bodyKeywordHistory));
        } catch {}
    },

    removeDateHistoryItem(item) {
        this.dateHistory = this.dateHistory.filter((i) => i.from !== item.from || i.to !== item.to);
        try {
            localStorage.setItem('contact_date_history', JSON.stringify(this.dateHistory));
        } catch {}
    },

    clearKeywordHistory() {
        this.keywordHistory = [];
        try {
            localStorage.removeItem('contact_keyword_history');
        } catch {}
    },

    clearBodyKeywordHistory() {
        this.bodyKeywordHistory = [];
        try {
            localStorage.removeItem('contact_body_keyword_history');
        } catch {}
    },

    clearDateHistory() {
        this.dateHistory = [];
        try {
            localStorage.removeItem('contact_date_history');
        } catch {}
    },

    /**
     * 現在のフォーム状態からクエリ文字列を組み立てる。
     * デフォルト値と同じ項目は省略してURLを簡潔に保つ。
     */
    buildQueryString() {
        const params = new URLSearchParams();
        if (this.status) params.set('status', this.status);
        if (this.keyword) params.set('keyword', this.keyword);
        if (this.bodyKeyword) params.set('body_keyword', this.bodyKeyword);
        if (this.dateFrom) params.set('date_from', this.dateFrom);
        if (this.dateTo) params.set('date_to', this.dateTo);
        if (this.sort && this.sort !== 'created_at-desc') params.set('sort', this.sort);
        return params.toString();
    },

    /**
     * 一覧を Ajax で再取得し、結果を差し替える。
     * url 指定時（ページネーションリンク等）はそのURLをそのまま使用する。
     * pushState=false は popstate 経由の呼び出し（履歴に追加しない）用。
     */
    async fetchResults(url = null, pushState = true) {
        this.saveCurrentKeywordsToHistory();
        const target = url ?? `${window.location.pathname}?${this.buildQueryString()}`;
        this.loading = true;

        try {
            const response = await fetch(target, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) {
                throw new Error(`一覧の取得に失敗しました (status: ${response.status})`);
            }

            // サーバーから返されたビューの HTML（信頼できるコンテンツ）を差し込む
            this.$refs.results.innerHTML = await response.text();

            if (pushState) {
                window.history.pushState({}, '', target);
            }
            this.syncStateFromUrl(target);
        } catch (error) {
            console.error(error);
        } finally {
            this.loading = false;
        }
    },

    /**
     * URL のクエリ文字列からフォーム状態を復元する（戻る/進む対応）。
     */
    syncStateFromUrl(url) {
        const params = new URL(url, window.location.origin).searchParams;
        this.status = params.get('status') ?? '';
        this.keyword = params.get('keyword') ?? '';
        this.bodyKeyword = params.get('body_keyword') ?? '';
        this.dateFrom = params.get('date_from') ?? '';
        this.dateTo = params.get('date_to') ?? '';
        this.sort = params.get('sort') ?? 'created_at-desc';
    },

    /**
     * 一覧内のページネーションリンククリックを Ajax 遷移に変換する。
     */
    handleListClick(event) {
        const link = event.target.closest('[data-pagination] a');
        if (!link) return;
        event.preventDefault();
        this.fetchResults(link.href);
    },

    /**
     * 絞り込み条件をクリアする。
     */
    resetFilters() {
        this.status = '';
        this.keyword = '';
        this.bodyKeyword = '';
        this.dateFrom = '';
        this.dateTo = '';
        this.sort = 'created_at-desc';
        this.fetchResults();
    },
}));

Alpine.start();
