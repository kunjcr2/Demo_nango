// Configuration
const prompt = require("prompt-sync")();
const NANGO_BASE_URL = "https://api.nango.dev";
const NANGO_SECRET_KEY =
  process.env.NANGO_SECRET_KEY || "";

const ids = {
  slack: "ae5f9b84-c358-49df-841f-275796bb3f3d",
  youtube: "dbb84393-529b-4192-bc2c-b44778092674",
  gmail: "077b4d0c-77dc-48e7-a588-62d0d3244d90",
  github: "074ddd0e-5305-437b-8779-4aa44abc52ee",
};

// Input from user
const app_name = prompt("App name: ");

const PROVIDER_CONFIG_KEY = app_name;
const CONNECTION_ID = ids[PROVIDER_CONFIG_KEY];

// Helper function to make authenticated requests to Nango
async function makeNangoRequest(endpoint, options = {}) {
  const url = `${NANGO_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${NANGO_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Nango API Error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

// Check if connection exists
async function checkConnection(providerConfigKey, connectionId) {
  try {
    console.log("Checking connection...");

    const data = await makeNangoRequest(
      `/connection/${connectionId}?provider_config_key=${providerConfigKey}`
    );

    console.log("Connection found:", data);
    return data;
  } catch (error) {
    console.error("Connection check failed:", error.message);
    throw error;
  }
}

// List all connections for a provider
async function listConnections(providerConfigKey) {
  try {
    console.log("Listing connections...");

    const data = await makeNangoRequest(
      `/connections?provider_config_key=${providerConfigKey}`
    );

    console.log("Connections:", data);
    return data;
  } catch (error) {
    console.error("Failed to list connections:", error.message);
    throw error;
  }
}

// Handle connection errors
async function handleConnectionError() {
  try {
    console.log("Attempting to recover from connection error...");

    // List all connections to see what's available
    const connections = await listConnections(PROVIDER_CONFIG_KEY);

    if (!connections || connections.length === 0) {
      console.log("No valid connections found. User needs to authenticate.");
      return {
        success: false,
        error: "No valid connections. Please re-authenticate.",
        authUrl: generateAuthUrl(),
      };
    }

    // Try using the first available connection
    const validConnectionId = connections[0].connection_id;
    console.log(`Retrying with connection: ${validConnectionId}`);

    const result = await postToYouTubeAPI(
      "/channels",
      {
        part: "snippet",
        mine: true,
      },
      validConnectionId
    );

    return result;
  } catch (recoveryError) {
    console.error("Recovery failed:", recoveryError.message);
    return {
      success: false,
      error: "Failed to recover connection. Please re-authenticate.",
      authUrl: generateAuthUrl(),
    };
  }
}

// Generate OAuth URL for re-authentication
function generateAuthUrl() {
  const publicKey = process.env.NANGO_PUBLIC_KEY;
  const newConnectionId = `user_${Date.now()}`;
  return `https://api.nango.dev/oauth/connect/${publicKey}?config_key=${PROVIDER_CONFIG_KEY}&connection_id=${newConnectionId}`;
}

// Usage examples
async function main() {
  try {
    const result = await checkConnection(PROVIDER_CONFIG_KEY, CONNECTION_ID);
  } catch (error) {
    console.error("Main execution failed:", error.message);
  }
}

// Run the main function
main();
