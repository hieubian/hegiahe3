# HEGIAHE2 - Full-Stack Image Gallery

Version nâng cấp của HEGIAHE với SQLite database, file upload, và full CRUD operations.

## ✨ Features

### Frontend (Yeezy-style UI)
- ✅ Ultra-minimalist design  
- ✅ Smooth Framer Motion animations
- ✅ Responsive masonry grid
- ✅ Mobile-optimized touch interactions
- ✅ Shallow routing với URL động

### Backend (Next.js API Routes)
- ✅ SQLite database (local, zero config)
- ✅ File upload với auto-optimization (Sharp)
- ✅ Thumbnail generation tự động
- ✅ RESTful API endpoints
- ✅ Admin authentication

### Admin Portal
- ✅ Upload nhiều ảnh cùng lúc
- ✅ Edit title & description
- ✅ Delete images
- ✅ Reorder images
- ✅ Optimistic UI updates

## 🚀 Quick Start

### 1. Cài đặt

```bash
cd hegiahe2
npm install
```

### 2. Setup Database

```bash
# Tạo database và tables
npm run db:setup

# (Optional) Seed sample data
npm run db:seed
```

### 3. Cấu hình

Copy `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Chỉnh sửa `.env`:
```env
ADMIN_PASSWORD=your_password_here
DATABASE_PATH=./database/hegiahe.db
```

### 4. Chạy Development Server

```bash
npm run dev
```

Website: http://localhost:3000  
Admin: http://localhost:3000/admin

## 📁 Cấu trúc Project

```
hegiahe2/
├── components/          # React components
│   ├── Navbar.tsx
│   ├── ImageCard.tsx
│   └── ImageModal.tsx
├── pages/
│   ├── index.tsx       # Gallery page
│   ├── p/[slug].tsx    # Image detail page
│   ├── admin/
│   │   └── index.tsx   # Admin dashboard
│   └── api/
│       ├── images/     # Public API
│       └── admin/      # Admin API (protected)
├── lib/
│   └── db.ts           # SQLite database functions
├── database/
│   └── hegiahe.db      # SQLite database file
├── public/
│   └── uploads/        # Uploaded images
├── scripts/
│   ├── setupDB.js      # Database setup script
│   └── seedDB.js       # Sample data seeder
└── styles/
    └── globals.css     # Yeezy-style CSS
```

## 🔌 API Endpoints

### Public API

**GET /api/images**
```bash
curl http://localhost:3000/api/images
```

**GET /api/images?slug=image-slug**
```bash
curl http://localhost:3000/api/images?slug=yeezy-boost-350
```

### Admin API (Requires Bearer Token)

**POST /api/admin/images** - Upload image
```bash
curl -X POST http://localhost:3000/api/admin/images \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
  -F "image=@/path/to/image.jpg" \
  -F "title=My Image" \
  -F "description=Optional description"
```

**PUT /api/admin/images** - Update image
```bash
curl -X PUT http://localhost:3000/api/admin/images \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "title": "Updated Title",
    "description": "Updated description"
  }'
```

**DELETE /api/admin/images?id=1** - Delete image
```bash
curl -X DELETE "http://localhost:3000/api/admin/images?id=1" \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
```

## 💾 Database Schema

```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## 🎨 Yeezy Color Palette

```css
--yeezy-sand: #E5DCC5
--yeezy-stone: #C7C1B0
--yeezy-clay: #8B7E74
--yeezy-black: #1A1816
--background: #FAFAF9
```

## 📝 Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run db:setup   # Initialize database
npm run db:seed    # Add sample data
```

## 🔒 Security

- Admin routes protected with Bearer token authentication
- File upload validation (type, size)
- SQL injection prevention (prepared statements)
- XSS protection (React escaping)

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `ADMIN_PASSWORD`
4. Deploy!

**Note:** SQLite database will reset on each deployment. Use PostgreSQL or external storage for production.

### Alternative: Local Server

```bash
npm run build
npm start
```

## 🐛 Troubleshooting

**Database errors:**
```bash
# Reset database
rm database/hegiahe.db
npm run db:setup
```

**Upload errors:**
```bash
# Check uploads directory permissions
mkdir -p public/uploads
chmod 755 public/uploads
```

**Port already in use:**
```bash
# Change port
PORT=3001 npm run dev
```

## 📚 Tech Stack

- **Framework:** Next.js 14
- **Database:** SQLite (better-sqlite3)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Image Processing:** Sharp
- **File Upload:** Formidable
- **Language:** TypeScript

## 🤝 So sánh với Hegiahe v1

| Feature | Hegiahe v1 | Hegiahe2 |
|---------|-----------|----------|
| Database | File system | SQLite |
| Upload | Manual copy | Web upload |
| Admin | No | Yes |
| API | No | Yes |
| CRUD | Read only | Full CRUD |
| Thumbnails | No | Auto-generated |
| File size tracking | No | Yes |
| Order control | No | Yes |

## 📄 License

MIT

---

Made with ❤️ using Yeezy-inspired minimalism
