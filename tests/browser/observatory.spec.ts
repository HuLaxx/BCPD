import { test, expect } from "@playwright/test";

function mockHistory(id: string) {
  const symbols: Record<string, string> = {us:"^GSPC",btc:"BTC-USD"};
  const asset = {
    id, label:id==="btc"?"Bitcoin":"S&P 500",
    country:id==="btc"?"Digital asset":"United States",
    kind:id==="btc"?"Digital asset":"Equity index",
    symbol:symbols[id]??"^GSPC",
  };
  const initial=Date.UTC(2024,9,5);
  const points=Array.from({length:77},(_,i)=>({
    date:new Date(initial+i*7*86400000).toISOString().slice(0,10),
    close:Math.round((100+i*1.2+12*Math.sin(i/4))*100)/100,
  }));
  return {
    asset,points,source:"Automated synthetic UI fixture — not market data",
    accessedAt:"2026-11-08T00:00:00Z",
  };
}

test("observatory loads real-shaped, source-labeled data and chart modes", async({page})=>{
  await page.route("**/api/markets?**", async route=>{
    const id=new URL(route.request().url()).searchParams.get("asset")??"us";
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(mockHistory(id))});
  });
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/Find the shift/})).toBeVisible();
  await expect(page.getByRole("heading",{name:"S&P 500"})).toBeVisible();
  await expect(page.getByText(/Automated synthetic UI fixture/)).toBeVisible();
  await page.getByRole("button",{name:"RETURN",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Weekly log return"})).toBeVisible();
  await page.getByRole("button",{name:"MODEL RESET",exact:true}).click();
  await expect(page.getByRole("heading",{name:"BOCPD reset probability"})).toBeVisible();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:/EXPORT EVIDENCE/}).click();
  expect((await download).suggestedFilename()).toContain("bcpd-us-historical-evidence.json");
});

test("catalogue navigation changes the active instrument", async({page})=>{
  await page.route("**/api/markets?**", async route=>{
    const id=new URL(route.request().url()).searchParams.get("asset")??"us";
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(mockHistory(id))});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"CRYPTO",exact:true}).click();
  await page.getByRole("button",{name:/Bitcoin/}).click();
  await expect(page.getByRole("heading",{name:"Bitcoin"})).toBeVisible();
  await expect(page.getByText("BTC-USD")).toBeVisible();
});

test("source failure remains honest and offers recovery", async({page})=>{
  await page.route("**/api/markets?**",async route=>{
    await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Provider intentionally unavailable."})});
  });
  await page.goto("/");
  await expect(page.locator(".ob-chart-empty[role=alert]")).toContainText("Provider intentionally unavailable.");
  await expect(page.getByRole("button",{name:/RETRY SOURCE/})).toBeVisible();
});

test("mobile layout remains within viewport and advanced studio is preserved", async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route("**/api/markets?**",async route=>{
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(mockHistory("us"))});
  });
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/Find the shift/})).toBeVisible();
  const hasOverflow=await page.evaluate(
    ()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2
  );
  expect(hasOverflow).toBeFalsy();
  await page.getByRole("link",{name:/OPEN FULL STUDIO/}).first().click();
  await expect(page).toHaveURL(/\/research$/);
  await expect(page.getByText("RESEARCH INTELLIGENCE")).toBeVisible();
});

test("HuLaX project-family identity is linked consistently across pages", async ({page}) => {
  const pages = ["/", "/research", "/methodology", "/privacy"];
  for (const route of pages) {
    await page.goto(route);
    const headerCredit = page.getByRole("link", {
      name: /A Project By HuLaX.*portfolio/i,
    }).first();
    await expect(headerCredit).toBeVisible();
    await expect(headerCredit).toHaveAttribute("href", "https://hulax.vercel.app");
    const footer = page.getByRole("contentinfo",{name:"BCPD One footer"});
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("navigation",{name:"Explore BCPD One"})).toBeVisible();
    await expect(footer.getByRole("link",{name:/Creator portfolio/i})).toHaveAttribute("href","https://hulax.vercel.app");
    await expect(footer.getByRole("link",{name:/BACK TO TOP/i})).toBeVisible();
  }
});

test("mobile HuLaX credit and footer do not overflow narrow screens", async ({page}) => {
  await page.setViewportSize({width:375,height:812});
  await page.goto("/");
  await expect(page.locator(".ob-topbar .hlx-credit")).toBeVisible();
  await expect(page.locator(".hlx-footer-panel")).toBeVisible();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  expect(hasOverflow).toBeFalsy();
});
