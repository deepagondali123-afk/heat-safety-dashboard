
const express = require("express");

const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/landing.html");
});
app.get("/login.html", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});
app.get("/Dashboard.html", (req, res) => {
  res.sendFile(__dirname + "/Dashboard.html");
});
app.get("/Resource.html", (req, res) => {
  res.sendFile(__dirname + "/Resource.html");
});

app.get("/Worker.html", (req, res) => {
  res.sendFile(__dirname + "/Worker.html");
});

app.get("/Incident.html", (req, res) => {
  res.sendFile(__dirname + "/Incident.html");
});

app.get("/Alert.html", (req, res) => {
  res.sendFile(__dirname + "/Alert.html");
});

app.get("/setting.html", (req, res) => {
  res.sendFile(__dirname + "/setting.html");
});

app.get("/help.html", (req, res) => {
  res.sendFile(__dirname + "/help.html");
});

app.get("/safety.html", (req, res) => {
  res.sendFile(__dirname + "/safety.html");
});

app.get("/reset-password.html", (req, res) => {
  res.sendFile(__dirname + "/reset-password.html");
});

app.get("/a.html", (req, res) => {
  res.sendFile(__dirname + "/a.html");
});
// FortyGuard Environmental Parameters
app.post("/api/fortyguard-test", async (req, res) => {
  try {
  const { latitude, longitude, temperature } = req.body;
if (
  latitude === undefined ||
  longitude === undefined ||
  temperature === undefined
) {
  return res.status(400).json({
    error: true,
    message: "latitude, longitude and temperature are required"
  });
}

const now = new Date();

const texasTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).formatToParts(now);

const getPart = (type) =>
  texasTime.find(part => part.type === type)?.value;

const startDate =
  `${getPart('year')}-${getPart('month')}-${getPart('day')}`;

const startTime =
  `${getPart('hour')}:${getPart('minute')}`;

console.log("📅 FortyGuard Texas date:", startDate);
console.log("🕐 FortyGuard Texas time:", startTime);

const payload = {
  latitude: Number(latitude),
  longitude: Number(longitude),
  temperature: Number(temperature),
  date_time: {
   start_date: startDate,
   start_time: startTime,
   filter_type: 1
}
};
console.log("FORTYGUARD API KEY EXISTS:", !!process.env.FORTYGUARD_API_KEY);
console.log("FORTYGUARD PAYLOAD:", JSON.stringify(payload, null, 2));


    console.log("Sending to FortyGuard:", payload);

    const response = await fetch(
      "https://api.fortyguard.com/v1/env_params",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.FORTYGUARD_API_KEY
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("FortyGuard error:", result);
      return res.status(response.status).json(result);
    }

    const activityId = result?.data?.activity_id;

    if (!activityId) {
      return res.status(500).json({
        error: true,
        message: "No activity_id returned",
        result
      });
    }

    // Wait for FortyGuard to complete
    for (let attempt = 0; attempt < 20; attempt++) {

      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResponse = await fetch(
        `https://api.fortyguard.com/v1/status/${activityId}`,
        {
          method: "GET",
          headers: {
            "api-key": process.env.FORTYGUARD_API_KEY
          }
        }
      );

      const statusResult = await statusResponse.json();

        console.log(
        `🔥 FULL STATUS RESPONSE attempt ${attempt + 1}:`,
        JSON.stringify(statusResult, null, 2)
      );

      const status =
        statusResult?.data?.status?.toLowerCase();

      if (status === "completed" || status === "succeeded") {

        const location =
          statusResult?.data?.result?.locations?.[0];

        if (!location) {
          return res.status(500).json({
            error: true,
            message: "No location data returned",
            result: statusResult
          });
        }
        console.log("🔥 FULL FORTYGUARD RESULT:", JSON.stringify(statusResult, null, 2));
console.log("🔥 FORTYGUARD FINAL PARAMETERS:", JSON.stringify(location.parameters, null, 2));
        return res.json({
          error: false,
          status_code: 200,
          message: "Completed",

          data: {
            activity_id: activityId,
            latitude: location.lat,
            longitude: location.lon,
            temperature: location.temperature,
            parameters: location.parameters
          }
        });
      }

      if (status === "failed" || status === "error") {
        return res.status(500).json({
          error: true,
          message: "FortyGuard task failed",
          activity_id: activityId,
          result: statusResult
        });
      }
    }

    return res.json({
      error: false,
      message: "FortyGuard task is still processing",
      activity_id: activityId
    });

  } catch (error) {

    console.error("FortyGuard API error:", error);

    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: `Route not found: ${req.method} ${req.url}`
  });
});
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 HeatShield server running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("❌ SERVER ERROR:", err);
});

server.on("close", () => {
  console.log("⚠️ SERVER CLOSED");
});