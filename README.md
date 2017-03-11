# samlsp
- This is an example of a simple Service Provider using Auth0 as an IDP. After logging into the Service Provider it allows the end user to use silent authentication to get an access_token to call their back end api.

## Setup

###Auth0 ( IDP) Setup

1. Go to https://manage.auth0.com/#/clients and Create a new client for regular web app
2. Click on addons and enable SAML2 Web App
3. Put the Assertion Consumption Service Url - https://sp.pushp.com/assert
4. Under settings add:
```
{
  "audience": "https://sp.pushp.com/metadata.xml",
  "recipient": "https://sp.pushp.com/assert",
  "nameIdentifierFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
  "nameIdentifierProbes": [
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
  ],
  "signatureAlgorithm": "rsa-sha256"
}
```


5. Enable Username-Password-Authentication as a connection for the Application

6. Make a note of the client_id of this Application - ***

7. Under SAML2 Web App go to Usage and download the idp certificate - ***

8. Go back to the Client's settings page and add 
  - https://sp.pushp.com/silentauth-callback as another callback url
  - https://sp.pushp.com/login as an allowed logout url
  - https://sp.pushp.com/silentauth-callback under Allowed Origins




###Create a new Resource Server within Auth0

1. Go to https://manage.auth0.com/#/apis
2. Create a new API with following settings
  - Identifier : urn:gateway:api
  - Allow Skipping User Consent : true
  - Signing Algorithm - RS256

3. Copy the Identifier - urn:gateway:api


###Service Provider Setup


1. Clone the repository from https://github.com/pushpabrol/samlsp


2. Copy the ipd certificate file you downloaded under `Auth0 IDP Setup - Step 7` and paste it in the certs folder and rename it as idp.pem

3. Add a hosts file entry into your computer - `127.0.0.1       sp.pushp.com`

4. In the folder run - `npm install` - this will install all the dependencies

5. Open index.js in an editor and set the top 4 variables
```
var sp_domain = 'sp.pushp.com';
var auth0_client_id = "client_id of the application in Auth0";
var auth0_domain = "<auth0_domain>";
var api_audience = "<audience of the api - example urn:gateway:api >";
```

6. Save the file

7. run the node application by running `sudo node index.js` 
  - sudo just so as to run the application on port 443


8. Open your browser and go to https://sp.pushp.com/login

9. It redirects to auth0 for login and you can enter a username/password from the connection you activated for this app

10. On sign in the saml assertion is posted to https://sp.pushp.com/assert 

11. On this page you can click on the button and get a token for your API Gateway


** Note there are a few certificates created in the certs folder within the sample and they are to allow hosting the SP site on https. You can add the ca certs and the server certs to your truted certs store or keychain to allow chrome loading the website without a ssl warning...
