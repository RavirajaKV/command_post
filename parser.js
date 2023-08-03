const net = require('net');
const udp = require('dgram');
const protobuf = require('protobufjs');
const fs = require('fs');
const moment = require('moment')
const { CallTracker } = require('assert');
const ip = require("ip");
const geolib = require('geolib');

// Load your Protobuf message definition
const root = protobuf.loadSync('./pbd2.proto');
const Pbd2 = root.lookupType('CRFS.Data.pbd2.DataGeneric');

let currentDtTm = moment().format('YYYYMMDD_HHmmss');
console.log("currentDtTm", currentDtTm)

const pilotCoordinates = { lat: 28.58163028033774, lon: 77.20525970654268, radius: 50 }
const avgBearingPoints = 4
const bearingCoordinates = new Array(avgBearingPoints);

const filePath = "./log/log_" + currentDtTm + ".log"
const filePathJSON = "./log/log_json_" + currentDtTm + ".log"
try {
    fs.appendFile(filePath, "\n***************** Parser start ******************", { flag: 'a+' }, (err) => {
        if (err) {
            console.log(err)
        }
    })
} catch (ex) {
    console.log(ex)
}
try {
    fs.appendFile(filePathJSON, "\n***************** JSON Parser start ******************", { flag: 'a+' }, (err) => {
        if (err) {
            console.log(err)
        }
    })
} catch (ex) {
    console.log(ex)
}


// creating a udp server
const server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});

const dataComingIn = "pb";

/* let testPoints = []
testPoints.push({ lat: 28.583520460546282, lon: 77.21098652108532 })
testPoints.push({ lat: 28.58321898132995, lon: 77.20752110715095 })
testPoints.push({ lat: 28.58322840256855, lon: 77.20921626319314 })
testPoints.push({ lat: 28.582389909028567, lon: 77.20552554370889 })
testPoints.push({ lat: 28.581730415030478, lon: 77.2054397130232 })
testPoints.push({ lat: 28.582389909028567, lon: 77.20552554370889 })
testPoints.push({ lat: 28.581730415030478, lon: 77.2054397130232 })
testPoints.push({ lat: 28.582389909028567, lon: 77.20552554370889 }) */

let clientsArr = [];
// emits on new datagram msg
server.on('message', function (msg, info) {
    console.log('Data received from client: ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);

    clientsArr.push({
        ip: info.address,
        port: info.port
    })

    //Send test data to confirm contectivity
    //testData()
});

/* function testData() {
    testPoints.forEach(point => {
        let ha = 0;

        pushAndReplace({ lat: point.lat, lon: point.lon })
        if (bearingCoordinates.length === avgBearingPoints) {
            ha = Number.parseInt(calculateAverageBearing(bearingCoordinates) || 0);
        }

        console.log("Bearing: ", ha)

        sendDataToClients(ha, 10, point.lat, point.lon, new Date().getTime(), 50, 20, "MM2_2.4G", "100.1234");
    })
} */

//emits when socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);
});

//emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('Socket is closed !');
});

let localIP = ip.address()
console.log("Local IP:", localIP)
server.bind(2222, localIP);

const client = new net.Socket();

const port = 9991;
const host = '10.1.0.1'; // Replace with the server's hostname or IP address

// Connect to the server
client.connect(port, host, () => {
    console.log(`Connected to ${host}:${port}`);

    // Send data to the server
    //   client.write('Hello, server!');
});


