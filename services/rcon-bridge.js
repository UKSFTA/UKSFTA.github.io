import express from 'express';
import dgram from 'node:dgram';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
const PORT = process.env.RCON_BRIDGE_PORT || 3001;

app.use(cors());
app.use(express.json());

const envPath = path.resolve(process.cwd(), '.env');
const env = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').replace(/^["']|["']$/g, '').trim();
    });
}

const config = {
    ip: process.env.ARMA_SERVER_IP || env.ARMA_SERVER_IP || "127.0.0.1",
    port: parseInt(process.env.ARMA_RCON_PORT || env.ARMA_RCON_PORT || "2302"),
    pass: process.env.ARMA_RCON_PASSWORD || env.ARMA_RCON_PASSWORD || ""
};

function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ -1) >>> 0;
}

function createBePacket(payload) {
    const header = Buffer.from([0x42, 0x45]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32LE(crc32(payload), 0);
    return Buffer.concat([header, crcBuf, payload]);
}

app.post('/api/rcon/command', async (req, res) => {
    const { command } = req.body;
    const client = dgram.createSocket('udp4');
    const timeout = setTimeout(() => { client.close(); res.status(504).json({ error: "Timeout" }); }, 5000);

    client.on('message', (msg) => {
        if (msg.length < 7) return;
        if (msg[6] === 0x00 && msg[7] === 0x01) {
            const p = Buffer.concat([Buffer.from([0xFF, 0x01, 0x00]), Buffer.from(command)]);
            client.send(createBePacket(p), 0, createBePacket(p).length, config.port, config.ip);
        } else if (msg[6] === 0x01) {
            clearTimeout(timeout);
            res.json({ output: msg.toString('utf8', 8) });
            client.close();
        }
    });

    const login = Buffer.concat([Buffer.from([0xFF, 0x00]), Buffer.from(config.pass)]);
    client.send(createBePacket(login), 0, createBePacket(login).length, config.port, config.ip);
});

app.listen(PORT, '0.0.0.0', () => { console.log(`[RCON_BRIDGE] Active on ${PORT}`); });