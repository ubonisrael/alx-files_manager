import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AppController {
  static getStatus(req, res) {
    if (dbClient.isAlive() && redisClient.isAlive()) {
      return res.status(200).json({ redis: true, db: true });
    }
    return res.status(400).json({});
  }

  static async getStats(req, res) {
    const nbUsers = await dbClient.nbUsers();
    const nbFiles = await dbClient.nbFiles();
    return res.json({ users: nbUsers, files: nbFiles });
  }
}
