@extends('layouts.public')

@section('content')
<div class="bg-white dark:bg-stone-900 p-8 border border-brand-border rounded-xl shadow-sm text-center animate-slideIn">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 mb-6">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    </div>
    <h2 class="text-4xl font-extrabold text-brand-text tracking-tight mb-2">429</h2>
    <h3 class="text-xl font-bold text-brand-text mb-4">リクエストが多すぎます</h3>
    <p class="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        短時間に多くの送信リクエストを受け取りました。セキュリティおよび負荷軽減のため一時的に制限されています。少し時間をおいてから再度お試しください。
    </p>
    <div class="flex justify-center gap-4">
        <a href="{{ route('contact.create') }}" class="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors">
            お問い合わせに戻る
        </a>
    </div>
</div>
@endsection
