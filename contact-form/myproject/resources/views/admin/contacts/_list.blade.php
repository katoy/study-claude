<div class="py-6">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm font-bold text-gray-700 dark:text-gray-300">
                全 {{ $contacts->total() }} 件
            </span>
            @if (isset($statusCounts))
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800 font-semibold">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        新規: {{ $statusCounts['new'] ?? 0 }}件
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-800 font-semibold">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        対応中: {{ $statusCounts['in_progress'] ?? 0 }}件
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800 font-semibold">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        解決済み: {{ $statusCounts['resolved'] ?? 0 }}件
                    </span>
                </div>
            @endif
        </div>
    </div>

    @if ($contacts->count() > 0)
        <div class="space-y-4">
            @foreach ($contacts as $contact)
                <a href="{{ route('admin.contacts.show', $contact) }}" class="block bg-white dark:bg-stone-900 border border-brand-border rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-primary/40 dark:hover:border-brand-primary/40 active:scale-[0.995] transition-all duration-200 animate-slideIn">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                                <h3 class="text-lg font-bold text-brand-text truncate">
                                    {{ $contact->name }}
                                </h3>
                                <x-contact-status-badge :status="$contact->status" />

                                <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>登録日時: {{ $contact->created_at->copy()->setTimezone(config('app.display_timezone'))->format('Y年m月d日 H:i') }}</span>
                                </div>

                                <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                    <svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                    <span class="truncate">{{ $contact->email }}</span>
                                </div>
                            </div>
                            <p class="text-base font-semibold text-brand-text mb-1 truncate">
                                {{ $contact->subject }}
                            </p>
                            <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {{ \Illuminate\Support\Str::limit($contact->body, 100) }}
                            </p>
                        </div>
                        <div class="flex-shrink-0 self-center">
                            <svg class="w-5 h-5 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </div>
                </a>
            @endforeach
        </div>

        <div class="mt-8" data-pagination>
            {{ $contacts->links() }}
        </div>
    @else
        <div class="bg-white dark:bg-stone-900 border border-brand-border rounded-xl p-16 text-center shadow-sm animate-slideIn">
            <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"></path>
            </svg>
            <p class="text-gray-600 dark:text-gray-400 text-lg">お問い合わせはまだありません。</p>
        </div>
    @endif
</div>
