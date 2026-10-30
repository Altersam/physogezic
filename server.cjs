const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const R=require('./room-engine.cjs');
const root=__dirname,rooms=new Map(),dataDir=process.env.FIZ_DATA_DIR||path.join(root,'data'),stateFile=path.join(dataDir,'rooms.json');
const journal=require('./journal.cjs').createJournal(path.join(dataDir,'logs'));
try{const saved=JSON.parse(fs.readFileSync(stateFile,'utf8'));for(const room of saved)if(R.validRoom(room)&&Date.now()-room.updatedAt<7*864e5)rooms.set(room.code,room);}catch(e){if(e.code!=='ENOENT')console.error('Room recovery:',e.message);}
function persist(){fs.mkdirSync(dataDir,{recursive:true});const temp=stateFile+'.tmp';fs.writeFileSync(temp,JSON.stringify([...rooms.values()]));fs.renameSync(temp,stateFile);}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(data));}
function readJSON(req){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>20000){reject(Object.assign(new Error('Слишком большой запрос.'),{status:413}));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(Object.assign(new Error('Некорректный JSON.'),{status:400}));}});req.on('error',reject);});}
function bases(req,port){const ips=Object.entries(os.networkInterfaces()).flatMap(([name,items])=>(items||[]).filter(i=>i.family==='IPv4'&&!i.internal).map(i=>({address:i.address,priority:(/wi-?fi|wireless|wlan|беспровод/i.test(name)?100:50)-(/virtual|vmware|vethernet|wsl|tailscale|zerotier|hamachi|virtualbox/i.test(name)?150:0)-(i.address.startsWith('169.254.')?200:0)}))).sort((a,b)=>b.priority-a.priority).map(i=>i.address);const forwarded=process.env.PUBLIC_BASE_URL||(process.env.CODESPACE_NAME?`https://${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN||'app.github.dev'}`:null);const host=req.headers.host||`localhost:${port}`,scheme=String(req.headers['x-forwarded-proto']||'http').split(',')[0].trim()==='https'?'https':'http';return [...new Set([...(forwarded?[forwarded.replace(/\/$/,'')]:[]),...(!/^(localhost|127\.0\.0\.1)(:|$)/.test(host)?[`${scheme}://${host}`]:[]),...ips.map(ip=>`http://${ip}:${port}`),`http://localhost:${port}`])];}
const server=http.createServer(async(req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost');url.pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
  try{
    if(url.pathname==='/api/server-info'){json(res,200,{urls:bases(req,server.address().port),port:server.address().port,version:4});return;}
    if(url.pathname==='/api/rooms'&&req.method==='POST'){
      if(rooms.size>=200)throw Object.assign(new Error('Слишком много активных комнат.'),{status:429});
      const body=await readJSON(req);let code;do{code=String(crypto.randomInt(100000,1000000));}while(rooms.has(code));
      const room=R.create(body,code);rooms.set(code,room);persist();journal.info(`Room ${code} created (${room.config.mode||'quiz'})`);json(res,201,{code,token:room.hostToken,role:'host'});return;
    }
    const match=url.pathname.match(/^\/api\/rooms\/(\d{6})(?:\/(join|state|control|answer|draw|hint|qr))?$/);
    if(match){const room=rooms.get(match[1]);if(!room){json(res,404,{error:'Комната не найдена. Проверьте шестизначный код.'});return;}
      if(R.tick(room))persist();const action=match[2],token=req.headers['x-room-token']||'';
      if(!action&&req.method==='GET'){json(res,200,{code:room.code,title:room.title,phase:room.phase,count:room.players.length});return;}
      if(action==='join'&&req.method==='POST'){const p=R.join(room,await readJSON(req));persist();json(res,200,{code:room.code,token:p.token,role:'player',id:p.id});return;}
      if(action==='state'&&req.method==='GET'){json(res,200,R.snapshot(room,token));return;}
      if(action==='control'&&req.method==='POST'){const body=await readJSON(req);R.control(room,token,body.action,body.roundId,Date.now(),body);persist();json(res,200,R.snapshot(room,token));return;}
      if(action==='draw'&&req.method==='POST'){R.draw(room,token,await readJSON(req));persist();json(res,200,R.snapshot(room,token));return;}
      if(action==='hint'&&req.method==='POST'){R.hint(room,token);persist();json(res,200,R.snapshot(room,token));return;}
      if(action==='answer'&&req.method==='POST'){const auth=R.authenticate(room,token);if(auth.role!=='player')throw Object.assign(new Error('Ведущий не отвечает за игроков.'),{status:403});R.submit(room,auth.player,await readJSON(req));persist();json(res,200,{ok:true});return;}
      if(action==='qr'&&req.method==='GET'){
        const qr=require('./vendor/qrcode.cjs'),code=qr(0,'M'),base=url.searchParams.get('base')||bases(req,server.address().port)[0];
        if(!/^https?:\/\/[^\s<>"']{1,200}$/.test(base))throw Object.assign(new Error('Некорректный адрес.'),{status:422});
        code.addData(base.replace(/\/$/,'')+'/#room/'+room.code);code.make();res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'}).end(code.createSvgTag({cellSize:6,margin:18,scalable:true}));return;
      }
      json(res,405,{error:'Метод не поддерживается.'});return;
    }
    if(url.pathname.startsWith('/api/')){json(res,404,{error:'Маршрут не найден.'});return;}
    const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    const relative=path.relative(root,file).replace(/\\/g,'/');
    if(!file.startsWith(root+path.sep)||relative.startsWith('data/')||relative.startsWith('tests/')||relative.startsWith('tools/')||!['.html','.css','.js','.png','.webp','.svg'].includes(path.extname(file))){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}).end(data);});
  }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'Не удалось сохранить или обработать комнату.'});if(!error.status){journal.error(error.message);console.error(error);}}
});
const timer=setInterval(()=>{let changed=false;for(const [code,room]of rooms){if(Date.now()-room.updatedAt>7*864e5){rooms.delete(code);changed=true;}else if(R.tick(room))changed=true;}if(changed)try{persist();}catch(e){journal.error(e.message);console.error(e.message);}},500);timer.unref();
server.listen(Number(process.env.PORT)||4173,process.env.HOST||'0.0.0.0',()=>{console.log('Физогэзик: http://localhost:'+server.address().port);for(const url of bases({headers:{host:'localhost'}},server.address().port))console.log('Игрокам: '+url+'/#rooms');});
module.exports={server,rooms};
