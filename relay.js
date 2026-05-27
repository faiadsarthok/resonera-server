const WebSocket = require('ws');

// THE FIX: Cloud servers dynamically assign a port.
// We must use process.env.PORT, otherwise the cloud deployment will crash.
const PORT = process.env.PORT || 54322;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🚀 Resonera Post Office is running on port ${PORT}...`);

// A memory bank to keep track of who is currently connected
const activeUsers = new Map();

wss.on('connection', (ws) => {
  console.log('📱 A device connected to the router.');

  ws.on('message', (message) => {
    // THE FIX: Convert the incoming binary Buffer into a pure text string immediately!
    const messageString = message.toString(); 
    const data = JSON.parse(messageString);

    // 1. THE HANDSHAKE
    if (data.type === 'handshake') {
      console.log(`👋 Welcome to the network: ${data.profile.name}`);
      activeUsers.set(ws, data.profile);
      broadcastDirectory();
    }
    // 2. NORMAL MESSAGES
    else {
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          // Send the pure text string, NOT the binary buffer!
          client.send(messageString); 
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('❌ A device disconnected.');
    activeUsers.delete(ws); 
    broadcastDirectory();   
  });
});

// Function to tell all phones exactly who is currently online
function broadcastDirectory() {
  const allProfiles = Array.from(activeUsers.values());
  const discoveryPacket = JSON.stringify({
    type: 'SYSTEM_PEER_LIST',
    peers: allProfiles
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(discoveryPacket);
    }
  });
}
