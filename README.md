## Cabañas Marinas Web

Aplicación Next.js para reservas de Cabañas Marinas. Incluye landing pública, wizard de reserva, autenticación con Supabase, disponibilidad y pagos.

## Requisitos

- Node.js 20+
- npm
- Proyecto Supabase con las tablas y RPC usadas por el sitio

## Variables de entorno

Definir al menos:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Variables de Yappy usadas por `src/lib/yappy-button.ts` cuando ese flujo está activo

La service role debe existir solo en backend.

## Scripts

- `npm run dev`: servidor local
- `npm run lint`: validación estática
- `npm run build`: build de producción
- `npm run start`: servir build local

## Flujo principal

1. El usuario elige personas, paquete, fecha, horario y extras.
2. El frontend valida disponibilidad contra `/api/availability`.
3. La reserva se crea en `/api/reservations`.
4. Se sincronizan factura y pago pendiente.
5. El usuario completa el depósito desde `/reservar/pago` o por WhatsApp.

## Notas

- `src/proxy.ts` protege rutas de pago y confirmación.
- El wizard guarda draft de reserva por usuario autenticado.
- Hay backlog abierto para i18n, reseñas y pruebas automatizadas.
