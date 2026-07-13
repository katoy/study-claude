@extends('layouts.app')

@section('title', 'お問い合わせ詳細')
@section('header_title', '管理ページ')

@section('content')
<div class="card">
    <h2>お問い合わせ詳細</h2>

    @if(session('success'))
        <div class="alert-success">
            {{ session('success') }}
        </div>
    @endif

    <dl>
        <div class="confirm-item">
            <dt>ID</dt>
            <dd>{{ $contact->id }}</dd>
        </div>

        <div class="confirm-item">
            <dt>名前</dt>
            <dd>{{ $contact->name }}</dd>
        </div>

        <div class="confirm-item">
            <dt>メールアドレス</dt>
            <dd>{{ $contact->email }}</dd>
        </div>

        <div class="confirm-item">
            <dt>件名</dt>
            <dd>{{ $contact->subject }}</dd>
        </div>

        <div class="confirm-item">
            <dt>本文</dt>
            <dd>{!! nl2br(e($contact->body)) !!}</dd>
        </div>

        <div class="confirm-item">
            <dt>受信日時</dt>
            <dd>{{ $contact->created_at->format('Y/m/d H:i') }}</dd>
        </div>
    </dl>

    <form action="{{ route('admin.contacts.update', $contact) }}" method="POST" style="margin-top: 20px;">
        @csrf
        @method('PATCH')

        <div class="form-group">
            <label for="status">ステータス</label>
            <select id="status" name="status" style="width: auto;">
                @foreach(['新規', '対応中', '解決済み'] as $status)
                    <option value="{{ $status }}" @selected($contact->status === $status)>
                        {{ $status }}
                    </option>
                @endforeach
            </select>
        </div>

        <div class="btn-group">
            <button type="submit" class="btn btn-success">ステータスを更新</button>
            <a href="{{ route('admin.contacts.index') }}" class="btn btn-secondary">一覧に戻る</a>
        </div>
    </form>
</div>
@endsection
