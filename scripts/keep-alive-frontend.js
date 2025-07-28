// Keep-alive script for Render frontend free tier
// Run this script to prevent your frontend from sleeping

const FRONTEND_URL = 'https://kmudd.onrender.com'; // Update this to your frontend URL
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (less than 15-minute timeout)

async function pingFrontend() {
    try {
        const response = await fetch(FRONTEND_URL);
        if (response.ok) {
            console.log(`✅ Frontend ping successful at ${new Date().toISOString()}: Status ${response.status}`);
        } else {
            console.log(`⚠️ Frontend ping returned status ${response.status} at ${new Date().toISOString()}`);
        }
    } catch (error) {
        console.error(`❌ Frontend ping failed at ${new Date().toISOString()}:`, error.message);
    }
}

// Initial ping
pingFrontend();

// Set up periodic pinging
setInterval(pingFrontend, PING_INTERVAL);

console.log(`🚀 Frontend keep-alive script started. Pinging ${FRONTEND_URL} every ${PING_INTERVAL / 1000 / 60} minutes`);
console.log('Press Ctrl+C to stop');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Frontend keep-alive script stopped');
    process.exit(0);
});