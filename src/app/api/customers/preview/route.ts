import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import { Customer } from '@/models/Customer';
import { z } from 'zod';

const ruleSchema = z.object({
  field: z.enum([
    'spend',
    'visits',
    'orders',
    'avg_order_value',
    'clv',
    'customer_since',
    'lastActive',
    'last_order',
    'preferred_category',
    'source'
  ]),
  operator: z.enum(['>', '<', '=', '>=', '<=', 'contains', 'startsWith', 'endsWith']),
  value: z.string(),
  connector: z.enum(['AND', 'OR']).optional(),
});

export async function POST(request: Request) {
  try {
    await connectDB();
    const { rules } = await request.json();
    const validatedRules = z.array(ruleSchema).parse(rules);

    const query: any = {};
    validatedRules.forEach((rule, index) => {
      const { field, operator, value } = rule;
      let condition: any;

      // Handle different field types
      switch (field) {
        // Numeric fields
        case 'spend':
        case 'avg_order_value':
        case 'clv':
          condition = { [field]: { [`$${operatorMap(operator)}`]: parseFloat(value) } };
          break;

        // Integer fields
        case 'visits':
        case 'orders':
          condition = { [field]: { [`$${operatorMap(operator)}`]: parseInt(value) } };
          break;

        // Date fields
        case 'customer_since':
        case 'lastActive':
        case 'last_order':
          condition = { [field]: { [`$${operatorMap(operator)}`]: new Date(value) } };
          break;

        // String fields
        case 'preferred_category':
        case 'source':
          if (operator === 'contains') {
            condition = { [field]: { $regex: value, $options: 'i' } };
          } else if (operator === 'startsWith') {
            condition = { [field]: { $regex: `^${value}`, $options: 'i' } };
          } else if (operator === 'endsWith') {
            condition = { [field]: { $regex: `${value}$`, $options: 'i' } };
          } else {
            condition = { [field]: { [`$${operatorMap(operator)}`]: value } };
          }
          break;
      }

      // Handle query connectors
      if (index === 0) {
        query.$and = [condition];
      } else {
        const connector = validatedRules[index - 1].connector || 'AND';
        if (connector === 'AND') {
          query.$and.push(condition);
        } else {
          query.$or = query.$or || [];
          query.$or.push(condition);
        }
      }
    });

    const count = await Customer.countDocuments(query);
    return NextResponse.json({ count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error previewing audience:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function operatorMap(operator: string) {
  const map: { [key: string]: string } = {
    '>': 'gt',
    '<': 'lt',
    '=': 'eq',
    '>=': 'gte',
    '<=': 'lte',
    'contains': 'regex',
    'startsWith': 'regex',
    'endsWith': 'regex',
  };
  return map[operator] || 'eq';
}