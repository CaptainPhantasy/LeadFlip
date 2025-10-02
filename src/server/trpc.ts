/**
 * tRPC Configuration
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@clerk/nextjs/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

/**
 * Create context for each request
 */
export async function createTRPCContext(opts?: FetchCreateContextFnOptions) {
  const session = await auth();

  return {
    userId: session?.userId ?? null,
    sessionId: session?.sessionId ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

/**
 * Admin-only procedure - requires god-level or database admin role
 */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { isAdmin } = await import('@/lib/auth/admin');

  const hasAdminAccess = await isAdmin(ctx.userId);

  if (!hasAdminAccess) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      isAdmin: true,
    },
  });
});
