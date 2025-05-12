'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  generateMessageSuggestions,
  generateCampaignObjective, 
  parseSegmentRules,
  autoTagCampaign 
} from '@/lib/ai';
import { PlusCircle, Trash2 } from 'lucide-react';
import UnsplashSelector from '@/components/unsplash';

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
    { value: 'orders', label: 'Orders', type: 'number' },
    { value: 'avg_order_value', label: 'Avg Order Value (INR)', type: 'number' },
    { value: 'clv', label: 'Customer Lifetime Value (INR)', type: 'number' },
    // { value: 'customer_since', label: 'Customer Since', type: 'date' },
    // { value: 'lastActive', label: 'Last Active', type: 'date' },
    // { value: 'last_order', label: 'Last Order', type: 'date' },
    { value: 'preferred_category', label: 'Preferred Category', type: 'enum', options: ['Electronics', 'Clothing', 'Home & Kitchen', 'Beauty', 'Books', 'Sports'] },
    { value: 'source', label: 'Source', type: 'enum', options: ['Organic', 'Ads', 'Referral', 'Social Media', 'Direct'] },
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
      if (key === 'value') {
        newRules[index][key] = value.toString();
      } else {
        newRules[index][key] = value;
        
        // When the field is changed to an enum type, automatically set operator to "="
        if (key === 'field') {
          const selectedField = fields.find(f => f.value === value);
          if (selectedField?.type === 'enum') {
            newRules[index].operator = '=';
          }
        }
      }
    }
    setRules(newRules);
    
    if (key === 'value') {
      console.log(`Rule ${index} ${key} updated to: "${value}"`);
    }
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

      // Clone the generated rules to ensure they're properly integrated into React state
      const formattedRules = generatedRules.map(rule => ({
        ...rule,
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        connector: rule.connector || 'AND'
      }));
      
      setRules(formattedRules);
      toast.success('Rules generated from prompt successfully');
    } catch (error) {
      console.log(error);
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
      console.log(error);
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
              console.log(error);
              return 'No messages generated. Try adjusting the rules';
            }
            return 'Failed to generate message suggestions';
          },
        }
      );
    } catch (error) {
      console.log(error);
    }
  };

  const previewAudience = async () => {
    try {
      await toast.promise(
        (async () => {
          console.log(rules);
          
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
      console.log(error);
      // Handled by toast.promise
    }
  };

  const saveSegment = async () => {
    if (!name || rules.some((rule) => !rule.value)) {
      toast.error('Please fill in all fields');
      return false;
    }

    try {
      // Log the rules being submitted for debugging
      console.log("Rules being submitted:", JSON.stringify(rules, null, 2));
      
      return await toast.promise(
        (async () => {
          const tag = selectedMessage ? await autoTagCampaign(rules, selectedMessage) : 'General';

          const segmentResponse = await fetch('/api/segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, rules, audienceSize, message: selectedMessage }),
          });

          if (!segmentResponse.ok) {
            console.log('Failed to create segment');            
            throw new Error('Failed to create segment');
          }

          const segmentData = await segmentResponse.json();
          console.log("Segment response:", segmentData);
          
          // Extract the segment object and its ID
          const segment = segmentData.segment || segmentData;
          const segmentId = segment?._id;
          console.log("Extracted segment:", segment);
          console.log("Using segmentId:", segmentId);
          
          if (!segmentId) {
            console.error("Missing segmentId in response:", segmentData);
            throw new Error('Missing segment ID in response');
          }

          // Log what we're about to send to the campaigns API
          const campaignRequestData = { 
            segmentId: segmentId, 
            name: `Campaign for ${name}`, 
            message: selectedMessage, 
            tag 
          };
          console.log("Sending to campaigns API:", campaignRequestData);

          const campaignResponse = await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignRequestData),
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
      console.log(error);
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
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Segment</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <Label htmlFor="aiPrompt" className="text-lg font-medium">Generate Rules with AI</Label>
          <div className="flex gap-3">
            <Input
              id="aiPrompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., People who haven't shopped in 6 months and spent over 5000"
              className="flex-1"
            />
            <Button type="button" onClick={generateRulesFromAI} className="transition-all hover:scale-105">
              Generate Rules
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Rules</h3>
          {rules.map((rule, index) => {
            const field = fields.find(f => f.value === rule.field);
            const isEnumField = field?.type === 'enum';
            
            return (
              <div key={index} className="flex items-center gap-3 rounded-md border p-4 bg-gray-50">
                <Select
                  value={rule.field}
                  onValueChange={(value) => updateRule(index, 'field', value)}
                >
                  <SelectTrigger className="w-48">
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
                  disabled={isEnumField}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {isEnumField ? (
                      <SelectItem value="=">=</SelectItem>
                    ) : (
                      operators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {op}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {field?.type === 'enum' ? (
                  <Select
                    value={rule.value}
                    onValueChange={(value) => updateRule(index, 'value', value)}
                  >
                    <SelectTrigger className="w-40">
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
                    className="w-40"
                    type={field?.type || 'text'}
                    key={`rule-value-${index}`}
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
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button 
            type="button" 
            variant="outline" 
            onClick={addRule}
            className="w-full justify-center gap-2 transition-all hover:scale-105"
          >
            <PlusCircle className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        <div className="space-y-4">
          <Label htmlFor="name" className="text-lg font-medium">Campaign Objective</Label>
          <div className="flex gap-3">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Re-engage high-spending inactive customers"
              required
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={generateObjective}
              className="transition-all hover:scale-105"
            >
              Generate Objective
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-medium">Message Suggestions</Label>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button 
                type="button" 
                onClick={generateMessagesFromRules}
                className="transition-all hover:scale-105"
              >
                Generate from Rules
              </Button>
            <UnsplashSelector />  
            </div>
            {messages.length > 0 && (
              <Select
                value={selectedMessage}
                onValueChange={setSelectedMessage}
              >
                <SelectTrigger className="w-full">
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

        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            type="button" 
            onClick={previewAudience}
            variant="outline"
            className="transition-all hover:scale-105"
          >
            Preview Audience
          </Button>
          <Button 
            type="submit"
            className="transition-all hover:scale-105"
          >
            Save Segment
          </Button>
        </div>
        {audienceSize !== null && (
          <p className="text-sm text-muted-foreground mt-2">
            Audience Size: {audienceSize} customers
          </p>
        )}
      </form>
    </div>
  );
}