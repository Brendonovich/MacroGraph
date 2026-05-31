import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";

const LIFX_PORT = 56700;
const SOURCE = 0x72757374;
const PROTOCOL = 1024;

const socket = createSocket("udp4");
const messageQueue = [];

function hex(buf) {
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join(" ");
}

function buildPacket(type, target, seq) {
  const isBroadcast = !target || target === "00:00:00:00:00:00";
  const tagged = isBroadcast ? 1 : 0;
  const frameWord = (0 << 14) | (tagged << 13) | (1 << 12) | PROTOCOL;

  const frame = Buffer.alloc(8);
  frame.writeUInt16LE(36, 0);
  frame.writeUInt16LE(frameWord, 2);
  frame.writeUInt32LE(SOURCE, 4);

  const frameAddr = Buffer.alloc(16);
  if (target) {
    const parts = target.split(":");
    for (let i = 0; i < 6 && i < parts.length; i++)
      frameAddr[i] = parseInt(parts[i], 16);
  }
  frameAddr[15] = seq;

  const protoHeader = Buffer.alloc(12);
  protoHeader.writeUInt16LE(type, 8);

  return Buffer.concat([frame, frameAddr, protoHeader]);
}

function getBroadcastAddresses() {
  const addresses = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        const parts = net.address.split(".");
        const mask = net.netmask.split(".");
        const broadcast = parts
          .map((p, i) => String(Number(p) | (~Number(mask[i]) & 255)))
          .join(".");
        if (!addresses.includes(broadcast)) addresses.push(broadcast);
        console.log(`[TEST] Interface ${name}: ${net.address} -> broadcast ${broadcast}`);
      }
    }
  }
  return addresses;
}

async function main() {
  console.log("=== LIFX Discovery Test v2 ===\n");

  return new Promise((resolve, reject) => {
    socket.on("error", (err) => {
      console.error("[TEST] Socket error:", err.message);
    });

    socket.on("listening", async () => {
      socket.setBroadcast(true);
      const addr = socket.address();
      console.log(`[TEST] Socket bound on 0.0.0.0:${addr.port}\n`);

      // Set up persistent listener BEFORE sending
      socket.on("message", (buf, rinfo) => {
        const type = buf.readUInt16LE(32);
        const target = Array.from({ length: 6 }, (_, i) =>
          buf[8 + i].toString(16).padStart(2, "0"),
        ).join(":");
        const seq = buf[23];
        console.log(
          `[TEST] <<< RECV from ${rinfo.address}:${rinfo.port} type=${type} seq=${seq} target=${target} (${buf.length} bytes)`,
        );
        console.log(`[TEST]     hex: ${hex(buf)}`);
        if (type === 3) {
          const service = buf.readUInt8(36);
          const port = buf.readUInt32LE(37);
          console.log(`[TEST]     => StateService: service=${service} port=${port}`);
        }
        if (type === 107) {
          const hue = buf.readUInt16LE(36);
          const sat = buf.readUInt16LE(38);
          const bri = buf.readUInt16LE(40);
          const kel = buf.readUInt16LE(42);
          const power = buf.readUInt16LE(46);
          const label = buf.subarray(48, 80).toString("utf-8").replace(/\0/g, "").trim();
          console.log(`[TEST]     => LightState: h=${hue} s=${sat} b=${bri} k=${kel} power=${power} label="${label}"`);
        }
        messageQueue.push({ buf, rinfo });
      });

      const broadcasts = getBroadcastAddresses();
      const allTargets = [...new Set([...broadcasts, "255.255.255.255"])];
      console.log(`\n[TEST] Broadcast targets: ${allTargets.join(", ")}`);

      const packet = buildPacket(2, "00:00:00:00:00:00", 1);
      console.log(`[TEST] GetService packet hex: ${hex(packet)}\n`);

      for (let attempt = 0; attempt < 3; attempt++) {
        console.log(`[TEST] Broadcast attempt ${attempt + 1}`);
        for (const addr2 of allTargets) {
          await new Promise((resolve2) => {
            socket.send(packet, LIFX_PORT, addr2, (err) => {
              if (err) console.error(`[TEST] Send error to ${addr2}:`, err.message);
              else console.log(`[TEST] Sent to ${addr2}:${LIFX_PORT}`);
              resolve2();
            });
          });
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
      }

      // Also try sending directly to bulb IP
      console.log(`\n[TEST] Sending directly to 192.168.0.61:56700...`);
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((resolve2) => {
          socket.send(packet, LIFX_PORT, "192.168.0.61", (err) => {
            if (err) console.error(`[TEST] Direct send error:`, err.message);
            else console.log(`[TEST] Sent directly to 192.168.0.61:56700`);
            resolve2();
          });
        });
        await new Promise((r) => setTimeout(r, 500));
      }

      console.log(`\n[TEST] Waiting 5 seconds for responses...`);
      await new Promise((r) => setTimeout(r, 5000));
      console.log(`\n[TEST] Done. Total messages received: ${messageQueue.length}`);
      
      socket.close();
      resolve();
    });

    socket.bind(56700);
  });
}

main().catch(console.error);
