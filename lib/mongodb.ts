import { MongoClient, Db, MongoClientOptions } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local')
}

const uri: string = process.env.MONGODB_URI
const dbName: string = process.env.MONGODB_DB_NAME || 'incident_reporting'

// MongoDB connection options with SSL/TLS configuration
// Required for MongoDB Atlas connections, especially on Windows
const options: MongoClientOptions = {
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 10,
  minPoolSize: 1,
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
      console.error('MongoDB connection error:', error)
      throw error
    })
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect().catch((error) => {
    console.error('MongoDB connection error:', error)
    throw error
  })
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  const db = client.db(dbName)
  
  // Initialize collections and indexes on first connection
  await initializeCollections(db)
  
  return db
}

async function initializeCollections(db: Db) {
  try {
    // Check if collections already exist by trying to get collection stats
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    // Create indexes if collections don't exist or are empty
    if (!collectionNames.includes('users')) {
      await db.collection('users').createIndex({ email: 1 }, { unique: true })
      await db.collection('users').createIndex({ role: 1 })
    }
    
    if (!collectionNames.includes('incidents')) {
      await db.collection('incidents').createIndex({ user_id: 1 })
      await db.collection('incidents').createIndex({ status: 1 })
      await db.collection('incidents').createIndex({ assigned_to: 1 })
      await db.collection('incidents').createIndex({ category: 1, location: 1, created_at: 1 })
      await db.collection('incidents').createIndex({ created_at: -1 })
    }
    
    if (!collectionNames.includes('incident_updates')) {
      await db.collection('incident_updates').createIndex({ incident_id: 1 })
      await db.collection('incident_updates').createIndex({ user_id: 1 })
      await db.collection('incident_updates').createIndex({ created_at: -1 })
    }
    
    if (!collectionNames.includes('technician_schedule')) {
      await db.collection('technician_schedule').createIndex({ technician_id: 1 })
      await db.collection('technician_schedule').createIndex({ incident_id: 1 })
      await db.collection('technician_schedule').createIndex({ scheduled_time: 1 })
      await db.collection('technician_schedule').createIndex({ status: 1 })
    }
    
    if (!collectionNames.includes('predictions')) {
      await db.collection('predictions').createIndex({ location: 1 })
      await db.collection('predictions').createIndex({ category: 1 })
      await db.collection('predictions').createIndex({ created_at: -1 })
    }
    
    if (!collectionNames.includes('notifications')) {
      await db.collection('notifications').createIndex({ user_id: 1 })
      await db.collection('notifications').createIndex({ read: 1 })
      await db.collection('notifications').createIndex({ created_at: -1 })
    }

    if (!collectionNames.includes('rate_limits')) {
      await db.collection('rate_limits').createIndex({ user_id: 1, window_start: 1 })
      await db.collection('rate_limits').createIndex({ window_end: 1 }, { expireAfterSeconds: 86400 }) // TTL index
    }

    if (!collectionNames.includes('technician_feedback')) {
      await db.collection('technician_feedback').createIndex({ incident_id: 1 })
      await db.collection('technician_feedback').createIndex({ technician_id: 1 })
      await db.collection('technician_feedback').createIndex({ user_id: 1 })
      await db.collection('technician_feedback').createIndex({ created_at: -1 })
      await db.collection('technician_feedback').createIndex({ incident_id: 1, user_id: 1 }, { unique: true })
    }
  } catch (error) {
    // Silently fail - collections might already exist with indexes
    console.error('Error initializing collections:', error)
  }
}

