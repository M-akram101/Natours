const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception! Shutting down...');
  console.log(err.name, err.message, err.stack);

  process.exit(1);
});
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
console.log('Enviroment:', process.env.NODE_ENV);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    console.log('Db Connections successful');
  });
// console.log(app.get('env'));
// console.log(process.env);

//  START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
}); //Test
