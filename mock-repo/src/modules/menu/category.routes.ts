import { Router } from 'express';
import { createCategory, listCategories } from './category.controller';
const router = Router();
router.get('/', listCategories);
router.post('/', createCategory);
export default router;
