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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign In to Xeno CRM</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            onClick={handleSignIn}
            className="flex items-center space-x-2"
            variant="outline"
            size="lg"
          >
            <FcGoogle size={24} />
            <span>Sign in with Google</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}