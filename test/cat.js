/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { React, createActions, createClass, ReactTestUtils } from './utils';

import { Cat, Store, Actions, Container } from '../';
import { RenderToString } from '../lib/Cat';

chai.should();
chai.use(sinonChai);

describe('Cat', function() {
  describe('class', function() {
    it('should be extendable', function() {
      class AppCat extends Cat {
        constructor() {
          super();
        }
      }
      let appCat = new AppCat();
      appCat.should.be.instanceOf(Cat);
    });
  });

  describe('register', function() {
    let CatStore, CatActions, CatApp;
    beforeEach(function() {
      class _CatApp extends Cat {
        constructor() {
          super();
        }
      }
      CatApp = _CatApp;
    });

    it('should register an instance of actions class', function() {
      let cat = new CatApp();
      CatActions = createActions();
      cat.actions.size.should.equal(0);
      cat.register(CatActions);
      cat.actions.size.should.equal(1);
    });

    it('should register an instance of Store class', function() {
      let cat = new CatApp();
      CatActions = createActions();
      CatStore = createStore();
      cat.stores.size.should.equal(0);
      cat.register(CatActions);
      cat.register(CatStore, cat);
      cat.stores.size.should.equal(1);
    });

    it('should throw if given non ThunderCats Store/Actions', function() {
      let cat = new CatApp();
      expect(() => {
        cat.register('not the momma', cat);
      }).to.throw(/Attempted to add a class that is not/);
    });

    it('should throw if actions/store does not have a displayName', function() {
      class NoName extends Actions {
        constructor() {
          super();
        }
        doSomething() {
        }
      }

      let cat = new CatApp();
      expect(() => {
        cat.register(NoName);
      }).to.throw(/does not have a displayName/);
    });

    it('should warn if attempting to add a store twice', function() {
      let CatActions = createActions();
      let CatStore = createStore();
      let cat = new CatApp();
      cat.stores.size.should.equal(0);
      cat.register(CatActions);
      cat.register(CatStore, cat);
      let spy = sinon.spy(console, 'error');
      cat.stores.size.should.equal(1);
      cat.register(CatStore);
      cat.stores.size.should.equal(1);
      spy.restore();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(sinon.match(/already exists/));
    });

    it('should warn if attempting to add an action twice', function() {
      let CatActions = createActions();
      let cat = new CatApp();
      cat.actions.size.should.equal(0);
      cat.register(CatActions);
      cat.actions.size.should.equal(1);
      let spy = sinon.spy(console, 'error');
      cat.register(CatActions);
      cat.actions.size.should.equal(1);
      spy.restore();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(sinon.match(/already exists/));
    });
  });

  describe('getStore', function() {
    let cat, CatActions, CatStore;
    beforeEach(function() {
      CatActions = createActions();
      CatStore = createStore();
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
          this.register(CatStore, this);
        }
      }
      cat = new CatApp();
    });

    it('should return a Store if it exists', function() {
      let catStore = cat.getStore('CatStore');
      expect(catStore).to.exist;
      catStore.should.be.an.instanceOf(Store);
    });

    it('should return undefined if a Store does not exits', function() {
      let lameStore = cat.getStore('LameStore');
      expect(lameStore).to.not.exist;
      expect(lameStore).to.be.undefined;
    });
  });

  describe('getActions', function() {
    let cat, CatActions;

    beforeEach(function() {
      CatActions = createActions();
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
        }
      }
      cat = new CatApp();
    });

    it('should return a Actions if it exists', function() {
      let catActions = cat.getActions('CatActions');
      expect(catActions).to.exist;
      catActions.should.be.an.instanceOf(Actions);
    });

    it('should return undefined if Actions does not exits', function() {
      let lameActions = cat.getActions('Lame Actions');
      expect(lameActions).to.not.exist;
      expect(lameActions).to.be.undefined;
    });
  });

  describe('serialize', function() {
    let CatStore, CatActions, cat, storeVal;
    beforeEach(function() {
      CatActions = createActions();
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
        }
      }
      cat = new CatApp();
    });

    it('should return an observable', function() {
      CatStore = createStore();
      cat.register(CatStore, cat);
      let stringyStateObs = cat.serialize();
      expect(stringyStateObs).to.exist;
      stringyStateObs.should.be.an('object');
      stringyStateObs.subscribe.should.be.a('function');
      stringyStateObs.subscribe((stringyState) => {
        expect(stringyState).to.exist;
        stringyState.should.be.a('string');
      });
    });

    describe('observable', () => {
      it('should serialize store data', function() {
        storeVal = { bah: 'humbug' };
        CatStore = createStore(storeVal);
        cat.register(CatStore, cat);
        let stringyStateObs = cat.serialize();
        stringyStateObs.subscribe(stringyState => {
          stringyState.should.equal(JSON.stringify({ CatStore: storeVal }));
        });
      });

      it('should return an empty string if no stores have data', function() {
        CatStore = createStore();
        cat.register(CatStore, cat);
        let stringyStateObs = cat.serialize();
        stringyStateObs.subscribe((stringyState) => {
          stringyState.should.equal('');
        });
      });
    });
  });

  describe('deserialize', function() {
    let CatStore, CatActions, cat;
    beforeEach(() => {
      CatActions = createActions();
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
        }
      }
      cat = new CatApp();
    });

    it('should return an observable', () => {
      CatStore = createStore();
      cat.register(CatStore, cat);
      cat.deserialize().subscribe.should.be.a('function');
    });

    describe('observable', () => {
      it('should error if given non strings', () => {
        CatStore = createStore();
        cat.register(CatStore, cat);
        cat.deserialize({ notA: 'String' }).subscribeOnError((err) => {
          err.should.match(/deserialize expects a string/);
        });
      });

      it(
        'should error if stringy data does not parse into an object or null',
        () => {
          CatStore = createStore();
          cat.register(CatStore, cat);
          cat.deserialize('1').subscribeOnError((err) => {
            err.should.match(/should be an object or null/);
          });
        }
      );

      it('should hydrate store with correct data', () => {
        let val = { foo: 'bar' };
        CatStore = createStore();
        cat.register(CatStore, cat);
        let catStore = cat.getStore('CatStore');
        cat.deserialize(JSON.stringify({ CatStore: val }))
          .subscribeOnCompleted(() => {
            catStore.__value.should.deep.equal(val);
          });
      });
    });
  });

  describe('renderToString', function() {
    let cat;
    this.timeout(6000);
    beforeEach(() => {
      cat = new Cat();
    });

    it('should return an observable', () => {
      let TestComp = createClass({});
      let TestElement = React.createElement(TestComp);
      let renderObs = RenderToString(cat, TestElement);
      renderObs.subscribe.should.be.a('function');
    });

    describe('fetching', () => {
      let Comp, payload, wrappedPayload, TestComp;
      beforeEach(() => {
        let CatActions = createActions();
        let CatStore = createStore();
        payload = { name: 'foo' };
        wrappedPayload = { value: payload };
        cat.register(CatActions);
        cat.register(CatStore, cat);
      });

      it('should initiate fetcher registration', (done) => {
        TestComp = createClass({
          getThundercats() {
            return {
              store: 'catStore',
              fetchAction: 'catActions.doAction',
              payload: wrappedPayload
            };
          }
        });
        Comp = React.createElement(
          Container,
          null,
          React.createElement(TestComp)
        );
        cat.renderToString(Comp)
          .subscribe(({ fetchMap }) => {
            expect(fetchMap).to.exist;
            fetchMap.size.should.equal(1);
            const fetchContext = fetchMap.get('catActions.doAction');
            expect(fetchContext).to.exist;
            fetchContext.should.be.an('object');
            fetchContext.should.include.keys(
              'name',
              'payload',
              'action',
              'store'
            );
            done();
          });
      });

      it('should be ok with empty payload', (done) => {
        TestComp = createClass({
          getThundercats() {
            return {
              store: 'CatStore',
              fetchAction: 'catActions.doAction'
            };
          }
        });

        Comp = React.createElement(
          Container,
          null,
          React.createElement(TestComp)
        );
        cat.renderToString(Comp)
          .subscribe(({ fetchMap }) => {
            const fetchContext = fetchMap.get('catActions.doAction');
            expect(fetchContext).to.exist;
            fetchContext.should.include.keys(
              'name',
              'payload',
              'action',
              'store'
            );
            fetchContext.payload.should.deep.equal({});
            done();
          });
      });
    });

    describe('observable', () => {
      let Comp;
      beforeEach(() => {
        let CatActions = createActions();
        let CatStore = createStore();
        let TestComp = createClass({
          getThundercats() {
            return {
              store: 'CatStore',
              fetchAction: 'catActions.doAction'
            };
          }
        });
        cat.register(CatActions);
        cat.register(CatStore, cat);
        Comp = React.createElement(
          Container,
          null,
          React.createElement(TestComp)
        );
      });

      it('should return markup, data', (done) => {
        cat.renderToString(Comp)
          .subscribe(data => {
            expect(data.markup).to.exist;
            expect(data.data).to.exist;
            data.markup.should.be.a.string;
            data.data.should.be.an('object');
            done();
          });
      });

      it('should error on fetch errors', (done) => {
        cat.renderToString('not the momma')
          .subscribe(
            () => {},
            err => {
              expect(err).to.exist;
              err.should.be.an.instanceOf(Error);
              done();
            }
          );
      });

      it('should complete', (done) => {
        cat.renderToString(Comp)
          .subscribe(
            () => {},
            () => {},
            () => done()
          );
      });
    });
  });

  describe('render', function () {
    let cat, Comp;
    beforeEach(() => {
      let CatActions = createActions();
      let CatStore = createStore();
      let TestComp = createClass({
        getThundercats() {
          return {
            store: 'CatStore',
            fetchAction: 'catActions.doAction'
          };
        }
      });
      cat = new Cat();
      cat.register(CatActions);
      cat.register(CatStore, cat);
      Comp = React.createElement(
        Container,
        null,
        React.createElement(TestComp)
      );
    });

    it('should return an observable', () => {
      let divContainer = document.createElement('div');
      let renderObserable = cat.render(Comp, divContainer);
      expect(renderObserable).to.exist;
      renderObserable.subscribe.should.be.a('function');
    });

    describe('observable', () => {
      let divContainer;
      beforeEach(() => {
        divContainer = document.createElement('div');
      });

      afterEach(() => {
        React.unmountComponentAtNode(divContainer);
      });

      it('should return react instance', (done) => {
        let renderObserable = cat.render(Comp, divContainer);
        expect(renderObserable).to.exist;
        renderObserable
          .firstOrDefault()
          .subscribe(function(inst) {
            expect(inst).to.exist;
            ReactTestUtils.isCompositeComponent(inst).should.be.true;
            done();
          });
      });

      it('should return error', (done) => {
        let renderObserable = cat.render('foo', divContainer);
        expect(renderObserable).to.exist;
        renderObserable
          .subscribeOnError(err => {
            expect(err).to.exist;
            err.should.be.an.instanceOf(Error);
            done();
          });
      });
    });
  });
});

function createStore(initValue = null) {
  class CatStore extends Store {
    constructor(cat) {
      super();
      this.value = initValue;
      let catActions = cat.getActions('CatActions');
      this.register(
        catActions.doAction.delay(500).map(() => ({ value: {}}))
      );
    }
  }
  CatStore.displayName = 'CatStore';
  return CatStore;
}