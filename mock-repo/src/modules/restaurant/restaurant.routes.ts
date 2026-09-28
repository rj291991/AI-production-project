import { Router } from "express";
import { getRestaurant, listRestaurants, createRestaurant } from "./restaurant.controller";
const router = Router();

router.get('/', listRestaurants)
router.get('/:id', getRestaurant)
router.post('/', createRestaurant)

export default router;