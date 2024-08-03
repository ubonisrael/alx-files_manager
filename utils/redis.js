import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.clientReady = true;
    this.client.on('error', (err) => {
      console.error(err);
      this.clientReady = false;
    });
  }

  isAlive() {
    return this.clientReady;
  }

  async get(key) {
    return promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, value, duration) {
    await promisify(this.client.setex).bind(this.client)(key, duration, value);
  }

  async del(key) {
    await promisify(this.client.del).bind(this.client)(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
