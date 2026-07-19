@extends('layouts.public')

@section('content')
<div class="bg-white dark:bg-stone-900 p-12 text-center border border-brand-border rounded-xl shadow-sm animate-slideIn">
    <div class="mb-8 inline-block">
        <div class="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center">
            <svg class="w-10 h-10 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
        </div>
    </div>

    <h2 class="text-4xl font-bold text-brand-text mb-3">お問い合わせありがとうございました</h2>
    <p class="text-lg text-gray-600 dark:text-gray-400 mb-4 leading-relaxed max-w-md mx-auto">
        お問い合わせいただき、誠にありがとうございます。
    </p>
    <p class="text-base text-gray-600 dark:text-gray-400 mb-8 leading-relaxed max-w-md mx-auto">
        内容を確認させていただき、後ほどご連絡させていただきます。
    </p>

    <a href="{{ route('welcome') }}" class="inline-block px-8 py-3 bg-brand-primary text-white font-semibold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all duration-150">
        トップページへ戻る
    </a>
</div>
@endsection
