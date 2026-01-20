type PlanCardProps = {
  id?: string;
  name: string;
  price: string;
  unit: string;
  schedule: string;
  note: string;
};

export default function PlanCard({
  name,
  price,
  unit,
  schedule,
  note,
}: PlanCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Paquete
        </p>
        <h3 className="font-display text-2xl font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{schedule}</p>
      </div>
      <div className="mt-6 space-y-2">
        <p className="text-3xl font-semibold">
          {price}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {unit}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
