const fs = require("fs");
const gemini = require("./index.js");

const options = {
  cert: fs.readFileSync("cert.pem"),
  key: fs.readFileSync("key.pem"),
};

const app = gemini(options);

app.use((req, res, next) => {
  console.log("Handling path", req.path);
  next();
});

app.on("/", (req, res) => {
  res.file("test.gemini");
});

app.on("/input", (req, res) => {
  if (req.query) {
    res.data("you typed " + req.query);
  } else {
    res.input("type something");
  }
});

app.on("/paramTest/:foo", (req, res) => {
  res.data("you went to " + req.params.foo);
});

app.on("/async", (req, res) => {
  if (req.query) {
    setTimeout(function () {
      res.data("you typed " + req.query);
    }, 500);
  } else {
    res.input("type something");
  }
});

app.on(
  "/testMiddleware",
  gemini.requireInput("enter something"),
  (req, res) => {
    res.data("thanks. you typed " + req.query);
  },
);

app.on("/other", (req, res) => {
  res.data("welcome to the other page");
});

// app.on("/test", gemini.static("./src/things"));

app.on("/redirectMe", gemini.redirect("/other"));

app.on("/cert", (req, res) => {
  if (!req.fingerprint) {
    res.certify();
  } else {
    res.data("thanks for the cert");
  }
});

app.on("/protected", gemini.requireCert, (req, res) => {
  res.data("only clients with certificates can get here");
});

// app.on("*", (req, res) => {
//   res.data("nyaa");
// });

app.listen(() => {
  console.log("Listening...");
});
