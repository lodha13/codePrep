"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Code } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // AuthProvider and AuthRedirector will now handle all redirection logic.
            // No router.push needed here.
        } catch (err: any) {
            setError("Invalid email or password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
             <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center gap-2 text-foreground">
                    <Code className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold font-headline">CodePrep Pro</span>
                </Link>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Signing In..." : "Sign In"}
                        </Button>
                        <p className="text-sm text-center text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/register" className="font-medium text-primary hover:underline underline-offset-4">
                                Sign up
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
