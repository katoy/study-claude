@extends('layouts.app')

@section('title', '入力内容の確認')
@section('header_title', 'お問い合わせフォーム')

@section('content')
<div class="card">
    <h2>入力内容の確認</h2>

    <dl>
        <div class="confirm-item">
            <dt>名前</dt>
            <dd>{{ $contact['name'] }}</dd>
        </div>

        <div class="confirm-item">
            <dt>メールアドレス</dt>
            <dd>{{ $contact['email'] }}</dd>
        </div>

        <div class="confirm-item">
            <dt>件名</dt>
            <dd>{{ $contact['subject'] }}</dd>
        </div>

        <div class="confirm-item">
            <dt>本文</dt>
            <dd>{!! nl2br(e($contact['body'])) !!}</dd>
        </div>
    </dl>

    <form action="{{ route('contact.store') }}" method="POST">
        @csrf
        <div class="btn-group">
            <button type="submit" name="back" value="1" class="btn btn-secondary">戻る</button>
            <button type="submit" class="btn btn-primary">送信する</button>
        </div>
    </form>
</div>
@endsection