let prevLat, prevLog;
// Event handler for receiving data from the server
client.on('data', data => {

    let isError = false;
    let altitude, latitude, longitude, unixTime, majorAxis, minorAxis, detNames, frequency;
    if (dataComingIn == "json") {
        // console.log(`Received data plain:`, data.toString());
        let dataString = data.toString().replace(/(?:\r\n|\r|\n)/g, '').replace(/  /g, "");
        // console.log("-----------------------------");
        // console.log("Recived data in string", dataString);
        // console.log("-----------------------------");


        const count = countSubstrOccurrences(dataString.toLowerCase(), `{"Stream"`.toLowerCase());
        // console.log(`The substring {"Stream" appears ${count} times.`);
        if (count > 1) {
            dataString = dataString.split(`{"Stream"`);
            dataString = `{"Stream"` + dataString[1];

            dataString += "]]}";
            // console.log("-----------------------------");
            // console.log("Recived data in string", dataString);
            // console.log("-----------------------------");

            try {
                let jsonData = JSON.parse(dataString);
                // console.log(dataString + "===========================================");
                let finalData = jsonData.Data;
                let headersData = jsonData.Headers || [];
                // finalData[44] = finalData[44].toString(replace(/,/g, "-");
                // finalData[47] = finalData[47].replace(/,/g, "-");

                //console.log(finalData);

                altitude = finalData[headersData.indexOf('Altitude (m)')][0];
                latitude = finalData[headersData.indexOf('Latitude (°)')][0];
                longitude = finalData[headersData.indexOf('Longitude (°)')][0];
                unixTime = finalData[headersData.indexOf('UnixTime (s)')][0];
                majorAxis = finalData[headersData.indexOf('Uncertainty MajorAxis (m)')][0];
                minorAxis = finalData[headersData.indexOf('Uncertainty MinorAxis (m)')][0];
                detNames = finalData[headersData.indexOf('Det Name')][0];
                frequency = finalData[headersData.indexOf('Freq Center (Hz)')][0];


            } catch (e) {
                console.log(e);
                isError = true;
            }


        }
    } else if (dataComingIn == "pb") {

        // console.log(`Received data plain:`, data);
        let bufData = Buffer.from(data);
        //logDataToFile("\n\nReceived data In buffer:\n`" + bufData)
        // console.log(`Received data In buffer:`, bufData);

        try {
            // Parse the received Protobuf message
            const decodedMessage = Pbd2.decode(bufData);
            console.log(`Decoded data:`, decodedMessage);

            logDataToFile("\n" + JSON.stringify(decodedMessage))

            const parsedMessage = Pbd2.toObject(decodedMessage, {
                longs: String,
                enums: String,
                bytes: String,
            });

            logJSONDataToFile("\n" + JSON.stringify(parsedMessage))

            let finalData = parsedMessage.Data || "";

            if (finalData) {
                finalData = finalData.Elements || [];

                let obj = {};
                for (let finalDataObj of finalData) {
                    if (finalDataObj.ElementType == "Doubles") {
                        obj[finalDataObj.Name] = finalDataObj.DoubleData.Values[0];
                    } else if (finalDataObj.ElementType == "Strings") {
                        obj[finalDataObj.Name] = finalDataObj.StringData.Values[0];
                    }
                }

                altitude = obj["Altitude"];
                latitude = obj["Latitude"];
                longitude = obj["Longitude"];
                unixTime = obj["UnixTime"];
                majorAxis = obj["Uncertainty MajorAxis"];
                minorAxis = obj["Uncertainty MinorAxis"];
                detNames = obj["Det Name"];
                frequency = obj["Freq Center"];

                console.log(JSON.stringify(parsedMessage));
            } else {
                isError = true;
            }
        } catch (error) {
            // console.log(error);
            isError = true
        }
    }

    if (!isError) {

        let ha = 0;

        pushAndReplace({ lat: latitude, lon: longitude })
        if (bearingCoordinates.length >= avgBearingPoints) {
            ha = Number.parseInt(calculateAverageBearing(bearingCoordinates) || 0);
        }

        sendDataToClients(ha, altitude, latitude, longitude, unixTime, majorAxis, minorAxis, detNames, frequency);
    }
});

// Event handler for server connection close
client.on('close', () => {
    console.log('Connection closed');
});

// Event handler for errors
client.on('error', err => {
    console.log(`Socket error: ${err}`);
});

