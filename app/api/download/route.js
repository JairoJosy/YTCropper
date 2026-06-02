import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Readable } from 'stream';

const execPromise = util.promisify(exec);

export async function POST(request) {
  try {
    const { url, startTime, endTime, quality } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const ytDlpPath = path.resolve(process.cwd(), 'yt-dlp');

    // Create a temporary file name
    const tmpDir = os.tmpdir();
    const outputId = `ytcropper_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const outputTemplate = path.join(tmpDir, `${outputId}.%(ext)s`);

    // Parse the height from quality (e.g., '1080p' -> 1080)
    let formatArg = 'bestvideo+bestaudio/best';
    if (quality && quality.endsWith('p')) {
      const height = parseInt(quality.replace('p', ''));
      if (!isNaN(height)) {
        // Ensures we get the best video up to the selected resolution, PLUS audio, and merge them.
        formatArg = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
      }
    }

    let command = `"${ytDlpPath}" "${url}" -f "${formatArg}" --merge-output-format mp4 -o "${outputTemplate}"`;

    if (startTime !== undefined && endTime !== undefined) {
      // Use yt-dlp's built-in section downloading
      // The * prefix tells yt-dlp to use ffmpeg to accurately cut the video.
      command += ` --download-sections "*${startTime}-${endTime}" --force-keyframes-at-cuts`;
    }

    console.log('Running yt-dlp command:', command);
    await execPromise(command);

    // Find the downloaded file (since we don't know the exact extension yet)
    const files = fs.readdirSync(tmpDir);
    const downloadedFile = files.find(f => f.startsWith(outputId));

    if (!downloadedFile) {
      throw new Error('Downloaded file not found');
    }

    const filePath = path.join(tmpDir, downloadedFile);
    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Clean up the file after sending
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch(e) {
        // Ignore
      }
    }, 1000 * 60 * 5); // 5 minutes

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="cropped_video${path.extname(downloadedFile)}"`);
    headers.set('Content-Type', 'video/mp4'); // Fallback content type
    headers.set('Content-Length', stat.size.toString());

    // We use standard web streams for NextResponse
    const webReadableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      }
    });

    return new NextResponse(webReadableStream, { headers });
  } catch (error) {
    console.error('Error during download/crop:', error);
    return NextResponse.json(
      { error: 'Failed to process video. Check server logs.' },
      { status: 500 }
    );
  }
}
