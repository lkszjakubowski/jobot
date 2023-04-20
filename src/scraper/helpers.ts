import puppeteer, { Browser, Page } from 'puppeteer';
import { Cluster } from 'puppeteer-cluster';
import LaunchResult from '../interfaces/LaunchResult';
import { TaskFunction } from 'puppeteer-cluster/dist/Cluster';

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
    (elements: HTMLElement[], selector, attribute) => {
      return elements.map(
        (element) => element.querySelector(selector)[attribute]
      );
    },
    params.searchedElementSelector,
    params.searchedElementAttr
  );

  return items;
}

export async function crawlMultiple(params: {
  pages: string[];
  scrapingFunction: TaskFunction<string, void>;
}) {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    monitor: true,
  });

  cluster.on('taskerror', (err, data) => {
    console.log(`Error crawling ${data}: ${err.message}`);
  });

  for (const page of params.pages) {
    cluster.queue(page, params.scrapingFunction);
  }

  await cluster.idle();
  await cluster.close();
}
