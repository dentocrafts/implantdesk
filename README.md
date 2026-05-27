# ImplantDesk

B2B dental implant component ordering platform for dental professionals.

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS, shadcn/ui, React Query
- **Backend:** Supabase (PostgreSQL, Auth, Storage)

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the schema

In the Supabase **SQL Editor**, run:
1. `supabase/schema.sql` — tables, RLS policies, triggers, storage bucket
2. `supabase/seed.sql` — 25 sample implant components

### 3. Set environment variables

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key (from **Project Settings → API**):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install and run

```bash
npm install
npm run dev
```

App runs at http://localhost:5173

## Granting Admin Access

After a user registers, run this in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@yourdomain.com');
```

## Features

| Route | Description |
|-------|-------------|
| `/auth` | Login / Register |
| `/catalog` | Component catalog with filters |
| `/cart` | Cart & checkout |
| `/orders` | Order history with reorder |
| `/admin` | Admin panel (admin role only) |

### Catalog Filters
- Implant System (Straumann, Nobel Biocare, Osstem, MIS, BioHorizons)
- Abutment Type (Straight, Angled 17°, Angled 30°, Multi-unit, Temporary, Scan Body)
- Gingival Height (1–6mm, multi-select)
- Platform Diameter
- Material
- Full-text search (name, component code, manufacturer code)
- Export filtered view as CSV

### Admin Panel
- Add / edit / delete components with image upload to Supabase Storage
- Toggle active/inactive per component
- Inline stock quantity editing
- View all orders, update status (pending → confirmed → shipped → delivered)
