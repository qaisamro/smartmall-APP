<?php

namespace App\Channels;

use App\Services\FcmNotificationService;
use Illuminate\Notifications\Notification;

/**
 * Option B router for mobile/web push.
 *
 * WebPushChannel and PushNotificationService remain unchanged. An active,
 * configured Android FCM target receives the event; otherwise the original
 * Web Push channel handles it.
 */
class MobileAwarePushChannel
{
    public function send($notifiable, Notification $notification): void
    {
        if (!$notifiable->id) {
            return;
        }

        if (app(FcmNotificationService::class)->sendForNotification($notifiable, $notification)) {
            return;
        }

        app(WebPushChannel::class)->send($notifiable, $notification);
    }
}