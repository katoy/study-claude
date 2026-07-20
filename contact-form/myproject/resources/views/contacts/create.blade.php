@extends('layouts.public')

@section('content')
<div class="bg-white dark:bg-stone-900 p-8 border border-brand-border rounded-xl shadow-sm animate-slideIn">
    <h2 class="text-3xl font-bold text-brand-text mb-2">{{ __('お問い合わせフォーム') }}</h2>
    <p class="text-gray-600 dark:text-gray-400 mb-8">{{ __('ご不明な点やご質問がございましたら、下記のフォームよりお気軽にお問い合わせください。') }}</p>

    @if (session('error'))
        <div class="mb-6 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-900 dark:text-rose-50 flex items-center gap-3 animate-slideIn">
            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium">{{ session('error') }}</span>
        </div>
    @endif

    <form method="POST" action="{{ route('contact.confirm') }}" class="space-y-6">
        @csrf

        <x-counted-field
            id="name"
            name="name"
            :label="__('お名前')"
            :max-length="255"
            :messages="$errors->get('name')"
            :placeholder="__('山田太郎')"
            :value="$input['name'] ?? null"
            autocomplete="name"
            required
        />

        <x-counted-field
            id="email"
            name="email"
            type="email"
            :label="__('メールアドレス')"
            :max-length="255"
            :messages="$errors->get('email')"
            placeholder="example@example.com"
            :value="$input['email'] ?? null"
            autocomplete="email"
            required
        />

        <x-counted-field
            id="subject"
            name="subject"
            :label="__('件名')"
            :max-length="255"
            :messages="$errors->get('subject')"
            :placeholder="__('お問い合わせの内容をお聞かせください')"
            :value="$input['subject'] ?? null"
            required
        />

        <x-counted-field
            id="body"
            name="body"
            :label="__('本文')"
            :max-length="2000"
            :messages="$errors->get('body')"
            :placeholder="__('詳しい内容をお聞かせください。')"
            :value="$input['body'] ?? null"
            textarea
            required
        />

        <div class="flex items-center justify-between gap-4 pt-4 border-t border-brand-border">
            <a href="{{ route('welcome') }}" class="text-brand-primary hover:text-emerald-700 font-medium">{{ __('キャンセル') }}</a>
            <x-button-primary type="submit">
                {{ __('確認画面へ進む') }}
            </x-button-primary>
        </div>
    </form>
</div>
@endsection
