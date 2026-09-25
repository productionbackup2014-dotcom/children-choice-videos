import { writeFile } from 'node:fs/promises';

const API = 'https://www.googleapis.com/youtube/v3';
const key = process.env.YOUTUBE_API_KEY;
const handle = (process.env.YOUTUBE_HANDLE || 'ChildrenChoiceBooks').replace(/^@/, '');
const output = process.argv[2] || 'videos.json';

function classify(text) {
  text = text.toLowerCase();
  if (/\blab\s*xpert\b|science lab|\bexperiment\b|\bpractical\b/.test(text)) return 'LabXpert';
  if (/\bsaga\b/.test(text)) return 'Saga';
  if (/\bmagnet\b/.test(text)) return 'Magnet';
  return 'Multiply';
}

function className(text) {
  text = text.toLowerCase();
  if (/\bnursery\b/.test(text)) return 'Nursery';
  if (/\bl\.?k\.?g\.?\b/.test(text)) return 'LKG';
  if (/\bu\.?k\.?g\.?\b/.test(text)) return 'UKG';
  const match = text.match(/\b(?:class|grade)\s*[-:]?\s*([1-9])\b/);
  return match ? `Class ${match[1]}` : 'Other';
}

function subject(text) {
  text = text.toLowerCase();
  if (/science lab|experiment|practical/.test(text)) return 'Science Lab';
  if (/hindi.*(?:grammar|vyakaran)|vyakaran/.test(text)) return 'Hindi Vyakaran';
  if (/english.*grammar|grammar/.test(text)) return 'English Grammar';
  if (/hindi.*rhyme|hindi.*poem/.test(text)) return 'Hindi Rhymes';
  if (/english.*rhyme|rhyme|poem/.test(text)) return 'English Rhymes';
  if (/\bmath(?:s|ematics)?\b/.test(text)) return 'Maths';
  if (/\b(?:evs|environmental studies)\b/.test(text)) return 'EVS';
  if (/\b(?:sst|social studies)\b/.test(text)) return 'SST';
  if (/\bscience\b/.test(text)) return 'Science';
  if (/\bcomputer|coding|python|html|css\b/.test(text)) return 'Computer';
  if (/\bhindi\b/.test(text)) return 'Hindi';
  if (/\benglish\b/.test(text)) return 'English';
  if (/\b(?:gk|general knowledge)\b/.test(text)) return 'GK';
  return 'Other';
}

async function youtube(path, params) {
  const response = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key })}`);
  if (!response.ok) throw new Error(`YouTube ${path} request failed (${response.status})`);
  return response.json();
}

async function main() {
  if (!key) throw new Error('Set YOUTUBE_API_KEY first.');
  const channel = await youtube('channels', { part: 'contentDetails', forHandle: handle });
  const playlistId = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error(`Channel @${handle} was not found.`);

  const ids = [];
  let pageToken = '';
  do {
    const page = await youtube('playlistItems', { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken && { pageToken }) });
    ids.push(...(page.items || []).map(item => item.contentDetails?.videoId).filter(Boolean));
    pageToken = page.nextPageToken || '';
  } while (pageToken);

  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const page = await youtube('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(',') });
    for (const item of page.items || []) {
      const details = [item.snippet?.title, item.snippet?.description, ...(item.snippet?.tags || [])].join(' ');
      videos.push({
        id: item.id,
        title: item.snippet?.title || 'Untitled video',
        views: Number(item.statistics?.viewCount) || 0,
        duration: item.contentDetails?.duration || '',
        class: className(details),
        subject: subject(details),
        publishedAt: item.snippet?.publishedAt || '',
        series: classify(details)
      });
    }
  }

  videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), channel: `@${handle}`, videos })}\n`, 'utf8');
  console.log(`Saved ${videos.length} videos to ${output}`);
}

if (process.argv.includes('--check')) {
  console.assert(classify('The Saga Class 2 English') === 'Saga');
  console.assert(classify('LabXpert experiment') === 'LabXpert');
  console.assert(classify('Class 3 Maths') === 'Multiply');
  console.assert(className('Saga Grade 2') === 'Class 2');
  console.assert(subject('Class 2 English Grammar') === 'English Grammar');
  console.log('Classification checks passed.');
} else {
  await main();
}
