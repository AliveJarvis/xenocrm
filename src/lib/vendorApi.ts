export const vendorApi = {
  sendMessage: async (
    customer: { id: string; name: string; email: string }, 
    message: string,
    campaignId?: string
  ) => {
    // Simulate real-world delivery success/failure (~90% SENT, ~10% FAILED)
    const success = Math.random() < 0.9;
    const status = success ? 'SENT' : 'FAILED';

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    // Hit Delivery Receipt API
    try {
      const response = await fetch(`${baseUrl}/api/delivery-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          message,
          status,
          timestamp: new Date().toISOString(),
          campaignId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log delivery receipt');
      }

      return { status, customerId: customer.id };
    } catch (error) {
      console.error('Vendor API error:', error);
      return { status: 'FAILED', customerId: customer.id };
    }
  },
};

// import { ICampaign } from '@/models/Campaign';
// import Customer from '@/models/Customer';
// import connectDB from './mongoose';

// async function sendDeliveryReceipt(campaignId: string, customerId: string, status: 'SENT' | 'FAILED') {
//   try {
//     const response = await fetch(`${process.env.NEXTAUTH_URL}/api/delivery-receipt`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ campaignId, customerId, status }),
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to send delivery receipt: ${response.statusText}`);
//     }

//     console.log(`Delivery receipt sent: campaign=${campaignId}, customer=${customerId}, status=${status}`);
//   } catch (error) {
//     console.error('Error sending delivery receipt:', error);
//   }
// }

// export async function simulateVendorApi(campaign: ICampaign) {
//   try {
//     await connectDB();

//     // Fetch customers in the segment
//     const customers = await Customer.find(); // Simplified; in practice, query based on segment rules
//     const audienceSize = Math.min(campaign.audienceSize, customers.length);

//     // Simulate sending messages to customers
//     for (let i = 0; i < audienceSize; i++) {
//       const customer = customers[i];
//       const status = Math.random() < 0.9 ? 'SENT' : 'FAILED'; // 90% SENT, 10% FAILED
//       await sendDeliveryReceipt(campaign._id.toString(), customer._id.toString(), status);

//       // Simulate delay (e.g., vendor processing time)
//       await new Promise((resolve) => setTimeout(resolve, 100));
//     }

//     console.log(`Completed vendor simulation for campaign: ${campaign.name}`);
//   } catch (error) {
//     console.error('Error in vendor simulation:', error);
//   }
// }