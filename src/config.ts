import { Context } from 'probot';
import { plainToClass, Transform } from 'class-transformer';

export class Config {
  jiraHost = 'bugs.funtoo.org';

  badTicketLabel = 'bad ticket';

  @Transform(({ value }) => new RegExp(value), { toClassOnly: true })
  prTitlePattern = /^(?<ticket>FL-\d+):.+$/;

  @Transform(({ value }) => new Set<string>(value), { toClassOnly: true })
  validTicketStatuses = new Set<string>(['Ready to Fix', 'In Progress']);
}

export const getConfig = async (context: Context): Promise<Config> =>
  plainToClass(Config, await context.config('funtoo-bot.yml', {}));
