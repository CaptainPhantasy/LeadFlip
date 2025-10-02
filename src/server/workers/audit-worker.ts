/**
 * Audit Worker
 *
 * Processes weekly audit jobs from BullMQ queue
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { runWeeklyAudit } from '@/lib/agents/audit-agent';
import { getMemorySystem } from '@/lib/memory/claude-memory';
import { RunAuditJob } from '../queue/config';

const REDIS_URL = process.env.REDIS_URL!;

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Process audit job
 */
async function processAuditJob(job: Job<RunAuditJob>) {
  const { audit_type, days_back, requested_by } = job.data;

  console.log(`📊 Running ${audit_type} audit (${days_back} days)...`);

  try {
    // Run audit
    const report = await runWeeklyAudit({ daysBack: days_back });

    console.log(`✅ Audit complete: ${report.reportId}`);

    // Update memory with new patterns
    const memory = await getMemorySystem();

    if (report.conversionStats.byCategory.length > 0) {
      await memory.updateConversionPatterns(report.conversionStats.byCategory);
    }

    // Add spam patterns
    if (report.spamAnalysis) {
      for (const pattern of report.spamAnalysis.spamPatterns) {
        if (pattern.probability > 0.8) {
          await memory.addSpamPattern({
            pattern: pattern.pattern,
            matchType: 'keyword',
            confidence: pattern.probability,
            action: 'flag',
          });
        }
      }
    }

    // Save MEMORY.md
    await memory.saveClaudeMD();

    console.log('✅ Memory updated');

    return {
      success: true,
      reportId: report.reportId,
      actionItems: report.actionItems.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Audit failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Create Audit Worker
 */
const auditWorker = new Worker<RunAuditJob>('audits', processAuditJob, {
  connection: redisConnection,
  concurrency: 1, // One audit at a time
});

/**
 * Worker event handlers
 */
auditWorker.on('completed', (job) => {
  console.log(`✅ Audit job completed: ${job.id}`);
});

auditWorker.on('failed', (job, err) => {
  console.error(`❌ Audit job failed: ${job?.id}`, err.message);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down worker...');
  await auditWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log('🚀 Audit worker started');

export default auditWorker;
