"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const ORIGIN = "http://127.0.0.1:4173";
const POLICIES = [
  "coaching-agreement.html", "liability-waiver.html", "recording-consent.html",
  "crisis-policy.html", "cancellation-policy.html", "electronic-signature.html",
  "first-session.html", "privacy.html", "terms.html"
];

async function main() {
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [320, 390, 1280]) {
      const ctx = await browser.newContext({viewport:{width,height:850}, reducedMotion:"reduce"});
      const page = await ctx.newPage();
      const errors=[];
      page.on("pageerror",e=>errors.push(String(e)));
      const response = await page.goto(ORIGIN+"/", {waitUntil:"load",timeout:25000});
      assert.equal(response.status(),200);
      const overflow=await page.evaluate(() => document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(overflow<=5, "Home has horizontal scroll at "+width+"px: "+overflow+"px");
      assert.equal(await page.locator("h1").count(),1);
      assert.equal(await page.locator("main#main").count(),1);
      if (width <= 700) {
        const button=page.locator(".menu-toggle");
        assert.ok(await button.isVisible(), "Menu toggle not visible at mobile width");
        assert.equal(await button.getAttribute("aria-expanded"),"false");
        await button.click();
        assert.equal(await button.getAttribute("aria-expanded"),"true");
        const link=page.locator("#site-nav a[href='policies.html']");
        assert.ok(await link.isVisible(),"Mobile Policies link hidden after expanding menu");
        const bounds=await link.boundingBox();
        assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width+5,"Mobile menu link beyond viewport");
        await link.click();
      } else {
        await page.locator('nav a[href="policies.html"]').first().click();
      }
      await page.waitForLoadState("load");
      assert.match(page.url(),/policies\.html/);
      const listing=page.locator('a[href="privacy.html"]').first();
      assert.ok(await listing.isVisible());
      assert.deepEqual(errors,[]);
      console.log("PASS navigation/layout: "+width+"px; no horizontal overflow; policies reachable");
      await ctx.close();
    }

    const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
    const page=await ctx.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push(String(e)));
    for(const file of POLICIES){
      const response=await page.goto(ORIGIN+"/"+file,{waitUntil:"load",timeout:25000});
      assert.equal(response.status(),200,file);
      assert.equal(await page.locator("main#main").count(),1,file+" missing main landmark target");
      assert.equal(await page.locator(".skip-link[href='#main']").count(),1,file+" missing skip navigation");
      assert.equal(await page.locator("h1").count(),1,file+" expected one h1");
      const button=page.getByRole("button",{name:"Save / Download as PDF"});
      assert.equal(await button.count(),1,file+" printable policy control not present");
      await page.evaluate(() => { window.__printRequests=0; window.print=()=>window.__printRequests++; });
      await button.click();
      assert.equal(await page.evaluate(()=>window.__printRequests),1,file+" did not request browser printing");
      await page.emulateMedia({media:"print"});
      assert.equal(await page.locator('button[onclick="window.print()"]').evaluate(el=>getComputedStyle(el).display),"none",file+" print UI visible in printed document");
      const section=page.locator("main .panel").first();
      assert.equal(await section.evaluate(el=>getComputedStyle(el).opacity),"1",file+" printable policy hidden by reveal opacity");
      assert.ok((await section.innerText()).length>120,file+" policy content missing");
      await page.emulateMedia({media:"screen"});
      const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(over<=5,file+" mobile horizontal overflow "+over+"px");
      console.log("PASS policy print: "+file+" (button, print-media visibility, mobile content)");
    }
    assert.deepEqual(errors,[]);
    await ctx.close();
    console.log("PASS: all Thorns2Roses local browser checks; no external coaching forms submitted");
  } finally {await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
