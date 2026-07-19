<?php

use App\Http\Controllers\Admin\ContactController as AdminContactController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->name('welcome');

// 公開お問い合わせフォーム（認証不要）
Route::get('/contact', [ContactController::class, 'create'])->name('contact.create');
Route::post('/contact/confirm', [ContactController::class, 'confirm'])
    ->middleware('throttle:contact-confirmation')
    ->name('contact.confirm');
Route::post('/contact/store', [ContactController::class, 'store'])
    ->middleware('throttle:contact-submissions')
    ->name('contact.store');
Route::get('/contact/complete', [ContactController::class, 'complete'])->name('contact.complete');

// 管理画面（認証必須）
Route::middleware(['auth', 'can:manage-contacts'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('contacts', AdminContactController::class)->only(['index', 'show', 'update']);
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
