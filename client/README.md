# 🎓 PlaceIIT — Frontend

> React + Vite + TailwindCSS v4 frontend for the **PlaceIIT** Campus Placement Management System.

---

## 📁 Project Structure

```
client/
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── components/      # Reusable UI components (Radix + shadcn/ui)
│   │   │   ├── ui/          # Base primitives (Button, Card, Input, etc.)
│   │   │   ├── apc-*.tsx    # APC / Admin portal components
│   │   │   ├── coco/        # CoCo portal components
│   │   │   └── student/     # Student portal components
│   │   ├── layouts/         # Shell layouts (APC, Student, CoCo)
│   │   ├── routes/          # Page-level route components
│   │   │   ├── apc/         # APC portal routes
│   │   │   ├── coco/        # CoCo portal routes
│   │   │   └── student/     # Student portal routes
│   │   ├── lib/
│   │   │   └── api.ts       # Centralised API service layer
│   │   ├── auth-context.tsx  # JWT auth context + role guard
│   │   └── App.tsx          # Router + layout composition
│   ├── styles/
│   │   └── index.css        # Global styles + Tailwind
│   └── main.tsx             # React entry point
├── index.html               # HTML entry point
├── vite.config.mts          # Vite config (proxy, aliases)
├── postcss.config.mjs       # PostCSS config
├── bunfig.toml              # Bun package manager config
└── package.json
```

---

## 🔧 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh) | ≥ 1.0 | Package manager & runtime |
| [Node.js](https://nodejs.org) | ≥ 18 | Fallback (if not using Bun) |
| Backend server | — | Must be running for API calls |

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd client
bun install
```

### 2. Start development server

```bash
bun run dev
```

The app will be available at **http://localhost:5173**.

> The Vite dev server automatically proxies `/api/*` and `/socket.io/*` requests
> to the backend at `http://localhost:5001`. Make sure the server is running.

---

## 🏗️ Production Build

### Build for production

```bash
bun run build
```

Output is placed in the `dist/` directory.

### Preview the production build locally

```bash
bun run preview
```

### Deploy

The `dist/` folder contains a fully static SPA. Deploy it to any static hosting:

- **Nginx / Apache**: Serve `dist/` with a fallback to `index.html` for SPA routing.
- **Vercel / Netlify**: Point the build command to `bun run build` and output dir to `dist`.
- **Docker**: See example below.

```nginx
# Nginx example config
server {
    listen 80;
    root /var/www/placeiit/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔑 Authentication

The frontend uses **JWT Bearer tokens** stored in `localStorage`.

| Role | Login ID | Password | Portal |
|------|----------|----------|--------|
| APC / Admin | `admin001` | `admin123` | `/apc` |
| Student | `2021CS101` | `student123` | `/student` |
| CoCo | `coco001` | `coco123` | `/coco` |

> These are seed credentials. Run `bun src/seed.js` in the server to create them.

---

## 🛣️ Route Map

| Path | Role | Page |
|------|------|------|
| `/` | Public | Login / Role Selection |
| `/apc` | Admin | APC Dashboard |
| `/apc/students` | Admin | Student Search |
| `/apc/students/:id` | Admin | Student Details |
| `/apc/cocos` | Admin | Manage CoCos |
| `/apc/cocos/:id/schedule` | Admin | CoCo Schedule |
| `/apc/companies` | Admin | Manage Companies |
| `/apc/companies/:id` | Admin | Company Details |
| `/apc/profile` | Admin | APC Profile |
| `/student` | Student | Student Dashboard |
| `/student/companies` | Student | My Companies |
| `/student/profile` | Student | Student Profile |
| `/student/notifications` | Student | Notifications |
| `/student/contact` | Student | Contact CoCo |
| `/coco` | CoCo | CoCo Dashboard |
| `/coco/companies` | CoCo | Assigned Companies |
| `/coco/students` | CoCo | Student List |
| `/coco/round-tracking` | CoCo | Round Tracking |
| `/coco/profile` | CoCo | CoCo Profile |
| `/coco/notifications` | CoCo | Send Notifications |

---

## 🧰 Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 18 |
| Build Tool | Vite 6 |
| CSS | TailwindCSS v4 |
| Routing | React Router DOM v7 |
| UI Components | Radix UI + shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| State | React Context |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with HMR (port 5173) |
| `bun run build` | Build for production → `dist/` |
| `bun run preview` | Preview production build locally |

---

## 🤝 Related

- **Backend**: See [`../server/README.md`](../server/README.md) for the Express API & Socket.IO server.
