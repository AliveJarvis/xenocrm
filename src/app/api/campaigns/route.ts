import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Campaign from "@/models/Campaign";
import Segment from "@/models/Segment";
import { Customer } from "@/models/Customer";
import { vendorApi } from "@/lib/vendorApi";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

const campaignSchema = z.object({
  segmentId: z.string(),
  name: z.string().min(1, "Name is required"),
});
function buildQueryFromRules(rules: any[]) {
  const query: any = {};
  const andConditions: any[] = [];
  const orConditions: any[] = [];

  rules.forEach((rule, index) => {
    const condition: any = {};
    
    // Convert the value to appropriate type based on the field
    let value = rule.value;
    if (rule.field === 'spend' || rule.field === 'visitCount') {
      value = parseInt(value, 10);
    }

    // Build the condition based on the operator
    switch (rule.operator) {
      case '>':
        condition[rule.field] = { $gt: value };
        break;
      case '<':
        condition[rule.field] = { $lt: value };
        break;
      case '=':
        condition[rule.field] = value;
        break;
      case '>=':
        condition[rule.field] = { $gte: value };
        break;
      case '<=':
        condition[rule.field] = { $lte: value };
        break;
      case '!=':
        condition[rule.field] = { $ne: value };
        break;
      default:
        condition[rule.field] = value;
    }

    // Handle connectors (AND/OR)
    if (index === 0 || rules[index - 1].connector === 'AND') {
      andConditions.push(condition);
    } else if (rules[index - 1].connector === 'OR') {
      if (andConditions.length > 0) {
        orConditions.push({ $and: [...andConditions] });
        andConditions.length = 0;
      }
      orConditions.push(condition);
    }
  });

  // Add any remaining AND conditions
  if (andConditions.length > 0) {
    if (orConditions.length > 0) {
      orConditions.push({ $and: andConditions });
    } else {
      return { $and: andConditions };
    }
  }

  // If we have OR conditions, use them
  if (orConditions.length > 0) {
    return { $or: orConditions };
  }

  return query;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  console.log("session: ", session);
  try {
    await connectDB();
    const body = await request.json();
    const { segmentId, name } = campaignSchema.parse(body);

    const segment = await Segment.findById(segmentId);
    console.log('segment: ', segment);
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }
    const query = buildQueryFromRules(segment.rules);
    console.log('Query built from rules:', JSON.stringify(query, null, 2));
    // Fetch customers matching segment rules (simplified)
    const customers = await Customer.find(query); // Replace with actual rule-based query
    console.log(`Found ${customers.length} customers matching the rules`);

    const campaign = await Campaign.create({
      userId: session.user.id, // Replace with actual user ID from session
      name,
      audienceSize: segment.audienceSize,
      sentCount: 0,
      failedCount: 0,
      customers: customers.map((c: any) => c._id),
      tag:segment.tag
    });

    // Send messages to customers
    let sentCount = 0;
    let failedCount = 0;
    for (const customer of customers) {      const result = await vendorApi.sendMessage(
        { id: customer._id, name: customer.name, email: customer.email },
        `${body?.message}`,
        campaign._id.toString()
      );
      if (result.status === "SENT") sentCount++;
      else failedCount++;
    }

    // Update campaign stats
    await Campaign.updateOne({ _id: campaign._id }, { sentCount, failedCount });

    return NextResponse.json(
      { message: "Campaign created successfully", campaign },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    
    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search') || '';

    // Build query
    const query: any = { userId: session.user.id };
    
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
      .lean(); // Use lean() for better performance

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
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}