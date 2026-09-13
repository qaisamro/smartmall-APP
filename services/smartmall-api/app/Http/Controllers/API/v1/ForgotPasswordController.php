<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\PasswordResetNotification;
use App\Services\WhatsAppService;
use App\Services\WhatsAppVerificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ForgotPasswordController extends Controller
{
    public function requestWhatsAppCode(Request $request, WhatsAppVerificationService $whatsappVerification)
    {
        $request->merge(['phone' => $this->normalizePhone($request->input('phone'))]);
        $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{7,20}$/'],
        ]);

        if (!User::where('phone', $request->input('phone'))->exists()) {
            return response()->json([
                'message' => 'إذا كان الحساب موجوداً، فسيتم إرسال رمز التحقق إلى الهاتف.',
            ]);
        }

        return response()->json(
            $whatsappVerification->issue(
                $request->input('phone'),
                WhatsAppVerificationService::RESET
            ),
            201
        );
    }

    public function verifyWhatsAppCode(Request $request, WhatsAppVerificationService $whatsappVerification)
    {
        $request->merge(['phone' => $this->normalizePhone($request->input('phone'))]);
        $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{7,20}$/'],
            'verification_id' => 'required|uuid',
            'code' => ['required', 'digits:6'],
        ]);

        return response()->json([
            'verification_token' => $whatsappVerification->verify(
                $request->input('phone'),
                WhatsAppVerificationService::RESET,
                $request->input('verification_id'),
                $request->input('code')
            ),
        ]);
    }

    public function sendResetLink(Request $request, WhatsAppService $whatsapp)
    {
        $request->merge([
            'phone' => $this->normalizePhone($request->input('phone')),
        ]);

        $request->validate([
            'email' => 'nullable|email|exists:users,email|required_without:phone',
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,20}$/', 'required_without:email'],
        ]);

        if ($request->filled('phone')) {
            return $this->sendPhoneCode($request->input('phone'), $whatsapp);
        }

        $user = User::where('email', $request->email)->first();
        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $user->notify(new PasswordResetNotification($token, $user->email));

        return response()->json(['message' => 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني']);
    }

    public function reset(Request $request)
    {
        $request->merge([
            'phone' => $this->normalizePhone($request->input('phone')),
        ]);

        $request->validate([
            'email' => 'nullable|email|exists:users,email|required_without:phone',
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,20}$/', 'required_without:email'],
            'token' => 'nullable|string',
            'verification_token' => 'nullable|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($request->filled('phone')) {
            if ($request->filled('verification_token')) {
                return $this->resetWithVerifiedPhone(
                    $request->input('phone'),
                    $request->input('verification_token'),
                    $request->input('password')
                );
            }

            if (!$request->filled('token')) {
                return response()->json(['message' => 'رمز التحقق مطلوب.'], 422);
            }

            return $this->resetWithPhoneCode(
                $request->input('phone'),
                $request->input('token'),
                $request->input('password')
            );
        }

        if (!$request->filled('token')) {
            return response()->json(['message' => 'رمز إعادة التعيين مطلوب.'], 422);
        }

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية'], 400);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'انتهت صلاحية رابط إعادة التعيين'], 400);
        }

        $user = User::where('email', $request->email)->first();
        $user->update(['password' => Hash::make($request->password)]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح']);
    }

    private function resetWithVerifiedPhone(string $phone, string $verificationToken, string $password)
    {
        $verification = app(WhatsAppVerificationService::class);
        $user = User::where('phone', $phone)->first();

        if (!$user || !$verification->consume($phone, WhatsAppVerificationService::RESET, $verificationToken)) {
            return response()->json(['message' => 'رمز التحقق غير صالح أو منتهي الصلاحية'], 400);
        }

        $user->update(['password' => Hash::make($password)]);

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح']);
    }

    private function sendPhoneCode(string $phone, WhatsAppService $whatsapp)
    {
        $user = User::where('phone', $phone)->first();

        // Do not disclose whether a phone number is registered.
        if (!$user) {
            return response()->json([
                'message' => 'إذا كان الحساب موجوداً، فسيتم إرسال رمز التحقق إلى الهاتف.',
            ]);
        }

        $existing = DB::table('password_reset_otps')->where('phone', $phone)->first();
        if ($existing && now()->diffInSeconds($existing->created_at) < 60) {
            return response()->json([
                'message' => 'تم إرسال رمز التحقق مؤخراً. يرجى الانتظار قبل طلب رمز جديد.',
            ], 429);
        }

        $code = (string) random_int(100000, 999999);

        DB::table('password_reset_otps')->updateOrInsert(
            ['phone' => $phone],
            [
                'token' => Hash::make($code),
                'attempts' => 0,
                'created_at' => now(),
            ]
        );

        $sent = $whatsapp->sendMessage(
            $phone,
            "رمز إعادة تعيين كلمة المرور في SmartMall هو: {$code}\nصالح لمدة 10 دقائق."
        );

        if (!$sent) {
            DB::table('password_reset_otps')->where('phone', $phone)->delete();

            return response()->json([
                'message' => 'تعذر إرسال رمز التحقق حالياً. يرجى المحاولة مرة أخرى.',
            ], 503);
        }

        return response()->json([
            'message' => 'تم إرسال رمز التحقق إلى الهاتف.',
        ]);
    }

    private function resetWithPhoneCode(string $phone, string $code, string $password)
    {
        $record = DB::table('password_reset_otps')->where('phone', $phone)->first();

        if (!$record) {
            return response()->json(['message' => 'رمز التحقق غير صالح أو منتهي الصلاحية'], 400);
        }

        if (now()->diffInMinutes($record->created_at) > 10) {
            DB::table('password_reset_otps')->where('phone', $phone)->delete();

            return response()->json(['message' => 'انتهت صلاحية رمز التحقق'], 400);
        }

        if ($record->attempts >= 5 || !Hash::check($code, $record->token)) {
            $attempts = $record->attempts + 1;
            if ($attempts >= 5) {
                DB::table('password_reset_otps')->where('phone', $phone)->delete();
            } else {
                DB::table('password_reset_otps')
                    ->where('phone', $phone)
                    ->update(['attempts' => $attempts]);
            }

            return response()->json(['message' => 'رمز التحقق غير صالح أو منتهي الصلاحية'], 400);
        }

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            DB::table('password_reset_otps')->where('phone', $phone)->delete();

            return response()->json(['message' => 'رمز التحقق غير صالح أو منتهي الصلاحية'], 400);
        }

        $user->update(['password' => Hash::make($password)]);
        DB::table('password_reset_otps')->where('phone', $phone)->delete();

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح']);
    }

    private function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $phone = trim($phone);
        if ($phone === '') {
            return null;
        }

        return preg_replace('/[\s().-]+/', '', $phone);
    }
}
