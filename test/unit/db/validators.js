/*eslint-env node, mocha */
import expect from 'unexpected';
import Checkit from 'checkit';

import { User as UserValidators } from '../../../src/db/validators';

describe('UserValidators', function() {

  it('FAILS for specific attributes', async function() {
    let attributes = {
      username: '#abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz', // 49
      password: 'test',
      email: 'test',
      firstName: 'test',
      lastName: 'test'
    };
    let checkit = new Checkit(UserValidators.registration);
    try {
      await checkit.run(attributes);
    } catch (err) {

      return expect(err.toJSON(), 'to equal', {
        username: ['The username must not exceed 31 characters long',
                   'Username can contain letters a-z, numbers 0-9, dashes (-), underscores (_), apostrophes (\'), and periods (.)'
                  ],
        password: ['Password is min. 8 characters. Password can only have ascii characters.'],
        email: ['The email must be a valid email address']
      });
    }
    // always failing assertion to be sure execution do not reach this instruction
    return expect(false, 'to be ok');
  });

  it('FAILS for required attributes', async function() {
    let attributes = {
    };
    let checkit = new Checkit(UserValidators.registration);
    try {
      await checkit.run(attributes);
    } catch (err) {
      return expect(err.toJSON(), 'to equal', {
        username: ['The username is required'],
        password: ['The password is required'],
        email: ['The email is required']
      });
    }

    // always failing assertion to be sure execution do not reach this instruction
    return expect(false, 'to be ok');
  });

  it('PASS when everything is ok', async function() {
    let attributes = {
      username: 'test', // 49
      password: 'testtest',
      email: 'test@example.com',
      firstName: 'test',
      lastName: 'test'
    };
    let checkit = new Checkit(UserValidators.registration);
    try {
      await checkit.run(attributes);
    } catch (err) {
      // failed assertion when execution reach this instruction, to make tests fails
      return expect(false, 'to be ok');
    }
    return expect(true, 'to be ok');
  });

  describe('Email Validation', async function() {
    let emails = [
      'test@domain.com',
      'firstname.lastname@domain.com',
      'email@subdomain.domain.com',
      'firstname+lastname@domain.com',
      'email@123.123.123.123',
      // 'email@[123.123.123.123]',
      '""email""@domain.com',
      '1234567890@domain.com',
      'email@domain-one.co',
      '_______@domain.com',
      'email@domain.nam',
      'email@domain.co.jp',
      'firstname-lastname@domain.com'
    ];
    // use only email validators
    let checkit = new Checkit({ email: UserValidators.registration.email });

    emails.map((email) => {
      it (`PASS with email ${email}`, function() {
        let [ err, validated ] = checkit.runSync({ email: email });

        expect(err, 'to be null');
        expect(validated, 'to be ok');
      });
    });

  });

});
