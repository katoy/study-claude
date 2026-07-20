<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="{{ __('製品・サービスに関するお問い合わせを受け付けています。') }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        <link rel="alternate icon" href="{{ asset('favicon.ico') }}">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        <script>
            if (localStorage.getItem('app_theme') === 'dark' || (!('app_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        </script>
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="font-sans antialiased bg-brand-light dark:bg-stone-950 text-brand-text transition-colors duration-200">
        <div class="min-h-screen flex flex-col">
            <header class="bg-white dark:bg-stone-900 border-b border-brand-border/60 shadow-sm transition-colors duration-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
                    <a href="{{ route('welcome') }}" aria-label="{{ __('トップページ') }}" class="text-xl font-extrabold text-brand-text tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2.5">
                        <x-application-logo class="w-9 h-9" />
                        <span class="hidden font-extrabold text-lg text-brand-text tracking-tight sm:inline">{{ config('app.name', 'Contact') }}</span>
                    </a>

                    <nav aria-label="{{ __('メインナビゲーション') }}" class="flex items-center gap-2 sm:gap-4">
                        <a href="{{ route('contact.create') }}" class="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-primary transition-colors">
                            {{ __('お問い合わせ') }}
                        </a>
                        @auth
                            <a href="{{ route('admin.contacts.index') }}" class="text-sm font-semibold text-white bg-brand-action px-3 py-2 rounded-lg hover:bg-brand-action-hover transition-colors sm:px-4">
                                {{ __('管理画面') }}
                            </a>
                        @else
                            <a href="{{ route('login') }}" class="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary transition-colors">
                                {{ __('ログイン') }}
                            </a>
                        @endauth
                        <x-theme-toggle />
                    </nav>
                </div>
            </header>

            <main class="flex-1 flex items-center">
                <div class="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    @yield('content')
                </div>
            </main>

            <footer class="bg-white dark:bg-stone-900 border-t border-brand-border/60 transition-colors duration-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>&copy; {{ date('Y') }} {{ config('app.name', 'Laravel') }}. {{ __('All rights reserved.') }}</p>
                </div>
            </footer>
        </div>
    </body>
</html>
