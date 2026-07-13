<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    /**
     * 一括代入を許可するカラム
     */
    protected $fillable = [
        'name',
        'email',
        'subject',
        'body',
        'status',
    ];
}
