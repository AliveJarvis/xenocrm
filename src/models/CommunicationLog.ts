// import mongoose, { Schema, Document } from 'mongoose';

// export interface ICommunicationLog extends Document {
//   customerId: mongoose.Types.ObjectId;
//   segmentId: mongoose.Types.ObjectId;
//   campaignId?: mongoose.Types.ObjectId;
//   messageContent: string;
//   status: 'pending' | 'sent' | 'delivered' | 'failed';
//   channel: 'sms' | 'email';
//   deliveryTimestamp?: Date;
//   error?: string;
//   metadata?: Record<string, any>;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const CommunicationLogSchema = new Schema({
//   customerId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Customer',
//     required: true,
//     index: true
//   },
//   segmentId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Segment',
//     required: true,
//     index: true
//   },
//   campaignId: {
//     type: Schema.Types.ObjectId,
//     ref: 'Campaign',
//     index: true
//   },
//   messageContent: {
//     type: String,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'sent', 'delivered', 'failed'],
//     default: 'pending',
//     index: true
//   },
//   channel: {
//     type: String,
//     enum: ['sms', 'email'],
//     required: true,
//     index: true
//   },
//   deliveryTimestamp: {
//     type: Date
//   },
//   error: {
//     type: String
//   },
//   metadata: {
//     type: Schema.Types.Mixed
//   }
// }, {
//   timestamps: true
// });

// // Create compound indexes for better query performance
// CommunicationLogSchema.index({ customerId: 1, createdAt: -1 });
// CommunicationLogSchema.index({ segmentId: 1, status: 1 });
// CommunicationLogSchema.index({ campaignId: 1, status: 1 });

// const CommunicationLog = mongoose.models.CommunicationLog || 
//   mongoose.model<ICommunicationLog>('CommunicationLog', CommunicationLogSchema);

// export default CommunicationLog;


import mongoose, { Schema, model, Model } from 'mongoose';

     interface ICommunicationLog {
       customerId: string;
       message: string;
       status: string;
       timestamp: Date;
     }

     const CommunicationLogSchema = new Schema<ICommunicationLog>({
       customerId: { type: String, required: true, ref: 'Customer' },
       message: { type: String, required: true },
       status: { type: String, required: true },
       timestamp: { type: Date, required: true },
     });

     const CommunicationLog: Model<ICommunicationLog> = mongoose.models.CommunicationLog || model<ICommunicationLog>('CommunicationLog', CommunicationLogSchema);

     export default CommunicationLog;