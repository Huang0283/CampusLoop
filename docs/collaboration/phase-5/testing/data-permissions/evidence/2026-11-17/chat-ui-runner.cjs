const {chromium,expect}=require('../../frontend/node_modules/@playwright/test');
const fs=require('fs');const {randomUUID}=require('crypto');
const api='http://127.0.0.1:18025',ui='http://127.0.0.1:5185';
const result={softwareSha:'9713c8cc1adcf23b8214a29128ef00ca3362332c',api,ui,checks:[]};
(async()=>{const browser=await chromium.launch();try{
const contexts=[];const actors=[];
for(const alias of ['Seller47','Buyer47','Outsider47']){
const context=await browser.newContext();contexts.push(context);
const r=await context.request.post(api+'/auth/register',{headers:{Origin:ui,'X-CampusLoop-Browser':'1'},data:{email:`chat-${randomUUID()}@example.invalid`,password:randomUUID()+'Aa1!',nickname:alias}});expect(r.status()).toBe(201);actors.push((await r.json()).data);
}
async function call(actor,method,path,data){const r=await contexts[actor].request.fetch(api+path,{method,headers:{Authorization:'Bearer '+actors[actor].accessToken,'Idempotency-Key':randomUUID()},data});expect(r.ok()).toBeTruthy();return r.status()===204?null:(await r.json()).data;}
const pic=fs.readFileSync(require('path').join(__dirname,'../../tests/collaboration/phase-5/data-permissions/media/M05.png'));
const upload=await contexts[0].request.post(api+'/uploads/images?purpose=product',{headers:{Authorization:'Bearer '+actors[0].accessToken},multipart:{file:{name:'test.png',mimeType:'image/png',buffer:pic}}});expect(upload.status()).toBe(201);const image=(await upload.json()).data.url;
const ids=[];
for(let i=0;i<2;i++){
const product=await call(0,'POST','/products',{title:'C47 Book '+i,category:'BOOKS',condition:'GOOD',price:50+i,campusLocation:'Library',description:'C47 isolated test',images:[image]});
const session=await call(1,'POST','/chat/sessions',{productId:product.id});ids.push(session.id);
await call(1,'POST',`/chat/sessions/${session.id}/messages`,{clientMsgId:randomUUID(),kind:'TEXT',content:'C47 message '+i});
const offer=await call(1,'POST',`/chat/sessions/${session.id}/offers`,{amount:40+i});const accepted=await call(0,'POST',`/offers/${offer.id}/accept`);expect(accepted.order.product.id).toBe(product.id);expect(accepted.order.amount).toBe(40+i);
result.checks.push({product:product.id,session:session.id,order:accepted.order.id,amount:accepted.order.amount});
}
const page=await contexts[1].newPage();
for(const width of [1440,390]){
await page.setViewportSize({width,height:900});await page.goto(ui+'/chat');
const contact=page.locator('.chat-session');await expect(contact).toHaveCount(1);await contact.click();
for(let i=0;i<2;i++){
const selector=page.getByRole('combobox',{name:'选择沟通商品或求购'});await selector.focus();await selector.press('ArrowDown');await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content').getByText('C47 Book '+i,{exact:true}).click();
await expect(page).toHaveURL(new RegExp('/chat/'+ids[i]+'$'));await expect(page.getByText('C47 message '+i,{exact:true})).toBeVisible();
}
await page.reload();await expect(page.getByText('C47 message 1',{exact:true})).toBeVisible();
result.checks.push({width,mergedContactCount:1,productSwitchAndReload:'passed'});
}
await contexts[1].request.post(api+'/auth/logout',{headers:{Origin:ui,'X-CampusLoop-Browser':'1'}});
const other=await contexts[1].newPage();await other.goto(ui+'/register');
await other.getByLabel('校园邮箱',{exact:true}).fill(`switch-${randomUUID()}@example.invalid`);await other.getByLabel('昵称',{exact:true}).fill('Switched47');await other.getByLabel('密码',{exact:true}).fill(randomUUID()+'Aa1!');await other.getByRole('button',{name:'注册并登录',exact:true}).click();await expect(other).toHaveURL(/\/market$/);
await page.reload();await expect(page.getByText('C47 message 1',{exact:true})).toHaveCount(0);await expect(page.getByText('C47 message 0',{exact:true})).toHaveCount(0);
const outsider=await contexts[2].newPage();await outsider.goto(ui+'/chat/'+ids[0]);await expect(outsider.getByText('C47 message 0',{exact:true})).toHaveCount(0);
result.checks.push({accountSwitch:'old private messages absent',outsider:'private messages absent'});result.outcome='passed';
}catch(e){result.outcome='failed';result.error=e.message;}finally{await browser.close();fs.writeFileSync(__dirname+'/chat-ui-results.json',JSON.stringify(result,null,2));console.log(result.outcome,result.error||'');}})();
