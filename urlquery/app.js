'use strict';
const {reports, events, lineage, consoles} = window.URLQUERY;
const $ = id => document.getElementById(id);
const titles = ['Sell initiation','Sell-reference revisit','Buy initiation','Sell launch retry','Sell launch retry','Sell-reference revisit','Sell revisit with key','Error-message canary','HTML canary','Invalid-address canary','Execution control','Initial probes','Simplified requests','Direct endpoints','Read error bodies','Restore key and retry'];
const notes = [
  'Initiation and lookup return HTTP 200. The sell reference first appears in the subsequent transaction-page navigation, then reappears in later submissions.',
  'Revisits the previously observed sell reference. Starts 24 milliseconds before the buy-initiation scan; their first requests overlap for 3.155 seconds.',
  'Runs concurrently with the sell revisit. The buy reference first appears after initiation and later becomes a constant in all five e898 probe programs.',
  'Repeats the original sell launch URL byte for byte. The initiation request returns HTTP 400.',
  'Another exact repeat of the original sell launch URL. The initiation request again returns HTTP 400.',
  'Submits a direct revisit using the earlier sell reference. Recorded lookup requests return HTTP 403.',
  'Another direct revisit with the earlier sell reference and an integration-key parameter. Lookup requests return HTTP 403.',
  'Uses a fake identifier and an e792-marked error-message input. Neither real transaction reference is present in this submitted payload.',
  'Uses an HTML/image canary in a fake-identifier flow. No recorded HTTP overlap with the next scan, despite nearby report dates.',
  'Supplies deliberately invalid address/tag inputs. Initialization returns HTTP 400; neither real transaction reference is present in the payload.',
  'The encoded document writes a title and console marker. This checks the execution mechanism and records no Quidax traffic.',
  'Hard-codes both earlier transaction references. Seven preflight requests return HTTP 403 and all seven console probes report fetch errors.',
  'Removes key/custom headers and tries no-cors POSTs. Some responses are opaque; trailing-slash redirects are recorded. Opaque status 0 does not establish success.',
  'Reuses the preceding helper with a changed log prefix and removes trailing slashes. Some responses remain opaque to the program.',
  'Switches to readable CORS responses. Four console errors explicitly say a public key is required; other probes return 404 or reject.',
  'Restores the key and adds retries. Ten attempts reject; OPTIONS requests show redirects or HTTP 403. Reintroduced slash/preflight issues illustrate imperfect adaptation.'
];
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
  $('count').textContent=`${found.length} of ${reports.length} reports · September 19–20, 2026`;
  $('scan-list').replaceChildren();
  if(!found.length){$('scan-list').append(el('p','No reports match. Try another term or reset the filters.','empty'));$('inspector').replaceChildren(el('p','Choose a matching report to inspect its evidence.','empty'));return}
  if(!found.some(r=>r.report_id===selected))selected=found[0].report_id;
  for(const r of found){const b=el('button',undefined,'scan');b.type='button';b.setAttribute('aria-pressed',r.report_id===selected?'true':'false');b.dataset.report=r.report_id;
    const head=el('div',undefined,'scan-head');head.append(el('span',r.title,'scan-title'),chip(r.markers[0]||'unmarked',r.markers[0]||''));
    const meta=el('div',undefined,'scan-meta');meta.append(el('span',r.first_http_utc.slice(5,10)+' '+clock(r.first_http_utc)),el('span',r.report_id.slice(0,8)),...r.references.map(x=>chip(x,'ref')));
    b.append(head,meta);b.onclick=()=>{selected=r.report_id;render();};$('scan-list').append(b);
  }
  inspect(reports.find(r=>r.report_id===selected));
}
function inspect(r){
  const out=$('inspector');out.replaceChildren();
  history.replaceState(null,'','?report='+encodeURIComponent(r.report_id));
  out.append(chip(r.markers[0]||'unmarked',r.markers[0]||''),el('h3',r.title),el('p',r.report_id,'report-id'),el('p',r.note,'summary'));
  const links=el('div',undefined,'report-links');links.append(link('Source report ↗','https://urlquery.net/report/'+r.report_id,true),link('Center in graph →','graph.html?report='+r.report_id));out.append(links);
  const facts=el('dl',undefined,'facts');for(const [k,v] of [['First HTTP (UTC)',r.first_http_utc.replace('T',' ').replace('Z','')],['Inferred last HTTP end',r.inferred_last_http_end_utc.replace('T',' ').replace('Z','')],['HTTP requests',String(r.http_count)],['Report date (UTC)',r.report_date_utc.replace('T',' ').replace('Z','')]]){const d=el('div');d.append(el('dt',k),el('dd',v));facts.append(d)}out.append(facts);
  const seen=lineage.filter(x=>x.report_id===r.report_id);
  if(seen.length){const d=el('details');d.open=true;d.append(el('summary','Shared transaction state · '+seen.length+' sightings'));
    for(const ref of r.references){const rows=seen.filter(x=>x.reference_alias===ref);const p=el('div',undefined,'outcome');p.append(chip(ref,'ref'),el('p',[...new Set(rows.map(x=>x.evidence_role))].map(x=>x.replaceAll('_',' ')).join('; ')),el('small','First listed source: '+rows[0].json_pointer));d.append(p)}out.append(d)}
  const logs=consoles.filter(x=>x.report_id===r.report_id);
  if(logs.length){const d=el('details');d.open=true;d.append(el('summary','Application console · untimed'));
    for(const c of logs){const p=el('div',undefined,'outcome');p.append(el('span',c.probe_label+' · '+c.outcome+(c.public_key_required?' · Public key is required':'')),el('small',c.json_pointer));d.append(p)}out.append(d)}
  const d=el('details');d.append(el('summary','HTTP requests · '+r.http_count+' events'));const wrap=el('div',undefined,'event-wrap'),table=el('table',undefined,'event-table');const head=el('thead'),hr=el('tr');for(const t of ['Time (UTC)','Method / route','Status'])hr.append(el('th',t));head.append(hr);table.append(head);const body=el('tbody');
  for(const e of events.filter(x=>x.report_id===r.report_id&&x.event_type==='http_request')){const row=el('tr'),route=el('td',e.method+' '+e.route);route.append(el('small',e.json_pointer));row.append(el('td',clock(e.time_utc)),route,el('td',e.status));body.append(row)}table.append(body);wrap.append(table);d.append(wrap);out.append(d);
  out.append(el('p','Source pointers refer to the cached public report JSON. Transaction values and payload code are omitted.','caption'));
}
$('search').oninput=render;$('marker').onchange=render;$('reference').onchange=render;
$('clear').onclick=()=>{$('search').value='';$('marker').value='';$('reference').value='';render()};
render();
