const dgram = require('dgram');

// Create a UDP socket
const udpSocket = dgram.createSocket('udp4');

// Port number and IP address for broadcasting
const broadcastPort = 9191; // Replace with the desired port number
const broadcastAddress = '255.255.255.0';
// Broadcast IP address (IPv4)

// JSON data to be sent
const jsonData = {
    message: 'Hello, world!',
    sender: 'Node.js UDP Broadcast'
};
const jsonStr = JSON.stringify(jsonData);

// Enable broadcasting on the UDP socket
udpSocket.bind(() => {
    udpSocket.setBroadcast(true);
});

// Send the data to all devices on the network
udpSocket.send(jsonStr, broadcastPort, broadcastAddress, (err) => {
    if (err) {
        console.error('Error sending data:', err);
    } else {
        console.log('Data sent as a broadcast.');
        udpSocket.close(); // Close the socket after sending the data
    }
});
