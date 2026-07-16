import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    // Pin the host explicitly. Left to default, Vite advertises "localhost",
    // which on Windows can resolve to IPv6 (::1) for the page request while the
    // HMR websocket client dials IPv4 (127.0.0.1) — the socket then never
    // connects, and every edit silently serves a stale bundle until a hard
    // reload. Pinning both sides to 127.0.0.1 keeps them on the same stack.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
    },
  },
})
