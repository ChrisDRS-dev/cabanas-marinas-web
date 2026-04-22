import type { Extra, Package } from "@/lib/supabase/catalog";

type LocalizedPackageContent = {
  label?: string;
  note?: string;
};

type LocalizedExtraContent = {
  label?: string;
  description?: string;
};

type CatalogMessages = {
  packages?: Record<string, LocalizedPackageContent>;
  extras?: Record<string, LocalizedExtraContent>;
};

export function getCatalogMessages(source: unknown): CatalogMessages {
  if (!source || typeof source !== "object") {
    return {};
  }

  const value = source as {
    packages?: Record<string, LocalizedPackageContent>;
    extras?: Record<string, LocalizedExtraContent>;
  };

  return {
    packages: value.packages ?? {},
    extras: value.extras ?? {},
  };
}

export function getLocalizedPackage(
  pkg: Package | null | undefined,
  catalog: CatalogMessages,
) {
  if (!pkg) return null;

  const copy = catalog.packages?.[pkg.id];
  return {
    ...pkg,
    label: copy?.label ?? pkg.label,
    note: copy?.note ?? pkg.note,
  };
}

export function getLocalizedExtra(
  extra: Extra | null | undefined,
  catalog: CatalogMessages,
) {
  if (!extra) return null;

  const copy = catalog.extras?.[extra.id];
  return {
    ...extra,
    label: copy?.label ?? extra.label,
    description: copy?.description ?? extra.description,
  };
}

