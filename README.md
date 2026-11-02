# Yasine Khamassi: portfolio

AI engineer in Dubai building autonomous agents, multi-step workflows and production LLM applications, with a background in cyber security.

- **Live:** https://yasine-khamassi.vercel.app
- **LinkedIn:** https://www.linkedin.com/in/yasine-khamassi-8662a43a2/
- **GitHub:** https://github.com/Yasine-Khamassi

## What's on the page
- **Hero:** a simulated perimeter in canvas. Visitors can forge a webhook, flood the API, read someone else's order or hijack an AI agent, and watch which control stops it. Nothing leaves the browser.
- **AI engineering:** a replay of the multi-agent coding coordinator handling a failing task, a trace of a question through the ATT&CK Analyst Assistant's RAG pipeline with its real eval numbers, and a description of the store platform. English by default, with an Arabic toggle on the chats.
- **Security:** animated diagrams of five production systems, and the AI security lab with results that flip between attack and defence.
- **Skills:** real logos from [Simple Icons](https://simpleicons.org/) (CC0) and line icons from [Lucide](https://lucide.dev/) (ISC), inlined as an SVG sprite.

## Tech
Static site with no build step and no third-party scripts: plain HTML, CSS and JavaScript on Vercel.

```
index.html                 markup and the icon sprite
styles.css                 tokens, layout, motion
app.js                     canvas simulation, scroll story, RAG trace, lab switch
vercel.json                security headers (CSP, HSTS and others)
.well-known/security.txt   how to report a problem
og.png, favicon.svg        share image and icon
```

Motion respects `prefers-reduced-motion`, and the content stays readable without JavaScript.

Run it locally:

```bash
python -m http.server 8765
```

