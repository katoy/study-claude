@props(['messages' => [], 'id' => null])

@if ($messages)
    <div
        @if ($id) id="{{ $id }}" @endif
        role="alert"
        {{ $attributes->merge(['class' => 'mt-2 space-y-1']) }}
    >
        @foreach ((array) $messages as $message)
            <p class="text-sm text-brand-error font-medium">
                {{ $message }}
            </p>
        @endforeach
    </div>
@endif
