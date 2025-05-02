import express from 'express';
import Tender from '../models/Tender.js';
import fetch from 'node-fetch';
import {
  getTenders,
  createTender,
  updateTender,
  deleteTender,
  // getFiltersData
} from '../controllers/tenderController.js';

const router = express.Router();

// Routes
router.get('/', getTenders);
router.post('/', createTender);
router.put('/:id', updateTender);
router.delete('/:id', deleteTender);
// router.get("/filters", getFiltersData);


// ✅ API to fetch all purchased tenders for a user
router.get("/purchased", async (req, res) => {
  try {
    let { userEmail } = req.query;
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    userEmail = decodeURIComponent(userEmail);

    // Fetch all tenders where userEmail exists in paidUsers
    const purchasedTenders = await Tender.find({ paidUsers: userEmail });

    res.json(purchasedTenders);
  } catch (error) {
    console.error("❌ Error fetching purchased tenders:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




export default router;
