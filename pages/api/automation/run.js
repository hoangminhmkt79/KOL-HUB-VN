import { route } from '../../../lib/http';
import { runTick } from '../../../lib/automation';

export default route({ POST: () => runTick() }, { admin: true });
