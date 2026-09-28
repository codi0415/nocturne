import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".webmanifest":"application/manifest+json", ".svg":"image/svg+xml", ".woff2":"font/woff2" };
createServer(async (request,response)=>{try{let pathname=new URL(request.url??"/","http://localhost").pathname;if(basePath&&pathname.startsWith(basePath))pathname=pathname.slice(basePath.length)||"/";let file=normalize(join(root,decodeURIComponent(pathname)));if(!file.startsWith(root))throw new Error("outside root");if(pathname.endsWith("/"))file=join(file,"index.html");else{try{if((await stat(file)).isDirectory())file=join(file,"index.html")}catch{if(!extname(file))file=join(file,"index.html")}}const body=await readFile(file);response.writeHead(200,{"content-type":mime[extname(file)]??"application/octet-stream","cache-control":"no-store"});response.end(body)}catch{response.writeHead(404,{"content-type":"text/plain"});response.end("Not found")}}).listen(3000,"127.0.0.1",()=>console.log("Nocturne static preview: http://127.0.0.1:3000"));
