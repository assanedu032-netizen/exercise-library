export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.NOTION_DB_ID;
  if (!TOKEN || !DB) return res.status(500).json({ error: 'Missing NOTION_TOKEN or NOTION_DB_ID' });
  try {
    const id = DB.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    const r = await fetch(`https://api.notion.com/v1/databases/${id}/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 100 }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.message });
    const videos = data.results.map(page => {
      const p = page.properties;
      const url = p['YouTube Video Link']?.url || '';
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return {
        id: page.id,
        title: p['Name']?.title?.map(t => t.plain_text).join('') || '',
        category: p['Category']?.rich_text?.map(t => t.plain_text).join('') || p['Category']?.select?.name || '',
        level: p['Level']?.select?.name || '',
        material: p['Material']?.rich_text?.map(t => t.plain_text).join('') || '',
        notes: p['Notes']?.rich_text?.map(t => t.plain_text).join('') || '',
        programs: p['Program(s)']?.multi_select?.map(s => s.name) || [],
        youtube_id: match ? match[1] : '',
      };
    }).filter(v => v.title && v.youtube_id);
    const categories = [...new Set(videos.map(v => v.category).filter(Boolean))].sort();
    const levels = [...new Set(videos.map(v => v.level).filter(Boolean))];
    const programs = [...new Set(videos.flatMap(v => v.programs))].sort();
    return res.status(200).json({ videos, total: videos.length, categories, levels, programs });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
