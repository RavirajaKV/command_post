const express = require('express')
const app = express()
app.use(express.json({limit: '50mb'}));
app.use(express.text());

app.get('/test', (req, res) => {
    console.log("Test req for GET!")
    res.json({message: "Test request for GET!"});
});

app.post('/device', (req, res) => {
    console.log("Test req for POST!")

    /* let reqBody = req.body
    console.log(req.body) */
    
    res.send("{Res,39,42,41,0,0,0,0,1,0,0,0,6/8/1970 Thu 01:00:06,1,1,On Battery/On Battery,}");
});

/* app.get('/device', (req, res) => {
    console.log("Test req for GET!")

    let reqBody = req.body
    console.log(req.body)

    res.json({message: "Success!", data:reqBody});
});
 */

//app.listen(80);
var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    
    console.log("Server app listening at http://%s:%s", host, port)
 })