const fs = require('fs');
const turf = require('@turf/turf');

// Load the polygon data from the JSON file
const data = JSON.parse(fs.readFileSync('./json/Polygon.json'));

// Extract the coordinates
const coordinates = data.map(point => [point.lo, point.la]);

//console.log(coordinates);

// Create a GeoJSON polygon
const polygon = turf.polygon([coordinates]);

// Define the distance to expand the polygon (in kilometers)
const distance = 1;

// Expand the polygon by buffering
const expandedPolygon = turf.buffer(polygon, distance, { units: 'kilometers' });

// Extract the expanded coordinates
const expandedCoordinates = expandedPolygon.geometry.coordinates[0].map(coord => ({
    la: coord[1],
    lo: coord[0],
    mgrs: ""
}));

// Save the expanded polygon to a new JSON file
fs.writeFileSync('./json/expanded_polygon_1kms.json', JSON.stringify(expandedCoordinates, null, 2));

console.log('Polygon expanded and saved to Expanded_Polygon_detection.json');