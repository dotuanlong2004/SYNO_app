'use strict';

/**
 * Attendance Queue - pg-boss edition (PostgreSQL-based)
 * Replaces BullMQ + Redis with pg-boss + Supabase PostgreSQL
 */

const PgBoss = require('pg-boss');
require('dotenv').config();

const QUEUE_NAME = 'attendance';

// Build database URL for pg-boss (uses same Supabase DB)
function getDatabaseUrl() {
    if (process.env.SUPABASE_DB_URL) {
        return process.env.SUPABASE_DB_URL;
    }
    // Fallback: construct from Supabase URL (not recommended for production)
    // This is a simplified example - use SUPABASE_DB_URL in production
    console.warn('[pg-boss] Consider setting SUPABASE_DB_URL for direct PostgreSQL access');
    return null;
}

let boss = null;

/**
 * Get or create pg-boss instance
 * @returns {Promise<PgBoss>}
 */
async function getBoss() {
    if (boss) return boss;
    
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
        throw new Error('SUPABASE_DB_URL required for pg-boss. Format: postgresql://postgres:password@db.project.supabase.co:5432/postgres');
    }
    
    boss = new PgBoss({
        connectionString: dbUrl,
        schema: 'pgboss',
        // Archive completed jobs after 7 days
        deleteAfterDays: 7,
        // Retry failed jobs 3 times with exponential backoff
        retryLimit: 3,
        retryDelay: 500,
        retryBackoff: true
    });
    
    boss.on('error', (err) => {
        console.error('[pg-boss] Error:', err.message);
    });
    
    await boss.start();
    console.log('[pg-boss] Queue started successfully');
    
    return boss;
}

/**
 * Queue interface compatible with old BullMQ usage
 */
const attendanceQueue = {
    async add(jobName, data, options: any = {}) {
        const boss = await getBoss();
        const jobId = await boss.send(QUEUE_NAME, data, {
            retryLimit: options.attempts || 3,
            retryDelay: options.backoff?.delay || 500,
            retryBackoff: options.backoff?.type === 'exponential',
            singletonKey: data.studentCode ? `${data.schoolId}:${data.studentCode}` : undefined,
            // Prevent duplicate scans within 5 seconds
            singletonSeconds: 5
        });
        return { id: jobId };
    },
    
    async close() {
        if (boss) {
            await boss.stop();
            boss = null;
        }
    }
};

/**
 * Subscribe to queue (used by worker)
 * @param {Function} handler - async function(job) => result
 */
async function subscribeToQueue(handler) {
    const boss = await getBoss();
    await boss.work(QUEUE_NAME, async (job) => {
        console.log('[pg-boss] Processing job:', job.id, job.data);
        try {
            const result = await handler(job);
            return { success: true, result };
        } catch (err) {
            console.error('[pg-boss] Job failed:', err.message);
            throw err; // pg-boss will handle retry
        }
    });
}

module.exports = {
    attendanceQueue,
    QUEUE_NAME,
    getBoss,
    subscribeToQueue,
    boss: () => boss
};
