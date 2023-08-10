const fs = require('fs');
const ESMTrack = require('../lib/ESMTrack')

// Read the JSON file
fs.readFile('sample_esm.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    try {
        const emsData = JSON.parse(data);
        var dataElements = emsData.Data.Elements;

        let esmDataProcessed = {};

        // Loop through array of items
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

        if (esmDataProcessed.hasOwnProperty("Analysis_Nodes")) {
            delete esmDataProcessed["Analysis_Nodes"];
        }

        // console.log(`Objects length: ${esmDataProcessed.length} `);
        // console.log(esmDataProcessed);

        const objectsArray = [];
        const valuesLength = esmDataProcessed.Signal_Duration.length;

        // Loop through the values' indices
        for (let i = 0; i < valuesLength; i ++) {
            const obj = {};

            // Loop through each key in the JSON object
            for (const key in esmDataProcessed) {
                if (esmDataProcessed.hasOwnProperty(key)) {
                    obj[key] = esmDataProcessed[key][i];
                }
            }

            objectsArray.push(obj);
        }

        console.log(JSON.stringify(objectsArray));

        objectsArray.forEach(item => {
            let emsTrack = new ESMTrack(item);
            console.log(emsTrack);
        })


    } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
    }
});
