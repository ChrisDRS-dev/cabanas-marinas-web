type PlanCardProps = {
  id?: string;
  name: string;
  price: string;
  unit: string;
  duration: string;
  rule: string;
  schedule?: string;
  note?: string;
};

export default function PlanCard({
  name,
  price,
  unit,
  duration,
  rule,
}: PlanCardProps) {
  return (
    <div className="flex h-full cursor-pointer flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Paquete
        </p>
        <h3 className="font-display text-2xl font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{duration}</p>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-3xl font-semibold">
          {price}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{rule}</p>
      </div>
    </div>
  );
}
