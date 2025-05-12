// import { GoogleGenerativeAI } from '@google/generative-ai';

// const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

interface GeminiContent {
  parts: { text: string }[];
  role: 'user' | 'model';
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

async function callGeminiAPI(contents: GeminiContent[], maxOutputTokens: number = 300, temperature: number = 0.7): Promise<GeminiResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.message || response.statusText}`);
  }

  return response.json();
}

export async function generateCampaignObjective(rules: { field: string; operator: string; value: string; connector?: 'AND' | 'OR' }[]): Promise<string> {
  try {
    const ruleDescription = rules
      .map((rule, index) => {
        const connector = index < rules.length - 1 ? ` ${rule.connector} ` : '';
        return `${rule.field} ${rule.operator} ${rule.value}${connector}`;
      })
      .join('');

    const systemPrompt = `
      You are an AI assistant that generates a concise campaign objective (10-20 words) for a CRM campaign based on customer segment rules. The objective should reflect the segment's characteristics and intent.
      Rules are based on:
      - spend (Total Spend in INR, numeric)
      - visits (Number of Visits, integer)
      - inactiveDays (Days since last activity, derived from lastActive, integer)
      - orders (Number of Orders, integer)
      - avg_order_value (Average Order Value in INR, numeric)
      - clv (Customer Lifetime Value in INR, numeric)
      - customer_since (Date, ISO format)
      - lastActive (Date, ISO format)
      - last_order (Date, ISO format)
      - preferred_category (String: Clothing, Electronics, Home, Beauty, Sports)
      - source (String: Organic, Paid, Referral, Social)
      Example:
      Rules: spend > 10000 AND inactiveDays > 180
      Output: "Re-engage high-spending inactive customers"
      Return the objective as a plain string.
      If no suitable objective can be determined, return "General campaign".
    `;

    const userPrompt = `Generate a campaign objective for a segment with rules: ${ruleDescription}`;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 50, 0.5);
    const content = response.candidates[0]?.content?.parts[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    return content.trim() || 'General campaign';
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'General campaign';
  }
}

export async function parseSegmentRules(prompt: string): Promise<{
  field: string;
  operator: string;
  value: string;
  connector?: 'AND' | 'OR';
}[]> {
  try {
    const systemPrompt = `
      You are an AI assistant that converts natural language prompts into structured customer segment rules for a CRM platform. The rules should be based on:
      - spend (Total Spend in INR, numeric)
      - visits (Number of Visits, integer)
      - inactiveDays (Days since last activity, derived from lastActive, integer)
      - orders (Number of Orders, integer)
      - avg_order_value (Average Order Value in INR, numeric)
      - clv (Customer Lifetime Value in INR, numeric)
      - customer_since (Date, ISO format)
      - lastActive (Date, ISO format)
      - last_order (Date, ISO format)
      - preferred_category (String: Clothing, Electronics, Home, Beauty, Sports)
      - source (String: Organic, Paid, Referral, Social)
      Supported operators: >, <, =, >=, <=
      Connectors: AND, OR
      For inactiveDays, convert time periods (e.g., "6 months" to "180") or use numeric values directly.
      Current date: 2025-05-10
      Output the rules as a JSON array of objects with fields: field, operator, value, connector (optional for the last rule).
      Example prompt: "Customers who haven’t shopped in 6 months and spent over 5000"
      Example output: [
        { "field": "inactiveDays", "operator": ">", "value": "180", "connector": "AND" },
        { "field": "spend", "operator": ">", "value": "5000" }
      ]
      If the prompt is invalid or cannot be parsed, return an empty array.
      Return the result as a JSON array string.
    `;

    const userPrompt = prompt;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 200, 0.5);
    const content = response.candidates[0]?.content?.parts[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const rules = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(rules)) {
        throw new Error('Invalid rules format');
      }

      const validFields = ['spend', 'visits', 'inactiveDays', 'orders', 'avg_order_value', 'clv', 'customer_since', 'lastActive', 'last_order', 'preferred_category', 'source'];
      const validOperators = ['>', '<', '=', '>=', '<='];
      const validConnectors = ['AND', 'OR'];

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (
          !validFields.includes(rule.field) ||
          !validOperators.includes(rule.operator) ||
          typeof rule.value !== 'string' ||
          (i < rules.length - 1 && !validConnectors.includes(rule.connector))
        ) {
          throw new Error('Invalid rule structure');
        }
      }

      return rules;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw content:', content);
      return [];
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return [];
  }
}

export async function generateMessageSuggestions(rules: { field: string; operator: string; value: string; connector?: 'AND' | 'OR' }[]): Promise<string[]> {
  try {
    const ruleDescription = rules
      .map((rule, index) => {
        const connector = index < rules.length - 1 ? ` ${rule.connector} ` : '';
        return `${rule.field} ${rule.operator} ${rule.value}${connector}`;
      })
      .join('');

    const systemPrompt = `
      You are an AI assistant that generates personalized message suggestions for a CRM campaign based on customer segment rules. The rules are based on:
      - spend (Total Spend in INR, numeric)
      - visits (Number of Visits, integer)
      - inactiveDays (Days since last activity, derived from lastActive, integer)
      - orders (Number of Orders, integer)
      - avg_order_value (Average Order Value in INR, numeric)
      - clv (Customer Lifetime Value in INR, numeric)
      - customer_since (Date, ISO format)
      - lastActive (Date, ISO format)
      - last_order (Date, ISO format)
      - preferred_category (String: Clothing, Electronics, Home, Beauty, Sports)
      - source (String: Organic, Paid, Referral, Social)
      Generate 3 concise message suggestions (each 20-50 words) tailored to the segment. Messages should be engaging and relevant to the segment's characteristics.
      Example rules: spend > 10000 AND inactiveDays > 180
      Example output: [
        "Miss us? Enjoy 20% off your next purchase!",
        "High spenders, come back for exclusive deals!",
        "Re-engage now and save big on your favorites!"
      ]
      Return the messages as a JSON array of strings.
    `;

    const userPrompt = `Generate message suggestions for a segment with rules: ${ruleDescription}`;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 300, 0.7);
    const content = response.candidates[0]?.content?.parts[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsedMessages = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsedMessages) || !parsedMessages.every((msg) => typeof msg === 'string')) {
        throw new Error('Invalid messages format');
      }
      return parsedMessages;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw content:', content);
      return [];
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return [];
  }
}

export async function generateObjectiveMessages(objective: string): Promise<string[]> {
  try {
    const systemPrompt = `
      You are an AI assistant that generates 2-3 concise message suggestions (each 20-50 words) for a CRM campaign based on a given campaign objective. Messages should be engaging, actionable, and aligned with the objective.
      Example objective: "Re-engage high-spending inactive customers"
      Example output: [
        "Miss us? Enjoy 15% off your next purchase!",
        "High spenders, return for exclusive deals today!",
        "Come back and save big on your favorite items!"
      ]
      Return the messages as a JSON array of strings.
      If the objective is unclear, return an empty array.
    `;

    const userPrompt = `Generate message suggestions for the campaign objective: ${objective}`;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 200, 0.7);
    const content = response.candidates[0]?.content?.parts[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsedMessages = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsedMessages) || !parsedMessages.every((msg) => typeof msg === 'string')) {
        throw new Error('Invalid messages format');
      }
      return parsedMessages;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw content:', content);
      return [];
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return [];
  }
}

export async function autoTagCampaign(rules: { field: string; operator: string; value: string; connector?: 'AND' | 'OR' }[], message: string): Promise<string> {
  try {
    const ruleDescription = rules
      .map((rule, index) => {
        const connector = index < rules.length - 1 ? ` ${rule.connector} ` : '';
        return `${rule.field} ${rule.operator} ${rule.value}${connector}`;
      })
      .join('');

    const systemPrompt = `
      You are an AI assistant that assigns a single descriptive tag to a CRM campaign based on its audience segment rules and message content. Tags should be concise (1-3 words) and reflect the campaign's intent (e.g., "Win-back", "High Value", "Frequent Visitors").
      Rules are based on:
      - spend (Total Spend in INR, numeric)
      - visits (Number of Visits, integer)
      - inactiveDays (Days since last activity, derived from lastActive, integer)
      - orders (Number of Orders, integer)
      - avg_order_value (Average Order Value in INR, numeric)
      - clv (Customer Lifetime Value in INR, numeric)
      - customer_since (Date, ISO format)
      - lastActive (Date, ISO format)
      - last_order (Date, ISO format)
      - preferred_category (String: Clothing, Electronics, Home, Beauty, Sports)
      - source (String: Organic, Paid, Referral, Social)
      Example:
      Rules: spend > 10000 AND inactiveDays > 180
      Message: "Miss us? Enjoy 20% off your next purchase!"
      Output: "Win-back"
      Return the tag as a plain string.
      If no suitable tag can be determined, return "General".
    `;

    const userPrompt = `Assign a tag to a campaign with rules: ${ruleDescription} and message: ${message}`;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 50, 0.5);
    const content = response.candidates[0]?.content?.parts[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    return content.trim() || 'General';
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'General';
  }
}

export async function summarizeCampaignPerformance(campaign: {
  name: string;
  audienceSize: number;
  sent: number;
  failed: number;
}): Promise<string> {
  try {
    const prompt = `
      Campaign: ${campaign.name}
      Audience Size: ${campaign.audienceSize}
      Messages Sent: ${campaign.sent}
      Messages Failed: ${campaign.failed}
    `;

    const systemPrompt = `
      You are an AI assistant that summarizes CRM campaign performance in a concise, human-readable format (50-100 words). Highlight key metrics (audience size, sent, failed) and provide a brief insight or recommendation.
      Example output: "The campaign reached 80% of its 500-customer audience, with 400 messages sent and 20 failures. High engagement suggests strong targeting, but optimizing delivery could reduce failures."
      Return the summary as a plain string.
    `;

    const userPrompt = `Summarize the performance of the following campaign: ${prompt}`;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 150, 0.5);
    const content = response.candidates[0]?.content?.parts[0]?.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    return content.trim();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'Failed to generate summary';
  }
}

export async function generateMessageContent(segment: { name: string; description?: string; filter?: any }) {
  try {
    const prompt = `Generate a personalized marketing message for a customer segment with the following details:
    Name: ${segment.name}
    Description: ${segment.description || 'No description provided'}
    Filter Criteria: ${JSON.stringify(segment.filter || {})}
    
    The message should be:
    1. Concise and engaging
    2. Relevant to the segment's characteristics
    3. Include a clear call to action
    4. No more than 160 characters for SMS compatibility
    5. Professional and friendly in tone`;

    const contents: GeminiContent[] = [
      {
        parts: [{ text: prompt }],
        role: 'user',
      },
    ];

    const response = await callGeminiAPI(contents, 200, 0.7);
    const messageContent = response.candidates[0]?.content?.parts[0]?.text;
    
    // Ensure message is not too long
    return messageContent.length > 160 ? messageContent.substring(0, 157) + '...' : messageContent;
  } catch (error) {
    console.error('Error generating message content:', error);
    return 'Thank you for being our valued customer! We have special offers waiting for you. Check them out now!';
  }
}