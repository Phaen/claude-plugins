//#region src/routes/shutdown/+server.ts
var SHUTDOWN_HTML = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Solve</title></head><body style=\"display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0c0c10;color:#6c7086;font-family:monospace;font-size:14px;\">Server stopped. You can close this tab.</body></html>";
function GET() {
	setTimeout(() => process.exit(0), 100);
	return new Response(SHUTDOWN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export { GET };
//# sourceMappingURL=_server.ts-f_Mtosgr.js.map
