<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\PosSyncSession;
use App\Models\PosSyncItem;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Helpers\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class POSController extends Controller
{
    /**
     * Cashiers use a separate contract so their session and item access can
     * never fall through to the owner POS routes.
     */
    public function cashierProducts(Request $request)
    {
        $mall = $this->cashierMall($request);
        $query = Product::where('mall_id', $mall->id)
            ->where('is_active', true);

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $subMatch = collect();
            if (Schema::hasTable('sub_barcodes')) {
                $subMatch = \App\Models\SubBarcode::where('mall_id', $mall->id)
                    ->where('sub_barcode', 'like', "%{$search}%")
                    ->pluck('product_id')
                    ->filter()
                    ->unique()
                    ->values();
            }

            $query->where(function ($q) use ($search, $subMatch) {
                $q->where('name_ar', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");

                if ($subMatch->isNotEmpty()) {
                    $q->orWhereIn('id', $subMatch);
                }
            });
        }

        $perPage = min(max((int) $request->input('per_page', 30), 1), 50);

        return response()->json(
            $query->orderByRaw("COALESCE(NULLIF(name_ar, ''), name_en) ASC")->paginate($perPage)
        );
    }

    public function createCashierSession(Request $request)
    {
        $mall = $this->cashierMall($request);
        $user = $request->user();

        $session = PosSyncSession::where('mall_id', $mall->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($session) {
            return response()->json($session);
        }

        return response()->json(PosSyncSession::create([
            'token' => Str::random(8),
            'mall_id' => $mall->id,
            'user_id' => $user->id,
            'status' => 'active',
        ]));
    }

    public function showCashierSession(Request $request, $token)
    {
        return response()->json($this->cashierSession($request, $token));
    }

    public function addCashierItem(Request $request, $token)
    {
        $this->cashierSession($request, $token, true);

        // The existing item resolver handles product IDs, barcodes, sub-barcodes,
        // stock checks, price snapshots, and activity logging.
        return $this->addItem($request, $token);
    }

    public function updateCashierItem(Request $request, $itemId)
    {
        $this->cashierItemSession($request, $itemId, true);

        return $this->updateItem($request, $itemId);
    }

    public function removeCashierItem(Request $request, $itemId)
    {
        $this->cashierItemSession($request, $itemId, true);

        return $this->removeItem($itemId);
    }

    public function finalizeCashier(Request $request, $token)
    {
        $this->cashierSession($request, $token, true);

        // The shared finalizer deliberately keeps direct-sale orders detached
        // from customer accounts and applies the same stock/accounting rules.
        return $this->finalize($request, $token);
    }

    public function closeCashierSession(Request $request, $token)
    {
        $this->cashierSession($request, $token, true);

        return $this->closeSession($request, $token);
    }

    private function cashierMall(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('mall');
        $mall = $user->mall;

        if (!$mall) {
            abort(404, 'No mall associated with this user');
        }

        if (!$mall->is_active) {
            abort(403, 'This mall is inactive');
        }

        return $mall;
    }

    private function cashierSession(Request $request, $token, bool $activeOnly = false): PosSyncSession
    {
        $mall = $this->cashierMall($request);
        $query = PosSyncSession::with('items.product')
            ->where('token', $token)
            ->where('mall_id', $mall->id)
            ->where('user_id', $request->user()->id);

        if ($activeOnly) {
            $query->where('status', 'active');
        }

        return $query->firstOrFail();
    }

    private function cashierItemSession(Request $request, $itemId, bool $activeOnly = false): PosSyncSession
    {
        $mall = $this->cashierMall($request);
        $query = PosSyncItem::query()
            ->whereKey($itemId)
            ->whereHas('session', function ($sessionQuery) use ($mall, $request, $activeOnly) {
                $sessionQuery
                    ->where('mall_id', $mall->id)
                    ->where('user_id', $request->user()->id);

                if ($activeOnly) {
                    $sessionQuery->where('status', 'active');
                }
            })
            ->with('session');

        return $query->firstOrFail()->session;
    }

    public function createSession(Request $request)
    {
        try {
            $user = $request->user();
            $mall = $user->mall;

            if (!$mall) {
                return response()->json(['message' => 'No mall associated with this user'], 404);
            }

            // Find today's active session for this mall, or create a new one
            $session = PosSyncSession::where('mall_id', $mall->id)
                ->where('status', 'active')
                ->whereDate('created_at', today())
                ->first();

            if ($session) {
                return response()->json($session);
            }

            $session = PosSyncSession::create([
                'token' => \Illuminate\Support\Str::random(8),
                'mall_id' => $mall->id,
                'user_id' => $user->id,
                'status' => 'active'
            ]);

            
            return response()->json($session);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('POS Session Creation Error: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Internal Server Error',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function showSession($token)
    {
        $session = PosSyncSession::with('items.product')->where('token', $token)->firstOrFail();
        return response()->json($session);
    }

    public function addItem(Request $request, $token)
    {
        $session = PosSyncSession::where('token', $token)->where('status', 'active')->firstOrFail();
        
        $validated = $request->validate([
            'barcode' => 'required_without:product_id|string',
            'product_id' => 'required_without:barcode|exists:products,id',
            'quantity' => 'integer|min:1'
        ]);

        // If product_id is provided, look up directly
        if ($request->has('product_id')) {
            $product = Product::where('id', $request->product_id)
                ->where('mall_id', $session->mall_id)
                ->first();
        } else {
            $barcode = preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}]/u', '', trim($validated['barcode']));
            $barcodeNorm = preg_replace('/[^0-9]/', '', $barcode);

            $product = Product::where('mall_id', $session->mall_id)
                ->where(function($q) use ($barcode, $barcodeNorm) {
                    $q->where('barcode', $barcode)->orWhere('sku', $barcode);
                    if ($barcodeNorm !== $barcode) {
                        $q->orWhere('barcode', $barcodeNorm);
                    }
                })
                ->first();
        }

        // If not found by main barcode, check sub_barcodes
        if (!$product) {
            $sub = \App\Models\SubBarcode::where('mall_id', $session->mall_id)
                ->where(function($q) use ($barcode, $barcodeNorm) {
                    $q->where('sub_barcode', $barcode);
                    if ($barcodeNorm !== $barcode) {
                        $q->orWhere('sub_barcode', $barcodeNorm);
                    }
                })
                ->first();
            if ($sub) {
                // Priority 1: product_id direct lookup (most reliable)
                if ($sub->product_id) {
                    $product = Product::where('id', $sub->product_id)
                        ->where('mall_id', $session->mall_id)
                        ->first();
                }
                // Priority 2: match via main_barcode
                if (!$product && $sub->main_barcode) {
                    $product = Product::where('mall_id', $session->mall_id)
                        ->where('barcode', $sub->main_barcode)
                        ->first();
                }
                // Priority 3: dynamic scan all products
                if (!$product) {
                    $product = Product::where('mall_id', $session->mall_id)
                        ->where(function($q) use ($barcode, $barcodeNorm) {
                            $q->where('barcode', $barcode)->orWhere('sku', $barcode);
                            if ($barcodeNorm !== $barcode) {
                                $q->orWhere('barcode', $barcodeNorm);
                            }
                        })
                        ->first();
                }
                // If found dynamically, update sub_barcode + product for next time
                if ($product) {
                    $sub->update(['product_id' => $product->id]);
                    $currentBarcode = preg_replace('/[^0-9]/', '', $product->barcode ?? '');
                    if ($currentBarcode === '' && $barcodeNorm !== '') {
                        $product->update(['barcode' => $barcode]);
                    }
                }
            }
        }

        if (!$product) {
            return response()->json(['message' => 'Product not found in this mall'], 404);
        }


        $requestedQty = $validated['quantity'] ?? 1;

        $existing = PosSyncItem::where('pos_sync_session_id', $session->id)
            ->where('product_id', $product->id)
            ->first();

        $currentInSession = $existing ? $existing->quantity : 0;
        $totalNeeded = $currentInSession + $requestedQty;

        // Only check stock when quantity system is enabled
        if ($session->mall && $session->mall->enable_quantity_system) {
            if ($product->stock_quantity < $totalNeeded) {
                $available = max(0, $product->stock_quantity - $currentInSession);
                return response()->json([
                    'message' => "الكمية غير متوفرة. المخزون: {$product->stock_quantity}، المطلوب: {$requestedQty}، المتاح للإضافة: {$available}",
                    'product' => $product->name_ar,
                    'stock_quantity' => $product->stock_quantity,
                    'in_session' => $currentInSession,
                    'available_to_add' => $available
                ], 422);
            }
        }

        if ($existing) {
            $existing->increment('quantity', $requestedQty);
            $item = $existing->fresh()->load('product');
        } else {
            $item = PosSyncItem::create([
                'pos_sync_session_id' => $session->id,
                'product_id'          => $product->id,
                'quantity'            => $requestedQty,
                'price_at_scan'       => $product->price
            ]);
            $item->load('product');
        }

        ActivityLogger::log('added_to_cart', 'إضافة منتج إلى السلة: ' . $product->name_ar . '×' . $requestedQty . ' في المول #' . $session->mall_id, $product, null, $session->mall_id, [
            'product_id' => $product->id,
            'product_name' => $product->name_ar,
            'quantity' => $requestedQty,
            'price' => $product->price,
            'session_token' => $session->token,
        ]);

        return response()->json($item);
    }

    public function removeItem($itemId)
    {
        $item = PosSyncItem::findOrFail($itemId);
        $session = $item->session;
        $productName = $item->product?->name_ar ?? ('#' . $item->product_id);
        ActivityLogger::log('cart_item_removed', 'إزالة منتج من السلة: ' . $productName, $item->product, null, $session?->mall_id, [
            'product_id' => $item->product_id,
            'quantity' => $item->quantity,
            'session_token' => $session?->token,
        ]);
        $item->delete();
        return response()->json(['message' => 'Item removed']);
    }

    public function updateItem(Request $request, $itemId)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1'
        ]);

        $item = PosSyncItem::with('product')->findOrFail($itemId);
        $item->update(['quantity' => $request->quantity]);

        return response()->json($item);
    }

    public function finalize(Request $request, $token)
    {
        $session = PosSyncSession::with('items.product')->where('token', $token)->firstOrFail();
        
        if ($session->items->isEmpty()) {
            return response()->json(['message' => 'Session is empty'], 400);
        }

        $totalAmount = $session->items->sum(function($item) {
            return $item->price_at_scan * $item->quantity;
        });

        return DB::transaction(function() use ($session, $totalAmount) {
            $checkStock = $session->mall && $session->mall->enable_quantity_system;

            if ($checkStock) {
                $insufficientStock = [];
                foreach ($session->items as $syncItem) {
                    $product = Product::find($syncItem->product_id);
                    if ($product && $product->stock_quantity < $syncItem->quantity) {
                        $insufficientStock[] = "{$product->name_ar} (متوفر: {$product->stock_quantity}، مطلوب: {$syncItem->quantity})";
                    }
                }
                if (!empty($insufficientStock)) {
                    return response()->json([
                        'message' => 'بعض المنتجات لا تتوفر بالكمية المطلوبة',
                        'products' => $insufficientStock
                    ], 422);
                }
            }

            $order = Order::create([
                'mall_id' => $session->mall_id,
                'user_id' => null,
                'total_amount' => $totalAmount,
                'status' => 'completed',
            ]);

            foreach ($session->items as $syncItem) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $syncItem->product_id,
                    'quantity' => $syncItem->quantity,
                    'price_at_sale' => $syncItem->price_at_scan
                ]);

                if ($checkStock) {
                    $product = Product::find($syncItem->product_id);
                    if ($product) {
                        $product->decrement('stock_quantity', $syncItem->quantity);
                    }
                }
            }

            // Clear session items (keep session active for next transaction)
            PosSyncItem::where('pos_sync_session_id', $session->id)->delete();

            \App\Models\AccountingEntry::create([
                'mall_id' => $session->mall_id,
                'type' => 'income',
                'amount' => $totalAmount,
                'description' => "مبيعات POS - جلسة {$session->token}",
                'entry_date' => now()
            ]);

            return response()->json([
                'message' => 'Order completed successfully',
                'order' => $order->load('items.product', 'mall'),
                'session' => $session->fresh()->load('items.product')
            ]);
        });
    }

    public function closeSession(Request $request, $token)
    {
        $session = PosSyncSession::where('token', $token)->first();

        if (!$session) {
            return response()->json(['message' => 'الجلسة غير موجودة'], 404);
        }

        if ($session->status === 'completed') {
            return response()->json(['message' => 'الجلسة مغلقة بالفعل', 'session' => $session]);
        }

        DB::transaction(function () use ($session) {
            $session->update(['status' => 'completed']);
            PosSyncItem::where('pos_sync_session_id', $session->id)->delete();

            ActivityLogger::log('pos_session_closed', 'إغلاق جلسة POS: ' . $session->token, null, null, $session->mall_id, [
                'session_token' => $session->token,
                'mall_id' => $session->mall_id,
            ]);
        });

        return response()->json([
            'message' => 'تم إغلاق الجلسة بنجاح',
            'session' => $session->fresh()
        ]);
    }
}
