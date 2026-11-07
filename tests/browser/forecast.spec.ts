import { test, expect } from "@playwright/test";

function forecastHistory(id="us") {
  const points=Array.from({length:106},(_,i)=>({
    date:new Date(Date.UTC(2024,9,5)+i*7*86400000).toISOString().slice(0,10),
    close:Math.round((300+Math.sin(i/5)*20+i*.9)*100)/100,
  }));
  return {
    asset:{id,label:id==="btc"?"Bitcoin":"S&P 500",country:id==="btc"?"Digital asset":"United States",
      kind:id==="btc"?"Digital asset":"Equity index",symbol:id==="btc"?"BTC-USD":"^GSPC"},
    points,source:"Synthetic browser fixture — not real market prices",
    accessedAt:"2026-11-08T00:00:00Z",
  };
}

test("forecast lab projects future weekly points, changes horizons and exports provenance",async({page})=>{
  await page.route("**/api/markets?**",async route=>{
    const id=new URL(route.request().url()).searchParams.get("asset")??"us";
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(forecastHistory(id))});
  });
  await page.goto("/forecast");
  await expect(page.getByRole("heading",{name:/The future is/i})).toBeVisible();
  await expect(page.getByText("HISTORICAL INPUT READY")).toBeVisible();
  await expect(page.getByText(/Synthetic browser fixture/)).toBeVisible();
  await expect(page.getByText("12 future weeks")).toBeVisible();
  await expect(page.getByRole("img",{name:/projected future weekly points/i})).toBeVisible();
  await page.getByRole("group",{name:"Forecast horizon"}).getByRole("button",{name:"4W"}).click();
  await expect(page.getByText("4 future weeks")).toBeVisible();
  await page.getByLabel("FORECASTING MODEL").selectOption("random-walk");
  await expect(page.getByText("RANDOM-WALK ERROR")).toBeVisible();
  const event=page.waitForEvent("download");
  await page.getByRole("button",{name:/EXPORT RESEARCH/}).click();
  expect((await event).suggestedFilename()).toBe("bcpd-us-forecast-research.json");
});

test("forecast lab fails visibly when provider history is missing",async({page})=>{
  await page.route("**/api/markets?**",async route=>{
    await route.fulfill({status:503,contentType:"application/json",
      body:JSON.stringify({error:"Synthetic provider outage."})});
  });
  await page.goto("/forecast");
  await expect(page.locator(".fc-empty[role=alert]")).toContainText("Synthetic provider outage.");
  await expect(page.getByRole("button",{name:/RETRY SOURCE/})).toBeVisible();
  await expect(page.getByRole("button",{name:/EXPORT RESEARCH/})).toBeDisabled();
});

test("forecast lab has no horizontal overflow on phone viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route("**/api/markets?**",async route=>{
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(forecastHistory())});
  });
  await page.goto("/forecast");
  await expect(page.getByRole("heading",{name:/The future is/i})).toBeVisible();
  await expect(page.getByText("HISTORICAL INPUT READY")).toBeVisible();
  const overflow=await page.evaluate(()=>
    document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  expect(overflow).toBeFalsy();
});
