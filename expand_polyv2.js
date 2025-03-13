const fs = require('fs');
const turf = require('@turf/turf');

// Read the polygon data from the JSON file
const data = fs.readFileSync('./json/Polygon.json');
const polygonData = JSON.parse(data);

// Convert the polygon data to GeoJSON format
const coordinates = polygonData.map(point => [point.lo, point.la]);
const polygon = turf.polygon([coordinates]);

// Function to move a point by a certain distance in the direction of the centroid
function movePoint(point, centroid, distance) {
    const bearing = turf.bearing(centroid, point);
    return turf.destination(point, distance, bearing, { units: 'kilometers' });
}

// Calculate the centroid of the polygon
const centroid = turf.centroid(polygon);

// Move each vertex outward by 3 kilometers
const expandedCoordinates = coordinates.map(coord => {
    const point = turf.point(coord);
    const movedPoint = movePoint(point, centroid, 3);
    return movedPoint.geometry.coordinates;
});

// Convert the expanded coordinates back to the original format
const expandedPolygonData = expandedCoordinates.map(coord => ({ lo: coord[0], la: coord[1], mgrs: "" }));

// Write the expanded polygon coordinates to a new JSON file
fs.writeFileSync('./json/ExpandedPolygon.json', JSON.stringify(expandedPolygonData, null, 2));

console.log('Expanded polygon coordinates have been saved to ExpandedPolygon.json');