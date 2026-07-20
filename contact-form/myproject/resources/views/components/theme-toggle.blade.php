<div {{ $attributes->merge(['class' => 'inline-flex items-center']) }} x-data="themeToggle">
    <button
        type="button"
        @click="toggleTheme()"
        :aria-label="isDark ? '{{ __('ライトテーマに切り替える') }}' : '{{ __('ダークテーマに切り替える') }}'"
        :title="isDark ? '{{ __('ライトテーマ') }}' : '{{ __('ダークテーマ') }}'"
        class="inline-flex min-h-10 min-w-10 items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-700 transition duration-150 ease-in-out dark:text-gray-300 dark:hover:bg-stone-800"
    >
        <svg x-show="!isDark" x-cloak class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 14a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm7-7a1 1 0 11-2 0 1 1 0 012 0zM3 10a1 1 0 11-2 0 1 1 0 012 0zm10-5.657a1 1 0 00-1.414-1.414L8 7.586V5a1 1 0 10-2 0v2.586L3.343 3.929a1 1 0 00-1.414 1.414l2.657 2.657H3a1 1 0 000 2h2.586l-2.657 2.657a1 1 0 101.414 1.414L8 12.414V15a1 1 0 102 0v-2.586l2.657 2.657a1 1 0 001.414-1.414l-2.657-2.657H17a1 1 0 100-2h-2.586l2.657-2.657z"></path>
        </svg>
        <svg x-show="isDark" x-cloak class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
    </button>
</div>
