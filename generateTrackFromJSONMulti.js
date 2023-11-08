const net = require('net');
const udp = require('dgram');
const fs = require('fs');
const moment = require('moment')
const ip = require("ip");
const ESMTrack = require('./lib/ESMTrack');
const {escape} = require('querystring');
const geolib = require('geolib');

let currentDtTm = moment().format('YYYYMMDD_HHmmss');
console.log("currentDtTm", currentDtTm)

const commandTableIP = '192.168.101.102'; // '255.255.255.0'; // Broadcast address to send to all devices on the network
const PORT_LISTEN = 7000;
const PORT_SEND = 8000;
const localIP = ip.address()

const avgBearingPoints = 4
const bearingCoordinates = new Array(avgBearingPoints);

// creating a udp server
const server = udp.createSocket('udp4');

server.bind(PORT_LISTEN, localIP, () => {
    console.log("UDP binding success!")
    regenerateJSONDataFromLog();

    // server.setBroadcast(true);
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

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});

// emits when socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;

    console.log('Server is listening on: ' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family + '\n');
});

server.on('message', function (msg, info) {
    console.log('Data received from client: ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);

    // clientsArr.push({ip: info.address, port: info.port})

    // Send test data to confirm contectivity
    // regenerateJSONDataFromLog()
});

// emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('Socket is closed !');
});

let finalESMData = [];
function regenerateJSONDataFromLog() {

    const filePathToReadLog = './log/log_trail.log';
    const foundJSONObjects = findJSONObjects(filePathToReadLog);

    let totalCount = 0;
    foundJSONObjects.forEach(parsedMessage => { 
        // console.log("\n" + JSON.stringify(parsedMessage))

        let hasDataObject = parsedMessage.Data || "";
        if (hasDataObject) {
            let esmDataProcessed = {};

            let dataElements = parsedMessage.Data.Elements;
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

            // console.log(`********************\n`);//, esmDataProcessed);

            const normalizedData = [];
            for (const key in esmDataProcessed) {
                if (esmDataProcessed[key] !== undefined) {
                    const values = esmDataProcessed[key];

                    for (let i = 0; i < values.length; i++) {
                        if (! normalizedData[i]) {
                            normalizedData[i] = {};
                        }
                        normalizedData[i][key] = values[i];
                    }
                }
            }

            // console.log(normalizedData);
            //console.log("Records Size: ", normalizedData.length);
            totalCount = totalCount + normalizedData.length;

            finalESMData.push(...normalizedData);

            normalizedData.forEach(item => {
                if (!(item.Location_Latitude == 0 && item.Location_Longitude == 0)) {
                    let emsTrack = new ESMTrack(item);
                    //console.log(emsTrack);

                    //console.log(emsTrack.Location_Latitude+","+emsTrack.Location_Longitude+",", emsTrack.Data_TimeStamp);

                    if (!isInsideCircle(emsTrack.Location_Latitude, emsTrack.Location_Longitude)) 
                        finalESMData.push(emsTrack);
                    
                    //sendESMDataToCT(emsTrack);
                }
            })
        }
    })

    //console.log("finalESMData: ", finalESMData.length);
    finalESMData.sort((a, b) => a.Data_TimeStamp - b.Data_TimeStamp);

    sendESMDataToCTWithDelay();

    /* finalESMData.forEach(emsTrack => {
        console.log(emsTrack.Location_Latitude + "," + emsTrack.Location_Longitude, ",red,circle,\"Dt: ", new Date(emsTrack.Data_TimeStamp * 1000), "\"");
        
    }); */
}

function sendESMDataToCTWithDelay() {

    let currentIndex = 0;

    // Function to send data to the server
    function sendDataToServer() {

        if (currentIndex < finalESMData.length) { 
            // let trackName = detNames.replace("MM2", "DGI")

            const emsTrack = finalESMData[currentIndex];
            console.log(emsTrack);

            let detName = emsTrack.Signal_Detector_Name || emsTrack.Analysis_Center;
            let heading = emsTrack.Location_Heading || 0

            if (heading == 0) {
                pushAndReplace({lat: emsTrack.Location_Latitude, lon: emsTrack.Location_Longitude})
                if (bearingCoordinates.length >= avgBearingPoints) {
                    heading = Number.parseInt(calculateAverageBearing(bearingCoordinates) || 0);
                }
            }

            const frequencyInGigahertz = hertzToGigahertz(emsTrack.Analysis_Center);
            let sampleData = {
                "message_id": 1401,
                "message_text": {
                    "HA": 0, // heading,
                    "HE": emsTrack.Location_Altitude || 0,
                    "LA": emsTrack.Location_Latitude,
                    "LO": emsTrack.Location_Longitude,
                    "S": 0,
                    "T": emsTrack.Data_TimeStamp,
                    "CT": "AE001_"+frequencyInGigahertz, // emsTrack.Signal_Detector_Name, // "DL - " + trackName,
                    "CS": "",
                    "TI": "H",
                    "MA": 0, // emsTrack.Uncertainty_Major_Axis,
                    "MI": 0, // emsTrack.Uncertainty_Minor_Axis,
                    "DT": detName,
                    "FQ": emsTrack.Analysis_Center,
                    "INF": "Confidence: " + emsTrack.Data_Decision_Confidence + ", Band Width: " + emsTrack.Signal_Bandwidth + "."
                }
            };
            console.log(sampleData);

            server.send(JSON.stringify(sampleData), PORT_SEND, commandTableIP, function (error) {
                if (error) {
                    console.log("error ", error);
                } else {
                    console.log('Data Msg Type 1401 sent !!!');
                    currentIndex++;
                    setTimeout(sendDataToServer, 150); // Send the next data after 500ms
                }
            });
        }
    }

    // Start sending data
    sendDataToServer();
}

