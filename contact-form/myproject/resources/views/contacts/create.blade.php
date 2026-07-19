@extends('layouts.public')

@section('content')
<div class="bg-brand-light dark:bg-brand-dark overflow-hidden rounded-lg border border-brand-border">
    <div class="p-8">
        <h2 class="text-3xl font-bold text-brand-text mb-2">お問い合わせフォーム</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-8">ご不明な点やご質問がございましたら、下記のフォームよりお気軽にお問い合わせください。</p>

        <form method="POST" action="{{ route('contact.confirm') }}" class="space-y-6">
            @csrf

            <div>
                <x-form-label for="name" value="お名前" />
                <x-form-input id="name" name="name" type="text" placeholder="山田太郎" required />
                <x-form-error :messages="$errors->get('name')" />
            </div>

            <div>
                <x-form-label for="email" value="メールアドレス" />
                <x-form-input id="email" name="email" type="email" placeholder="example@example.com" required />
                <x-form-error :messages="$errors->get('email')" />
            </div>

            <div>
                <x-form-label for="subject" value="件名" />
                <x-form-input id="subject" name="subject" type="text" placeholder="お問い合わせの内容をお聞かせください" required />
                <x-form-error :messages="$errors->get('subject')" />
            </div>

            <div>
                <x-form-label for="body" value="本文" />
                <x-form-textarea id="body" name="body" placeholder="詳しい内容をお聞かせください。" required />
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">最大 2000 文字まで入力できます。</p>
                <x-form-error :messages="$errors->get('body')" />
            </div>

            <div class="flex items-center justify-between gap-4 pt-4 border-t border-brand-border">
                <a href="{{ route('welcome') }}" class="text-brand-primary hover:text-emerald-700 font-medium">キャンセル</a>
                <x-button-primary type="submit">
                    確認画面へ進む
                </x-button-primary>
            </div>
        </form>
    </div>
</div>
@endsection
