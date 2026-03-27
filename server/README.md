# 🎓 PlaceIIT — Backend

> Express + MongoDB + Socket.IO backend for the **PlaceIIT** Campus Placement Management System.

A real-time, role-based campus placement coordination platform that handles authentication, student queuing, interview tracking, notifications, and Excel-based bulk uploads.

---

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.js             # MongoDB connection
│   │   ├── env.js            # Environment variables
│   │   └── socket.js         # Socket.IO initialisation
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── admin.controller.js
│   │   ├── student.controller.js
│   │   ├── coco.controller.js
│   │   ├── company.controller.js
│   │   └── queue.controller.js
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Student.model.js
│   │   ├── Coordinator.model.js
│   │   ├── Company.model.js
│   │   ├── Queue.model.js
│   │   ├── Panel.model.js
│   │   ├── InterviewRound.model.js
│   │   ├── Notification.model.js
│   │   └── ExcelUpload.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js
│   │   ├── student.routes.js
│   │   ├── coco.routes.js
│   │   ├── company.routes.js
│   │   └── queue.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js       # JWT verification
│   │   ├── role.middleware.js       # Role-based authorization
│   │   ├── error.middleware.js      # Global error handler
│   │   └── excelUpload.middleware.js # Multer file upload
│   ├── services/                    # Business logic layer
│   ├── sockets/
│   │   └── queue.socket.js          # Real-time queue events
│   ├── utils/
│   │   ├── constants.js             # Roles, statuses, events
│   │   └── generateToken.js         # JWT sign & verify
│   ├── seed.js                      # Database seeding script
│   └── server.js                    # Express app entry point
├── uploads/                         # Uploaded Excel files (auto-created)
├── .env.example                     # Environment template
├── .gitignore
└── package.json
```

---

## 🔧 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh) | ≥ 1.0 | Runtime & package manager |
| [MongoDB](https://www.mongodb.com) | ≥ 6.0 | Database (local, Docker, or Atlas) |

> **Note**: If you don't have MongoDB installed locally, you can use Docker:
> ```bash
> docker run -d --name placeiit-mongo -p 27017:27017 -v placeiit_mongo_data:/data/db mongo:7
> ```

---

## 🚀 Quick Start (Development)

### 1. Install dependencies

```bash
cd server
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/placement_platform
JWT_SECRET=your_secure_random_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

> ✅ Bun natively loads `.env` files — no `dotenv` package needed.

### 3. Seed test data (optional but recommended)

```bash
    bun src/seed.js
```

This creates three test accounts:

| Role | Institute ID | Password |
|------|-------------|----------|
| Admin (APC) | `admin001` | `admin123` |
| Student | `2021CS101` | `student123` |
| CoCo | `coco001` | `coco123` |

### 4. Start the development server

```bash
bun run dev
```

The server starts at **http://localhost:5001** with hot-reload enabled.

Verify it's running:
```bash
curl http://localhost:5001/api/health
# → {"status":"OK","timestamp":"..."}
```

---

## 🗄️ Database Setup & Migration

### MongoDB Options

| Option | Command / Config | Best For |
|--------|-----------------|----------|
| **Local install** | `mongod --dbpath /data/db` | Development |
| **Manual Binary (Linux)** | Download from mongodb.org, extract, and run `bin/mongod --dbpath data/db` | Local without sudo/Docker |
| **Docker** | `docker run -d --name placeiit-mongo -p 27017:27017 -v placeiit_mongo_data:/data/db mongo:7` | Dev / Staging |
| **MongoDB Atlas** | Set `MONGO_URI=mongodb+srv://...` in `.env` | Production |

### Migration Script

The project includes a comprehensive migration script (`src/migrate.js`) that handles index syncing, data-level migrations, seeding, and status reporting.

```bash
# Show current database status (collection counts, indexes)
bun src/migrate.js --status

# Run all migrations (sync indexes + run data migrations)
bun src/migrate.js

# Run migrations AND seed test data
bun src/migrate.js --seed

# ⚠️  Drop all collections (blocked in production!)
bun src/migrate.js --drop-all
```

**What the migration script does:**

| Step | Description |
|------|-------------|
| **Index Sync** | Ensures all Mongoose schema indexes match the database |
| **Data Migrations** | Runs versioned migration functions (idempotent) |
| **Status Report** | Prints document counts and index counts per collection |
| **Seed** | Creates test users for all three roles (optional) |

### Schema Overview

The database has **9 collections** with the following relationships:

