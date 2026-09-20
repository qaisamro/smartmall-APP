<?php

namespace App\Services;

use App\Models\FcmToken;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Notifications\Notification as LaravelNotification;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

class FcmNotificationService
{
    protected $messaging = null;
    protected bool $enabled;

    public function __construct()
    {
        $this->enabled = (bool) config('services.firebase.project_id');

        if (!$this->enabled) {
            Log::warning('Firebase project_id missing — FCM notifications disabled');
            return;
        }

        try {
            $credentials = config('services.firebase.credentials');
            $factory = (new Factory())->withServiceAccount($credentials);
            $this->messaging = $factory->createMessaging();
        } catch (\Throwable $e) {
            Log::error('Firebase init failed', ['error' => $e->getMessage()]);
            $this->messaging = null;
        }
    }

    public function sendToUser(int $userId, string $title, string $body, string $url = '/', array $data = []): array
    {
        if (!$this->messaging || !$this->enabled) {
            return ['success' => false, 'failed' => 0, 'total' => 0, 'errors' => ['FCM disabled']];
        }

        $tokens = FcmToken::active()->forUser($userId)->where('platform', 'android')->get();
        if ($tokens->isEmpty()) {
            return ['success' => true, 'failed' => 0, 'total' => 0, 'errors' => []];
        }

        $payload = array_merge(['url' => $url], $data);
        $success = 0; $failed = 0; $errors = []; $invalidTokens = [];

        foreach ($tokens as $tokenModel) {
            try {
                $message = CloudMessage::create()->withToken($tokenModel->token)->withNotification(Notification::create($title, $body))->withData($payload);
                $this->messaging->send($message);
                $success++;
                $tokenModel->update(['last_used_at' => now()]);
            } catch (\Kreait\Firebase\Exception\MessagingException $e) {
                $failed++; $errors[] = ['error' => $e->getMessage()];
                if ($this->isInvalidToken($e)) $invalidTokens[] = $tokenModel->token;
            } catch (\Throwable $e) {
                $failed++; $errors[] = ['error' => $e->getMessage()];
            }
        }

        if (!empty($invalidTokens)) FcmToken::whereIn('token', $invalidTokens)->delete();
        return ['success' => $success > 0, 'failed' => $failed, 'total' => $tokens->count(), 'errors' => $errors];
    }

    /**
     * Send a Laravel notification to Android FCM targets.
     *
     * The boolean return value means an Android FCM target existed and was
     * attempted. WebPushChannel uses it for the conditional delivery policy:
     * one event is sent to FCM or Web Push, never both.
     */
    public function sendForNotification(User $user, LaravelNotification $notification): bool
    {
        if (!$this->messaging || !$this->enabled) {
            return false;
        }

        $hasTarget = FcmToken::active()
            ->where('user_id', $user->id)
            ->where('platform', 'android')
            ->exists();

        if (!$hasTarget) {
            return false;
        }

        $push = method_exists($notification, 'toWebPush')
            ? $notification->toWebPush($user)
            : [];
        $rawData = method_exists($notification, 'toArray')
            ? $notification->toArray($user)
            : [];
        $data = [];

        foreach ($rawData as $key => $value) {
            if ($value === null) {
                continue;
            }
            $data[(string) $key] = is_scalar($value)
                ? (string) $value
                : (string) json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        $this->sendToUser(
            $user->id,
            (string) ($push['title'] ?? ''),
            (string) ($push['body'] ?? ''),
            (string) ($push['url'] ?? '/notifications'),
            $data,
        );

        return true;
    }

    public function sendToUsers(array $userIds, string $title, string $body, string $url = '/', array $data = []): array
    {
        if (!$this->messaging || !$this->enabled) return ['success' => false, 'failed' => 0, 'total' => 0, 'errors' => ['FCM disabled']];
        $tokens = FcmToken::active()->whereIn('user_id', $userIds)->where('platform', 'android')->get();
        if ($tokens->isEmpty()) return ['success' => true, 'failed' => 0, 'total' => 0, 'errors' => []];
        $payload = array_merge(['url' => $url], $data);
        $success = 0; $failed = 0; $errors = []; $invalidTokens = [];
        foreach ($tokens as $tokenModel) {
            try {
                $message = CloudMessage::create()->withToken($tokenModel->token)->withNotification(Notification::create($title, $body))->withData($payload);
                $this->messaging->send($message); $success++; $tokenModel->update(['last_used_at' => now()]);
            } catch (\Kreait\Firebase\Exception\MessagingException $e) { $failed++; $errors[] = ['error' => $e->getMessage()]; if ($this->isInvalidToken($e)) $invalidTokens[] = $tokenModel->token; } catch (\Throwable $e) { $failed++; $errors[] = ['error' => $e->getMessage()]; }
        }
        if (!empty($invalidTokens)) FcmToken::whereIn('token', $invalidTokens)->delete();
        return ['success' => $success > 0, 'failed' => $failed, 'total' => $tokens->count(), 'errors' => $errors];
    }

    public function sendToAll(string $title, string $body, string $url = '/', array $data = []): array
    {
        if (!$this->messaging || !$this->enabled) return ['success' => false, 'failed' => 0, 'total' => 0, 'errors' => ['FCM disabled']];
        $tokens = FcmToken::active()->where('platform', 'android')->get();
        if ($tokens->isEmpty()) return ['success' => true, 'failed' => 0, 'total' => 0, 'errors' => []];
        $payload = array_merge(['url' => $url], $data);
        $success = 0; $failed = 0; $errors = []; $invalidTokens = [];
        foreach ($tokens as $tokenModel) {
            try {
                $message = CloudMessage::create()->withToken($tokenModel->token)->withNotification(Notification::create($title, $body))->withData($payload);
                $this->messaging->send($message); $success++; $tokenModel->update(['last_used_at' => now()]);
            } catch (\Kreait\Firebase\Exception\MessagingException $e) { $failed++; $errors[] = ['error' => $e->getMessage()]; if ($this->isInvalidToken($e)) $invalidTokens[] = $tokenModel->token; } catch (\Throwable $e) { $failed++; $errors[] = ['error' => $e->getMessage()]; }
        }
        if (!empty($invalidTokens)) FcmToken::whereIn('token', $invalidTokens)->delete();
        return ['success' => $success > 0, 'failed' => $failed, 'total' => $tokens->count(), 'errors' => $errors];
    }

    protected function isInvalidToken(\Kreait\Firebase\Exception\MessagingException $e): bool
    {
        $code = $e->getCode();
        $message = strtolower($e->getMessage());
        $invalidCodes = ['invalid-argument', 'registration-token-not-registered', 'invalid-registration-token'];
        foreach ($invalidCodes as $c) {
            if (str_contains($message, $c) || $code === $c) return true;
        }
        return false;
    }
}
