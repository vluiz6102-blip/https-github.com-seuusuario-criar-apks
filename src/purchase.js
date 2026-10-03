import { store, ProductType, Platform, LogLevel } from 'capacitor-plugin-cdv-purchase';

const PRODUCT_ID = 'carreira_fc_pro_v1';
let initialized = false;
let initError = null;
let pendingResolve = null;

function unlock() {
  try {
    if (typeof window.grantCarreiraFCPremium === 'function') {
      window.grantCarreiraFCPremium();
      return true;
    }
  } catch (e) { console.error('Falha ao liberar PRO:', e); }
  return false;
}

function finishPending(ok) {
  if (pendingResolve) {
    const r = pendingResolve;
    pendingResolve = null;
    r(!!ok);
  }
}

function transactionProductId(transaction) {
  return transaction?.products?.[0]?.id || '';
}

async function initPurchases() {
  if (initialized || initError) return initialized;
  if (!window.Capacitor || typeof window.Capacitor.isNativePlatform !== 'function' || !window.Capacitor.isNativePlatform()) {
    initError = new Error('Compras disponíveis apenas no APK Android.');
    return false;
  }
  try {
    store.verbosity = LogLevel.WARNING;
    store.register([{ id: PRODUCT_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.GOOGLE_PLAY }]);
    store.when()
      .productUpdated(product => console.log('Produto PRO atualizado:', product?.id))
      .approved(async transaction => {
        if (transactionProductId(transaction) !== PRODUCT_ID) return;
        const unlocked = unlock();
        try { await transaction.finish(); } catch (e) { console.error('Falha ao finalizar compra:', e); }
        finishPending(unlocked);
      })
      .finished(transaction => {
        if (transactionProductId(transaction) === PRODUCT_ID) console.log('Compra PRO finalizada:', transaction.transactionId);
      })
      .cancelled(transaction => {
        if (transactionProductId(transaction) === PRODUCT_ID) finishPending(false);
      });
    const errors = await store.initialize([Platform.GOOGLE_PLAY]);
    if (Array.isArray(errors) && errors.length) console.warn('Google Play Billing:', errors);
    initialized = true;
    if (store.owned(PRODUCT_ID)) unlock();
    return true;
  } catch (e) {
    initError = e instanceof Error ? e : new Error(String(e));
    console.error('Google Play Billing não inicializado:', initError);
    return false;
  }
}

window.CarreiraFCBilling = {
  async purchase(productId) {
    if (productId !== PRODUCT_ID || !(await initPurchases())) return false;
    const product = store.get(PRODUCT_ID);
    const offer = product?.getOffer();
    if (!offer) {
      console.warn('Produto não encontrado na Google Play. Cadastre carreira_fc_pro_v1 como não consumível.');
      return false;
    }
    return new Promise(async resolve => {
      pendingResolve = resolve;
      try {
        const error = await offer.order();
        if (error) { pendingResolve = null; resolve(false); }
      } catch (e) {
        pendingResolve = null;
        console.error('Erro ao iniciar compra:', e);
        resolve(false);
      }
    });
  },
  async restore(productId) {
    if (productId !== PRODUCT_ID || !(await initPurchases())) return false;
    try {
      const error = await store.restorePurchases();
      if (error) console.warn('Restaurar compra:', error);
      const owned = store.owned(PRODUCT_ID);
      if (owned) unlock();
      return !!owned;
    } catch (e) {
      console.error('Erro ao restaurar compra:', e);
      return false;
    }
  }
};

initPurchases();