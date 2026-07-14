import 'dotenv/config';
import dataSource from './data-source';

dataSource.initialize()
  .then(() => {
    console.log('Database connected successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });