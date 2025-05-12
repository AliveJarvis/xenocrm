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
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        <Toaster />{" "}
        <nav className="bg-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">

          {session ? (
            <Link href={"/dashboard"}>
              <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-105 transition-transform duration-300">
                Xeno CRM
              </div>
            </Link>
          ) : (
            <Link href={"/"}>
              <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-105 transition-transform duration-300">
                Xeno CRM
              </div>
            </Link>
          )}

          <div className="space-x-4">
            {session ? (
              <>
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

// import { Inter } from "next/font/google";
// import "./globals.css";
// import { Button } from "@/components/ui/button";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/auth/[...nextauth]";
// import Link from "next/link";
// import { Toaster } from "@/components/ui/sonner";

// const inter = Inter({ subsets: ["latin"] });

// export const metadata = {
//   title: "Xeno CRM Platform",
//   description: "Mini CRM for customer segmentation and campaigns",
// };

// export default async function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const session = await getServerSession(authOptions);

//   return (
//     <html lang="en">
//       <body className={`${inter.className} min-h-screen bg-gray-50`}>
//         <Toaster />
//         <nav className="bg-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">
//           <Link href="/">
//             <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-105 transition-transform duration-300">
//               XENO CRM
//             </div>
//           </Link>
//           <div className="space-x-4">
//             {session ? (
//               <Link href="/api/auth/signout">
//                 <Button
//                   variant="outline"
//                   className="text-indigo-600 border-indigo-600 hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
//                 >
//                   Sign Out
//                 </Button>
//               </Link>
//             ) : (
//               <Link href="/api/auth/signin">
//                 <Button
//                   className="bg-gradient-to-r from-indigo-600 to-purple-500 text-white hover:scale-105 transition-all duration-300"
//                 >
//                   Sign In with Google
//                 </Button>
//               </Link>
//             )}
//           </div>
//         </nav>
//         <main className="container mx-auto p-6">{children}</main>
//       </body>
//     </html>
//   );
// }
