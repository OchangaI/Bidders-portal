import express from "express";
import { 
    subscribeUser, 
    getSubscribers, 
    // getNotificationsBySubscriberId
} from "../controllers/notificationController.js";

const router = express.Router();

router.post("/subscribe", subscribeUser);
// router.get("/notifications/:id", getNotificationsBySubscriberId);
router.get("/", getSubscribers); // Placeholder, can return all or filtered

export default router;
