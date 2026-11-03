# Assessment One - Authentication API

A role-based authentication and user management API built with NestJS, TypeScript, PostgreSQL, TypeORM, and JWT.

This project supports registration, login, refresh tokens, profile access, and admin-only user moderation workflows.

## Features

- JWT authentication with short-lived access tokens and refresh tokens
- Role-based authorization for admin-only actions
- User lifecycle management with statuses (active, inactive, suspended, pending approval)
- Auto-approval rules based on role during registration
- Refresh token persistence and rotation support
- PostgreSQL integration via TypeORM
- DTO-based request validation

## Tech Stack

- NestJS 11
- TypeScript 5
- PostgreSQL
- TypeORM
- JWT
- bcrypt
- class-validator

## Project Structure

```text
src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   ├── signup.dto.ts
│   │   └── update-user-status.dto.ts
│   └── entities/
│       ├── user.entity.ts
│       └── refresh-token.entity.ts
├── config/
│   └── config.ts
├── decorators/
│   └── roles.decorator.ts
└── guards/
    ├── authentication.guard.ts
    └── role.guard.ts
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+ (or compatible)

### Installation

1. Clone the repository and enter the project directory.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
PORT=3000

JWT_SECRET=replace-with-a-strong-secret

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=assessment_one
```

4. Make sure PostgreSQL is running and the database exists.

5. Start the API in development mode:

```bash
npm run start:dev
```

6. API base URL:

```text
http://localhost:3000
```

## Authentication and Authorization Flow

- Registration defaults role to `student` when role is not provided.
- Newly registered `student` and `intern` users are created as `pending_approval`.
- `admin` and `tutor` users are created as `active`.
- Users with `pending_approval`, `inactive`, or `suspended` status cannot log in.
- Access token lifetime: 5 minutes.
- Refresh token lifetime: 3 days.

## API Endpoints

Base route: `/auth`

### Public endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

### Authenticated endpoint

- `GET /auth/profile`

### Admin-only endpoints

- `GET /auth/pending-users`
- `GET /auth/all-users`
- `PUT /auth/update-status`
- `GET /auth/users-by-role/:role`

### Example request payloads

Register:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password1",
  "role": "student",
  "phone": "+256700000000"
}
```

Login:

```json
{
  "email": "jane@example.com",
  "password": "password1"
}
```

Refresh token:

```json
{
  "refreshToken": "<your-refresh-token>"
}
```

Update user status (admin only):

```json
{
  "email": "jane@example.com",
  "status": "active"
}
```

## Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in watch mode

## Testing

Run unit tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

Run coverage:

```bash
npm run test:cov
```

## 5 minute video explaining codebase

https://youtu.be/xy0oMTq1cd8

## License

UNLICENSED
