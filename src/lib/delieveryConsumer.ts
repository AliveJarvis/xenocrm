import Redis from 'ioredis';
import connectDB from './mongoose';
import CommunicationLog from '@/models/CommunicationLog';
import Campaign from '@/models/Campaign';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
});
const GROUP_NAME = 'delivery-group';
const CONSUMER_NAME = 'delivery-consumer';
const STREAM_KEY = 'delivery:stream';
const BATCH_SIZE = 100;
const POLL_INTERVAL = 5000; // 5 seconds

async function initializeConsumerGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$', 'MKSTREAM');
    console.log('Created consumer group:', GROUP_NAME);
  } catch (error: any) {
    if (error.message.includes('BUSYGROUP')) {
      console.log('Consumer group already exists:', GROUP_NAME);
    } else {
      console.error('Error creating consumer group:', error);
      throw error;
    }
  }
}

async function processBatch(entries: any[]) {
  await connectDB();

  const logs = [];
  const campaignUpdates: { [key: string]: { sent: number; failed: number } } = {};

  for (const [, [, , , receiptJson]] of entries) {
    const receipt = JSON.parse(receiptJson);
    const { campaignId, customerId, status } = receipt;

    // Prepare CommunicationLog entry
    logs.push({
      campaignId,
      customerId,
      status,
      timestamp: new Date(),
    });

    // Aggregate campaign updates
    if (!campaignUpdates[campaignId]) {
      campaignUpdates[campaignId] = { sent: 0, failed: 0 };
    }
    if (status === 'SENT') {
      campaignUpdates[campaignId].sent += 1;
    } else if (status === 'FAILED') {
      campaignUpdates[campaignId].failed += 1;
    }
  }

  // Bulk insert CommunicationLog entries
  if (logs.length > 0) {
    await CommunicationLog.insertMany(logs);
    console.log(`Inserted ${logs.length} communication logs`);
  }

  // Bulk update Campaign counters
  const updatePromises = Object.entries(campaignUpdates).map(([campaignId, updates]) =>
    Campaign.updateOne(
      { _id: campaignId },
      { $inc: { sent: updates.sent, failed: updates.failed } }
    )
  );
  await Promise.all(updatePromises);
  console.log(`Updated ${updatePromises.length} campaigns`);
}

async function consumeDeliveryReceipts() {
  await initializeConsumerGroup();

  while (true) {
    try {
      // Read up to BATCH_SIZE entries from the stream
      const result = await redis.xreadgroup(
        'GROUP',
        GROUP_NAME,
        CONSUMER_NAME,
        'BLOCK',
        POLL_INTERVAL,
        'COUNT',
        BATCH_SIZE,
        'STREAMS',
        STREAM_KEY,
        '>'
      );

      if (result && result[0] && result[0][1].length > 0) {
        const entries = result[0][1];
        const entryIds = entries.map(([id]) => id);

        // Process batch
        await processBatch(entries);

        // Acknowledge processed entries
        await redis.xack(STREAM_KEY, GROUP_NAME, ...entryIds);
        console.log(`Acknowledged ${entryIds.length} entries`);
      }
    } catch (error) {
      console.error('Error processing delivery receipts:', error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

// Start consumer
consumeDeliveryReceipts().catch((error) => {
  console.error('Consumer error:', error);
  redis.quit();
  process.exit(1);
});

export default consumeDeliveryReceipts;