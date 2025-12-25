import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

const INAYA_FOLDER_NAME = "INAYA";

async function getOrCreateFolder(
  folderName: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  const query = parentId
    ? `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create new folder
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId && { parents: [parentId] }),
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id",
  });

  return folder.data.id!;
}

export async function uploadToGoogleDrive(
  file: Buffer,
  fileName: string,
  mimeType: string,
  patientCode: string,
  patientName: string,
  caseDate: string
): Promise<{ id: string; url: string }> {
  try {
    // Get or create INAYA folder
    const inayaFolderId = await getOrCreateFolder(INAYA_FOLDER_NAME);

    // Get or create patient folder
    const patientFolderName = `${patientCode}_${patientName.replace(/\s+/g, "_")}`;
    const patientFolderId = await getOrCreateFolder(patientFolderName, inayaFolderId);

    // Get or create case folder
    const caseFolderName = `Case_${caseDate}`;
    const caseFolderId = await getOrCreateFolder(caseFolderName, patientFolderId);

    // Upload file
    const { Readable } = await import("stream");
    const fileStream = new Readable();
    fileStream.push(file);
    fileStream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [caseFolderId],
      },
      media: {
        mimeType,
        body: fileStream,
      },
      fields: "id, webViewLink",
    });

    // Make file accessible via link
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return {
      id: response.data.id!,
      url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
    };
  } catch (error) {
    console.error("Google Drive upload error:", error);
    throw error;
  }
}

export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error("Google Drive delete error:", error);
    throw error;
  }
}

/**
 * Download an image from Google Drive and convert it to base64
 */
export async function downloadImageFromGoogleDrive(
  fileId: string,
  mimeType?: string
): Promise<string> {
  try {
    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    const base64 = buffer.toString("base64");
    const detectedMimeType = mimeType || "image/jpeg";
    
    return `data:${detectedMimeType};base64,${base64}`;
  } catch (error) {
    console.error("Google Drive download error:", error);
    throw error;
  }
}

/**
 * Extract file ID from Google Drive URL
 */
export function extractFileIdFromUrl(url: string): string | null {
  // Handle different Google Drive URL formats
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If URL is just an ID
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}

export default drive;

