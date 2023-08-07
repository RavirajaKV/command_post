const fs = require('fs');

function findJSONObjects(filePath) {
    const jsonObjects = [];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');

    for (const line of lines) {
        try {
            const jsonObject = JSON.parse(line);
            if (!isValidJSONObject(jsonObject)) {
                jsonObjects.push(jsonObject);
                console.log(JSON.stringify(jsonObject))
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

const filePath = './log/logToRead.log';
const foundJSONObjects = findJSONObjects(filePath);

// Now you can work with the extracted JSON objects.
for (const obj of foundJSONObjects) {
    console.log(JSON.stringify(obj));
}

