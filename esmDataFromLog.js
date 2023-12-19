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

const C4iIP = '192.168.1.110';
const PORT_LISTEN = 7000;
const PORT_SEND = 8008;

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

/* UDP server creation */
const server = udp.createSocket('udp4');

//server.setSendBufferSize()

// emits when any error occurs
server.on('error', function (error) {
    console.log('#44 Error: ' + error);
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

    regenerateJSONDataFromLog();
});

let finalESMData = [];
function regenerateJSONDataFromLog() {

    const filePathToReadLog = './log/log_json_20231219_125251.log';
    const foundJSONObjects = findJSONObjects(filePathToReadLog);

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
                        if (!normalizedData[i]) {
                            normalizedData[i] = {};
                        }
                        normalizedData[i][key] = values[i];
                    }
                }
            }

            // console.log(normalizedData);
            console.log("Records Size: ", normalizedData.length);

            finalESMData.push(...normalizedData);
        }
    })

    //console.log("finalESMData: ", finalESMData.length);
    finalESMData.sort((a, b) => a.Data_TimeStamp - b.Data_TimeStamp);

    sendESMDataToCTWithDelay();
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

function sendESMDataToCTWithDelay() {

    let currentIndex = 0;

    // Function to send data to the server
    function sendDataToServer() {

        if (currentIndex < finalESMData.length) {
            // let trackName = detNames.replace("MM2", "DGI")

            const dataItem = finalESMData[currentIndex];
            console.log(dataItem);

            server.send(JSON.stringify(dataItem), PORT_SEND, C4iIP, function (error) {
                if (error) {
                    console.log("error ", error);
                } else {
                    console.log('ESM data sent !!!');
                    currentIndex++;
                    setTimeout(sendDataToServer, 500); // Send the next data after 500ms
                }
            });
        }
    }

    // Start sending data
    sendDataToServer();
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
