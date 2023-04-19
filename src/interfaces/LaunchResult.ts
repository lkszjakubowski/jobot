import { Browser, Page } from 'puppeteer';

export default interface LaunchResult {
  browser: Browser;
  page: Page;
}
