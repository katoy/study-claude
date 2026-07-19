<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('お問い合わせ詳細') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8">
            @if (session('status_updated'))
                <div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                    ステータスを更新しました。
                </div>
            @endif

            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    <div class="space-y-6">
                        <!-- 受信日時 -->
                        <div class="border-b border-gray-200 pb-4">
                            <p class="text-sm font-medium text-gray-600 mb-1">受信日時</p>
                            <p class="text-lg text-gray-900">{{ $contact->created_at->format('Y年m月d日 H:i:s') }}</p>
                        </div>

                        <!-- お名前 -->
                        <div class="border-b border-gray-200 pb-4">
                            <p class="text-sm font-medium text-gray-600 mb-1">お名前</p>
                            <p class="text-lg text-gray-900">{{ $contact->name }}</p>
                        </div>

                        <!-- メールアドレス -->
                        <div class="border-b border-gray-200 pb-4">
                            <p class="text-sm font-medium text-gray-600 mb-1">メールアドレス</p>
                            <p class="text-lg text-gray-900">{{ $contact->email }}</p>
                        </div>

                        <!-- 件名 -->
                        <div class="border-b border-gray-200 pb-4">
                            <p class="text-sm font-medium text-gray-600 mb-1">件名</p>
                            <p class="text-lg text-gray-900">{{ $contact->subject }}</p>
                        </div>

                        <!-- 本文 -->
                        <div class="border-b border-gray-200 pb-4">
                            <p class="text-sm font-medium text-gray-600 mb-1">本文</p>
                            <p class="text-lg text-gray-900 whitespace-pre-wrap">{{ $contact->body }}</p>
                        </div>

                        <!-- ステータス -->
                        <div class="border-b border-gray-200 pb-4">
                            <p class="text-sm font-medium text-gray-600 mb-2">ステータス</p>
                            <form method="PATCH" action="{{ route('admin.contacts.update', $contact) }}" class="flex items-end gap-4">
                                @csrf
                                @method('PATCH')

                                <div class="flex-1">
                                    <select name="status" class="block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">
                                        @foreach (App\Enums\ContactStatus::cases() as $status)
                                            <option value="{{ $status->value }}" @selected($contact->status->value === $status->value)>
                                                {{ $status->label() }}
                                            </option>
                                        @endforeach
                                    </select>
                                </div>

                                <x-primary-button>
                                    {{ __('更新') }}
                                </x-primary-button>
                            </form>
                        </div>
                    </div>

                    <div class="flex items-center justify-start gap-4 mt-6">
                        <a href="{{ route('admin.contacts.index') }}" class="text-indigo-600 hover:text-indigo-800">
                            一覧に戻る
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
