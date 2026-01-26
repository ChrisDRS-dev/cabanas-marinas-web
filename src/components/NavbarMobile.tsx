import ThemeToggle from "@/components/ThemeToggle";

type NavbarMobileProps = {
  brand: string;
};

export default function NavbarMobile({ brand }: NavbarMobileProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[conic-gradient(from_180deg_at_50%_50%,#0085a1,#ffb347,#0085a1)]" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Cabañas
            </p>
            <p className="font-display text-lg font-semibold">{brand}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
