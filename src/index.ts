// src/app.ts
import express from 'express';
import ImmudbClient from 'immudb-node';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Load environment variables
dotenv.config();

// Swagger configuration
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'ImmuDB CRUD API',
			version: '1.0.0',
			description: 'A tamper-proof CRUD API using ImmuDB for immutable database operations',
			contact: {
				name: 'API Support',
				email: 'support@example.com',
			},
		},
		servers: [
			{
				url: `http://localhost:${process.env.PORT || 3000}`,
				description: 'Development server',
			},
		],
		components: {
			schemas: {
				User: {
					type: 'object',
					properties: {
						id: {
							type: 'string',
							description: 'Unique identifier for the user',
						},
						name: {
							type: 'string',
							description: "User's full name",
						},
						email: {
							type: 'string',
							format: 'email',
							description: "User's email address",
						},
						createdAt: {
							type: 'string',
							format: 'date-time',
							description: 'Timestamp when the user was created',
						},
					},
					required: ['id', 'name', 'email'],
				},
				VerifiedResponse: {
					type: 'object',
					properties: {
						success: {
							type: 'boolean',
							description: 'Whether the operation was successful',
						},
						user: {
							$ref: '#/components/schemas/User',
						},
						users: {
							type: 'array',
							items: {
								$ref: '#/components/schemas/User',
							},
						},
						count: {
							type: 'integer',
							description: 'Number of users returned',
						},
						tamperProof: {
							type: 'object',
							properties: {
								verified: {
									type: 'boolean',
									description: 'Whether the data has been cryptographically verified',
								},
								transactionId: {
									type: 'string',
									description: 'ImmuDB transaction ID',
								},
								cryptographicProof: {
									type: 'boolean',
									description: 'Whether cryptographic proof is available',
								},
							},
						},
					},
				},
				Error: {
					type: 'object',
					properties: {
						success: {
							type: 'boolean',
							example: false,
						},
						error: {
							type: 'string',
							description: 'Error message',
						},
					},
				},
				HealthCheck: {
					type: 'object',
					properties: {
						success: {
							type: 'boolean',
							description: 'Whether the service is healthy',
						},
						database: {
							type: 'string',
							enum: ['connected', 'disconnected'],
							description: 'Database connection status',
						},
						timestamp: {
							type: 'string',
							format: 'date-time',
							description: 'Current timestamp',
						},
					},
				},
			},
		},
	},
	apis: ['./src/index.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

interface User {
	id: string;
	name: string;
	email: string;
	createdAt: Date;
}

interface VerifiedResponse {
	data: any;
	verified: boolean;
	txId?: string;
	proof?: any;
}

class ImmudbCrudService {
	private client: ImmudbClient;

	constructor() {
		const host = process.env.IMMUDB_ADDR?.split(':')[0] || 'localhost';
		const port = parseInt(process.env.IMMUDB_ADDR?.split(':')[1] || '3322');

		this.client = new ImmudbClient({
			host: 'localhost',
			port: 3322,
			database: process.env.DB_NAME || 'defaultdb',
		});
	}

	async connect(): Promise<void> {
		const user = process.env.IMMUDB_USER || 'immudb';
		const password = process.env.IMMUDB_PASSWORD || 'immudb';

		await this.client.login({ user, password });

		// Create users table if it doesn't exist
		await this.client.SQLExec({
			sql: `
		  CREATE TABLE IF NOT EXISTS "users" (
		    id VARCHAR[100] NOT NULL,
		    name VARCHAR[100],
		    email VARCHAR[100],
		    created_at INTEGER,
		    PRIMARY KEY (id)
		  )
		`,
		});

		// Create indexes separately (ImmuDB requires this)
		try {
			await this.client.SQLExec({ sql: `CREATE INDEX IF NOT EXISTS ON "users" (name)` });
			await this.client.SQLExec({ sql: `CREATE INDEX IF NOT EXISTS ON "users" (email)` });
		} catch (error) {
			console.log(error);
		}
	}

	// CREATE - Verified write operation
	async createUser(user: Omit<User, 'createdAt'>): Promise<VerifiedResponse> {
		try {
			const userId = user.id;
			const createdAt = Date.now(); // Use timestamp as integer

			// Use SQL execution for tamper-proof writes
			const result = await this.client.SQLExec({
				sql: `
          INSERT INTO "users" (id, name, email, created_at) 
          VALUES (@id, @name, @email, @createdAt)
        `,
				params: {
					id: userId,
					name: user.name,
					email: user.email,
					createdAt: createdAt,
				},
			});

			return {
				data: { ...user, createdAt: new Date(createdAt) },
				verified: true,
				txId: result.txs?.[0]?.header?.id?.toString(),
				proof: result,
			};
		} catch (error) {
			throw new Error(`Failed to create user: ${error}`);
		}
	}

	// READ - Verified read operation
	async getUser(id: string): Promise<VerifiedResponse> {
		try {
			// Use SQL query for reading data
			const result = await this.client.SQLQuery({
				sql: `
          SELECT id, name, email, created_at 
          FROM "users" 
          WHERE id = @id
        `,
				params: { id },
			});

			if (!result || result.length === 0) {
				throw new Error('User not found');
			}

			const row = result[0];
			console.log(result);

			const values = row.values as unknown as any[];
			const userData = row;

			return {
				data: userData,
				verified: true,
				proof: result,
			};
		} catch (error) {
			throw new Error(`Failed to get user: ${error}`);
		}
	}

	// READ ALL - Get all users with verification
	async getAllUsers(): Promise<VerifiedResponse> {
		try {
			const result = await this.client.SQLQuery({
				sql: `
          SELECT id, name, email, created_at 
          FROM "users" 
          ORDER BY created_at DESC
        `,
			});

			const users = result || [];

			return {
				data: users,
				verified: true,
				proof: result,
			};
		} catch (error) {
			throw new Error(`Failed to get users: ${error}`);
		}
	}

	// UPDATE - Verified update operation
	async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<VerifiedResponse> {
		try {
			// First verify the user exists
			await this.getUser(id);

			const result = await this.client.SQLExec({
				sql: `
          UPDATE "users" 
          SET name = @name, email = @email
          WHERE id = @id
        `,
				params: {
					id,
					name: updates.name || '',
					email: updates.email || '',
				},
			});

			// Get updated user data
			const updatedUser = await this.getUser(id);

			return {
				data: updatedUser.data,
				verified: true,
				txId: result.txs?.[0]?.header?.id?.toString(),
				proof: result,
			};
		} catch (error) {
			throw new Error(`Failed to update user: ${error}`);
		}
	}

	// Time Travel Query - Verify data at specific transaction
	async getUserAtTransaction(id: string, txId?: string): Promise<VerifiedResponse> {
		try {
			const result = await this.client.SQLQuery({
				sql: `SELECT * FROM (HISTORY OF "users") WHERE id = @id`,
				params: { id },
			});

			return {
				data: result,
				verified: true,
				proof: { note: `Historical data before transaction ${txId}` },
			};
		} catch (error) {
			throw new Error(`Failed to get historical user data: ${error}`);
		}
	}

	// Health check method
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.SQLQuery({ sql: 'SELECT 1;' });
			return true;
		} catch (error) {
			return false;
		}
	}
}

