# ImmuDB Node.js TypeScript CRUD Application

A comprehensive CRUD application using ImmuDB (immutable database) with Node.js, TypeScript, and Express.

## Features

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ SQL-based operations with ImmuDB
- ✅ Cryptographic verification and tamper-proof data
- ✅ Docker containerization
- ✅ Environment variable configuration
- ✅ TypeScript support
- ✅ Time travel queries (historical data access)

## Environment Variables

The application uses the following environment variables:

```env
IMMUDB_ADDR=immudb:3322
IMMUDB_USER=immudb
IMMUDB_PASSWORD=immudb
PORT=3000
DB_NAME=mydb
```

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and navigate to the project directory**
2. **Start the services:**
   ```bash
   docker-compose up --build
   ```

This will start:
- ImmuDB server on port 3322
- Node.js application on port 3000
- ImmuDB Web Console on port 9497

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start ImmuDB server:**
   ```bash
   docker run -it --rm -p 3322:3322 -p 9497:9497 --name immudb codenotary/immudb:latest
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

## API Documentation

### Interactive API Documentation (Swagger UI)

The API includes comprehensive interactive documentation powered by Swagger UI:

- **URL:** http://localhost:3000/api-docs
- **Root URL:** http://localhost:3000 (redirects to API docs)

The Swagger documentation includes:
- Complete API endpoint documentation
- Request/response schemas
- Interactive testing interface
- Example requests and responses
- Tamper-proof verification details

### API Endpoints

#### Create User
```http
POST /users
Content-Type: application/json

{
  "id": "user123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### Get User
```http
GET /users/{id}
```

#### Get All Users
```http
GET /users
```

#### Update User
```http
PUT /users/{id}
Content-Type: application/json

{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

#### Get Historical User Data
```http
GET /users/{id}/history/{txId}
```

#### Health Check
```http
GET /health
```

## Database Viewing Options

### 1. ImmuDB Web Console (Recommended)
- **URL:** http://localhost:9497
- **Features:** 
  - SQL query interface
  - Database browsing
  - Transaction history
  - Visual data exploration

### 2. ImmuAdmin CLI
Install and use the ImmuAdmin command-line tool:
```bash
# Download immuadmin
curl -L https://github.com/codenotary/immudb/releases/latest/download/immuadmin-v1.9DOM.0-linux-amd64 -o immuadmin
chmod +x immuadmin

# Connect to database
./immuadmin login immudb --password immudb

# Execute SQL queries
./immuadmin exec "SELECT * FROM users;"
```

### 3. Direct SQL Queries via API
You can create a debug endpoint to execute custom SQL queries:

```javascript
// Add this endpoint for development
app.post('/debug/sql', async (req, res) => {
  try {
    const { sql } = req.body;
    const result = await crudService.client.SQLQuery({ sql });
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### 4. Database Schema
The application creates a `users` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR[64] PRIMARY KEY,
  name VARCHAR[100],
  email VARCHAR[100],
  created_at TIMESTAMP,
  INDEX ON name,
  INDEX ON email
)
```

## Example Usage

### 1. Create a User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user001",
    "name": "Alice Johnson",
    "email": "alice@example.com"
  }'
```

### 2. Get All Users
```bash
curl http://localhost:3000/users
```

### 3. Update User
```bash
curl -X PUT http://localhost:3000/users/user001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Smith",
    "email": "alice.smith@example.com"
  }'
```

## ImmuDB Features Demonstrated

### 1. Tamper-Proof Storage
Every operation returns cryptographic proof of data integrity:

```json
{
  "success": true,
  "user": {...},
  "tamperProof": {
    "verified": true,
    "transactionId": "123",
    "cryptographicProof": true
  }
}
```

### 2. Time Travel Queries
Access historical states of data before specific transactions:

```bash
curl http://localhost:3000/users/user001/history/100
```

### 3. Audit Trail
All changes are permanently recorded and can be queried through transaction IDs.

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start development server
- `npm run start:prod` - Start production server

### Project Structure

```
├── src/
│   └── index.ts          # Main application file
├── docker-compose.yml    # Docker services configuration
├── Dockerfile           # Application container
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── .env                 # Environment variables
```

## Troubleshooting

### Common Issues

1. **Connection refused to ImmuDB:**
   - Ensure ImmuDB container is running
   - Check if port 3322 is accessible
   - Verify environment variables

2. **Permission denied:**
   - Check Docker daemon is running
   - Ensure proper file permissions

3. **Database connection timeout:**
   - Wait for ImmuDB to fully initialize (may take 30-60 seconds)
   - Check logs: `docker-compose logs immudb`

### Useful Commands

```bash
# View application logs
docker-compose logs app

# View ImmuDB logs
docker-compose logs immudb

# Connect to ImmuDB container
docker exec -it immudb immuadmin login immudb

# Reset database
docker-compose down -v && docker-compose up
```

## Production Considerations

1. **Security:**
   - Change default passwords
   - Use secure connection (TLS)
   - Implement proper authentication

2. **Performance:**
   - Configure appropriate indexes
   - Monitor transaction volume
   - Set up proper logging

3. **Backup:**
   - Regular database backups
   - Transaction log archival
   - Disaster recovery procedures

## License

This project is for demonstration purposes. Check ImmuDB licensing for production use.
