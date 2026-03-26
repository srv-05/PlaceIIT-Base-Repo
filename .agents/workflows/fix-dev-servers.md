---
description: Fix dev server issues (502/connection refused/Vite crash) and start both servers
---

# Fix Dev Server Issues & Start Servers

Two recurring issues affect this project on macOS:

## Issue 1: Port Mismatch (502 / proxy ECONNREFUSED)
- `server/.env` uses `PORT=5001` (because macOS AirPlay uses 5000)
- Pulling from upstream resets `client/vite.config.mts` proxy target back to `http://localhost:5000`
- **Fix:** Ensure ALL proxy targets in `client/vite.config.mts` point to `http://localhost:5001`

## Issue 2: Vite WebSocket Proxy Crash (Bun compatibility)
- Bun doesn't implement `socket.destroySoon()` which Vite's WebSocket proxy uses
- The `/socket.io` proxy entry in `vite.config.mts` causes Vite to crash
- **Fix:** Remove the `/socket.io` proxy entry from `vite.config.mts` and make Socket.IO connect directly to `http://localhost:5001` in `client/src/app/socket-context.tsx`

## Steps

1. Ensure `client/vite.config.mts` has proxy target `http://localhost:5001` for `/api` and does NOT have a `/socket.io` proxy entry. The server section should look like:
```ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
      secure: false,
    },
  },
},
```

2. Ensure `client/src/app/socket-context.tsx` connects Socket.IO directly to the backend (NOT through the Vite proxy). The io() call should be:
```ts
const socket = io("http://localhost:5001", {
  transports: ["websocket", "polling"],
  autoConnect: true,
});
```

3. Ensure `server/.env` has `PORT=5001`

// turbo
4. Start the backend server:
```bash
export BUN_INSTALL="$HOME/.bun" && export PATH="$BUN_INSTALL/bin:$PATH" && bun run dev
```
Run from: `server/` directory

// turbo
5. Start the frontend server:
```bash
export BUN_INSTALL="$HOME/.bun" && export PATH="$BUN_INSTALL/bin:$PATH" && bun run dev
```
Run from: `client/` directory

6. Verify by opening http://localhost:5173/ in the browser — it should load the PlaceIIT landing page.
