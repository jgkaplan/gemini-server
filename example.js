const fs = require('fs');
const gemini = require('./index.js');

const options = {
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
};

const app = gemini(options);

app.on('/', (req, res) => {
  res.file('test.gemini');
});

app.on('/input', (req, res) => {
  if(req.query){
    res.data('you typed ' + req.query);
  }else{
    res.input('type something');
  }
});

// app.on('*', (req, res) => {
//   res.data('nyaa');
// });

app.listen(() => {
  console.log("Listening...");
});
