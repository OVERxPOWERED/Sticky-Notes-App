import connectDB from './db/mongoose.js';
import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config({ path: './.env' });

connectDB()
  .then(() => {
    app.on('error', (err) => {
      console.error('SERVER ERROR:', err);
      throw err;
    });
    app.listen(process.env.PORT, () => {
      console.log(`SERVER RUNNING ON PORT: ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('MONGODB CONNECTION FAILED:', err);
    process.exit(1);
  });