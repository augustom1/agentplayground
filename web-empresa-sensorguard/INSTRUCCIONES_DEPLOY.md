# Deploy — guardtech.agentplayground.net

Instrucciones para la sesión de Claude Code abierta en el servidor / carpeta del proyecto web.
El diseño ya está hecho: `index.html` (página completa, autocontenida) + `DISENO.md` (especificación).

## Prompt sugerido para la otra sesión

> Tengo en esta carpeta el diseño terminado de la página de GuardTech Solutions (`index.html` y
> `DISENO.md`). Quiero que la publiques como `guardtech.agentplayground.net` en este servidor,
> igual que ya está publicado `sensorguard.agentplayground.net`:
> 1. Crear el vhost/subdominio en el servidor web que ya usa agentplayground.net (nginx/caddy/apache — detectalo) y el registro DNS si hace falta.
> 2. Servir `index.html` como sitio estático con HTTPS (certbot/Let's Encrypt o el mecanismo que ya use el servidor).
> 3. Configurar el reverse proxy `POST /api/chat` → `http://127.0.0.1:11434/api/chat` (Ollama local) en ese mismo vhost.
> 4. Verificar que Ollama esté corriendo y tenga el modelo `llama3.2:3b` (`ollama pull llama3.2:3b`); si no está instalado, instalarlo como servicio.
> 5. Probar: la página carga por HTTPS, el chatbot responde usando Ollama, y si Ollama está caído el chat sigue respondiendo con los fallbacks.

## Referencia técnica

### nginx (ejemplo de vhost)

```nginx
server {
    server_name guardtech.agentplayground.net;
    root /var/www/guardtech;          # contiene index.html
    index index.html;

    location /api/chat {
        # Solo POST hacia Ollama local
        if ($request_method != POST) { return 405; }
        proxy_pass http://127.0.0.1:11434/api/chat;
        proxy_http_version 1.1;
        proxy_read_timeout 120s;       # los modelos chicos en CPU pueden tardar
        client_max_body_size 32k;      # limita el payload del chat
    }

    location / {
        try_files $uri $uri/ =404;
    }
    # HTTPS: gestionar con certbot --nginx -d guardtech.agentplayground.net
}
```

### Configuración del chatbot en `index.html`

Objeto `CHATBOT_CONFIG` al inicio del `<script>`:
- `endpoint`: `/api/chat` (relativo — no tocar si se usa el proxy de arriba)
- `model`: `llama3.2:3b` (cambiar si el servidor tiene otro modelo; con poca RAM probar `qwen2.5:1.5b`)
- `systemPrompt`: conocimiento del producto. Editar ahí si cambian features/contacto.

### Checklist de verificación

- [ ] `curl -s -X POST https://guardtech.agentplayground.net/api/chat -H 'Content-Type: application/json' -d '{"model":"llama3.2:3b","stream":false,"messages":[{"role":"user","content":"hola"}]}'` responde JSON con `message.content`
- [ ] Página responsive OK en 375px y escritorio
- [ ] El link "Ver demo en vivo" abre sensorguard.agentplayground.net
- [ ] Chat responde en español y con datos del producto
- [ ] Con Ollama detenido, el chat responde con fallbacks (no se rompe)

### Cambio de nombre de empresa (si el equipo decide otro)

Buscar y reemplazar `GuardTech` / `GuardTech Solutions` en `index.html` (título, nav, hero,
empresa, footer, system prompt del chatbot) y renombrar el subdominio.
