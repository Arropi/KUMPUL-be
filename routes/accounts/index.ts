import { Router } from "express";
import business_entity_router from "./business-entity-route";
import business_role_router from "./business-role-route";

const router = Router();

router.use('/entities', business_entity_router);
router.use('/roles', business_role_router);

export default router