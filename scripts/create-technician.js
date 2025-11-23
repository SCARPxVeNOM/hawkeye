/**
 * Script to create default technician accounts
 * Run: node scripts/create-technician.js
 */

const { MongoClient } = require('mongodb')
const { hash } = require('bcryptjs')

const uri = process.env.MONGODB_URI || 'mongodb+srv://pratikkumar56778_db_user:etgWQEDg5km05zam@cluster0.ectjae0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const dbName = process.env.MONGODB_DB_NAME || 'incident_reporting'

const defaultTechnicians = [
  {
    name: 'John Smith',
    email: 'john.smith@campus.com',
    password: 'tech123',
    specialization: 'Electrical',
    active: true,
    available: true,
    max_concurrent: 2,
    current_assignments: 0,
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@campus.com',
    password: 'tech123',
    specialization: 'Plumbing',
    active: true,
    available: true,
    max_concurrent: 2,
    current_assignments: 0,
  },
  {
    name: 'Mike Davis',
    email: 'mike.davis@campus.com',
    password: 'tech123',
    specialization: 'HVAC',
    active: true,
    available: true,
    max_concurrent: 2,
    current_assignments: 0,
  },
  {
    name: 'Emily Chen',
    email: 'emily.chen@campus.com',
    password: 'tech123',
    specialization: 'IT',
    active: true,
    available: true,
    max_concurrent: 2,
    current_assignments: 0,
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@campus.com',
    password: 'tech123',
    specialization: 'General',
    active: true,
    available: true,
    max_concurrent: 2,
    current_assignments: 0,
  },
]

async function createTechnicians() {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log('Connected to MongoDB')

    const db = client.db(dbName)
    const usersCollection = db.collection('users')

    console.log('\nCreating technician accounts...\n')

    for (const tech of defaultTechnicians) {
      // Check if technician already exists
      const existing = await usersCollection.findOne({ email: tech.email })
      
      if (existing) {
        console.log(`⚠️  Technician ${tech.email} already exists. Skipping...`)
        continue
      }

      // Hash password
      const passwordHash = await hash(tech.password, 10)

      // Create technician
      const technician = {
        name: tech.name,
        email: tech.email,
        password_hash: passwordHash,
        role: 'technician',
        specialization: tech.specialization,
        active: tech.active,
        available: tech.available,
        max_concurrent: tech.max_concurrent,
        current_assignments: tech.current_assignments,
        created_at: new Date(),
        updated_at: new Date(),
      }

      await usersCollection.insertOne(technician)
      console.log(`✅ Created technician: ${tech.name} (${tech.email})`)
      console.log(`   Password: ${tech.password}`)
      console.log(`   Specialization: ${tech.specialization}\n`)
    }

    console.log('\n✅ All technicians created successfully!')
    console.log('\n📋 Default Technician Credentials:')
    console.log('1. Email: john.smith@campus.com | Password: tech123 | Specialization: Electrical')
    console.log('2. Email: sarah.johnson@campus.com | Password: tech123 | Specialization: Plumbing')
    console.log('3. Email: mike.davis@campus.com | Password: tech123 | Specialization: HVAC')
    console.log('4. Email: emily.chen@campus.com | Password: tech123 | Specialization: IT')
    console.log('5. Email: david.wilson@campus.com | Password: tech123 | Specialization: General')
  } catch (error) {
    console.error('Error creating technicians:', error)
  } finally {
    await client.close()
  }
}

createTechnicians()


