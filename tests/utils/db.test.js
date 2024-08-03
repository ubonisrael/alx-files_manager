/* eslint-disable */
import dbClient from '../../utils/db';

describe('Tests for DBClient utility', () => {
  before(function (done) {
    this.timeout(10000);
    Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
      .then(([usersCollection, filesCollection]) => {
        Promise.all([usersCollection.deleteMany({}), filesCollection.deleteMany({})])
          .then(() => done())
          .catch((deleteErr) => done(deleteErr));
      }).catch((connectErr) => done(connectErr));
  });

  it('Test that connection is alive', () => {
    expect(dbClient.isAlive()).to.equal(true);
  });

  it('Test that nbUsers returns the correct value', async () => {
    expect(await dbClient.nbUsers()).to.equal(0);
  });

  it('Test that nbFiles returns the correct value', async () => {
    expect(await dbClient.nbFiles()).to.equal(0);
  });
});
