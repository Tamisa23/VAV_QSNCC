const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mqtt = require("mqtt");
require("dotenv").config(); // ✅ โหลดค่าจากไฟล์ .env

console.log("🔹 Username:", process.env.MQTT_USERNAME);
console.log("🔹 Password:", process.env.MQTT_PASSWORD ? "********" : "Not Set");

// **ตั้งค่า MQTT Broker**
const BROKER = "mqtts://51c50770dd61458e8fb4690fa37fa5ce.s1.eu.hivemq.cloud:8883";

// **กำหนด Topics หลายตัวที่ต้องการ Subscribe**
const TOPICS = ["OA_Tmpe", "OA_Hum"];

// **ใช้ Environment Variables สำหรับ Username & Password**
const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: true
};

// **สร้าง Express Server**
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// **เชื่อมต่อไปยัง MQTT Broker**
const client = mqtt.connect(BROKER, options);

// **เก็บค่าที่ได้รับจาก MQTT ตามแต่ละ Topic**
let messages = {};

client.on("connect", () => {
    console.log("✅ Connected to HiveMQ Cloud");

    // **Subscribe ทุก Topics**
    client.subscribe(TOPICS, (err) => {
        if (!err) {
            console.log(`📡 Subscribed to topics: ${TOPICS.join(", ")}`);
        }
    });
});

// **รับข้อความจาก MQTT และส่งไปยัง WebSockets**
client.on("message", (topic, message) => {
    const msg = message.toString();
    console.log(`📩 MQTT Received: ${topic} - ${msg}`);

    // **สร้าง Array สำหรับแต่ละ Topic**
    if (!messages[topic]) {
        messages[topic] = [];
    }

    // **เก็บค่าล่าสุดของแต่ละ Topic**
    messages[topic].push({ time: new Date().toLocaleTimeString(), message: msg });

    // **ลบค่าที่เก่าเกินไป (เก็บสูงสุด 10 ค่า)**
    if (messages[topic].length > 10) {
        messages[topic].shift();
    }

    io.emit("mqttData", messages); // ✅ ส่งค่าทั้งหมดไปยัง WebSocket
});

// **เสิร์ฟไฟล์ HTML**
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// **เริ่ม Server**
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Web Server running at http://localhost:${PORT}`);
});

// **จัดการ Error**
client.on("error", (error) => {
    console.error("❌ Connection Error:", error);
});
