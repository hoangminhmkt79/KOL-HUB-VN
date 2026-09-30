import { isAdmin } from '../../../lib/auth';

export default function handler(req, res) {
  res.status(isAdmin(req) ? 200 : 401).json({ admin: isAdmin(req) });
}
