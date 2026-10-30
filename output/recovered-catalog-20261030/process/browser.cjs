const {chromium}=require('../../frontend/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'output/recovered-catalog-20261030');
const cat=JSON.parse(fs.readFileSync(path.join(root,'backend/seed_assets/showcase.json'),'utf8'));
const base='http://127.0.0.1:5174';
const errors=[],results=[];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const mobile of [false,true]){
   const label=mobile?'mobile':'desktop';
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1720,height:1080},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   async function noOverflow(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${label} overflow`);}
   for(const category of ['DAILY','STATIONERY','SPORTS','clothing','FURNITURE']){
    await page.goto(`${base}/market?category=${category}`);
    await page.locator('article.product-card').first().waitFor();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('article.product-card img')).filter(x=>x.getBoundingClientRect().top<innerHeight).every(x=>x.complete&&x.naturalWidth>0));
    await noOverflow();
    if(category==='DAILY'){
     await page.screenshot({path:path.join(out,`${label}-market.png`)});
     if(mobile){await page.locator('article.product-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'mobile-market-products.png')});}
    }
    results.push({mobile,category,cards:await page.locator('article.product-card').count()});
   }
   for(const category of ['DAILY','STATIONERY','SPORTS']){
    const item=cat.products.find(p=>p.sourceAssetId?.startsWith('recovered-20261030-')&&!p.publicationHold&&p.category===category&&p.images.length>1);
    assert(item,category);
    await page.goto(`${base}/product/${item.id}`);
    await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
    const main=page.locator('.product-gallery-main img');
    await page.waitForFunction(()=>document.querySelector('.product-gallery-main img')?.naturalWidth>0);
    assert((await main.getAttribute('src')).endsWith(item.images[0]));
    assert((await page.locator('.product-description').innerText()).includes(item.description));
    assert((await page.locator('.product-price').innerText()).includes(item.price.toFixed(2)));
    assert.equal(await page.locator('.location-detail strong').innerText(),item.location);
    await page.getByRole('button',{name:'下一张图片',exact:true}).click();
    assert((await main.getAttribute('src')).endsWith(item.images[1]));
    await page.getByRole('button',{name:`查看第 ${item.images.length} 张图片`,exact:true}).click();
    assert((await main.getAttribute('src')).endsWith(item.images.at(-1)));
    await page.waitForFunction(()=>document.querySelector('.product-gallery-main img')?.naturalWidth>0);
    assert.equal(await page.locator('.gallery-count').innerText(),`${item.images.length} / ${item.images.length}`);
    await noOverflow();
    await page.screenshot({path:path.join(out,`${label}-detail-${category}.png`)});
    if(mobile&&category==='DAILY'){
     await page.locator('.product-info').scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(out,'mobile-detail-price.png')});
    }
    await page.reload();
    await page.getByRole('heading',{name:item.title,exact:true}).waitFor();
    assert((await main.getAttribute('src')).endsWith(item.images[0]));
    await page.getByRole('button',{name:'联系卖家',exact:true}).click();
    await page.waitForURL('**/login');
    results.push({mobile,product:item.id,galleryImages:item.images.length,reload:true,guestContact:'login'});
   }
   const held=cat.products.find(p=>p.publicationHold&&p.id===1820);
   await page.goto(`${base}/product/${held.id}`);
   await page.getByText('内容不存在或已不可见',{exact:true}).waitFor();
   assert.equal(await page.locator('.product-detail-grid').count(),0);
   await noOverflow();
   results.push({mobile,hiddenProduct:held.id,renderedAsUnavailable:true});
   await context.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({site:base,results,errors},null,2));
  console.log(JSON.stringify({results,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
