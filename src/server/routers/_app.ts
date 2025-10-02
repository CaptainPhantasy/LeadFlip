/**
 * Main tRPC Router - combines all sub-routers
 */

import { createTRPCRouter } from '../trpc';
import { leadRouter } from './lead';
import { businessRouter } from './business';
import { adminRouter } from './admin';
import { callRouter } from './call';
import { interviewRouter } from './interview';
import { discoveryRouter } from './discovery';

export const appRouter = createTRPCRouter({
  lead: leadRouter,
  business: businessRouter,
  admin: adminRouter,
  calls: callRouter,
  interview: interviewRouter,
  discovery: discoveryRouter,
});

export type AppRouter = typeof appRouter;
