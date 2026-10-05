/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats or raw video ID strings.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - Direct 11-character video ID
 * 
 * @param {string} input - YouTube URL or video ID string
 * @returns {string} 11-character YouTube video ID, or empty string if invalid
 */
export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|youtube-nocookie\.com\/(?:embed\/|v\/))([\w-]{11})/);
  return match ? match[1] : '';
}
