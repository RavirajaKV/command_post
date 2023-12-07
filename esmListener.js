const net = require('net')
const udp = require('dgram')
const protobuf = require('protobufjs')
const fs = require('fs')
const moment = require('moment')
const ip = require("ip")
const geolib = require('geolib')
const ESMTrack = require('./lib/ESMTrack')

// Config variables
let localIP = ip.address()

const C4iIP = '192.168.1.121';
const PORT_LISTEN = 7000;
const PORT_SEND = 8000;

const ESM_PORT = 9991 // Server port for getting ESM data
const ESM_HOST = '192.168.1.75' //'103.227.98.157' // Server IP for getting ESM data

const ENABLE_LOGGER = false;

let currentDtTm = moment().format('YYYYMMDD_HHmmss');
//console.log("currentDtTm", currentDtTm)

const filePathHex = "./log/log_hex_" + currentDtTm + ".log"
const filePathJSON = "./log/log_json_" + currentDtTm + ".log"
const filePathExec = "./log/log_exec_" + currentDtTm + ".log"

initLoggers()

/*
 Load your Protobuf message definition
 */
const root = protobuf.loadSync('./pbd2.proto');
const DataGeneric = root.lookupType('IIO.Data.pbd2.DataGeneric');

/*
 * Heading calculation logic
 */
const avgBearingPoints = 6;
const bearingCoordinates = new Array(avgBearingPoints);

/* UDP server creation */
const server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});

// client emits on new datagram msg
server.on('message', function (msg, info) {
    console.log('Data received from client: ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);
});

// When socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;

    console.log(`Server is listening ${family} => ${ipaddr}:${port}`);
});

// emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('UDP Socket is closed !');
});

// console.log("Server Local IP:", localIP)
server.bind(PORT_LISTEN, localIP, () => {
    console.log("UDP binding success!")
});

function createTCPClient() {
    /*
    * Creating socket & reading data from ESM
    */
    const client = new net.Socket()

    // Connect to the server
    client.connect(ESM_PORT, ESM_HOST, () => {
        console.log(`Connected to ${ESM_HOST}:${ESM_PORT}`);

        // Send data to the server
        // client.write('Hello, server!');
    });

    // When server connection close
    client.on('close', () => {
        console.log('Connection closed');
    });

    // When errors
    client.on('error', err => {
        console.log(`Socket error: ${err}`);
    });

    // Handle connection closed
    client.on('close', () => {
        console.log('Connection closed, attempting to reconnect...');
        setTimeout(createTCPClient, 2000); // Reconnect after a delay (e.g., 2000 milliseconds)
    });

    client.on('data', data => {
        // console.log(`Received data plain:`, data);

        let hexData = data.toString('hex');
        const dtUnique = moment().format('YYYYMMDD_HHmmss.SSS')
        logHexDataToFile("\n\n" + dtUnique + ":\n" + hexData);
        console.log("\n\n" + dtUnique + ":\n" + hexData);

        try {
            const parsedMessage = DataGeneric.decode(data).toJSON();
            console.log("\n" + JSON.stringify(parsedMessage));
            logJSONDataToFile("\n" + dtUnique + ":\n" + JSON.stringify(parsedMessage))

            sendESMDataToCT(parsedMessage);

        } catch (error) {
            // console.log(error);
            const hexStr = data.toString('hex')
            if (hexStr != 'a8000000')
                logRawDataExecToFile("\n " + dtUnique + ":\n" + hexStr + "\n" + error);

        }
    });
}

// Create the initial TCP client
const tcpClient = createTCPClient();

function sendESMDataToCT(jsonData) {
    server.send(JSON.stringify(jsonData), PORT_SEND, C4iIP, function (error) {
        if (error) {
            console.log("error ", error);
        } else {
            console.log('ESM data sent to C4i !!!');
        }
    });
}

/*
Logger Related Code...
*/
function initLoggers() {
    if (ENABLE_LOGGER) {
        try {
            fs.appendFile(filePathJSON, "\n***************** JSON Parser start ******************", {
                flag: 'a+'
            }, (err) => {
                if (err) {
                    console.log(err)
                }
            })
        } catch (ex) {
            console.log(ex)
        }

        try {
            fs.appendFile(filePathExec, "\n***************** Exception Logger start ******************", {
                flag: 'a+'
            }, (err) => {
                if (err) {
                    console.log(err)
                }
            })
        } catch (ex) {
            console.log(ex)
        }

        try {
            fs.appendFile(filePathHex, "\n***************** Hex data start ******************", {
                flag: 'a+'
            }, (err) => {
                if (err) {
                    console.log(err)
                }
            })
        } catch (ex) {
            console.log(ex)
        }
    }
}

function logJSONDataToFile(dataToLog) {
    if (!ENABLE_LOGGER) return;

    try {
        fs.appendFile(filePathJSON, dataToLog, {
            flag: 'a+'
        }, (err) => {
            if (err) {
                console.log(err)
            }
        })
    } catch (ex) {
        console.log(ex)
    }
}

function logHexDataToFile(dataToLog) {
    if (!ENABLE_LOGGER) return;
    try {
        fs.appendFile(filePathHex, dataToLog, {
            flag: 'a+'
        }, (err) => {
            if (err) {
                console.log(err)
            }
        })
    } catch (ex) {
        console.log(ex)
    }
}

function logRawDataExecToFile(dataToLog) {
    if (!ENABLE_LOGGER) return;
    try {
        fs.appendFile(filePathExec, dataToLog, {
            flag: 'a+'
        }, (err) => {
            if (err) {
                console.log(err)
            }
        })
    } catch (ex) {
        console.log(ex)
    }
}
