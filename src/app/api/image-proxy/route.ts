import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('imageUrl');

  if (!imageUrl) {
    return new NextResponse('Missing imageUrl parameter', { status: 400 });
  }

  try {
    const parsedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return new NextResponse('Invalid protocol', { status: 400 });
    }
  } catch (error) {
    return new NextResponse('Invalid imageUrl', { status: 400 });
  }

  try {
    // Fetch the image from the external URL
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Get the image data as a buffer
    const imageBuffer = await response.arrayBuffer();
    // Get the original content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Return a new response with the image data and correct headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        // Add a cache header to prevent re-fetching the same image constantly
        'Cache-Control': 'public, max-age=86400, immutable', 
      },
    });
  } catch (error) {
    console.error('[IMAGE PROXY ERROR]', error);
    return new NextResponse('Error fetching image from source server.', { status: 500 });
  }
}
