# School Photo Ticket Studio

MVP web lokal untuk membuat tiket photoshoot sekolah dari template gambar custom, menempelkan barcode HD, export ZIP/PDF/CSV, dan scan tiket untuk check-in. Semua data disimpan lokal dengan SQLite.

## Cara Install

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Buka aplikasi di:

```bash
http://localhost:3000
```

Login user default:

```text
Super Admin: superadmin / 123456
Admin: admin / 222222
Operator Scan: operator / 333333
```

Sebelum dipakai sungguhan, login sebagai Super Admin lalu ganti PIN user di menu Pengaturan.

## Mode Online Dengan Neon

Untuk online, database Neon memakai PostgreSQL. Mode lokal tetap memakai SQLite, sedangkan mode online memakai schema khusus di `prisma/schema.postgres.prisma`.

1. Buat project database di Neon.
2. Salin connection string Neon ke `.env` saat deploy:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/dbname?sslmode=require"
```

3. Push struktur tabel ke Neon:

```bash
npm run prisma:push:neon
```

4. Build aplikasi untuk Neon:

```bash
npm run build:neon
npm run start
```

Catatan penting: file template dan hasil tiket tetap disimpan di storage server. Kalau deploy ke VPS, pastikan folder `public/uploads` dan `public/generated` ikut dibackup. Untuk platform serverless, pindahkan storage file ke object storage sebelum dipakai produksi.

## Fitur Yang Sudah Jadi

- Dashboard ringkasan event, template, tiket dibuat, dan tiket check-in.
- CRUD dasar event: create, list, detail.
- Upload template PNG/JPG/JPEG dengan validasi ukuran 12 MB dan dimensi maksimal 5000 px.
- Editor posisi barcode dengan drag, resize via input persen, pilihan QR Code, Code128, PDF417, background putih/transparan, dan show text Code128.
- Generate preview dummy untuk template.
- Import CSV siswa dengan validasi kolom wajib `student_name` dan `class_name`, maksimal 2000 baris.
- Generate tiket massal ke PNG HD dengan `sharp` dan barcode `bwip-js`.
- Export ZIP, PDF gabungan, dan manifest CSV.
- Endpoint download batch: `GET /api/batches/{id}/download/zip`, `pdf`, atau `csv`.
- Scanner kamera dengan `html5-qrcode`, cooldown 2 detik, status VALID, ALREADY_USED, NOT_FOUND, CANCELLED.
- Cancel ticket tersedia lewat API `POST /api/tickets/{id}/cancel`.
- Login user lokal dengan role Super Admin, Admin, dan Operator Scan.
- Halaman Pengaturan untuk backup ZIP, restore ZIP, download ulang batch, dan reset data test.

## Contoh CSV

File contoh tersedia di [samples/students.csv](samples/students.csv) untuk workspace dan di `/samples/students.csv` untuk download dari browser.

```csv
student_name,class_name,student_id,package_name,parent_name,phone,notes
Budi Santoso,6A,001,Paket A,Ibu Rina,08123456789,Lunas
Siti Aminah,6A,002,Paket B,Bapak Andi,08129876543,Ambil jam 10
```

## Template Contoh

Template placeholder tersedia di `public/sample-template.png`. Upload file itu dari halaman Template jika belum punya desain tiket sendiri.

## Catatan Scanner

- Kamera browser membutuhkan HTTPS atau `localhost`.
- Untuk tes scanner dari HP, gunakan tunnel HTTPS seperti ngrok/cloudflared atau setup HTTPS lokal.
- Barcode hanya menyimpan `ticketCode`, bukan data pribadi lengkap. Mapping siswa tersimpan di SQLite lokal.

## Checklist Testing Manual

- Upload template PNG valid.
- Tolak file PDF/WebP/SVG.
- Tolak file lebih dari 12 MB.
- Simpan posisi barcode.
- Generate 5 tiket dari CSV.
- Download ZIP.
- Download PDF.
- Scan QR valid.
- Scan QR yang sama kedua kali harus ALREADY_USED.
- Scan kode random harus NOT_FOUND.
- Cancel tiket lalu scan harus CANCELLED.

## Struktur Folder

```text
app/
  api/                 API route App Router
  events/              Halaman event
  generate/            Halaman generate massal
  scanner/             Halaman scanner
  templates/           Halaman upload dan editor template
components/            Komponen UI reusable
lib/                   Helper db, barcode, image compose, csv, files, ticket code
prisma/schema.prisma   Schema SQLite untuk lokal
prisma/schema.postgres.prisma Schema PostgreSQL untuk Neon
public/                Asset publik, uploads, generated output
samples/students.csv   CSV contoh
```

## Catatan Keterbatasan MVP

- Belum ada auth; gunakan hanya di perangkat/local network yang dipercaya.
- Editor barcode memakai drag dan input numerik, belum ada handle resize visual.
- Tidak ada OCR atau pengisian teks siswa ke template; MVP fokus pada barcode ticketing.
- File generated dan uploads disimpan lokal di `public/` dan diabaikan git.

## Next Steps Production

- Tambahkan role admin sederhana dan proteksi route internal.
- Tambahkan halaman manajemen tiket penuh dengan search, cancel, dan reprint.
- Tambahkan template text fields untuk menempel nama siswa/kelas ke desain.
- Tambahkan audit log check-in dan backup database.
- Jalankan behind HTTPS lokal/edge device untuk scanner HP yang lebih nyaman.
# tiketing
