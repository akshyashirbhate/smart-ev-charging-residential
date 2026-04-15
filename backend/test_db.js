require('dotenv').config();
const mongoose = require('mongoose');

console.log("Attempting MongoDB Connection to:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('\n✅ MongoDB is successfully connected. Database allows read/writes!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
