<x-app-layout>
    <x-slot name="header">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 class="font-semibold text-2xl text-brand-text leading-tight">
                {{ __('お問い合わせ詳細') }}
            </h2>
            <div class="flex flex-wrap items-center gap-3">
                @if ($position !== null)
                    <span class="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-lg border border-brand-border/60 shadow-sm">
                        {{ __(':total 件中 :pos 件目', ['total' => $totalCount, 'pos' => $position]) }}
                    </span>
                @endif
                <div class="flex items-center gap-2">
                    @if ($previousContactId)
                        <a href="{{ route('admin.contacts.show', array_merge(['contact' => $previousContactId], $queryParams)) }}" class="min-h-11 px-3.5 py-1.5 bg-white dark:bg-stone-800 border border-brand-border rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-stone-700 active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            {{ __('前へ') }}
                        </a>
                    @else
                        <button disabled class="min-h-11 px-3.5 py-1.5 bg-gray-100 dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg text-sm font-semibold text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                            </svg>
                            {{ __('前へ') }}
                        </button>
                    @endif

                    @if ($nextContactId)
                        <a href="{{ route('admin.contacts.show', array_merge(['contact' => $nextContactId], $queryParams)) }}" class="min-h-11 px-3.5 py-1.5 bg-white dark:bg-stone-800 border border-brand-border rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-stone-700 active:scale-95 transition-all flex items-center gap-1 shadow-sm">
                            {{ __('次へ') }}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </a>
                    @else
                        <button disabled class="min-h-11 px-3.5 py-1.5 bg-gray-100 dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-lg text-sm font-semibold text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center gap-1">
                            {{ __('次へ') }}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    @endif

                    <a href="{{ route('admin.contacts.index', $queryParams) }}" class="min-h-11 ml-0 sm:ml-2 text-sm font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7 7-7"></path>
                        </svg>
                        {{ __('一覧に戻る') }}
                    </a>
                </div>
            </div>
        </div>
    </x-slot>

    <div class="py-6 sm:py-12">
        <div class="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
            <x-status-badge status="success" :message="session('status_updated')" />
            <x-status-badge status="error" :message="session('error')" />

            <div class="bg-white dark:bg-stone-900 border border-brand-border rounded-xl shadow-sm overflow-hidden animate-slideIn">
                <div class="p-5 sm:p-8">
                    <!-- ヘッダー情報: 名前 + ステータスバッジ -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-border/60 mb-8">
                        <div>
                            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{{ __('お名前') }}</span>
                            <h3 class="text-2xl font-bold text-brand-text mt-1">{{ $contact->name }}</h3>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:text-right block">{{ __('現在のステータス') }}</span>
                            <x-contact-status-badge :status="$contact->status" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <!-- 受信日時 -->
                        <div class="p-4 bg-brand-light dark:bg-stone-950 rounded-xl border border-brand-border/40">
                            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{{ __('受信日時') }}</p>
                            <p class="text-base text-brand-text font-medium">{{ $contact->formatted_created_at }}</p>
                        </div>

                        <!-- メールアドレス -->
                        <div class="p-4 bg-brand-light dark:bg-stone-950 rounded-xl border border-brand-border/40">
                            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{{ __('メールアドレス') }}</p>
                            <a href="mailto:{{ $contact->email }}" class="text-base text-brand-primary hover:text-brand-primary/80 font-medium break-all hover:underline">
                                {{ $contact->email }}
                            </a>
                        </div>
                    </div>

                    <!-- 件名 -->
                    <div class="mb-8 pb-6 border-b border-brand-border/60">
                        <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{{ __('件名') }}</p>
                        <p class="text-xl text-brand-text font-bold leading-snug">{{ $contact->subject }}</p>
                    </div>

                    <!-- 本文 -->
                    <div class="mb-10">
                        <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{{ __('本文') }}</p>
                        <div class="text-left text-base text-brand-text whitespace-pre-wrap leading-relaxed bg-brand-light dark:bg-stone-950 p-6 rounded-xl border border-brand-border/40">{{ $contact->body }}</div>
                    </div>

                    <!-- ステータス変更フォーム -->
                    <div class="pt-8 border-t border-brand-border/60">
                        <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">{{ __('対応ステータスの変更') }}</p>
                        <form method="POST" action="{{ route('admin.contacts.update', array_merge(['contact' => $contact], $queryParams)) }}" class="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 max-w-md">
                            @csrf
                            @method('PATCH')

                            <div class="flex-1">
                                <select name="status" class="block w-full px-4 py-3 border border-brand-border rounded-lg bg-brand-light dark:bg-stone-950 text-brand-text focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-950 transition-all duration-200">
                                    @foreach (App\Enums\ContactStatus::cases() as $status)
                                        <option value="{{ $status->value }}" @selected($contact->status->value === $status->value)>
                                            {{ $status->label() }}
                                        </option>
                                    @endforeach
                                </select>
                            </div>

                            <x-button-primary type="submit" size="sm">
                                {{ __('ステータスを更新') }}
                            </x-button-primary>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
