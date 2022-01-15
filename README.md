# Gemini Server

This is a server framework in Node.js for the
[Gemini Protocol](https://gemini.circumlunar.space/) based on Express.

TLS is a required part of the Gemini protocol. You can generate
keys/certificates using
`openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'`

## Install

`npm install gemini-server`

## Usage

### Create a gemini server

```javascript
const gemini = require("gemini-server");

const app = gemini(options);
```

where options is an object with the following properties:

cert: certificate file key: key file

### Handle a request to a route

This uses the express conventions, with the modification that the only method is
`on`.

```javascript
app.on(path, handler);
```

or

```javascript
app.on(path, ...middleware, handler);
```

Where `handler` is a function which takes in a `Request` and a `Response`, and
returns nothing. And `middleware` is 0 or more functions which take
`(req, res, next)` and return nothing. A middleware function should call
`next()` to continue onto the next function for handling. It should not call
`next` and should instead set the `res` object if it should return. NOTE:
middleware looks similar to express middleware, but isn't compatible.

Examples of path: `/` for the root of the site `/foo` `/foo/bar` `/user/:name`
`*`

Examples of handler: `function(req, res){ // do stuff }` general form
`gemini.static(dir)` serve a directory `gemini.redirect(url)` redirect to a url

Examples of middleware: `gemini.requireInput(prompt="Input requested")` Proceed
to handler only if user input is given, otherwise request input.

`gemini.requireCert` Proceed to handler only if user certificate is provided,
otherwise request a certificate.

### Static

NOTE: not yet implemented `gemini.static(dir)` will serve the files in a
directory

```javascript
app.on("/someFiles", gemini.static("src/files"));
```

### Redirect

`gemini.redirect(url)` will redirect to the specified url

```javascript
app.on("/redirectMe", gemini.redirect("/goingHereInstead"));

app.on("/redirectOther", gemini.redirect("http://example.com"));
```

### Request object

The request object is passed to request handlers. `req.url`The URL object of the
request `req.path`The path component of the url `req.query` The query component
of the url (used for handling input) `req.params` The params of a matched route
`req.cert` The certificate object, if the client sent one `req.fingerprint` The
fingerprint of the certificate object, if the client sent one

### Response object

The response object is passed to request handlers. Methods on it can be chained,
as each both returns and modifies the request object. `res.status(s)` Set the
status of the response (see the gemini docs). s is an int `res.getStatus()`
return the current status associated with the response

`res.file(filename)` serve the specified file

`res.data(d)` or `res.data(d, mimeType='text/plain')` Serve raw data as text, or
as whatever format you want if you specify the mime type.

`res.input(prompt, sensitive=false)` Prompt the client for input. Prompt should
be a string. `sensitive` defaults to false, and should be true if the input is
sensitive.

`res.certify(info="Please include a certificate.")` Request a certificate from
the client. Useful for sessions or login. Optional info message.

`res.redirect(url)` Redirect the client to the specified url.

### Middleware

A middleware registered through `app.use` will be executed before every route
handler. If a path is given as the first argument, only that path will be
affected.

```javascript
app.use((req, res, next) => {
  console.log(`Route ${req.path} was called`);
});
app.use("/foo", (req, res, next) => {
  console.log(`Foo route was called`);
});
```

## Example Server

```javascript
const fs = require("fs");
const gemini = require("gemini-server");

const options = {
  cert: fs.readFileSync("cert.pem"),
  key: fs.readFileSync("key.pem"),
};

//Create gemini instance with cert and key
const app = gemini(options);

//On a request to / serve a gemini file
//This automatically detects the mime type and sends that as a header
app.on("/", (req, res) => {
  res.file("test.gemini");
});

//Request input from the user
app.on("/input", (req, res) => {
  if (req.query) {
    res.data("you typed " + req.query);
  } else {
    res.input("type something");
  }
});

//Route params
app.on("/paramTest/:foo", (req, res) => {
  res.data("you went to " + req.params.foo);
});

app.on(
  "/testMiddlewear",
  gemini.requireInput("enter something"),
  (req, res) => {
    res.data("thanks. you typed " + req.query);
  },
);

app.on("/other", (req, res) => {
  res.data("welcome to the other page");
});

app.on("/test", gemini.static("./public/things"));

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

//start listening. Optionally specify port and callback
app.listen(() => {
  console.log("Listening...");
});
```

## Todo

- [x] Documentation
- [ ] Utility functions
  - [ ] Static directory serving
    - [ ] automatic index file
- [x] Certificates
- [x] Middleware support
- [ ] Session helper functions
- [ ] Router
- [ ] View engines
