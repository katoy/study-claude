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

        <div class="overflow-x-auto border border-brand-border rounded-lg shadow-sm">
            <table class="w-full bg-white dark:bg-stone-900">
                <thead>
                    <tr class="border-b border-brand-border/40 bg-gray-50 dark:bg-stone-800/50">
                        <th scope="col" class="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 w-12">
                            {{ __('No') }}
                        </th>
                        <th scope="col" class="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 w-20">
                            {{ __('ステータス') }}
                        </th>
                        <th scope="col" class="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 w-32 sm:w-40">
                            {{ __('名前') }}
                        </th>
                        <th scope="col" class="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 w-24 sm:w-32">
                            {{ __('登録日') }}
                        </th>
                        <th scope="col" class="px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex-1 min-w-32">
                            {{ __('件名') }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-brand-border/40">
                    @foreach ($contacts as $contact)
                        <tr class="hover:bg-gray-50 dark:hover:bg-stone-800/30 transition-colors duration-150 animate-slideIn align-middle">
                            <td class="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-mono font-bold text-gray-600 dark:text-gray-300 text-right align-middle">{{ $contacts->firstItem() + $loop->index }}</td>
                            <td class="px-3 sm:px-4 py-2 sm:py-2.5 align-middle whitespace-nowrap">
                                <x-contact-status-badge :status="$contact->status" />
                            </td>
                            <td class="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-brand-text truncate align-middle">
                                <a href="{{ route('admin.contacts.show', array_merge(['contact' => $contact], request()->only(['status', 'keyword', 'body_keyword', 'date_from', 'date_to', 'sort', 'per_page', 'page']))) }}" class="hover:text-brand-primary transition-colors duration-150" :href>
                                    {{ $contact->name }}
                                </a>
                            </td>
                            <td class="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap align-middle">
                                <a href="{{ route('admin.contacts.show', array_merge(['contact' => $contact], request()->only(['status', 'keyword', 'body_keyword', 'date_from', 'date_to', 'sort', 'per_page', 'page']))) }}" class="hover:text-brand-primary transition-colors duration-150">
                                    {{ $contact->formatted_created_at }}
                                </a>
                            </td>
                            <td class="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate align-middle">
                                <a href="{{ route('admin.contacts.show', array_merge(['contact' => $contact], request()->only(['status', 'keyword', 'body_keyword', 'date_from', 'date_to', 'sort', 'per_page', 'page']))) }}" class="hover:text-brand-primary transition-colors duration-150">
                                    {{ $contact->subject }}
                                </a>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
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
