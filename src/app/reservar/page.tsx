import { redirect } from "next/navigation";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams?: Promise<{ package?: string }>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  params.set("reservar", "1");
  if (resolved?.package) {
    params.set("package", resolved.package);
  }
  redirect(`/?${params.toString()}`);
}
