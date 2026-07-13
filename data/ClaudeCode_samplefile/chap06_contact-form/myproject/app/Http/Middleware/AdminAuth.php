<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 管理ページの認証ミドルウェア
 */
class AdminAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        // セッションの認証フラグを確認
        if (!$request->session()->get('admin_authenticated')) {
            return redirect()->route('admin.login');
        }

        return $next($request);
    }
}
