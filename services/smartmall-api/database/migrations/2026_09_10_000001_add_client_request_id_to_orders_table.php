<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('client_request_id', 100)->nullable();
            $table->unique(['user_id', 'client_request_id'], 'orders_user_client_request_unique');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_user_client_request_unique');
            $table->dropColumn('client_request_id');
        });
    }
};