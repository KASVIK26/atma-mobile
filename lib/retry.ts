/**
 * Exponential backoff retry helper
 *
 * Retries an async function up to `maxAttempts` times using exponential back-off
 * with optional jitter, so transient network blips during peak hours (1 000+
 * concurrent students) don't generate a flood of simultaneous retries.
 *
 * Usage:
 *   const data = await withRetry(() => supabase.from('users').select('*'), {
 *     maxAttempts: 3,
 *     baseDelayMs: 300,
 *   });
 */

export interface RetryOptions {
  /** Maximum number of attempts (default 3) */
  maxAttempts?: number;
  /** Base delay in ms before first retry; doubles each attempt (default 300) */
  baseDelayMs?: number;
  /** Cap on the computed delay in ms (default 5 000) */
  maxDelayMs?: number;
  /** Add random jitter up to ±(delayMs * jitterFactor) (default 0.2) */
  jitterFactor?: number;
  /** Optional predicate — if it returns false, the error is not retried */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Called before each retry with the current attempt number (1-based) */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 300,
    maxDelayMs = 5_000,
    jitterFactor = 0.2,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Exponential back-off: baseDelay * 2^(attempt-1)
      const exponential = baseDelayMs * Math.pow(2, attempt - 1);
      const capped = Math.min(exponential, maxDelayMs);
      // Add ±jitter to spread retries across concurrent users
      const jitter = capped * jitterFactor * (Math.random() * 2 - 1);
      const delayMs = Math.max(0, Math.round(capped + jitter));

      onRetry?.(error, attempt, delayMs);
      console.warn(
        `[withRetry] Attempt ${attempt} failed — retrying in ${delayMs}ms`,
        error instanceof Error ? error.message : error
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Convenience wrapper that should NOT retry for certain Supabase error codes
 * (e.g. RLS policy violations, type errors) which will never succeed on retry.
 */
export const SUPABASE_NON_RETRYABLE_CODES = new Set([
  '42501', // RLS policy violation
  'PGRST116', // No rows returned (not an error)
  '23505', // Unique violation
  '23503', // Foreign key violation
  '22P02', // Invalid text representation
  'P0001', // Raise exception from PL/pgSQL
]);

export function withSupabaseRetry<T>(
  fn: () => Promise<T>,
  options?: Omit<RetryOptions, 'shouldRetry'>
): Promise<T> {
  return withRetry(fn, {
    ...options,
    shouldRetry: (error: unknown) => {
      const code = (error as any)?.code as string | undefined;
      if (code && SUPABASE_NON_RETRYABLE_CODES.has(code)) return false;
      // Don't retry auth errors
      const status = (error as any)?.status as number | undefined;
      if (status && status >= 400 && status < 500) return false;
      return true;
    },
  });
}
