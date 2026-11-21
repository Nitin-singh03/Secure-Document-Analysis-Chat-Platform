import dns from 'node:dns';
import mongoose from 'mongoose';

// Ensure SRV records resolve smoothly on Windows / restrictive ISP DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const localUri = 'mongodb://127.0.0.1:27017/intellidoc';

  // 1. Try primary Atlas URI first
  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 8000 });
      console.log('✅ MongoDB Connected (MongoDB Atlas)');
      return;
    } catch (primaryErr) {
      console.warn(`[MongoDB Warning] Atlas connection failed: ${primaryErr.message}`);
      console.log('🔄 Attempting fallback to local MongoDB...');
    }
  }

  // 2. Fallback to local MongoDB
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ MongoDB Connected (Local: 127.0.0.1:27017/intellidoc)');
  } catch (localErr) {
    console.error(`❌ [MongoDB Error] Could not connect to Atlas or local MongoDB: ${localErr.message}`);
    console.log('\n💡 Atlas Connection Troubleshooting:');
    console.log('   1. Check your IP Access List in Atlas (Network Access -> Add IP -> 0.0.0.0/0).');
    console.log('   2. Verify DB user credentials and MONGO_URI in Server/.env.\n');
  }
};

export default connectDB;
