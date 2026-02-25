import supabase from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

/**
 * Upload profile image to Supabase storage
 * @param userId User ID for storage path
 * @param imageUri URI of the image to upload
 * @returns URL of uploaded image or error
 */
export const uploadProfileImage = async (userId: string, imageUri: string) => {
  try {
    // Get file name - path should be userId/filename (without bucket prefix)
    const fileName = `profile-${userId}-${Date.now()}.jpg`;
    const filePath = `${userId}/${fileName}`;

    // Read file as base64
    const fileContent = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Convert base64 to Uint8Array for upload
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(filePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('[uploadProfileImage] Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('[uploadProfileImage] ✅ Image uploaded successfully:', filePath);
    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('[uploadProfileImage] ❌ Image upload failed:', error);
    return { url: null, error: error as Error };
  }
};

/**
 * Pick image from device and upload
 * @param userId User ID for storage path
 * @returns URL of uploaded image or error
 */
export const pickAndUploadImage = async (userId: string) => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return {
        url: null,
        error: new Error('Permission to access camera roll is required!'),
      };
    }

    // Open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile picture
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { url: null, error: null }; // User cancelled
    }

    // Upload image
    return await uploadProfileImage(userId, result.assets[0].uri);
  } catch (error) {
    console.error('[pickAndUploadImage] ❌ Error:', error);
    return { url: null, error: error as Error };
  }
};

/**
 * Delete old profile image from storage
 * @param userId User ID
 * @param oldImageUrl URL of old image
 */
export const deleteOldProfileImage = async (userId: string, oldImageUrl: string) => {
  try {
    // Extract file path from URL (format: userId/filename)
    // Public URL format: ...supabase.co/storage/v1/object/public/profiles/userId/filename
    const pathMatch = oldImageUrl.match(/\/profiles\/(.+)/);
    if (!pathMatch || !pathMatch[1]) return; // Not a valid Supabase URL

    const filePath = pathMatch[1];
    await supabase.storage.from('profiles').remove([filePath]);
    console.log('[deleteOldProfileImage] Old image deleted');
  } catch (error) {
    console.warn('[deleteOldProfileImage] Warning deleting old image:', error);
    // Don't throw - this is not critical
  }
};
