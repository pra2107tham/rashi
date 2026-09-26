import { androidpublisher, auth, type androidpublisher_v3 } from "@googleapis/androidpublisher";
import { PLAY_PACKAGE_NAME, PLAY_SERVICE_ACCOUNT } from "../config";

export interface ProductPurchase {
  purchaseState: number; // 0 purchased, 1 canceled, 2 pending
  acknowledged: boolean;
  consumed: boolean;
  orderId: string | null;
  obfuscatedAccountId: string | null;
}

export interface SubscriptionPurchase {
  state: string; // SUBSCRIPTION_STATE_*
  productId: string | null;
  expiresAt: Date | null;
  acknowledged: boolean;
  orderId: string | null;
  obfuscatedAccountId: string | null;
  linkedPurchaseToken: string | null;
}

/** The subset of the Play Developer API we use; swappable in tests. */
export interface PlayApi {
  getProduct(productId: string, token: string): Promise<ProductPurchase>;
  acknowledgeProduct(productId: string, token: string): Promise<void>;
  consumeProduct(productId: string, token: string): Promise<void>;
  getSubscription(token: string): Promise<SubscriptionPurchase>;
  acknowledgeSubscription(productId: string, token: string): Promise<void>;
}

class GooglePlayApi implements PlayApi {
  private readonly api: androidpublisher_v3.Androidpublisher;
  private readonly packageName: string;

  constructor() {
    const credentials = JSON.parse(PLAY_SERVICE_ACCOUNT.value());
    const googleAuth = new auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/androidpublisher"] });
    this.api = androidpublisher({ version: "v3", auth: googleAuth });
    this.packageName = PLAY_PACKAGE_NAME.value();
  }

  async getProduct(productId: string, token: string): Promise<ProductPurchase> {
    const { data } = await this.api.purchases.products.get({ packageName: this.packageName, productId, token });
    return {
      purchaseState: data.purchaseState ?? -1,
      acknowledged: data.acknowledgementState === 1,
      consumed: data.consumptionState === 1,
      orderId: data.orderId ?? null,
      obfuscatedAccountId: data.obfuscatedExternalAccountId ?? null,
    };
  }

  async acknowledgeProduct(productId: string, token: string): Promise<void> {
    await this.api.purchases.products.acknowledge({ packageName: this.packageName, productId, token });
  }

  async consumeProduct(productId: string, token: string): Promise<void> {
    await this.api.purchases.products.consume({ packageName: this.packageName, productId, token });
  }

  async getSubscription(token: string): Promise<SubscriptionPurchase> {
    const { data } = await this.api.purchases.subscriptionsv2.get({ packageName: this.packageName, token });
    const line = data.lineItems?.[0];
    return {
      state: data.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED",
      productId: line?.productId ?? null,
      expiresAt: line?.expiryTime ? new Date(line.expiryTime) : null,
      acknowledged: data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
      orderId: line?.latestSuccessfulOrderId ?? null,
      obfuscatedAccountId: data.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
      linkedPurchaseToken: data.linkedPurchaseToken ?? null,
    };
  }

  async acknowledgeSubscription(productId: string, token: string): Promise<void> {
    await this.api.purchases.subscriptions.acknowledge({ packageName: this.packageName, subscriptionId: productId, token });
  }
}

let instance: PlayApi | undefined;

export function playApi(): PlayApi {
  instance ??= new GooglePlayApi();
  return instance;
}

export function setPlayApiForTesting(api: PlayApi | undefined): void {
  instance = api;
}
