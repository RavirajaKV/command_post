const net = require('net');
const udp = require('dgram');
const getLocalIP = require('../localIP');
const protobuf = require('protobufjs');

// Load your Protobuf message definition
const root = protobuf.loadSync('./pbd2.proto');
const Pbd2 = root.lookupType('CRFS.Data.pbd2.DataGeneric');

const localIP = getLocalIP();
console.log('Local IP:', localIP);

// creating a udp server
const server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});

const dataComingIn = "pb";

let clientsArr = [];
// emits on new datagram msg
server.on('message', function (msg, info) {
    console.log('Data received from client: ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);

    clientsArr.push({ip: info.address, port: info.port})

    // Send test data to confirm contectivity
    // sendDataToClients(180, 10, 17.1, 78.1, new Date().getTime(), 100, 50, "detNames", "100.1234");
});

// emits when socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;

    console.log('Server listening IP:' + ipaddr, "Port: ", port, 'Server is IP4/IP6 : ' + family);
});

// emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('Socket is closed !');
});

server.bind(2222, localIP);

const client = new net.Socket();

const port = 9991;
const host = '103.227.98.157';
// Replace with the server's hostname or IP address

// Connect to the server
client.connect(port, host, () => {
    console.log(`Connected to ${host}:${port}`);

    // Send data to the server
    // client.write('Hello, server!');
});


let prevLat,
    prevLog;
// Event handler for receiving data from the server
client.on('data', data => {

    let isError = false;
    let altitude,
        latitude,
        longitude,
        unixTime,
        majorAxis,
        minorAxis,
        detNames,
        frequency;
    if (dataComingIn == "json") { // console.log(`Received data plain:`, data.toString());
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

                // console.log(finalData);

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
    } else if (dataComingIn == "pb") { // console.log(`Received data plain:`, data);
        let bufData = Buffer.from(data);
        // console.log(`Received data In buffer:`, bufData);

        try { // Parse the received Protobuf message
            const decodedMessage = Pbd2.decode(bufData);
            // console.log(`Decoded data :`, decodedMessage);
            const parsedMessage = Pbd2.toObject(decodedMessage, {
                longs: String,
                enums: String,
                bytes: String
            });


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

                // console.log(JSON.stringify(parsedMessage));
            } else {
                isError = true;
            }
        } catch (error) { // console.log(error);
            isError = true
        }
    }

    if (! isError) {

        let ha = 0;

        if (prevLat || prevLog) {
            ha = Number.parseInt(calculateHeading(prevLat, prevLog, latitude, longitude) || 0);
        }

        prevLat = latitude;
        prevLog = longitude;

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
    let sampleData = {
        "message_id": 1401,
        "message_text": {
            "HA": ha,
            "HE": altitude,
            "LA": latitude,
            "LO": longitude,
            "S": 0,
            "T": unixTime,
            "CT": "DL301",
            "CS": "",
            "TI": "H",
            "MA": majorAxis,
            "MI": minorAxis,
            "DT": detNames,
            "FQ": frequency
        }
    };

    let sampleData1901 = {
        "message_id": 1901,
        "message_text": {
            "BG": "72.2346993262931",
            "CT": "DL301",
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
    console.log(sampleData1901);
    for (let cl of clientsArr) {
        server.send(JSON.stringify(sampleData), cl.port, cl.ip, function (error) {
            if (error) {
                console.log("error ", error);
            } else {
                console.log('Data sent !!!');
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

function countSubstrOccurrences(str, substr) {
    const occurrences = str.split(substr).length - 1;
    return occurrences;
}


function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function calculateHeading(lat1, lon1, lat2, lon2) {
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
