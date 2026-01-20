type GalleryItem = {
  title: string;
  caption: string;
  accent: string;
};

type GalleryGridProps = {
  items: GalleryItem[];
};

export default function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <figure
          key={item.title}
          className="group relative overflow-hidden rounded-3xl border border-border bg-card p-4"
        >
          <div
            className="h-32 w-full rounded-2xl"
            style={{ background: item.accent }}
          />
          <figcaption className="mt-4 space-y-1">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.caption}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