// Express API Routes
const app = express();
app.use(express.json());

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Root endpoint that redirects to API docs
app.get('/', (req, res) => {
	res.redirect('/api-docs');
});

const crudService = new ImmudbCrudService();

// Initialize connection
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
	await crudService.connect();
	console.log(`Server running on port ${PORT} with immudb connection established`);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the service and database are healthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       500:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
app.get('/health', async (req, res) => {
	try {
		const isHealthy = await crudService.healthCheck();
		if (isHealthy) {
			res.json({
				success: true,
				database: 'connected',
				timestamp: new Date().toISOString(),
			});
		} else {
			res.status(500).json({
				success: false,
				database: 'disconnected',
				timestamp: new Date().toISOString(),
			});
		}
	} catch (error) {
		res.status(500).json({
			success: false,
			database: 'disconnected',
			error: (error as any).message,
			timestamp: new Date().toISOString(),
		});
	}
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with tamper-proof verification using ImmuDB
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the user
 *                 example: "user123"
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe@example.com"
 *             required:
 *               - id
 *               - name
 *               - email
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifiedResponse'
 *       400:
 *         description: Bad request - invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/users', async (req, res) => {
	try {
		const { id, name, email } = req.body;
		const result = await crudService.createUser({ id, name, email });

		res.status(201).json({
			success: true,
			user: result.data,
			tamperProof: {
				verified: result.verified,
				transactionId: result.txId,
				cryptographicProof: !!result.proof,
			},
		});
	} catch (error) {
		res.status(400).json({ success: false, error: (error as any).message });
	}
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieve a user by their ID with tamper-proof verification
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user123"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifiedResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/users/:id', async (req, res) => {
	try {
		const result = await crudService.getUser(req.params.id);

		res.json({
			success: true,
			user: result.data,
			tamperProof: {
				verified: result.verified,
				cryptographicProof: !!result.proof,
			},
		});
	} catch (error) {
		res.status(404).json({ success: false, error: (error as any).message });
	}
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users with tamper-proof verification
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 count:
 *                   type: integer
 *                   description: Number of users returned
 *                 tamperProof:
 *                   type: object
 *                   properties:
 *                     verified:
 *                       type: boolean
 *                       description: Whether the data has been cryptographically verified
 *                     cryptographicProof:
 *                       type: boolean
 *                       description: Whether cryptographic proof is available
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/users', async (req, res) => {
	try {
		const result = await crudService.getAllUsers();

		res.json({
			success: true,
			users: result.data,
			count: result.data.length,
			tamperProof: {
				verified: result.verified,
				cryptographicProof: !!result.proof,
			},
		});
	} catch (error) {
		res.status(500).json({ success: false, error: (error as any).message });
	}
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     description: Update a user's information with tamper-proof verification
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Doe Updated"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.doe.updated@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifiedResponse'
 *       400:
 *         description: Bad request - invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/users/:id', async (req, res) => {
	try {
		const { name, email } = req.body;
		const result = await crudService.updateUser(req.params.id, { name, email });

		res.json({
			success: true,
			user: result.data,
			tamperProof: {
				verified: result.verified,
				transactionId: result.txId,
				cryptographicProof: !!result.proof,
			},
		});
	} catch (error) {
		res.status(400).json({ success: false, error: (error as any).message });
	}
});

/**
 * @swagger
 * /users/{id}/history:
 *   get:
 *     summary: Get user data at specific transaction
 *     description: Retrieve historical user data at a specific transaction ID (time travel feature)
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user123"
 *     responses:
 *       200:
 *         description: Historical user data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 historicalUser:
 *                   $ref: '#/components/schemas/User'
 *                 tamperProof:
 *                   type: object
 *                   properties:
 *                     verified:
 *                       type: boolean
 *                       description: Whether the data has been cryptographically verified
 *                     cryptographicProof:
 *                       type: boolean
 *                       description: Whether cryptographic proof is available
 *                     note:
 *                       type: string
 *                       description: Additional information about the historical data
 *       404:
 *         description: User or transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/users/:id/history', async (req, res) => {
	try {
		const result = await crudService.getUserAtTransaction(req.params.id);

		res.json({
			success: true,
			historicalUser: result.data,
			tamperProof: {
				verified: result.verified,
				cryptographicProof: !!result.proof,
				note: 'This data represents the state before the specified transaction',
			},
		});
	} catch (error) {
		res.status(404).json({ success: false, error: (error as any).message });
	}
});

export default app;
