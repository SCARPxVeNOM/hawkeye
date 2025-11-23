/**
 * Script to create default admin account
 * Run: node scripts/create-admin.js
 */

const { MongoClient } = require('mongodb')
const { hash } = require('bcryptjs')

const uri = process.env.MONGODB_URI || 'mongodb+srv://pratikkumar56778_db_user:etgWQEDg5km05zam@cluster0.ectjae0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const dbName = process.env.MONGODB_DB_NAME || 'incident_reporting'

const adminUser = {
  name: 'Admin User',
  email: 'admin@campus.com',
  password: 'admin123',
  role: 'admin',
}

async function createAdmin() {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('Connected to MongoDB')

    const db = client.db(dbName)
    const usersCollection = db.collection('users')

    console.log('\nCreating admin account...\n')

    // Check if admin already exists
    const existing = await usersCollection.findOne({ email: adminUser.email, role: 'admin' })
    
    if (existing) {
      console.log(`⚠️  Admin ${adminUser.email} already exists.`)
      console.log(`\n📋 Admin Credentials:`)
      console.log(`Email: ${adminUser.email}`)
      console.log(`Password: ${adminUser.password}`)
      console.log(`\nNote: If you don't know the password, you may need to reset it.`)
      return
    }

    // Hash password
    const passwordHash = await hash(adminUser.password, 10)

    // Create admin
    const admin = {
      name: adminUser.name,
      email: adminUser.email,
      password_hash: passwordHash,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    }

    await usersCollection.insertOne(admin)
    console.log(`✅ Created admin: ${adminUser.name} (${adminUser.email})`)
    console.log(`   Password: ${adminUser.password}`)

    console.log('\n✅ Admin account created successfully!')
    console.log('\n📋 Admin Credentials:')
    console.log(`Email: ${adminUser.email}`)
    console.log(`Password: ${adminUser.password}`)
  } catch (error) {
    console.error('Error creating admin:', error)
  } finally {
    await client.close()
  }
}

createAdmin()

