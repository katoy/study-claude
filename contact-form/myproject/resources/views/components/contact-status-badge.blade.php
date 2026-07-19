@props(['status'])

@php
    $colors = [
        'new' => ['bg' => 'bg-blue-100 dark:bg-blue-950', 'text' => 'text-blue-800 dark:text-blue-50'],
        'in_progress' => ['bg' => 'bg-amber-100 dark:bg-amber-950', 'text' => 'text-amber-800 dark:text-amber-50'],
        'resolved' => ['bg' => 'bg-emerald-100 dark:bg-emerald-950', 'text' => 'text-emerald-800 dark:text-emerald-50'],
    ];

    $labels = [
        'new' => '新規',
        'in_progress' => '対応中',
        'resolved' => '解決済み',
    ];

    $statusValue = is_object($status) ? $status->value : $status;
    $color = $colors[$statusValue] ?? $colors['new'];
    $label = $labels[$statusValue] ?? $statusValue;
@endphp

<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold {{ $color['bg'] }} {{ $color['text'] }}">
    {{ $label }}
</span>
