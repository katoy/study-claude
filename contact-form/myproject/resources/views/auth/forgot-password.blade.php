<x-guest-layout>
    <div class="mb-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {{ __('Forgot your password? No problem. Just let us know your email address and we will email you a password reset link that will allow you to choose a new one.') }}
    </div>

    <!-- Session Status -->
    <x-auth-session-status class="mb-4" :status="session('status')" />

    <form method="POST" action="{{ route('password.email') }}" class="space-y-6">
        @csrf

        <!-- Email Address -->
        <div>
            <x-form-label for="email" :value="__('Email')" />
            <x-form-input id="email" class="block mt-1 w-full" type="email" name="email" :value="old('email')" required autofocus />
            <x-form-error :messages="$errors->get('email')" />
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-brand-border/60">
            <a class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary rounded-md focus:outline-none" href="{{ route('login') }}">
                戻る
            </a>
            <x-button-primary type="submit">
                {{ __('Email Password Reset Link') }}
            </x-button-primary>
        </div>
    </form>
</x-guest-layout>
