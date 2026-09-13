'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'downloads/app-version.json'),'utf8'));
test('Android update manifest has a bounded version and official download',()=>{
  assert.equal(manifest.schemaVersion,1);assert.equal(manifest.applicationId,'top.syuct.timetable');
  assert.ok(Number.isInteger(manifest.versionCode)&&manifest.versionCode>0&&manifest.versionCode<=2147483647);
  assert.match(manifest.versionName,/^[0-9][0-9A-Za-z.+-]{0,39}$/);
  assert.equal(manifest.apkUrl,'https://www.syuct.top/downloads/SYUCT-Timetable.apk');
  assert.equal(typeof manifest.notes,'string');assert.ok(manifest.notes.length<=1000);
});
test('Update metadata matches the actual website APK',()=>{
  const apk=path.join(root,'downloads/SYUCT-Timetable.apk');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'),manifest.sha256,'Update JSON and APK must be published together');
  const ui=execFileSync('unzip',['-p',apk,'assets/index.html'],{encoding:'utf8'});
  assert.ok(ui.includes('化大课表 <span>'+manifest.versionName.split('-')[0]+' α</span>'),'Packaged version differs from website metadata');
});
test('The update endpoint is not configured for long-lived caching',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,'edgeone.json'),'utf8'));
  assert.ok(config.headers.some(rule=>rule.source==='/downloads/*'&&rule.headers.some(h=>h.key.toLowerCase()==='cache-control'&&/no-cache|no-store/.test(h.value))));
});
