'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  generateMessageSuggestions,
  generateObjectiveMessages, 
  generateCampaignObjective, 
  parseSegmentRules,
  autoTagCampaign 
} from '@/lib/ai';

type Rule = {
  field: string;
  operator: string;
  value: string;
  connector?: 'AND' | 'OR';
};

export default function SegmentForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rules, setRules] = useState<Rule[]>([{ field: 'spend', operator: '>', value: '', connector: 'AND' }]);
  const [audienceSize, setAudienceSize] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState('');
  const toast = useToast();

  const fields = [
    { value: 'spend', label: 'Total Spend (INR)', type: 'number' },
    { value: 'visits', label: 'Number of Visits', type: 'number' },
    { value: 'inactiveDays', label: 'Inactive Days', type: 'number' },
    { value: 'orders', label: 'Orders', type: 'number' },
    { value: 'avg_order_value', label: 'Avg Order Value (INR)', type: 'number' },
    { value: 'clv', label: 'Customer Lifetime Value (INR)', type: 'number' },
    { value: 'customer_since', label: 'Customer Since', type: 'date' },
    { value: 'lastActive', label: 'Last Active', type: 'date' },
    { value: 'last_order', label: 'Last Order', type: 'date' },
    { value: 'preferred_category', label: 'Preferred Category', type: 'enum', options: ['Clothing', 'Electronics', 'Home', 'Beauty', 'Sports'] },
    { value: 'source', label: 'Source', type: 'enum', options: ['Organic', 'Paid', 'Referral', 'Social'] },
  ];

  const operators = ['>', '<', '=', '>=', '<='];

  const addRule = () => {
    setRules([...rules, { field: 'spend', operator: '>', value: '', connector: 'AND' }]);
  };

  const updateRule = (index: number, key: keyof Rule, value: string) => {
    const newRules = [...rules];
    if (key === 'connector' && (value === 'AND' || value === 'OR')) {
      newRules[index][key] = value;
    } else if (key !== 'connector') {
      newRules[index][key] = value;
    }
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const generateRulesFromAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt to generate rules');
      return;
    }

    try {
      const generatedRules = await parseSegmentRules(aiPrompt);
      if (generatedRules.length === 0) {
        toast.warning('The prompt could not be parsed into valid rules. Try a different prompt.');
        return;
      }

      setRules(generatedRules);
      toast.success('Rules generated from prompt successfully');
    } catch (error) {
      toast.error('Failed to generate rules from prompt');
    }
  };

  const generateObjective = async () => {
    if (rules.some((rule) => !rule.value)) {
      toast.error('Please fill in all rule values before generating an objective');
      return;
    }

    try {
      const objective = await generateCampaignObjective(rules);
      setName(objective);
      toast.success('Campaign objective generated successfully');
    } catch (error) {
      toast.error('Failed to generate campaign objective');
    }
  };

  const generateMessagesFromRules = async () => {
    if (rules.some((rule) => !rule.value)) {
      toast.error('Please fill in all rule values before generating messages');
      return;
    }

    try {
      await toast.promise(
        (async () => {
          const generatedMessages = await generateMessageSuggestions(rules);
          if (generatedMessages.length === 0) {
            throw new Error('No messages generated');
          }

          setMessages(generatedMessages);
          setSelectedMessage(generatedMessages[0] || '');
          return generatedMessages;
        })(),
        {
          loading: 'Generating message suggestions...',
          success: 'Message suggestions generated successfully',
          error: (error: unknown) => {
            if (error instanceof Error && error.message === 'No messages generated') {
              return 'No messages generated. Try adjusting the rules';
            }
            return 'Failed to generate message suggestions';
          },
    });
    } catch (error) {
      // Handled by toast.promise
    }
  };

  const generateMessagesFromObjective = async () => {
    if (!name.trim()) {
      toast.error('Please enter or generate a campaign objective to generate messages');
      return;
    }

    try {
      await toast.promise(
        (async () => {
          const generatedMessages = await generateObjectiveMessages(name);
          if (generatedMessages.length === 0) {
            throw new Error('No messages generated');
          }

          setMessages(generatedMessages);
          setSelectedMessage(generatedMessages[0] || '');
          return generatedMessages;
        })(),
        {
          loading: 'Generating message suggestions...',
          success: 'Message suggestions generated successfully',
          error: (error: unknown) => {
            if (error instanceof Error && error.message === 'No messages generated') {
              return 'No messages generated. Try a different objective.';
            }
            return 'Failed to generate message suggestions';
          },
        });
    } catch (error) {
      // Handled by toast.promise
    }
  };

  const previewAudience = async () => {
    try {
      await toast.promise(
        (async () => {
          const response = await fetch('/api/customers/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules }),
          });

          if (!response.ok) {
            throw new Error('Failed to preview audience');
          }

          const data = await response.json();
          setAudienceSize(data.count);
          return data.count;
        })(),
        {
          loading: 'Calculating audience size...',
          success: (count) => `Audience size: ${count} customers`,
          error: 'Failed to preview audience size'
        }
      );
    } catch (error) {
      // Handled by toast.promise
    }
  };

  const saveSegment = async () => {
    if (!name || rules.some((rule) => !rule.value)) {
      toast.error('Please fill in all fields');
      return false;
    }

    try {
      return await toast.promise(
        (async () => {
          const tag = selectedMessage ? await autoTagCampaign(rules, selectedMessage) : 'General';

          const segmentResponse = await fetch('/api/segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, rules, audienceSize, message: selectedMessage }),
          });

          if (!segmentResponse.ok) {
            throw new Error('Failed to create segment');
          }

          const segment = await segmentResponse.json();

          const campaignResponse = await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              segmentId: segment._id, 
              name: `Campaign for ${name}`, 
              message: selectedMessage, 
              tag 
            }),
          });

          if (!campaignResponse.ok) {
            throw new Error('Failed to initiate campaign');
          }

          return true;
        })(),
        {
          loading: 'Creating segment and initiating campaign...',
          success: 'Segment created and campaign initiated successfully!',
          error: 'Failed to save segment or initiate campaign'
        }
      );
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveSegment();
    if (success) {
      router.push('/dashboard/campaigns');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Segment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Campaign Objective</Label>
            <div className="flex space-x-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Re-engage high-spending inactive customers"
                required
              />
              <Button type="button" onClick={generateObjective}>
                Generate Objective
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="aiPrompt">Generate Rules with AI</Label>
            <div className="flex space-x-2">
              <Input
                id="aiPrompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., People who haven't shopped in 6 months and spent over 5000"
              />
              <Button type="button" onClick={generateRulesFromAI}>
                Generate Rules
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rules</h3>
            {rules.map((rule, index) => {
              const field = fields.find(f => f.value === rule.field);
              return (
                <div key={index} className="flex items-center space-x-2">
                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateRule(index, 'field', value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateRule(index, 'operator', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field?.type === 'enum' ? (
                    <Select
                      value={rule.value}
                      onValueChange={(value) => updateRule(index, 'value', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Value" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="w-32"
                      type={field?.type || 'text'}
                    />
                  )}
                  {index < rules.length - 1 && (
                    <Select
                      value={rule.connector}
                      onValueChange={(value) => updateRule(index, 'connector', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Connector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">AND</SelectItem>
                        <SelectItem value="OR">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeRule(index)}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" onClick={addRule}>
              Add Rule
            </Button>
          </div>
          <div>
            <Label>Message Suggestions</Label>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button type="button" onClick={generateMessagesFromRules}>
                  Generate from Rules
                </Button>
                <Button type="button" onClick={generateMessagesFromObjective}>
                  Generate from Objective
                </Button>
              </div>
              {messages.length > 0 && (
                <Select
                  value={selectedMessage}
                  onValueChange={setSelectedMessage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a message" />
                  </SelectTrigger>
                  <SelectContent>
                    {messages.map((msg, index) => (
                      <SelectItem key={index} value={msg}>
                        {msg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="flex space-x-4">
            <Button type="button" onClick={previewAudience}>
              Preview Audience
            </Button>
            <Button type="submit">Save Segment</Button>
          </div>
          {audienceSize !== null && (
            <p className="text-sm text-gray-500">Audience Size: {audienceSize} customers</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
