const CACHE = "inventario-casa-v1";

// Archivos propios de la app
const LOCAL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// Librerías externas (CDN). Se guardan aunque no devuelvan cabeceras CORS.
const CDN = [
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js"
];

// Instalación: guarda los archivos en caché
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of LOCAL) {
      try { await cache.add(url); } catch (e) { /* ignorar si falta alguno */ }
    }
    for (const url of CDN) {
      try {
        const res = await fetch(url, { mode: "no-cors" });
        await cache.put(url, res);
      } catch (e) { /* sin conexión en ese momento */ }
    }
    self.skipWaiting();
  })());
});

// Activación: borra cachés antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Peticiones: la página principal se pide primero a la red (para recibir cambios),
// el resto se sirve desde caché si existe.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    if (req.mode === "navigate") {
      try {
        const res = await fetch(req);
        cache.put("./index.html", res.clone());
        return res;
      } catch (e) {
        return (await cache.match("./index.html")) || (await cache.match("./"));
      }
    }

    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});