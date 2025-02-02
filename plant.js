require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mqtt = require("mqtt");

console.log("🔹 Username:", process.env.MQTT_USERNAME);
console.log("🔹 Password:", process.env.MQTT_PASSWORD ? "********" : "Not Set");

const BROKER = "mqtts://2217876f209d4a73af014e541592ee16.s1.eu.hivemq.cloud:8883";
const TOPICS = [
    "Ch1_kw", "Ch2_kw", "Ch3_kw",
    "Chp1_kw", "Chp2_kw", "Chp3_kw",
    "Cdp1_kw", "Cdp2_kw", "Cdp3_kw",
    "Ct1_kw", "Ct2_kw", "Ct3_kw"
];

const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: true
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "https://vav-qsncc.onrender.com", methods: ["GET", "POST"] } });
const client = mqtt.connect(BROKER, options);

// 🔹 เก็บค่าล่าสุดของแต่ละ `Topic`
let latestValues = {};

// ✅ Subscribe ทุก Topic
client.on("message", (topic, message) => {
    let value = parseFloat(message.toString()).toFixed(2); // ✅ ทำให้เป็นทศนิยม 2 ตำแหน่ง
    console.log(`📩 MQTT Received: ${topic} - ${value}`);

    // 🔹 อัปเดตค่าล่าสุดของ `Topic`
    latestValues[topic] = value;

    // 🔹 ส่งข้อมูลไปที่ WebSocket (ให้ทุก Client ได้ค่าล่าสุด)
    io.emit("mqttData", latestValues);
});

client.on("connect", () => {
    console.log("✅ Connected to HiveMQ Cloud");

    client.subscribe(TOPICS, (err) => {
        if (!err) {
            console.log(`📡 Subscribed to topics: ${TOPICS.join(", ")}`);
        } else {
            console.error("❌ MQTT Subscribe Failed:", err);
        }
    });
});

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

client.on("error", (error) => console.error("❌ Connection Error:", error));
