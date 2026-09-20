<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Mall;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SafeCustomerOrderPlacementTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;
    private Mall $mall;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'customer']);
        $this->customer = User::factory()->create();
        $this->customer->assignRole('customer');
        $this->mall = Mall::create([
            'owner_id' => $this->customer->id,
            'name_ar' => 'مول الاختبار',
            'name_en' => 'Test Mall',
            'status' => 'approved',
            'is_active' => true,
            'enable_quantity_system' => true,
        ]);
        $category = Category::create([
            'mall_id' => $this->mall->id,
            'name_ar' => 'اختبار',
            'name_en' => 'Test',
        ]);
        $this->product = Product::create([
            'mall_id' => $this->mall->id,
            'category_id' => $category->id,
            'name_ar' => 'منتج',
            'name_en' => 'Product',
            'price' => 10,
            'discount_price' => 8,
            'barcode' => 'test-' . uniqid(),
            'stock_quantity' => 5,
            'is_active' => true,
        ]);
    }

    public function test_customer_order_uses_database_price_and_decrements_stock_atomically(): void
    {
        Sanctum::actingAs($this->customer);

        $response = $this->postJson('/api/v1/customer/orders', [
            'mall_id' => $this->mall->id,
            'items' => [[
                'product_id' => $this->product->id,
                'quantity' => 2,
                'price' => 0.01,
                'line_total' => 0.01,
            ]],
            'subtotal' => 0.01,
            'total' => 0.01,
            'phone' => '0500000000',
            'idempotency_key' => 'safe-order-1',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('order.total_amount', '16.00')
            ->assertJsonPath('order.items.0.price_at_sale', '8.00');

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('order.id'),
            'user_id' => $this->customer->id,
            'total_amount' => '16.00',
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('order.id'),
            'product_id' => $this->product->id,
            'quantity' => 2,
            'price_at_sale' => '8.00',
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'stock_quantity' => 3,
        ]);
    }

    public function test_insufficient_stock_rejects_without_creating_an_order(): void
    {
        Sanctum::actingAs($this->customer);

        $this->postJson('/api/v1/customer/orders', [
            'mall_id' => $this->mall->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 6]],
        ])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock');

        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'stock_quantity' => 5,
        ]);
    }

    public function test_invalid_quantity_and_unauthenticated_requests_are_rejected(): void
    {
        $this->postJson('/api/v1/customer/orders', [
            'mall_id' => $this->mall->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 0]],
        ])->assertUnprocessable();

        $this->postJson('/api/v1/customer/orders', [
            'mall_id' => $this->mall->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
        ])->assertUnauthorized();
    }

    public function test_idempotency_key_does_not_create_a_duplicate_order(): void
    {
        Sanctum::actingAs($this->customer);
        $payload = [
            'mall_id' => $this->mall->id,
            'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            'idempotency_key' => 'safe-order-retry',
        ];

        $first = $this->postJson('/api/v1/customer/orders', $payload)->assertCreated();
        $second = $this->postJson('/api/v1/customer/orders', $payload)->assertOk();

        $this->assertSame($first->json('order.id'), $second->json('order.id'));
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'stock_quantity' => 4,
        ]);
    }
}