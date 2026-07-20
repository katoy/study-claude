<nav x-data="{ open: false }" class="bg-white dark:bg-stone-900 border-b border-brand-border/60 transition-colors duration-200">
    <!-- Primary Navigation Menu -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <div class="flex">
                <!-- Logo -->
                <div class="shrink-0 flex items-center">
                    <a href="{{ route('admin.contacts.index') }}" aria-label="{{ __('お問い合わせ一覧') }}" class="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                        <x-application-logo class="w-9 h-9" />
                        <span class="font-extrabold text-lg text-brand-text tracking-tight hidden sm:inline-block">{{ config('app.name', 'Contact') }}</span>
                    </a>
                </div>

                <!-- Navigation Links -->
                <div class="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                    <x-nav-link :href="route('admin.contacts.index')" :active="request()->routeIs('admin.contacts.*')">
                        {{ __('お問い合わせ') }}
                    </x-nav-link>
                </div>
            </div>

            <!-- Theme Toggle Button -->
            <div class="flex items-center ms-4 sm:ms-6" x-data="themeToggle" @keydown.window.escape="if (open) open = false">
                <button
                    @click="toggleTheme()"
                    :aria-label="isDark ? '{{ __('ライトテーマに切り替える') }}' : '{{ __('ダークテーマに切り替える') }}'"
                    :title="isDark ? '{{ __('ライトテーマ') }}' : '{{ __('ダークテーマ') }}'"
                    class="inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-700 transition duration-150 ease-in-out dark:text-gray-300 dark:hover:bg-stone-800"
                >
                    <svg x-show="!isDark" class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 14a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm7-7a1 1 0 11-2 0 1 1 0 012 0zM3 10a1 1 0 11-2 0 1 1 0 012 0zm10-5.657a1 1 0 00-1.414-1.414L8 7.586V5a1 1 0 10-2 0v2.586L3.343 3.929a1 1 0 00-1.414 1.414l2.657 2.657H3a1 1 0 000 2h2.586l-2.657 2.657a1 1 0 101.414 1.414L8 12.414V15a1 1 0 102 0v-2.586l2.657 2.657a1 1 0 001.414-1.414l-2.657-2.657H17a1 1 0 100-2h-2.586l2.657-2.657z"></path>
                    </svg>
                    <svg x-show="isDark" class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                    </svg>
                </button>
            </div>

            <!-- Settings Dropdown -->
            <div class="hidden sm:flex sm:items-center sm:ms-6">
                <x-dropdown align="right" width="48">
                    <x-slot name="trigger">
                        <button class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-stone-900 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition ease-in-out duration-150">
                            <div>{{ Auth::user()->name }}</div>

                            <div class="ms-1">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        </button>
                    </x-slot>

                    <x-slot name="content">
                        <x-dropdown-link :href="route('profile.edit')">
                            {{ __('Profile') }}
                        </x-dropdown-link>

                        <!-- Authentication -->
                        <form method="POST" action="{{ route('logout') }}">
                            @csrf

                            <x-dropdown-link :href="route('logout')"
                                    onclick="event.preventDefault();
                                                this.closest('form').submit();">
                                {{ __('Log Out') }}
                            </x-dropdown-link>
                        </form>
                    </x-slot>
                </x-dropdown>
            </div>

            <!-- Hamburger -->
            <div class="-me-2 flex items-center sm:hidden">
                <button
                    type="button"
                    @click="open = ! open"
                    aria-label="{{ __('ナビゲーションメニューを開閉') }}"
                    aria-controls="responsive-navigation"
                    x-bind:aria-expanded="open.toString()"
                    class="inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-700 transition duration-150 ease-in-out dark:text-gray-300 dark:hover:bg-stone-800"
                >
                    <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path :class="{'hidden': open, 'inline-flex': ! open }" class="inline-flex" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        <path :class="{'hidden': ! open, 'inline-flex': open }" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Responsive Navigation Menu -->
    <div id="responsive-navigation" :class="{'block': open, 'hidden': ! open}" class="hidden sm:hidden">
        <div class="pt-2 pb-3 space-y-1">
            <x-responsive-nav-link :href="route('admin.contacts.index')" :active="request()->routeIs('admin.contacts.*')">
                {{ __('お問い合わせ') }}
            </x-responsive-nav-link>
        </div>

        <!-- Responsive Settings Options -->
        <div class="pt-4 pb-1 border-t border-brand-border/60">
            <div class="px-4">
                <div class="font-medium text-base text-brand-text">{{ Auth::user()->name }}</div>
                <div class="font-medium text-sm text-gray-500 dark:text-gray-400">{{ Auth::user()->email }}</div>
            </div>

            <div class="mt-3 space-y-1">
                <x-responsive-nav-link :href="route('profile.edit')">
                    {{ __('Profile') }}
                </x-responsive-nav-link>

                <!-- Authentication -->
                <form method="POST" action="{{ route('logout') }}">
                    @csrf

                    <x-responsive-nav-link :href="route('logout')"
                            onclick="event.preventDefault();
                                        this.closest('form').submit();">
                        {{ __('Log Out') }}
                    </x-responsive-nav-link>
                </form>
            </div>
        </div>
    </div>
</nav>
