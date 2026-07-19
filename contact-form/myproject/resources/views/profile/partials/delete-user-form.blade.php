<section class="space-y-6">
    <header>
        <h2 class="text-xl font-bold text-brand-text">
            {{ __('Delete Account') }}
        </h2>

        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ __('Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.') }}
        </p>
    </header>

    <x-button-danger
        x-data=""
        x-on:click.prevent="$dispatch('open-modal', 'confirm-user-deletion')"
    >{{ __('Delete Account') }}</x-button-danger>

    <x-modal name="confirm-user-deletion" :show="$errors->userDeletion->isNotEmpty()" focusable>
        <form method="post" action="{{ route('profile.destroy') }}" class="p-8 bg-white dark:bg-stone-900 border border-brand-border/60 rounded-xl">
            @csrf
            @method('delete')

            <h2 class="text-xl font-bold text-brand-text">
                {{ __('Are you sure you want to delete your account?') }}
            </h2>

            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {{ __('Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account.') }}
            </p>

            <div class="mt-6">
                <x-form-label for="password" value="{{ __('Password') }}" class="sr-only" />

                <x-form-input
                    id="password"
                    name="password"
                    type="password"
                    class="mt-1 block w-full sm:w-3/4"
                    placeholder="{{ __('Password') }}"
                />

                <x-form-error :messages="$errors->userDeletion->get('password')" />
            </div>

            <div class="mt-8 flex justify-end gap-3">
                <x-button-secondary x-on:click="$dispatch('close')">
                    {{ __('Cancel') }}
                </x-button-secondary>

                <x-button-danger type="submit">
                    {{ __('Delete Account') }}
                </x-button-danger>
            </div>
        </form>
    </x-modal>
</section>
