self.addEventListener("push", (event) => {
  const fallback = {
    title: "Cabañas Marinas",
    body: "Tienes una nueva actualización de tu reserva.",
    icon: "/logo/favicon-logo.png",
    badge: "/logo/favicon-logo.png",
    data: { url: "/?reservar=1" },
  };

  const payload = event.data ? event.data.json() : fallback;
  const title = payload.title || fallback.title;
  const options = {
    body: payload.body || fallback.body,
    icon: payload.icon || fallback.icon,
    badge: payload.badge || fallback.badge,
    tag: payload.tag,
    data: payload.data || fallback.data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/?reservar=1";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
