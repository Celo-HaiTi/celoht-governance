# Production Readiness

Status: **NOT PRODUCTION READY** until external infrastructure is configured
and verified.

Required gates include canonical Supabase migrations/RLS, backend auth
integration, verified Celo RPC and deployment manifest, execution verifier,
Safe execution process, idempotency persistence, security tests, and a clean
high-severity dependency audit.

The local gate intentionally returns `BLOCKED` when required runtime values are
absent. This is a safety property, not a deployment success signal.
