import { initBookshelfFromKnex } from '../../src/db';
import knex from './knex';

const bookshelf = initBookshelfFromKnex(knex);

export default bookshelf;
