import { v2 as cloudinary } from 'cloudinary';

type CloudinaryResourceType = 'image' | 'raw';

let isConfigured = false;

function getCloudinary() {
  if (!isConfigured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log('[cloudinary] Config:', { cloudName, apiKey: apiKey ? 'set' : 'missing', apiSecret: apiSecret ? 'set' : 'missing' });
    
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isConfigured = true;
  }

  return cloudinary;
}

export function createUploadSignature(resourceType: CloudinaryResourceType, folder = 'chartix') {
  console.log('[cloudinary] Starting signature for:', resourceType, folder);
  
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    console.error('[cloudinary] Missing config:', { apiSecret: !!apiSecret, apiKey: !!apiKey, cloudName: !!cloudName });
    throw new Error('Cloudinary environment variables are not configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = getCloudinary().utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    apiSecret,
  );

  console.log('[cloudinary] Signature created timestamp:', timestamp);
  
  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType,
  };
}
