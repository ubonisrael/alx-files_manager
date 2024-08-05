import sha1 from 'sha1';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const { authorization } = req.headers;
    if (!authorization || !authorization.startsWith('Basic')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const authorizationParts = authorization.split(' ');
    if (authorizationParts.length !== 2) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const decodedAuthorization = Buffer.from(authorizationParts[1], 'base64').toString();
    const [email, password] = decodedAuthorization.split(':');

    const users = await dbClient.usersCollection();
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (sha1(password) === user.password) {
      // create a token
      const token = v4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getDisconnect(req, res) {
    const xToken = req.headers['x-token'];

    await redisClient.del(`auth_${xToken}`);
    return res.status(204).send();
  }
}
