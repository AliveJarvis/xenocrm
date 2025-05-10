import Redis from 'ioredis';

const client = new Redis(process.env.REDIS_URL);

async function consumeCustomers() {
  while (true) {
    const messages = await client.xread('BLOCK', 1000, 'STREAMS', 'customer:stream', '$');
    if (messages) {
      for (const [stream, entries] of messages) {
        for (const [id, fields] of entries) {
          const customer = JSON.parse(fields[1]);
          // Persist to database
          await prisma.customer.create({ data: customer });
          // Acknowledge message
          await client.xack('customer:stream', 'consumer-group', id);
        }
      }
    }
  }
}