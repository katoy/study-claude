@props(['type' => 'button', 'disabled' => false])

<button
    type="{{ $type }}"
    {{ $disabled ? 'disabled' : '' }}
    {{ $attributes->merge(['class' => 'px-6 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150']) }}
>
    {{ $slot }}
</button>
