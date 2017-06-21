require('dotenv').config();
var saml2 = require('saml2-js');
var fs = require('fs');
var express = require('express');
var app = express();
var ejs = require('ejs');
var morgan = require('morgan');
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

app.use(morgan('dev'));

function hereDoc(f) {
  return f.toString().
    replace(/^[^\/]+\/\*!?/, '').
    replace(/\*\/[^\/]+$/, '');
}

// parse application/json
app.use(bodyParser.json())
https = require('https');
// https = require('https');
// Create service provider
var sp_options = {
  entity_id: "https://" + process.env.SP_DOMAIN + "/metadata.xml",
  private_key: fs.readFileSync("./certs/sp.pem").toString(),
  certificate: fs.readFileSync("./certs/sp.crt").toString(),
  assert_endpoint: "https://" + process.env.SP_DOMAIN + "/assert"
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
var idp_options = {
  sso_login_url: "https://" + process.env.AUTH0_DOMAIN + "/samlp/" + process.env.AUTH0_CLIENT_ID,
  sso_logout_url: "https://" + process.env.AUTH0_DOMAIN + "/samlp/" + process.env.AUTH0_CLIENT_ID + "/logout",
  certificates: [fs.readFileSync("./certs/idp.pem").toString()]
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata.xml", function(req, res) {
    console.log(req);
  res.type('application/xml');
  res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function(req, res) {
  sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    res.redirect(login_url);
  });
});

// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
    console.log(req);
  var options = {request_body: req.body, allow_unencrypted_assertion : true, require_session_index : false};
  sp.post_assert(idp, options, function(err, saml_response) {
      console.log(saml_response);
    if (err != null) {
        console.log(err);
      return res.status(500).json(err);
    }

    // Save name_id and session_index for logout
    // Note:  In practice these should be saved in the user session, not globally.

    var name_id = saml_response.user.name_id;
    var session_index = saml_response.user.session_index;
    var name = saml_response.user.name;
    var email = saml_response.user.email;

    res.header('Content-Type', 'text/html');
    res.end(ejs.render(hereDoc(assertForm), {
      nameid: saml_response.user.name_id,
      sessionIndex: session_index,
      name: name,
      email: email,
      sp_domain: process.env.SP_DOMAIN,
      auth0_client_id: process.env.AUTH0_CLIENT_ID,
      auth0_domain: process.env.AUTH0_DOMAIN,
      api_audience: process.env.API_AUDIENCE          
    }));

  });
});

// Starting point for logout
app.get("/logout", function(req, res) {
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

app.get("/silentauth-callback",function(req,res) {

  res.header('Content-Type', 'text/html');
  res.end(ejs.render(hereDoc(silentAuthCallback), {
    sp_domain : process.env.SP_DOMAIN,
    auth0_client_id: process.env.AUTH0_CLIENT_ID,
    auth0_domain: process.env.AUTH0_DOMAIN,
    api_audience: process.env.API_AUDIENCE          
  }));

});

// app.listen(5000, function () {
//   console.log("Express server listening on port 5000");
// });

var secureServer = https.createServer({
    key: fs.readFileSync('./certs/server.key'),
    cert: fs.readFileSync('./certs/server.crt'),
    ca: fs.readFileSync('./certs/ca.crt'),
    requestCert: true,
    rejectUnauthorized: false
}, app).listen('443', function() {
    console.log("Secure Express server listening on port 443");
});


function assertForm() {
  /*

<!DOCTYPE html>
<html>
<head>
    <title>SAML SP and Silent Authentication Example</title>
    <link rel="stylesheet" type="text/css" href="//cdn.auth0.com/styleguide/1/index.css">

    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
    <script src="https://cdn.auth0.com/js/auth0/8.7/auth0.min.js"></script>
    <script type="text/javascript">
        var webAuth = new auth0.WebAuth({
            domain:       '<%-auth0_domain%>',
            clientID:     '<%-auth0_client_id%>',
        });

        // OAuth2 callback redirect?
        webAuth.parseHash(window.location.hash, function(err, data) {
          if (err) {
            return alert('error parsing the hash: ' + JSON.stringify(err));
          }

          if (data) {
            window.localStorage.setItem('com.pushp.auth.accessToken', data.accessToken);
            webAuth.client.userInfo(authResult.accessToken, function(err, user) {
              if (err) {
                return alert('error fetching profile: ' + JSON.stringify(err));
              }

              console.log(profile);
              alert('hello ' + profile.name);          
            });
          }
        });
    </script>

</head>
<body class="container">
 
    <div class="row">
            <div class="col-xs-12">
            <h4>Hi <%-email%>, Your SAML session Index: <%-sessionIndex%> and your name_id: <%-nameid%></h4>
            <input type="button" class="silentauth-user" value="Get Token for calling API" />
            <br/>
            <label for='token'>Access Token</label>
            <p class='token' id='token'></p>
            <script type="text/javascript">
                $('.silentauth-user').click(function (e) {
                    e.preventDefault();
                      var nonce = + new Date()
                      var str = nonce + "";
                      window.localStorage.setItem('com.pushp.auth.nonce', str);
                    webAuth.renewAuth({
                        scope: 'openid profile',
                        audience: '<%-api_audience%>',
                        state: 'daddy',
                        nonce: str,
                        usePostMessage: true, 
                        redirectUri: 'https://<%-sp_domain%>/silentauth-callback'
                      }, function(err, result){
                          console.log(result);
                        if (err) {
                            alert("something went wrong: " + (err.message || err.error));
                            if (err.error === 'login_required')  $('.login').click();
                            return;
                        }
                        $('.token').text(result.accessToken);
                        window.localStorage.setItem('com.pushp.auth.accessToken', result.accessToken);
                        webAuth.client.userInfo(result.accessToken, function (err, profile) {
                          if (err) {
                            return alert('error fetching profile: ' + JSON.stringify(err));
                          }
                          alert('hello, ' + profile.name + ', you were authenticated silently.');
                        });
                    });
                });
            </script>
        </div>
   
        <div class="col-xs-6">
            <h2>Logout</h2>
            <input type="button" class="logout-user" value="logout" />
            <script type="text/javascript">
                $('.logout-user').click(function (e) {
                    e.preventDefault();
                    window.localStorage.removeItem('com.pushp.auth.accessToken');
                    webAuth.logout({client_id:'<%-auth0_client_id%>', returnTo: 'https://<%-sp_domain%>/login', federate: true});
                });
            </script>
        </div>
        
      </div>

</body>
</html>

  */
}



function silentAuthCallback() {
  /*
<!DOCTYPE html>
<html>
  <head>

    <script src="https://cdn.auth0.com/js/auth0/8.7/auth0.min.js"></script>
    <script>
      var webAuth = new auth0.WebAuth({
        domain:       '<%-auth0_domain%>',
        clientID:     '<%-auth0_client_id%>'
      });
      webAuth.parseHash(window.location.hash, function(err, data) {
        parent.postMessage(err || data, "https://<%-sp_domain%>/assert");
      });
    </script>
  </head>
  <body></body>
</html>

  */
}
