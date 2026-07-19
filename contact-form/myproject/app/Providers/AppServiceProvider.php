<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('manage-contacts', fn (User $user): bool => (bool) $user->is_admin);

        RateLimiter::for(
            'contact-confirmation',
            fn (Request $request): Limit => Limit::perMinute(
                max(1, config('contact.confirmation_rate_limit'))
            )->by($request->ip() ?? 'unknown')
        );

        RateLimiter::for(
            'contact-submissions',
            fn (Request $request): Limit => Limit::perMinute(
                max(1, config('contact.submission_rate_limit'))
            )->by($request->ip() ?? 'unknown')
        );
    }
}
