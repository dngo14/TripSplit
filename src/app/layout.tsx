
import type {Metadata} from 'next';
import { Inter, Geist_Mono } from 'next/font/google'; // Changed Geist to Inter
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ // Changed from geistSans to inter
  variable: '--font-inter', // Changed variable name
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TripSplit',
  description: 'Split trip expenses with ease.',
  // PWA related meta tags
  applicationName: 'TripSplit',
  appleWebApp: {
    capable: true,
    title: 'TripSplit',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
    date: false,
    url: false,
  },
  themeColor: '#17191C', // HSL(220, 10%, 10%) converted to hex for --background
  // Add more manifest-related links if you set up a manifest.json
  // manifest: '/manifest.json', 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* mobileWebAppCapable is not a standard Next.js metadata field, 
            better handled by manifest.json or specific PWA setup.
            theme-color is now handled by the metadata object.
        */}
      </head>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
