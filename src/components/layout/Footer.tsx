export function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 md:py-8">
      <div className="px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} PinkStar. All rights reserved.</p>
        <p>A project by Corøna's Studios.</p>
      </div>
    </footer>
  );
}