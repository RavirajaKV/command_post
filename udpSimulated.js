var udp = require("dgram");
var circle = require("@turf/circle").default;

// creating a udp server
var server = udp.createSocket("udp4");

// emits when any error occurs
server.on("error", function (error) {
  console.log("Error: " + error);
  server.close();
});

function randomIntFromInterval(min, max, floor = false) {
  // min and max included
  let rand = Math.random() * (max - min) + min;
  if (floor) return Math.floor(rand);
  return rand;
}

let timer = null;
const udpArray = [];
let count = 0;
let u_data = {};
let jammerData = {
  message_id: 1901, // Draw poly line
  message_text: {
    BG: "72.2346993262931",
    CT: "JA003",
    DP_LA: 17.41240967088845,
    DP_LO: 78.26580000237607,
    SP: 1,
    TGT_LA: 17.406132804345123,
    TGT_LO: 78.2612000568701,
    WID: 1,
    WPN_LA: 23.123456,
    WPN_LO: 73.123456,
    WN: "JAM2_2",
    WT: "JAMMER",
  },
};
// emits on new datagram msg
// server.on("message", function (msg, info) {
const initUdpData = (msg, info) => {
  console.log("Data received from client : " + msg.toString());
  console.log(
    "Received %d bytes from %s:%d\n",
    msg.length,
    info.address,
    info.port
  );
  const message = msg.includes("{") ? JSON.parse(msg) : {};
  console.log({ message });
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (message?.id === "RADARDATA" && message?.bounds?.minlng) {
    let tt = 0;
    timer = setInterval(() => {
      tt++;
      const rngLat = randomIntFromInterval(
        message.bounds.minlat,
        message.bounds.maxlat
      );
      const rngLng = randomIntFromInterval(
        message.bounds.minlng,
        message.bounds.maxlng
      );
      let rngId = randomIntFromInterval(1, 4, true);
      if (rngId < 10) rngId = "00" + rngId;
      else if (rngId < 100) rngId = "0" + rngId;
      const HA = 15//randomIntFromInterval(0, 360, true);
      let fid = udpArray.findIndex((f) => f.CT === `JA${rngId}`);
      let u_data = {};
      console.log(rngLat, rngLng, udpArray.length, fid, tt);
      if (fid === -1) {
        u_data = {
          CT: `JA${rngId}`,
          TA: new Date().getTime(),
          AZ: 60,
          AS: 1,
          RG: 12.67898,
          HE: 1010,
          A: 1100,
          HA: 0,
          CS: "Call Sign",
          LA: rngLat,
          LO: rngLng,
          S: 50,
          TI: rngId== 1 ? "U" : "H",
          ST: 0,
          T: new Date().getTime(),
          SID: "",
          TP: "",
          MN: "MN",
          PC: "PC",
          FQ: 34.56,
          UID: "INIQU5667",
          SOLNS: [
            { RG: 0, WID: 12, WN: "CD_9", WT: "DRONE" },
            { RG: 0, WID: 13, WN: "JAM2_1", WT: "JAMMER" },
          ],
        };
        // if (udpArray.length === 3) {
        //   udpArray.push({ ...u_data, CT: "CD_9" });
        // }
        udpArray.push(u_data);
      } else {
        //let rr = parseFloat("1.0000" + Math.round(Math.random() * 10), 10)
        let NLA =
          udpArray[fid]["LA"] *
          parseFloat("1.0000" + Math.round(Math.random() * 10), 10);
        let NLO =
          udpArray[fid]["LO"] *
          parseFloat("1.0000" + Math.round(Math.random() * 10), 10);
        let NN_LA = NLA > message.bounds.maxlat ? rngLat : NLA;
        let NN_LO = NLO > message.bounds.maxlng ? rngLng : NLO;
        var dLon = udpArray[fid]["LO"] - NN_LO;
        var dLat = udpArray[fid]["LA"] - NN_LA;
        var angle = 180 + (Math.atan2(dLon, dLat) * 180) / Math.PI;

        u_data = {
          ...udpArray[fid],
          T: new Date().getTime(),
          LA: NN_LA,
          LO: NN_LO,
          TI: rngId== 1 ? "U" : "H",
          HA: angle,
          // AZ: Math.round(Math.random() * 1000) % 360,
          AZ: udpArray[fid].CT === "DA001" ? 180 : 60,
          ST: 1,
          // LA: NLA,
          // LO: NLO,
        };
        udpArray[fid] = u_data;
      }
      // if (tt % 5 === 0) {
      //   server.send(
      //     JSON.stringify({
      //       message_id: 3076,
      //       message_text: { ID: 2, ST: "Jammer", State: 48, T: 1702388709428 },
      //     }),
      //     info.port,
      //     info.address,
      //     function (error) {
      //       if (error) {
      //         console.log("error ", error);
      //       } else {
      //         console.log("Data sent !!!");
      //       }
      //     }
      //   );
      // }
      server.send(
        JSON.stringify({
          message_id: 1401,
          message_text: u_data,
        }),
        info.port,
        info.address,
        function (error) {
          if (error) {
            console.log("error ", error);
          } else {
            console.log("Data sent !!!", u_data.TI);
          }
        }
      );
      // let jid = udpArray.findIndex((f) => f.CT === `JA003`);
      if (u_data["CT"] === "JA004") {
        server.send(
          JSON.stringify({
            message_id: 1401,
            message_text: {
              ...u_data,
              ST: 11,
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!");
            }
          }
        );
      }
      if (u_data["CT"] === "JA006") {
        server.send(
          JSON.stringify({
            message_id: 1901,
            message_text: {
              ...u_data,
              SP: 1,
              MA: 50,
              MI: 72,
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!");
            }
          }
        );
      }
      if (u_data["CT"] === "JA003") {
        server.send(
          JSON.stringify({
            message_id: 1901,
            message_text: {
              ...u_data,
              SP: 1,
              HA: 20,
              TGT_LA: u_data["LA"],
              TGT_LO: u_data["LO"],
              WID: 1,
              WN: "JAM2_2",
              WT: "JAMMER",
              TI: "H",
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!");
            }
          }
        );
      }
      // let cid = udpArray.findIndex((f) => f.CT === `JA002`);
      if (u_data["CT"] === "JA002") {
        server.send(
          JSON.stringify({
            message_id: 1901,
            message_text: {
              ...u_data,
              SP: 1,
              TGT_LA: u_data["LA"],
              TGT_LO: u_data["LO"],
              DP_LA: u_data["LA"],
              DP_LO: u_data["LO"],
              WID: 1,
              WN: "EO1_1",
              WT: "EO",
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!");
            }
          }
        );
      }
      if (u_data["CT"] === "JA005") {
        server.send(
          JSON.stringify({
            message_id: 1401,
            message_text: {
              ...u_data,
              CT: "CD_9",
              TI: "CD",
              T: new Date().getTime(),
              LA: u_data["LA"] * 1.00001,
              LO: u_data["LO"] * 1.00001,
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!");
            }
          }
        );

        server.send(
          JSON.stringify({
            message_id: 1901,
            message_text: {
              ...u_data,
              SP: 1,
              TI: "H",
              TGT_LA: u_data["LA"],
              TGT_LO: u_data["LO"],
              DP_LA: u_data["LA"],
              DP_LO: u_data["LO"],
              WID: 1,
              WN: "CD_9",
              WT: "DRONE",
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!");
            }
          }
        );
      }
    }, 1500);
  } else if (message?.id === "SWAM" && message?.bounds?.center) {
    const { lng, lat } = message.bounds.center;
    var center = [lng, lat];
    var radius = 7550;
    var options = {
      steps: 360,
      units: "meters",
      properties: { foo: "bar" },
    };
    var coordinates = [[]];
    coordinates = circle(center, radius, options)?.geometry?.coordinates;
    console.log({ lng, lat, coordinates });
    let ii = 0;
    timer = setInterval(() => {
      if (ii < coordinates[0].length - 1) {
        let rngId = ii + 1;
        if (rngId < 10) rngId = "00" + rngId;
        else if (rngId < 100) rngId = "0" + rngId;
        var dLon = !!coordinates[0][ii - 1]
          ? coordinates[0][ii - 1][0] - coordinates[0][ii][0]
          : coordinates[0][ii][0];
        var dLat = !!coordinates[0][ii - 1]
          ? coordinates[0][ii - 1][1] - coordinates[0][ii][1]
          : coordinates[0][ii][1];
        var angle = 180 + (Math.atan2(dLon, dLat) * 180) / Math.PI;
        // console.log({ ii, u_data });
        server.send(
          JSON.stringify({
            message_id: 1401,
            message_text: {
              CT: `JA${rngId}`,
              T: new Date().getTime(),
              AS: 1,
              HE: 1010,
              HA: angle,
              CS: "Call Sign",
              LA: coordinates[0][ii][1],
              LO: coordinates[0][ii][0],
              S: 50,
              TI: "U",
            },
          }),
          info.port,
          info.address,
          function (error) {
            if (error) {
              console.log("error ", error);
            } else {
              console.log("Data sent !!!", angle, radius);
            }
          }
        );
        ii++;
      } else {
        ii = 0;
        var options = {
          steps: 360,
          units: "meters",
          properties: { foo: "bar" },
        };
        radius = radius - 100;
        if (radius < 0) radius = 7000;
        coordinates = circle(center, radius, options)?.geometry?.coordinates;
      }
    }, 200);
  } else {
    // server.send(
    //   JSON.stringify({
    //     message_id: 1402,
    //     message_text: { CT: "JA002" },
    //   }),
    //   info.port,
    //   info.address,
    //   function (error) {
    //     if (error) {
    //       console.log("error ", error);
    //     } else {
    //       console.log("Data sent !!!");
    //     }
    //   }
    // );
  }
};

// emits when socket is ready and listening for datagram msgs
server.on("listening", function () {
  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log("Server is listening at port " + port);
  console.log("Server ip :" + ipaddr);
  console.log("Server is IP4/IP6 : " + family);
  address.port = 8000;
  address.address = "192.168.101.101"
  initUdpData(
    '{"id":"RADARDATA","bounds":{"minlat":17.398418398516796,"minlng":78.26806904995186,"maxlng":78.28593095005448,"maxlat":17.407259598382893,"center":{"lng":78.27700000000004,"lat":17.402750019208085}}}',
    address
  );
  // Sent
});

// emits after the socket is closed using socket.close();
server.on("close", function () {
  console.log("Socket is closed !");
});

server.bind(7000, "0.0.0.0");
