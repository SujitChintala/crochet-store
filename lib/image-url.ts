function extractGoogleDriveFileId(url: URL) {
  const host = url.hostname.toLowerCase();

  if (host === "drive.google.com" || host === "www.drive.google.com") {
    const idFromQuery = url.searchParams.get("id");

    if (idFromQuery) {
      return idFromQuery;
    }

    const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);

    if (filePathMatch) {
      return filePathMatch[1];
    }

    const shortPathMatch = url.pathname.match(/\/d\/([^/]+)/);

    if (shortPathMatch) {
      return shortPathMatch[1];
    }
  }

  if (host === "drive.usercontent.google.com") {
    const idFromQuery = url.searchParams.get("id");

    if (idFromQuery) {
      return idFromQuery;
    }
  }

  return null;
}

export function normalizeProductImageUrl(imageUrl: string) {
  const trimmed = imageUrl.trim();

  if (!trimmed) {
    return trimmed;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const driveFileId = extractGoogleDriveFileId(parsedUrl);

  if (!driveFileId) {
    return trimmed;
  }

  return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
}
