import Image from "next/image";
import FadeIn from "@/components/FadeIn";

export default function HomeActivitiesSection({
  eyebrow,
  title,
  subtitle,
  activities,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  activities: Array<{ title: string; description: string; image: string }>;
}) {
  return (
    <section id="actividades" className="mx-auto max-w-6xl px-6 py-14">
      <FadeIn className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="gallery-scroll flex gap-4 overflow-x-auto pb-2 pt-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {activities.map((activity) => (
            <div
              key={activity.title}
              className="min-w-[250px] flex-1 rounded-3xl border border-border/80 bg-card shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="h-40 overflow-hidden rounded-t-3xl">
                <Image
                  src={activity.image}
                  alt={activity.title}
                  width={640}
                  height={320}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <div className="space-y-2 p-5">
                <h3 className="text-lg font-semibold">{activity.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
