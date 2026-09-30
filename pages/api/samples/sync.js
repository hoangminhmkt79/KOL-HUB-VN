import { route } from '../../../lib/http';
import { syncTikTok } from '../../../lib/sync';

export default route({ POST: () => syncTikTok() }, { admin: true });
