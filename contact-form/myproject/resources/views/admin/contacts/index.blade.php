<x-app-layout>
    <x-slot name="header">
        <div class="flex items-center justify-between">
            <h2 class="font-semibold text-2xl text-brand-text leading-tight">
                {{ __('お問い合わせ一覧') }}
            </h2>
            <span class="text-sm text-gray-600 dark:text-gray-400">
                全 {{ $contacts->total() }} 件
            </span>
        </div>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            @if ($contacts->count() > 0)
                <div class="space-y-4">
                    @foreach ($contacts as $contact)
                        <a href="{{ route('admin.contacts.show', $contact) }}" class="block bg-white dark:bg-stone-900 border border-brand-border rounded-xl p-6 hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-primary/40 dark:hover:border-brand-primary/40 active:scale-[0.995] transition-all duration-200 animate-slideIn">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-3 mb-2">
                                        <h3 class="text-lg font-bold text-brand-text truncate">
                                            {{ $contact->name }}
                                        </h3>
                                        <x-contact-status-badge :status="$contact->status" />
                                    </div>
                                    <p class="text-gray-600 dark:text-gray-400 mb-2 truncate">
                                        {{ $contact->subject }}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {{ $contact->created_at->format('Y年m月d日 H:i') }}
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

                <div class="mt-8">
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
    </div>
</x-app-layout>
