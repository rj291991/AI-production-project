import { Router } from 'express';

import {
    createMenuItem,
    listMenuItems
} from './menu.controller';


const router = Router();


router.get('/', listMenuItems);

router.post('/', createMenuItem);


export default router;