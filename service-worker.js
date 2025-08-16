// Minimal offline shell: cache index on first visit
const CACHE = 'volt-shell-v1'
const SHELL = ['/']

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))
  self.skipWaiting()
})
self.addEventListener('activate', (e)=> {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE && caches.delete(k))))
  )
  self.clients.claim()
})
self.addEventListener('fetch', (e)=>{
  const { request } = e
  if (request.method !== 'GET') return
  e.respondWith(
    caches.match(request).then(cached => 
      cached || fetch(request).catch(()=> caches.match('/'))
    )
  )
})
