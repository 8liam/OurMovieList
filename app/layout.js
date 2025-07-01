import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/header";
import prisma from "../lib/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Analytics } from "@vercel/analytics/next"
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "OurMovieList | Create movie lists with friends",
  description: "Keep track of what films to watch with your friends, loved ones or even just yourself.",
};

export default async function RootLayout({ children }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => { /* Do nothing */ },
        remove: () => { /* Do nothing */ },
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  let pendingInvitations = [];
  if (currentUser) {
    pendingInvitations = await prisma.groupMember.findMany({
      where: {
        userId: currentUser.id,
        hasAcceptedInvite: false,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            createdBy: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <Header currentUser={currentUser} pendingInvitations={pendingInvitations} />
        <main>{children}</main>
      </body>
    </html>
  );
}
