'use strict';
const {reports, events, lineage, consoles} = window.URLQUERY;
const $ = id => document.getElementById(id);
const titles = ["Start a sell", "Reopen the sell", "Start a buy", "Retry the sell", "Retry the sell again", "Reopen the sell", "Reopen the sell with a key", "Test: fake error message", "Test: injected HTML", "Test: invalid address", "Test: does code run?", "Probe 1: seven API calls", "Probe 2: simpler requests", "Probe 3: fix the URLs", "Probe 4: read the errors", "Probe 5: add the key back"];
const notes = [
  "Starts a sell transaction on Quidax. The request succeeds (HTTP 200), and the next page the browser loads contains a sell transaction ID. That ID reappears in later scans.",
  "Opens the sell transaction from the first scan directly by its ID. It started 24 milliseconds before the next scan, and the two ran at the same time for about 3 seconds.",
  "Starts a buy transaction while the previous scan is still running. The page that follows contains a buy transaction ID, which all five final probes later have typed in.",
  "Resubmits the exact URL from the first sell scan. This time Quidax rejects it (HTTP 400).",
  "Submits the same URL again and gets the same rejection (HTTP 400).",
  "Opens the earlier sell transaction by its ID. Quidax refuses (HTTP 403).",
  "Same as the previous scan, with an API key added to the URL. Quidax still refuses (HTTP 403).",
  "Uses a made-up transaction ID and a tagged error-message field. Neither real transaction ID appears in the program.",
  "Puts a tagged bit of HTML and an image into the flow, again with a made-up transaction ID. Its report time is 2 seconds from the next scan, but their web requests don’t overlap.",
  "Supplies a deliberately invalid wallet address and tag. Quidax rejects it (HTTP 400). Neither real transaction ID appears in the program.",
  "A tiny program that only sets the page title and prints one console line. It checks that URLQuery will run submitted code and never contacts Quidax.",
  "The first program with both real transaction IDs typed in, submitted more than two hours after they first appeared. It calls seven Quidax API endpoints. The browser’s permission check before each call (a CORS preflight) gets HTTP 403, and all seven calls fail.",
  "Removes the API key and custom headers that triggered those permission checks, and sends requests in a mode that can’t read the replies (no-cors). Some URLs get redirected to drop a trailing slash. Because the program can’t read replies, it can’t tell whether anything worked.",
  "Nearly the same code, with a new log label and the trailing slashes removed to match probe 2’s redirects. Replies are still unreadable.",
  "Switches back to a mode that can read replies. Four replies say a public key is required. The others return 404 or fail.",
  "Adds the public key back, as probe 4’s errors asked, and retries each call. All ten attempts fail, with redirects or HTTP 403 on the permission checks. Some problems fixed in probes 2 and 3 come back, so the program doesn’t improve cleanly."
];
const roles={scanner_request_contains_reference:'Seen in a request the scanner made',submitted_literal_observed_by_first_navigation:'Typed into the submitted program'};
reports.forEach((r,i)=>{r.title=titles[i];r.note=notes[i];r.references=[...new Set(lineage.filter(l=>l.report_id===r.report_id).map(l=>l.reference_alias))]});
let selected = new URLSearchParams(location.search).get('report') || reports[11].report_id;
if(!reports.some(r=>r.report_id===selected))selected=reports[11].report_id;
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n}
function chip(text,kind){return el('span',text,'chip '+kind)}
function clock(value){return value.slice(11,23)}
function link(text,href,external=false){const a=el('a',text);a.href=href;if(external){a.target='_blank';a.rel='noopener noreferrer'}return a}
function render(){
  const q=$('search').value.toLowerCase(), marker=$('marker').value, reference=$('reference').value;
  const found=reports.filter(r=>(!marker||(r.markers[0]||'unmarked')===marker)&&(!reference||r.references.includes(reference))&&(!q||[r.report_id,r.title,r.note,...r.markers,...r.references].join(' ').toLowerCase().includes(q)));
  $('count').textContent=`${found.length} of ${reports.length} scans · September 19–20, 2026`;
  $('scan-list').replaceChildren();
  if(!found.length){$('scan-list').append(el('p','No scans match. Try another term or reset the filters.','empty'));$('inspector').replaceChildren(el('p','Pick a matching scan to see its details.','empty'));return}
  if(!found.some(r=>r.report_id===selected))selected=found[0].report_id;
  for(const r of found){const b=el('button',undefined,'scan');b.type='button';b.setAttribute('aria-pressed',r.report_id===selected?'true':'false');b.dataset.report=r.report_id;
    const head=el('div',undefined,'scan-head');head.append(el('span',r.title,'scan-title'),chip(r.markers[0]||'no tag',r.markers[0]||''));
    const meta=el('div',undefined,'scan-meta');meta.append(el('span',r.first_http_utc.slice(5,10)+' '+clock(r.first_http_utc)),el('span',r.report_id.slice(0,8)),...r.references.map(x=>chip(x,'ref')));
    b.append(head,meta);b.onclick=()=>{selected=r.report_id;render();};$('scan-list').append(b);
  }
  inspect(reports.find(r=>r.report_id===selected));
}
function inspect(r){
  const out=$('inspector');out.replaceChildren();
  history.replaceState(null,'','?report='+encodeURIComponent(r.report_id));
  out.append(chip(r.markers[0]||'no tag',r.markers[0]||''),el('h3',r.title),el('p',r.report_id,'report-id'),el('p',r.note,'summary'));
  const links=el('div',undefined,'report-links');links.append(link('URLQuery report ↗','https://urlquery.net/report/'+r.report_id,true),link('Show in graph →','graph.html?report='+r.report_id));out.append(links);
  const facts=el('dl',undefined,'facts');for(const [k,v] of [['First request (UTC)',r.first_http_utc.replace('T',' ').replace('Z','')],['Last request ended (estimated)',r.inferred_last_http_end_utc.replace('T',' ').replace('Z','')],['Web requests',String(r.http_count)],['Report timestamp (UTC)',r.report_date_utc.replace('T',' ').replace('Z','')]]){const d=el('div');d.append(el('dt',k),el('dd',v));facts.append(d)}out.append(facts);
  const seen=lineage.filter(x=>x.report_id===r.report_id);
  if(seen.length){const d=el('details');d.open=true;d.append(el('summary','Reused transaction IDs · '+seen.length+' sightings'));
    for(const ref of r.references){const rows=seen.filter(x=>x.reference_alias===ref);const p=el('div',undefined,'outcome');p.append(chip(ref,'ref'),el('p',[...new Set(rows.map(x=>x.evidence_role))].map(x=>roles[x]||x.replaceAll('_',' ')).join('; ')),el('small','Location in report JSON: '+rows[0].json_pointer));d.append(p)}out.append(d)}
  const logs=consoles.filter(x=>x.report_id===r.report_id);
  if(logs.length){const d=el('details');d.open=true;d.append(el('summary','Console output from the program (no timestamps)'));
    for(const c of logs){const p=el('div',undefined,'outcome');p.append(el('span',c.probe_label+' · '+c.outcome+(c.public_key_required?' · Public key is required':'')),el('small',c.json_pointer));d.append(p)}out.append(d)}
  const d=el('details');d.append(el('summary','All web requests · '+r.http_count));const wrap=el('div',undefined,'event-wrap'),table=el('table',undefined,'event-table');const head=el('thead'),hr=el('tr');for(const t of ['Time (UTC)','Request','Status'])hr.append(el('th',t));head.append(hr);table.append(head);const body=el('tbody');
  for(const e of events.filter(x=>x.report_id===r.report_id&&x.event_type==='http_request')){const row=el('tr'),route=el('td',e.method+' '+e.route);route.append(el('small',e.json_pointer));row.append(el('td',clock(e.time_utc)),route,el('td',e.status));body.append(row)}table.append(body);wrap.append(table);d.append(wrap);out.append(d);
  out.append(el('p','Locations point into the public report JSON. Transaction IDs and program code are left out.','caption'));
}
$('search').oninput=render;$('marker').onchange=render;$('reference').onchange=render;
$('clear').onclick=()=>{$('search').value='';$('marker').value='';$('reference').value='';render()};
render();
