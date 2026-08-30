# Dormitory Backoffice

ตั้ง `NEXT_PUBLIC_API_URL` ไปยัง NestJS API และใช้ `NEXT_PUBLIC_MOCK_MODE=false` สำหรับการเชื่อมต่อจริง หากต้องการเปิดข้อมูลสาธิตโดยไม่เรียก API ต้องตั้ง `NEXT_PUBLIC_MOCK_MODE=true` อย่างชัดเจน

## Authentication ใน MVP

Backoffice เก็บ access/refresh token ใน `sessionStorage` เพื่อลดระยะเวลาที่ token ค้างอยู่บนเครื่อง และใช้ cookie ที่ไม่มีข้อมูลลับเป็น marker ให้ Next middleware redirect route ที่ยังไม่ login ตัว client guard จะตรวจ access token ซ้ำอีกชั้น API client แนบ Bearer token, unwrap `{ data }` และ rotate token ผ่าน `/auth/refresh` เมื่อได้รับ 401

แนวทางนี้ยังเสี่ยงต่อ XSS เพราะ JavaScript อ่าน token ได้ จึงเหมาะกับ MVP เท่านั้น ก่อน production ควรย้าย refresh token ไปเป็น `HttpOnly Secure SameSite` cookie จาก Backend/BFF, ใช้ CSP เข้มงวด และไม่เก็บ refresh token ใน Web Storage
