@props([
    'items',
    'label' => __('履歴'),
    'onSelect',
    'onRemove',
    'onClear',
    'displayKey' => null,
])

<template x-if="{{ $items }}.length > 0">
    <div {{ $attributes->merge(['class' => 'flex flex-wrap items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400']) }}>
        <span class="font-medium text-gray-400">{{ $label }}:</span>
        <template x-for="item in {{ $items }}.slice(0, 5)" :key="{{ $displayKey ? 'item.' . $displayKey : 'item' }}">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 dark:bg-stone-800 rounded-md border border-gray-200 dark:border-stone-700/80 text-gray-700 dark:text-gray-300">
                <button
                    type="button"
                    @click="{{ $onSelect }}"
                    class="hover:text-brand-primary font-medium truncate max-w-[120px] transition-colors"
                    :title="'引用: ' + {{ $displayKey ? 'item.' . $displayKey : 'item' }}"
                    x-text="{{ $displayKey ? 'item.' . $displayKey : 'item' }}"
                ></button>
                <button
                    type="button"
                    @click.stop="{{ $onRemove }}"
                    class="text-gray-400 hover:text-rose-500 font-bold ml-0.5 leading-none transition-colors"
                    title="{{ __('この履歴を削除') }}"
                >&times;</button>
            </span>
        </template>
        <button
            type="button"
            @click="{{ $onClear }}"
            class="text-[11px] text-gray-400 hover:text-rose-500 underline ml-1 transition-colors"
            title="{{ __('履歴を全削除') }}"
        >{{ __('全削除') }}</button>
    </div>
</template>
