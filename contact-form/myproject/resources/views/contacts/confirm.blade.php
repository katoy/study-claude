@extends('layouts.public')

@section('content')
<div class="bg-white dark:bg-stone-900 p-8 border border-brand-border rounded-xl shadow-sm animate-slideIn">
    <h2 class="text-3xl font-bold text-brand-text mb-8">お問い合わせ内容確認</h2>

    <div class="space-y-6 mb-8">
        <div class="pb-6 border-b border-brand-border">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">お名前</p>
            <p class="text-xl text-brand-text font-medium">{{ $input['name'] }}</p>
        </div>

        <div class="pb-6 border-b border-brand-border">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">メールアドレス</p>
            <p class="text-lg text-brand-text">{{ $input['email'] }}</p>
        </div>

        <div class="pb-6 border-b border-brand-border">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">件名</p>
            <p class="text-lg text-brand-text">{{ $input['subject'] }}</p>
        </div>

        <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">本文</p>
            <p class="text-base text-brand-text whitespace-pre-wrap leading-relaxed">{{ $input['body'] }}</p>
        </div>
    </div>

    <div class="flex items-center justify-between gap-4 pt-6 border-t border-brand-border">
        <a
            href="{{ route('contact.create') }}"
            class="text-brand-primary hover:text-emerald-700 font-semibold underline underline-offset-2"
        >
            戻る
        </a>
        <form method="POST" action="{{ route('contact.store') }}" onsubmit="this.querySelector('button[type=submit]').disabled = true;">
            @csrf
            <x-button-primary type="submit">
                送信する
            </x-button-primary>
        </form>
    </div>
</div>
@endsection
