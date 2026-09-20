<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class WhatsAppVerificationService
{
    public const REGISTER = 'register';
    public const RESET = 'reset';

    public function __construct(
        private readonly WhatsAppService $whatsapp,
    ) {
    }

    /**
     * Issue a short-lived code without ever returning the code to the caller.
     *
     * The code is delivered by the server-side WhatsApp integration. The
     * opaque challenge id is safe to pass through the mobile app.
     */
    public function issue(string $phone, string $purpose, ?string $name = null): array
    {
        $active = DB::table('whatsapp_verifications')
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('verified_at')
            ->whereNull('consumed_at')
            ->latest('created_at')
            ->first();

        if ($active && now()->diffInSeconds($active->created_at) < 60) {
            throw new HttpException(429, 'تم إرسال رمز التحقق مؤخراً. يرجى الانتظار قبل طلب رمز جديد.');
        }

        $code = (string) random_int(100000, 999999);
        $challengeId = (string) Str::uuid();
        $expiresAt = now()->addMinutes(10);

        DB::table('whatsapp_verifications')->insert([
            'id' => $challengeId,
            'purpose' => $purpose,
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $label = $purpose === self::REGISTER
            ? 'تأكيد إنشاء حساب SmartMall'
            : 'إعادة تعيين كلمة مرور SmartMall';
        $nameLine = $purpose === self::REGISTER && $name ? "\nالاسم: {$name}" : '';
        $sent = $this->whatsapp->sendMessage(
            $phone,
            "{$label}\nرمز التحقق: {$code}\nصالح لمدة 10 دقائق.{$nameLine}"
        );

        if (!$sent) {
            DB::table('whatsapp_verifications')->where('id', $challengeId)->delete();
            throw new HttpException(503, 'تعذر إرسال رمز التحقق حالياً. يرجى المحاولة مرة أخرى.');
        }

        return [
            'verification_id' => $challengeId,
            'expires_in' => 600,
        ];
    }

    public function verify(string $phone, string $purpose, string $challengeId, string $code): string
    {
        return DB::transaction(function () use ($phone, $purpose, $challengeId, $code): string {
            $record = DB::table('whatsapp_verifications')
                ->where('id', $challengeId)
                ->where('phone', $phone)
                ->where('purpose', $purpose)
                ->lockForUpdate()
                ->first();

            if (!$record || $record->consumed_at || $record->verified_at) {
                throw new HttpException(400, 'رمز التحقق غير صالح أو منتهي الصلاحية.');
            }

            if (now()->greaterThan($record->expires_at)) {
                DB::table('whatsapp_verifications')->where('id', $challengeId)->delete();
                throw new HttpException(400, 'انتهت صلاحية رمز التحقق.');
            }

            if ($record->attempts >= 5) {
                DB::table('whatsapp_verifications')->where('id', $challengeId)->delete();
                throw new HttpException(400, 'تم تجاوز عدد محاولات التحقق المسموح بها.');
            }

            if (!Hash::check($code, $record->code_hash)) {
                $attempts = $record->attempts + 1;
                if ($attempts >= 5) {
                    DB::table('whatsapp_verifications')->where('id', $challengeId)->delete();
                } else {
                    DB::table('whatsapp_verifications')
                        ->where('id', $challengeId)
                        ->update(['attempts' => $attempts, 'updated_at' => now()]);
                }

                throw new HttpException(400, 'رمز التحقق غير صالح أو منتهي الصلاحية.');
            }

            $verificationToken = Str::random(64);
            DB::table('whatsapp_verifications')
                ->where('id', $challengeId)
                ->update([
                    'verified_token_hash' => Hash::make($verificationToken),
                    'verified_at' => now(),
                    'updated_at' => now(),
                ]);

            return $verificationToken;
        });
    }

    /**
     * Consume a verified proof atomically. The same proof cannot be reused.
     */
    public function consume(string $phone, string $purpose, string $verificationToken): bool
    {
        return DB::transaction(function () use ($phone, $purpose, $verificationToken): bool {
            $records = DB::table('whatsapp_verifications')
                ->where('phone', $phone)
                ->where('purpose', $purpose)
                ->whereNotNull('verified_at')
                ->whereNull('consumed_at')
                ->latest('verified_at')
                ->lockForUpdate()
                ->get();

            foreach ($records as $record) {
                if (now()->greaterThan($record->expires_at)) {
                    DB::table('whatsapp_verifications')->where('id', $record->id)->delete();
                    continue;
                }

                if (Hash::check($verificationToken, $record->verified_token_hash)) {
                    DB::table('whatsapp_verifications')
                        ->where('id', $record->id)
                        ->update(['consumed_at' => now(), 'updated_at' => now()]);

                    return true;
                }
            }

            return false;
        });
    }
}