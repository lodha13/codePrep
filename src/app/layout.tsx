
import type { Metadata } from "next";
import { Inter, Space_Grotesk, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontHeading = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading" });
const fontMono = Source_Code_Pro({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
    title: "CodePrep Pro",
    description: "The modern platform for coding assessments.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn(
                "min-h-screen bg-background font-sans antialiased",
                fontSans.variable,
                fontHeading.variable,
                fontMono.variable
            )}>
                <AuthProvider>
                    {children}
                </AuthProvider>
                <Toaster />
            </body>
        </html>
    );
}
