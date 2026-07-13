@extends('layouts.app')

@section('title', 'お問い合わせ')
@section('header_title', 'お問い合わせフォーム')

@section('content')
<div class="card">
    <h2>お問い合わせ</h2>

    <form action="{{ route('contact.confirm') }}" method="POST">
        @csrf

        <div class="form-group">
            <label for="name">名前 <span style="color: #e74c3c;">*</span></label>
            <input type="text" id="name" name="name" value="{{ old('name', $contact['name'] ?? '') }}">
            @error('name')
                <p class="error">{{ $message }}</p>
            @enderror
        </div>

        <div class="form-group">
            <label for="email">メールアドレス <span style="color: #e74c3c;">*</span></label>
            <input type="email" id="email" name="email" value="{{ old('email', $contact['email'] ?? '') }}">
            @error('email')
                <p class="error">{{ $message }}</p>
            @enderror
        </div>

        <div class="form-group">
            <label for="subject">件名 <span style="color: #e74c3c;">*</span></label>
            <input type="text" id="subject" name="subject" value="{{ old('subject', $contact['subject'] ?? '') }}">
            @error('subject')
                <p class="error">{{ $message }}</p>
            @enderror
        </div>

        <div class="form-group">
            <label for="body">本文 <span style="color: #e74c3c;">*</span></label>
            <textarea id="body" name="body">{{ old('body', $contact['body'] ?? '') }}</textarea>
            @error('body')
                <p class="error">{{ $message }}</p>
            @enderror
        </div>

        <div class="btn-group">
            <button type="submit" class="btn btn-primary">確認画面へ</button>
        </div>
    </form>
</div>
@endsection
