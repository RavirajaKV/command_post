const dgram = require('dgram');

const udpClient = dgram.createSocket('udp4');

const message = 'Hello, devices!'; // Your data to be sent

udpClient.send(message, 0, message.length, 2222, '255.255.255.0', (err) => {
  if (err) {
    console.error('Error sending message:', err);
  } else {
    console.log('Message sent to all devices on the network.');
    udpClient.close();
  }
});