function sendDataToClients(ha, altitude, latitude, longitude, unixTime, majorAxis, minorAxis, detNames, frequency) {
    //let trackName = detNames.replace("MM2", "DGI")

    let sampleData = {
        "message_id": 1401,
        "message_text": {
            "HA": ha,
            "HE": altitude,
            "LA": latitude,
            "LO": longitude,
            "S": 0,
            "T": unixTime,
            "CT": detNames, //"DL - " + trackName,
            "CS": "",
            "TI": "H",
            "MA": majorAxis,
            "MI": minorAxis,
            "DT": detNames,
            "FQ": frequency
        }
    };

    /* if (isInsideCircle(latitude, longitude)) {
        sampleData.message_text.TI = "P"
        sampleData.message_text.HA = 0
        sampleData.message_text.CT = "DL - Pilot"
    } */

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
            "TGT_LA": latitude,
            "TGT_LO": longitude,
            "WID": 1,
            "WN": "JAM1_1",
            "WPN_LA": 23.123456,
            "WPN_LO": 73.123456,
            "WT": "JAMMER"
        }
    };
    console.log(sampleData);
    //console.log(sampleData1901);
    for (let cl of clientsArr) {
        server.send(JSON.stringify(sampleData), cl.port, cl.ip, function (error) {
            if (error) {
                console.log("error ", error);
            } else {
                console.log('Data sent !!!');
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

function countSubstrOccurrences(str, substr) {
    const occurrences = str.split(substr).length - 1;
    return occurrences;
}


function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371; // Radius of the Earth in kilometers

    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);

    const lat1Rad = degreesToRadians(lat1);
    const lat2Rad = degreesToRadians(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const heading = Math.atan2(y, x);

    // Convert heading from radians to degrees
    const headingDegrees = (heading * 180) / Math.PI;

    // Normalize the heading to a value between 0 and 360 degrees
    const normalizedHeading = (headingDegrees + 360) % 360;

    return normalizedHeading;
}

function logDataToFile(dataToLog) {
    try {
        fs.appendFile(filePath, dataToLog, { flag: 'a+' },
            (err) => {
                if (err) {
                    console.log(err)
                }
            })
    } catch (ex) {
        console.log(ex)
    }
}

function logJSONDataToFile(dataToLog) {
    try {
        fs.appendFile(filePathJSON, dataToLog, { flag: 'a+' },
            (err) => {
                if (err) {
                    console.log(err)
                }
            })
    } catch (ex) {
        console.log(ex)
    }
}

function calculateHeading(lat1, lon1, lat2, lon2) {
    // Convert degrees to radians
    const deg2rad = (angle) => angle * (Math.PI / 180);

    // Calculate the bearing using the Haversine formula
    const dLon = deg2rad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
    const x =
        Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
        Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
    let heading = Math.atan2(y, x);

    // Convert the bearing from radians to degrees
    heading = heading * (180 / Math.PI);

    // Adjust the heading to be in the range [0, 360]
    if (heading < 0) {
        heading += 360;
    }

    return heading;
}

function calculateAverageBearing(coords) {
    console.log("coords: ", coords)
    if (coords.length < 2) {
        //throw new Error('You need at least three sets of coordinates to calculate the average bearing.');
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

function pushAndReplace(newObject) {
    // Remove the first element if the array is full
    if (bearingCoordinates.length === avgBearingPoints) {
        bearingCoordinates.shift();
    }

    // Push the new object to the end of the array
    bearingCoordinates.push(newObject);
}

// Function to check if a lat-lon is inside a circle
function isInsideCircle(targetLat, targetLon) {

    let centerLat = pilotCoordinates.lat
    let centerLon = pilotCoordinates.lon
    let radiusInMeters = pilotCoordinates.radius

    // Calculate the distance between the center and the target using Haversine formula
    const distance = geolib.getDistance(
        { latitude: centerLat, longitude: centerLon },
        { latitude: targetLat, longitude: targetLon }
    );

    // Check if the distance is less than or equal to the radius
    return distance <= radiusInMeters;
}