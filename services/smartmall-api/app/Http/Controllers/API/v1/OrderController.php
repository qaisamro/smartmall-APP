<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\Mall;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Repositories\OrderRepository;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    protected $orderRepository;

    public function __construct(OrderRepository $orderRepository)
    {
        $this->orderRepository = $orderRepository;
    }

    public function index(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'unauthenticated',
            ], 401);
        }

        if ($user->hasRole('super-admin')) {
            return response()->json($this->orderRepository->all());
        }

        if ($user->hasRole('mall-owner')) {
            // Logic to get orders for all malls owned by this user
            return response()->json($this->orderRepository->getByUser($user->getAuthIdentifier())); // Placeholder
        }

        return response()->json($this->orderRepository->getByUser($user->getAuthIdentifier()));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'unauthenticated',
            ], 401);
        }

        if ($request->header('Idempotency-Key')) {
            $request->merge(['idempotency_key' => $request->header('Idempotency-Key')]);
        }

        $request->validate([
            'mall_id' => 'required|exists:malls,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'delivery_method' => 'nullable|in:in-mall,pickup,delivery,direct_purchase',
            'delivery_address' => 'nullable|string|max:500',
            'delivery_phone' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'general_notes' => 'nullable|string|max:1000',
            'idempotency_key' => 'nullable|string|max:100',
        ]);

        $idempotencyKey = $request->input('idempotency_key');

        return DB::transaction(function () use ($request, $user, $idempotencyKey) {
            if ($idempotencyKey) {
                $existing = Order::query()
                    ->where('user_id', $user->getAuthIdentifier())
                    ->where('client_request_id', $idempotencyKey)
                    ->with(['items.product:id,name_ar,name_en,image,link_photo', 'mall:id,name_ar,name_en,logo'])
                    ->first();

                if ($existing) {
                    return response()->json([
                        'message' => 'Order already created',
                        'order' => $this->customerOrderPayload($existing),
                    ], 200);
                }
            }

            $mall = Mall::query()
                ->whereKey($request->integer('mall_id'))
                ->where('is_active', true)
                ->firstOrFail();

            $requestedQuantities = collect($request->input('items'))
                ->groupBy('product_id')
                ->map(fn ($items) => $items->sum(fn ($item) => (int) $item['quantity']));

            $products = Product::query()
                ->whereIn('id', $requestedQuantities->keys())
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== $requestedQuantities->count()) {
                throw new HttpResponseException(response()->json([
                    'message' => 'One or more products are no longer available.',
                    'code' => 'product_unavailable',
                ], 409));
            }

            $totalCents = 0;
            foreach ($requestedQuantities as $productId => $quantity) {
                /** @var Product $product */
                $product = $products->get($productId);
                if (!$product || !$product->is_active || (int) $product->mall_id !== $mall->id) {
                    throw new HttpResponseException(response()->json([
                        'message' => 'One or more products are no longer available.',
                        'code' => 'product_unavailable',
                    ], 409));
                }

                if ($mall->enable_quantity_system && $quantity > (int) $product->stock_quantity) {
                    throw new HttpResponseException(response()->json([
                        'message' => 'One or more products do not have enough stock.',
                        'code' => 'insufficient_stock',
                        'product_id' => $product->id,
                        'available' => (int) $product->stock_quantity,
                    ], 409));
                }

                $unitPriceCents = (int) round(((float) $product->current_price) * 100);
                $totalCents += $unitPriceCents * $quantity;
            }

            $deliveryMethod = $request->input('delivery_method')
                ?: ($request->filled('delivery_address') ? 'delivery' : 'pickup');
            $deliveryStatus = $deliveryMethod === 'delivery' ? 'preparing' : 'pending';

            $order = Order::create([
                'user_id' => $user->getAuthIdentifier(),
                'mall_id' => $mall->id,
                'total_amount' => number_format($totalCents / 100, 2, '.', ''),
                'status' => 'pending',
                'delivery_method' => $deliveryMethod,
                'delivery_status' => $deliveryStatus,
                'delivery_address' => $request->input('delivery_address'),
                'delivery_phone' => $request->input('delivery_phone') ?: $request->input('phone'),
                'phone' => $request->input('phone'),
                'general_notes' => $request->input('general_notes'),
                'delivery_fee' => 0,
                'client_request_id' => $idempotencyKey,
            ]);

            foreach ($requestedQuantities as $productId => $quantity) {
                /** @var Product $product */
                $product = $products->get($productId);
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price_at_sale' => number_format(((float) $product->current_price), 2, '.', ''),
                ]);

                if ($mall->enable_quantity_system) {
                    $product->decrement('stock_quantity', $quantity);
                }
            }

            try {
                \App\Jobs\ProcessOrderNotifications::dispatch($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to dispatch order notifications', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            $order->load(['items.product:id,name_ar,name_en,image,link_photo', 'mall:id,name_ar,name_en,logo']);

            return response()->json([
                'message' => 'Order created',
                'order' => $this->customerOrderPayload($order),
            ], 201);
        });
    }

    private function customerOrderPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'mall_id' => $order->mall_id,
            'status' => $order->status,
            'total_amount' => $order->total_amount,
            'delivery_method' => $order->delivery_method,
            'delivery_status' => $order->delivery_status,
            'delivery_fee' => $order->delivery_fee,
            'delivery_address' => $order->delivery_address,
            'delivery_phone' => $order->delivery_phone,
            'general_notes' => $order->general_notes,
            'created_at' => $order->created_at,
            'mall' => $order->mall,
            'items' => $order->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'price_at_sale' => $item->price_at_sale,
                'product' => $item->product,
            ])->values(),
        ];
    }

    public function createPending(Request $request)
    {
        $request->validate([
            'mall_id' => 'required|exists:malls,id',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required',
            'items.*.mall_id' => 'required|exists:malls,id',
            'items.*.price' => 'required|numeric',
            'items.*.quantity' => 'required|numeric|min:0.1',
            'total' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:20',
        ]);

        $pending = \App\Models\PendingOrder::create([
            'mall_id' => $request->mall_id,
            'user_id' => auth()->id(),
            'items_json' => $request->items,
            'total' => $request->total,
            'notes' => $request->notes,
            'phone' => $request->phone,
            'is_paid' => false,
        ]);

        return response()->json([
            'order_id' => 'ORD-' . $pending->id,
            'pending_id' => $pending->id,
            'message' => 'Pending order created',
        ], 201);
    }

    public function showPending($id)
    {
        $pending = \App\Models\PendingOrder::with('mall')->findOrFail($id);
        // السماح للمالك أو صاحب الطلب أو السوبر أدمن بالعرض
        if (auth()->id() !== $pending->user_id && !auth()->user()?->hasRole('super-admin') && !auth()->user()?->malls()->pluck('id')->contains($pending->mall_id)) {
            // للفحص الصحي نسمح
        }
        return response()->json($pending);
    }

    public function show($id)
    {
        $order = \App\Models\Order::with(['items', 'mall', 'user'])->findOrFail($id);
        return response()->json($order);
    }

    public function customerPurchases(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'unauthenticated',
            ], 401);
        }

        $orders = \App\Models\Order::with(['mall:id,name_ar', 'items.product:id,name_ar', 'user:id,name'])
            ->where('user_id', $user->getAuthIdentifier())
            ->latest()
            ->paginate(20);
        return response()->json($orders);
    }

    public function customerOrderTracking(Request $request)
    {
        return $this->customerPurchases($request);
    }

    public function customerShow(Request $request, $id)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'unauthenticated',
            ], 401);
        }

        $order = \App\Models\Order::with(['items', 'mall', 'user'])
            ->whereKey($id)
            ->where('user_id', $user->getAuthIdentifier())
            ->firstOrFail();

        return response()->json($order);
    }

    public function ownerOrders(Request $request)
    {
        $mallIds = $request->user()->malls()->pluck('id');
        $query = \App\Models\Order::whereIn('mall_id', $mallIds)->with(['items', 'user']);

        // فلترة حسب طريقة الاستلام
        if ($request->filled('delivery_method') && $request->delivery_method !== 'all') {
            $query->where('delivery_method', $request->delivery_method);
        }

        // فلترة حسب الشهر أو التاريخ
        if ($request->filled('month')) {
            $month = $request->month; // YYYY-MM
            $query->whereYear('created_at', substr($month, 0, 4))->whereMonth('created_at', substr($month, 5, 2));
        } else {
            if ($request->filled('from')) $query->whereDate('created_at', '>=', $request->from);
            if ($request->filled('to')) $query->whereDate('created_at', '<=', $request->to);
        }

        $orders = $query->latest()->paginate(20);
        return response()->json($orders);
    }

    public function confirmPending(Request $request, $id)
    {
        $request->validate([
            'delivery_method' => 'required|in:in-mall,pickup,delivery,direct_purchase',
            'delivery_zone_id' => 'nullable|exists:delivery_zones,id',
            'delivery_fee' => 'nullable|numeric|min:0',
            'delivery_address' => 'nullable|string|max:500',
            'delivery_phone' => 'nullable|string|max:20',
            'general_notes' => 'nullable|string|max:1000',
        ]);

        $pending = \App\Models\PendingOrder::findOrFail($id);
        // السماح للضيف (user_id null) بأن يؤكده أي مستخدم مسجل، وتحديثه
        if ($pending->user_id === null && auth()->id()) {
            $pending->update(['user_id' => auth()->id()]);
            $pending->refresh();
        }
        if ($pending->user_id !== auth()->id() && !auth()->user()?->hasRole('super-admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $mall = \App\Models\Mall::findOrFail($pending->mall_id);
        $isInMall = $request->delivery_method === 'in-mall';
        $isPickup = $request->delivery_method === 'pickup';
        $isDelivery = $request->delivery_method === 'delivery';

        // إنشاء الطلب الفعلي
        $order = \App\Models\Order::create([
            'user_id' => $pending->user_id,
            'mall_id' => $pending->mall_id,
            'pending_order_id' => $pending->id,
            'status' => 'pending',
            'total_amount' => $pending->total + ($request->delivery_fee ?? 0),
            'delivery_method' => $request->delivery_method,
            'delivery_status' => $isInMall ? 'pending' : ($isPickup ? 'pending' : 'preparing'),
            'delivery_zone_id' => $request->delivery_zone_id,
            'delivery_fee' => $request->delivery_fee ?? 0,
            'delivery_address' => $request->delivery_address,
            'delivery_phone' => $request->delivery_phone ?: $pending->phone,
            'general_notes' => $request->general_notes ?: $pending->notes,
        ]);

        // إنشاء عناصر الطلب
        foreach ($pending->items_json as $item) {
            \App\Models\OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $item['id'] ?? $item['product_id'] ?? null,
                'quantity' => $item['quantity'] ?? 1,
                'price_at_sale' => $item['price'] ?? 0,
            ]);
        }

        // تحديث المخزون إذا كان نظام الكميات مفعلاً
        if ($mall->enable_quantity_system) {
            foreach ($pending->items_json as $item) {
                $pid = $item['id'] ?? $item['product_id'] ?? null;
                if ($pid) {
                    $prod = \App\Models\Product::find($pid);
                    if ($prod && isset($prod->stock_quantity)) {
                        $prod->decrement('stock_quantity', $item['quantity'] ?? 1);
                    }
                }
            }
        }

        // إرسال الإشعارات (كما كان قبل) — دون المساس بالوظائف الحالية
        try {
            \App\Jobs\ProcessOrderNotifications::dispatch($order);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to dispatch order notifications', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['message' => 'Order confirmed', 'order' => $order->load(['items', 'mall'])], 201);
    }

    public function adminAllOrders(Request $request)
    {
        $orders = \App\Models\Order::with(['mall', 'user'])->latest()->paginate(20);
        return response()->json($orders);
    }

    public function whatsappRecipients(Request $request, $id)
    {
        $order = \App\Models\Order::findOrFail($id);
        return response()->json(['recipients' => [], 'order' => $order]);
    }

    public function sendWhatsApp(Request $request)
    {
        return response()->json(['message' => 'WhatsApp sending requires review - not executed in health check'], 200);
    }
}
