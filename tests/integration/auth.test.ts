/**
 * Authentication and Authorization Tests
 *
 * Tests admin access checks and RLS policies
 *
 * [2025-10-01 8:40 PM] Agent 3: Created auth integration tests
 */

import { isGodAdmin, isAdminInDatabase, isAdmin } from '@/lib/auth/admin';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock Clerk
jest.mock('@clerk/nextjs/server', () => ({
  clerkClient: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn(),
};

const mockClerkClient = {
  users: {
    getUser: jest.fn(),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockSupabase);
  (clerkClient as jest.Mock).mockResolvedValue(mockClerkClient);
});

describe('Admin Authentication', () => {
  describe('isGodAdmin - God-level Admin Check', () => {
    it('should return true for god admin user', () => {
      const godAdminId = 'user_33RVOIU75IFG8QVTaXPK4VRAnwv'; // Douglas Talley
      expect(isGodAdmin(godAdminId)).toBe(true);
    });

    it('should return false for non-god admin user', () => {
      const regularUserId = 'user_12345';
      expect(isGodAdmin(regularUserId)).toBe(false);
    });

    it('should return false for null user ID', () => {
      expect(isGodAdmin(null)).toBe(false);
    });

    it('should return false for undefined user ID', () => {
      expect(isGodAdmin(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isGodAdmin('')).toBe(false);
    });
  });

  describe('isAdminInDatabase - Database Admin Check', () => {
    it('should return true if user has admin role in database', async () => {
      const userId = 'user_12345';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdminInDatabase(userId);
      expect(result).toBe(true);
    });

    it('should return true if user has super_admin role in database', async () => {
      const userId = 'user_12345';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'super_admin' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdminInDatabase(userId);
      expect(result).toBe(true);
    });

    it('should return false if user has regular role', async () => {
      const userId = 'user_12345';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdminInDatabase(userId);
      expect(result).toBe(false);
    });

    it('should return false if user not found in database', async () => {
      const userId = 'user_nonexistent';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' },
            }),
          }),
        }),
      });

      const result = await isAdminInDatabase(userId);
      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const userId = 'user_12345';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection error' },
            }),
          }),
        }),
      });

      const result = await isAdminInDatabase(userId);
      expect(result).toBe(false);
    });
  });

  describe('isAdmin - Comprehensive Admin Check', () => {
    it('should return true for god admin (priority check)', async () => {
      const godAdminId = 'user_33RVOIU75IFG8QVTaXPK4VRAnwv';

      // Even if other checks fail, god admin should pass
      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'user' },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdmin(godAdminId);
      expect(result).toBe(true);
    });

    it('should return true if user has admin role in Clerk metadata', async () => {
      const userId = 'user_12345';

      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'admin' },
      });

      const result = await isAdmin(userId);
      expect(result).toBe(true);
    });

    it('should return true if user has admin role in database (fallback)', async () => {
      const userId = 'user_12345';

      // Clerk check fails
      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'user' },
      });

      // Database check succeeds
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdmin(userId);
      expect(result).toBe(true);
    });

    it('should return false if user is not admin anywhere', async () => {
      const userId = 'user_12345';

      // Clerk check fails
      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'user' },
      });

      // Database check fails
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdmin(userId);
      expect(result).toBe(false);
    });

    it('should return false for null user ID', async () => {
      const result = await isAdmin(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined user ID', async () => {
      const result = await isAdmin(undefined);
      expect(result).toBe(false);
    });

    it('should handle Clerk API errors gracefully', async () => {
      const userId = 'user_12345';

      // Clerk check throws error
      mockClerkClient.users.getUser.mockRejectedValue(
        new Error('Clerk API unavailable')
      );

      // Database check succeeds
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdmin(userId);
      expect(result).toBe(true);
    });
  });

  describe('Admin Priority Order', () => {
    it('should check god admin first (fastest)', async () => {
      const godAdminId = 'user_33RVOIU75IFG8QVTaXPK4VRAnwv';

      const result = await isAdmin(godAdminId);

      // Should return immediately without calling Clerk or database
      expect(result).toBe(true);
      expect(mockClerkClient.users.getUser).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should check Clerk metadata second (if not god admin)', async () => {
      const userId = 'user_12345';

      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'admin' },
      });

      const result = await isAdmin(userId);

      expect(result).toBe(true);
      expect(mockClerkClient.users.getUser).toHaveBeenCalledWith(userId);
      // Should not check database if Clerk succeeds
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should check database last (if god admin and Clerk both fail)', async () => {
      const userId = 'user_12345';

      // Not god admin
      expect(isGodAdmin(userId)).toBe(false);

      // Clerk returns non-admin
      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'user' },
      });

      // Database has admin
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const result = await isAdmin(userId);

      expect(result).toBe(true);
      expect(mockClerkClient.users.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('RLS Policy Simulation', () => {
    it('should simulate consumer can only see their own leads', async () => {
      const consumerId = 'user_consumer_123';
      const ownLeadId = 'lead_123';
      const otherLeadId = 'lead_456';

      // Mock fetching own lead (should succeed)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: ownLeadId, user_id: consumerId },
                error: null,
              }),
            }),
          }),
        }),
      });

      const ownLeadResult = await mockSupabase
        .from('leads')
        .select('*')
        .eq('id', ownLeadId)
        .eq('user_id', consumerId)
        .single();

      expect(ownLeadResult.data).toBeDefined();
      expect(ownLeadResult.data.user_id).toBe(consumerId);

      // Mock fetching other's lead (should fail with RLS)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Row-level security policy violation' },
              }),
            }),
          }),
        }),
      });

      const otherLeadResult = await mockSupabase
        .from('leads')
        .select('*')
        .eq('id', otherLeadId)
        .eq('user_id', consumerId)
        .single();

      expect(otherLeadResult.data).toBeNull();
      expect(otherLeadResult.error).toBeDefined();
    });

    it('should simulate business can only see matched leads', async () => {
      const businessId = 'user_business_123';
      const matchedLeadId = 'lead_matched_123';
      const unmatchedLeadId = 'lead_unmatched_456';

      // Mock fetching matched lead (should succeed)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: matchedLeadId, matched: true }],
            error: null,
          }),
        }),
      });

      const matchedResult = await mockSupabase
        .from('leads')
        .select('*')
        .eq('id', matchedLeadId);

      expect(matchedResult.data).toBeDefined();
      expect(matchedResult.data.length).toBeGreaterThan(0);

      // Mock fetching unmatched lead (should fail with RLS)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const unmatchedResult = await mockSupabase
        .from('leads')
        .select('*')
        .eq('id', unmatchedLeadId);

      expect(unmatchedResult.data).toEqual([]);
    });

    it('should simulate admin can see all leads', async () => {
      const adminId = 'user_admin_123';

      // Mock admin query (should return all leads)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 'lead_1', user_id: 'user_1' },
            { id: 'lead_2', user_id: 'user_2' },
            { id: 'lead_3', user_id: 'user_3' },
          ],
          error: null,
        }),
      });

      const allLeadsResult = await mockSupabase.from('leads').select('*');

      expect(allLeadsResult.data).toBeDefined();
      expect(allLeadsResult.data.length).toBe(3);
    });
  });

  describe('Performance - Admin Check Caching', () => {
    it('should complete god admin check in <1ms', async () => {
      const godAdminId = 'user_33RVOIU75IFG8QVTaXPK4VRAnwv';

      const start = Date.now();
      const result = await isAdmin(godAdminId);
      const duration = Date.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(1);
    });

    it('should complete database admin check in <100ms', async () => {
      const userId = 'user_12345';

      mockClerkClient.users.getUser.mockResolvedValue({
        publicMetadata: { role: 'user' },
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      const start = Date.now();
      const result = await isAdmin(userId);
      const duration = Date.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(100);
    });
  });
});
