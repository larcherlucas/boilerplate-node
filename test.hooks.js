import index from './index.js';

let server;
let dbPoolEnded = false;

export const mochaHooks = {
  beforeAll(done) {
    const PORT = process.env.PORT ?? 4000;
    server = index.listen(PORT, () => {
      console.log(`🚀 Test server started on port ${PORT}`);
      done();
    });
  },
  
  afterAll(done) {
    if (server) {
      server.close(() => {
        console.log('🛑 Test server closed');
        if (!dbPoolEnded) {
          global.testDbPool.end().then(() => {
            console.log('Connexion à la base de données fermée');
            dbPoolEnded = true;
            done();
          }).catch(done);
        } else {
          done();
        }
      });
    } else {
      if (!dbPoolEnded) {
        global.testDbPool.end().then(() => {
          dbPoolEnded = true;
          done();
        }).catch(done);
      } else {
        done();
      }
    }
  }
};