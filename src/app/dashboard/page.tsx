import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import connectDB from "@/lib/mongoose";
import Customer from "@/models/Customer";
import Campaign from "@/models/Campaign";
import CommunicationLog from "@/models/CommunicationLog";
import Link from "next/link";
import { Users, Megaphone, Activity } from "lucide-react";

async function getDashboardMetrics(userId: string) {
  await connectDB();
  const [customerCount, campaignCount, recentLogs] = await Promise.all([
    Customer.countDocuments(),
    Campaign.countDocuments({ userId }),
    CommunicationLog.find({
      customerId: {
        $in: await Campaign.find({ userId }).distinct("customers"),
      },
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .select("message status timestamp"),
  ]);

  return { customerCount, campaignCount, recentLogs };
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-red-600">
          Please sign in to access the dashboard
        </h1>
        <Link href="/auth/sigin">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  const { customerCount, campaignCount, recentLogs } =
    await getDashboardMetrics(session.user.id);
    console.log(customerCount, campaignCount, recentLogs);
    
    
  return (
    <div className="py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">
          Welcome, {session.user.name || "User"}!
        </h1>
        <div className="space-x-4">
          <Link href="/dashboard/segments">
            <Button variant="default">Create Segment</Button>
          </Link>
          <Link href="/dashboard/campaigns">
            <Button variant="outline">View Campaigns</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
            <p className="text-xs text-muted-foreground">
              All registered customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Campaigns
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignCount}</div>
            <p className="text-xs text-muted-foreground">
              Campaigns created by you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent campaign messages
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaign Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground">No recent activity found.</p>
          ) : (
            <ul className="space-y-4">
              {recentLogs.map((log: any, index: number) => (
                <li key={index} className="flex justify-between items-center">
                  <span className="text-sm">{log.message.slice(0, 50)}...</span>
                  <span
                    className={`text-sm font-medium ${
                      log.status === "SENT" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {log.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
