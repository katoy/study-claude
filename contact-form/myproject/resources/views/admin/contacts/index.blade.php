<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-brand-text leading-tight">
            {{ __('お問い合わせ一覧') }}
        </h2>
    </x-slot>

    <div class="py-12" x-data="contactFilters(@js($filters))">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <!-- 絞り込み・並び替えフォーム -->
            <div class="bg-white dark:bg-stone-900 border border-brand-border rounded-xl p-6 mb-8 shadow-sm">
                <!-- 1行目: キーワード検索 & 本文検索 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <!-- キーワード検索 -->
                    <div>
                        <x-form-label for="keyword">
                            {{ __('キーワード（名前・メール・件名）') }}
                        </x-form-label>
                        <x-form-input
                            id="keyword"
                            name="keyword"
                            type="text"
                            placeholder="名前・メール・件名"
                            x-model="keyword"
                            list="keyword-history-list"
                            @input.debounce.400ms="fetchResults()"
                        />
                        <datalist id="keyword-history-list">
                            <template x-for="item in keywordHistory" :key="item">
                                <option :value="item"></option>
                            </template>
                        </datalist>
                        <template x-if="keywordHistory.length > 0">
                            <div class="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <span class="font-medium text-gray-400">履歴:</span>
                                <template x-for="item in keywordHistory.slice(0, 5)" :key="item">
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-stone-800 rounded-md border border-gray-200 dark:border-stone-700">
                                        <button
                                            type="button"
                                            @click="selectKeywordHistory(item)"
                                            class="hover:text-brand-primary truncate max-w-[100px] transition-colors"
                                            :title="'引用: ' + item"
                                            x-text="item"
                                        ></button>
                                        <button
                                            type="button"
                                            @click.stop="removeKeywordHistoryItem(item)"
                                            class="text-gray-400 hover:text-rose-500 font-bold ml-0.5 leading-none transition-colors"
                                            title="この履歴を削除"
                                        >&times;</button>
                                    </span>
                                </template>
                                <button
                                    type="button"
                                    @click="clearKeywordHistory()"
                                    class="text-[11px] text-gray-400 hover:text-rose-500 underline ml-1 transition-colors"
                                    title="履歴を全削除"
                                >全削除</button>
                            </div>
                        </template>
                    </div>

                    <!-- 本文検索 -->
                    <div>
                        <x-form-label for="body_keyword" class="text-right">
                            {{ __('本文キーワード') }}
                        </x-form-label>
                        <x-form-input
                            id="body_keyword"
                            name="body_keyword"
                            type="text"
                            placeholder="本文に含まれる文字"
                            x-model="bodyKeyword"
                            list="body-keyword-history-list"
                            @input.debounce.400ms="fetchResults()"
                        />
                        <datalist id="body-keyword-history-list">
                            <template x-for="item in bodyKeywordHistory" :key="item">
                                <option :value="item"></option>
                            </template>
                        </datalist>
                        <template x-if="bodyKeywordHistory.length > 0">
                            <div class="flex flex-wrap items-center justify-end gap-1.5 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <span class="font-medium text-gray-400">履歴:</span>
                                <template x-for="item in bodyKeywordHistory.slice(0, 5)" :key="item">
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-stone-800 rounded-md border border-gray-200 dark:border-stone-700">
                                        <button
                                            type="button"
                                            @click="selectBodyKeywordHistory(item)"
                                            class="hover:text-brand-primary truncate max-w-[100px] transition-colors"
                                            :title="'引用: ' + item"
                                            x-text="item"
                                        ></button>
                                        <button
                                            type="button"
                                            @click.stop="removeBodyKeywordHistoryItem(item)"
                                            class="text-gray-400 hover:text-rose-500 font-bold ml-0.5 leading-none transition-colors"
                                            title="この履歴を削除"
                                        >&times;</button>
                                    </span>
                                </template>
                                <button
                                    type="button"
                                    @click="clearBodyKeywordHistory()"
                                    class="text-[11px] text-gray-400 hover:text-rose-500 underline ml-1 transition-colors"
                                    title="履歴を全削除"
                                >全削除</button>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- 2行目: ステータス, 登録日(開始), 登録日(終了), 並び順, 絞り込み解除 -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <!-- ステータス -->
                    <div>
                        <x-form-label for="status">
                            {{ __('ステータス') }}
                        </x-form-label>
                        <x-form-select
                            id="status"
                            name="status"
                            :options="['' => __('すべて')] + collect(\App\Enums\ContactStatus::cases())->mapWithKeys(fn($case) => [$case->value => $case->label()])->toArray()"
                            :selected="$filters['status']"
                            x-model="status"
                            @change="fetchResults()"
                        />
                    </div>

                    <!-- 登録日 開始日 -->
                    <div>
                        <x-form-label for="date_from">
                            {{ __('登録日（開始）') }}
                        </x-form-label>
                        <x-form-input
                            id="date_from"
                            name="date_from"
                            type="date"
                            x-model="dateFrom"
                            @change="fetchResults()"
                        />
                    </div>

                    <!-- 登録日 終了日 -->
                    <div>
                        <x-form-label for="date_to">
                            {{ __('登録日（終了）') }}
                        </x-form-label>
                        <x-form-input
                            id="date_to"
                            name="date_to"
                            type="date"
                            x-model="dateTo"
                            @change="fetchResults()"
                        />
                    </div>

                    <!-- 並び順 -->
                    <div>
                        <x-form-label for="sort">
                            {{ __('並び順') }}
                        </x-form-label>
                        <x-form-select
                            id="sort"
                            name="sort"
                            :options="[
                                'created_at-desc' => __('登録日時が新しい順'),
                                'created_at-asc' => __('登録日時が古い順'),
                                'status-asc' => __('ステータス順'),
                                'name-asc' => __('名前順'),
                            ]"
                            :selected="$filters['sort']"
                            x-model="sort"
                            @change="fetchResults()"
                        />
                    </div>

                    <!-- 絞り込み解除ボタン -->
                    <div class="flex items-end">
                        <button
                            type="button"
                            @click="resetFilters()"
                            :disabled="!hasActiveFilters"
                            :class="{
                                'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/80 shadow-2xs cursor-pointer': hasActiveFilters,
                                'bg-gray-100 text-gray-400 border-gray-200 dark:bg-stone-800/60 dark:text-gray-600 dark:border-stone-800 cursor-not-allowed opacity-60': !hasActiveFilters
                            }"
                            class="w-full px-4 py-2.5 font-semibold rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                            <svg class="w-4 h-4 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': hasActiveFilters }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            <span x-text="hasActiveFilters ? `条件をクリア (${activeFilterCount})` : '絞り込みなし'"></span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 一覧結果 -->
            <div
                id="contacts-list"
                x-ref="results"
                @click="handleListClick($event)"
                :class="{ 'opacity-50 pointer-events-none': loading }"
            >
                @include('admin.contacts._list')
            </div>
        </div>
    </div>
</x-app-layout>
