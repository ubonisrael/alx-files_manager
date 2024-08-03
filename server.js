import Express from 'express';
import mapRoutes from './routes';

const app = Express();
const port = process.env.PORT || 5000;

app.use(Express.json());

mapRoutes(app);

app.listen(port, () => {
  console.log('server has started');
});
