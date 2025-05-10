import { NextResponse } from 'next/server';
import { batchProcessor } from '@/lib/batchProcessor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, message, status, timestamp, campaignId } = body;

    // Make sure all required fields are present
    if (!customerId || !message || !status || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await batchProcessor.addReceipt({
      customerId,
      message,
      status,
      timestamp,
      campaignId
    });

    return NextResponse.json({ message: 'Receipt queued for processing' }, { status: 200 });
  } catch (error) {
    console.error('Error queuing delivery receipt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}