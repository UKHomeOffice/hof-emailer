'use strict';

const _ = require('lodash');
const DOMParser = require('xmldom').DOMParser;
const steps = require('../fixtures/steps');
const fields = require('../fixtures/fields');
const config = Object.assign({}, require('../fixtures/config'));
const data = Object.assign({}, require('../fixtures/data'));

const EmailService = require('../../');

const parser = new DOMParser();

describe('HOF Emailer', () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailService(Object.assign(config, {data, steps, fields}));
  });

  it('sends emails', done => {
    emailService.sendEmails().then(info => {
      info[0].response.should.be.an.instanceOf(Buffer);
      info[1].response.should.be.an.instanceOf(Buffer);
      done();
    });
  });

  it('contains data passed', done => {
    emailService.sendEmails().then(info => {
      const response = info[0].response.toString('utf-8');

      response.should.contain('123 Example Street, Croydon');
      response.should.contain('Some text to find from within the email');
      done();
    });
  });

  describe('Template Rendering', () => {
    describe('Raw Template', () => {
      let output;
      beforeEach(done => {
        emailService._renderTemplate('raw', 'customer', emailService.data).then(html => {
          output = html.trim().split('\n').map(line => line.trim());
          done();
        });
      });

      it('contains both customer intro paragraphs', () => {
        config.intro.customer.forEach(paragraph => {
          output.includes(paragraph).should.be.true;
        });
      });

      it('contains all labels and values from passed config', () => {
        const formatted = _(fields)
          .pickBy(field => field.includeInEmail !== false)
          .map((field, key) => `${field.label}: ${data[key]}`)
          .value();
        formatted.forEach(line => {
          output.includes(line).should.be.true;
        });
      });
    });

    describe('Formatted Email', () => {
      let document;
      beforeEach(done => {
        emailService._renderTemplate('formatted', 'customer', emailService.data).then(html => {
          document = parser.parseFromString(html, 'text/html');
          done();
        });
      });

      describe('DocumentType', () => {
        let doctype;
        beforeEach(() => {
          doctype = document.childNodes[0];
        });

        it('has a html as nodeName', () => {
          doctype.nodeName.should.be.equal('html');
        });

        it('has the correct publicId', () => {
          doctype.publicId.should.be.equal('-//W3C//DTD XHTML 1.0 Transitional//EN');
        });

        it('has the correct systemId', () => {
          doctype.systemId.should.be.equal('http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd');
        });
      });

      describe('Content', () => {
        let contentTable;
        let rows;
        beforeEach(() => {
          contentTable = document.getElementById('main-content');
          rows = Array.prototype.filter.call(contentTable.childNodes, node =>
            node.nodeName === 'tr'
          );
        });

        it('contains 26 rows (fields + intro + outro)', () => {
          const fieldRows = _.size(_.pickBy(fields, field => field.includeInEmail !== false));
          const introRows = config.intro.customer.length;
          const outroRows = config.outro.customer.length;
          rows.length.should.be.equal(fieldRows + introRows + outroRows);
        });
      });
    });
  });
});
