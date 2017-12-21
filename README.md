# SAML SP with OIDC Slient Authentication

## Overview

This sample is a simple SAML Service Provider using Auth0 as an IDP. After logging into the Service Provider it allows the end user to use OIDC [silent authentication](https://auth0.com/docs/api-auth/tutorials/silent-authentication) to get an `access_token` in the frontend which can be used to fetch the user profile and call their own API.

## How it works

Essentially we're embedding a frontend (JavaScript-based) client within the HTML that's being rendered by the SAML SP. It's that frontend client that's making calls to an API, and not the server-side SP. Therefore the server-based SAML SP and the frontend client are technically separate apps. For this reason, Auth0 is configured with separate clients so they can be configured independently.

## Setup

### SAML SP App setup in Auth0

1. Go to [Clients tab](https://manage.auth0.com/#/clients) in the Auth0 Dashboard and create a new **Regular Web Application** client with the name `SAML SP App`
1. Go to **Settings**
1. Make a note of the **Client ID** of the client
1. Add the following to the **Allowed Logout URLs**:

   ```
   http://sp.myapp.local:5000/
   ```

1. Click on **Addons** and enable **SAML2 Web App**
1. Set the **Application Callback URL** to: `http://sp.myapp.local:5000/assert`
1. Under **Settings** add:

    ```json
    {
      "audience": "http://sp.myapp.local/metadata.xml",
      "recipient": "http://sp.myapp.local/assert",
      "nameIdentifierFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
      "nameIdentifierProbes": [
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ],
      "signatureAlgorithm": "rsa-sha256"
    }
    ```

    and save the settings

1. Under **Connnections** enable `Username-Password-Authentication` as a connection for the client
1. Under the **SAML2 Web App** addon go to Usage and download the IDP certificate for your account

### Frontend App setup in Auth0

1. Create a new **Single Page Web Application** client in Auth0 with the name `Frontend App`
1. Go to **Settings**
1. Make a note of the **Client ID** of the client
1. Under the **Settings** tab, set the  **Allowed Callback URLs** to: `http://sp.myapp.local:5000/`
1. Also set the **Allowed Web Origins** to: `http://sp.myapp.local:5000` (← Notice no trailing `/` at the end)

### API setup in Auth0

> NOTE: An API is setup in Auth0 just to show how we can generate an `access_token` for it. The sample doesn't actually stand up an actual backend service that would consume the token. However it does use the token to call the Auth0 OIDC `/userinfo` endpoint.

1. Go to [APIs tab](https://manage.auth0.com/#/apis)
1. Create a new API with following settings
   - Name: `My API`
   - Identifier: `urn:gateway:api`
   - Allow Skipping User Consent: true
   - Signing Algorithm: RS256
   - Scopes: `read:foo`

1. Add the following scope to the API:
   - Name: `read:foo`
   - Description: `Read your foo`

### Local Setup

1. Clone this repo

1. Copy the IDP certificate file you downloaded under [Auth0 IDP Setup](#auth0-) Step 7 to the root folder of the app and rename it to `idp.pem`

1. Add a hosts file entry into your computer: 

    ```
    127.0.0.1       sp.myapp.local
    ```

1. Run the following command to install all the dependencies:

    ```bash
    npm install
    ```

1. Create a local `.env` file with the following values:

    ```
    SP_DOMAIN=sp.myapp.local
    AUTH0_DOMAIN=your-account.auth0.com
    AUTH0_SP_CLIENT_ID=client_id-of-SAML-SP-App
    AUTH0_FRONTEND_CLIENT_ID=client_id-of-Frontend-App
    API_AUDIENCE=urn:gateway:api
    ```

## Run

1. Run the node application by running:

    ```bash
    npm start
    ```

1. Open your browser and go to: http://sp.myapp.local:5000/
1. Click the "Login with SAML" button
1. It redirects to auth0 for login and you can enter a username/password from the connection you activated for this app
1. On sign in the SAML assertion is posted to: http://sp.myapp.local:5000/assert 
1. On this page you can click on the button and get a token for your API

---

## What is Auth0?

Auth0 helps you to:

* Add authentication with [multiple authentication sources](https://docs.auth0.com/identityproviders), either social like **Google, Facebook, Microsoft Account, LinkedIn, GitHub, Twitter, Box, Salesforce, amont others**, or enterprise identity systems like **Windows Azure AD, Google Apps, Active Directory, ADFS or any SAML Identity Provider**.
* Add authentication through more traditional **[username/password databases](https://docs.auth0.com/mysql-connection-tutorial)**.
* Add support for **[linking different user accounts](https://docs.auth0.com/link-accounts)** with the same user.
* Support for generating signed [Json Web Tokens](https://docs.auth0.com/jwt) to call your APIs and **flow the user identity** securely.
* Analytics of how, when and where users are logging in.
* Pull data from other sources and add it to the user profile, through [JavaScript rules](https://docs.auth0.com/rules).

## Create a free account in Auth0

1. Go to [Auth0](https://auth0.com) and click Sign Up.
2. Use Google, GitHub or Microsoft Account to login.

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE.txt) file for more info.
