const Database = require('./src/data/database');

async function testEncryption() {
  console.log('Testing database encryption...');

  const db = new Database();
  const passphrase = 'testpassphrase';

  try {
    await db.initDatabase(passphrase);
    console.log('✅ Database initialized with encryption');

    await db.openDatabase(passphrase);
    console.log('✅ Database opened successfully');

    // Test data operations
    const catId = db.addCategory({ name: 'EncryptedTest', description: 'Testing encryption' });
    console.log('✅ Category added');

    const categories = db.getCategories();
    const testCat = categories.find(c => c.name === 'EncryptedTest');
    if (testCat) {
      console.log('✅ Encrypted data retrieved correctly');
    } else {
      console.log('❌ Encrypted data not found');
    }

    // Test settings
    db.setSetting('encryption_test', 'secret_value');
    const value = db.getSetting('encryption_test');
    if (value === 'secret_value') {
      console.log('✅ Settings encrypted and decrypted correctly');
    } else {
      console.log('❌ Settings encryption failed');
    }

    db.closeDatabase();
    console.log('✅ Database closed');

    console.log('Encryption test passed');
  } catch (error) {
    console.error('❌ Encryption test failed:', error.message);
  }
}

testEncryption().catch(console.error);