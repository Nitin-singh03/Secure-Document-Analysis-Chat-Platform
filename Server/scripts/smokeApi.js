import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const QUESTION = process.env.SMOKE_QUESTION || 'What products does Insurellm offer?';

async function run() {
    if (!EMAIL || !PASSWORD) {
        throw new Error('SMOKE_EMAIL and SMOKE_PASSWORD env vars are required.');
    }

    const client = axios.create({ baseURL: BASE_URL });

    const loginRes = await client.post('/api/auth/login', { email: EMAIL, password: PASSWORD });
    const token = loginRes.data?.accessToken;
    if (!token) {
        throw new Error('Login succeeded but accessToken was missing.');
    }
    const headers = { Authorization: `Bearer ${token}` };

    const colsRes = await client.get('/api/collections', { headers });
    let collections = colsRes.data?.collections || [];
    let target = collections[0];

    if (!target) {
        const createRes = await client.post('/api/collections', { name: 'SmokeTest' }, { headers });
        target = createRes.data?.collection;
    }

    console.log(`Using collection: ${target.name} (${target._id})`);

    const queryRes = await client.post(
        '/api/chat/query',
        { collectionId: target._id, question: QUESTION },
        { headers }
    );

    console.log('Answer:', queryRes.data?.answer);
    console.log('Sources:', JSON.stringify(queryRes.data?.sources || [], null, 2));
}

run().catch((err) => {
    console.error('Smoke test failed:', err.response?.data || err.message);
    process.exit(1);
});
