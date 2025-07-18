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
if (!NANGO_API_KEY || NANGO_API_KEY === "") {
  console.error(
    "❌ ERROR: Please set your NANGO_API_KEY environment variable or update the code with your actual API key"
  );
  console.error(
    "   You can get your API key from: https://app.nango.dev/environment-settings"
  );
  process.exit(1);
}

console.log("✅ Nango API Key loaded successfully");

// Initialize Nango
const nango = new Nango({ apiKey: NANGO_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint to get session token for Nango Connect
app.post("/api/nango/session", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Create a session token for the user
    const sessionToken = await nango.createSessionToken(userId);

    res.json({ sessionToken });
  } catch (error) {
    console.error("Error creating session token:", error);
    res.status(500).json({ error: "Failed to create session token" });
  }
});

// API endpoint to get connection details
app.get("/api/nango/connection/:connectionId", async (req, res) => {
  try {
    const { connectionId } = req.params;

    // Get connection details
    const connection = await nango.getConnection(connectionId);

    res.json({ connection });
  } catch (error) {
    console.error("Error getting connection:", error);
    res.status(500).json({ error: "Failed to get connection" });
  }
});

// API endpoint to list all connections for a user
app.get("/api/nango/connections", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Get all connections for the user
    const connections = await nango.listConnections({
      connectionId: userId,
    });

    res.json({ connections });
  } catch (error) {
    console.error("Error listing connections:", error);
    res.status(500).json({ error: "Failed to list connections" });
  }
});

// API endpoint to get access token for a specific integration
app.get("/api/nango/token/:integrationId/:connectionId", async (req, res) => {
  try {
    const { integrationId, connectionId } = req.params;

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
  console.log(`Make sure to set your NANGO_API_KEY environment variable`);
});
