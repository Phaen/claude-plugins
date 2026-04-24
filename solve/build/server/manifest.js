const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.CVdrM6_7.js",app:"_app/immutable/entry/app.DRLtrn2H.js",imports:["_app/immutable/entry/start.CVdrM6_7.js","_app/immutable/chunks/DPswq9oq.js","_app/immutable/chunks/CNkmkiBM.js","_app/immutable/entry/app.DRLtrn2H.js","_app/immutable/chunks/CNkmkiBM.js","_app/immutable/chunks/Dj6f-nJM.js","_app/immutable/chunks/DEDqjojZ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BisE7eWY.js')),
			__memo(() => import('./chunks/1-m9cGzqnY.js')),
			__memo(() => import('./chunks/2-ZsXrTp8k.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/events",
				pattern: /^\/events\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BfFR65gK.js'))
			},
			{
				id: "/session/[id]",
				pattern: /^\/session\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C7K6ymC3.js'))
			},
			{
				id: "/shutdown",
				pattern: /^\/shutdown\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-f_Mtosgr.js'))
			},
			{
				id: "/state",
				pattern: /^\/state\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-1EV4wdJd.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
