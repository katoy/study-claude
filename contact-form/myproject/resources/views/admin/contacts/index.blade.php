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
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <!-- キーワード検索 -->
                    <div>
                        <x-form-label for="keyword">
                            {{ __('キーワード') }}
                        </x-form-label>
                        <x-form-input
                            id="keyword"
                            name="keyword"
                            type="text"
                            placeholder="名前・メール・件名・本文"
                            x-model="keyword"
                            @input.debounce.400ms="fetchResults()"
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
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <!-- クリアボタン -->
                    <div class="flex items-end">
                        <button
                            type="button"
                            @click="resetFilters()"
                            class="w-full px-5 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors duration-200"
                        >
                            {{ __('絞り込みを解除') }}
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
