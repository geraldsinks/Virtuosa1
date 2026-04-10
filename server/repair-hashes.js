const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path as needed

async function repairHashes() {
    try {
        // Connect to database
        const mongoURI = 'mongodb+srv://geraldsinkamba49:OiJFFSdW7SilG6yy@unitrade.borlid8.mongodb.net/unitrade?retryWrites=true&w=majority&appName=unitrade';
        await mongoose.connect(mongoURI);
        console.log("Connected to database for repair...");

        const users = await User.find({});
        let repairCount = 0;
        let totalUsers = users.length;

        console.log(`Found ${totalUsers} users to check...`);

        for (const user of users) {
            if (user.password && user.password !== user.password.toLowerCase()) {
                console.log(`Repairing hash for: ${user.email}`);
                console.log(`Original: ${user.password.substring(0, 30)}...`);
                console.log(`Fixed:    ${user.password.toLowerCase().substring(0, 30)}...`);
                
                // Convert the corrupted uppercase hash back to lowercase
                const fixedPassword = user.password.toLowerCase();
                
                // We bypass standard save hooks if they are suspected of re-uppercasing
                await User.updateOne(
                    { _id: user._id }, 
                    { $set: { password: fixedPassword } }
                );
                
                repairCount++;
            } else {
                console.log(`Hash already correct for: ${user.email}`);
            }
        }

        console.log(`\nSuccessfully repaired ${repairCount} out of ${totalUsers} users.`);
        
        // Verify a few repaired users
        if (repairCount > 0) {
            console.log("\nVerifying repaired hashes...");
            const sampleUsers = await User.find({}).limit(3);
            for (const user of sampleUsers) {
                console.log(`${user.email}: ${user.password.substring(0, 30)}... (${user.password === user.password.toLowerCase() ? 'OK' : 'STILL UPPERCASE'})`);
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Repair failed:", err);
        process.exit(1);
    }
}

repairHashes();
