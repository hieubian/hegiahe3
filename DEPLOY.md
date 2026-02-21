# Hướng dẫn Deploy HEGIAHE lên Vercel

---

## Bước 1 — Tạo tài khoản & chuẩn bị GitHub

### 1.1 Tạo tài khoản GitHub (nếu chưa có)
- Vào https://github.com → Sign up → làm theo hướng dẫn

### 1.2 Cài Git trên máy (nếu chưa có)
- Tải tại https://git-scm.com/download/win → cài mặc định

### 1.3 Tạo Repository mới trên GitHub
1. Đăng nhập GitHub → nhấn dấu **+** góc trên phải → **New repository**
2. Đặt tên repo: `hegiahe` (hoặc tên bất kỳ)
3. Chọn **Private** (không ai xem được code)
4. **Không** tick vào "Add README"
5. Nhấn **Create repository**
6. Sao chép đường dẫn HTTPS của repo (dạng `https://github.com/ten-cua-ban/hegiahe.git`)

---

## Bước 2 — Đẩy code lên GitHub

Mở **PowerShell** hoặc **Terminal**, điều hướng vào thư mục project rồi chạy lần lượt:

```bash
cd "c:\Users\hegia\Downloads\hegiahe backuop\hegiahe2"

# Khởi tạo git
git init

# Thêm tất cả file
git add .

# Tạo commit đầu tiên
git commit -m "initial commit"

# Kết nối với GitHub (thay URL bằng URL repo của bạn)
git remote add origin https://github.com/ten-cua-ban/hegiahe.git

# Đẩy code lên
git push -u origin main
```

> Lần đầu sẽ hỏi đăng nhập GitHub — nhập username và password (hoặc Personal Access Token nếu bật 2FA).

---

## Bước 3 — Deploy lên Vercel

### 3.1 Tạo tài khoản Vercel
1. Vào https://vercel.com
2. Nhấn **Sign Up** → chọn **Continue with GitHub**
3. Cho phép Vercel truy cập GitHub

### 3.2 Import project
1. Sau khi đăng nhập Vercel → nhấn **Add New... → Project**
2. Tìm repo `hegiahe` trong danh sách → nhấn **Import**
3. Vercel tự nhận ra Next.js, không cần chỉnh gì
4. Nhấn **Deploy**
5. Chờ khoảng 1–2 phút → xuất hiện confetti = deploy thành công 🎉

Vercel sẽ tạo cho bạn 1 URL tạm kiểu `hegiahe.vercel.app` để test ngay.

---

## Bước 4 — Gắn tên miền vào Vercel

### 4.1 Thêm domain trong Vercel
1. Vào project vừa deploy → tab **Settings → Domains**
2. Nhập tên miền của bạn (ví dụ: `hegiahe.com`) → nhấn **Add**
3. Vercel sẽ hiển thị 2 bản ghi DNS cần cấu hình, kiểu như:

   | Type  | Name | Value                   |
   |-------|------|-------------------------|
   | A     | @    | 76.76.21.21             |
   | CNAME | www  | cname.vercel-dns.com    |

   > Sao chép lại 2 giá trị này.

### 4.2 Trỏ DNS tại nhà cung cấp tên miền

Đăng nhập vào nơi bạn mua tên miền → vào mục **DNS / Name Servers / DNS Management**:

**Thêm bản ghi A:**
- Type: `A`
- Host / Name: `@`
- Value / Points to: `76.76.21.21`
- TTL: `Automatic` hoặc `3600`

**Thêm bản ghi CNAME:**
- Type: `CNAME`
- Host / Name: `www`
- Value / Points to: `cname.vercel-dns.com`
- TTL: `Automatic` hoặc `3600`

> Nếu đã có bản ghi A hoặc CNAME cũ thì xoá đi trước rồi thêm mới.

### 4.3 Chờ kích hoạt
- Thường mất **5–30 phút**, đôi khi tới 24 giờ
- Khi Vercel hiện dấu tích xanh cạnh tên miền là xong
- SSL (https) được Vercel cấp **miễn phí tự động**

---

## Bước 5 — Các lần cập nhật sau

Mỗi khi sửa code, chỉ cần chạy:

```bash
git add .
git commit -m "mô tả thay đổi"
git push
```

Vercel tự động **re-deploy** sau mỗi lần push — không cần làm gì thêm.

---

## Lưu ý quan trọng về dữ liệu

Project hiện đang dùng file `database/images.json` và lưu ảnh trong `/public/uploads`.  
Trên Vercel, **filesystem là read-only** — tức là upload ảnh mới sẽ không lưu được và sẽ mất sau mỗi lần deploy.

Để chạy thực tế lâu dài, cần nâng cấp lên:
- **Database:** [Supabase](https://supabase.com) hoặc [MongoDB Atlas](https://mongodb.com/atlas) (đều có free tier)
- **Lưu trữ ảnh:** [Cloudinary](https://cloudinary.com) (free 25GB) hoặc [Supabase Storage](https://supabase.com/storage)

Nếu cần hỗ trợ chuyển đổi phần này, hãy báo lại.

---

## Tóm tắt nhanh

```
Code → GitHub → Vercel → Domain
```

1. `git push` lên GitHub
2. Vercel import repo → Deploy
3. Vercel → Settings → Domains → thêm tên miền
4. DNS tại nhà cung cấp → thêm A record + CNAME
5. Chờ 30 phút → xong
