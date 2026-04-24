import hljs from 'highlight.js';
import { Marked } from 'marked';

const marked = new Marked({
	renderer: {
		code({ text, lang }) {
			const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
			return (
				'<pre><code class="hljs language-' +
				language +
				'">' +
				hljs.highlight(text, { language }).value +
				'</code></pre>'
			);
		}
	},
	gfm: true,
	breaks: false
});

export function md(text: string | null | undefined): string {
	if (!text) return '';
	return marked.parse(text) as string;
}