function sendObjToCT(sampleData) {
    server.send(JSON.stringify(sampleData), PORT_SEND, commandTableIP, function (error) {
        if (error) {
            console.log("error sending: ", error);
        }
        // else {
        //     console.log('Data sent !!!');
        // }
    });
}

function sendESMDataToCT(emsTrack) { // let trackName = detNames.replace("MM2", "DGI")
    let detName = emsTrack.Signal_Detector_Name || emsTrack.Analysis_Center;
    let heading = emsTrack.Location_Heading || 0

    if (heading == 0) {
        pushAndReplace({lat: emsTrack.Location_Latitude, lon: emsTrack.Location_Longitude})
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
            "T": emsTrack.Data_TimeStamp,
            "CT": "AE001", // emsTrack.Signal_Detector_Name, // "DL - " + trackName,
            "CS": "",
            "TI": "H",
            "MA": emsTrack.Uncertainty_Major_Axis,
            "MI": emsTrack.Uncertainty_Minor_Axis,
            "DT": detName,
            "FQ": emsTrack.Signal_Bandwidth,
            "INF": "Confidence: " + emsTrack.Data_Decision_Confidence + ", Band Width: " + emsTrack.Signal_Bandwidth + "."
        }
    };
    // console.log(sampleData);

    server.send(JSON.stringify(sampleData), PORT_SEND, commandTableIP, function (error) {
        if (error) {
            console.log("error ", error);
        } else {
            console.log('Data Msg Type 1401 sent !!!');
        }

    });
}

function findJSONObjects(filePath) {
    const jsonObjects = [];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');


    for (const line of lines) {
        try {
            const jsonObject = JSON.parse(line);
            if (!isValidJSONObject(jsonObject)) {
                jsonObjects.push(jsonObject);
                // console.log(JSON.stringify(jsonObject))
            }
        } catch (error) { // If parsing fails, ignore the line (it might be non-JSON content)
        }
    }

    console.log("JSON Obj found", jsonObjects.length)

    return jsonObjects;
}

function isValidJSONObject(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (error) {
        return false;
    }
}

function calculateAverageBearing(coords) { // console.log("coords: ", coords)
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

function pushAndReplace(newObject) { // Remove the first element if the array is full
    if (bearingCoordinates.length === avgBearingPoints) {
        bearingCoordinates.shift();
    }

    // Push the new object to the end of the array
    bearingCoordinates.push(newObject);
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

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function isInsideCircle(targetLat, targetLon) {

    const pilotCoordinates = {
        lat: 17.402128381961994,
        lon: 78.27802685252136,
        radius: 100
    }

    let centerLat = pilotCoordinates.lat
    let centerLon = pilotCoordinates.lon
    let radiusInMeters = pilotCoordinates.radius

    // Calculate the distance between the center and the target using Haversine formula
    const distance = geolib.getDistance({
        latitude: centerLat,
        longitude: centerLon
    }, {
        latitude: targetLat,
        longitude: targetLon
    });

    // Check if the distance is less than or equal to the radius
    return distance <= radiusInMeters;
}

function isPointInsidePolygon(point) {

    const polyPoints = [
        [
            28.587821121346163, 77.20232550054789
        ],
        [
            28.58339117859499, 77.21081536263227
        ],
        [
            28.581677679562013, 77.20530778169632
        ]
    ]

    const [x, y] = point;
    const vertices = polyPoints.map(([vx, vy]) => [vx, vy]);

    let isInside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const [vix, viy] = vertices[i];
        const [vjx, vjy] = vertices[j];

        const intersect = viy > y !== vjy > y && x < ((vjx - vix) * (y - viy)) / (vjy - viy) + vix;

        if (intersect) {
            isInside = ! isInside;
        }
    }

    return isInside;
}

function hertzToGigahertz(frequencyInHertz) {
    const frequencyInGigahertz = (frequencyInHertz / 1e9).toFixed(3); // Rounds to 4 decimal places
    return frequencyInGigahertz;
}