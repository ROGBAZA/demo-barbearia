// Service Worker for Route 66 Barber Queue Notifications
// ULTRA-HIGH PRIORITY (Emergency / Civil Defense Style)

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    console.log("📥 PUSH CRÍTICO RECEBIDO");
    
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: "⚠️ SUA VEZ CHEGOU!", body: "O barbeiro está te esperando." };
    }

    const title = data.title || '⚠️ ALERTA: SUA VEZ CHEGOU! ✂️';
    
    // 1. Tentar acordar a aba aberta para tocar o som direto por lá (Mais alto)
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            let pageAlerted = false;
            for (const client of clientList) {
                if (client.url.includes('fila-posicao')) {
                   console.log("📡 Pingando aba ativa para soar o alarme...");
                   client.postMessage({ type: 'FIRE_ALARM', data: data });
                   pageAlerted = true;
                }
            }
            // 2. Disparar notificação do sistema (Obrigatório para LockScreen)
            return showEmergencyNotification(title, data);
        })
    );
});

async function showEmergencyNotification(title, data) {
    // Tag fixa com data para garantir que seja tratado como NOVO evento se for repetido rápido
    const notificationTag = 'emergency-call';

    const options = {
        body: data.body || 'O BARBEIRO ESTÁ PRONTO! Dirija-se ao local IMEDIATAMENTE.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [1000, 200, 1000, 200, 1000, 200, 1000, 200, 1000],
        requireInteraction: true,
        tag: notificationTag,
        renotify: true, // Força vibração/som mesmo se já houver notificação com essa tag
        silent: false,
        timestamp: Date.now(),
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: '✅ VER MINHA POSIÇÃO' },
            { action: 'close', title: '✖️ DISPENSAR' }
        ],
        // Metadados extras para Android 8.0+
        priority: 2,
        importance: 'high'
    };

    return self.registration.showNotification(title, options);
}

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes('fila-posicao') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || '/');
            }
        })
    );
});
