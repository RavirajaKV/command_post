var udp = require("dgram");

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
    WN: "JAM1_1",
    WT: "JAMMER",
  },
};
// emits on new datagram msg
server.on("message", function (msg, info) {
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
  if (message?.bounds?.minlat) {
    timer = setInterval(() => {
      const rngLat = randomIntFromInterval(
        message.bounds.minlat,
        message.bounds.maxlat
      );
      const rngLng = randomIntFromInterval(
        message.bounds.minlng,
        message.bounds.maxlng
      );
      let rngId = randomIntFromInterval(1, 10, true);
      if (rngId < 10) rngId = "00" + rngId;
      else if (rngId < 100) rngId = "0" + rngId;
      const HA = randomIntFromInterval(0, 360, true);
      let fid = udpArray.findIndex((f) => f.CT === `JA${rngId}`);
      let u_data = {};
      console.log(rngLat, rngLng, udpArray.length, fid);
      if (fid === -1) {
        u_data = {
          CT: `JA${rngId}`,
          T: new Date().getTime(),
          AS: 1,
          HE: 110,
          HA: HA,
          CS: "Call Sign",
          LA: rngLat,
          LO: rngLng,
          S: 50,
          TI: rngId % 3 ? "U" : "H",
        };
        if (udpArray.length === 3) {
          udpArray.push({ ...u_data, CT: "CD_11" });
        }
        udpArray.push(u_data);
      } else {
        let NLA = udpArray[fid]["LA"] * 1.00001;
        let NLO = udpArray[fid]["LO"] * 1.00001;
        u_data = {
          ...udpArray[fid],
          T: new Date().getTime(),
          LA: NLA > message.bounds.maxlat ? rngLat : NLA,
          LO: NLO > message.bounds.maxlng ? rngLng : NLO,
        };
        udpArray[fid] = u_data;
      }
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
            console.log("Data sent !!!");
          }
        }
      );
      // let jid = udpArray.findIndex((f) => f.CT === `JA003`);
      if (u_data["CT"] === "JA003") {
        server.send(
          JSON.stringify({
            message_id: 1901,
            message_text: {
              ...u_data,
              SP: 1,
              HA: 0,
              TGT_LA: u_data["LA"],
              TGT_LO: u_data["LO"],
              WID: 1,
              WN: "JAM1_1",
              WT: "JAMMER",
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
              WN: "CD_11",
              WT: "CDRONE",
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
    }, 250);
  }
});

// emits when socket is ready and listening for datagram msgs
server.on("listening", function () {
  var address = server.address();
  var port = address.port;
  var family = address.family;
  var ipaddr = address.address;
  console.log("Server is listening at port " + port);
  console.log("Server ip :" + ipaddr);
  console.log("Server is IP4/IP6 : " + family);
});

// emits after the socket is closed using socket.close();
server.on("close", function () {
  console.log("Socket is closed !");
});

server.bind(7000, "0.0.0.0");
