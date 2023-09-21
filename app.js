const net = require('net')
const udp = require('dgram')
const protobuf = require('protobufjs')
const fs = require('fs')
const moment = require('moment')
const ip = require("ip")
const geolib = require('geolib')
const ESMTrack = require('./lib/ESMTrack')

// Config variables
const DATA_FORMAT_ESM = "pb";
let UDP_CLIENTS = []; // Clients Connected for UDP
let localIP = ip.address()

const UDP_PORT = 2222 // UDP port to send data to clients
const PORT = 9991 // Server port for getting ESM data
const HOST = '103.227.98.157'
// Server IP for getting ESM data


/*
 Load your Protobuf message definition
 */
const root = protobuf.loadSync('./pbd2.proto');
const Pbd2 = root.lookupType('CRFS.Data.pbd2.DataGeneric');

let currentDtTm = moment().format('YYYYMMDD_HHmmss');
console.log("currentDtTm", currentDtTm)


/*
 * Heading calculation logic
 */
const avgBearingPoints = 4;
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

    UDP_CLIENTS.push({ip: info.address, port: info.port})
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
server.bind(UDP_PORT, localIP);


/*
* Creating socket & reading data from ESM
*/
const client = new net.Socket()

// Connect to the server
client.connect(PORT, HOST, () => {
    console.log(`Connected to ${HOST}:${PORT}`);

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

client.on('data', data => { // console.log(`Received data plain:`, data);

    let bufData = Buffer.from(data);
    // console.log("\n\nReceived data In buffer:\n`" + bufData)
    // console.log(`Received data In buffer:`, bufData);

    try { 
        // Parse the received Protobuf message
        const decodedMessage = Pbd2.decode(bufData);
        // console.log(`Decoded data:`, decodedMessage);

        console.log("\n" + JSON.stringify(decodedMessage))

        const parsedMessage = Pbd2.toObject(decodedMessage, {
            longs: String,
            enums: String,
            bytes: String
        });

        logJSONDataToFile("\n" + JSON.stringify(parsedMessage))

        let hasDataObject = parsedMessage.Data || "";
        if (hasDataObject) {
            let esmDataProcessed = {};

            let dataElements = emsData.Data.Elements;
            dataElements.forEach((item, index) => { // console.log(item);
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

            // console.log(`Objects length: ${esmDataProcessed.length} `);
            console.log(esmDataProcessed);

            const esmDataObjectsArray = [];
            const valuesLength = esmDataProcessed.Location_Latitude.length;

            // Loop through the values' indices
            for (let i = 0; i < valuesLength; i ++) {
                const obj = {};

                // Loop through each key in the JSON object
                for (const key in esmDataProcessed) {
                    if (esmDataProcessed.hasOwnProperty(key)) {
                        obj[key] = esmDataProcessed[key][i];
                    }
                }

                esmDataObjectsArray.push(obj);
            }

            console.log(JSON.stringify(esmDataObjectsArray));
            objectsArray.forEach(item => {
                let emsTrack = new ESMTrack(item);
                console.log(emsTrack);

                //Sending Data to clients
                sendESMDataToClients(emsTrack);
            })
        } 
    } catch (error) { 
        // console.log(error);
    }
});

function sendESMDataToClients(emsTrack) { 
    // let trackName = detNames.replace("MM2", "DGI")
    let sampleData = {
        "message_id": 1401,
        "message_text": {
            "HA": emsTrack.Uncertainty_Rotation,
            "HE": emsTrack.Analysis_NodeGroup,
            "LA": emsTrack.Location_Latitude,
            "LO": emsTrack.Location_Longitude,
            "S": 0,
            "T": emsTrack.Data_TimeStamp,
            "CT": emsTrack.Signal_Detector_Name, // "DL - " + trackName,
            "CS": "",
            "TI": "H",
            "MA": emsTrack.Uncertainty_Major_Axis,
            "MI": emsTrack.Uncertainty_Minor_Axis,
            "DT": emsTrack.Signal_Detector_Name,
            "FQ": emsTrack.Signal_Bandwidth,
            "INF" : "Confidence: "+emsTrack.Data_Decision_Confidence+", Band Width: "+emsTrack.Signal_Bandwidth+"."
        }
    };
    console.log(sampleData);

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
    //console.log(sampleData1901);

    /* if (isInsideCircle(latitude, longitude)) {
        sampleData.message_text.TI = "P"
        sampleData.message_text.HA = 0
        sampleData.message_text.CT = "DL - Pilot"
    } */

    for (let cl of UDP_CLIENTS) {
        server.send(JSON.stringify(sampleData), cl.port, cl.ip, function (error) {
            if (error) {
                console.log("error ", error);
            } else {
                console.log('Data Msg Type 1401 sent !!!');
                server.send(JSON.stringify(sampleData1901), cl.port, cl.ip, function (error) {
                    if (error) {
                        console.log("error ", error);
                    } else {
                        console.log('Data sent !!!');
                    }

                });
            }

        });
    }
}

function sendDataToClients(ha, altitude, latitude, longitude, unixTime, majorAxis, minorAxis, detNames, frequency) { // let trackName = detNames.replace("MM2", "DGI")
    let sampleData = {
        "message_id": 1401,
        "message_text": {
            "HA": ha,
            "HE": altitude,
            "LA": latitude,
            "LO": longitude,
            "S": 0,
            "T": unixTime,
            "CT": detNames, // "DL - " + trackName,
            "CS": "",
            "TI": "H",
            "MA": majorAxis,
            "MI": minorAxis,
            "DT": detNames,
            "FQ": frequency
        }
    };
    console.log(sampleData);

    /* let sampleData1901 = {
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
            "TGT_LA": latitude,
            "TGT_LO": longitude,
            "WID": 1,
            "WN": "JAM1_1",
            "WPN_LA": 23.123456,
            "WPN_LO": 73.123456,
            "WT": "JAMMER"
        }
    };
    console.log(sampleData1901); */


    /* if (isInsideCircle(latitude, longitude)) {
        sampleData.message_text.TI = "P"
        sampleData.message_text.HA = 0
        sampleData.message_text.CT = "DL - Pilot"
    } */

    for (let cl of UDP_CLIENTS) {
        server.send(JSON.stringify(sampleData), cl.port, cl.ip, function (error) {
            if (error) {
                console.log("error ", error);
            } else {
                console.log('Data Msg Type 1401 sent !!!');
                /* server.send(JSON.stringify(sampleData1901), cl.port, cl.ip, function (error) {
                    if (error) {
                        console.log("error ", error);
                    } else {
                        console.log('Data sent !!!');
                    }

                }); */
            }

        });
    }
}
function pushAndReplace(newObject) { // Remove the first element if the array is full
    if (bearingCoordinates.length === avgBearingPoints) {
        bearingCoordinates.shift();
    }

    // Push the new object to the end of the array
    bearingCoordinates.push(newObject);
}
function calculateAverageBearing(coords) { // console.log("coords: ", coords)
    if (coords.length < 2) { // throw new Error('You need at least three sets of coordinates to calculate the average bearing.');
        return 0;
    }

    let totalBearing = 0;

    const filteredCoords = coords.filter((element) => element !== undefined);


    // Calculate bearings for each pair of coordinates and sum them up
    for (let i = 0; i < filteredCoords.length - 1; i ++) {
        let cord1 = filteredCoords[i]
        let cord2 = filteredCoords[i + 1]
        /* const { latitude: cord1.latitude, longitude: cord1.loongitude } = coords[i];
        const { latitude: lat2, longitude: lon2 } = coords[i + 1]; */ totalBearing += calculateBearing(cord1.lat, cord1.lon, cord2.lat, cord2.lon);
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