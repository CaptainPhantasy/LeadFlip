/**
 * tRPC Client Configuration
 * Used for client-side API calls in React components
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
