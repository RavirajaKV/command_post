const fs = require('fs');
const geolib = require('geolib');

// Waypoints
const waypoints = [
    { label: "Start", lat: 17.415465196714976, lon: 78.28300651714454 },
    { label: "Mid", lat: 17.40790508443547, lon: 78.27810216647038 },
    { label: "Mitigated", lat: 17.405196877884507, lon: 78.27749261692145 },
    { label: "Back to", lat: 17.41537312074126, lon: 78.28314097300905 }
];

// Reference point for RG calculation
const referencePoint = { latitude: 17.40200848627336, longitude: 78.27793148449007 };

// Speed range (15-20 m/s)
const minSpeed = 20, maxSpeed = 22;

// Function to calculate heading
function calculateHeading(lat1, lon1, lat2, lon2) {
    return geolib.getRhumbLineBearing(
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
    ).toFixed(2);
}

let TI = "U"

// Function to generate points every second
function generatePath(waypoints) {
    let flightData = [];
    let previous = waypoints[0];

    for (let i = 1; i < waypoints.length; i++) {
        let current = waypoints[i];
        let distance = geolib.getDistance(
            { latitude: previous.lat, longitude: previous.lon },
            { latitude: current.lat, longitude: current.lon }
        );

        let steps = Math.ceil(distance / minSpeed);

        for (let j = 0; j < steps; j++) {
            let fraction = j / steps;
            let lat = previous.lat + fraction * (current.lat - previous.lat);
            let lon = previous.lon + fraction * (current.lon - previous.lon);
            let RG = geolib.getDistance({ latitude: lat, longitude: lon }, referencePoint);
            let heading = calculateHeading(previous.lat, previous.lon, lat, lon);

            let point = {
                message_id: 1401,
                message_text: {
                    AS: 1,
                    AZ: parseFloat(heading),
                    CONF: 100,
                    CS: "Call Sign",
                    CT: "XA0167",
                    DH: 0,
                    DR: 0,
                    DST_ID: "000-000-000000",
                    FCT: "",
                    FD: "",
                    FQ: 0,
                    HA: 78.41,
                    HE: 110.24,
                    IIRG: true,
                    LA: parseFloat(lat.toFixed(8)),
                    LO: parseFloat(lon.toFixed(8)),
                    MN: "",
                    PC: "",
                    P_UAV: 100,
                    RG: parseFloat(RG.toFixed(2)),
                    S: 14.82,
                    SID: "",
                    SN: "",
                    SRC_ID: "000-000-000-000",
                    ST: 9,
                    STS: 0,
                    T: Date.now(), // Current timestamp
                    TAGE: 10,
                    TI: TI,
                    TL: 0,
                    TP: "",
                    TS: 0,
                    UID: ""
                }
            };

            // Update TI to "H" from Mitigated point
            if (RG < 374) {
                TI = "H";

                let mitgate = {
                    "message_id": 1901,
                    "messsage_text": {
                        "BG": "72.2346993262931",
                        "CT": "XA0167",
                        "FOV": 30,
                        "OR": 245,
                        "PIP": 6687307,
                        "RG": 2,
                        "SP": 1,
                        "TGT_LA": "26.123456",
                        "TGT_LO": "73.123456",
                        "WID": 32,
                        "WPN_LA": "23.123456",
                        "WPN_LO": "73.123456",
                        "WM": "29",
                        "WN": "JAM_01",
                        "WT": "JAMMER",
                    }
                };

                flightData.push(mitgate);
            }

            // Assign FCT if FCT is active and RG > 720
            if (RG < 720) {
                point.message_text.FCT = "GA1001";
            } else if (RG > 720) {
                point.message_text.FCT = "";
            }

            flightData.push(point);

            let pilotLoc = {
                message_id: 1401,
                message_text: {
                    AS: 1,
                    AZ: 0,
                    CONF: 100,
                    CS: "Call Sign",
                    CT: "XA0168",
                    DH: 0,
                    DR: 0,
                    DST_ID: "000-000-000000",
                    FCT: "",
                    FD: "",
                    FQ: 0,
                    HA: 78.41,
                    HE: 110.24,
                    IIRG: true,
                    LA: 17.415600295215324,
                    LO: 78.28282574412809,
                    MN: "",
                    PC: "",
                    P_UAV: 100,
                    RG: parseFloat(RG.toFixed(2)),
                    S: 14.82,
                    SID: "",
                    SN: "",
                    SRC_ID: "000-000-000-000",
                    ST: 21,
                    STS: 0,
                    T: Date.now(), // Current timestamp
                    TAGE: 10,
                    TI: TI,
                    TL: 0,
                    TP: "PILOT",
                    TS: 0,
                    UID: ""
                }
            };

            let homeLoc = {
                "message_id": 1403,
                "message_text": {
                    "CTN": "XA0167H",
                    "TCTN": "XA0167",
                    "home_location": {
                        "alt": 0,
                        "lat": 17.41537312074126,
                        "lng": 78.28314097300905
                    }
                }
            };

            flightData.push(pilotLoc);
            flightData.push(homeLoc);
        }

        previous = current;
    }

    return flightData;
}

// Generate flight path
const flightPath = generatePath(waypoints);
// Save to JSON file
fs.writeFileSync("./json/fused/DroneTrack01.json", JSON.stringify(flightPath, null, 4));

console.log("Drone flight path saved!");