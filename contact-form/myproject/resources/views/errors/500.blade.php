@extends('layouts.public')

@section('content')
<div class="bg-white dark:bg-stone-900 p-8 border border-brand-border rounded-xl shadow-sm text-center animate-slideIn">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
    </div>
    <h2 class="text-4xl font-extrabold text-brand-text tracking-tight mb-2">500</h2>
    <h3 class="text-xl font-bold text-brand-text mb-4">サーバーエラーが発生しました</h3>
    <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        申し訳ありません。システムの一時的なエラーにより、リクエストを処理できませんでした。エラーが解消されるまで時間をおいてから、再度お試しください。
    </p>
    <div class="flex justify-center gap-4">
        <a href="{{ route('welcome') }}" class="px-6 py-3 border border-brand-border text-brand-text rounded-lg hover:bg-brand-light dark:hover:bg-stone-850 font-medium transition-colors">
            ホームに戻る
        </a>
    </div>
</div>
@endsection
