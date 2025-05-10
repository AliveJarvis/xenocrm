import { NextResponse } from 'next/server';
   import connectDB from '@/lib/mongoose';
   import Segment from '@/models/Segment';
   import { z } from 'zod';

   const segmentSchema = z.object({
     name: z.string().min(1, 'Name is required'),
     rules: z.array(
       z.object({
         field: z.string(),
         operator: z.string(),
         value: z.string(),
         connector: z.string().optional(),
       })
     ),
     audienceSize: z.number().int().min(0),
     message: z.string().min(10, 'message isnt selected'),
   });

   export async function POST(request: Request) {
     try {
       await connectDB();
       const body = await request.json();
       const validatedData = segmentSchema.parse(body);

       const segment = await Segment.create({
         name: validatedData.name,
         rules: validatedData.rules,
         audienceSize: validatedData.audienceSize,
         message: validatedData.message
       });

       return NextResponse.json(segment, { status: 201 });
     } catch (error) {
       if (error instanceof z.ZodError) {
         return NextResponse.json(
           { error: 'Validation failed', details: error.errors },
           { status: 400 }
         );
       }
       console.error('Error creating segment:', error);
       return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
     }
   }