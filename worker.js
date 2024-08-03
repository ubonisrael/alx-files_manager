import Queue from 'bull/lib/queue';
import path from 'path';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    done(new Error('Missing fileId'));
  }
  if (!userId) {
    done(new Error('Missing userId'));
  }
  const docs = await dbClient.filesCollection();
  const doc = await docs.findOne({
    _id: new ObjectID(fileId),
    userId: new ObjectID(userId),
  });
  if (!doc) {
    done(new Error('File not found'));
  }
  const imageWidths = [100, 250, 500];
  for await (const x of imageWidths) {
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
    const filename = `${doc.localPath}_${x}`;
    try {
      const data = await imageThumbnail(doc.localPath, {
        width: x,
        height: x,
        responseType: 'base64',
      });
      await fs.promises.writeFile(filename, data, 'base64');
      done();
    } catch (err) {
      done(err);
    }
  }
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) {
    done(new Error('Missing userId'));
  }
  const users = await dbClient.usersCollection();
  const user = await users.findOne({
    _id: new ObjectID(userId),
  });
  if (!user) {
    done(new Error('User not found'));
  }
  console.log(`Welcome ${user.email}`);
  done();
});
