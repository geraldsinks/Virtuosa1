let cloudinary;

try {
  cloudinary = require('cloudinary').v2;
  
  // Check if required environment variables are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary configuration missing:');
    console.error('CLOUDINARY_CLOUD_NAME:', !!process.env.CLOUDINARY_CLOUD_NAME);
    console.error('CLOUDINARY_API_KEY:', !!process.env.CLOUDINARY_API_KEY);
    console.error('CLOUDINARY_API_SECRET:', !!process.env.CLOUDINARY_API_SECRET);
    throw new Error('Missing required Cloudinary environment variables');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  console.log('Cloudinary configured successfully for cloud:', process.env.CLOUDINARY_CLOUD_NAME);
} catch (error) {
  console.error('Failed to load Cloudinary:', error.message);
  console.log('Continuing without Cloudinary support...');
  
  // Create a mock cloudinary object for graceful degradation
  cloudinary = {
    config: () => {},
    uploader: {
      upload: async () => ({ error: 'Cloudinary not available' }),
      destroy: async () => ({ result: 'ok' })
    },
    api: {
      resources: async () => ({ resources: [] })
    }
  };
}

module.exports = cloudinary;
