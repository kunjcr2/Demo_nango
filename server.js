const express = require("express");
const cors = require("cors");
const path = require("path");
const { Nango } = require("@nangohq/node");

const app = express();
const port = 3000;

// Load environment variables (optional but recommended)
require("dotenv").config();

// Replace with your actual Nango API key
const NANGO_API_KEY = process.env.NANGO_API_KEY || "";

// Validate API key
if (!NANGO_API_KEY) {
  console.error("❌ ERROR: Please set your NANGO_API_KEY environment variable");
  process.exit(1);
}

console.log("✅ Nango API Key loaded successfully");

// Initialize Nango
const nango = new Nango({ secretKey: NANGO_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint to create a connection URL for Nango Connect
// This is a placeholder for the frontend authentication flow
app.post("/api/nango/session", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== "string") {
      return res
        .status(400)
        .json({ error: "userId is required and must be a string" });
    }

    // For frontend authentication flows, you typically need to:
    // 1. Use Nango's hosted authentication page
    // 2. Or implement the OAuth flow yourself
    
    // This is a mock response showing what would typically be returned
    res.json({
      message: "Session endpoint placeholder",
      userId: userId,
      note: "To implement OAuth flows, use Nango's hosted auth or implement OAuth directly",
      nangoAuthUrl: `https://api.nango.dev/oauth/authorize?` +
        `public_key=YOUR_PUBLIC_KEY&` +
        `connection_id=${userId}&` +
        `provider_config_key=YOUR_PROVIDER_CONFIG`
    });
  } catch (error) {
    console.error("Error in session endpoint:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// API endpoint to get connection details
app.get(
  "/api/nango/connection/:integrationId/:connectionId",
  async (req, res) => {
    try {
      const { integrationId, connectionId } = req.params;

      // 🔒 Guard: ensure both are strings
      if (!integrationId || typeof integrationId !== "string") {
        return res
          .status(400)
          .json({ error: "integrationId is required and must be a string" });
      }
      if (!connectionId || typeof connectionId !== "string") {
        return res
          .status(400)
          .json({ error: "connectionId is required and must be a string" });
      }

      // Get connection details
      const connection = await nango.getConnection(integrationId, connectionId);
      res.json({ connection });
    } catch (error) {
      console.error("Error getting connection:", error);
      res.status(500).json({ error: "Failed to get connection" });
    }
  }
);

// API endpoint to list all connections for a user
app.get("/api/nango/connections", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res
        .status(400)
        .json({ error: "userId is required and must be a string" });
    }

    // Get all connections for the user
    // listConnections takes an optional connectionId parameter (not an object)
    const result = await nango.listConnections(userId);

    res.json({ connections: result.connections });
  } catch (error) {
    console.error("Error listing connections:", error);
    res.status(500).json({ error: "Failed to list connections" });
  }
});

// API endpoint to get access token for a specific integration
app.get("/api/nango/token/:integrationId/:connectionId", async (req, res) => {
  try {
    const { integrationId, connectionId } = req.params;

    // 🔒 Guard: ensure both are strings
    if (!integrationId || typeof integrationId !== "string") {
      return res
        .status(400)
        .json({ error: "integrationId is required and must be a string" });
    }
    if (!connectionId || typeof connectionId !== "string") {
      return res
        .status(400)
        .json({ error: "connectionId is required and must be a string" });
    }

    // Get the access token for the specific integration
    const token = await nango.getToken(integrationId, connectionId);

    res.json({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      rawTokenResponse: token.rawTokenResponse,
    });
  } catch (error) {
    console.error("Error getting token:", error);
    res.status(500).json({ error: "Failed to get access token" });
  }
});

// API endpoint to delete a connection
app.delete(
  "/api/nango/connection/:integrationId/:connectionId",
  async (req, res) => {
    try {
      const { integrationId, connectionId } = req.params;

      // 🔒 Guard: ensure both are strings
      if (!integrationId || typeof integrationId !== "string") {
        return res
          .status(400)
          .json({ error: "integrationId is required and must be a string" });
      }
      if (!connectionId || typeof connectionId !== "string") {
        return res
          .status(400)
          .json({ error: "connectionId is required and must be a string" });
      }

      await nango.deleteConnection(integrationId, connectionId);
      res.json({ message: "Connection deleted successfully" });
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  }
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
