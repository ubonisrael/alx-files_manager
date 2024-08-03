import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';

export default function mapRoutes(app) {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
  app.post('/users', UsersController.postNew);
  app.get('/users/me', UsersController.getMe);
  app.get('/connect', AuthController.getConnect);
  app.get('/disconnect', AuthController.getDisconnect);
  app.get('/files', FilesController.getIndex);
  app.post('/files', FilesController.postUpload);
  app.get('/files/:id', FilesController.getShow);
  app.put('/files/:id/publish', FilesController.putPublish);
  app.put('/files/:id/unpublish', FilesController.putUnPublish);
  app.get('/files/:id/data', FilesController.getFile);
}
