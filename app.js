const net = require('net')
const udp = require('dgram')
const protobuf = require('protobufjs')
const fs = require('fs')
const moment = require('moment')
const ip = require("ip")
const geolib = require('geolib')
const ESMTrack = require('./lib/ESMTrack')

// Config variables
let UDP_CLIENTS = []; // Clients Connected for UDP
let localIP = ip.address()

const commandTableIP = '192.168.1.121';//'255.255.255.0'; // Broadcast address to send to all devices on the network
const PORT_LISTEN = 7000;
const PORT_SEND = 8000;

const ESM_PORT = 9991 // Server port for getting ESM data
const ESM_HOST = '192.168.1.75' //'103.227.98.157' // Server IP for getting ESM data

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

    UDP_CLIENTS.push({ ip: info.address, port: info.port })
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

    //server.setBroadcast(true);
    // Message to send
    /* const message = 'Hello, world!';

    // Send the message to all devices on the network
    server.send(message, PORT_SEND, broadcastAddress, (error) => {
        if (error) {
            console.error('Error sending message:', error);
        } else {
            console.log(`Message sent to ${broadcastAddress}:${PORT_SEND} from ${localIP}: ${message}`);
        } 
        //server.close();
    }); */
});

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

let finalESMData = [];
client.on('data', data => {
    // console.log(`Received data plain:`, data);

    let hexData = data.toString('hex');
    const dtUnique = moment().format('YYYYMMDD_HHmmss.SSS')
    logHexDataToFile("\n\n" + dtUnique + ":\n" + hexData);

    //console.log("---------\nIs Complete data " + dtUnique + ": " + isCompleteMessage(data));
    try {
        const parsedMessage = DataGeneric.decode(data).toJSON();
        console.log("\n" + JSON.stringify(parsedMessage));
        logJSONDataToFile("\n" + dtUnique + ":\n" + JSON.stringify(parsedMessage))

        let hasDataObject = parsedMessage.Data || "";
        if (hasDataObject) {
            let esmDataProcessed = {};

            let dataElements = parsedMessage.Data.Elements;
            dataElements.forEach((item, index) => {
                // console.log(item);
                let key = item.Key;
                let values;
                if (item.hasOwnProperty("DoubleData")) {
                    values = item.DoubleData.Values;
                } else if (item.hasOwnProperty("StringData")) {
                    values = item.StringData.Values;
                } else if (item.hasOwnProperty("IntData")) {
                    values = item.IntData.Values;
                } else if (item.hasOwnProperty("GuidData")) {
                    values = item.GuidData.GuidStrings;
                } else if (item.hasOwnProperty("ByteData")) {
                    values = item.ByteData.Values;
                }
                esmDataProcessed[key] = values
            });

            // Ignoring byte data...
            if (esmDataProcessed.hasOwnProperty("Analysis_Nodes")) {
                delete esmDataProcessed["Analysis_Nodes"];
            }

            const normalizedData = [];
            for (const key in esmDataProcessed) {
                if (esmDataProcessed[key] !== undefined) {
                    const values = esmDataProcessed[key];

                    for (let i = 0; i < values.length; i++) {
                        if (!normalizedData[i]) {
                            normalizedData[i] = {};
                        }
                        normalizedData[i][key] = values[i];
                    }
                }
            }

            // console.log(normalizedData);
            console.log("Records Size: ", normalizedData.length);
            totalCount = totalCount + normalizedData.length;

            finalESMData.push(...normalizedData);

            normalizedData.forEach(item => {
                let emsTrack = new ESMTrack(item);
                console.log(emsTrack);

                const frequencyInGigahertz = hertzToGigahertz(emsTrack.Analysis_Center);
                finalESMData.push(emsTrack);

                //sendESMDataToCT(emsTrack, frequencyInGigahertz);
            })
        }
    } catch (error) {
        // console.log(error);
        const hexStr = data.toString('hex')
        if (hexStr != 'a8000000')
            logRawDataExecToFile("\n " + dtUnique + ":\n" + hexStr + "\n" + error);
        
    }
});

