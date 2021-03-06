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
/* eslint-env node, mocha */
/* global $dbConfig */
import _ from 'lodash';

import expect from '../../../test-helpers/expect';
import initBookshelf from '../../../src/db';
import HashtagFactory from '../../../test-helpers/factories/hashtag';
import SchoolFactory from '../../../test-helpers/factories/school';
import GeotagFactory from '../../../test-helpers/factories/geotag';
import PostFactory from '../../../test-helpers/factories/post';
import UserFactory from '../../../test-helpers/factories/user';
import { login } from '../../../test-helpers/api';


const bookshelf = initBookshelf($dbConfig);
const knex = bookshelf.knex;
const Post = bookshelf.model('Post');
const User = bookshelf.model('User');
const Hashtag = bookshelf.model('Hashtag');
const School = bookshelf.model('School');
const Geotag = bookshelf.model('Geotag');

describe('Post', () => {
  describe('Not authenticated user', () => {
    let user;
    let post;

    before(async () => {
      let userAttrs = UserFactory.build();
      user = await User.create(userAttrs.username, userAttrs.password, userAttrs.email);
      post = await new Post(PostFactory.build({user_id: user.id})).save(null, {method: 'insert'});
    });

    after(async () => {
      await post.destroy();
      await user.destroy();
    });

    describe('/api/v1/post/:id', () => {
      describe('when post exists', () => {
        it('responds with post', async () => {
          await expect(
            {url: `/api/v1/post/${post.id}`, method: 'GET'},
            'body to satisfy',
            {id: post.id}
          );
        });
      });

      describe("when post doesn't exist", () => {
        it('responds with post', async () => {
          await expect(
            {url: `/api/v1/post/123`, method: 'GET'},
            'to open not found'
          );
        });
      });
    });

    describe('/api/v1/posts/tag/:name', async () => {
      let hashtag;

      before(async () => {
        hashtag = await post.hashtags().create(HashtagFactory.build());
      });

      after(async () => {
        await hashtag.destroy();
      });

      it('responds with hashtag posts', async () => {
        const name = encodeURIComponent(hashtag.attributes.name);

        await expect(
          {url: `/api/v1/posts/tag/${name}`, method: 'GET'},
          'to have body array length',
          1
        );
      });
    });

    describe('/api/v1/posts/school/:url_name', () => {
      let school;

      before(async () => {
        school = await post.schools().create(SchoolFactory.build());
      });

      after(async () => {
        await post.schools().detach(school);
      });

      it('responds with school posts', async () => {
        const name = encodeURIComponent(school.attributes.url_name);

        await expect(
          {url: `/api/v1/posts/school/${name}`, method: 'GET'},
          'to have body array length',
          1
        );
      });
    });

    describe('/api/v1/posts/geotag/:url_name', () => {
      let geotag;

      before(async () => {
        geotag = await post.geotags().create(GeotagFactory.build());
      });

      after(async () => {
        await post.geotags().detach(geotag);
      });

      it('responds with geotag posts', async () => {
        const name = encodeURIComponent(geotag.attributes.url_name);

        await expect(
          {url: `/api/v1/posts/geotag/${name}`, method: 'GET'},
          'to have body array length',
          1
        );
      });
    });

    describe('/api/v1/posts/liked/:name', () => {
      let postHashtagLike;

      before(async () => {
        postHashtagLike = await new Post(PostFactory.build({type: 'hashtag_like'})).save(null, {method: 'insert'});
      });

      after(async () => {
        await postHashtagLike.destroy();
      });

      it('should not return hashtag_like posts from other authors', async () => {
        await expect(
          {url: `/api/v1/posts/liked/${user.get('username')}`},
          'to have body array length',
          0
        );
      });
    });

    describe('subscriptions', () => {
      let post;
      let user;
      let sessionId;

      async function countPostSubscriptions(user_id, post_id) {
        const result = await knex('post_subscriptions').where({ user_id, post_id }).count();

        return parseInt(result[0].count);
      }

      before(async () => {
        const userAttrs = UserFactory.build();
        user = await new User().save(_.omit(userAttrs, 'password'), { method: 'insert', require: true });
        sessionId = await login(userAttrs.username, userAttrs.password);

        post = await new Post(PostFactory.build({ user_id: user.id })).save(null, { method: 'insert' });
      });

      after(async () => {
        user.destroy();
        post.destroy();
      });

      afterEach(async () => {
        await knex('post_subscriptions').del();
      });

      describe('/api/v1/post/:id/subscribe', () => {
        it('subscribes the current user', async () => {
          await expect(
            {
              session: sessionId,
              url: `/api/v1/post/${post.id}/subscribe`,
              method: 'POST',
              body: {
                action: 'subscribe'
              }
            },
            'to open successfully'
          );

          expect(await countPostSubscriptions(user.id, post.id), 'to be', 1);
        });
      });

      describe('/api/v1/post/:id/unsubscribe', () => {
        it('unsubscribes the current user', async () => {
          await post.subscribers().attach(user.id);

          await expect(
            {
              session: sessionId,
              url: `/api/v1/post/${post.id}/unsubscribe`,
              method: 'POST',
              body: {
                action: 'unsubscribe'
              }
            },
            'to open successfully'
          );

          expect(await countPostSubscriptions(user.id, post.id), 'to be', 0);
        });
      });
    });
  });
});
