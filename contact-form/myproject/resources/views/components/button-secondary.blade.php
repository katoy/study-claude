@props(['type' => 'button', 'disabled' => false, 'size' => 'md'])

@php
    $sizeClasses = [
        'sm' => 'px-4 py-2 text-sm',
        'md' => 'px-6 py-3 text-base',
    ][$size] ?? 'px-6 py-3 text-base';
@endphp

<button
    type="{{ $type }}"
    {{ $disabled ? 'disabled' : '' }}
    {{ $attributes->merge(['class' => $sizeClasses . ' bg-stone-100 dark:bg-stone-800 text-brand-text font-semibold rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150']) }}
>
    {{ $slot }}
</button>
