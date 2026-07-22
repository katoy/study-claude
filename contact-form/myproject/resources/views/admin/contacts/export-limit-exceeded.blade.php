<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-brand-text leading-tight">
            {{ __('CSVエクスポート上限を超えました') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-stone-900 border border-brand-border/60 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center text-center py-16">
                    <div class="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-full flex items-center justify-center mb-6">
                        <svg class="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2 text-brand-text">
                        {{ __('CSVエクスポート上限を超えました') }}
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                        {{ __('条件を絞り込んで再実行してください。') }}
                    </p>
                    <a href="{{ route('admin.contacts.index') }}" class="min-h-11 inline-flex items-center justify-center px-6 py-2.5 bg-brand-action hover:bg-brand-action/90 text-white font-semibold rounded-lg shadow-sm active:scale-95 transition-all text-sm">
                        {{ __('一覧に戻る') }}
                    </a>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
