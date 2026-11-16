// SeeraAI Service Worker with Judicial Offline Precedents, Legislation & Civil Procedure Code (SDFHH) Caching Strategy
const CACHE_NAME = 'seera-judicial-cache-v4-1-0';
const STATIC_CACHE_NAME = 'seera-static-assets-v4-1-0';
const PRECEDENTS_CACHE_KEY = '/offline-precedents-store.json';

const CRITICAL_OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/og-image.jpg',
  '/offline-precedents-store.json',
  '/assets/aistudio/___________________1-25___4__48c4c792.html',
  '/assets/aistudio/cassation_index_reviewed_289caf70.html',
  '/assets/aistudio/Baafata_Murtii_Sirraayame_Civil__1__7174d174.html',
  '/assets/aistudio/Baafata_Murtii_Sirraayame_Civil_Contract_c4e1de74.html',
  '/assets/aistudio/seeraai_cassation_file_importer_6ab28a0c.html',
  '/src/data/cassationMasterIndex.ts'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_OFFLINE_URLS).catch((err) => {
        console.warn('Initial offline static asset precaching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== STATIC_CACHE_NAME) {
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

// SMART FETCH STRATEGY: Offline Legal Precedents, Legislation & Civil Procedure Code (SDFHH)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests, non-http(s), or chrome extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation Requests (App Shell) -> Network First with Index.html Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
        }
        return response;
      }).catch(async () => {
        const cachedShell = await caches.match('/index.html') || await caches.match('/');
        if (cachedShell) return cachedShell;
        return new Response('<html><body><h2>SeeraAI Offline Judicial Mode</h2><p>Judicial precedents and Civil Procedure Code (SDFHH) loaded in offline session.</p></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // 2. Judicial Data Endpoints (Precedents, Cassation, Legislation, Proclamations, SDFHH / Civil Procedure Code)
  const isJudicialEndpoint = 
    url.pathname.includes('/precedents') ||
    url.pathname.includes('/cassation') ||
    url.pathname.includes('/legislation') ||
    url.pathname.includes('/proclamations') ||
    url.pathname.includes('/sdfhh') ||
    url.pathname.includes('/civil-procedure') ||
    url.pathname.includes('/offline-precedents-store.json') ||
    url.pathname.includes('/version.json');

  if (isJudicialEndpoint) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.info('Serving cached judicial data for offline session:', url.pathname);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const fallbackStore = await caches.match('/offline-precedents-store.json');
          if (fallbackStore) {
            return fallbackStore;
          }
          return new Response(JSON.stringify({ offlineMode: true, message: 'Serving local cached legal database' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }

  // 3. Static Bundles & Media (JS, CSS, Images, Fonts) -> Cache First with Network Fallback
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 408, statusText: 'Offline' });
        });
      })
    );
    return;
  }
});

const swOpenIDBConnections = new Set();
let swSignOutPaused = false;

function registerSwIDBConnection(db) {
  swOpenIDBConnections.add(db);
  db.onversionchange = () => {
    try { db.close(); } catch {}
    swOpenIDBConnections.delete(db);
  };
  db.onclose = () => {
    swOpenIDBConnections.delete(db);
  };
  return db;
}

function closeAllSwIDBConnections() {
  let closed = 0;
  for (const db of Array.from(swOpenIDBConnections)) {
    try {
      db.close();
      closed++;
    } catch {}
    swOpenIDBConnections.delete(db);
  }
  return closed;
}

// Background Sync handler
self.addEventListener('sync', (event) => {
  if (swSignOutPaused) return;
  if (event.tag === 'sync-legal-precedents') {
    event.waitUntil(handlePrecedentsSync());
  } else if (event.tag === 'sync-queued-document-edits') {
    event.waitUntil(handleQueuedEditsSync());
  } else if (event.tag === 'sync-hearing-deadlines') {
    event.waitUntil(checkDeadlinesAndNotify());
  }
});

async function checkDeadlinesAndNotify() {
  if (swSignOutPaused) return 0;
  try {
    const deadlines = await getDeadlinesFromIDB();
    const now = Date.now();
    let notificationsShown = 0;

    for (const d of deadlines) {
      if (swSignOutPaused) break;
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
  if (swSignOutPaused) return [];
  return new Promise((resolve) => {
    const request = indexedDB.open('SeeraAIOfflineDB');
    request.onsuccess = (event) => {
      const db = registerSwIDBConnection(event.target.result);
      if (swSignOutPaused || !db.objectStoreNames.contains('deadlines')) {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        return resolve([]);
      }
      const transaction = db.transaction('deadlines', 'readonly');
      const store = transaction.objectStore('deadlines');
      const getAllRequest = store.getAll();
      let result = [];
      getAllRequest.onsuccess = () => { result = getAllRequest.result || []; };
      transaction.oncomplete = () => {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        resolve(result);
      };
      transaction.onerror = () => {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        resolve([]);
      };
      transaction.onabort = () => {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        resolve([]);
      };
    };
    request.onerror = () => resolve([]);
  });
}

async function saveDeadlineUpdateToIDB(deadline) {
  if (swSignOutPaused) return;
  return new Promise((resolve) => {
    const request = indexedDB.open('SeeraAIOfflineDB');
    request.onsuccess = (event) => {
      const db = registerSwIDBConnection(event.target.result);
      if (swSignOutPaused || !db.objectStoreNames.contains('deadlines')) {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        return resolve();
      }
      const transaction = db.transaction('deadlines', 'readwrite');
      const store = transaction.objectStore('deadlines');
      store.put(deadline);
      transaction.oncomplete = () => {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        resolve();
      };
      transaction.onerror = () => {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        resolve();
      };
      transaction.onabort = () => {
        try { db.close(); } catch {}
        swOpenIDBConnections.delete(db);
        resolve();
      };
    };
    request.onerror = () => resolve();
  });
}

async function handleQueuedEditsSync() {
  if (swSignOutPaused) return;
  try {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      client.postMessage({ type: 'SEERA_SYNC_QUEUED_DOCUMENT_EDITS' });
    }
  } catch (err) {
    console.error('Document edits sync error in SW:', err);
  }
}

async function handlePrecedentsSync() {
  if (swSignOutPaused) return;
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

  if (event.data.type === 'SEERA_PAUSE_SYNC') {
    swSignOutPaused = Boolean(event.data.paused);
    if (swSignOutPaused) {
      closeAllSwIDBConnections();
    }
    if (event.source) {
      try {
        event.source.postMessage({
          type: 'SEERA_SW_ACK_PAUSE',
          correlationId: event.data.correlationId || null,
          paused: swSignOutPaused,
        });
      } catch {}
    }
    return;
  }

  if (event.data.type === 'SEERA_CLOSE_IDB_CONNECTIONS' || event.data.type === 'CLOSE_IDB_CONNECTIONS') {
    swSignOutPaused = true;
    const closedCount = closeAllSwIDBConnections();
    const ackPayload = {
      type: 'SEERA_SW_ACK_CLOSE_IDB',
      correlationId: event.data.correlationId || null,
      closedCount,
    };
    if (event.source) {
      try {
        event.source.postMessage(ackPayload);
      } catch {}
    } else {
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          for (const client of windowClients) {
            try { client.postMessage(ackPayload); } catch {}
          }
        })
      );
    }
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

// Safe notification click
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
