const mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://geraldsinkamba49:OiJFFSdW7SilG6yy@unitrade.borlid8.mongodb.net/unitrade?retryWrites=true&w=majority&appName=unitrade';

console.log('Attempting to connect with MONGO_URI (sanitized):', mongoURI.replace(/:.*@/, ':<hidden>@'));

mongoose.set('debug', true);

mongoose.connect(mongoURI)
  .then(() => {
    console.log('Connected to MongoDB successfully!');
    const userSchema = new mongoose.Schema({
      fullName: { type: String, required: true }
    });
    const User = mongoose.model('User', userSchema);
    console.log('User model created successfully');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
