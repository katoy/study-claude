@props(['id', 'name', 'options' => [], 'selected' => null])

<select
    id="{{ $id }}"
    name="{{ $name }}"
    {{ $attributes->merge(['class' => 'block w-full px-4 py-3 border border-brand-border rounded-lg bg-brand-light dark:bg-stone-950 text-brand-text focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-950 transition-all duration-200']) }}
>
    @foreach ($options as $value => $label)
        <option value="{{ $value }}" @selected(old($name, $selected) == $value)>
            {{ $label }}
        </option>
    @endforeach
</select>
