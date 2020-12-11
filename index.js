var express = require("express");
var fs = require("fs");
const keccak256 = require('keccak256');
var app = express();

var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("src"));
app.use(express.static("../certiqo-contract/build/contracts"));

app.get("/", function (req, res) {
  res.render("index.html");
});

app.post("/drugDetails", function (req, res) {
  var contents = fs.readFileSync("db/drugs.json");
  var cursor = JSON.parse(contents);
  var _ndc = req.body.ndc;
  var desc = cursor[_ndc];
  res.send(desc);
});

app.post("/updateDB", function (req, res) {
  var contents = fs.readFileSync("db/drugs.json");
  var cursor = JSON.parse(contents);
  var _ndc = req.body.data.ndc;
  cursor[_ndc] = req.body.data;
  const content = JSON.stringify(cursor);
  fs.writeFileSync('db/drugs.json', content);
  res.send("success");
});

app.get("/currentHash", function (req, res) {   // Retrieveing currentHash
  var contents = fs.readFileSync("db/drugs.json");
  var _khash = "0x" + keccak256(contents).toString('hex');
  res.send(_khash);
});



app.listen(3000, function () {
  console.log("Certiqo Dapp listening on port 3000!");
  var contents = fs.readFileSync("db/drugs.json");
  var _khash = "0x" + keccak256(contents).toString('hex');
  console.log("Current hash: ", _khash)
});
