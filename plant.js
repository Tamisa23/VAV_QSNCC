require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mqtt = require("mqtt");

console.log("🔹 Username:", process.env.MQTT_USERNAME);
console.log("🔹 Password:", process.env.MQTT_PASSWORD ? "********" : "Not Set");

// 🔹 ตั้งค่า MQTT Broker
const BROKER = "mqtts://2217876f209d4a73af014e541592ee16.s1.eu.hivemq.cloud:8883";
const TOPICS = [
    "Ch1_kw", "Ch2_kw", "Ch3_kw",
    "Chp1_kw", "Chp2_kw", "Chp3_kw",
    "Cdp1_kw", "Cdp2_kw", "Cdp3_kw",
    "Ct1_kw", "Ct2_kw", "Ct3_kw",
    "VSD_Speed"
];

// 🔹 ตั้งค่าการเชื่อมต่อ MQTT
const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: true
};

// 🔹 สร้าง Express และ WebSocket Server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const client = mqtt.connect(BROKER, options);

// 🔹 เก็บค่าล่าสุดของแต่ละ `Topic`
let latestValues = {};

// ✅ เชื่อมต่อ MQTT Broker
client.on("connect", () => {
    console.log("✅ MQTT Connected");

    // 🔹 Subscribe ทุกหัวข้อที่กำหนด
    client.subscribe(TOPICS, (err) => {
        if (err) {
            console.error("❌ Subscribe Error:", err);
        } else {
            console.log(`✅ Subscribed to topics: ${TOPICS.join(", ")}`);
        }
    });
});

// ✅ รับข้อมูลจาก MQTT และส่งไปที่ WebSocket
client.on("message", (topic, message) => {
    let value = parseFloat(message.toString()).toFixed(2); // ✅ ทำให้เป็นทศนิยม 2 ตำแหน่ง

    console.log(`📩 MQTT Received: ${topic} - ${value}`);

    // 🔹 อัปเดตค่าล่าสุดของ `Topic`
    latestValues[topic] = value;

    // 🔹 ส่งข้อมูลไปที่ WebSocket (ให้ทุก Client ได้ค่าล่าสุด)
    io.emit("mqttData", latestValues);
});

// ✅ ตรวจจับข้อผิดพลาดของ MQTT
client.on("error", (error) => {
    console.error("❌ MQTT Connection Error:", error);
});

// ✅ ตรวจจับ MQTT Disconnect และพยายามเชื่อมต่อใหม่
client.on("close", () => {
    console.warn("⚠️ MQTT Disconnected! Reconnecting...");
    setTimeout(() => {
        client.reconnect();
    }, 5000);
});

// ✅ จัดการ WebSocket Connection
io.on("connection", (socket) => {
    console.log("🔌 New WebSocket Connection:", socket.id);

    // ✅ ส่งค่าล่าสุดให้กับ Client ที่เพิ่งเชื่อมต่อ
    socket.emit("mqttData", latestValues);

    // ✅ รับค่าจาก WebSocket และส่งไปยัง MQTT
    socket.on("setVsdSpeed", (speed) => {
        console.log(`⚡ Received VSD Speed from WebSocket: ${speed}`);
        client.publish("VSD_Speed", speed.toString(), { qos: 1, retain: true });
    });

    socket.on("disconnect", () => {
        console.log(`🔴 Client Disconnected: ${socket.id}`);
    });
});

// ✅ ตั้งค่า Endpoint บน Express
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// ✅ เปิดเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
