const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
    const uploadsDir = path.join(__dirname, '../uploads');

    // التأكد من وجود المجلد
    if (!fs.existsSync(uploadsDir)) {
        return res.json([]);
    }

    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            console.error('Gallery Error:', err);
            return res.status(500).json({ error: 'فشل في قراءة الملفات' });
        }

        // فلترة الملفات (نأخذ الصور فقط)
        const images = files.filter(file => {
            return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file);
        }).map(file => {
            // نرجع الرابط الكامل للصورة
            // ملاحظة: افترضنا أن السيرفر يقدم الملفات عبر المسار /uploads
            return `uploads/${file}`;
        });

        res.json(images);
    });
});

module.exports = router;