import expect from 'unexpected';
import { isString, isPlainObject, merge } from 'lodash';
import { serialize } from 'cookie';
import AWS from 'mock-aws';

import app from '../index';


expect.installPlugin(require('unexpected-http'));

let subjectToRequest = (subject) => {
  if (isString(subject)) {
    return {
      url: subject,
      host: 'localhost',
      port: 8000
    };
  }

  if (isPlainObject(subject) && "url" in subject) {
    let result = {
      url: subject.url,
      host: 'localhost',
      port: 8000
    };

    if ("session" in subject) {
      result = merge(result, {
        headers: {
          "Cookie": serialize('connect.sid', subject.session)
        }});
    }

    delete subject["url"];
    delete subject["session"];
    result = merge(result, subject);
    return merge(result, subject);
  }

  throw new Error('Unexpected format of test-subject')
};

expect.addAssertion('to have body an array', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
  }).then(function (context) {
    var body = context.httpResponse.body;

    expect(body, 'to be an', 'array');
  });
});

expect.addAssertion('to have body array length', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
  }).then(function (context) {
    var body = context.httpResponse.body;

    expect(body, 'to have length', value);
  });
});

// TODO: Expect to yield a redirect to a specific path.
expect.addAssertion('to redirect', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
    statusCode: 307
  });
});

expect.addAssertion('to open successfully', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
    statusCode: 200
  });
});

expect.addAssertion('body to contain', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
    statusCode: 200
  }).then(function (context) {
    let body = context.httpResponse.body;
    expect(body, 'to contain', value);
  });
});

expect.addAssertion('body to satisfy', function (expect, subject, value) {
  expect.errorMode = 'bubble';
  return expect(subjectToRequest(subject), 'to yield response', {
  }).then(function (context) {
    let body = context.httpResponse.body;
    expect(body, 'to satisfy', value);
  });
});

expect.addAssertion('headers to satisfy', function (expect, subject, value) {
  expect.errorMode = 'bubble';
  return expect(subjectToRequest(subject), 'to yield response', {
  }).then(function (context) {
    let headers = context.httpResponse.headers;
    expect(headers, 'to satisfy', value);
  });
});

expect.addAssertion('not to open', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
  }).then(function (context) {
    const status = context.httpResponse.statusLine.statusCode;
    expect(status, 'not to equal', 200);
  });
});

expect.addAssertion('to open authorized', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
  }).then(function (context) {
    const status = context.httpResponse.statusLine.statusCode;
    expect(status, 'not to equal', 403);
  });
});

expect.addAssertion('not to open authorized', function (expect, subject, value) {
  expect.errorMode = 'bubble';
  return expect(subjectToRequest(subject), 'to yield response', {})
    .then(function (context) {

      const status = context.httpResponse.statusLine.statusCode;
      expect(status, 'to equal', 403);
    });
});

expect.addAssertion('to open not found', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {})
    .then(function (context) {
    const status = context.httpResponse.statusLine.statusCode;
    expect(status, 'to equal', 404);
  });
});

expect.addAssertion('to fail validation with', function (expect, subject, value) {
  return expect(subjectToRequest(subject), 'to yield response', {
    statusCode: 400
  }).then(function (context) {
    let body = context.httpResponse.body;
    expect(value, 'to equal', body.error);
  });
});

export default expect;
