# Tv.TeamX2 - Private Room

غرف محادثة خاصة مع WebRTC و Socket.io وتشفير End-to-End

## الميزات
- اتصال صوتي مباشر عبر WebRTC
- محادثة نصية مشفرة بالكامل (End-to-End Encryption)
- غرف خاصة بمعرفات فريدة
- واجهة عربية بسيطة وسهلة الاستخدام

## التشغيل

### Backend
```bash
cd backend
npm install
npm run dev
```
الـ Backend سيعمل على المنفذ 4000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
الـ Frontend سيعمل على المنفذ 5173

## التقنيات المستخدمة
- **Backend**: Fastify, Socket.io, JWT
- **Frontend**: React, Vite, Socket.io-client
- **WebRTC**: للاتصال الصوتي المباشر
- **Crypto API**: تشفير ECDH + AES-GCM

## البنية
```
.
├── backend/
│   ├── server.js       # خادم Fastify + Socket.io
│   ├── sigAuth.js      # مصادقة JWT
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/      # صفحات Login و Room
    │   ├── components/ # مكونات UI
    │   ├── lib/        # وظائف التشفير
    │   └── styles/     # ملفات CSS
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## الاستخدام
1. افتح المتصفح على http://localhost:5173
2. أدخل اسم المستخدم
3. ستُنشأ غرفة جديدة تلقائياً
4. شارك رابط الغرفة مع المستخدم الآخر
5. اسمح للمتصفح بالوصول للميكروفون
6. ابدأ المحادثة الصوتية والنصية!

## ملاحظات
- يتطلب HTTPS في بيئة الإنتاج لـ WebRTC
- التشفير يتم على مستوى المتصفح (End-to-End)
- الخادم لا يحفظ أي رسائل أو بيانات
