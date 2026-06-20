export function requireRole(allowedRoles) {
  return (req, _res, next) => {
    const role = req.profile?.role;
    if (!allowedRoles.includes(role)) {
      const error = new Error('You do not have permission for this action');
      error.status = 403;
      return next(error);
    }
    next();
  };
}
