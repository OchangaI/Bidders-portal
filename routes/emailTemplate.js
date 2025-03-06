import { Router } from "express";
const router = Router();
import EmailTemplate from "../models/EmailTemplate";

/**
 * Get all email templates
 */
router.get("/", async (req, res) => {
  try {
    const templates = await EmailTemplate.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get a single email template by type
 */
router.get("/:type", async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ type: req.params.type });
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Create or update an email template
 */
router.post("/", async (req, res) => {
  try {
    const { type, subject, body, variables } = req.body;

    const updatedTemplate = await EmailTemplate.findOneAndUpdate(
      { type },
      { subject, body, variables, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Template saved", template: updatedTemplate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Delete an email template
 */
router.delete("/:type", async (req, res) => {
  try {
    await EmailTemplate.findOneAndDelete({ type: req.params.type });
    res.json({ success: true, message: "Template deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
