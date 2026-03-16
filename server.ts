import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import webpush from "web-push";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const app = express();
const PORT = 3000;

// VAPID keys should be in your .env file
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:example@yourdomain.com";

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
} else {
  console.warn("VAPID keys not found. Push notifications will not work.");
}

app.use(bodyParser.json());

// In-memory storage for subscriptions (In a real app, save this to Firestore)
// But since we want it to work even when the site is closed, we need a way to access them.
// I'll provide a route to trigger notifications from the client.
let subscriptions: any[] = [];

app.post("/api/notifications/subscribe", (req, res) => {
  const subscription = req.body;
  // Check if subscription already exists
  const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
  }
  res.status(201).json({});
});

app.post("/api/notifications/unsubscribe", (req, res) => {
  const subscription = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
  res.status(200).json({});
});

app.post("/api/notifications/send", async (req, res) => {
  const { title, message, url } = req.body;
  const payload = JSON.stringify({ title, message, url });

  const promises = subscriptions.map(subscription => 
    webpush.sendNotification(subscription, payload).catch(err => {
      console.error("Error sending notification:", err);
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription has expired or is no longer valid
        subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
      }
    })
  );

  await Promise.all(promises);
  res.status(200).json({ success: true });
});

// Cron job for birthdays (runs every day at 09:00)
cron.schedule("0 9 * * *", async () => {
  console.log("Checking for birthdays...");
  // Note: In a real full-stack app, you'd fetch from Firestore here.
  // Since we are in a hybrid environment, we might need a different approach if we want the server to be the source of truth.
  // For now, I'll implement the trigger from the client side when the app is open, 
  // but the push system allows it to reach closed tabs.
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
