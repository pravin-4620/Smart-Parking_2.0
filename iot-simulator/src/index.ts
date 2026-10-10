import 'dotenv/config';
import mqtt from 'mqtt';
import { IoTTelemetryPayload } from '@smart-parking/shared';

if (process.env.NODE_ENV !== 'test' || process.env.IOT_TEST_SIMULATOR_ENABLED !== 'true') {
  throw new Error('The MQTT publisher is restricted to explicitly enabled test environments');
}

const brokerUrl = process.env.IOT_TEST_BROKER_URL;
const parkingId = process.env.PARKING_ID || process.argv[2];
const deviceId = process.env.DEVICE_ID || 'test-device-01';
const slotId = process.env.SLOT_ID || process.argv[3];
const occupiedArg = process.env.OCCUPIED || process.argv[4];

if (!brokerUrl || !parkingId || !slotId || !['true', 'false'].includes(occupiedArg || '')) {
  console.error('Set IOT_TEST_BROKER_URL and pass <parkingId> <slotId> <true|false>');
  process.exit(1);
}

const payload: IoTTelemetryPayload = {
  deviceId,
  parkingId,
  timestamp: new Date().toISOString(),
  slots: [{ slotId, occupied: occupiedArg === 'true' }],
};

const topic = `parking/${parkingId}/device/${deviceId}/occupancy`;
const client = mqtt.connect(brokerUrl, {
  clientId: `${deviceId}-simulator`,
  clean: true,
  connectTimeout: 5000,
});

client.on('connect', () => {
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
    if (error) {
      console.error('Publish failed:', error.message);
      process.exitCode = 1;
    } else {
      console.log(`Published ${topic}`);
      console.log(JSON.stringify(payload, null, 2));
    }
    client.end();
  });
});

client.on('error', (error) => {
  console.error(`MQTT connection failed: ${error.message}`);
  client.end(true);
  process.exitCode = 1;
});
