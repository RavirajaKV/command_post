const net = require('net');
const udp = require('dgram');
const fs = require('fs');
const moment = require('moment')
const ip = require("ip");

let currentDtTm = moment().format('YYYYMMDD_HHmmss');
console.log("currentDtTm", currentDtTm)

const commandTableIP = '192.168.101.102';//'255.255.255.0'; // Broadcast address to send to all devices on the network
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

function regenerateJSONDataFromLog() {

    const filePathToReadLog = './log/log_trail.log';
    const foundJSONObjects = findJSONObjects(filePathToReadLog);

    let index = 0;
    function sendNextJSONObject() {
        foundJSONObjects.forEach(parsedMessage => { 
            // console.log("\n" + JSON.stringify(parsedMessage))

            setTimeout(() => {
                let finalData = parsedMessage.Data || "";
                if (finalData) {
                    finalData = finalData.Elements || [];

                    let obj = {};
                    for (let finalDataObj of finalData) { 
                        console.log(JSON.stringify(finalDataObj))
                        if (finalDataObj.ElementType == "Doubles") {
                            obj[finalDataObj.Key] = finalDataObj.DoubleData.Values[0];
                        } else if (finalDataObj.ElementType == "Strings") {
                            try {
                                obj[finalDataObj.Key] = finalDataObj.StringData.Values[0]
                            } catch (exc) {
                                obj[finalDataObj.Key] = ""
                            }
                        }
                    }

                    console.log("obj: "+JSON.stringify(obj));

                    altitude = obj["Location_Altitude"] || 0;
                    latitude = obj["Location_Latitude"];
                    longitude = obj["Location_Longitude"];
                    unixTime = Math.round(obj["Data_TimeStamp"]); // moment.now();
                    majorAxis = 0;//obj["Uncertainty_Major_Axis"];
                    minorAxis = 0;//obj["Uncertainty_Minor_Axis"];
                    detNames = obj["Signal_Detector_Name"] || obj["Analysis_Center"];
                    frequency = obj["Analysis_Center"];
                    heading = obj["Location_Heading"] || 0;

                    // console.log(JSON.stringify(obj));
                    if (heading == 0) {
                        pushAndReplace({lat: latitude, lon: longitude})
                        if (bearingCoordinates.length >= avgBearingPoints) {
                            heading = Number.parseInt(calculateAverageBearing(bearingCoordinates) || 0);
                        }
                    }

                    let sampleData = {
                        "message_id": 1401,
                        "message_text": {
                            "HA": heading,
                            "HE": altitude,
                            "LA": latitude,
                            "LO": longitude,
                            "S": 0,
                            "T": unixTime,
                            "CT": "AE001",//+ detNames,
                            "CS": "",
                            "TI": "H",
                            "MA": majorAxis,
                            "MI": minorAxis,
                            "DT": detNames,
                            "FQ": frequency
                        }
                    };

                    console.log(JSON.stringify(sampleData));
                    //if(detNames != "ADS-B")
                    sendObjToCT(sampleData)
                    
                }
            }, index * 250); // Delay of 500 ms for each index
            index++;
        })
    }
    sendNextJSONObject();
}

function sendObjToCT(sampleData) { 
    server.send(JSON.stringify(sampleData), PORT_SEND, commandTableIP, function (error) {
        if (error) {
            console.log("error sending: ", error);
         } 
         //else {
        //     console.log('Data sent !!!');
        // }
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
    if (coords.length < 2) { 
        // throw new Error('You need at least three sets of coordinates to calculate the average bearing.');
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