import { NextResponse } from 'next/server';
   import connectDB from '@/lib/mongoose';
   import CommunicationLog from '@/models/CommunicationLog';

   export async function POST(request: Request) {
     try {
       await connectDB();
       const { customerId, message, status, timestamp } = await request.json();
       await CommunicationLog.create({
         customerId,
         message,
         status,
         timestamp: new Date(timestamp),
       });

       return NextResponse.json({ success: true });
     } catch (error) {
       console.error('Delivery receipt error:', error);
       return NextResponse.json({ error: 'Failed to log delivery receipt' }, { status: 500 });
     }
   }