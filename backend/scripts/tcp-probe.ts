// @ts-nocheck
const net = require('net');

const HOST = process.env.ZK_DEVICE_IP || '192.168.0.225';
const PORTS = (process.env.ZK_PROBE_PORTS || '4370,5005,5055,5020,5010,5050')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter(Boolean);
const TIMEOUT_MS = Number(process.env.ZK_PROBE_TIMEOUT_MS || 5000);

function toHex(buffer) {
  return buffer.toString('hex').replace(/(.{2})/g, '$1 ').trim();
}

function probePort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    let received = Buffer.alloc(0);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.once('connect', () => {
      console.log(`[OPEN] ${HOST}:${port} connected`);
      socket.write('\r\n');
      setTimeout(() => {
        finish({ port, open: true, received });
      }, 1200);
    });

    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      console.log(`[DATA] ${HOST}:${port} ${chunk.length} bytes`);
      console.log(`  TEXT: ${chunk.toString('utf8').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}`);
      console.log(`  HEX : ${toHex(chunk)}`);
    });

    socket.once('timeout', () => {
      finish({ port, open: false, error: 'timeout' });
    });

    socket.once('error', (error) => {
      finish({ port, open: false, error: error.code || error.message });
    });

    socket.connect(port, HOST);
  });
}

async function main() {
  console.log('========================================');
  console.log('Ronald Jack TCP Probe');
  console.log('========================================');
  console.log(`Host: ${HOST}`);
  console.log(`Ports: ${PORTS.join(', ')}`);
  console.log('');

  for (const port of PORTS) {
    const result = await probePort(port);
    if (!result.open) {
      console.log(`[CLOSED] ${HOST}:${port} ${result.error}`);
    } else if (!result.received.length) {
      console.log(`[NO DATA] ${HOST}:${port} open but no banner/data after connect`);
    }
    console.log('');
  }

  console.log('Done. Nếu port 4370 open nhưng không trả data thì cần SDK/protocol command đúng, không thể chỉ HTTP GET/POST.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
