/**
 * Simple role-based auth middleware (simulated for hackathon)
 * Reads X-User-Role header: admin | staff | user
 */

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'] || 'user';
    req.userRole = userRole;
    req.userId = req.headers['x-user-id'] || 'anonymous';
    if (roles.length > 0 && !roles.includes(userRole)) {
      return res.status(403).json({ success: false, message: `Access denied. Required: ${roles.join(' or ')}` });
    }
    next();
  };
}

export function extractUser(req, res, next) {
  req.userRole = req.headers['x-user-role'] || 'user';
  req.userId = req.headers['x-user-id'] || 'anonymous';
  next();
}

export default { requireRole, extractUser };
