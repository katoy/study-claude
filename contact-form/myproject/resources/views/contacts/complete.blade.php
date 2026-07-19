@extends('layouts.public')

@section('content')
<div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
    <div class="p-6 text-center">
        <div class="mb-6">
            <svg class="w-16 h-16 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        </div>

        <h2 class="text-2xl font-bold text-gray-900 mb-2">お問い合わせありがとうございました</h2>
        <p class="text-gray-600 mb-6">
            お問い合わせいただき、誠にありがとうございます。<br>
            内容を確認させていただき、後ほどご連絡させていただきます。
        </p>

        <a href="{{ route('welcome') }}" class="inline-block px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700">
            トップページへ戻る
        </a>
    </div>
</div>
@endsection
