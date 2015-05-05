/* eslint-disable no-unused-vars, no-undefined, no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import Rx from 'rx';
import Q from 'q';
import { Store, Actions } from '../';

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Store', function() {
  describe('class', function() {
    let store, CatStore, catActions;

    beforeEach(function() {
      catActions = createActions();
      class CatStore extends Store {
        constructor() {
          super();
          this.value = { name: 'Lion-O' };
          this.register(catActions);
        }

        opsOnError(err) {
          console.log('an error occurred in operations with ' + err);
        }

        opsOnCompleted() {
          throw new Error('ops completed unexpectedly');
        }
      }
      store = new CatStore();
    });

    it('should be an instance of ThunderCats Store', function() {
      store.should.be.an.instanceOf(Store);
    });

    it('should be an observable', function() {
      let spy = sinon.spy();
      store.subscribe.should.be.a('function');
      store.subscribe(spy);
      catActions.doAction({ value: { name: 'purr' }});
      spy.should.have.been.calledWith({ name: 'purr' });
    });

    it('should override built in operations onError handler', function() {
      expect(function() {
        store.subscribe(function() { });
        catActions.doAction.onError(new Error('Do not cross streams'));
      }).to.not.throw();
    });

    it('should override built in operations onComplete handler', function() {
      expect(function() {
        let spy = sinon.spy();
        store.subscribe(spy);
        catActions.doAction.onCompleted("I ain't got nothing left");
      }).to.throw(/ops completed/);
    });
  });

  describe('operations', function() {

    describe('register', function() {

      it('should accept a single observable action', function() {
        let fn = function() {
          class CatActions extends Actions {
            constructor() {
              super();
            }
            doAction() {
            }
          }
          let catActions = new CatActions();
          class CatStore extends Store {
            constructor() {
              super();
              this.value = {};
              this.register(catActions.doAction);
            }
          }
          let store = new CatStore();
          store.subscribe(function() { });
        };
        expect(fn).not.to.throw();
      });

      it('should register actions class instance', function() {
        let fn = function() {
          class CatActions extends Actions {
            constructor() {
              super();
            }
            doAction() {
            }
            doAnother() {
            }
          }
          let catActions = new CatActions();
          class CatStore extends Store {
            constructor() {
              super();
              this.value = {};
              this.register(catActions);
            }
          }
          let store = new CatStore();
          store.subscribe(function() { });
        };
        expect(fn).not.to.throw();
      });

      it('should throw if no actions are registered', function() {
          expect(function() {
            class ExtendStore extends Store {
              constructor() {
                super();
                this.value = { name: 'Lion-O' };
              }
            }
            let store = new ExtendStore();
            store.subscribe(function() { });
          }).to.throw(/must have at least one action/);
        }
      );

      it('should throw when registering non observables', function() {
        let fn = function() {
          class ExtendStore extends Store {
            constructor() {
              super();
              this.value = { name: 'Lion-O' };
              this.register('not the momma');
            }
          }
          let store = new ExtendStore();
          store.subscribe(function() { });
        };
        expect(fn).to.throw(/should register observables/);
      });

      it('should throw if an action errors', function() {
        let fn = function() {
          let catActions = createActions();
          class ExtendStore extends Store {
            constructor() {
              super();
              this.value = { name: 'Lion-O' };
              this.register(catActions);
            }
          }
          let store = new ExtendStore();
          store.subscribe(function() { });
          catActions.doAction.onError('catastrophy');
        };
        expect(fn).to.throw(/catastrophy/);
      });

      it('should complain when action completes', function() {
        let catActions = createActions();
        class ExtendStore extends Store {
          constructor() {
            super();
            this.value = { name: 'Lion-O' };
            this.register(catActions);
          }
        }
        let store = new ExtendStore();
        let onCompletedSpy = sinon.spy(store, 'opsOnCompleted');
        store.subscribe(function() {});
        catActions.doAction.onCompleted();
        onCompletedSpy.should.have.been.calledOnce;
      });
    });

    describe('value', function() {

      let value = { hello: 'world' };
      let newValue = { foo: 'bar' };
      let spy = sinon.spy();
      let catActions;
      let store;

      before(function() {
        catActions = createActions();
        class CatStore extends Store {
          constructor() {
            super();
            this.register(catActions);
            this.value = value;
          }
        }
        store = new CatStore();
        store.subscribe(spy);
      });

      it(
        'should pass the value held by the store to the observers',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it('should have notified observers with the new value', function() {
        catActions.doAction.onNext({ value: newValue });
        spy.should.have.been.calledWith(newValue);
        spy.should.have.been.calledTwice;
      });

      it('should not throw if value is null', function() {
        expect(() => {
          catActions.doAction({ value: null });
        }).to.not.throw();
      });

      it('should throw if value is not an object', function() {
        expect(() => {
          catActions.doAction({ value: 'not the momma' });
        }).to.throw(/invalid operation/);
      });
    });

    describe('set', function() {
      let value = { hello: 'world' };
      let newValue = { foo: 'bar' };
      let spy = sinon.spy();
      let CatStore;
      let catActions;
      let store;

      before(function() {
        catActions = createActions();
        class CatStore extends Store {
          constructor() {
            super();
            this.register(catActions);
            this.value = value;
          }
        }
        store = new CatStore();
        store.subscribe(spy);
      });

      it('should assign new values to store value', function() {
        spy.should.have.not.been.calledWith(
          sinon.match({ hello: 'world', foo: 'bar' })
        );
        catActions.doAction({ set: newValue });
        spy.lastCall.should.have.been.calledWith(
          sinon.match({ hello: 'world', foo: 'bar' })
        );
      });

      it('should not throw if set is null', function() {
        expect(() => {
          catActions.doAction({
            set: null
          });
        }).to.not.throw();
      });

      it('should throw if set is not an object or null', function() {
        expect(() => {
          catActions.doAction({
            set: 'yo yo yo'
          });
        }).to.throw(/invalid operation/);
      });
    });

    describe('transform', function() {

      let value = { hello: 'world' };
      let newValue = { foo: 'bar' };
      let spy = sinon.spy();
      let CatStore;
      let catActions;
      let store;

      before(function() {
        catActions = createActions();
        class CatStore extends Store {
          constructor() {
            super();
            this.register(catActions);
            this.value = value;
          }
        }
        store = new CatStore();
        store.subscribe(spy);
      });

      it(
        'should pass the value held by the store to operations',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it(
        'should passed to the value held by the store to the operations ' +
        'transform',
        function() {
          spy.should.have.not.been.calledWith(newValue);
          catActions.doAction({
            transform: function(val) {
              val.should.equal(value);
              return newValue;
            }
          });
        }
      );

      it('should have notified observers with the new value', function() {
        spy.should.have.been.calledWith(newValue);
        spy.should.have.been.calledTwice;
      });

      it('should throw if not a function', function() {
        expect(() => {
          catActions.doAction({ transform: 'not the momma' });
        }).to.throw(/invalid operation/);
      });
    });

    describe('confirming', function() {

      let value = {};
      let newValue = {};
      let spy;
      let defer;
      let store;
      let catActions;

      before(function() {
        spy = sinon.spy();
        defer = Q.defer();
        catActions = createActions();
        class CatStore extends Store {
          constructor() {
            super();
            this.register(catActions);
            this.value = value;
          }
        }
        CatStore.displayName = 'CatStore';
        store = new CatStore();
        store.subscribe(spy);
      });

      it(
        'should register a new entry in store history with confirm promise',
        function() {
          store.history.size.should.equal(0);
          catActions.doAction({
            value: newValue,
            confirm: defer.promise
          });
          store.history.size.should.equal(1);
        }
      );

      it('should respect previous operations', function() {
        let defer2 = new Rx.Subject();
        catActions.doAction({
          value: {},
          confirm: defer2
        });
        defer2.onError('boo');
      });

      it('should remove that entry on promise resolve', function(done) {
        defer.resolve();
        defer.promise.then(function() {
          store.history.size.should.equal(0);
          done();
        });
      });
    });

    describe('canceling', function () {

      let value = {};
      let newValue = {};
      let spy;
      let defer;
      let defer2;
      let store;
      let catActions;

      before(function() {
        spy = sinon.spy();
        defer = Q.defer();
        catActions = createActions();
        class CatStore extends Store {
          constructor() {
            super();
            this.register(catActions);
            this.value = value;
          }
        }
        CatStore.prototype.displayName = 'CatStore';
        store = new CatStore();
        store.subscribe(spy);
      });

      it(
        'should notify observers with the initial value',
        function () {
          spy.should.have.been.calledOnce;
          spy.should.have.been.calledWith(value);
          catActions.doAction({ value: value });
        }
      );

      it(
        'should have notified observers with the new value',
        function () {
          catActions.doAction({
            value: newValue,
            confirm: defer.promise
          });
          spy.should.have.been.calledWith(newValue);
        }
      );

      it(
        'should have notified observers about the canceling',
        function(done) {
          defer.reject();
          defer.promise.catch(function() {
            spy.should.have.been.calledWith(value);
            done();
          });
        }
      );

      describe('with nesting', function() {

        let spy = sinon.spy();
        let deferred1 = Q.defer();
        let deferred2 = Q.defer();
        let catActions;
        let store;

        before(function() {
          catActions = createActions();
          class CatStore extends Store {
            constructor() {
              super();
              this.register(catActions);
              this.value = [];
            }
          }
          store = new CatStore();
          store.subscribe(spy);

          catActions.doAction({
            transform: function (arr) {
              return arr.concat('foo');
            },
            confirm: deferred1.promise
          });
        });

        it(
          'should notify observers with the transformed value ' +
          'after the first operation has been applied',
          function() {
            spy.should.have.been.calledWith(['foo']);
          }
        );

        it(
          'should notify observers with the transformed value ' +
          'after the second operation has been applied',
          function() {
            catActions.doAction({
              transform: function (arr) {
                return arr.concat('bar');
              },
              confirm: deferred2.promise
            });
            spy.should.have.been.calledWith(['foo', 'bar']);
          }
        );

        it(
          'should notify observers with result of applying the ' +
          'second operation on the old value after the first ' +
          'operation has failed',
          function(done) {
            deferred1.reject();
            deferred1.promise.catch(function() {
              spy.should.have.been.calledWith(['bar']);
              done();
            });
          }
        );

        it(
          'should notify observers with the initial value after ' +
          'the second operation has failed',
          function(done) {
            deferred2.reject();
            deferred2.promise.catch(function() {
              spy.should.have.been.calledWith([]);
              done();
            });
          }
        );
      });
    });
  });

  describe('lifecycle', function() {

    let operationsSpy;
    let catActions;
    let store, disposable;

    beforeEach(function() {

      operationsSpy = sinon.spy();
      catActions = createActions(operationsSpy);
      class CatStore extends Store {
        constructor() {
          super();
          this.register(catActions);
        }
      }
      store = new CatStore();
    });

    it(
      'should subscribe to actions on initial subscription',
      function () {
        store.subscribe(function () { });
        catActions.doAction.hasObservers().should.be.true;
      }
    );

    it(
      'should dispose subscriptions to actions when store disposes ' +
      'last observer',
      function() {
        let disposable = store.subscribe(function() { });
        catActions.doAction.hasObservers().should.be.true;
        disposable.dispose();
        catActions.doAction.hasObservers().should.be.false;
      }
    );

    it(
      'should resubscribe to observables when store is resubscribed',
      function() {
        let disposable = store.subscribe(function() { });
        catActions.doAction.hasObservers().should.be.true;
        disposable.dispose();
        catActions.doAction.hasObservers().should.be.false;
        store.subscribe(function() {});
        catActions.doAction.hasObservers().should.be.true;
      }
    );
  });

  describe('serialize', function() {
    it('should produce a string with the correct data', function() {
      let catActions = createActions();
      class CatStore extends Store {
        constructor() {
          super();
          this.register(catActions);
          this.value = { cats: 'meow' };
        }
      }
      let store = new CatStore();
      let dats = store.serialize();
      dats.should.be.a.string;
      dats.should.equal(JSON.stringify({ cats: 'meow' }));
    });
  });

  describe('deserialize', function() {
    let value, stringyValue, store, catActions;
    beforeEach(function() {
      value = { cats: 'meow' };
      stringyValue = JSON.stringify(value);
      catActions = createActions();
      class CatStore extends Store {
        constructor() {
          super();
          this.register(catActions);
          this.value = null;
        }
      }
      store = new CatStore();
    });

    it('should update store data', function() {
      expect(store.value).to.be.null;
      store.deserialize(stringyValue);
      expect(store.value).to.not.be.null;
      store.value.should.deep.equal(value);
    });

    it(
      'should throw if data deserializes to non object or non null',
      function() {
        expect(store.value).to.be.null;
        expect(() => {
          store.deserialize('true');
        }).to.throw(/deserialize must return an object or null/);
      }
    );
  });

  describe('outliers', function() {
    let store, catActions;

    beforeEach(function() {
      catActions = createActions();
      class CatStore extends Store {
        constructor() {
          super();
          this.register(catActions);
        }
      }
      store = new CatStore();
    });

    it(
      'should throw if an operation id is used that does not exist ' +
      'within its history'
    );
  });
});

function createActions(spy) {
  spy = spy || function(val) { return val; };
  class CatActions extends Actions {
    constructor() {
      super();
    }

    doAction(val) {
      spy(val);
      return val;
    }
  }
  return new CatActions();
}
