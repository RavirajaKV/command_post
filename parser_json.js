const net = require('net');
const udp = require('dgram');


// creating a udp server
const server = udp.createSocket('udp4');

// emits when any error occurs
server.on('error', function (error) {
    console.log('Error: ' + error);
    server.close();
});


let clientsArr = [];
// emits on new datagram msg
server.on('message', function (msg, info) {
    console.log('Data received from client : ' + msg.toString());
    console.log('Received %d bytes from %s:%d\n', msg.length, info.address, info.port);

    clientsArr.push({ip: info.address, port: info.port})

});

// emits when socket is ready and listening for datagram msgs
server.on('listening', function () {
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);
});

// emits after the socket is closed using socket.close();
server.on('close', function () {
    console.log('Socket is closed !');
});

server.bind(2222, '192.168.101.106');

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
client.on('data', data => { // console.log(`Received data plain:`, data.toString());
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
            //console.log("Data received from simulator");

            let ha = 0;

            if (prevLat || prevLog) {
                ha = Number.parseInt(calculateHeading(prevLat, prevLog, finalData[headersData.indexOf('Latitude (°)')][0], finalData[headersData.indexOf('Longitude (°)')][0]) || 0);
            }

            prevLat = finalData[headersData.indexOf('Latitude (°)')][0];
            prevLog = finalData[headersData.indexOf('Longitude (°)')][0];

            let sampleData = {
                message_id: 1401,
                message_text: {
                    HA: ha,
                    HE: finalData[headersData.indexOf('Altitude (m)')][0],
                    LA: finalData[headersData.indexOf('Latitude (°)')][0],
                    LO: finalData[headersData.indexOf('Longitude (°)')][0],
                    S: 0,
                    T: finalData[headersData.indexOf('UnixTime (s)')][0],
                    CT: "DL301",
                    CS: "",
                    TI: "H",
                    MA: finalData[headersData.indexOf('Uncertainty MajorAxis (m)')][0],
                    MI: finalData[headersData.indexOf('Uncertainty MinorAxis (m)')][0],
                    DT: finalData[headersData.indexOf('Det Name')][0]
                }
            };

            let sampleData1901 = {
                message_id: 1901,
                message_text: {
                    BG: "72.2346993262931",
                    CT: "DL301",
                    DP_LA: 0,
                    DP_LO: 0,
                    FOV: 50,
                    OR: 245,
                    PIP: 6687307,
                    RG: 2,
                    SP: 1,
                    TGT_LA: finalData[headersData.indexOf('Latitude (°)')][0],
                    TGT_LO: finalData[headersData.indexOf('Longitude (°)')][0],
                    WID: 1,
                    WN: "JAM1_1",
                    WPN_LA: 23.123456,
                    WPN_LO: 73.123456,
                    WT: "JAMMER"
                }
            }
            // console.log("Data to be sent: ", JSON.stringify(sampleData));
            //console.log("Data to clients: (", sampleData.message_text.T, ") => Lat,Lon:", sampleData.message_text.LA, ",", sampleData.message_text.LO, "; Ellipsoid:", sampleData.message_text.MA, ",", sampleData.message_text.MI);
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

        } catch (e) {
            console.log(e);
        }


    }
    // process.exit(0);
});

// Event handler for server connection close
client.on('close', () => {
    console.log('Connection closed');
});

// Event handler for errors
client.on('error', err => {
    console.log(`Socket error: ${err}`);
});

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
