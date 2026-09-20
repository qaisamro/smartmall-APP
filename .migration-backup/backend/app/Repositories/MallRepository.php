<?php

namespace App\Repositories;

use App\Models\Mall;

class MallRepository extends BaseRepository
{
    public function __construct(Mall $model)
    {
        parent::__construct($model);
    }

    public function getActiveMalls(string $search = null, ?string $type = null)
    {
        // تشمل المنشآت المعطلة (is_active=false) لتظهر في التصفح مع مودال "معلق مؤقتاً" — الفرونت يمنع الدخول
        $query = $this->model->with('theme')->where('status', 'approved');

        if ($type && $type !== 'all' && in_array($type, ['mall', 'supermarket'])) {
            $query->where('type', $type);
        }

        if ($search) {
            $query->where(function ($query) use ($search) {
                $query->where('name_ar', 'LIKE', "%{$search}%")
                    ->orWhere('name_en', 'LIKE', "%{$search}%")
                    ->orWhere('slug', 'LIKE', "%{$search}%")
                    ->orWhere('location_arabic', 'LIKE', "%{$search}%");
            });
        }

        return $query->orderByDesc('is_active')->get();
    }

    public function getByOwner($ownerId)
    {
        return $this->model->with('theme')->where('owner_id', $ownerId)->get();
    }
}
