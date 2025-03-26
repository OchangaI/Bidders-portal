import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { verifyAdmin } from "../middleware/adminMiddleware.js"; // Middleware to check admin

const router = express.Router();

router.get("/", verifyAdmin, getSettings);
router.put("/", verifyAdmin, updateSettings);

export default router;
