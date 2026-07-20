@props(['id', 'name', 'type' => 'text', 'placeholder' => '', 'required' => false, 'value' => null, 'autocomplete' => null])

<input
    id="{{ $id }}"
    name="{{ $name }}"
    type="{{ $type }}"
    placeholder="{{ $placeholder }}"
    value="{{ old($name, $value ?? '') }}"
    {{ $required ? 'required' : '' }}
    @if ($autocomplete)
        autocomplete="{{ $autocomplete }}"
    @endif
    {{ $attributes->merge(['class' => 'w-full px-5 py-4 border border-brand-border rounded-lg bg-brand-light placeholder-gray-500 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-emerald-200 transition-all duration-200']) }}
/>
