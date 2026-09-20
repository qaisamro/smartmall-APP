<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\RequestIdMiddleware::class);
        // Laravel's API group is stateless by default. Keep it free of the
        // session/CSRF middleware and normalize API requests to JSON.
        $middleware->api(prepend: [
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);
        $middleware->alias([
            'role'       => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'mall.theme' => \App\Http\Middleware\ApplyMallTheme::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            $isApiRequest = $request->is('api/*') || $request->expectsJson();

            if (! $isApiRequest) {
                return null;
            }

            if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'code' => 'unauthenticated',
                ], 401);
            }

            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'code' => 'validation_failed',
                    'errors' => $e->errors(),
                ], 422);
            }

            if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                return response()->json([
                    'message' => 'Resource not found.',
                    'code' => 'resource_not_found',
                ], 404);
            }

            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                $status = $e->getStatusCode();

                return response()->json([
                    'message' => $e->getMessage() ?: (\Symfony\Component\HttpFoundation\Response::$statusTexts[$status] ?? 'HTTP error.'),
                    'code' => $status === 404 ? 'not_found' : 'http_error',
                ], $status, $e->getHeaders());
            }

            return response()->json([
                'message' => 'Internal Server Error.',
                'code' => 'internal_server_error',
                'request_id' => $request->attributes->get('request_id'),
            ], 500);
        });
        $exceptions->report(function (\Throwable $e) {
            try {
                if ($e instanceof \Illuminate\Auth\AuthenticationException) return;
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    // سجل أخطاء التحقق كـ warning في سجل الصحة (مفيد لتعديل المنشأة)
                    try {
                        \App\Services\ErrorMonitoringService::report([
                            'type' => 'validation.' . ($e->validator->fails() ? array_key_first($e->validator->failed() ?? []) : 'unknown'),
                            'severity' => 'warning',
                            'source' => 'backend',
                            'message' => 'فشل التحقق: ' . implode(', ', array_map(fn($msgs) => implode(', ', (array)$msgs), $e->errors())),
                            'file' => $e->getFile(),
                            'line' => $e->getLine(),
                            'status_code' => 422,
                            'request_id' => request()->attributes->get('request_id'),
                            'stack_trace' => substr($e->getTraceAsString(), 0, 2000),
                        ]);
                    } catch (\Throwable $inner2) {}
                    return;
                }
                $severity = $e instanceof \Symfony\Component\HttpKernel\Exception\HttpException && $e->getStatusCode() < 500 ? 'warning' : 'error';
                if ($e->getCode() >= 500 || str_contains($e->getMessage(), 'CRITICAL')) $severity = 'critical';
                \App\Services\ErrorMonitoringService::reportThrowable($e, $severity);
            } catch (\Throwable $inner) {
                // لا نكسر سلسلة التقارير
            }
        });
    })->create();
