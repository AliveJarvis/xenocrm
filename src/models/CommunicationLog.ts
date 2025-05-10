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