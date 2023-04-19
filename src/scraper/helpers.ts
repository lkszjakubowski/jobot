import puppeteer, { Browser, Page } from 'puppeteer';
import LaunchResult from '../interfaces/LaunchResult';

export async function launchPuppeteer(options: object): Promise<LaunchResult> {
  const browser: Browser = await puppeteer.launch(options);
  const page: Page = await browser.newPage();

  return { browser, page };
}

export async function delay(miliseconds: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, miliseconds);
  });
}

export async function navigateTo(url: string, page: Page): Promise<void> {
  console.log(`Navigating to: ${url} ...`);

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.setViewport({ width: 1920, height: 1080 });
}

export async function extractItems(params: {
  page: Page;
  targetSelector: string;
  searchedElementSelector: string;
  searchedElementAttr: string;
}) {
  const items: string[] = await params.page.$$eval(
    params.targetSelector,
    (elements: HTMLElement[]) =>
      elements.map(
        (element) =>
          element.querySelector(params.searchedElementSelector)[
            params.searchedElementAttr
          ]
      )
  );

  return items;
}
