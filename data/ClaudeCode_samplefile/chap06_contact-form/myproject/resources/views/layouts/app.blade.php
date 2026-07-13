<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'お問い合わせフォーム')</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background-color: #2c3e50;
            color: #fff;
            padding: 15px 0;
            margin-bottom: 30px;
        }

        header .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        header h1 {
            font-size: 1.3rem;
        }

        header nav a {
            color: #ecf0f1;
            text-decoration: none;
            margin-left: 20px;
            font-size: 0.9rem;
        }

        header nav a:hover {
            text-decoration: underline;
        }

        .card {
            background: #fff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .card h2 {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
            color: #2c3e50;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
            color: #2c3e50;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }

        .form-group textarea {
            height: 150px;
            resize: vertical;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 3px rgba(52, 152, 219, 0.3);
        }

        .error {
            color: #e74c3c;
            font-size: 0.85rem;
            margin-top: 5px;
        }

        .btn {
            display: inline-block;
            padding: 10px 30px;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            text-decoration: none;
        }

        .btn-primary {
            background-color: #3498db;
            color: #fff;
        }

        .btn-primary:hover {
            background-color: #2980b9;
        }

        .btn-secondary {
            background-color: #95a5a6;
            color: #fff;
        }

        .btn-secondary:hover {
            background-color: #7f8c8d;
        }

        .btn-success {
            background-color: #27ae60;
            color: #fff;
        }

        .btn-success:hover {
            background-color: #219a52;
        }

        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .confirm-item {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }

        .confirm-item dt {
            font-weight: bold;
            color: #7f8c8d;
            font-size: 0.85rem;
            margin-bottom: 3px;
        }

        .confirm-item dd {
            font-size: 1rem;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        table th,
        table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #2c3e50;
        }

        table tr:hover {
            background-color: #f8f9fa;
        }

        table a {
            color: #3498db;
            text-decoration: none;
        }

        table a:hover {
            text-decoration: underline;
        }

        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            color: #fff;
        }

        .badge-new {
            background-color: #e74c3c;
        }

        .badge-progress {
            background-color: #f39c12;
        }

        .badge-resolved {
            background-color: #27ae60;
        }

        .alert-success {
            background-color: #d4edda;
            color: #155724;
            padding: 12px 20px;
            border-radius: 4px;
            margin-bottom: 20px;
        }

        .pagination {
            display: flex;
            justify-content: center;
            gap: 5px;
            margin-top: 20px;
            list-style: none;
        }

        .pagination li a,
        .pagination li span {
            display: inline-block;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-decoration: none;
            color: #3498db;
        }

        .pagination li.active span {
            background-color: #3498db;
            color: #fff;
            border-color: #3498db;
        }

        .pagination li.disabled span {
            color: #ccc;
        }

        /* 絞り込みフォーム */
        .search-form {
            background-color: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 25px;
        }

        .search-row {
            display: flex;
            gap: 15px;
            align-items: flex-end;
            margin-bottom: 15px;
        }

        .search-row:last-child {
            margin-bottom: 0;
        }

        .search-item {
            flex: 1;
        }

        .search-item label {
            display: block;
            font-weight: bold;
            font-size: 0.85rem;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .search-item input[type="text"],
        .search-item input[type="date"] {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
        }

        .search-item input[type="text"]:focus,
        .search-item input[type="date"]:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 3px rgba(52, 152, 219, 0.3);
        }

        .checkbox-group {
            display: flex;
            gap: 15px;
            padding-top: 4px;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 5px;
            font-weight: normal;
            font-size: 0.9rem;
            cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
            width: auto;
        }

        .search-actions {
            display: flex;
            gap: 10px;
            align-items: flex-end;
            padding-bottom: 2px;
        }

        .search-actions .btn {
            padding: 8px 20px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>@yield('header_title', 'お問い合わせフォーム')</h1>
            <nav>
                <a href="{{ route('contact.create') }}">お問い合わせ</a>
                @if(request()->is('admin/*') && session('admin_authenticated'))
                    <a href="{{ route('admin.contacts.index') }}">管理ページ</a>
                    <form method="POST" action="{{ route('admin.logout') }}" style="display: inline;">
                        @csrf
                        <button type="submit" style="background: none; border: none; color: #ecf0f1; cursor: pointer; font-size: 0.9rem; margin-left: 20px;">ログアウト</button>
                    </form>
                @endif
            </nav>
        </div>
    </header>

    <div class="container">
        @yield('content')
    </div>
</body>
</html>
