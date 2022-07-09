const {readFileSync} = require('fs');
const gemini = require("../lib/index");

const options = {
  cert: readFileSync("cert.pem"),
  key: readFileSync("key.pem"),
  titanEnabled: true
};

const app = gemini(options);

app.use((req, res, next) => {
  console.log("Handling path", req.path);
  next();
});

app.on("/", (req, res) => {
  res.file("examplePages/test.gemini");
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

app.on("/async", async (req, res) => {
  if (req.query) {
      return new Promise(r => {
        setTimeout(r, 500);
      }).then(() => {
        res.data("you typed " + req.query);
      });
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

app.use("/static", gemini.serveStatic("./examplePages"));

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

app.titan("/titan", (req, res) => {
  console.log(req);
  res.data("Titan Data: \n" + req.data?.toString("utf-8"));
});

app.titan("/titanCert", gemini.requireCert, (req, res) => {
  res.data("You can use gemini middleware in a titan request");
});

app.on("/titan", (_req, res) => {
  res.data("not a titan request!");
});

app.use("/titan", (req, _res, next) => {
  console.log(req.constructor.name);
  next();
});

// app.on("*", (req, res) => {
//   res.data("nyaa");
// });
app.listen(() => {
  console.log("Listening...");
});
