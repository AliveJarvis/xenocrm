// 'use client';

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { signIn } from 'next-auth/react';
// import { FcGoogle } from 'react-icons/fc';

// export default function SignIn() {

// const handleSignIn = async () => {
//   try {
//     await signIn('google', {
//       callbackUrl: '/dashboard',
//     });
//   } catch (error) {
//     console.error('Sign in failed:', error);
//   }
// };


//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-100">
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle className="text-2xl text-center">Sign In to Xeno CRM</CardTitle>
//         </CardHeader>
//         <CardContent className="flex justify-center">
//           <Button
//             onClick={handleSignIn}
//             className="flex items-center space-x-2"
//             variant="outline"
//             size="lg"
//           >
//             <FcGoogle size={24} />
//             <span>Sign in with Google</span>
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }








'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

export default function SignIn() {
  const handleSignIn = async () => {
    try {
      await signIn('google', {
        callbackUrl: '/dashboard',
      });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x">
      <Card className="w-full max-w-md shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white/95 backdrop-blur-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-3xl font-bold text-center text-indigo-600">
            Sign In to XENO CRM
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Button
            onClick={handleSignIn}
            className="flex items-center space-x-3 bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-full shadow-md"
            variant="outline"
            size="lg"
          >
            <FcGoogle size={28} />
            <span>Sign in with Google</span>
          </Button>
        </CardContent>
      </Card>
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