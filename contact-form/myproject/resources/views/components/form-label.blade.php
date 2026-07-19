@props(['for' => '', 'value' => null])

<label for="{{ $for }}" {{ $attributes->merge(['class' => 'block text-sm font-semibold text-brand-text mb-2']) }}>
    {{ $value ?? $slot }}
</label>
