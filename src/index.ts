import 'reflect-metadata';

import { Probot } from 'probot';
import { pullRequests } from './prs';

export = (app: Probot) => {
  pullRequests(app);
};
