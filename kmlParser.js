const fs = require('fs');
const { DOMParser } = require('xmldom');

function parseKMLToJSON(kmlFilePath, outputJsonPath) {
    fs.readFile(kmlFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        const doc = new DOMParser().parseFromString(data, 'text/xml');
        const placemarks = doc.getElementsByTagName('Placemark');
        let coordinates = [];
        let baseCoordinates = { la: 0, lo: 0, mgrs: "" };

        for (let i = 0; i < placemarks.length; i++) {
            const polygon = placemarks[i].getElementsByTagName('Polygon');
            const lineString = placemarks[i].getElementsByTagName('LineString');
            //const pointCord = placemarks[i].getElementsByTagName('Point');

            let coordsTag = null;
            if (polygon.length > 0) {
                coordsTag = polygon[0].getElementsByTagName('coordinates');
            } else if (lineString.length > 0) {
                coordsTag = lineString[0].getElementsByTagName('coordinates');
            }/*  else if (pointCord.length > 0) {
                coordsTag = pointCord[0].getElementsByTagName('coordinates');
            } */

            if (coordsTag && coordsTag.length > 0) {
                let coordsString = coordsTag[0].textContent.trim();
                let coordsArray = coordsString.split(/\s+/);

                coordsArray.forEach(coord => {
                    let [lo, la] = coord.split(',');
                    if (la && lo) {
                        let latLon = { la: parseFloat(la), lo: parseFloat(lo), mgrs: "" };
                        coordinates.push(latLon);
                    }
                });
            }
        }

        if (coordinates.length === 0) {
            console.error('No coordinates found! Check KML structure.');
        }

        // Determine base coordinates
        if (coordinates.length > 0) {
            if (placemarks[0].getElementsByTagName('Point').length > 0) {
                baseCoordinates = coordinates[0];
            } else {
                let sumLat = 0, sumLon = 0;
                coordinates.forEach(coord => {
                    sumLat += coord.la;
                    sumLon += coord.lo;
                });
                baseCoordinates = {
                    la: sumLat / coordinates.length,
                    lo: sumLon / coordinates.length,
                    mgrs: ""
                };
            }
        }

        const jsonOutput = {
            base: baseCoordinates,
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

        fs.writeFile(outputJsonPath, JSON.stringify(jsonOutput, null, 4), (err) => {
            if (err) {
                console.error('Error writing JSON:', err);
            } else {
                console.log('JSON file has been saved:', outputJsonPath);
            }
        });
    });
}

parseKMLToJSON('./kml/Kurnool_Drone_City.kml', './json/Kurnool_Drone_City.json');
