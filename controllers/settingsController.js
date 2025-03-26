import Settings from "../models/SettingsModel.js";
import EmailTemplate from "../models/EmailTemplate.js";

/**
 * Get all email templates (used in settings panel)
 */
export async function getEmailTemplates(req, res) {
  try {
    const templates = await EmailTemplate.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Update an email template from the settings panel
 */
export async function updateEmailTemplate(req, res) {
  try {
    const { type, subject, body, variables } = req.body;

    const updatedTemplate = await EmailTemplate.findOneAndUpdate(
      { type },
      { subject, body, variables, updatedAt: Date.now() },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Template updated", template: updatedTemplate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Get Settings
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Update Settings
 * Only Admins can update settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { user } = req; // Assuming user info is attached via middleware

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Access Denied" });
    }

    const updatedSettings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
