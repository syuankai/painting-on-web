/**
 * Painting on Web - 核心後端 API (v2.0)
 * 處理背景上傳至 KV 以及使用者資料儲存至 D1
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // 安全檢查：確保環境變數存在
  if (!env.DB || !env.SETTINGS_KV) {
    return Response.json({ error: "Missing bindings (DB or KV)" }, { status: 500 });
  }

  // GET: 獲取系統設定或背景
  if (request.method === "GET") {
    if (action === "get-prefs") {
      const background = await env.SETTINGS_KV.get("global_background");
      return Response.json({ background });
    }
    return Response.json({ status: "online", d1: "ready", kv: "ready" });
  }

  // POST: 更新背景或帳戶操作
  if (request.method === "POST") {
    const body = await request.json();

    // 更新背景 (儲存於 KV)
    if (body.action === "set-bg") {
      // 這裡建議在生產環境檢查使用者權限
      await env.SETTINGS_KV.put("global_background", body.data);
      return Response.json({ success: true });
    }

    // 帳戶註冊/登入 (D1 操作)
    if (body.action === "auth") {
      const { username, password } = body;
      // 簡單的 D1 示範
      const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
      
      if (!user) {
        await env.DB.prepare("INSERT INTO users (username, password) VALUES (?, ?)").bind(username, password).run();
        return Response.json({ success: true, mode: "registered" });
      } else {
        if (user.password === password) {
          return Response.json({ success: true, mode: "login" });
        }
        return Response.json({ success: false, message: "Invalid password" }, { status: 401 });
      }
    }
  }

  return new Response("Method not allowed", { status: 405 });
}

