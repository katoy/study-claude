<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-brand-text leading-tight">
            {{ __('Profile') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="p-6 sm:p-8 bg-white dark:bg-stone-900 border border-brand-border rounded-xl shadow-sm animate-slideIn">
                <div class="max-w-xl">
                    @include('profile.partials.update-profile-information-form')
                </div>
            </div>

            <div class="p-6 sm:p-8 bg-white dark:bg-stone-900 border border-brand-border rounded-xl shadow-sm animate-slideIn" style="animation-delay: 100ms;">
                <div class="max-w-xl">
                    @include('profile.partials.update-password-form')
                </div>
            </div>

            <div class="p-6 sm:p-8 bg-white dark:bg-stone-900 border border-brand-border rounded-xl shadow-sm animate-slideIn" style="animation-delay: 200ms;">
                <div class="max-w-xl">
                    @include('profile.partials.delete-user-form')
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