```
┌──────────┐     1:1      ┌───────────┐
│   User   │─────────────▶│  Student   │
│          │              │ rollNumber │
│ institute│              │ branch     │
│ Id       │              │ cgpa       │
│ email    │     1:1      │ resume     │
│ password │─────────────▶├────────────┤
│ role     │              │Coordinator │
│ isActive │              │ name       │
└──────────┘              │ assigned   │
                          │ Companies[]│
                          └────────────┘

┌───────────┐   1:N    ┌────────────────┐   1:N   ┌─────────┐
│  Company   │────────▶│ InterviewRound │────────▶│  Panel   │
│ name       │         │ roundNumber    │         │ panelName│
│ day / slot │         │ isActive       │         │ venue    │
│ venue      │         └────────────────┘         │ interview│
│ mode       │                                    │ ers[]    │
│ walkIn     │   1:N    ┌─────────────┐           └─────────┘
│ assignedCo─│────────▶│    Queue      │
│ cos[]      │         │ studentId    │
│ shortlisted│         │ status       │
│ Students[] │         │ position     │
└────────────┘         │ isWalkIn     │
                       └──────────────┘

┌──────────────┐                  ┌──────────────┐
│ Notification │                  │  ExcelUpload │
│ recipientId  │                  │ uploadedBy   │
│ senderId     │                  │ fileName     │
│ companyId    │                  │ type         │
│ message      │                  │ status       │
│ isRead       │                  │ records      │
│ type         │                  │ Processed    │
└──────────────┘                  └──────────────┘
```

| Collection | Key Fields | Indexes |
|-----------|-----------|---------|
| `users` | `instituteId` (unique), `email` (unique), `role`, `isActive` | `instituteId_1`, `email_1` |
| `students` | `userId` (unique, ref → User), `rollNumber` (unique), `cgpa`, `branch` | `userId_1`, `rollNumber_1` |
| `coordinators` | `userId` (unique, ref → User), `rollNumber` (unique), `assignedCompanies[]` | `userId_1`, `rollNumber_1` |
| `companies` | `name`, `day`, `slot`, `venue`, `isWalkInEnabled`, `currentRound` | `_id` |
| `queues` | `companyId` + `studentId` (compound unique), `status`, `position` | `companyId_1_studentId_1` |
| `panels` | `companyId`, `roundId`, `panelName` | `_id` |
| `interviewrounds` | `companyId`, `roundNumber`, `isActive` | `_id` |
| `notifications` | `recipientId`, `senderId`, `companyId`, `isRead`, `type` | `_id` |
| `exceluploads` | `uploadedBy`, `type`, `status`, `recordsProcessed` | `_id` |

### Adding New Migrations

When evolving the database schema, add a new migration entry to the `migrations` array in `src/migrate.js`:

```js
{
  id: "005_add_new_field",
  description: "Set default value for new field on existing docs",
  run: async () => {
    const result = await SomeModel.updateMany(
      { newField: { $exists: false } },
      { $set: { newField: "default_value" } }
    );
    console.log(`      Updated ${result.modifiedCount} documents`);
  },
},
```

**Rules:**
- Migrations must be **idempotent** (safe to run multiple times)
- Use `$exists: false` checks to only touch docs that need updating
- Never remove old migrations — they form a history log
- Always test migrations on a dev database before production

### Backup & Restore

```bash
# Backup entire database
mongodump --uri="mongodb://localhost:27017/placement_platform" --out=./backup/$(date +%Y%m%d)

# Restore from backup
mongorestore --uri="mongodb://localhost:27017/placement_platform" ./backup/20260302/placement_platform

# Export a single collection as JSON
mongoexport --uri="mongodb://localhost:27017/placement_platform" --collection=users --out=users.json

# Import a single collection from JSON
mongoimport --uri="mongodb://localhost:27017/placement_platform" --collection=users --file=users.json
```

### Production DB Checklist

- [ ] Use **MongoDB Atlas** or a properly secured, replicated MongoDB instance
- [ ] Set a **strong, unique** `JWT_SECRET` (never use the default)
- [ ] Run `bun src/migrate.js` after every deployment to sync indexes
- [ ] Set up **automated daily backups** with `mongodump` or Atlas backups
- [ ] Enable **MongoDB authentication** (`--auth`) in production
- [ ] Use **connection pool** settings if high concurrency is expected
- [ ] Monitor with **MongoDB Compass** or Atlas monitoring

---

## 🏗️ Production Deployment

### 1. Set environment variables

```env
PORT=5001
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/placement_platform
JWT_SECRET=a_very_long_secure_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend-domain.com
NODE_ENV=production
```

### 2. Install production dependencies

```bash
bun install --production
```

### 3. Start the server

```bash
bun run start
```

### 4. Process manager (recommended)

Use **PM2** or a similar process manager for production:

```bash
# Using PM2
pm2 start src/server.js --name placeiit-api --interpreter bun

# Or using systemd (create a service file)
```

### 5. Docker deployment

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY src ./src
COPY uploads ./uploads
EXPOSE 5001
CMD ["bun", "src/server.js"]
```

```bash
docker build -t placeiit-server .
docker run -d --name placeiit-api \
  -p 5001:5001 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/placement_platform \
  -e JWT_SECRET=your_secret \
  -e CLIENT_URL=http://localhost:5173 \
  placeiit-server
```

### 6. Reverse proxy (Nginx)

```nginx
upstream placeiit_api {
    server 127.0.0.1:5001;
}

