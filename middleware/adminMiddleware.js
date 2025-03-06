import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://cbdbitjcgjlvcezcnojh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZGJpdGpjZ2psdmNlemNub2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY5OTAwMCwiZXhwIjoyMDUzMjc1MDAwfQ.VZMhsfJucljLP0IfxVZwbel5oYVLkWnHI9To3zo9O24';
const supabase = createClient(supabaseUrl, supabaseKey);

export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const isAdmin = data.user.user_metadata?.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    req.user = data.user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
