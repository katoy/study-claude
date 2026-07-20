@if ($paginator->hasPages())
    <nav role="navigation" aria-label="{{ __('Pagination Navigation') }}">
        <div class="flex items-center justify-between gap-2 sm:hidden">
            @if ($paginator->onFirstPage())
                <span aria-disabled="true" class="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {!! __('pagination.previous') !!}
                </span>
            @else
                <a href="{{ $paginator->previousPageUrl() }}" rel="prev" class="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                    {!! __('pagination.previous') !!}
                </a>
            @endif

            @if ($paginator->hasMorePages())
                <a href="{{ $paginator->nextPageUrl() }}" rel="next" class="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                    {!! __('pagination.next') !!}
                </a>
            @else
                <span aria-disabled="true" class="inline-flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {!! __('pagination.next') !!}
                </span>
            @endif
        </div>

        <div class="hidden items-center justify-between gap-3 sm:flex">
            <p class="text-sm leading-5 text-gray-700 dark:text-gray-300">
                {{ __('全 :total 件中 :first〜:last 件を表示中', [
                    'total' => $paginator->total(),
                    'first' => $paginator->firstItem() ?? 0,
                    'last' => $paginator->lastItem() ?? 0,
                ]) }}
            </p>

            <div class="inline-flex rounded-md shadow-sm">
                @if ($paginator->onFirstPage())
                    <span aria-hidden="true" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-l-md border border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </span>
                @else
                    <a href="{{ $paginator->previousPageUrl() }}" rel="prev" aria-label="{{ __('前へ') }}" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-l-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                    </a>
                @endif

                @foreach ($elements as $element)
                    @if (is_string($element))
                        <span aria-hidden="true" class="-ml-px inline-flex min-h-11 min-w-11 items-center justify-center border border-gray-300 bg-white px-2 text-sm font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {{ $element }}
                        </span>
                    @endif

                    @if (is_array($element))
                        @foreach ($element as $page => $url)
                            @if ($page == $paginator->currentPage())
                                <span aria-current="page" class="-ml-px inline-flex min-h-11 min-w-11 items-center justify-center border border-gray-300 bg-gray-200 px-3 text-sm font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-600 dark:text-white">
                                    <span class="sr-only">{{ __('現在のページ') }}:</span>
                                    {{ $page }}
                                </span>
                            @else
                                <a href="{{ $url }}" aria-label="{{ __('Go to page :page', ['page' => $page]) }}" class="-ml-px inline-flex min-h-11 min-w-11 items-center justify-center border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                                    {{ $page }}
                                </a>
                            @endif
                        @endforeach
                    @endif
                @endforeach

                @if ($paginator->hasMorePages())
                    <a href="{{ $paginator->nextPageUrl() }}" rel="next" aria-label="{{ __('次へ') }}" class="-ml-px inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100 focus:z-10 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                        </svg>
                    </a>
                @else
                    <span aria-hidden="true" class="-ml-px inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md border border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                        </svg>
                    </span>
                @endif
            </div>
        </div>
    </nav>
@endif
