@props(['type' => 'button', 'disabled' => false])

<button
    type="{{ $type }}"
    {{ $disabled ? 'disabled' : '' }}
    {{ $attributes->merge(['class' => 'px-6 py-3 bg-stone-100 dark:bg-stone-800 text-brand-text font-semibold rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150']) }}
>
    {{ $slot }}
</button>
