<x-guest-layout>
    <div class="mb-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {{ __('This is a secure area of the application. Please confirm your password before continuing.') }}
    </div>

    <form method="POST" action="{{ route('password.confirm') }}" class="space-y-6">
        @csrf

        <!-- Password -->
        <div>
            <x-form-label for="password" :value="__('Password')" />
            <x-form-input id="password" class="block mt-1 w-full"
                            type="password"
                            name="password"
                            required autocomplete="current-password" />
            <x-form-error :messages="$errors->get('password')" />
        </div>

        <div class="flex justify-end pt-4 border-t border-brand-border/60">
            <x-button-primary type="submit">
                {{ __('Confirm') }}
            </x-button-primary>
        </div>
    </form>
</x-guest-layout>
