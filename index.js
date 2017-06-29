require('dotenv').config();
var saml2 = require('saml2-js');
var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();
var ejs = require('ejs');
var ejsLayouts = require('express-ejs-layouts');
var morgan = require('morgan');
var bodyParser = require('body-parser')

var PORT = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(morgan('dev'));

// static files
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(ejsLayouts);
app.set('layout extractScripts', true);

// parse application/json
app.use(bodyParser.json())

// Create service provider
var sp_options = {
  entity_id: 'http://' + process.env.SP_DOMAIN + ':' + PORT + '/metadata.xml',
  assert_endpoint: 'http://' + process.env.SP_DOMAIN + ':' + PORT + '/assert'
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
var idp_options = {
  sso_login_url: 'https://' + process.env.AUTH0_DOMAIN + '/samlp/' + process.env.AUTH0_CLIENT_ID,
  sso_logout_url: 'https://' + process.env.AUTH0_DOMAIN + '/samlp/' + process.env.AUTH0_CLIENT_ID + '/logout',
  certificates: [fs.readFileSync('./idp.pem').toString()]
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get('/metadata.xml', function(req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});

app.get('/', function (req, res) {
  res.render('index');
});

// Starting point for login
app.get('/login', function(req, res) {
  sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    res.redirect(login_url);
  });
});

// Assert endpoint for when login completes
app.post('/assert', function(req, res) {
  var options = {
    request_body: req.body, 
    allow_unencrypted_assertion : true, 
    require_session_index : false
  };
  sp.post_assert(idp, options, function(err, saml_response) {
    console.log('saml_response:', saml_response);

    if (err) {
      console.log('SAML post_assert error:', err);
      return res.status(500).json(err);
    }

    // Save name_id and session_index for logout
    // Note: In practice these should be saved in the user session, not globally.

    var name_id = saml_response.user.name_id;
    var session_index = saml_response.user.session_index;
    var name = saml_response.user.name;
    var email = saml_response.user.email;

    res.render('assert', { 
      auth0_domain: process.env.AUTH0_DOMAIN,
      auth0_client_id: process.env.AUTH0_CLIENT_ID,
      api_audience: process.env.API_AUDIENCE,          
      nameid: saml_response.user.name_id,
      sessionIndex: session_index,
      name: name,
      email: email,
      base_url: 'http://' + process.env.SP_DOMAIN + ':' + PORT
    });
  });
});

// Starting point for logout
app.get('/logout', function(req, res) {
  var options = {
    name_id: name_id,
    session_index: session_index
  };

  sp.create_logout_request_url(idp, options, function(err, logout_url) {
    if (err != null)
      return res.send(500);
    res.redirect(logout_url);
  });
});

app.get('/silentauth-callback', function(req,res) {
  res.render('silentauth-callback', { 
    base_url: 'http://' + process.env.SP_DOMAIN + ':' + PORT
  });
});

app.listen(PORT, function() {
  console.log('SP server, listening on port', PORT);
});
