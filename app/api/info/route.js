import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const ytDlpPath = path.resolve(process.cwd(), 'yt-dlp');
    const { stdout } = await execPromise(`"${ytDlpPath}" --dump-json "${url}"`);
    const info = JSON.parse(stdout);

    // Extract unique heights for available qualities
    const heights = new Set();
    info.formats.forEach(f => {
      if (f.vcodec !== 'none' && f.height) {
        heights.add(f.height);
      }
    });
      
    // Sort heights descending
    const sortedHeights = Array.from(heights).sort((a, b) => b - a);

    const videoData = {
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      qualities: sortedHeights.map(h => `${h}p`) // e.g. ["1080p", "720p"]
    };

    return NextResponse.json(videoData);
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video information. Ensure the URL is valid.' },
      { status: 500 }
    );
  }
}
