/**
 * Supabase Test Client Helper
 *
 * Provides utilities for database operations in tests with automatic cleanup.
 * Tracks all created records and deletes them after tests complete.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseTestClient {
  private client: SupabaseClient;
  private createdRecords: Map<string, Set<string>> = new Map();

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured for testing');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Insert a record and track it for cleanup
   */
  async insert<T = any>(
    table: string,
    data: any,
    options?: { select?: string }
  ): Promise<{ data: T | null; error: any }> {
    const query = this.client.from(table).insert(data);

    if (options?.select) {
      query.select(options.select);
    } else {
      query.select();
    }

    const result = await query.single();

    if (result.data && 'id' in result.data) {
      this.trackRecord(table, (result.data as any).id);
    }

    return result;
  }

  /**
   * Insert multiple records and track them for cleanup
   */
  async insertMany<T = any>(
    table: string,
    data: any[],
    options?: { select?: string }
  ): Promise<{ data: T[] | null; error: any }> {
    const query = this.client.from(table).insert(data);

    if (options?.select) {
      query.select(options.select);
    } else {
      query.select();
    }

    const result = await query;

    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((record: any) => {
        if ('id' in record) {
          this.trackRecord(table, record.id);
        }
      });
    }

    return result;
  }

  /**
   * Manually track a record ID for cleanup
   */
  trackRecord(table: string, id: string): void {
    if (!this.createdRecords.has(table)) {
      this.createdRecords.set(table, new Set());
    }
    this.createdRecords.get(table)!.add(id);
  }

  /**
   * Manually untrack a record ID (if you've already deleted it)
   */
  untrackRecord(table: string, id: string): void {
    this.createdRecords.get(table)?.delete(id);
  }

  /**
   * Delete a specific record
   */
  async delete(table: string, id: string): Promise<{ error: any }> {
    const result = await this.client.from(table).delete().eq('id', id);
    this.untrackRecord(table, id);
    return result;
  }

  /**
   * Query records (read-only, no tracking)
   */
  async select<T = any>(
    table: string,
    query?: (q: any) => any
  ): Promise<{ data: T[] | null; error: any }> {
    let baseQuery = this.client.from(table).select();

    if (query) {
      baseQuery = query(baseQuery);
    }

    return await baseQuery;
  }

  /**
   * Clean up all tracked records
   * Call this in afterEach or afterAll hooks
   */
  async cleanup(): Promise<void> {
    const errors: Array<{ table: string; id: string; error: any }> = [];

    // Delete in reverse order to handle foreign key constraints
    const tables = Array.from(this.createdRecords.keys()).reverse();

    for (const table of tables) {
      const ids = Array.from(this.createdRecords.get(table) || []);

      for (const id of ids) {
        const { error } = await this.client.from(table).delete().eq('id', id);

        if (error) {
          errors.push({ table, id, error });
        }
      }
    }

    // Clear tracking
    this.createdRecords.clear();

    if (errors.length > 0) {
      console.warn('Some test records could not be deleted:', errors);
    }
  }

  /**
   * Clean up specific table
   */
  async cleanupTable(table: string): Promise<void> {
    const ids = Array.from(this.createdRecords.get(table) || []);

    for (const id of ids) {
      await this.client.from(table).delete().eq('id', id);
    }

    this.createdRecords.delete(table);
  }

  /**
   * Check if a record exists
   */
  async exists(table: string, id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(table)
      .select('id')
      .eq('id', id)
      .single();

    return !error && data !== null;
  }

  /**
   * Count records in a table matching a condition
   */
  async count(table: string, column?: string, value?: any): Promise<number> {
    let query = this.client.from(table).select('id', { count: 'exact', head: true });

    if (column && value !== undefined) {
      query = query.eq(column, value);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count records: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Wait for a condition to be true (useful for async operations)
   */
  async waitFor(
    condition: () => Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const { timeout = 10000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Timeout waiting for condition');
  }

  /**
   * Create a test business and return its ID
   */
  async createTestBusiness(data: any): Promise<string> {
    const { data: business, error } = await this.insert('businesses', data);

    if (error) {
      throw new Error(`Failed to create test business: ${error.message}`);
    }

    return (business as any).id;
  }

  /**
   * Create a test lead and return its ID
   */
  async createTestLead(data: any): Promise<string> {
    const { data: lead, error } = await this.insert('leads', data);

    if (error) {
      throw new Error(`Failed to create test lead: ${error.message}`);
    }

    return (lead as any).id;
  }

  /**
   * Create a test match between lead and business
   */
  async createTestMatch(leadId: string, businessId: string, data?: any): Promise<string> {
    const matchData = {
      lead_id: leadId,
      business_id: businessId,
      confidence_score: 85,
      match_reasons: ['proximity', 'service_match'],
      distance_miles: 5.2,
      status: 'active',
      ...data,
    };

    const { data: match, error } = await this.insert('matches', matchData);

    if (error) {
      throw new Error(`Failed to create test match: ${error.message}`);
    }

    return (match as any).id;
  }

  /**
   * Create a test call record
   */
  async createTestCall(data: any): Promise<string> {
    const { data: call, error } = await this.insert('calls', data);

    if (error) {
      throw new Error(`Failed to create test call: ${error.message}`);
    }

    return (call as any).id;
  }

  /**
   * Get statistics about tracked records (for debugging)
   */
  getTrackedStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const [table, ids] of this.createdRecords.entries()) {
      stats[table] = ids.size;
    }

    return stats;
  }
}

/**
 * Create a new test client instance
 */
export function createTestClient(): SupabaseTestClient {
  return new SupabaseTestClient();
}

/**
 * Global test client instance (use with caution, prefer creating instances per test suite)
 */
let globalTestClient: SupabaseTestClient | null = null;

export function getGlobalTestClient(): SupabaseTestClient {
  if (!globalTestClient) {
    globalTestClient = new SupabaseTestClient();
  }
  return globalTestClient;
}

export function resetGlobalTestClient(): void {
  globalTestClient = null;
}
