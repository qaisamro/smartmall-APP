<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\WhatsAppVerificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request, WhatsAppVerificationService $whatsappVerification)
    {
        $request->merge([
            'phone' => $this->normalizePhone($request->input('phone')),
        ]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users,email|required_without:phone',
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,20}$/', 'unique:users,phone', 'required_without:email'],
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:customer,mall-owner',
            'whatsapp_verification_token' => 'nullable|string',
        ]);

        $user = DB::transaction(function () use ($request, $whatsappVerification) {
            if ($request->filled('phone')) {
                $verified = $request->filled('whatsapp_verification_token')
                    && $whatsappVerification->consume(
                        $request->input('phone'),
                        WhatsAppVerificationService::REGISTER,
                        $request->input('whatsapp_verification_token')
                    );

                if (!$verified) {
                    throw ValidationException::withMessages([
                        'whatsapp_verification_token' => ['يجب تأكيد رقم الهاتف عبر WhatsApp أولاً.'],
                    ]);
                }
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->input('email'),
                'phone' => $request->input('phone'),
                'password' => Hash::make($request->password),
            ]);

            $user->assignRole($request->role);

            return $user;
        });

        return response()->json([
            'access_token' => $user->createToken('auth_token')->plainTextToken,
            'token_type' => 'Bearer',
            'user' => $user->load('roles')
        ]);
    }

    public function requestWhatsAppRegistrationCode(Request $request, WhatsAppVerificationService $whatsappVerification)
    {
        $request->merge(['phone' => $this->normalizePhone($request->input('phone'))]);
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{7,20}$/'],
        ]);

        if (User::where('phone', $request->input('phone'))->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['رقم الهاتف مستخدم بالفعل.'],
            ]);
        }

        return response()->json(
            $whatsappVerification->issue(
                $request->input('phone'),
                WhatsAppVerificationService::REGISTER,
                $request->input('name')
            ),
            201
        );
    }

    public function verifyWhatsAppRegistrationCode(Request $request, WhatsAppVerificationService $whatsappVerification)
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
                WhatsAppVerificationService::REGISTER,
                $request->input('verification_id'),
                $request->input('code')
            ),
        ]);
    }

    public function login(Request $request)
    {
        $request->merge([
            'phone' => $this->normalizePhone($request->input('phone')),
        ]);

        $request->validate([
            'email' => 'nullable|email|required_without:phone',
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,20}$/', 'required_without:email'],
            'password' => 'required',
        ]);

        $identifierField = $request->filled('phone') ? 'phone' : 'email';
        $identifier = $request->input($identifierField);
        $user = User::where($identifierField, $identifier)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                $identifierField => [__('auth.failed')],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('roles', 'mall')
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('roles', 'mall'));
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
