/**
 * useTradeScreenshots - Hook for uploading/managing trade screenshots
 * Uses Lovable Cloud Storage (Supabase Storage)
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET_NAME = "trade-screenshots";
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_SCREENSHOTS_PER_TRADE = 3;

interface UploadResult {
  url: string;
  path: string;
}

interface UseTradeScreenshotsReturn {
  uploadScreenshot: (file: File, tradeId: string) => Promise<UploadResult | null>;
  deleteScreenshot: (path: string) => Promise<boolean>;
  getScreenshotUrl: (path: string) => string;
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 1200px width/height)
      let { width, height } = img;
      const maxDim = 1200;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/webp",
        0.8 // 80% quality
      );
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function useTradeScreenshots(): UseTradeScreenshotsReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadScreenshot = async (
    file: File,
    tradeId: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload screenshots");
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      // Compress image
      let uploadBlob: Blob = file;
      if (file.size > MAX_FILE_SIZE) {
        uploadBlob = await compressImage(file);
      }

      // Generate unique path
      const timestamp = Date.now();
      const extension = "webp";
      const path = `${user.id}/${tradeId}/${timestamp}.${extension}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, uploadBlob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get signed URL (private bucket)
      const { data: urlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

      if (!urlData?.signedUrl) {
        throw new Error("Failed to get signed URL");
      }

      toast.success("Screenshot uploaded successfully");
      return { url: urlData.signedUrl, path };
    } catch (err: any) {
      const message = err.message || "Failed to upload screenshot";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteScreenshot = async (path: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (deleteError) {
        throw deleteError;
      }

      toast.success("Screenshot deleted");
      return true;
    } catch (err: any) {
      const message = err.message || "Failed to delete screenshot";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const getScreenshotUrl = (path: string): string => {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    uploadScreenshot,
    deleteScreenshot,
    getScreenshotUrl,
    isUploading,
    isDeleting,
    error,
  };
}

export { MAX_SCREENSHOTS_PER_TRADE };
