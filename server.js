/*
 This file is a part of libertysoil.org website
 Copyright (C) 2015  Loki Education (Social Enterprise)

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/*eslint-env node */
import fs, { accessSync } from 'fs';

import Koa from 'koa';
import session from 'koa-generic-session';
import redisStore from 'koa-redis';
import convert from 'koa-convert';
import cors from 'kcors';
import bodyParser from 'koa-bodyparser';
import mount from 'koa-mount';
import chokidar from 'chokidar';
import Logger, { createLogger } from 'bunyan';
import createRequestLogger from './src/utils/bunyan-koa-request';

import { initApi } from './src/routing';
import initBookshelf from './src/db';
import initSphinx from './src/sphinx';

import db_config from './knexfile';


const exec_env = process.env.DB_ENV || 'development';

const streams = [];

if (exec_env !== 'test') {
  streams.push({
    stream: process.stderr,
    level: 'info'
  });
}

try {
  accessSync('/var/log', fs.W_OK);

  streams.push({
    type: 'rotating-file',
    path: '/var/log/libertysoil.log',
    level: 'warn',
    period: '1d',   // daily rotation
    count: 3        // keep 3 back copies
  });
} catch (e) {
  // do nothing
}

export const logger = createLogger({
  name: "libertysoil",
  serializers: Logger.stdSerializers,
  src: true,
  streams
});

const app = new Koa();
app.logger = logger;

const knexConfig = db_config[exec_env];
const bookshelf = initBookshelf(knexConfig);
const sphinx = initSphinx();
const api = initApi(bookshelf, sphinx);

app.on('error', (e) => {
  logger.warn(e);
});

if (exec_env === 'development') {
  logger.level('debug');

  // Taken from https://github.com/glenjamin/ultimate-hot-reloading-example/blob/master/server.js

  // Do "hot-reloading" of express stuff on the server
  // Throw away cached modules and re-require next time
  // Ensure there's no important state in there!
  const watcher = chokidar.watch('./src');
  watcher.on('ready', function () {
    watcher.on('all', function () {
      logger.debug('Clearing /src/api/ cache from server');
      Object.keys(require.cache).forEach(function (id) {
        if (/\/src\/api\//.test(id)) delete require.cache[id];
      });
    });
  });
}

app.keys = ['libertysoil'];

app.use(cors({
  allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
}));

app.use(bodyParser());  // for parsing application/x-www-form-urlencoded

app.use(convert(session({
  store: redisStore(
    {
      host: '127.0.0.1',
      port: 6379
    }
  ),
  key: 'connect.sid',
  cookie: { signed: false }
})));

app.use(createRequestLogger({ level: 'info', logger }));

app.use(mount('/api/v1', api));

export default app;
