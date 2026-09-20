<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Mall;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CashierPosAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_can_use_only_the_cashier_pos_contract(): void
    {
        Role::create(['name' => 'cashier']);
        Role::create(['name' => 'mall-owner']);

        $owner = User::factory()->create();
        $owner->assignRole('mall-owner');
        $mall = Mall::create([
            'owner_id' => $owner->id,
            'name_ar' => 'Mall',
            'name_en' => 'Mall',
            'status' => 'approved',
        ]);

        $cashier = User::factory()->create(['mall_id' => $mall->id]);
        $cashier->assignRole('cashier');
        $category = Category::create([
            'mall_id' => $mall->id,
            'name_ar' => 'Category',
            'name_en' => 'Category',
        ]);
        Product::create([
            'mall_id' => $mall->id,
            'category_id' => $category->id,
            'name_ar' => 'Product',
            'name_en' => 'Product',
            'price' => 10,
            'barcode' => 'cashier-product-1',
            'stock_quantity' => 5,
            'is_active' => true,
        ]);

        Sanctum::actingAs($cashier);

        $this->getJson('/api/v1/owner/products')
            ->assertForbidden();

        $this->getJson('/api/v1/cashier/pos/products?search=cashier-product-1')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->postJson('/api/v1/owner/pos/sessions')
            ->assertForbidden();

        $this->postJson('/api/v1/cashier/pos/sessions')
            ->assertOk()
            ->assertJsonPath('mall_id', $mall->id)
            ->assertJsonPath('user_id', $cashier->id);
    }

    public function test_cashier_sales_are_isolated_and_do_not_become_customer_orders(): void
    {
        Role::create(['name' => 'cashier']);

        $owner = User::factory()->create();
        $mall = Mall::create([
            'owner_id' => $owner->id,
            'name_ar' => 'Mall',
            'name_en' => 'Mall',
            'status' => 'approved',
        ]);
        $cashier = User::factory()->create(['mall_id' => $mall->id]);
        $cashier->assignRole('cashier');
        $otherCashier = User::factory()->create(['mall_id' => $mall->id]);
        $otherCashier->assignRole('cashier');
        $category = Category::create([
            'mall_id' => $mall->id,
            'name_ar' => 'Category',
            'name_en' => 'Category',
        ]);
        $product = Product::create([
            'mall_id' => $mall->id,
            'category_id' => $category->id,
            'name_ar' => 'Product',
            'name_en' => 'Product',
            'price' => 10,
            'barcode' => 'cashier-product-2',
            'stock_quantity' => 5,
            'is_active' => true,
        ]);

        Sanctum::actingAs($cashier);
        $sessionResponse = $this->postJson('/api/v1/cashier/pos/sessions')->assertOk();
        $token = $sessionResponse->json('token');
        $itemResponse = $this->postJson("/api/v1/cashier/pos/sessions/{$token}/items", [
            'product_id' => $product->id,
            'quantity' => 1,
        ])->assertOk();
        $itemId = $itemResponse->json('id');

        Sanctum::actingAs($otherCashier);
        $this->getJson("/api/v1/cashier/pos/sessions/{$token}")->assertNotFound();
        $this->patchJson("/api/v1/cashier/pos/items/{$itemId}", ['quantity' => 2])->assertNotFound();
        $this->postJson("/api/v1/cashier/pos/finalize/{$token}")->assertNotFound();

        Sanctum::actingAs($cashier);
        $this->patchJson("/api/v1/cashier/pos/items/{$itemId}", ['quantity' => 2])
            ->assertOk()
            ->assertJsonPath('quantity', 2);
        $finalizeResponse = $this->postJson("/api/v1/cashier/pos/finalize/{$token}")->assertOk();
        $orderId = $finalizeResponse->json('order.id');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'mall_id' => $mall->id,
            'user_id' => null,
            'status' => 'completed',
            'total_amount' => 20,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('pos_sync_sessions', [
            'id' => $sessionResponse->json('id'),
            'user_id' => $cashier->id,
        ]);
        $this->assertDatabaseMissing('orders', ['user_id' => $cashier->id]);

        $this->postJson("/api/v1/cashier/pos/close/{$token}")
            ->assertOk()
            ->assertJsonPath('session.status', 'completed');
        $this->assertDatabaseHas('pos_sync_sessions', [
            'token' => $token,
            'status' => 'completed',
        ]);
    }
}