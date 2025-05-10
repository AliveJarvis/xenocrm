import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import { Customer } from '@/models/Customer';
import { z } from 'zod';

// Define validation schema using Zod
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  spend: z.number().min(0, 'Spend must be non-negative'),
  visits: z.number().int().min(0, 'Visits must be a non-negative integer'),
  lastActive: z.string().datetime({ message: 'Invalid date format' }),
});

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate request body
    const validatedData = customerSchema.parse(body);

    // Check if customer already exists by email
    const existingCustomer = await Customer.findOne({ email: validatedData.email });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 409 }
      );
    }

    // Create customer in database
    const customer = await Customer.create({
      name: validatedData.name,
      email: validatedData.email,
      spend: validatedData.spend,
      visits: validatedData.visits,
      lastActive: new Date(validatedData.lastActive),
    });

    // Optional: Publish to Redis Streams for asynchronous processing
    /*
    const redis = require('ioredis');
    const client = new redis(process.env.REDIS_URL);
    await client.xadd('customer:stream', '*', 'customer', JSON.stringify(customer));
    await client.quit();
    */

    return NextResponse.json(
      { message: 'Customer created successfully', customer },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const customers = await Customer.find().select('name email spend visits lastActive');
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}








// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/mongoose';
// import Customer from '@/models/Customer';
// import { z } from 'zod';

// // Define validation schema using Zod
// const customerSchema = z.object({
//   name: z.string().min(1, 'Name is required'),
//   email: z.string().email('Invalid email address'),
//   spend: z.number().min(0, 'Spend must be non-negative'),
//   visits: z.number().int().min(0, 'Visits must be a non-negative integer'),
//   lastActive: z.string().datetime({ message: 'Invalid date format' }),
// });

// export async function POST(request: Request) {
//   try {
//     await connectDB();
//     const body = await request.json();
    
//     // Validate request body
//     const validatedData = customerSchema.parse(body);

//     // Check if customer already exists by email
//     const existingCustomer = await Customer.findOne({ email: validatedData.email });

//     if (existingCustomer) {
//       return NextResponse.json(
//         { error: 'Customer with this email already exists' },
//         { status: 409 }
//       );
//     }

//     // Create customer in database
//     const customer = await Customer.create({
//       name: validatedData.name,
//       email: validatedData.email,
//       spend: validatedData.spend,
//       visits: validatedData.visits,
//       lastActive: new Date(validatedData.lastActive),
//     });

//     // Optional: Publish to Redis Streams for asynchronous processing
//     /*
//     const redis = require('ioredis');
//     const client = new redis(process.env.REDIS_URL);
//     await client.xadd('customer:stream', '*', 'customer', JSON.stringify(customer));
//     await client.quit();
//     */

//     return NextResponse.json(
//       { message: 'Customer created successfully', customer },
//       { status: 201 }
//     );
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         { error: 'Validation failed', details: error.errors },
//         { status: 400 }
//       );
//     }
//     console.error('Error creating customer:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// export async function GET() {
//   try {
//     await connectDB();
//     const customers = await Customer.find().select('name email spend visits lastActive');
//     return NextResponse.json(customers);
//   } catch (error) {
//     console.error('Error fetching customers:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }