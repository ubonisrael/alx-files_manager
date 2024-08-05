import { ObjectID } from 'mongodb';
import { v4 } from 'uuid';
import path from 'path';
import mimeTypes from 'mime-types';
import fs from 'fs';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export const queue = new Queue('fileQueue');

export default class FilesController {
  static async postUpload(req, res) {
    const xToken = req.headers['x-token'];

    if (xToken) {
      const id = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(id);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, type, data } = req.body;
      const isPublic = req.body.isPublic || false;
      const parentId = req.body.parentId || 0;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type) {
        return res.status(400).json({ error: 'Missing type' });
      }
      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }

      const docs = await dbClient.filesCollection();
      if (parentId) {
        const parentDoc = await docs.findOne({
          _id: new ObjectID(parentId),
        });
        if (!parentDoc) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentDoc.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }
      if (type === 'folder') {
        const doc = await docs.insertOne({
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId ? new ObjectID(parentId) : 0,
        });
        return res.status(201).json({
          id: doc.ops[0]._id,
          userId: doc.ops[0].userId,
          name: doc.ops[0].name,
          type: doc.ops[0].type,
          isPublic: doc.ops[0].isPublic,
          parentId: doc.ops[0].parentId,
        });
      }
      // get storage folder path
      const folderPath = process.env.FOLDER_PATH
        ? path.resolve(process.env.FOLDER_PATH)
        : '/tmp/files_manager';
      // check if folder exists
      if (!fs.existsSync(folderPath)) {
        // if it doesn't create it
        fs.mkdirSync(folderPath);
      }
      // create file with uuid as filename
      const filename = path.join(folderPath, v4().toString());
      try {
        await fs.promises.writeFile(filename, data, 'base64');
        const doc = await docs.insertOne({
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId ? new ObjectID(parentId) : 0,
          localPath: filename,
        });
        // if type is image, create thumbnails
        if (type === 'image') {
          // create a queue
          queue.add({ userId: doc.ops[0].userId, fileId: doc.ops[0]._id });
        }
        return res.status(201).json({
          id: doc.ops[0]._id,
          userId: doc.ops[0].userId,
          name: doc.ops[0].name,
          type: doc.ops[0].type,
          isPublic: doc.ops[0].isPublic,
          parentId: doc.ops[0].parentId,
        });
      } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'INTERNAL SERVER ERROR' });
      }
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getShow(req, res) {
    const xToken = req.headers['x-token'];
    const { id } = req.params;

    if (xToken) {
      const userId = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(userId);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const docs = await dbClient.filesCollection();
      const doc = await docs.findOne({
        _id: new ObjectID(id),
        userId: new ObjectID(user._id),
      });
      if (doc) {
        return res.status(200).json({ ...doc });
      }
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getIndex(req, res) {
    const xToken = req.headers['x-token'];
    const { parentId } = req.query;
    const page = Number(req.query.page) || 0; // page query parameter starts at 0.
    const skip = 20 * page; // 20 is the limit
    const query = { parentId: parentId ? new ObjectID(parentId) : 0 };
    const pipeline = [{ $match: query }, { $skip: skip }, { $limit: 20 }];

    if (xToken) {
      const userId = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(userId);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const collection = await dbClient.filesCollection();
      const docs = await collection.aggregate(pipeline).toArray();
      for (const doc of docs) {
        delete Object.assign(doc, { id: doc._id })._id;
      }
      return res.status(200).json(docs);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async putPublish(req, res) {
    const xToken = req.headers['x-token'];
    const { id } = req.params;

    if (xToken) {
      const userId = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(userId);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const docs = await dbClient.filesCollection();
      const doc = await docs.findOneAndUpdate(
        {
          _id: new ObjectID(id),
          userId: new ObjectID(user._id),
        },
        {
          $set: { isPublic: true },
        },
      );
      if (doc) {
        const modifiedObject = { ...doc.value };
        modifiedObject.isPublic = true;
        return res.status(200).json({ ...modifiedObject });
      }
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async putUnPublish(req, res) {
    const xToken = req.headers['x-token'];
    const { id } = req.params;

    if (xToken) {
      const userId = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(userId);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const docs = await dbClient.filesCollection();
      const doc = await docs.findOneAndUpdate(
        {
          _id: new ObjectID(id),
          userId: new ObjectID(user._id),
        },
        {
          $set: { isPublic: false },
        },
      );
      if (doc) {
        const modifiedObject = { ...doc.value };
        modifiedObject.isPublic = false;
        return res.status(200).json({ ...modifiedObject });
      }
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getFile(req, res) {
    const xToken = req.headers['x-token'];
    const { id } = req.params;

    if (xToken) {
      const userId = await redisClient.get(`auth_${xToken}`);
      const objId = new ObjectID(userId);
      const users = await dbClient.usersCollection();
      const user = await users.findOne({ _id: objId });
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }
      const docs = await dbClient.filesCollection();
      const doc = await docs.findOne({
        _id: new ObjectID(id),
        userId: new ObjectID(user._id),
      });
      if (doc) {
        console.log(doc);
        if (doc.isPublic) {
          if (doc.type === 'folder') {
            return res
              .status(400)
              .json({ error: "A folder doesn't have content" });
          }
          if (fs.existsSync(doc.localPath)) {
            try {
              await fs.promises.access(doc.localPath);
              const realPath = await fs.promises.realpath(doc.localPath);
              res.setHeader(
                'Content-Type',
                mimeTypes.contentType(realPath) || 'text/plain; charset=utf-8',
              );
              return res.status(200).sendFile(realPath);
            } catch (e) {
              return res.status(404).json({ error: 'Not found' });
            }
          }
        }
      }
    }
    return res.status(404).json({ error: 'Not found' });
  }
}
