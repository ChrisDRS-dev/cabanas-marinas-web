"use client";

import dynamic from "next/dynamic";

const FAQAccordion = dynamic(() => import("@/components/FAQAccordion"), {
  ssr: false,
});

type FAQItem = {
  question: string;
  answer: string;
};

export default function FAQAccordionWrapper({ items }: { items: FAQItem[] }) {
  return <FAQAccordion items={items} />;
}
