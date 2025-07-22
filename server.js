require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Configuration
const NANGO_BASE_URL = "https://api.nango.dev";
const NANGO_SECRET_KEY =
  process.env.NANGO_SECRET_KEY || "";

const ids = {
  slack: "ae5f9b84-c358-49df-841f-275796bb3f3d",
  youtube: "dbb84393-529b-4192-bc2c-b44778092674",
  gmail: "077b4d0c-77dc-48e7-a588-62d0d3244d90",
  github: "074ddd0e-5305-437b-8779-4aa44abc52ee",
};

// Helper function to make authenticated requests to Nango using axios
async function makeNangoRequest(endpoint, options = {}) {
  const url = `${NANGO_BASE_URL}${endpoint}`;

  try {
    const response = await axios({
      url,
      method: options.method || "get",
      headers: {
        Authorization: `Bearer ${NANGO_SECRET_KEY}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      data: options.body,
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `Nango API Error: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    }
    throw error;
  }
}

// Check if connection exists
app.get("/check-connection", async (req, res) => {
  try {
    const { app_name } = req.query;

    if (!app_name) {
      return res
        .status(400)
        .json({ error: "app_name query parameter is required" });
    }

    const PROVIDER_CONFIG_KEY = app_name;
    const CONNECTION_ID = ids[PROVIDER_CONFIG_KEY];

    if (!CONNECTION_ID) {
      return res.status(400).json({ error: "Invalid app name provided" });
    }

    console.log("Checking connection...");
    const data = await makeNangoRequest(
      `/connection/${CONNECTION_ID}?provider_config_key=${PROVIDER_CONFIG_KEY}`
    );

    console.log("Connection found:", data);
    res.json({ success: true, token: data.credentials.access_token });
  } catch (error) {
    console.error("Connection check failed:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all connections for a provider
app.get("/list-connections", async (req, res) => {
  try {
    const { app_name } = req.query;

    if (!app_name) {
      return res
        .status(400)
        .json({ error: "app_name query parameter is required" });
    }

    const PROVIDER_CONFIG_KEY = app_name;

    console.log("Listing connections...");
    const data = await makeNangoRequest(
      `/connections?provider_config_key=${PROVIDER_CONFIG_KEY}`
    );

    console.log("Connections:", data);
    res.json({ success: true, token: data.credentials.access_token });
  } catch (error) {
    console.error("Failed to list connections:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle connection errors and attempt recovery
app.post("/handle-connection-error", async (req, res) => {
  try {
    const { app_name } = req.body;

    if (!app_name) {
      return res
        .status(400)
        .json({ error: "app_name is required in the request body" });
    }

    const PROVIDER_CONFIG_KEY = app_name;

    console.log("Attempting to recover from connection error...");

    // List all connections to see what's available
    const connections = await makeNangoRequest(
      `/connections?provider_config_key=${PROVIDER_CONFIG_KEY}`
    );

    if (!connections || connections.length === 0) {
      console.log("No valid connections found. User needs to authenticate.");
      return res.json({
        success: false,
        error: "No valid connections. Please re-authenticate.",
        authUrl: generateAuthUrl(PROVIDER_CONFIG_KEY),
      });
    }

    // Try using the first available connection
    const validConnectionId = connections[0].connection_id;
    console.log(`Retrying with connection: ${validConnectionId}`);

    res.json({
      success: true,
      message: `Recovery attempted with connection: ${validConnectionId}`,
      connectionId: validConnectionId,
    });
  } catch (recoveryError) {
    console.error("Recovery failed:", recoveryError.message);
    res.status(500).json({
      success: false,
      error: "Failed to recover connection. Please re-authenticate.",
      authUrl: generateAuthUrl(req.body.app_name),
    });
  }
});

// Generate OAuth URL for re-authentication
function generateAuthUrl(providerConfigKey) {
  const publicKey = process.env.NANGO_PUBLIC_KEY || "default_public_key";
  const newConnectionId = `user_${Date.now()}`;
  return `https://api.nango.dev/oauth/connect/${publicKey}?config_key=${providerConfigKey}&connection_id=${newConnectionId}`;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
