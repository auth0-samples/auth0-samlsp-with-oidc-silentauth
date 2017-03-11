var sp_domain = 'sp.pushp.com';
var auth0_client_id = "T2muy88Sg93pi9Q7iCjx9JT1c62jPdid";
var auth0_domain = "pushp.auth0.com";
var api_audience = "http://mynodeapi";
var saml2 = require('saml2-js');
var fs = require('fs');
var express = require('express');
var app = express();
var ejs = require('ejs');
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

function hereDoc(f) {
  return f.toString().
    replace(/^[^\/]+\/\*!?/, '').
    replace(/\*\/[^\/]+$/, '');
}

// parse application/json
app.use(bodyParser.json())
https = require('https');
// Create service provider
var sp_options = {
  entity_id: "https://" + sp_domain + "/metadata.xml",
  private_key: fs.readFileSync("./certs/sp.pem").toString(),
  certificate: fs.readFileSync("./certs/sp.crt").toString(),
  assert_endpoint: "https://" + sp_domain + "/assert"
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
var idp_options = {
  sso_login_url: "https://" + auth0_domain + "/samlp/" + auth0_client_id,
  sso_logout_url: "https://" + auth0_domain + "/samlp/" + auth0_client_id + "/logout",
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
          sp_domain : sp_domain,
          auth0_client_id: auth0_client_id,
          auth0_domain: auth0_domain,
          api_audience: api_audience
          
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

app.get("/silentauth-callback",function(req,res){

          res.header('Content-Type', 'text/html');
          res.end(ejs.render(hereDoc(silentAuthCallback), {
          sp_domain : sp_domain,
          auth0_client_id: auth0_client_id,
          auth0_domain: auth0_domain,
          api_audience: api_audience
          
  }));

});

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
    <script src="https://cdn.auth0.com/w2/auth0-7.6.js"></script>
    <script type="text/javascript">
        var auth0 = new Auth0({
            domain:       '<%-auth0_domain%>',
            clientID:     '<%-auth0_client_id%>',
            callbackURL: 'https://<%-sp_domain%>/assert',
            responseType: 'token id_token'
        });

        // callback redirect?
        var result = auth0.parseHash(window.location.hash);
        console.log(result);
        if (result && result.accessToken) {
        window.localStorage.setItem('com.pushp.auth.accessToken', result.accessToken);
            auth0.getUserInfo(result.accessToken, function (err, profile) {
              window.location.hash = "";
              if (err) {
                return alert('error fetching profile: ' + JSON.stringify(err));
              }
              console.log(profile);
                alert('hello ' + profile.name);
            });
        } else if (result && result.error) {
          alert('error at login: ' + result.error)
        }

        // auth0.getSSOData(false, function(err, data){
        //     console.log(data);
        // });

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
                    auth0.silentAuthentication({
                    connection: 'Username-Password-Authentication',
                        scope: 'openid profile',
                        audience: '<%-api_audience%>',
                        state: 'daddy',
                        nonce: str,
                        usePostMessage:true, 
                        callbackURL:'https://<%-sp_domain%>/silentauth-callback'}, function(err, result){
                          console.log(result);
                        if (err) {
                            alert("something went wrong: " + (err.message || err.error));
                            if (err.error === 'login_required')  $('.login').click();
                            return;
                        }
                        $('.token').text(result.accessToken);
                        window.localStorage.setItem('com.pushp.auth.accessToken', result.accessToken);
                        auth0.getUserInfo(result.accessToken, function (err, profile) {
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
                    auth0.logout({client_id:'<%-auth0_client_id%>', returnTo: 'https://<%-sp_domain%>/login', federate: true});
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

    <script src="https://cdn.auth0.com/w2/auth0-7.6.min.js"></script>
    <script>
      var auth0 = new Auth0({
            domain:       '<%-auth0_domain%>',
            clientID:     '<%-auth0_client_id%>',
            responseType: 'token id_token'
      });
      var nonce = window.localStorage.getItem('com.pushp.auth.nonce');
      console.log(nonce);
      var result = auth0.parseHash(window.location.hash, {nonce: nonce});
      console.log(result);
      if (result) {
        parent.postMessage(result, "https://<%-sp_domain%>/assert"); 
      }
    </script>
  </head>
  <body></body>
</html>

  */
}