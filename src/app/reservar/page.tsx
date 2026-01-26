import { redirect } from "next/navigation";

export default function ReservarPage({
  searchParams,
}: {
  searchParams?: { package?: string };
}) {
  const params = new URLSearchParams();
  params.set("reservar", "1");
  if (searchParams?.package) {
    params.set("package", searchParams.package);
  }
  redirect(`/?${params.toString()}`);
}
