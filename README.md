# SAML SP with OIDC Slient Authentication

This is an example of a simple SAML Service Provider using Auth0 as an IDP. After logging into the Service Provider it allows the end user to use OIDC silent authentication to get an `access_token` which can be used to fetch the user profile and call their own API.

## Setup

### Auth0 (IDP) Setup

1. Go to [Clients tab](https://manage.auth0.com/#/clients) in the Auth0 Dashboard and create a new client
2. Make a note of the `client_id` of the client
3. Click on **Addons** and enable **SAML2 Web App**
4. Set the **Application Callback URL** to: `http://sp.myapp.local:5000/assert`
5. Under **Settings** add:
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

6. Under **Connnections** enable `Username-Password-Authentication` as a connection for the client

7. Under the **SAML2 Web App** addon go to Usage and download the IDP certificate for your account

8. Go back to the Client's **Settings** tab and add the following to the **Allowed Callback URLs**:
   ```
   http://sp.myapp.local:5000/silentauth-callback
   ```

9. Then add the following to the **Allowed Logout URLs**:
   ```
   http://sp.myapp.local:5000/
   ```

### Create a new Resource Server within Auth0

1. Go to https://manage.auth0.com/#/apis

2. Create a new API with following settings
   - Identifier : `urn:gateway:api`
   - Allow Skipping User Consent: true
   - Signing Algorithm: RS256
   - Scopes: `read:foo`

3. Add the following scope to the API:
   - Name: `read:foo`
   - Description: `Read your foo`

### Service Provider Setup

1. Clone this repo

2. Copy the IDP certificate file you downloaded under [Auth0 IDP Setup](#auth0-) Step 7 to the root folder of the app and rename it to `idp.pem`

3. Add a hosts file entry into your computer: 

    ```
    127.0.0.1       sp.myapp.local
    ```

4. Run the following command to install all the dependencies:

    ```bash
    npm install
    ```

5. Create a local `.env` file with the following values:

    ```
    SP_DOMAIN=sp.myapp.local
    AUTH0_DOMAIN=your-account.auth0.com
    AUTH0_CLIENT_ID=client_id-from-step-2
    API_AUDIENCE=urn:gateway:api
    ```

## Run

1. Run the node application by running:

    ```bash
    npm start
    ```

2. Open your browser and go to: http://sp.myapp.local:5000/

3. It redirects to auth0 for login and you can enter a username/password from the connection you activated for this app

4. On sign in the SAML assertion is posted to: http://sp.myapp.local:5000/assert 

5. On this page you can click on the button and get a token for your API
