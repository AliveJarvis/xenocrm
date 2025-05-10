// lib/batchProcessor.ts
import redis from './redis';
import connectDB from './mongoose';
import CommunicationLog from '@/models/CommunicationLog';
import Campaign from '@/models/Campaign';

const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 60000; // 60 seconds
const RECEIPT_QUEUE = 'delivery_receipts';
const CAMPAIGN_STATS_KEY = 'campaign_stats';

interface DeliveryReceipt {
  customerId: string;
  message: string;
  status: 'SENT' | 'FAILED';
  timestamp: string;
  campaignId?: string;
}

class BatchProcessor {
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private stats = {
    totalReceived: 0,
    totalProcessed: 0,
    batchCount: 0,
    lastBatchSize: 0,
    lastBatchTime: new Date()
  };

  // Add delivery receipt to Redis queue
  async addReceipt(receipt: DeliveryReceipt) {
    await redis.lpush(RECEIPT_QUEUE, JSON.stringify(receipt));
    this.stats.totalReceived++;
    
    // Update campaign stats in Redis
    if (receipt.campaignId) {
      const statsKey = `${CAMPAIGN_STATS_KEY}:${receipt.campaignId}`;
      const field = receipt.status === 'SENT' ? 'sentCount' : 'failedCount';
      await redis.hincrby(statsKey, field, 1);
    }

    // Check if we should process the batch
    const queueLength = await redis.llen(RECEIPT_QUEUE);
    console.log(`Queue length: ${queueLength}, Batch size: ${BATCH_SIZE}`);
    
    if (queueLength >= BATCH_SIZE) {
      console.log('🚀 Triggering batch process - Queue reached batch size');
      this.triggerBatchProcess();
    } else if (!this.processingTimer) {
      // Set a timer to process remaining items after timeout
      console.log(`⏰ Setting timeout for batch processing (${BATCH_TIMEOUT}ms)`);
      this.processingTimer = setTimeout(() => {
        console.log('⏰ Timeout reached - Processing remaining items');
        this.triggerBatchProcess();
      }, BATCH_TIMEOUT);
    }
  }

  private triggerBatchProcess() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    if (!this.isProcessing) {
      this.processBatch();
    }
  }

  private async processBatch() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      await connectDB();
      
      // Get the current queue length
      const queueLength = await redis.llen(RECEIPT_QUEUE);
      console.log(`📊 Starting batch process. Queue length: ${queueLength}`);
      
      // Process up to BATCH_SIZE items
      const itemsToProcess = Math.min(queueLength, BATCH_SIZE);
      
      if (itemsToProcess === 0) {
        this.isProcessing = false;
        return;
      }

      // Get items from the front of the queue (FIFO)
      const batchData = await redis.lrange(RECEIPT_QUEUE, 0, itemsToProcess - 1);
      
      // Remove processed items from queue
      await redis.ltrim(RECEIPT_QUEUE, itemsToProcess, -1);

      // Parse receipts
      const receipts: DeliveryReceipt[] = batchData.map(item => JSON.parse(item));

      // Bulk insert into database
      console.log(`💾 Inserting ${receipts.length} receipts into database...`);
      const insertResult = await CommunicationLog.insertMany(
        receipts.map(receipt => ({
          customerId: receipt.customerId,
          message: receipt.message,
          status: receipt.status,
          timestamp: new Date(receipt.timestamp),
          updatedAt: new Date()
        }))
      );

      // Update campaign stats in database
      const campaignIds = [...new Set(receipts.filter(r => r.campaignId).map(r => r.campaignId!))];
      
      for (const campaignId of campaignIds) {
        const statsKey = `${CAMPAIGN_STATS_KEY}:${campaignId}`;
        const stats = await redis.hgetall(statsKey);
        
        if (stats) {
          const updateResult = await Campaign.findByIdAndUpdate(
            campaignId,
            {
              $inc: {
                sentCount: parseInt(stats.sentCount || '0'),
                failedCount: parseInt(stats.failedCount || '0')
              }
            }
          );
          console.log(`📈 Updated campaign ${campaignId}: +${stats.sentCount || 0} sent, +${stats.failedCount || 0} failed`);
          
          // Clear the stats from Redis after reading
          await redis.del(statsKey);
        }
      }

      // Update statistics
      this.stats.totalProcessed += receipts.length;
      this.stats.batchCount++;
      this.stats.lastBatchSize = receipts.length;
      this.stats.lastBatchTime = new Date();

      console.log(`✅ Processed batch of ${receipts.length} delivery receipts`);
      console.log(`📊 Stats: ${JSON.stringify(this.stats)}`);
      
      // Check if there are more items to process
      const remainingItems = await redis.llen(RECEIPT_QUEUE);
      if (remainingItems > 0) {
        console.log(`🔄 ${remainingItems} items remaining in queue. Processing next batch...`);
        setTimeout(() => this.processBatch(), 100);
      } else {
        console.log('✅ Queue is empty. Batch processing complete.');
      }
      
    } catch (error) {
      console.error('❌ Error processing batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get current statistics
  getStats() {
    return {
      ...this.stats,
      queueLength: redis.llen(RECEIPT_QUEUE)
    };
  }

  // Process any remaining items on shutdown
  async flush() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    console.log('🔄 Flushing remaining receipts...');
    
    // Process all remaining items
    while (true) {
      const queueLength = await redis.llen(RECEIPT_QUEUE);
      if (queueLength === 0) break;
      
      await this.processBatch();
    }
    
    console.log('✅ Flush complete');
  }
}

export const batchProcessor = new BatchProcessor();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down - flushing remaining receipts...');
  await batchProcessor.flush();
  await redis.quit();
  process.exit(0);
});