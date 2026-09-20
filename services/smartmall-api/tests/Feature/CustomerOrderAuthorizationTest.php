<?php

namespace Tests\Feature;

use App\Models\Mall;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CustomerOrderAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_only_view_their_own_order_details(): void
    {
        Role::create(['name' => 'customer']);

        $owner = User::factory()->create();
        $otherCustomer = User::factory()->create();
        $owner->assignRole('customer');
        $otherCustomer->assignRole('customer');

        $mall = Mall::create([
            'owner_id' => $owner->id,
            'name_ar' => 'Mall',
            'name_en' => 'Mall',
        ]);

        $order = Order::create([
            'user_id' => $owner->id,
            'mall_id' => $mall->id,
            'status' => 'pending',
            'total_amount' => 125.00,
        ]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/customer/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('id', $order->id);

        Sanctum::actingAs($otherCustomer);

        $this->getJson("/api/v1/customer/orders/{$order->id}")
            ->assertNotFound()
            ->assertJsonMissingPath('id')
            ->assertJsonMissingPath('total_amount');
    }
}