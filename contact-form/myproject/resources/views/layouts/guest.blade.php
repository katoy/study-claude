<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        <link rel="alternate icon" href="{{ asset('favicon.ico') }}">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="font-sans text-brand-text antialiased bg-brand-light dark:bg-stone-950 transition-colors duration-200">
        <div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0">
            <div class="animate-slideIn">
                <a href="/" class="flex flex-col items-center gap-2 group">
                    <x-application-logo class="w-16 h-16 group-hover:scale-105 transition-transform duration-200" />
                    <span class="font-black text-xl text-brand-text tracking-tight">{{ config('app.name', 'Contact') }}</span>
                </a>
            </div>

            <div class="w-full sm:max-w-md mt-6 p-8 bg-white dark:bg-stone-900 border border-brand-border rounded-xl shadow-sm overflow-hidden animate-slideIn" style="animation-delay: 100ms;">
                {{ $slot }}
            </div>
        </div>
    </body>
</html>
