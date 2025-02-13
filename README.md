# ui5node-hanaembedding
ui5 poc ux for hana embedding, direct api call hardcoded for now.

quick poc
- npm install
- to run locally: node app.js
- cf login
- cf push ui5node-poc-embedding -k 256MB -m 256MB
- cf set-env ui5node-poc-embedding PY_ENDPOINT https://indb-embedding.cfapps.eu12.hana.ondemand.com
- cf restart ui5node-poc-embedding

todo
- decouple env variables
- covert to cap if needed, else works fine with standalone custom ui5 app

note:
- [done] api is directly hardcoded for testing purpose with code generated from api clients (postman/bruno)