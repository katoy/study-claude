@extends('layouts.public')

@section('content')
<div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
    <div class="p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">お問い合わせ内容確認</h2>

        <div class="space-y-6 mb-6">
            <div class="border-b border-gray-200 pb-4">
                <p class="text-sm font-medium text-gray-600 mb-1">お名前</p>
                <p class="text-lg text-gray-900">{{ $input['name'] }}</p>
            </div>

            <div class="border-b border-gray-200 pb-4">
                <p class="text-sm font-medium text-gray-600 mb-1">メールアドレス</p>
                <p class="text-lg text-gray-900">{{ $input['email'] }}</p>
            </div>

            <div class="border-b border-gray-200 pb-4">
                <p class="text-sm font-medium text-gray-600 mb-1">件名</p>
                <p class="text-lg text-gray-900">{{ $input['subject'] }}</p>
            </div>

            <div>
                <p class="text-sm font-medium text-gray-600 mb-1">本文</p>
                <p class="text-lg text-gray-900 whitespace-pre-wrap">{{ $input['body'] }}</p>
            </div>
        </div>

        <div class="flex items-center justify-end gap-4">
            <button type="button" onclick="window.history.back()" class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150">
                {{ __('戻る') }}
            </button>
            <form method="POST" action="{{ route('contact.store') }}" style="display: inline;">
                @csrf
                <x-primary-button>
                    {{ __('送信する') }}
                </x-primary-button>
            </form>
        </div>
    </div>
</div>
@endsection
