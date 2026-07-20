@props(['status'])

@php
    $statusValue = is_object($status) ? $status->value : $status;

    $styles = [
        'new' => [
            'badge' => 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
            'dot' => 'bg-blue-500',
            'label' => '新規',
        ],
        'in_progress' => [
            'badge' => 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-800',
            'dot' => 'bg-amber-500 animate-pulse',
            'label' => '対応中',
        ],
        'resolved' => [
            'badge' => 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800',
            'dot' => 'bg-emerald-500',
            'label' => '解決済み',
        ],
    ];

    $style = $styles[$statusValue] ?? $styles['new'];
@endphp

<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm transition-colors duration-150 {{ $style['badge'] }}">
    <span class="w-1.5 h-1.5 rounded-full {{ $style['dot'] }}"></span>
    {{ $style['label'] }}
</span>
