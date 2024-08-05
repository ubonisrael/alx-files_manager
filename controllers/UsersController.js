import sha1 from 'sha1';
import { ObjectID } from 'mongodb';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const queue = new Queue('userQueue');

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email || email.trim().length === 0) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password || password.trim().length === 0) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const users = await dbClient.usersCollection();
    const user = await users.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPw = sha1(password);

    const { insertedId } = await users.insertOne({ email, password: hashedPw });
    // add a job
    queue.add({ userId: insertedId });
    return res.status(201).json({ email, id: insertedId });
  }

  static async getMe(req, res) {
    const xToken = req.headers['x-token'];

    if (xToken) {
      const id = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(id);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (user) {
        return res.status(200).json({ id, email: user.email });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
