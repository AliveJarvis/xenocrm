import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Campaign from "@/models/Campaign";
import Segment from "@/models/Segment";
import Customer from "@/models/Customer";
import { vendorApi } from "@/lib/vendorApi";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { logger } from "@/lib/logger";
import { progressTracker } from "@/lib/progressTracker";

// Add interfaces at the top of the file
interface CustomerDocument {
  _id?: any;
  id?: string;
  name?: string;
  email?: string;
}

const campaignSchema = z.object({
  segmentId: z.string(),
  name: z.string().min(1, "Name is required"),
  message: z.string().optional().default(""),
  tag: z.string().optional().default("General")
});

// function buildQueryFromRules(rules: any[]) {
//   const query: any = {};
//   const andConditions: any[] = [];
//   const orConditions: any[] = [];

//   rules.forEach((rule, index) => {
//     const condition: any = {};
    
//     // Convert the value to appropriate type based on the field
//     let value = rule.value;
//     if (rule.field === 'spend' || rule.field === 'visitCount') {
//       value = parseInt(value, 10);
//     }

//     // Build the condition based on the operator
//     switch (rule.operator) {
//       case '>':
//         condition[rule.field] = { $gt: value };
//         break;
//       case '<':
//         condition[rule.field] = { $lt: value };
//         break;
//       case '=':
//         condition[rule.field] = value;
//         break;
//       case '>=':
//         condition[rule.field] = { $gte: value };
//         break;
//       case '<=':
//         condition[rule.field] = { $lte: value };
//         break;
//       case '!=':
//         condition[rule.field] = { $ne: value };
//         break;
//       default:
//         condition[rule.field] = value;
//     }

//     // Handle connectors (AND/OR)
//     if (index === 0 || rules[index - 1].connector === 'AND') {
//       andConditions.push(condition);
//     } else if (rules[index - 1].connector === 'OR') {
//       if (andConditions.length > 0) {
//         orConditions.push({ $and: [...andConditions] });
//         andConditions.length = 0;
//       }
//       orConditions.push(condition);
//     }
//   });

//   // Add any remaining AND conditions
//   if (andConditions.length > 0) {
//     if (orConditions.length > 0) {
//       orConditions.push({ $and: andConditions });
//     } else {
//       return { $and: andConditions };
//     }
//   }

//   // If we have OR conditions, use them
//   if (orConditions.length > 0) {
//     return { $or: orConditions };
//   }