function initLoggers() {

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

function sendESMDataToCT(emsTrack, trackId) {
    // let trackName = detNames.replace("MM2", "DGI")
    let detName = emsTrack.Signal_Detector_Name || emsTrack.Analysis_Center;
    let heading = emsTrack.Location_Heading || 0

    if (heading == 0) {
        pushAndReplace({ lat: latitude, lon: longitude })
        if (bearingCoordinates.length >= avgBearingPoints) {
            heading = Number.parseInt(calculateAverageBearing(bearingCoordinates) || 0);
        }
    }

    let sampleData = {
        "message_id": 1401,
        "message_text": {
            "HA": heading,
            "HE": emsTrack.Location_Altitude || 0,
            "LA": emsTrack.Location_Latitude,
            "LO": emsTrack.Location_Longitude,
            "S": 0,
            "T": Date.now(), //emsTrack.Data_TimeStamp,
            "CT": "AE001_" + trackId,//emsTrack.Signal_Detector_Name, // "DL - " + trackName,
            "CS": "",
            "TI": "H",
            "MA": emsTrack.Uncertainty_Major_Axis,
            "MI": emsTrack.Uncertainty_Minor_Axis,
            "DT": detName,
            "FQ": emsTrack.Signal_Bandwidth,
            "INF": "Confidence: " + emsTrack.Data_Decision_Confidence + ", Band Width: " + emsTrack.Signal_Bandwidth + "."
        }
    };
    console.log(sampleData);

    /* 
    let sampleData1901 = {
        "message_id": 1901,
        "message_text": {
            "BG": "72.2346993262931",
            "CT": sampleData.message_text.CT,
            "DP_LA": 0,
            "DP_LO": 0,
            "FOV": 50,
            "OR": 245,
            "PIP": 6687307,
            "RG": 2,
            "SP": 1,
            "TGT_LA": sampleData.message_text.LA,
            "TGT_LO": sampleData.message_text.LO,
            "WID": 1,
            "WN": "JAM1_1",
            "WPN_LA": 23.123456,
            "WPN_LO": 73.123456,
            "WT": "JAMMER"
        }
    }; 
    console.log(sampleData1901);
    */

    //for (let cl of UDP_CLIENTS) {

    //if(detName != "ADS-B"){
    server.send(JSON.stringify(sampleData), PORT_SEND, commandTableIP, function (error) {
        if (error) {
            console.log("error ", error);
        } else {
            console.log('Data Msg Type 1401 sent !!!');
            /* server.send(JSON.stringify(sampleData1901), PORT_SEND, commandTableIP, function (error) {
                if (error) {
                    console.log("error ", error);
                } else {
                    console.log('Data sent !!!');
                }

            }); */
        }

    });
    //}
    //}
}

function pushAndReplace(newObject) {
    // Remove the first element if the array is full
    if (bearingCoordinates.length === avgBearingPoints) {
        bearingCoordinates.shift();
    }

    // Push the new object to the end of the array
    bearingCoordinates.push(newObject);
}

function calculateAverageBearing(coords) {
    // console.log("coords: ", coords)
    if (coords.length < 2) { // throw new Error('You need at least three sets of coordinates to calculate the average bearing.');
        return 0;
    }

    let totalBearing = 0;

    const filteredCoords = coords.filter((element) => element !== undefined);

    // Calculate bearings for each pair of coordinates and sum them up
    for (let i = 0; i < filteredCoords.length - 1; i++) {
        let cord1 = filteredCoords[i]
        let cord2 = filteredCoords[i + 1]
        /* const { latitude: cord1.latitude, longitude: cord1.loongitude } = coords[i];
        const { latitude: lat2, longitude: lon2 } = coords[i + 1]; */
        totalBearing += calculateBearing(cord1.lat, cord1.lon, cord2.lat, cord2.lon);
    }

    // Calculate the average bearing
    const averageBearing = totalBearing / (filteredCoords.length - 1);

    // Adjust the average bearing to be in the range [0, 360]
    if (averageBearing < 0) {
        averageBearing += 360;
    }

    return averageBearing;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371; // Radius of the Earth in kilometers

    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);

    const lat1Rad = degreesToRadians(lat1);
    const lat2Rad = degreesToRadians(lat2);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const heading = Math.atan2(y, x);

    // Convert heading from radians to degrees
    const headingDegrees = (heading * 180) / Math.PI;

    // Normalize the heading to a value between 0 and 360 degrees
    const normalizedHeading = (headingDegrees + 360) % 360;

    return normalizedHeading;
}

function logJSONDataToFile(dataToLog) {
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

function logRawDataToFile(dataToLog) {
    try {
        fs.appendFile(filePathRaw, dataToLog, {
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

function hertzToGigahertz(frequencyInHertz) {
    const frequencyInGigahertz = (frequencyInHertz / 1e9).toFixed(2); // Rounds to 4 decimal places
    return frequencyInGigahertz;
}

function isCompleteMessage(buffer) {
    // Implement your logic to determine if the complete message has been received
    // For example, you could use a specific delimiter or message length
    // In this example, I'll assume a newline character `\n` indicates the end of a message
    return buffer.includes('\n');
}