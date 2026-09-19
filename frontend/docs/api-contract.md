# API Contract

## 1. Login

POST /auth/login

Request:
- email
- password

Response:
- token
- refreshToken
- role
- user: id, nickname, avatar

## 2. Register

POST /auth/register

Request:
- email
- password

Response: same as login

## 3. Logout

POST /auth/logout

Response: success

## 4. Current User

GET /users/me

Response:
- id
- nickname
- avatar
- school
- college
- major
- tradeCount
- rating
- creditLevel

## 5. Error Codes

- 401 Unauthorized
- 403 Forbidden
- 400 Bad Request