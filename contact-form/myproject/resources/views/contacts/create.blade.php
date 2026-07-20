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

        <div x-data="{ nameText: {{ json_encode(old('name', $input['name'] ?? '')) }}, nameMaxLength: 255 }">
            <x-form-label for="name" :value="__('お名前')" />
            <x-form-input
                id="name"
                name="name"
                type="text"
                x-model="nameText"
                aria-describedby="name-character-count"
                x-bind:aria-invalid="nameText.length > nameMaxLength"
                :placeholder="__('山田太郎')"
                :value="$input['name'] ?? null"
                x-bind:class="nameText.length > nameMaxLength ? 'border-rose-500 text-rose-900 dark:text-rose-100 focus:border-rose-600 focus:ring-rose-200 dark:focus:ring-rose-950' : ''"
                required
            />
            <div class="flex items-center justify-between mt-2 text-sm">
                <p class="text-gray-600 dark:text-gray-400">{{ __('最大 255 文字まで入力できます。') }}</p>
                <p
                    id="name-character-count"
                    aria-live="polite"
                    :class="nameText.length > nameMaxLength ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-500 dark:text-gray-400'"
                    class="transition-colors duration-150"
                >
                    <span x-text="nameText.length">0</span> / <span x-text="nameMaxLength">255</span> {{ __('文字') }}
                </p>
            </div>
            <x-form-error :messages="$errors->get('name')" />
        </div>

        <div x-data="{ emailText: {{ json_encode(old('email', $input['email'] ?? '')) }}, emailMaxLength: 255 }">
            <x-form-label for="email" :value="__('メールアドレス')" />
            <x-form-input
                id="email"
                name="email"
                type="email"
                x-model="emailText"
                aria-describedby="email-character-count"
                x-bind:aria-invalid="emailText.length > emailMaxLength"
                placeholder="example@example.com"
                :value="$input['email'] ?? null"
                x-bind:class="emailText.length > emailMaxLength ? 'border-rose-500 text-rose-900 dark:text-rose-100 focus:border-rose-600 focus:ring-rose-200 dark:focus:ring-rose-950' : ''"
                required
            />
            <div class="flex items-center justify-between mt-2 text-sm">
                <p class="text-gray-600 dark:text-gray-400">{{ __('最大 255 文字まで入力できます。') }}</p>
                <p
                    id="email-character-count"
                    aria-live="polite"
                    :class="emailText.length > emailMaxLength ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-500 dark:text-gray-400'"
                    class="transition-colors duration-150"
                >
                    <span x-text="emailText.length">0</span> / <span x-text="emailMaxLength">255</span> {{ __('文字') }}
                </p>
            </div>
            <x-form-error :messages="$errors->get('email')" />
        </div>

        <div x-data="{ subjectText: {{ json_encode(old('subject', $input['subject'] ?? '')) }}, subjectMaxLength: 255 }">
            <x-form-label for="subject" :value="__('件名')" />
            <x-form-input
                id="subject"
                name="subject"
                type="text"
                x-model="subjectText"
                aria-describedby="subject-character-count"
                x-bind:aria-invalid="subjectText.length > subjectMaxLength"
                :placeholder="__('お問い合わせの内容をお聞かせください')"
                :value="$input['subject'] ?? null"
                x-bind:class="subjectText.length > subjectMaxLength ? 'border-rose-500 text-rose-900 dark:text-rose-100 focus:border-rose-600 focus:ring-rose-200 dark:focus:ring-rose-950' : ''"
                required
            />
            <div class="flex items-center justify-between mt-2 text-sm">
                <p class="text-gray-600 dark:text-gray-400">{{ __('最大 255 文字まで入力できます。') }}</p>
                <p
                    id="subject-character-count"
                    aria-live="polite"
                    :class="subjectText.length > subjectMaxLength ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-500 dark:text-gray-400'"
                    class="transition-colors duration-150"
                >
                    <span x-text="subjectText.length">0</span> / <span x-text="subjectMaxLength">255</span> {{ __('文字') }}
                </p>
            </div>
            <x-form-error :messages="$errors->get('subject')" />
        </div>

        <div x-data="{ bodyText: {{ json_encode(old('body', $input['body'] ?? '')) }}, maxLength: 2000 }">
            <x-form-label for="body" :value="__('本文')" />
            <x-form-textarea
                id="body"
                name="body"
                x-model="bodyText"
                :value="$input['body'] ?? null"
                :placeholder="__('詳しい内容をお聞かせください。')"
                x-bind:class="bodyText.length > maxLength ? 'border-rose-500 text-rose-900 dark:text-rose-100 focus:border-rose-600 focus:ring-rose-200 dark:focus:ring-rose-950' : ''"
                required
            />
            <div class="flex items-center justify-between mt-2 text-sm">
                <p class="text-gray-600 dark:text-gray-400">{{ __('最大 2000 文字まで入力できます。') }}</p>
                <p :class="bodyText.length > maxLength ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-500 dark:text-gray-400'" class="transition-colors duration-150">
                    <span x-text="bodyText.length">0</span> / <span x-text="maxLength">2000</span> {{ __('文字') }}
                </p>
            </div>
            <x-form-error :messages="$errors->get('body')" />
        </div>

        <div class="flex items-center justify-between gap-4 pt-4 border-t border-brand-border">
            <a href="{{ route('welcome') }}" class="text-brand-primary hover:text-emerald-700 font-medium">{{ __('キャンセル') }}</a>
            <x-button-primary type="submit">
                {{ __('確認画面へ進む') }}
            </x-button-primary>
        </div>
    </form>
</div>
@endsection
