require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cors());

// mongoose
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

// Create a Model
const urlSchema  =  new mongoose.Schema({ 
  original:  {type: String}
});
urlSchema.plugin(AutoIncrement, {inc_field: 'short'});

let Url =  mongoose.model('Url', urlSchema);
 
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl/new', function(req, res) {
  let urlVal = req.body.url;
  //check if input url follow the valid http://www.example.com format
  const UrlRegexp =  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  if(UrlRegexp.test(urlVal)) { 
    const urlLengthMinusOne = urlVal.length-1;
    if(urlVal[urlLengthMinusOne] === "/") urlVal = urlVal.substr(0, urlLengthMinusOne);
    // check if the url is a valid hostname
    const addr = new URL(urlVal);
    const host = addr.host;
    dns.lookup(host, (err, address, family) => {
      if(err && err.code === 'ENOTFOUND'){ // url not found
        res.json({"error": 'invalid Hostname'});
      } else {
        // check if the url is registered before
        Url.findOne({original: urlVal}, (err, data) => {
          if(data) {
            res.json({"original_url": data.original, "short_url": data.short})
          } else {
            const url = new Url({original: urlVal});
            url.save((err, d) => {
              if(err) console.log(err);
              if(d) res.json({"original_url" : urlVal, "short_url": d.short});
            });
          }
        });
      }
    });
  } else {
    res.json({"error": 'invalid url'});
  }
});

app.get('/api/shorturl/:shorturl', function(req, res) {
  console.log(req.params.shorturl);
  Url.findOne({short: parseInt(req.params.shorturl)}, (err, data) => { 
    if(err) console.log(err);
    if(data) {
      res.redirect(data.original);
    } else {
      res.json({"error":"No short URL found for the given input"});
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
