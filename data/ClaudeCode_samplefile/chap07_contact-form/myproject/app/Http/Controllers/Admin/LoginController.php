<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * 管理ページ認証コントローラー
 */
class LoginController extends Controller
{
    /**
     * ログイン画面表示
     */
    public function showLoginForm()
    {
        return view('admin.login');
    }

    /**
     * ログイン処理
     */
    public function login(Request $request)
    {
        $request->validate([
            'password' => ['required'],
        ]);

        if ($request->input('password') === config('app.admin_password')) {
            $request->session()->put('admin_authenticated', true);

            return redirect()->route('admin.contacts.index');
        }

        return back()->withErrors([
            'password' => 'パスワードが正しくありません。',
        ]);
    }

    /**
     * ログアウト処理
     */
    public function logout(Request $request)
    {
        $request->session()->forget('admin_authenticated');

        return redirect()->route('admin.login');
    }
}
