# Study Productivity

Kelola tugas kuliah, deadline, jadwal, catatan, dan progres semester. Berjalan sepenuhnya di browser, data tersimpan di perangkat (IndexedDB), bisa di-install sebagai PWA dan dipakai offline.

## Menjalankan

```bash
npm install
npm run dev        # development di http://localhost:5173
npm run build      # build produksi ke dist/
npm run preview    # coba hasil build di http://localhost:4173
```

Butuh Node.js 20 atau lebih baru.

## Install di laptop

Buka hasil `npm run preview` (atau situs yang sudah di-deploy) di Chrome/Edge, lalu klik ikon **Install** di address bar. Aplikasi akan muncul sendiri dan jalan offline.

## Fitur

- **Beranda**: kelas hari ini, deadline terdekat, ringkasan, progres tugas
- **Tugas**: judul, mata kuliah, deadline, prioritas, filter dan urutan, tandai selesai
- **Jadwal**: tampilan mingguan, kelas yang sedang berlangsung ditandai
- **Catatan**: per mata kuliah, dengan pencarian
- **Progres**: per mata kuliah, beban deadline 7 hari, posisi minggu semester
- **Mata kuliah**: nama, dosen, SKS, warna
- **Pengaturan**: tema (otomatis/terang/gelap), tanggal semester, unduh/pulihkan cadangan JSON, data contoh

## Penting

Data hanya ada di browser perangkat ini. Unduh cadangan dari **Pengaturan > Data** secara berkala.

## Stack

Vite, React 19, TypeScript, React Router (HashRouter), Dexie (IndexedDB), date-fns, vite-plugin-pwa. Styling dengan CSS native: `light-dark()`, `color-mix()`, container queries, `<dialog>`, Popover API, `backdrop-filter` dengan fallback solid.

## Struktur

```
src/
├── components/   Layout, Dialog, Forms, TaskRow, Icon, Bits
├── lib/          db (Dexie + backup/demo), dates, theme, semester, hooks
├── pages/        Dashboard, Tasks, Schedule, Notes, Progress, Courses, Settings
└── styles/       tokens.css, base.css, app.css
```
