type InfoChipsProps = {
  items: string[];
};

export default function InfoChips({ items }: InfoChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