server {
    listen 80;
    server_name api.placeiit.in;

    location / {
        proxy_pass http://placeiit_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://placeiit_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔐 Roles & Access

| Role | Constant | Access Level |
|------|----------|-------------|
| `student` | `ROLES.STUDENT` | Own profile, queues, notifications |
| `coco` | `ROLES.COCO` | Assigned company management, queue control |
| `admin` | `ROLES.ADMIN` | Full system access, Excel uploads, allocations |

> **Note**: The frontend maps `admin` → `apc` for display purposes.

---

## 📡 API Endpoints

### Health Check
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/health` | — | Server health status |

### Auth (`/api/auth`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/login` | — | Login with institute credentials |
| GET | `/me` | Bearer | Get current user |
| POST | `/register` | Admin | Register user (admin only) |

### Student (`/api/student`)
*All routes require `student` role.*

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/profile` | View profile |
| PUT | `/profile` | Update profile |
| GET | `/companies` | Shortlisted companies (priority sorted) |
| POST | `/queue/join` | Join company queue |
| POST | `/queue/walkin` | Join walk-in queue |
| GET | `/queue/:companyId` | Get queue position |
| GET | `/walkins` | Available walk-in companies |
| GET | `/notifications` | Get notifications |
| PUT | `/notifications/:id/read` | Mark notification as read |

### CoCo (`/api/coco`)
*All routes require `coco` role.*

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/company` | Assigned companies |
| GET | `/company/:id/students` | Shortlisted students |
| GET | `/company/:id/rounds` | Interview rounds |
| PUT | `/company/:id/walkin` | Toggle walk-in mode |
| POST | `/queue/add` | Add student to queue |
| PUT | `/queue/status` | Update student status |
| POST | `/notify` | Send notification |
| GET | `/notifications/predefined` | Get predefined messages |
| POST | `/panel` | Add panel |
| POST | `/round` | Add round |

### Admin (`/api/admin`)
*All routes require `admin` role.*

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/stats` | Dashboard stats |
| GET | `/companies` | All companies (filter by day/slot) |
| POST | `/companies` | Add company |
| PUT | `/companies/:id` | Update company |
| GET | `/students/search` | Search students |
| GET | `/cocos` | All coordinators |
| POST | `/assign-coco` | Assign CoCo to company |
| POST | `/remove-coco` | Remove CoCo from company |
| POST | `/upload/companies` | Upload company Excel |
| POST | `/upload/shortlist` | Upload shortlist Excel |
| POST | `/upload/coordinator-requirements` | Upload CoCo requirements |
| GET | `/upload/:id` | Get upload status |

### Company (`/api/company`)
*Requires any authenticated user.*

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:id` | Get company details |
| GET | `/:id/queue` | Get company queue |

---

## 🔌 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join:company` | `companyId` | Subscribe to company queue updates |
| `join:user` | `userId` | Subscribe to personal notifications |
| `queue:fetch` | `{ companyId }` | Request live queue snapshot |

### Server → Client
| Event | Description |
|-------|-------------|
| `queue:updated` | Queue membership changed |
| `status:updated` | Student status changed |
| `notification:sent` | New notification received |
| `round:updated` | Interview round activated |
| `queue:snapshot` | Full queue data response |

---

## 📊 Excel Upload Formats

### Company Info (`/upload/companies`)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | ✅ | Company name |
| `day` | number | ✅ | Interview day number |
| `slot` | string | ✅ | `morning` / `afternoon` / `evening` |
| `venue` | string | ✅ | Location |
| `mode` | string | — | `online` / `offline` / `hybrid` |
| `totalRounds` | number | — | Total interview rounds |

### Student Shortlist (`/upload/shortlist`)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `rollNumber` | string | ✅ | Student roll number |
| `companyName` | string | ✅ | Must match company in DB |
| `priorityOrder` | number | ✅ | Student's priority rank |

### CoCo Requirements (`/upload/coordinator-requirements`)
| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `companyName` | string | ✅ | Must match company in DB |
| `cocoCount` | number | ✅ | Coordinators needed |

---

## 🌱 Student Status Flow

```
NOT_JOINED → IN_QUEUE → IN_INTERVIEW → COMPLETED
                                     → REJECTED
                      → ON_HOLD
                                     → OFFER_GIVEN
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start with hot-reload (development) |
| `bun run start` | Start without hot-reload (production) |
| `bun run migrate` | Sync indexes + run data migrations |
| `bun run migrate:status` | Show DB status (doc counts, indexes) |
| `bun run migrate:seed` | Run migrations + seed test users |
| `bun run seed` | Seed test users only |

---

## 🧰 Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Bun / Node.js |
| Framework | Express 4 |
| Database | MongoDB + Mongoose 7 |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | Socket.IO 4 |
| File Upload | Multer |
| Excel Parsing | xlsx |

---

## 🤝 Related

- **Frontend**: See [`../client/README.md`](../client/README.md) for the React + Vite frontend.
