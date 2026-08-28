const json = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
};

const cleanName = value => String(value || "")
  .normalize("NFKC")
  .replace(/[<>\u0000-\u001f]/g, "")
  .trim()
  .slice(0, 18);

const config = () => ({
  url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ""
});

const headers = key => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json"
});

const uniqueBest = rows => {
  const players = new Map();
  for (const row of rows) {
    const name = cleanName(row.name);
    const id = name.toLocaleLowerCase("pt-BR");
    const score = Math.max(0, Number(row.score) || 0);
    const current = players.get(id);
    if (name && (!current || score > current.score)) players.set(id, { name, score, hits: Math.max(0, Number(row.hits) || 0) });
  }
  return [...players.values()].sort((a, b) => b.score - a.score).slice(0, 10);
};

export default async function handler(request, response) {
  const { url, key } = config();
  if (!url || !key) return json(response, 503, { error: "Ranking ainda não configurado." });

  try {
    if (request.method === "GET") {
      const result = await fetch(`${url}/rest/v1/scores?select=name,score,hits&order=score.desc&limit=500`, { headers: headers(key) });
      if (!result.ok) throw new Error(`Supabase GET ${result.status}`);
      return json(response, 200, uniqueBest(await result.json()));
    }

    if (request.method === "POST") {
      const name = cleanName(request.body?.name);
      const score = Math.floor(Number(request.body?.score));
      const hits = Math.floor(Number(request.body?.hits));
      if (name.length < 2 || !Number.isFinite(score) || score < 0 || score > 1000000 || !Number.isFinite(hits) || hits < 0 || hits > 10000) {
        return json(response, 400, { error: "Pontuação inválida." });
      }
      const result = await fetch(`${url}/rest/v1/scores`, {
        method: "POST",
        headers: { ...headers(key), Prefer: "return=minimal" },
        body: JSON.stringify({ name, score, hits })
      });
      if (!result.ok) throw new Error(`Supabase POST ${result.status}`);
      return json(response, 201, { ok: true });
    }

    response.setHeader("Allow", "GET, POST");
    return json(response, 405, { error: "Método não permitido." });
  } catch (error) {
    console.error(error);
    return json(response, 502, { error: "Não foi possível acessar o ranking." });
  }
}

