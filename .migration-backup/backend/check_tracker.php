<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$u = App\Models\User::where('email','tracker.test@gmail.com')->first();
if (!$u) { echo "NOT FOUND\n"; exit; }
echo json_encode(['id'=>$u->id,'email'=>$u->email,'roles'=>$u->getRoleNames()->toArray(),'is_active'=>$u->is_active]) . "\n";
$notifs = Illuminate\Support\Facades\DB::table('notifications')->where('notifiable_id',$u->id)->orderByDesc('created_at')->limit(5)->get();
echo "NOTIFS: " . $notifs->count() . "\n";
foreach ($notifs as $n) {
    echo $n->id . " | " . $n->type . " | " . substr($n->data,0,80) . "\n";
}
$subs = App\Models\PushSubscription::where('user_id',$u->id)->count();
echo "PushSubs: $subs\n";
