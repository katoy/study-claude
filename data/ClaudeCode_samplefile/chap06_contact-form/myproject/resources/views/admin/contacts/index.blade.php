@extends('layouts.app')

@section('title', 'お問い合わせ管理')
@section('header_title', '管理ページ')

@section('content')
<div class="card">
    <h2>お問い合わせ一覧</h2>

    <!-- 絞り込みフォーム -->
    <form method="GET" action="{{ route('admin.contacts.index') }}" class="search-form">
        <div class="search-row">
            <div class="search-item">
                <label for="name">氏名</label>
                <input type="text" id="name" name="name" value="{{ request('name') }}" placeholder="氏名で検索">
            </div>
            <div class="search-item">
                <label for="date_from">開始日</label>
                <input type="date" id="date_from" name="date_from" value="{{ request('date_from') }}">
            </div>
            <div class="search-item">
                <label for="date_to">終了日</label>
                <input type="date" id="date_to" name="date_to" value="{{ request('date_to') }}">
            </div>
        </div>
        <div class="search-row">
            <div class="search-item">
                <label>ステータス</label>
                <div class="checkbox-group">
                    @foreach(['新規', '対応中', '解決済み'] as $status)
                        <label class="checkbox-label">
                            <input type="checkbox" name="status[]" value="{{ $status }}"
                                {{ in_array($status, request('status', [])) ? 'checked' : '' }}>
                            {{ $status }}
                        </label>
                    @endforeach
                </div>
            </div>
            <div class="search-actions">
                <button type="submit" class="btn btn-primary">検索</button>
                <a href="{{ route('admin.contacts.index') }}" class="btn btn-secondary">クリア</a>
            </div>
        </div>
    </form>

    @if($contacts->isEmpty())
        <p>お問い合わせはまだありません。</p>
    @else
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>名前</th>
                    <th>件名</th>
                    <th>ステータス</th>
                    <th>受信日時</th>
                </tr>
            </thead>
            <tbody>
                @foreach($contacts as $contact)
                    <tr>
                        <td>{{ $contact->id }}</td>
                        <td>
                            <a href="{{ route('admin.contacts.show', $contact) }}">
                                {{ $contact->name }}
                            </a>
                        </td>
                        <td>{{ $contact->subject }}</td>
                        <td>
                            @if($contact->status === '新規')
                                <span class="badge badge-new">{{ $contact->status }}</span>
                            @elseif($contact->status === '対応中')
                                <span class="badge badge-progress">{{ $contact->status }}</span>
                            @else
                                <span class="badge badge-resolved">{{ $contact->status }}</span>
                            @endif
                        </td>
                        <td>{{ $contact->created_at->format('Y/m/d H:i') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        {{ $contacts->links() }}
    @endif
</div>
@endsection
