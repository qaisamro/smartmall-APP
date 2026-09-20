<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Find a product with a section and mall with quantity disabled
$product = App\Models\Product::with(['section', 'category', 'mall'])
    ->whereHas('section')
    ->whereHas('mall')
    ->first();

if (!$product) {
    echo "No product with section found\n";
    exit;
}

echo "Product: {$product->id}\n";
echo "Name: {$product->name_ar}\n";
echo "Section: " . ($product->section?->name_ar ?? 'NULL') . "\n";
echo "Category: " . ($product->category?->name_ar ?? 'NULL') . "\n";
echo "Mall: {$product->mall?->name_ar}\n";
echo "Mall quantity system: " . ($product->mall?->enable_quantity_system ? 'ON' : 'OFF') . "\n";
echo "hide_stock: " . ($product->hide_stock_from_customer ? 'YES' : 'NO') . "\n";
echo "stock_quantity: " . ($product->stock_quantity ?? 'NULL') . "\n";