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
                <!-- 条件指定エリア最上部ヘッダー（折りたたみトグル付き） -->
                <div class="flex items-center justify-between pb-3 transition-all duration-200" :class="{ 'border-b border-brand-border/40 mb-5': isExpanded }">
                    <button
                        type="button"
                        @click="toggleExpanded()"
                        class="text-sm font-bold text-brand-text flex items-center gap-2 hover:text-brand-primary transition-colors cursor-pointer group"
                    >
                        <svg class="w-4 h-4 text-brand-primary transition-transform duration-300" :class="{ 'rotate-180': !isExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                        <span>{{ __('絞り込み条件') }}</span>
                        <span x-show="!isExpanded && hasActiveFilters" class="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-brand-primary/10 text-brand-primary rounded-full">
                            <span x-text="`${activeFilterCount}件の条件適用中`"></span>
                        </span>
                    </button>

                    <div class="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            @click="resetFilters()"
                            :disabled="!hasActiveFilters"
                            :class="{
                                'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/80 shadow-2xs cursor-pointer': hasActiveFilters,
                                'bg-gray-100 text-gray-400 border-gray-200 dark:bg-stone-800/60 dark:text-gray-600 dark:border-stone-800 cursor-not-allowed opacity-60': !hasActiveFilters
                            }"
                            class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex items-center gap-1.5"
                        >
                            <svg class="w-3.5 h-3.5 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': hasActiveFilters }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            <span x-text="hasActiveFilters ? `条件をクリア (${activeFilterCount})` : '{{ __('絞り込みなし') }}'"></span>
                        </button>

                        <button
                            type="button"
                            @click="toggleExpanded()"
                            class="p-1.5 text-gray-400 hover:text-brand-text rounded-lg hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                            :title="isExpanded ? '{{ __('折りたたむ') }}' : '{{ __('展開する') }}'"
                        >
                            <svg class="w-4 h-4 transition-transform duration-300" :class="{ 'rotate-180': !isExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- フォームボディ (折りたたみ対象) -->
                <div
                    x-show="isExpanded"
                    x-transition:enter="transition ease-out duration-200"
                    x-transition:enter-start="opacity-0 -translate-y-2"
                    x-transition:enter-end="opacity-100 translate-y-0"
                    x-transition:leave="transition ease-in duration-150"
                    x-transition:leave-start="opacity-100 translate-y-0"
                    x-transition:leave-end="opacity-0 -translate-y-2"
                >
                    <!-- 1行目: キーワード検索 (名前・メール・件名) & 本文検索 -->
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
                            <x-filter-history-tags
                                items="keywordHistory"
                                onSelect="selectKeywordHistory(item)"
                                onRemove="removeKeywordHistoryItem(item)"
                                onClear="clearKeywordHistory()"
                            />
                        </div>

                        <!-- 本文検索 -->
                        <div>
                            <x-form-label for="body_keyword">
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
                            <x-filter-history-tags
                                items="bodyKeywordHistory"
                                onSelect="selectBodyKeywordHistory(item)"
                                onRemove="removeBodyKeywordHistoryItem(item)"
                                onClear="clearBodyKeywordHistory()"
                            />
                        </div>
                    </div>

                    <!-- 2行目: 並び順, 表示件数, ステータス, 登録日(開始), 登録日(終了) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

                        <!-- 表示件数 -->
                        <div>
                            <x-form-label for="per_page">
                                {{ __('表示件数') }}
                            </x-form-label>
                            <x-form-select
                                id="per_page"
                                name="per_page"
                                :options="[
                                    20 => __('20件（デフォルト）'),
                                    5 => __('5件'),
                                    10 => __('10件'),
                                    50 => __('50件'),
                                    100 => __('100件'),
                                    200 => __('200件'),
                                ]"
                                :selected="$filters['per_page']"
                                x-model="perPage"
                                @change="fetchResults()"
                            />
                        </div>

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
                                @click="$el.showPicker && $el.showPicker()"
                                @change="fetchResults()"
                                class="cursor-pointer"
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
                                @click="$el.showPicker && $el.showPicker()"
                                @change="fetchResults()"
                                class="cursor-pointer"
                            />
                        </div>

                        <!-- 登録日 履歴一覧 -->
                        <x-filter-history-tags
                            items="dateHistory"
                            label="登録日履歴"
                            onSelect="selectDateHistory(item)"
                            onRemove="removeDateHistoryItem(item)"
                            onClear="clearDateHistory()"
                            displayKey="label"
                            class="col-span-1 sm:col-span-2 lg:col-span-5 pt-3 border-t border-brand-border/40"
                        />
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
