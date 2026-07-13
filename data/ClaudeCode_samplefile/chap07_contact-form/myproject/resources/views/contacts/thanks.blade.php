@extends('layouts.app')

@section('title', '送信完了')
@section('header_title', 'お問い合わせフォーム')

@section('content')
<div class="card" style="text-align: center;">
    <h2>お問い合わせありがとうございました</h2>

    <p style="margin: 20px 0;">お問い合わせを受け付けました。<br>内容を確認の上、ご連絡いたします。</p>

    <a href="{{ route('contact.create') }}" class="btn btn-primary">トップに戻る</a>
</div>
@endsection
