// Keep-alive script for Render free tier
// Run this script to prevent your backend from sleeping

const BACKEND_URL = 'https://kmu-disciplinedesk.onrender.com';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (less than 15-minute timeout)

async function pingBackend() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/ping`);
        const data = await response.json();
        console.log(`✅ Ping successful at ${new Date().toISOString()}:`, data.status);
    } catch (error) {
        console.error(`❌ Ping failed at ${new Date().toISOString()}:`, error.message);
    }
}

// Initial ping
pingBackend();

// Set up periodic pinging
setInterval(pingBackend, PING_INTERVAL);

console.log(`🚀 Keep-alive script started. Pinging ${BACKEND_URL} every ${PING_INTERVAL / 1000 / 60} minutes`);
console.log('Press Ctrl+C to stop');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Keep-alive script stopped');
    process.exit(0);
});