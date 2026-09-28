import { Router } from 'express';

import {
    getBranch,
    listBranches,
    createBranch
} from './branch.controller';


const router = Router();


router.get('/', listBranches);

router.get('/:id', getBranch);

router.post('/', createBranch);


export default router;