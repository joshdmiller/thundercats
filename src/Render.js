import Rx from 'rx';
import React from 'react';
import debugFactory from 'debug';

import ContextWrapper from './ContextWrapper';
import waitFor from './waitFor';

const debug = debugFactory('thundercats:render');

export function fetch(fetchMap, stores) {
  if (!fetchMap || fetchMap.size === 0) {
    debug('cat found empty fetch map');
    return Rx.Observable.return({
      data: {},
      fetchMap
    });
  }

  const fetchCtx = Rx.Observable.from(fetchMap.values()).shareReplay();

  const waitForStores = fetchCtx
    .pluck('store')
    .toArray()
    .tap(arrayOfStores => debug('waiting for %s stores', arrayOfStores.length))
    .map(arrayOfStores => {
      return waitFor(...arrayOfStores)
        .firstOrDefault()
        .shareReplay();
    })
    .tap(waitForStores => waitForStores.subscribe());

  const fetchObs = fetchCtx
    .map(({ action, payload }) => ({ action, payload }))
    .tapOnNext(() => debug('init individual fetchers'))
    .tapOnNext(({ action, payload }) => {
      action(payload);
    })
    .tapOnCompleted(() => debug('fetchers activated'))
    .toArray();

  return Rx.Observable.combineLatest(
    waitForStores,
    fetchObs.delaySubscription(50),
    data => ({ data, fetchMap })
  );
}

export function RenderToObs(Comp, DOMContainer) {
  return new Rx.AnonymousObservable(function (observer) {
    let instance = null;
    instance = React.render(Comp, DOMContainer, (err) => {
      /* istanbul ignore else */
      if (err) { return observer.onError(err); }
      /* istanbul ignore else */
      if (instance) { observer.onNext(instance); }
    });
    observer.onNext(instance);
  });
}

export default {
  render(cat, Component, DOMContainer) {
    return Rx.Observable.just(Component)
      .map(Comp => ContextWrapper.wrap(Comp, cat))
      .flatMap(
        Burrito => RenderToObs(Burrito, DOMContainer),
        (Burrito, inst) => {
          return inst;
        }
      );
  },

  renderToString(cat, Component) {
    const { stores } = cat;
    const fetchMap = new Map();
    cat.fetchMap = fetchMap;
    return Rx.Observable.just(Component)
      .map(Comp => ContextWrapper.wrap(Comp, cat))
      .doOnNext(Burrito => {
        debug('initiation fetcher registration');
        React.renderToStaticMarkup(Burrito);
        debug('fetcher registration complete');
      })
      .flatMap(
        () => {
          return fetch(fetchMap, stores);
        },
        (Burrito, { data, fetchMap }) => {
          return {
            Burrito,
            data,
            fetchMap
          };
        }
      )
      .map(({ Burrito, data, fetchMap }) => {
        let markup = React.renderToString(Burrito);
        return {
          markup,
          data,
          fetchMap
        };
      })
      .firstOrDefault()
      .tapOnNext(() => cat.fetchMap = null);
  }
};