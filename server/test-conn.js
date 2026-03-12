const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'config/.env') });

const uri = process.env.MONGO_URI;
console.log('Using MONGO_URI (masked):', uri ? uri.replace(/:(.*)@/, ':<hidden>@') : '<missing>');

const opts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4
};

mongoose.connect(uri, opts)
  .then(() => {
    console.log('TEST CONNECTED to MongoDB');
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('TEST DISCONNECTED');
    process.exit(0);
  })
  .catch(err => {
    console.error('TEST ERROR:', err);
    process.exit(1);
  });
