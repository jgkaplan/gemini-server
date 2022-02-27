import { readFileSync } from "fs";
import gemini, { Request, Response } from "./index";

const options = {
  cert: readFileSync("cert.pem"),
  key: readFileSync("key.pem"),
};

const app = gemini(options);

app.use((req: Request, _res: Response, next: () => void) => {
  console.log("Handling path", req.path);
  next();
});

app.on("/", (_req: Request, res: Response) => {
  res.file("test.gemini");
});

app.on("/input", (req: Request, res: Response) => {
  if (req.query) {
    res.data("you typed " + req.query);
  } else {
    res.input("type something");
  }
});

app.on("/paramTest/:foo", (req: Request, res: Response) => {
  res.data("you went to " + req.params.foo);
});

app.on("/async", (req: Request, res: Response) => {
  if (req.query) {
    setTimeout(function () {
      res.data("you typed " + req.query);
    }, 500);
  } else {
    res.input("type something");
  }
});

app.on(
  "/testMiddlewear",
  gemini.requireInput("enter something"),
  (req: Request, res: Response) => {
    res.data("thanks. you typed " + req.query);
  },
);

app.on("/other", (_req: Request, res: Response) => {
  res.data("welcome to the other page");
});

// app.on("/test", gemini.static("./src/things"));

app.on("/redirectMe", gemini.redirect("/other"));

app.on("/cert", (req: Request, res: Response) => {
  if (!req.fingerprint) {
    res.certify();
  } else {
    res.data("thanks for the cert");
  }
});

app.on("/protected", gemini.requireCert, (_req: Request, res: Response) => {
  res.data("only clients with certificates can get here");
});

// app.on("*", (req, res) => {
//   res.data("nyaa");
// });

app.listen(() => {
  console.log("Listening...");
});
