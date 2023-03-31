import puppeteer, { Browser, Page } from 'puppeteer';

export default class Bot {
  // Logic should be encapsulated in bot class body
  browser: Browser;
  page: Page;

  async init(): Promise<void> {
    this.browser = await puppeteer.launch();
    this.page = await this.browser.newPage();
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}
