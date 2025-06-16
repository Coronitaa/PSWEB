import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="text-2xl font-bold text-primary hover:text-accent transition-colors">
      PinkStar
    </Link>
  );
}