//   return query;
// }

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Get the user session for proper userId
    const session = await getServerSession(authOptions);
    
    try {
      const { segmentId, name } = campaignSchema.parse(body);
      
      // Find the segment
      const segment = await Segment.findById(segmentId);
      if (!segment) {
        logger.warn(`Segment not found: ${segmentId}`);
        return NextResponse.json({ error: "Segment not found" }, { status: 404 });
      }
      
      // Use the segment's filter to find matching customers
      const query = segment.filter || {};
      
      const customers = await Customer.find(query).lean();
      
      // Display clear campaign start information
      logger.info(`
╔══════════════════════════════════════════════════════════════════╗
║                     CAMPAIGN EXECUTION STARTED                   ║
╠══════════════════════════════════════════════════════════════════╣
║ Campaign: ${name.padEnd(52)} ║
║ Segment:  ${segment.name.padEnd(52)} ║
║ Audience: ${customers.length.toString().padEnd(52)} ║
╚══════════════════════════════════════════════════════════════════╝`);
  
      // Use the real user ID from session if available, otherwise use a default
      const userId = session?.user?.id?.toString() || 'system';
      
      // Create the campaign
      const campaignData = {
        userId,
        name,
        audienceSize: customers.length,
        sentCount: 0,
        failedCount: 0,
        tag: body.tag || 'General',
        customers: customers.map((c: CustomerDocument) => {
          const id = c._id ? c._id.toString() : (c.id || '');
          return id;
        })
      };
      
      const campaign = await Campaign.create(campaignData);
      
      // Reset batch statistics for this new campaign
      vendorApi.resetStats();
      
      // Process customers in batches
      const message = body.message || segment.messageContent || "";
      const campaignId = campaign._id.toString();
      // Increase batch size to match vendorApi's batch size for optimal batching
      const MAX_BATCH_SIZE = 50; // Match vendorApi's batch size
      let sentCount = 0;
      let failedCount = 0;
      
      // Calculate total number of batches
      const totalBatches = Math.ceil(customers.length / MAX_BATCH_SIZE);
      
      // Create a visual tracker for the campaign
      const trackerId = progressTracker.startBatch('campaign-processing', customers.length);
      
      // Use a single collection of promises for all customers
      const allPromises = [];
      const results = [];
      
      // Log batch information
      logger.info(`Campaign will be processed in ${totalBatches} batch(es) of up to ${MAX_BATCH_SIZE} customers each`);
      
      // Add direct console log for high visibility
      console.log(`\x1b[45m\x1b[37m CAMPAIGN BATCHES \x1b[0m Campaign will be processed in ${totalBatches} batches of up to ${MAX_BATCH_SIZE} customers each`);
      
      // Queue all customer messages
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * MAX_BATCH_SIZE;
        const endIdx = Math.min((batchIndex + 1) * MAX_BATCH_SIZE, customers.length);
        const batchCustomers = customers.slice(startIdx, endIdx);
        const currentBatchSize = batchCustomers.length;
        
        // Add direct console log for high visibility of batch processing
        console.log(`\x1b[45m\x1b[37m PROCESSING BATCH ${batchIndex + 1}/${totalBatches} \x1b[0m ${currentBatchSize} customers (${startIdx+1}-${endIdx} of ${customers.length})`);
        
        // Log batch start with visual separator
        logger.info(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ PROCESSING BATCH #${(batchIndex + 1).toString().padStart(2)} of ${totalBatches.toString().padEnd(2)}                     ┃
┃ Size: ${currentBatchSize.toString().padEnd(4)} customers (${startIdx+1}-${endIdx} of ${customers.length})        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
        
        const batchPromises = [];
        
        // Process this batch of customers
        for (let i = 0; i < batchCustomers.length; i++) {
          const customer = batchCustomers[i];
          const customer_doc = customer as CustomerDocument;
          const customerId = customer_doc._id ? customer_doc._id.toString() : (customer_doc.id || '');
          
          // Create promise but don't await it yet
          const promise = vendorApi.sendMessage(
            {
              id: customerId,
              name: customer_doc.name || "",
              email: customer_doc.email || ""
            },
            message,
            campaignId
          ).then(result => {
            // Store result and update counters
            results.push(result);
            if (result.status === "SENT") {
              sentCount++;
            } else {
              failedCount++;
            }
            
            // Update progress periodically
            if (results.length % 10 === 0 || results.length === customers.length) {
              progressTracker.bulkUpdate(trackerId, results.length);
            }
            
            return result;
          });
          
          batchPromises.push(promise);
          allPromises.push(promise);
        }
        
        // Wait for batch to complete
        try {
          await Promise.all(batchPromises);
          logger.info(`✅ Completed batch #${batchIndex + 1}: ${currentBatchSize} customers processed`);
          
          // Direct console log for batch completion
          console.log(`\x1b[42m\x1b[30m BATCH COMPLETED ${batchIndex + 1}/${totalBatches} \x1b[0m Processed ${currentBatchSize} customers`);
        } catch (error: any) {
          logger.error(`❌ Error in batch #${batchIndex + 1}`, error);
          
          // Direct console log for batch error
          console.log(`\x1b[41m\x1b[37m BATCH ERROR ${batchIndex + 1}/${totalBatches} \x1b[0m ${error.message || 'Unknown error'}`);
        }
        
        // Add a pause after each batch to allow VendorApi to collect and process receipts
        if (batchIndex < totalBatches - 1) {
          logger.info(`Waiting for receipt processing before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Wait for all messages to complete
      try {
        await Promise.all(allPromises);
      } catch (error) {
        logger.error('Error processing some customer messages', error);
      }
      
      // Force processing any remaining receipts in vendorApi
      if (typeof vendorApi._processBatch === 'function') {
        logger.info(`Processing any remaining delivery receipts...`);
        try {
          await vendorApi._processBatch();
        } catch (error) {
          logger.error('Error processing final batch', error);
        }
      }
      
      // Complete the tracker
      progressTracker.completeBatch(trackerId);
  
      // Update the campaign with the results
      await Campaign.findByIdAndUpdate(campaign._id, { sentCount, failedCount });
      
      // Show campaign completion message with clear visual indicator
      logger.info(`
╔══════════════════════════════════════════════════════════════════╗
║                     CAMPAIGN EXECUTION COMPLETED                 ║
╠══════════════════════════════════════════════════════════════════╣
║ Campaign: ${campaign._id.toString().substring(0, 8)}                                               ║
║ Results:  ${sentCount} sent, ${failedCount} failed (${Math.round((sentCount/customers.length)*100)}% success)${' '.repeat(30 - (sentCount.toString().length + failedCount.toString().length))}║
╚══════════════════════════════════════════════════════════════════╝`);
  
      return NextResponse.json(
        { message: "Campaign created successfully", campaign },
        { status: 201 }
      );
    } catch (validationError) {
      logger.error(`Validation error in campaign creation`, validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    logger.error(`Failed to create campaign`, error);
    return NextResponse.json(
      { error: "Failed to create campaign", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Allow access even if not authenticated, but with limited functionality
  const userId = session?.user?.id || 'system';

  try {
    await connectDB();
    
    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search') || '';

    // Build query to get both user-specific campaigns and system campaigns
    const query: any = { 
      $or: [
        { userId: userId },
        { userId: 'system' }
      ]
    };
    
    // Add search functionality
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Get total count for pagination
    const totalCount = await Campaign.countDocuments(query);
    
    // Fetch campaigns with pagination
    const campaigns = await Campaign.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    logger.debug(`Retrieved ${campaigns.length}/${totalCount} campaigns`);

    // Calculate stats
    const campaignStats = campaigns.map(campaign => ({
      ...campaign,
      successRate: campaign.sentCount > 0 
        ? ((campaign.sentCount / (campaign.sentCount + campaign.failedCount)) * 100).toFixed(2)
        : 0
    }));

    return NextResponse.json({
      campaigns: campaignStats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit
      }
    }, { status: 200 });

  } catch (error) {
    logger.error(`Error fetching campaigns`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}