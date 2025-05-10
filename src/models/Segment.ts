import mongoose, { Schema, model, Model } from 'mongoose';

   interface ISegment {
     name: string;
     rules: Array<{
       field: string;
       operator: string;
       value: string;
       connector?: string;
     }>;
     audienceSize: number;
     tag:string
   }

   const SegmentSchema = new Schema<ISegment>({
     name: { type: String, required: true },
     rules: [
       {
         field: { type: String, required: true },
         operator: { type: String, required: true },
         value: { type: String, required: true },
         connector: { type: String },
       },
     ],
     audienceSize: { type: Number, required: true, min: 0 },
     tag:String
   });

   const Segment: Model<ISegment> = mongoose.models.Segment || model<ISegment>('Segment', SegmentSchema);

   export default Segment;