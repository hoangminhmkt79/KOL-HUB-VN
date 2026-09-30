import { route, toId } from '../../../lib/http';
import { markPayoutPaid } from '../../../lib/deals';

export default route({ PATCH: req => markPayoutPaid(toId(req.query.id), req.body || {}) }, { admin: true });
