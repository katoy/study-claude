@extends('layouts.app')

@section('title', '管理ページ - ログイン')
@section('header_title', '管理ページ - ログイン')

@section('content')
    <div class="card">
        <h2>ログイン</h2>

        <form method="POST" action="{{ route('admin.login.post') }}">
            @csrf

            <div class="form-group">
                <label for="password">パスワード</label>
                <input type="password" id="password" name="password" autofocus>
                @error('password')
                    <p class="error">{{ $message }}</p>
                @enderror
            </div>

            <button type="submit" class="btn btn-primary">ログイン</button>
        </form>
    </div>
@endsection
