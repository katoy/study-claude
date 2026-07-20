<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="{{ __('管理画面にログインします。') }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        <link rel="alternate icon" href="{{ asset('favicon.ico') }}">

        <!-- Fonts -->
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
    <body class="font-sans text-brand-text antialiased bg-brand-light dark:bg-stone-950 transition-colors duration-200 min-h-screen flex flex-col">
        <header class="bg-white dark:bg-stone-900 border-b border-brand-border/60 shadow-sm transition-colors duration-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
                <a href="{{ route('welcome') }}" aria-label="{{ __('トップページ') }}" class="text-xl font-extrabold text-brand-text tracking-tight hover:opacity-90 transition-opacity flex items-center gap-2.5">
                    <x-application-logo class="w-9 h-9" />
                    <span class="font-extrabold text-lg text-brand-text tracking-tight hidden sm:inline-block">{{ config('app.name', 'Contact') }}</span>
                </a>

                <div class="flex items-center gap-2 sm:gap-4">
                    <x-theme-toggle />
                </div>
            </div>
        </header>

        <main class="flex-1 flex flex-col justify-center items-center p-4 sm:p-6">
            <div class="animate-slideIn mb-4">
                <a href="/" class="flex flex-col items-center gap-2 group">
                    <x-application-logo class="w-16 h-16 group-hover:scale-105 transition-transform duration-200" />
                    <span class="font-black text-xl text-brand-text tracking-tight">{{ config('app.name', 'Contact') }}</span>
                </a>
            </div>

            <div class="w-full sm:max-w-md p-5 sm:p-8 bg-white dark:bg-stone-900 border border-brand-border rounded-xl shadow-sm overflow-hidden animate-slideIn" style="animation-delay: 100ms;">
                {{ $slot }}
            </div>
        </main>
    </body>
</html>
