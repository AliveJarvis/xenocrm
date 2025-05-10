import mongoose, { Schema } from 'mongoose';

mongoose.connect(process.env.MONGODB_URI || '');
mongoose.Promise = global.Promise;

const customerSchema = new Schema(
  {
    spend: { type: Number, required: true, index: true },
    visits: { type: Number, required: true, index: true },
    orders: { type: Number, required: true, index: true },
    avg_order_value: { type: Number, required: true },
    clv: { type: Number, required: true },
    customer_since: { type: Date, required: true },
    lastActive: { type: Date, required: true, index: true },
    last_order: { type: Date, required: true },
    preferred_category: { type: String, required: true, enum: ['Clothing', 'Electronics', 'Home', 'Beauty', 'Sports'], index: true },
    source: { type: String, required: true, enum: ['Organic', 'Paid', 'Referral', 'Social'], index: true },
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export { Customer };