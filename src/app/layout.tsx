import { Inter } from "next/font/google";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/[...nextauth]";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Xeno CRM Platform",
  description: "Mini CRM for customer segmentation and campaigns",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  console.log(session);
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        <Toaster />        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          {session ? (
            <Link href={"/dashboard"}>
              <div className="text-xl font-bold text-primary">
                {session.user.name}
              </div>
            </Link>
          ) : (
            <Link href={"/"}>
              <div className="text-xl font-bold text-primary">Xeno CRM</div>
            </Link>
          )}

          <div className="space-x-4">
            {session ? (
              <>
                <Link href="/dashboard/segments">
                  <Button variant="ghost">Segments</Button>
                </Link>
                <Link href="/dashboard/campaigns">
                  <Button variant="ghost">Campaigns</Button>
                </Link>
                <Link href="/api/auth/signout">
                  <Button variant="outline">Sign Out</Button>
                </Link>
              </>
            ) : (
              <Link href="/api/auth/signin">
                <Button>Sign In with Google</Button>
              </Link>
            )}
          </div>
        </nav>
        <main className="container mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
