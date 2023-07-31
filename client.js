const dgram = require('dgram');

// UDP server address and port
const serverHost = '192.168.101.101'; // Change this to your server's IP address
const serverPort = 2222;
// Change this to the server's UDP port number

// Create a UDP client socket
const client = dgram.createSocket('udp4');

// Message to send to the server
const message = 'COMM_POST_MAC @ '+ Date();

// Send the message to the server
client.send(message, serverPort, serverHost, (err) => {
    if (err) {
        console.error('Error sending message:', err);
        client.close();
    } else {
        console.log(`Message sent to ${serverHost}:${serverPort}: ${message}`);
    }
});

// Listen for incoming messages from the server
client.on('message', (msg, rinfo) => {
    console.log("Received message from ",rinfo.address,":", rinfo.port, " => ",msg.toString())
});

// Close the client socket after 2 seconds (optional)
/* setTimeout(() => {
    client.close();
}, 5000); */
