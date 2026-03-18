// Seed Seller Applications Script
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://geraldsinkamba49:PWBulG6YrbGABdw9@unitrade.borlid8.mongodb.net/unitrade?retryWrites=true&w=majority&appName=unitrade')
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define schemas (simplified versions for seeding)
const userSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    phoneNumber: String,
    university: String,
    isStudentVerified: Boolean,
    profilePicture: String,
    createdAt: { type: Date, default: Date.now },
    sellerApplicationStatus: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected'], default: 'None' },
    isSeller: { type: Boolean, default: false }
});

const sellerApplicationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerType: { type: String, enum: ['Student', 'CampusBusiness', 'ExternalVendor', 'Cooperative'], required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    submittedAt: { type: Date, default: Date.now },
    
    // Personal Info
    personalInfo: {
        fullName: String,
        studentId: String,
        university: String,
        nrcNumber: String,
        phoneNumber: String,
        email: String,
        yearOfStudy: String,
        program: String
    },
    
    // Selling Info
    sellingInfo: {
        categories: [String],
        otherCategory: String,
        sellingExperience: String,
        currentSaleChannels: [String],
        storeName: String,
        storeDescription: String
    },
    
    // Campus Location
    campusLocation: {
        campus: String,
        physicalAccess: Boolean,
        pickupLocation: String,
        canDeliver: Boolean,
        deliveryRadius: Number
    },
    
    // Review info
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String
});

const User = mongoose.model('User', userSchema);
const SellerApplication = mongoose.model('SellerApplication', sellerApplicationSchema);

async function seedSellerApplications() {
    try {
        console.log('Starting to seed seller applications...');
        
        // Find some users to create applications for
        const users = await User.find({ sellerApplicationStatus: 'None' }).limit(5);
        
        if (users.length === 0) {
            console.log('No users found without applications. Creating sample users first...');
            
            // Create sample users
            const sampleUsers = [
                {
                    fullName: 'John Smith',
                    email: 'john.smith@university.edu',
                    phoneNumber: '+260955123456',
                    university: 'University of Zambia',
                    isStudentVerified: true,
                    profilePicture: 'https://picsum.photos/seed/user1/200/200.jpg'
                },
                {
                    fullName: 'Mary Johnson',
                    email: 'mary.johnson@university.edu',
                    phoneNumber: '+260955123457',
                    university: 'University of Zambia',
                    isStudentVerified: true,
                    profilePicture: 'https://picsum.photos/seed/user2/200/200.jpg'
                },
                {
                    fullName: 'David Banda',
                    email: 'david.banda@university.edu',
                    phoneNumber: '+260955123458',
                    university: 'Copperbelt University',
                    isStudentVerified: true,
                    profilePicture: 'https://picsum.photos/seed/user3/200/200.jpg'
                }
            ];
            
            const createdUsers = await User.insertMany(sampleUsers);
            console.log(`Created ${createdUsers.length} sample users`);
            
            // Use the newly created users
            users.push(...createdUsers);
        }
        
        // Create sample applications
        const applications = users.map((user, index) => ({
            user: user._id,
            sellerType: ['Student', 'CampusBusiness', 'ExternalVendor', 'Cooperative'][index % 4],
            status: ['Pending', 'Pending', 'Approved', 'Rejected'][index % 4],
            personalInfo: {
                fullName: user.fullName,
                studentId: `STU${String(index + 1).padStart(6, '0')}`,
                university: user.university,
                nrcNumber: `${String(index + 1).padStart(6, '0')}/11/1`,
                phoneNumber: user.phoneNumber,
                email: user.email,
                yearOfStudy: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'][index % 4],
                program: ['Computer Science', 'Business Administration', 'Engineering', 'Medicine'][index % 4]
            },
            sellingInfo: {
                categories: [['Electronics', 'Books'], ['Clothing', 'Accessories'], ['Food', 'Beverages'], ['Services', 'Tutoring']][index % 4],
                otherCategory: index % 2 === 0 ? 'Custom items' : '',
                sellingExperience: ['first_time', 'sold_casually', 'existing_business'][index % 3],
                currentSaleChannels: ['WhatsApp', 'Instagram', 'Facebook'],
                storeName: `${user.fullName.split(' ')[0]}'s Store`,
                storeDescription: `Selling quality ${['electronics', 'fashion', 'food', 'services'][index % 4]} to fellow students`
            },
            campusLocation: {
                campus: user.university,
                physicalAccess: true,
                pickupLocation: ['Main Library', 'Student Center', 'Engineering Block'][index % 3],
                canDeliver: index % 2 === 0,
                deliveryRadius: index % 2 === 0 ? 5 : 0
            },
            reviewedAt: index >= 2 ? new Date(Date.now() - (index * 24 * 60 * 60 * 1000)) : null,
            rejectionReason: index === 3 ? 'Insufficient documentation provided' : null
        }));
        
        const createdApplications = await SellerApplication.insertMany(applications);
        
        // Update user statuses
        for (let i = 0; i < createdApplications.length; i++) {
            const app = createdApplications[i];
            await User.findByIdAndUpdate(app.user, {
                sellerApplicationStatus: app.status,
                isSeller: app.status === 'Approved'
            });
        }
        
        console.log(`✅ Successfully created ${createdApplications.length} seller applications`);
        
        // Show summary
        const summary = await SellerApplication.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        console.log('Applications by status:');
        summary.forEach(item => {
            console.log(`  ${item._id}: ${item.count}`);
        });
        
    } catch (error) {
        console.error('Error seeding seller applications:', error);
    } finally {
        mongoose.disconnect();
    }
}

// Run the seeding
seedSellerApplications();
