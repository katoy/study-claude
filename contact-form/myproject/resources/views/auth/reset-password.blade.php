<x-guest-layout>
    <form method="POST" action="{{ route('password.store') }}" class="space-y-6">
        @csrf

        <!-- Password Reset Token -->
        <input type="hidden" name="token" value="{{ $request->route('token') }}">

        <!-- Email Address -->
        <div>
            <x-form-label for="email" :value="__('Email')" />
            <x-form-input id="email" class="block mt-1 w-full" type="email" name="email" :value="old('email', $request->email)" required autofocus autocomplete="username" />
            <x-form-error :messages="$errors->get('email')" />
        </div>

        <!-- Password -->
        <div>
            <x-form-label for="password" :value="__('Password')" />
            <x-form-input id="password" class="block mt-1 w-full" type="password" name="password" required autocomplete="new-password" />
            <x-form-error :messages="$errors->get('password')" />
        </div>

        <!-- Confirm Password -->
        <div>
            <x-form-label for="password_confirmation" :value="__('Confirm Password')" />
            <x-form-input id="password_confirmation" class="block mt-1 w-full"
                                type="password"
                                name="password_confirmation" required autocomplete="new-password" />
            <x-form-error :messages="$errors->get('password_confirmation')" />
        </div>

        <div class="flex items-center justify-end pt-4 border-t border-brand-border/60">
            <x-button-primary type="submit">
                {{ __('Reset Password') }}
            </x-button-primary>
        </div>
    </form>
</x-guest-layout>
