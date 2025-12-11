import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="font-headline text-lg font-bold">CodePrep Pro</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/my-results">My Scores</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/admin">Admin Panel</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
