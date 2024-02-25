const fs = require('fs');

let strToLog = ""
function findJSONObjects(filePath) {
    const jsonObjects = [];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');

    console.log("Lines: ", lines.length)

    for (const line of lines) {
        try {
            const jsonObject = JSON.parse(line);
            // console.log("line: ", line)
            if (!isValidJSONObject(jsonObject)) {
                jsonObjects.push(jsonObject);
                strToLog += "\n" + JSON.stringify(jsonObject);
            }
        } catch (error) { // If parsing fails, ignore the line (it might be non-JSON content)
        }
    }

    console.log("JSON Obj found", jsonObjects.length)

    try {
        fs.writeFile(filePath, JSON.stringify(jsonObjects), (err) => {
            if (err) {
                console.log(err)
            }
        })
    } catch (ex) {
        console.log(ex)
    }

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

const filePath = './log/IF-19012024-101558.txt';
const foundJSONObjects = findJSONObjects(filePath);

console.log(foundJSONObjects);

// Now you can work with the extracted JSON objects.
/* for (const obj of foundJSONObjects) {
    console.log(JSON.stringify(obj));
} */
