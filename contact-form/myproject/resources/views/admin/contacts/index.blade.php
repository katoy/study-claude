<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('お問い合わせ一覧') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    @if ($contacts->count() > 0)
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="px-4 py-2">受信日時</th>
                                        <th class="px-4 py-2">お名前</th>
                                        <th class="px-4 py-2">件名</th>
                                        <th class="px-4 py-2">ステータス</th>
                                        <th class="px-4 py-2">アクション</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($contacts as $contact)
                                        <tr class="border-b border-gray-200 hover:bg-gray-50">
                                            <td class="px-4 py-2">{{ $contact->created_at->format('Y-m-d H:i') }}</td>
                                            <td class="px-4 py-2">{{ $contact->name }}</td>
                                            <td class="px-4 py-2">{{ $contact->subject }}</td>
                                            <td class="px-4 py-2">
                                                <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold
                                                    @if ($contact->status->value === 'new')
                                                        bg-blue-100 text-blue-800
                                                    @elseif ($contact->status->value === 'in_progress')
                                                        bg-yellow-100 text-yellow-800
                                                    @else
                                                        bg-green-100 text-green-800
                                                    @endif
                                                ">
                                                    {{ $contact->status->label() }}
                                                </span>
                                            </td>
                                            <td class="px-4 py-2">
                                                <a href="{{ route('admin.contacts.show', $contact) }}" class="text-indigo-600 hover:text-indigo-900">詳細</a>
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>

                        <div class="mt-6">
                            {{ $contacts->links() }}
                        </div>
                    @else
                        <p class="text-center text-gray-600">お問い合わせはまだありません。</p>
                    @endif
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
