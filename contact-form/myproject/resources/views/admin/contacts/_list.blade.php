<div class="py-3">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex flex-wrap items-center gap-2.5">
            <span class="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                {{ __('全 :count 件', ['count' => $contacts->total()]) }}
            </span>
            @if (isset($statusCounts))
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800 font-semibold text-[11px] sm:text-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {{ __('新規') }}: {{ $statusCounts['new'] ?? 0 }}{{ __('件') }}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-800 font-semibold text-[11px] sm:text-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {{ __('対応中') }}: {{ $statusCounts['in_progress'] ?? 0 }}{{ __('件') }}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800 font-semibold text-[11px] sm:text-xs">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {{ __('解決済み') }}: {{ $statusCounts['resolved'] ?? 0 }}{{ __('件') }}
                    </span>
                </div>
            @endif
        </div>
    </div>

    @if ($contacts->count() > 0)
        <div class="mb-3 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <div class="flex items-center gap-1.5 text-xs">
                <label for="list_per_page_top" class="font-bold text-gray-600 dark:text-gray-400 shrink-0">{{ __('表示件数:') }}</label>
                <select
                    id="list_per_page_top"
                    name="per_page"
                    x-model="perPage"
                    @change="fetchResults()"
                    class="min-h-11 px-2.5 py-1 border border-brand-border rounded-lg bg-white dark:bg-stone-900 text-brand-text text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer shadow-sm"
                >
                    <option value="5">{{ __('5件') }}</option>
                    <option value="10">{{ __('10件') }}</option>
                    <option value="20">{{ __('20件') }}</option>
                    <option value="50">{{ __('50件') }}</option>
                    <option value="100">{{ __('100件') }}</option>
                    <option value="200">{{ __('200件') }}</option>
                </select>
            </div>

            @if ($contacts->hasPages())
                <div data-pagination>
                    {{ $contacts->links() }}
                </div>
            @endif
        </div>

        <div class="space-y-2">
            @foreach ($contacts as $contact)
                <div class="flex items-center gap-1.5 sm:gap-3 animate-slideIn">
                    <div class="w-5 sm:w-9 shrink-0 text-right font-mono text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 select-none">{{ $contacts->firstItem() + $loop->index }}</div>
                    <a href="{{ route('admin.contacts.show', array_merge(['contact' => $contact], request()->only(['status', 'keyword', 'body_keyword', 'date_from', 'date_to', 'sort', 'per_page', 'page']))) }}" class="flex-1 min-w-0 bg-white dark:bg-stone-900 border border-brand-border rounded-lg p-2.5 sm:p-3.5 hover:shadow-md hover:-translate-y-0.5 hover:border-brand-primary/40 dark:hover:border-brand-primary/40 active:scale-[0.995] transition-all duration-200">
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1">
                                    <h3 class="text-sm sm:text-base font-bold text-brand-text truncate">
                                        {{ $contact->name }}
                                    </h3>
                                    <x-contact-status-badge :status="$contact->status" />

                                    <div class="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span>{{ __('登録日時:') }} {{ $contact->created_at->copy()->setTimezone(config('app.display_timezone'))->format('Y年m月d日 H:i') }}</span>
                                    </div>

                                    <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                        <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                        <span class="truncate">{{ $contact->email }}</span>
                                    </div>
                                </div>
                                <p class="text-sm font-semibold text-brand-text truncate sm:mb-0.5">
                                    {{ $contact->subject }}
                                </p>
                                <p class="hidden text-xs text-gray-600 dark:text-gray-400 line-clamp-1 sm:block">
                                    {{ \Illuminate\Support\Str::limit($contact->body, 100) }}
                                </p>
                            </div>
                            <div class="flex-shrink-0 self-center">
                                <svg class="w-4 h-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </div>
                    </a>
                </div>
            @endforeach
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-end gap-3 sm:gap-4">
            <div class="flex items-center gap-1.5 text-xs">
                <label for="list_per_page_bottom" class="font-bold text-gray-600 dark:text-gray-400 shrink-0">{{ __('表示件数:') }}</label>
                <select
                    id="list_per_page_bottom"
                    name="per_page"
                    x-model="perPage"
                    @change="fetchResults()"
                    class="min-h-11 px-2.5 py-1 border border-brand-border rounded-lg bg-white dark:bg-stone-900 text-brand-text text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer shadow-sm"
                >
                    <option value="5">{{ __('5件') }}</option>
                    <option value="10">{{ __('10件') }}</option>
                    <option value="20">{{ __('20件') }}</option>
                    <option value="50">{{ __('50件') }}</option>
                    <option value="100">{{ __('100件') }}</option>
                    <option value="200">{{ __('200件') }}</option>
                </select>
            </div>

            @if ($contacts->hasPages())
                <div data-pagination>
                    {{ $contacts->links() }}
                </div>
            @endif
        </div>
    @else
        <div class="bg-white dark:bg-stone-900 border border-brand-border rounded-xl p-12 text-center shadow-sm animate-slideIn">
            <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path>
            </svg>
            <p class="text-gray-600 dark:text-gray-400 text-base">{{ __('お問い合わせはまだありません。') }}</p>
        </div>
    @endif
</div>
