// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/app/api/auth/[...nextauth]';
// import { Button } from '@/components/ui/button';
// import Link from 'next/link';

// export default async function Home() {
//   const session = await getServerSession(authOptions);

//   return (
//     <div className="text-center py-16">
//       <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Xeno CRM</h1>
//       <p className="text-lg text-gray-600 mb-8">
//         Build customer segments, create personalized campaigns, and gain intelligent insights.
//       </p>
//       {session ? (
//         <Link href="/dashboard/segments">
//           <Button size="lg">Go to Dashboard</Button>
//         </Link>
//       ) : (
//         <Link href="/auth/signin">
//           <Button size="lg">Sign In with Google</Button>
//         </Link>
//       )}
//     </div>
//   );
// }


"use client"
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x">
      <div className="text-center py-16 px-4 w-full">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
            XENO CRM
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-10 font-light max-w-3xl mx-auto">
          Build customer segments, create personalized campaigns, and gain intelligent insights.
        </p>
        {session ? (
          <Link href="/dashboard/segments">
            <Button 
              size="lg" 
              className="bg-white text-indigo-600 hover:bg-white/90 hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-full shadow-lg"
            >
              Go to Dashboard
            </Button>
          </Link>
        ) : (
          <Link href="/auth/signin">
            <Button 
              size="lg" 
              className="bg-white text-indigo-600 hover:bg-white/90 hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-full shadow-lg"
            >
              Sign In with Google
            </Button>
          </Link>
        )}
      </div>
      <style jsx global>{`
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  );
}