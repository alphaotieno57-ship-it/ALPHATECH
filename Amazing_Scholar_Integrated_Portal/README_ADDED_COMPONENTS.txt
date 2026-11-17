ADDED COMPONENTS

1. unit-catalog.js
   Contains the official programme/unit catalogue extracted from the supplied HTML, and exposes getSemesterUnits(courseName, semester).

2. amazing-scholar-backend/
   Node.js/Express backend implementing /api/data, /api/upload and /api/email-certificate. Certificate emails include a generated PDF attachment.
   See amazing-scholar-backend/README.md for setup and deployment instructions.

IMPORTANT
The backend is a starter implementation. The supplied HTML does not send authenticated session credentials to the API. Do not put real student information online until the backend and portal are protected by a proper authenticated access layer and role-based authorization. SMTP credentials and persistent hosting storage also need to be configured by the site owner.
