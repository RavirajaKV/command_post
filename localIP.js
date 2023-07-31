const os = require('os');

function getLocalIP() {
    const networkInterfaces = os.networkInterfaces();
    let localIP;

    Object.keys(networkInterfaces).forEach((interfaceName) => {
        const networkInterface = networkInterfaces[interfaceName];
        for (const iface of networkInterface) { // Skip over non-IPv4 and internal (loopback) addresses
            if (iface.family === 'IPv4' && ! iface.internal) {
                localIP = iface.address;
                return; // Use return instead of break to exit the function
            }
        }
    });

    return localIP;
}

// const localIP = getLocalIP();
// console.log('Local IP:', localIP);
module.exports = getLocalIP;
