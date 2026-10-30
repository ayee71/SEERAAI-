// SeeraAI Service Worker with Safe Offline Precedent Notification Handling
const CACHE_NAME = 'seera-legal-precedents-v4-1-0';
const PRECEDENTS_CACHE_KEY = '/offline-precedents-store.json';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()).then(() => {
      // Notify all clients that new service worker is active and ready
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'SEERA_SW_ACTIVATED', version: '4.1.0' });
        }
      });
      // Perform initial deadline check on activation
      return checkDeadlinesAndNotify();
    })
  );
});


// PASS THROUGH ALL FETCH REQUESTS - never block or rewrite requests
self.addEventListener('fetch', () => {
  // Let the browser handle network naturally
});

// Background Sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-legal-precedents') {
    event.waitUntil(handlePrecedentsSync());
  } else if (event.tag === 'sync-queued-document-edits') {
    event.waitUntil(handleQueuedEditsSync());
  } else if (event.tag === 'sync-hearing-deadlines') {
    event.waitUntil(checkDeadlinesAndNotify());
  }
});

async function checkDeadlinesAndNotify() {
  try {
    const deadlines = await getDeadlinesFromIDB();
    const now = Date.now();
    let notificationsShown = 0;

    for (const d of deadlines) {
      const targetTime = new Date(d.deadlineDate).getTime();
      const diffHours = (targetTime - now) / (1000 * 60 * 60);

      // Alert 24 hours in advance (window between 23 and 25 hours)
      if (diffHours > 23 && diffHours <= 25 && !d.notified24h) {
        await showPrecedentNotification({
          title: `🚨 BEELLAMA ARIITII (24 Hours Left)!`,
          body: `Galmee: ${d.caseTitle}\nMannii Murtii: ${d.courtName}\nBeellamni boru ga'a! Sanada qopheessaa.`,
          tag: `deadline-24h-${d.id}`,
        });
        d.notified24h = true;
        notificationsShown++;
        await saveDeadlineUpdateToIDB(d);
      }
    }
    return notificationsShown;
  } catch (err) {
    console.error('Deadline check error in SW:', err);
  }
}

async function getDeadlinesFromIDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('SeeraAIOfflineDB');
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('deadlines')) return resolve([]);
      const transaction = db.transaction('deadlines', 'readonly');
      const store = transaction.objectStore('deadlines');
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}

async function saveDeadlineUpdateToIDB(deadline) {
  return new Promise((resolve) => {
    const request = indexedDB.open('SeeraAIOfflineDB');
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('deadlines')) return resolve();
      const transaction = db.transaction('deadlines', 'readwrite');
      const store = transaction.objectStore('deadlines');
      store.put(deadline);
      transaction.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}



async function handleQueuedEditsSync() {
  try {
    // Notify all open window clients to execute queued edits reconciliation
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      client.postMessage({ type: 'SEERA_SYNC_QUEUED_DOCUMENT_EDITS' });
    }

    await showPrecedentNotification({
      title: 'Hojiin Offline Qindaa\'ee Ture Sync Ta\'eera! ⚖️',
      body: 'Gulaalliin sanada seeraa offline qindeeffamee ture milkaa\'inaan kuusaa keessaniin wal simateera.',
      tag: 'document-edits-sync-complete',
    });
  } catch (err) {
    console.error('Document edits sync error in SW:', err);
  }
}

async function handlePrecedentsSync() {
  try {
    await showPrecedentNotification({
      title: 'Murtiiwwan Seeraa Offline Kuufamaniiru ⚖️',
      body: 'Sanadoon Murtii Ijoo haaraan offline kuufamaniiru. Intarneeta malee dubbisuu dandeessu. / የሰበር ውሳኔ ሰነዶች ከመስመር ውጭ ተቀምጠዋል።',
      tag: 'precedent-sync-complete',
    });
  } catch (err) {
    console.error('Precedent sync error in SW:', err);
  }
}

// Notification Trigger Helper
async function showPrecedentNotification(options) {
  if (!self.Notification || self.Notification.permission !== 'granted') {
    return;
  }

  const title = options.title || 'Murtii Haaraa Kuufameera! ⚖️';
  const notificationOptions = {
    body: options.body || 'Sanadoonni murtii ijoo haaraan offline kuufamaniiru.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: options.tag || 'precedent-downloaded',
    renotify: true,
  };

  return self.registration.showNotification(title, notificationOptions);
}

// Listen to messages from window clients
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'CHECK_DEADLINES') {
    event.waitUntil(checkDeadlinesAndNotify());
    return;
  }


  if (event.data.type === 'NOTIFY_PRECEDENTS_DOWNLOADED') {
    const { count, precedentTitles, customTitle, customBody } = event.data;
    const title = customTitle || (count > 1 ? `Murtiiwwan Ijoo ${count} Offline Kuufamaniiru! ⚖️` : 'Murtii Ijoo Haaraa Kuufameera! ⚖️');
    const body = customBody || (
      count > 1
        ? `Sanadoon Murtii Ijoo ${count} milkaa'inaan offline kuufamaniiru. Intarneeta malee dubbisuu dandeessu.`
        : `Sanadni "${precedentTitles?.[0] || 'Murtii Seeraa'}" offline kuufameera.`
    );

    event.waitUntil(
      showPrecedentNotification({
        title,
        body,
        tag: 'precedents-offline-cached-' + Date.now(),
      })
    );
  }

  if (event.data.type === 'NOTIFY_EDITS_SYNCED') {
    const { count } = event.data;
    event.waitUntil(
      showPrecedentNotification({
        title: 'Gulaalliin Sanadaa Sync Ta\'eera! ⚖️',
        body: `Gulaalliin sanadoota seeraa ${count || ''} offline qindeeffamee ture milkaa'inaan kuusaa keessaniin wal simateera.`,
        tag: 'doc-edits-synced-' + Date.now(),
      })
    );
  }
});

// Safe notification click: only focus existing window if already open, never open new URL on host domain
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          try {
            client.postMessage({ type: 'SEERA_NAVIGATE_TAB', tab: 'calendar' });
          } catch {}
          return client.focus();
        }

      }
    })
  );
});
