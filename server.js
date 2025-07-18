const express = require("express");
const cors = require("cors");
const path = require("path");
const { Nango } = require("@nangohq/node");

const app = express();
const port = 5500;

// Load environment variables
require("dotenv").config();

// Environment variables
const NANGO_API_KEY = process.env.NANGO_API_KEY || "";
const NANGO_PUBLIC_KEY = process.env.NANGO_PUBLIC_KEY || "";

// Validate required environment variables
if (!NANGO_API_KEY) {
  console.error("❌ ERROR: Please set your NANGO_API_KEY environment variable");
  process.exit(1);
}

if (!NANGO_PUBLIC_KEY) {
  console.error(
    "❌ ERROR: Please set your NANGO_PUBLIC_KEY environment variable"
  );
  process.exit(1);
}

console.log("✅ Nango API Key loaded successfully");
console.log("✅ Nango Public Key loaded successfully");

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

// API endpoint to get public key for frontend
app.get("/api/nango/public-key", (req, res) => {
  res.json({ publicKey: NANGO_PUBLIC_KEY });
});

// API endpoint to create a connection session token
app.post("/api/nango/session", async (req, res) => {
  try {
    const { userId, integrationId } = req.body;

    if (!userId || typeof userId !== "string") {
      return res
        .status(400)
        .json({ error: "userId is required and must be a string" });
    }

    if (!integrationId || typeof integrationId !== "string") {
      return res
        .status(400)
        .json({ error: "integrationId is required and must be a string" });
    }

    // Create a connection session token for the frontend
    const sessionToken = await nango.createConnectionSessionToken(
      userId,
      integrationId
    );

    res.json({
      sessionToken: sessionToken.token,
      userId: userId,
      integrationId: integrationId,
      message: "Session token created successfully",
    });
  } catch (error) {
    console.error("Error creating session token:", error);
    res.status(500).json({
      error: "Failed to create session token",
      details: error.message,
    });
  }
});

// API endpoint to get connection details
app.get(
  "/api/nango/connection/:integrationId/:connectionId",
  async (req, res) => {
    try {
      const { integrationId, connectionId } = req.params;

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

      const connection = await nango.getConnection(integrationId, connectionId);
      res.json({ connection });
    } catch (error) {
      console.error("Error getting connection:", error);
      res.status(500).json({
        error: "Failed to get connection",
        details: error.message,
      });
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
    const result = await nango.listConnections(userId);

    res.json({
      connections: result.connections || [],
      totalCount: result.connections?.length || 0,
    });
  } catch (error) {
    console.error("Error listing connections:", error);
    res.status(500).json({
      error: "Failed to list connections",
      details: error.message,
    });
  }
});

// API endpoint to get access token for a specific integration
app.get("/api/nango/token/:integrationId/:connectionId", async (req, res) => {
  try {
    const { integrationId, connectionId } = req.params;
    const { forceRefresh } = req.query;

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
    const token = await nango.getToken(
      integrationId,
      connectionId,
      forceRefresh === "true"
    );

    res.json({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      rawTokenResponse: token.rawTokenResponse,
      integrationId,
      connectionId,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting token:", error);
    res.status(500).json({
      error: "Failed to get access token",
      details: error.message,
    });
  }
});

// API endpoint to get multiple access tokens at once
app.post("/api/nango/tokens/batch", async (req, res) => {
  try {
    const { connections } = req.body;

    if (!Array.isArray(connections) || connections.length === 0) {
      return res
        .status(400)
        .json({ error: "connections array is required and must not be empty" });
    }

    const tokens = [];
    const errors = [];

    for (const conn of connections) {
      try {
        const { integrationId, connectionId } = conn;

        if (!integrationId || !connectionId) {
          errors.push({
            integrationId: integrationId || "unknown",
            connectionId: connectionId || "unknown",
            error: "Missing integrationId or connectionId",
          });
          continue;
        }

        const token = await nango.getToken(integrationId, connectionId);
        tokens.push({
          integrationId,
          connectionId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          retrievedAt: new Date().toISOString(),
        });
      } catch (error) {
        errors.push({
          integrationId: conn.integrationId || "unknown",
          connectionId: conn.connectionId || "unknown",
          error: error.message,
        });
      }
    }

    res.json({
      tokens,
      errors,
      totalRequested: connections.length,
      successCount: tokens.length,
      errorCount: errors.length,
    });
  } catch (error) {
    console.error("Error getting batch tokens:", error);
    res.status(500).json({
      error: "Failed to get batch tokens",
      details: error.message,
    });
  }
});

// API endpoint to delete a connection
app.delete(
  "/api/nango/connection/:integrationId/:connectionId",
  async (req, res) => {
    try {
      const { integrationId, connectionId } = req.params;

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
      res.json({
        message: "Connection deleted successfully",
        integrationId,
        connectionId,
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({
        error: "Failed to delete connection",
        details: error.message,
      });
    }
  }
);

// API endpoint to check connection status
app.get(
  "/api/nango/connection/:integrationId/:connectionId/status",
  async (req, res) => {
    try {
      const { integrationId, connectionId } = req.params;

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

      const connection = await nango.getConnection(integrationId, connectionId);

      // Try to get token to verify connection is working
      try {
        const token = await nango.getToken(integrationId, connectionId);
        res.json({
          status: "active",
          connection: connection,
          hasValidToken: true,
          checkedAt: new Date().toISOString(),
        });
      } catch (tokenError) {
        res.json({
          status: "inactive",
          connection: connection,
          hasValidToken: false,
          error: tokenError.message,
          checkedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
      res.status(404).json({
        status: "not_found",
        error: "Connection not found",
        details: error.message,
      });
    }
  }
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    nango: {
      apiKeyConfigured: !!NANGO_API_KEY,
      publicKeyConfigured: !!NANGO_PUBLIC_KEY,
    },
  });
});

// 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📋 API Documentation available at http://localhost:${port}`);
});
