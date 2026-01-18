const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // التحقق من وجود الهيدر
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
    }

    // استخراج التوكن
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'توكن غير صالح' });
    }

    // فك التشفير
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ توحيد بيانات المستخدم في req.user
    req.user = { 
      userId: decodedToken.userId,
      email: decodedToken.email 
    };
    
    // ✅ إضافة req.userId أيضاً لدعم الأكواد القديمة
    req.userId = decodedToken.userId;
    
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    res.status(401).json({ error: 'جلسة غير صالحة' });
  }
};