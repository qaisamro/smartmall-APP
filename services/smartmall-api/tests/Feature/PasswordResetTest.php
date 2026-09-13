<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_server_issued_whatsapp_proof_can_reset_a_password_once(): void
    {
        Config::set([
            'services.ultramsg.instance_id' => 'test-instance',
            'services.ultramsg.token' => 'test-token',
        ]);
        Http::fake([
            'https://api.ultramsg.com/*' => Http::response(['sent' => true], 200),
        ]);

        $user = User::factory()->create([
            'email' => null,
            'phone' => '+972501234567',
            'password' => Hash::make('old-password'),
        ]);

        $challenge = $this->postJson('/api/v1/whatsapp/reset/request', [
            'phone' => ' +972 50 123 4567 ',
        ])->assertCreated()->json();

        preg_match('/\b(\d{6})\b/', Http::recorded()[0][0]->data()['body'], $matches);
        $code = $matches[1] ?? '';

        $proof = $this->postJson('/api/v1/whatsapp/reset/verify', [
            'phone' => $user->phone,
            'verification_id' => $challenge['verification_id'],
            'code' => $code,
        ])->assertOk()->json('verification_token');

        $this->postJson('/api/v1/reset-password', [
            'phone' => $user->phone,
            'verification_token' => $proof,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));

        $this->postJson('/api/v1/reset-password', [
            'phone' => $user->phone,
            'verification_token' => $proof,
            'password' => 'another-password',
            'password_confirmation' => 'another-password',
        ])->assertStatus(400);
    }

    public function test_registration_requires_a_verified_server_whatsapp_proof(): void
    {
        Role::create(['name' => 'customer']);

        Config::set([
            'services.ultramsg.instance_id' => 'test-instance',
            'services.ultramsg.token' => 'test-token',
        ]);
        Http::fake([
            'https://api.ultramsg.com/*' => Http::response(['sent' => true], 200),
        ]);

        $payload = [
            'name' => 'New Customer',
            'phone' => '+972501234567',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
            'role' => 'customer',
        ];

        $this->postJson('/api/v1/register', $payload)->assertStatus(422);

        $challenge = $this->postJson('/api/v1/whatsapp/register/request', [
            'name' => $payload['name'],
            'phone' => $payload['phone'],
        ])->assertCreated()->json();

        preg_match('/\b(\d{6})\b/', Http::recorded()[0][0]->data()['body'], $matches);
        $code = $matches[1] ?? '';

        $proof = $this->postJson('/api/v1/whatsapp/register/verify', [
            'phone' => $payload['phone'],
            'verification_id' => $challenge['verification_id'],
            'code' => $code,
        ])->assertOk()->json('verification_token');

        $this->postJson('/api/v1/register', [
            ...$payload,
            'whatsapp_verification_token' => $proof,
        ])->assertOk();

        $this->assertDatabaseHas('users', ['phone' => $payload['phone']]);
    }

    public function test_customer_can_request_and_use_a_phone_otp(): void
    {
        Config::set([
            'services.ultramsg.instance_id' => 'test-instance',
            'services.ultramsg.token' => 'test-token',
        ]);
        Http::fake([
            'https://api.ultramsg.com/*' => Http::response(['sent' => true], 200),
        ]);

        $user = User::factory()->create([
            'email' => null,
            'phone' => '+972501234567',
            'password' => Hash::make('old-password'),
        ]);

        $request = $this->postJson('/api/v1/forgot-password', [
            'phone' => ' +972 50 123 4567 ',
        ]);

        $request->assertOk()
            ->assertJson(['message' => 'تم إرسال رمز التحقق إلى الهاتف.']);
        Http::assertSent(fn ($sent) => $sent->url() === 'https://api.ultramsg.com/test-instance/messages/chat'
            && $sent->data()['to'] === '+972501234567'
            && preg_match('/\b\d{6}\b/', $sent->data()['body']) === 1);

        $code = preg_match('/\b(\d{6})\b/', Http::recorded()[0][0]->data()['body'], $matches)
            ? $matches[1]
            : '';

        $reset = $this->postJson('/api/v1/reset-password', [
            'phone' => '+972501234567',
            'token' => $code,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $reset->assertOk()
            ->assertJson(['message' => 'تم تغيير كلمة المرور بنجاح']);
        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));
        $this->assertDatabaseMissing('password_reset_otps', ['phone' => '+972501234567']);
    }

    public function test_email_password_reset_remains_supported(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
            'phone' => null,
        ]);

        $this->postJson('/api/v1/forgot-password', [
            'email' => $user->email,
        ])->assertOk();

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_phone_reset_rejects_a_code_after_five_failed_attempts(): void
    {
        Config::set([
            'services.ultramsg.instance_id' => 'test-instance',
            'services.ultramsg.token' => 'test-token',
        ]);
        Http::fake([
            'https://api.ultramsg.com/*' => Http::response(['sent' => true], 200),
        ]);

        User::factory()->create([
            'email' => null,
            'phone' => '+972501234567',
        ]);

        $this->postJson('/api/v1/forgot-password', ['phone' => '+972501234567'])
            ->assertOk();

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/v1/reset-password', [
                'phone' => '+972501234567',
                'token' => '000000',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])->assertStatus(400);
        }

        $this->assertDatabaseMissing('password_reset_otps', ['phone' => '+972501234567']);
    }
}