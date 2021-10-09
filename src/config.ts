import { Context } from 'probot';
import { plainToClass, Transform, Type } from 'class-transformer';

export class Config {
  jiraHost = 'bugs.funtoo.org';

  @Type(() => PullRequestsConfig)
  pullRequests = new PullRequestsConfig();
}

export class PullRequestsConfig {
  enableClose = true;
  enableComment = true;

  badTicketLabel = 'bad ticket';

  commentMessage = 'Pull requests must be associated with a valid Jira issue!';

  @Transform(({ value }) => new RegExp(value), { toClassOnly: true })
  titlePattern = /^(?<ticket>FL-\d+):.+$/;

  @Transform(({ value }) => new Set<string>(value), { toClassOnly: true })
  validTicketStatuses = new Set<string>(['Ready to Fix', 'In Progress']);
}

export const getConfig = async (context: Context): Promise<Config> =>
  plainToClass(Config, await context.config('funtoo-bot.yml', {}));
