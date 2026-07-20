@props([
    'id',
    'name',
    'label',
    'maxLength',
    'messages' => [],
    'type' => 'text',
    'placeholder' => '',
    'value' => null,
    'required' => false,
    'textarea' => false,
    'rows' => 6,
    'autocomplete' => null,
])

@php
    $hasError = count((array) $messages) > 0;
    $describedBy = $id.'-hint '.$id.'-character-count'.($hasError ? ' '.$id.'-error' : '');
@endphp

<div
    x-data="{
        fieldText: @js(old($name, $value ?? '')),
        maxLength: {{ $maxLength }},
        hasServerError: @js($hasError),
    }"
>
    <x-form-label :for="$id" :value="$label" />

    @if ($textarea)
        <x-form-textarea
            :id="$id"
            :name="$name"
            :rows="$rows"
            :placeholder="$placeholder"
            :value="$value"
            :required="$required"
            x-model="fieldText"
            :aria-describedby="$describedBy"
            :aria-invalid="$hasError ? 'true' : 'false'"
            x-bind:aria-invalid="(hasServerError || Array.from(fieldText).length > maxLength).toString()"
            x-bind:class="Array.from(fieldText).length > maxLength ? 'border-brand-error text-brand-error focus:border-brand-error focus:ring-rose-200 dark:focus:ring-rose-950' : ''"
        />
    @else
        <x-form-input
            :id="$id"
            :name="$name"
            :type="$type"
            :placeholder="$placeholder"
            :value="$value"
            :required="$required"
            :autocomplete="$autocomplete"
            x-model="fieldText"
            :aria-describedby="$describedBy"
            :aria-invalid="$hasError ? 'true' : 'false'"
            x-bind:aria-invalid="(hasServerError || Array.from(fieldText).length > maxLength).toString()"
            x-bind:class="Array.from(fieldText).length > maxLength ? 'border-brand-error text-brand-error focus:border-brand-error focus:ring-rose-200 dark:focus:ring-rose-950' : ''"
        />
    @endif

    <div class="mt-2 flex flex-col items-start gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p id="{{ $id }}-hint" class="text-gray-600 dark:text-gray-400">
            {{ __('最大 :count 文字まで入力できます。', ['count' => $maxLength]) }}
        </p>
        <p
            id="{{ $id }}-character-count"
            aria-live="polite"
            class="self-end transition-colors duration-150 sm:self-auto"
            x-bind:class="Array.from(fieldText).length > maxLength ? 'text-brand-error font-bold' : 'text-gray-500 dark:text-gray-400'"
        >
            <span x-text="Array.from(fieldText).length">{{ mb_strlen(old($name, $value ?? '')) }}</span>
            /
            <span x-text="maxLength">{{ $maxLength }}</span>
            {{ __('文字') }}
        </p>
    </div>

    <x-form-error :id="$id.'-error'" :messages="$messages" />
</div>
