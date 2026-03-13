export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ error: 'Missing NOTION_TOKEN or NOTION_DB_ID' });
  }

  try {
    const dbId = NOTION_DB_ID.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const body = { page_size: 100 };
      if (startCursor) body.start_cursor = startCursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: data.message || 'Notion error' });
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    const videos = allResults.map((page) => {
      const p = page.properties;
      const title = p['Name']?.title?.map(t => t.plain_text).join('') || '';
      const youtubeUrl = p['YouTube Video Link']?.url || '';
      const category = p['Category']?.rich_text?.map(t => t.plain_text).join('') || p['Category']?.select?.name || '';
      const level = p['Level']?.select?.name || '';
      const material = p['Material']?.rich_text?.map(t => t.plain_text).join('') || p['Material']?.select?.name || '';
      const notes = p['Notes']?.rich_text?.map(t => t.plain_text).join('') || '';
      const programs = p['Program(s)']?.multi_select?.map(s => s.
