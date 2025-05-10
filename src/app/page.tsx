import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Xeno CRM</h1>
      <p className="text-lg text-gray-600 mb-8">
        Build customer segments, create personalized campaigns, and gain intelligent insights.
      </p>
      {session ? (
        <Link href="/dashboard/segments">
          <Button size="lg">Go to Dashboard</Button>
        </Link>
      ) : (
        <Link href="/auth/signin">
          <Button size="lg">Sign In with Google</Button>
        </Link>
      )}
    </div>
  );
}