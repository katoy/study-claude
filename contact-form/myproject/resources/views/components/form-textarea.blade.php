@props(['id', 'name', 'placeholder' => '', 'rows' => 6, 'required' => false, 'value' => null])

<textarea
    id="{{ $id }}"
    name="{{ $name }}"
    rows="{{ $rows }}"
    placeholder="{{ $placeholder }}"
    {{ $required ? 'required' : '' }}
    {{ $attributes->merge(['class' => 'w-full px-5 py-4 border border-brand-border rounded-lg bg-brand-light placeholder-gray-500 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-emerald-200 transition-all duration-200 resize-none']) }}
>{{ old($name, $value ?? '') }}</textarea>
