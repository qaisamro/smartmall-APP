<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ApiRoutingTest extends TestCase
{
    public function test_api_routes_are_registered_with_the_api_prefix_and_middleware(): void
    {
        $route = collect(Route::getRoutes()->getRoutes())
            ->first(fn ($candidate) => $candidate->uri() === 'api/v1/malls');

        $this->assertNotNull($route);
        $this->assertContains('api', $route->middleware());
    }

    public function test_unknown_api_routes_return_json_without_relying_on_the_client_header(): void
    {
        $response = $this->get('/api/v1/route-that-does-not-exist');

        $response
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJson([
                'code' => 'not_found',
            ]);
    }

    public function test_api_internal_errors_return_generic_json_with_a_request_id(): void
    {
        Route::middleware('api')->get('/api/v1/test-internal-error', function () {
            throw new \RuntimeException('test-only internal failure');
        });

        $response = $this->get('/api/v1/test-internal-error');

        $response
            ->assertStatus(500)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJson([
                'message' => 'Internal Server Error.',
                'code' => 'internal_server_error',
            ]);

        $this->assertNotEmpty($response->json('request_id'));
    }
}