'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
// import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Campaign {
  _id: string;
  name: string;
  tag: string;
  audienceSize: number;
  sentCount: number;
  failedCount: number;
  successRate: string;
  totalMessages: number;
  createdAt: string;
  status: string;
}

// interface CampaignWithSummary extends Campaign {
//   aiSummary: string;
// }

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

// interface OverallStats {
//   totalCampaigns: number;
//   totalMessagesSent: number;
//   totalMessagesFailed: number;
//   averageAudienceSize: number;
// }

export default function ViewCampaignList() {
  // const router = useRouter();
  const toast = useToast();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  });
  // const [stats, setStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignSummary, setCampaignSummary] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...("all" !== 'all' && { status: "all" })
      });

      const response = await fetch(`/api/campaigns?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }      const data = await response.json();
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
      // setStats(data.stats);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [currentPage, limit, sortBy, sortOrder, "all"]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCampaigns();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // const getStatusBadgeVariant = (status: string) => {
  //   switch (status) {
  //     case 'active':
  //       return 'default';
  //     case 'completed':
  //       return 'secondary';
  //     case 'failed':
  //       return 'destructive';
  //     default:
  //       return 'outline';
  //   }
  // };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to fetch campaign summary
  const fetchCampaignSummary = async (campaignId: string) => {
    if (campaignSummary[campaignId] || loadingSummary[campaignId]) {
      return;
    }

    try {
      setLoadingSummary(prev => ({ ...prev, [campaignId]: true }));
      const response = await fetch(`/api/campaigns/${campaignId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign summary');
      }
      
      const data = await response.json();
      setCampaignSummary(prev => ({ 
        ...prev, 
        [campaignId]: data.campaign.aiSummary 
      }));
    } catch (error) {
      console.error('Error fetching campaign summary:', error);
      toast.error('Failed to fetch campaign summary');
    } finally {
      setLoadingSummary(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Campaigns</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            {/* <div className="w-40"> */}
              {/* <Label htmlFor="status">Status</Label> */}
              {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select> */}
            {/* </div> */}
            <div className="w-32">
              <Label htmlFor="limit">Per Page</Label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                <SelectTrigger id="limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Campaign Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No campaigns found. Create your first campaign to get started.
            </div>
          ) : (
            <Table>
              <TableCaption>
                Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} campaigns
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Tag
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('audienceSize')} className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Audience Size
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Messages Sent</TableHead>
                  <TableHead>Messages Failed</TableHead>
                  <TableHead onClick={() => handleSort('successRate')} className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Success Rate
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Created At
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign._id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{campaign.tag || 'General'}</Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => fetchCampaignSummary(campaign._id)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium">Campaign Summary</h4>
                              {loadingSummary[campaign._id] ? (
                                <p className="text-sm text-gray-500">Loading summary...</p>
                              ) : campaignSummary[campaign._id] ? (
                                <p className="text-sm">{campaignSummary[campaign._id]}</p>
                              ) : (
                                <p className="text-sm text-gray-500">Click to load summary</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell>{campaign.audienceSize}</TableCell>
                    <TableCell>{campaign.sentCount}</TableCell>
                    <TableCell>{campaign.failedCount}</TableCell>
                    <TableCell>{campaign.successRate}%</TableCell>
                    <TableCell>{formatDate(campaign.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}