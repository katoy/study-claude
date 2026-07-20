@extends('layouts.public')

@section('content')
<div class="text-center py-9 px-5 sm:py-12 sm:px-6 bg-white dark:bg-stone-900 border border-brand-border/60 rounded-2xl shadow-xl transition-all duration-300 animate-slideIn">
    <!-- Icon / Badge -->
    <div class="mb-6 inline-block">
        <div class="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center shadow-inner">
            <svg class="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
        </div>
    </div>

    <!-- Main Heading -->
    <h1 class="text-3xl sm:text-4xl font-extrabold text-brand-text mb-4 tracking-tight leading-tight">
        {{ __('お気軽にお問い合わせください') }}
    </h1>

    <!-- Subtext -->
    <p class="text-base text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
        {{ __('製品やサービスに関するご質問、お見積もりのご依頼、その他ご意見など、何でもお寄せください。通常2営業日以内に専任スタッフよりご返信いたします。') }}
    </p>

    <!-- CTAs -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="{{ route('contact.create') }}" class="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-brand-action text-white font-bold rounded-xl hover:bg-brand-action-hover active:scale-[0.98] hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-150">
            <span>{{ __('お問い合わせフォームを開く') }}</span>
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
        </a>
    </div>

    <!-- Additional Info (like admin stats or links) -->
    @auth
        <div class="mt-12 pt-8 border-t border-brand-border/60">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{{ __('管理者メニュー') }}</p>
            <a href="{{ route('admin.contacts.index') }}" class="inline-flex items-center text-brand-primary hover:text-brand-primary/80 font-semibold text-sm underline underline-offset-2">
                {{ __('お問い合わせ一覧を見る') }}
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </a>
        </div>
    @endauth
</div>
@endsection
