// Versione del service worker per gestire gli aggiornamenti
const VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Puoi aggiungere qui altre operazioni di attivazione se necessario
    ])
  );
});

self.addEventListener('push', (event) => {
  const options = event.data.json();
  
  const notificationOptions = {
    body: options.body,
    icon: options.icon || '/icons/megaphone.png',
    badge: options.badge || '/icons/megaphone.png',
    data: options.data || {},
    actions: [
      {
        action: 'apri',
        title: 'Apri',
        icon: '/icons/open.png'
      }
    ],
    requireInteraction: true,
    tag: 'nuovo-annuncio',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(options.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Gestisci il click sulla notifica o sul pulsante Apri
  if (event.action === 'apri' || !event.action) {
    const urlToOpen = event.notification.data.url 
      ? new URL(event.notification.data.url, self.location.origin).href
      : '/';

    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((windowClients) => {
        // Cerca una finestra già aperta
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Se non c'è una finestra aperta, ne apre una nuova
        return clients.openWindow(urlToOpen);
      })
    );
  }
}); 