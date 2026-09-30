// Xem trước kinh tế của 1 deal (không ghi DB)
import { route } from '../../../lib/http';
import { quote } from '../../../lib/deals';

export default route({ GET: req => quote(req.query) }, { admin: true });
