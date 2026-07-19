<x-guest-layout>
    <!-- Session Status -->
    <x-auth-session-status class="mb-4" :status="session('status')" />

    <form method="POST" action="{{ route('login') }}" class="space-y-6">
        @csrf

        <!-- Email Address -->
        <div>
            <x-form-label for="email" :value="__('Email')" />
            <x-form-input id="email" class="block mt-1 w-full" type="email" name="email" :value="old('email')" required autofocus autocomplete="username" />
            <x-form-error :messages="$errors->get('email')" />
        </div>

        <!-- Password -->
        <div>
            <x-form-label for="password" :value="__('Password')" />
            <x-form-input id="password" class="block mt-1 w-full"
                            type="password"
                            name="password"
                            required autocomplete="current-password" />
            <x-form-error :messages="$errors->get('password')" />
        </div>

        <!-- Remember Me -->
        <div class="block">
            <label for="remember_me" class="inline-flex items-center cursor-pointer">
                <input id="remember_me" type="checkbox" class="rounded border-brand-border bg-brand-light dark:bg-stone-950 text-brand-primary focus:ring-emerald-200 dark:focus:ring-emerald-950 transition-all" name="remember">
                <span class="ms-2 text-sm text-gray-600 dark:text-gray-400 font-medium">{{ __('Remember me') }}</span>
            </label>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-brand-border/60">
            @if (Route::has('password.request'))
                <a class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-primary rounded-md focus:outline-none" href="{{ route('password.request') }}">
                    {{ __('Forgot your password?') }}
                </a>
            @endif

            <x-button-primary type="submit">
                {{ __('Log in') }}
            </x-button-primary>
        </div>
    </form>
</x-guest-layout>
