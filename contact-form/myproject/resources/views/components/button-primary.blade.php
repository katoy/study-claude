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
    {{ $attributes->merge(['class' => $sizeClasses . ' bg-brand-primary text-white font-semibold rounded-lg hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150']) }}
>
    {{ $slot }}
</button>
