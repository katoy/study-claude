@props(['active'])

@php
$classes = ($active ?? false)
            ? 'inline-flex items-center px-1 pt-1 border-b-2 border-brand-primary text-sm font-medium leading-5 text-brand-primary focus:outline-none focus:border-brand-primary transition duration-150 ease-in-out'
            : 'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-gray-600 dark:text-gray-300 hover:text-brand-primary hover:border-brand-primary/40 focus:outline-none focus:text-brand-primary focus:border-brand-primary/40 transition duration-150 ease-in-out';
@endphp

<a {{ $attributes->merge(['class' => $classes]) }}>
    {{ $slot }}
</a>
