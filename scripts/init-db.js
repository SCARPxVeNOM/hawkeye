const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://pratikkumar56778_db_user:etgWQEDg5km05zam@cluster0.ectjae0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'incident_reporting';

async function initializeDatabase() {
  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('Connected successfully!');

    const db = client.db(dbName);
    console.log(`Using database: ${dbName}`);

    // Create Users collection with indexes
    console.log('Creating users collection...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    console.log('✓ Users collection ready');

    // Create Incidents collection with indexes
    console.log('Creating incidents collection...');
    await db.collection('incidents').createIndex({ user_id: 1 });
    await db.collection('incidents').createIndex({ status: 1 });
    await db.collection('incidents').createIndex({ assigned_to: 1 });
    await db.collection('incidents').createIndex({ category: 1, location: 1, created_at: 1 });
    await db.collection('incidents').createIndex({ created_at: -1 });
    console.log('✓ Incidents collection ready');

    // Create Incident Updates collection with indexes
    console.log('Creating incident_updates collection...');
    await db.collection('incident_updates').createIndex({ incident_id: 1 });
    await db.collection('incident_updates').createIndex({ user_id: 1 });
    await db.collection('incident_updates').createIndex({ created_at: -1 });
    console.log('✓ Incident updates collection ready');

    // Create Technician Schedule collection with indexes
    console.log('Creating technician_schedule collection...');
    await db.collection('technician_schedule').createIndex({ technician_id: 1 });
    await db.collection('technician_schedule').createIndex({ incident_id: 1 });
    await db.collection('technician_schedule').createIndex({ scheduled_time: 1 });
    await db.collection('technician_schedule').createIndex({ status: 1 });
    console.log('✓ Technician schedule collection ready');

    // Create Predictions collection with indexes
    console.log('Creating predictions collection...');
    await db.collection('predictions').createIndex({ location: 1 });
    await db.collection('predictions').createIndex({ category: 1 });
    await db.collection('predictions').createIndex({ created_at: -1 });
    console.log('✓ Predictions collection ready');

    // Create Notifications collection with indexes
    console.log('Creating notifications collection...');
    await db.collection('notifications').createIndex({ user_id: 1 });
    await db.collection('notifications').createIndex({ read: 1 });
    await db.collection('notifications').createIndex({ created_at: -1 });
    console.log('✓ Notifications collection ready');

    // Create Technician Feedback collection with indexes
    console.log('Creating technician_feedback collection...');
    await db.collection('technician_feedback').createIndex({ incident_id: 1 });
    await db.collection('technician_feedback').createIndex({ technician_id: 1 });
    await db.collection('technician_feedback').createIndex({ user_id: 1 });
    await db.collection('technician_feedback').createIndex({ created_at: -1 });
    await db.collection('technician_feedback').createIndex({ incident_id: 1, user_id: 1 }, { unique: true });
    console.log('✓ Technician feedback collection ready');

    console.log('\n✅ Database initialized successfully!');
    console.log(`Database: ${dbName}`);
    console.log('Collections created: users, incidents, incident_updates, technician_schedule, predictions, notifications, technician_feedback');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    if (error.message.includes('IP')) {
      console.error('\n⚠️  Make sure your IP address is whitelisted in MongoDB Atlas Network Access settings.');
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nConnection closed.');
  }
}

initializeDatabase();

