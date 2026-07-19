@extends('layouts.public')

@section('content')
<div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
    <div class="p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">お問い合わせフォーム</h2>

        <form method="POST" action="{{ route('contact.confirm') }}" class="space-y-6">
            @csrf

            <div>
                <x-input-label for="name" :value="__('お名前')" />
                <x-text-input id="name" class="block mt-1 w-full" type="text" name="name" :value="old('name', $input['name'] ?? '')" required />
                <x-input-error :messages="$errors->get('name')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="email" :value="__('メールアドレス')" />
                <x-text-input id="email" class="block mt-1 w-full" type="email" name="email" :value="old('email', $input['email'] ?? '')" required />
                <x-input-error :messages="$errors->get('email')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="subject" :value="__('件名')" />
                <x-text-input id="subject" class="block mt-1 w-full" type="text" name="subject" :value="old('subject', $input['subject'] ?? '')" required />
                <x-input-error :messages="$errors->get('subject')" class="mt-2" />
            </div>

            <div>
                <x-input-label for="body" :value="__('本文')" />
                <textarea id="body" name="body" class="block mt-1 w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm" rows="6" required>{{ old('body', $input['body'] ?? '') }}</textarea>
                <x-input-error :messages="$errors->get('body')" class="mt-2" />
                <p class="text-sm text-gray-600 mt-2">最大 2000 文字まで入力できます。</p>
            </div>

            <div class="flex items-center justify-end gap-4">
                <a href="{{ route('welcome') }}" class="text-indigo-600 hover:text-indigo-800">キャンセル</a>
                <x-primary-button>
                    {{ __('確認画面へ進む') }}
                </x-primary-button>
            </div>
        </form>
    </div>
</div>
@endsection
