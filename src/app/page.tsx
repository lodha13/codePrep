import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Code, BrainCircuit, Users } from 'lucide-react';

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen font-body">
            <header className="px-4 lg:px-6 h-14 flex items-center bg-background border-b">
                <Link href="#" className="flex items-center justify-center">
                    <Code className="h-6 w-6 text-primary" />
                    <span className="sr-only">CodePrep Pro</span>
                </Link>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                    <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4">
                        Login
                    </Link>
                    <Button asChild>
                        <Link href="/register">
                            Get Started
                        </Link>
                    </Button>
                </nav>
            </header>
            <main className="flex-1">
                <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background">
                    <div className="container px-4 md:px-6">
                        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
                            <div className="flex flex-col justify-center space-y-4">
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                                        The Modern Platform for Coding Assessments
                                    </h1>
                                    <p className="max-w-[600px] text-muted-foreground md:text-xl">
                                        CodePrep Pro helps you hire the best talent with realistic coding challenges and AI-powered evaluation.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                                    <Button size="lg" asChild>
                                        <Link href="/register">
                                            Start Free Trial
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="secondary" asChild>
                                        <Link href="#">
                                            Request a Demo
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <img
                                data-ai-hint="abstract geometric"
                                alt="Hero"
                                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
                                src="https://picsum.photos/seed/1/600/600"
                            />
                        </div>
                    </div>
                </section>

                <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="space-y-2">
                                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">A better way to assess skills</h2>
                                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                    Our platform provides a comprehensive suite of tools to create, administer, and evaluate coding tests.
                                </p>
                            </div>
                        </div>
                        <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
                            <div className="grid gap-1 text-center">
                                <Code className="h-12 w-12 mx-auto text-primary" />
                                <h3 className="text-xl font-bold font-headline">Realistic Environment</h3>
                                <p className="text-muted-foreground">
                                    Candidates solve problems in a real code editor with intellisense, just like their day-to-day work.
                                </p>
                            </div>
                            <div className="grid gap-1 text-center">
                                <BrainCircuit className="h-12 w-12 mx-auto text-primary" />
                                <h3 className="text-xl font-bold font-headline">AI-Powered Grading</h3>
                                <p className="text-muted-foreground">
                                    Leverage Gemini AI to get insights on code quality, correctness, and performance.
                                </p>
                            </div>
                            <div className="grid gap-1 text-center">
                                <Users className="h-12 w-12 mx-auto text-primary" />
                                <h3 className="text-xl font-bold font-headline">Admin & User Roles</h3>
                                <p className="text-muted-foreground">
                                    Manage quizzes, questions, and users with a dedicated admin panel.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
                <p className="text-xs text-muted-foreground">&copy; 2024 CodePrep Pro. All rights reserved.</p>
                <nav className="sm:ml-auto flex gap-4 sm:gap-6">
                    <Link href="#" className="text-xs hover:underline underline-offset-4">
                        Terms of Service
                    </Link>
                    <Link href="#" className="text-xs hover:underline underline-offset-4">
                        Privacy
                    </Link>
                </nav>
            </footer>
        </div>
    );
}
