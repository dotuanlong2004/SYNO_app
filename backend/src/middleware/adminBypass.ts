'use strict';

/**
 * Admin Web Bypass Middleware
 * Cho phép admin web truy cập mà không cần xác thực (chỉ dùng trong mạng nội bộ)
 */
function adminBypass(req, res, next) {
  // Tạo user giả lập admin cho admin web
  req.user = {
    id: 'admin-web-bypass',
    role: 'admin',
    school_id: req.get('x-school-id') || '1',
    email: 'admin@school.local'
  };
  next();
}

module.exports = { adminBypass };
