import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { PropsWithChildren } from "react";
import type { ReservationEmailData } from "@/emails/types";

const money = new Intl.NumberFormat("es-PA", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function formatMoney(value: ReservationEmailData["totalAmount"]) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? money.format(amount) : "$0.00";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Fecha pendiente";
  const date = new Date(`${value}T00:00:00-05:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "full",
    timeZone: "America/Panama",
  }).format(date);
}

export function formatTimeRange(data: ReservationEmailData) {
  const start = data.startAt ? new Date(data.startAt) : null;
  const end = data.endAt ? new Date(data.endAt) : null;
  if (!start || Number.isNaN(start.getTime())) return "Horario pendiente";
  const format = new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Panama",
  });
  if (!end || Number.isNaN(end.getTime())) return format.format(start);
  return `${format.format(start)} - ${format.format(end)}`;
}

export function EmailLayout({
  preview,
  title,
  children,
}: PropsWithChildren<{ preview: string; title: string }>) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>Cabanas Marinas</Text>
          <Heading style={styles.heading}>{title}</Heading>
          {children}
          <Text style={styles.footer}>
            Este correo es automatico. Si necesitas ayuda, responde a este mensaje o contactanos por WhatsApp.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function ReservationSummary({ data }: { data: ReservationEmailData }) {
  return (
    <Section style={styles.summary}>
      <Text style={styles.row}>Reserva: #{data.reservationId.slice(0, 8).toUpperCase()}</Text>
      <Text style={styles.row}>Cliente: {data.customerName ?? data.customerEmail ?? "Sin nombre"}</Text>
      <Text style={styles.row}>Fecha: {formatDate(data.reservedDate)}</Text>
      <Text style={styles.row}>Horario: {formatTimeRange(data)}</Text>
      <Text style={styles.row}>Paquete: {data.packageLabel ?? "Paquete reservado"}</Text>
      <Text style={styles.row}>Cabana: {data.cabinCode ?? "Pendiente de asignacion"}</Text>
      <Text style={styles.row}>Total: {formatMoney(data.totalAmount)}</Text>
      <Text style={styles.row}>Deposito: {formatMoney(data.depositAmount)}</Text>
    </Section>
  );
}

export function ActionButton({ href, label }: { href?: string | null; label: string }) {
  if (!href) return null;
  return (
    <Button href={href} style={styles.button}>
      {label}
    </Button>
  );
}

const styles = {
  body: {
    margin: 0,
    backgroundColor: "#f4f7f6",
    color: "#17332f",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px 20px",
    backgroundColor: "#ffffff",
  },
  brand: {
    color: "#20776d",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  heading: {
    color: "#123d38",
    fontSize: "24px",
    lineHeight: "32px",
  },
  summary: {
    border: "1px solid #dce8e5",
    borderRadius: "8px",
    padding: "12px 16px",
    margin: "20px 0",
  },
  row: {
    fontSize: "14px",
    lineHeight: "20px",
    margin: "6px 0",
  },
  button: {
    backgroundColor: "#20776d",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "700",
    padding: "12px 18px",
    textDecoration: "none",
  },
  footer: {
    color: "#5d706d",
    fontSize: "12px",
    lineHeight: "18px",
    marginTop: "28px",
  },
};
