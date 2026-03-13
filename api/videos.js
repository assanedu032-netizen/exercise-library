export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ error: 'Missing NOTION_TOKEN or NOTION_DB_ID' });
  }

  try {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const body = { page_size: 100 };
      if (startCursor) body.start_cursor = startCursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    const videos = allResults.map((page) => {
      const p = page.properties;
      const title = p['Name']?.title?.map(t => t.plain_text).join('') || '';
      const youtubeUrl = p['YouTube Video Link']?.url || '';
      const category = p['Category']?.rich_text?.map(t => t.plain_text).join('') || '';
      const level = p['Level']?.select?.name || '';
      const material = p['Material']?.rich_text?.map(t => t.plain_text).join('') || '';
      const notes = p['Notes']?.rich_text?.map(t => t.plain_text).join('') || '';
      const programs = p['Program(s)']?.multi_select?.map(s => s.name) || [];
      const match = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const youtube_id = match ? match[1] : '';
      return { id: page.id, title, category, level, material, notes, programs, youtube_id };
    }).filter(v => v.title && v.youtube_id);

    const categories = [...new Set(videos.map(v => v.category).filter(Boolean))].sort();
    const levels = [...new Set(videos.map(v => v.level).filter(Boolean))];
    const programs = [...new Set(videos.flatMap(v => v.programs))].sort();

    return res.status(200).json({ videos, total: videos.length, categories, levels, programs });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
