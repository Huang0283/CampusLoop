const {chromium}=require('../../frontend/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'output/desktop-images-20261030');
const cat=JSON.parse(fs.readFileSync(path.join(root,'backend/seed_assets/showcase.json'),'utf8'));
const items=cat.products.filter(p=>p.sourceAssetId?.startsWith('desktop-20261030-'));
assert.equal(items.length,15);assert.equal(items.filter(p=>p.category==='DAILY').length,2);assert.equal(items.filter(p=>p.category==='other').length,13);
const base='http://127.0.0.1:5174';
(async()=>{
 const b=await chromium.launch({headless:true}),errors=[],results=[];
 try{
  for(const mobile of [false,true]){
   const ctx=await b.newContext({viewport:mobile?{width:390,height:844}:{width:1720,height:1080},isMobile:mobile,hasTouch:mobile});
   const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
   async function overflow(){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
   for(const category of ['DAILY','other']){
    await p.goto(`${base}/market?category=${category}`);await p.locator('article.product-card').first().waitFor();
    await p.locator('article.product-card').first().scrollIntoViewIfNeeded();
    await p.waitForFunction(()=>Array.from(document.querySelectorAll('article.product-card img')).filter(x=>x.getBoundingClientRect().top<innerHeight).every(x=>x.complete&&x.naturalWidth>0));
    await overflow();await p.screenshot({path:path.join(out,`${mobile?'mobile':'desktop'}-market-${category}.png`)});
    results.push({mobile,category,cards:await p.locator('article.product-card').count()});
   }
   await p.goto(`${base}/market?category=other&page=2`);await p.locator('article.product-card').first().waitFor();await overflow();
   results.push({mobile,category:'other',page:2,cards:await p.locator('article.product-card').count()});
   for(const item of items){
    await p.goto(`${base}/product/${item.id}`);await p.getByRole('heading',{name:item.title,exact:true}).waitFor();
    await p.waitForFunction(()=>document.querySelector('.product-gallery-main img')?.naturalWidth>0);
    assert((await p.locator('.product-gallery-main img').getAttribute('src')).endsWith(item.images[0]));
    assert.equal(await p.locator('.gallery-count').innerText(),'1 / 1');
    assert.equal(await p.getByRole('button',{name:'下一张图片',exact:true}).count(),0);
    assert((await p.locator('.product-description').innerText()).includes(item.description));
    assert((await p.locator('.product-price').innerText()).includes(item.price.toFixed(2)));
    assert.equal(await p.locator('.location-detail strong').innerText(),item.location);await overflow();
    if(['desktop-20261030-photo-diffuser-umbrella','desktop-20261030-pruning-shears'].includes(item.sourceAssetId)){
     await p.screenshot({path:path.join(out,`${mobile?'mobile':'desktop'}-${item.sourceAssetId.split('20261030-')[1]}.png`)});
     await p.reload();await p.getByRole('heading',{name:item.title,exact:true}).waitFor();
     await p.getByRole('button',{name:'联系卖家',exact:true}).click();await p.waitForURL('**/login');
    }
    results.push({mobile,id:item.id,category:item.category,descriptionAndPrice:true});
   }
   await p.goto(`${base}/product/99999999`);await p.getByText('内容不存在或已不可见',{exact:true}).waitFor();
   assert.equal(await p.locator('.product-detail-grid').count(),0);await overflow();
   await ctx.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({site:base,results,errors},null,2));
  console.log(JSON.stringify({results:results.length,products:items.length,viewports:[1720,390],errors}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
