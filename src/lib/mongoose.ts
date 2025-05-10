import mongoose from 'mongoose';

   const MONGODB_URI = process.env.MONGODB_URI;

   if (!MONGODB_URI) {
     throw new Error('Please define MONGODB_URI in .env');
   }

   let cached = global as any;

   if (!cached.mongoose) {
     cached.mongoose = { conn: null, promise: null };
   }

   async function connectDB() {
     if (cached.conn) {
       return cached.conn;
     }

     if (!cached.promise) {
       const opts = {
         bufferCommands: false,
       };

       cached.promise = mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://arjunusername:U8P1NiNIv9Xap6cP@cluster0.vyfeeww.mongodb.net/XENO", opts).then((mongoose) => {
         console.log('MongoDB connected');
         return mongoose;
       });
     }
     cached.conn = await cached.promise;
     return cached.conn;
   }

   export default connectDB;