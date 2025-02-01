require("dotenv").config(); // ✅ โหลดค่า .env
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mqtt = require("mqtt");

console.log("🔹 Username:", process.env.MQTT_USERNAME);
console.log("🔹 Password:", process.env.MQTT_PASSWORD ? "********" : "Not Set");

const BROKER = "mqtts://2217876f209d4a73af014e541592ee16.s1.eu.hivemq.cloud:8883";
const TOPICS = ["OA_Temp", "OA_Humidity", "Room1_Temp", "Room1_Humidity"]; // ✅ รองรับหลาย Topic

const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: true
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "https://vav-qsncc.onrender.com", methods: ["GET", "POST"] } });
const client = mqtt.connect(BROKER, options);

let messages = {};

client.on("connect", () => {
    console.log("✅ Connected to HiveMQ Cloud");
    client.subscribe(TOPICS, (err) => {
        if (!err) console.log(`📡 Subscribed to topics: ${TOPICS.join(", ")}`);
    });
});

client.on("message", (topic, message) => {
    const msg = message.toString();
    console.log(`📩 MQTT Received: ${topic} - ${msg}`);

    if (!messages[topic]) messages[topic] = [];
    messages[topic].push({ time: new Date().toLocaleTimeString(), message: msg });

    if (messages[topic].length > 10) messages[topic].shift();

    io.emit("mqttData", messages);
});

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

client.on("error", (error) => console.error("❌ Connection Error:", error));
