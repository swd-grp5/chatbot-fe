# Deploy FE bằng Docker Compose

Chạy tại **thư mục gốc** `chatbox-fe` (có `docker-compose.yml`).

## Yêu cầu

- Docker Desktop

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `VITE_API_BASE_URL` | Có | URL API backend (đặt trong `.env` local, **không** ghi vào Dockerfile) |
| `VITE_GOOGLE_CLIENT_ID` | Có (nếu dùng Google login) | Client ID OAuth — cùng giá trị `GOOGLE_CLIENT_ID` trên BE |
| `FE_PORT` | Không (mặc định `5173`, giống `npm run dev`) | Cổng host map vào nginx trong container |

> `VITE_*` được **nhúng lúc build image**. Đổi URL API hoặc Google ID phải **build lại**: `docker compose build --no-cache fe`.

Sao chép mẫu:

```powershell
Copy-Item .env.example .env
# Điền VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID (file .env đã gitignore)
```

## Chạy

```powershell
docker compose up -d --build
```

Mở: `http://localhost:5173` (hoặc cổng `FE_PORT` bạn chọn).

## Backend / CORS

Thêm origin FE vào `CORS_ALLOWED_ORIGINS` trên backend, ví dụ:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-fe-domain.com
```

## Lệnh hữu ích

```powershell
docker compose logs -f fe
docker compose down
docker compose build --no-cache fe
docker compose up -d
```
