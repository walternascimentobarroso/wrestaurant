from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.config import settings

router = APIRouter(tags=["home"])

HOME_HTML = """<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{app_name}</title>
  <style>
    :root {{
      color-scheme: light dark;
      --bg: #0f1419;
      --card: #1a2332;
      --border: #2d3a4f;
      --text: #e8edf4;
      --muted: #8b9cb3;
      --accent: #3d9a6a;
      --accent-hover: #4db87d;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }}
    main {{
      width: 100%;
      max-width: 28rem;
    }}
    h1 {{
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }}
    p {{
      color: var(--muted);
      font-size: 0.95rem;
      margin-bottom: 1.75rem;
      line-height: 1.5;
    }}
    ul {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }}
    a {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      color: var(--text);
      text-decoration: none;
      font-weight: 500;
      transition: border-color 0.15s, background 0.15s;
    }}
    a:hover {{
      border-color: var(--accent);
      background: #1f2b3d;
    }}
    a span.label {{ font-size: 1rem; }}
    a span.hint {{
      font-size: 0.8rem;
      color: var(--muted);
      font-weight: 400;
    }}
    a .arrow {{
      color: var(--accent);
      font-size: 1.25rem;
      flex-shrink: 0;
    }}
    a:hover .arrow {{ color: var(--accent-hover); }}
  </style>
</head>
<body>
  <main>
    <h1>{app_name}</h1>
    <p>API do sistema de gestão do restaurante. Escolha um destino abaixo.</p>
    <ul>
      <li>
        <a href="/api/health">
          <span>
            <span class="label">Health check</span><br>
            <span class="hint">GET /api/health</span>
          </span>
          <span class="arrow" aria-hidden="true">→</span>
        </a>
      </li>
      <li>
        <a href="/docs">
          <span>
            <span class="label">Documentação (Swagger)</span><br>
            <span class="hint">Interface interativa da API</span>
          </span>
          <span class="arrow" aria-hidden="true">→</span>
        </a>
      </li>
      <li>
        <a href="/redoc">
          <span>
            <span class="label">Documentação (ReDoc)</span><br>
            <span class="hint">Referência em formato leitura</span>
          </span>
          <span class="arrow" aria-hidden="true">→</span>
        </a>
      </li>
    </ul>
  </main>
</body>
</html>
"""


@router.get("/", response_class=HTMLResponse, include_in_schema=False)
def home() -> HTMLResponse:
    return HTMLResponse(HOME_HTML.format(app_name=settings.app_name))
