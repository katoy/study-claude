@extends('layouts.public')

@section('content')
<div class="bg-white dark:bg-stone-900 p-8 border border-brand-border rounded-xl shadow-sm text-center animate-slideIn">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-500 mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    </div>
    <h2 class="text-4xl font-extrabold text-brand-text tracking-tight mb-2">404</h2>
    <h3 class="text-xl font-bold text-brand-text mb-4">お探しのページが見つかりません</h3>
    <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        移動または削除されたか、URLが間違っている可能性があります。入力したアドレスが正しいかご確認ください。
    </p>
    <div class="flex justify-center gap-4">
        <a href="{{ route('welcome') }}" class="px-6 py-3 border border-brand-border text-brand-text rounded-lg hover:bg-brand-light dark:hover:bg-stone-850 font-medium transition-colors">
            ホームに戻る
        </a>
    </div>
</div>
@endsection
