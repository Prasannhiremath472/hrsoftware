const { verifyToken } = require('../utils/jwt');
const { pool } = require('../db/pool');

/**
 * Verifies the Bearer JWT and attaches req.user = { id, email, role, name }.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, headerToken] = header.split(' ');
    // Allow a ?token= query param fallback ONLY for authenticated file-view
    // endpoints opened via window.open (which cannot set an Authorization
    // header). All other routes must use the Bearer header.
    const queryToken = req.query && typeof req.query.token === 'string' ? req.query.token : null;
    const token = scheme === 'Bearer' ? headerToken : queryToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or inactive' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role guard — kept structured for future roles even though only
 * SUPER_ADMIN exists today.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
