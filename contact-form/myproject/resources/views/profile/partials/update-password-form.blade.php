<section>
    <header>
        <h2 class="text-xl font-bold text-brand-text">
            {{ __('Update Password') }}
        </h2>

        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ __('Ensure your account is using a long, random password to stay secure.') }}
        </p>
    </header>

    <form method="post" action="{{ route('password.update') }}" class="mt-6 space-y-6">
        @csrf
        @method('put')

        <div>
            <x-form-label for="update_password_current_password" :value="__('Current Password')" />
            <x-form-input id="update_password_current_password" name="current_password" type="password" class="mt-1 block w-full" autocomplete="current-password" />
            <x-form-error :messages="$errors->updatePassword->get('current_password')" />
        </div>

        <div>
            <x-form-label for="update_password_password" :value="__('New Password')" />
            <x-form-input id="update_password_password" name="password" type="password" class="mt-1 block w-full" autocomplete="new-password" />
            <x-form-error :messages="$errors->updatePassword->get('password')" />
        </div>

        <div>
            <x-form-label for="update_password_password_confirmation" :value="__('Confirm Password')" />
            <x-form-input id="update_password_password_confirmation" name="password_confirmation" type="password" class="mt-1 block w-full" autocomplete="new-password" />
            <x-form-error :messages="$errors->updatePassword->get('password_confirmation')" />
        </div>

        <div class="flex items-center gap-4">
            <x-button-primary type="submit">{{ __('Save') }}</x-button-primary>

            @if (session('status') === 'password-updated')
                <p
                    x-data="{ show: true }"
                    x-show="show"
                    x-transition
                    x-init="setTimeout(() => show = false, 2000)"
                    class="text-sm text-gray-600 dark:text-gray-400"
                >{{ __('Saved.') }}</p>
            @endif
        </div>
    </form>
</section>
