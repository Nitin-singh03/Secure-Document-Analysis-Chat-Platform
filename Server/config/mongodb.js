import dns from 'node:dns';
import mongoose from 'mongoose';

// Ensure SRV records resolve smoothly on Windows / restrictive ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;

  if (!primaryUri) {
    console.error('❌ [MongoDB Error] MONGO_URI is not defined in environment variables.');
    throw new Error('MONGO_URI is required for MongoDB Atlas Vector Search.');
  }

  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ MongoDB Connected (MongoDB Atlas)');
  } catch (err) {
    console.error(`❌ [MongoDB Error] Could not connect to MongoDB Atlas: ${err.message}`);
    console.log('\n💡 Atlas Connection Troubleshooting:');
    console.log('   1. Check your IP Access List in Atlas (Network Access -> Add IP -> 0.0.0.0/0).');
    console.log('   2. Verify DB user credentials and MONGO_URI in Server/.env.\n');
    throw err;
  }
};

export default connectDB;
