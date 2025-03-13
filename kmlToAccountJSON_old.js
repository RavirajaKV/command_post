const fs = require('fs');
const { DOMParser } = require('xmldom');

function calculateCentroid(coords) {
    let sumLat = 0, sumLon = 0;
    coords.forEach(coord => {
        sumLat += coord.la;
        sumLon += coord.lo;
    });
    return {
        la: sumLat / coords.length,
        lo: sumLon / coords.length,
        mgrs: ""
    };
}


function parseKML(filePath) {
    const kmlData = fs.readFileSync(filePath, 'utf-8');
    const doc = new DOMParser().parseFromString(kmlData, 'text/xml');

    const coordinates = [];
    const placemarks = doc.getElementsByTagName('Placemark');

    for (let i = 0; i < placemarks.length; i++) {
        const polygon = placemarks[i].getElementsByTagName('Polygon');

        if (polygon.length > 0) {
            const coordNodes = polygon[0].getElementsByTagName('coordinates');

            if (coordNodes.length > 0) {
                const coordText = coordNodes[0].textContent.trim();
                const coordPairs = coordText.split(/\s+/);

                coordPairs.forEach(pair => {
                    const [lon, lat] = pair.split(',').map(Number);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        coordinates.push({ la: lat, lo: lon, mgrs: "" });
                    }
                });
            }
        }
    }

    if (coordinates.length === 0) {
        console.error("No polygon coordinates found in KML file.");
        return null;
    }

    const base = coordinates.length > 0 ? coordinates[0] : calculateCentroid(coordinates);

    return {
        base: base,
        vertices: {
            count: coordinates.length,
            index: 0,
            color: "#ff0000",
            shape: "polygon",
            radius: 0,
            array: coordinates
        },
        capability_specs: {
            title: "",
            notes: "This system is capable of detecting small, medium, large drone's / threat'.",
            specifications: [{ key: "" }]
        },
        account_label: "Janawada"
    };
}


const kmlFilePath = './kml/Kurnool_Drone_City.kml';
const result = parseKML(kmlFilePath);

if (result) {
    const compressedJson = JSON.stringify(result);
    fs.writeFileSync('./json/Kurnool_Drone_City.json', compressedJson);
    console.log("JSON saved to json");
}
