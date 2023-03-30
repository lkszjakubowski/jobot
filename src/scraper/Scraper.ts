import Bot from '../bot/Bot';

export default class Scraper {
  // Scrapper should be a set of methods that you could use for navigating through scrapped website.
  bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  async getText(): Promise<string> {
    await this.bot.page.goto('https://www.nerdbord.io/');

    const text: string = await this.bot.page.evaluate(
      () => document.body.innerText
    );

    return text;
  }
}
