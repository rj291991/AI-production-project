import { Router } from 'express';

import { listBranchMenuItems, createBranchMenuItem } from './branch-menu-item.controller';

const router = Router();
router.get('/:branchId', listBranchMenuItems);
router.post('/', createBranchMenuItem);
export default router;
