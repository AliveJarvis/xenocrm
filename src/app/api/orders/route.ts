import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Order from '@/models/Order';
import { Customer } from '@/models/Customer';
import { z } from 'zod';

// Define validation schema using Zod
const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  date: z.string().datetime({ message: 'Invalid date format' }),
});

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    // Validate request body
    const validatedData = orderSchema.parse(body);

    // Check if customer exists
    const customer = await Customer.findById(validatedData.customerId);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create order in database
    const order = await Order.create({
      customerId: validatedData.customerId,
      amount: validatedData.amount,
      date: new Date(validatedData.date),
    });

    // Optional: Publish to Redis Streams for asynchronous processing
    /*
    const redis = require('ioredis');
    const client = new redis(process.env.REDIS_URL);
    await client.xadd('order:stream', '*', 'order', JSON.stringify(order));
    await client.quit();
    */

    return NextResponse.json(
      { message: 'Order created successfully', order },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find()
      .populate('customerId', 'name email')
      .select('customerId amount date');
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}