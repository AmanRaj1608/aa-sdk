import { Signer } from "ethers";
import { type BigNumberish, type UserOperationStruct } from "@alchemy/aa-core";
import type { IBundler } from "@biconomy/bundler";
import type {
  IPaymaster,
  PaymasterFeeQuote,
  SponsorUserOperationDto,
} from "@biconomy/paymaster";
import { BaseValidationModule, type ModuleInfo } from "@biconomy/modules";
import { Provider } from "@ethersproject/providers";
import { type Hex } from "viem";

export type EntryPointAddresses = {
  [address: string]: string;
};

export type BiconomyFactories = {
  [address: string]: string;
};

export type BiconomyImplementations = {
  [address: string]: string;
};

export type EntryPointAddressesByVersion = {
  [version: string]: string;
};

export type BiconomyFactoriesByVersion = {
  [version: string]: string;
};

export type BiconomyImplementationsByVersion = {
  [version: string]: string;
};

export type SmartAccountConfig = {
  entryPointAddress: string;
  bundler?: IBundler;
};

export interface GasOverheads {
  fixed: number;
  perUserOp: number;
  perUserOpWord: number;
  zeroByte: number;
  nonZeroByte: number;
  bundleSize: number;
  sigSize: number;
}

/**
 * Enum representing available validation modules.
 *
 * - `ECDSA_OWNERSHIP`: Default module for ECDSA ownership validation.
 * - `MULTICHAIN`: Default module for multi-chain validation.
 * -  If you don't provide any module, ECDSA_OWNERSHIP will be used as default
 */
/*export enum AuthorizationModuleType {
  ECDSA_OWNERSHIP = DEFAULT_ECDSA_OWNERSHIP_MODULE,
  // MULTICHAIN = DEFAULT_MULTICHAIN_MODULE,
}*/

export type BaseSmartAccountConfig = {
  // owner?: Signer // can be in child classes
  index?: number;
  provider?: Provider;
  entryPointAddress?: string;
  accountAddress?: string;
  overheads?: Partial<GasOverheads>;
  paymaster?: IPaymaster; // PaymasterAPI
  bundler?: IBundler; // like HttpRpcClient
  chainId: number;
};

export type BiconomyTokenPaymasterRequest = {
  feeQuote: PaymasterFeeQuote;
  spender: string;
  maxApproval?: boolean;
};

export type BiconomySmartAccountConfig = {
  signer: Signer;
  rpcUrl?: string;
  chainId: number;
  entryPointAddress?: string;
  bundler?: IBundler;
  paymaster?: IPaymaster;
  nodeClientUrl?: string;
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

type ConditionalValidationProps = RequireAtLeastOne<
  {
    defaultValidationModule: BaseValidationModule;
    signer: Signer;
  },
  "defaultValidationModule" | "signer"
>;

export type BiconomySmartAccountV2Config = BaseSmartAccountConfig &
  ConditionalValidationProps & {
    factoryAddress?: Hex;
    senderAddress?: Hex;
    implementationAddress?: Hex;
    defaultFallbackHandler?: Hex;
    rpcUrl?: string; // as good as Provider
    nodeClientUrl?: string; // very specific to Biconomy
    biconomyPaymasterApiKey?: string;
    activeValidationModule?: BaseValidationModule;
    scanForUpgradedAccountsFromV1?: boolean;
    maxIndexForScan?: number;
  };

export type BuildUserOpOptions = {
  overrides?: Overrides;
  skipBundlerGasEstimation?: boolean;
  params?: ModuleInfo;
  nonceOptions?: NonceOptions;
  forceEncodeForBatch?: boolean;
  paymasterServiceData?: SponsorUserOperationDto;
};

export type NonceOptions = {
  nonceKey?: number;
  nonceOverride?: number;
};

// Used in AccountV1
export type SendUserOpDto = {
  signer?: Signer;
  simulationType?: SimulationType;
};

// Generic options in AccountV2
export type SendUserOpOptions = {
  simulationType?: SimulationType;
};

export type SimulationType = "validation" | "validation_and_execution";

export type Overrides = {
  callGasLimit?: Hex;
  verificationGasLimit?: Hex;
  preVerificationGas?: Hex;
  maxFeePerGas?: Hex;
  maxPriorityFeePerGas?: Hex;
  paymasterData?: Hex;
  signature?: Hex;
};

export type InitilizationData = {
  accountIndex?: number;
  signerAddress?: string;
};

export type InitializeV2Data = {
  accountIndex?: number;
};

export type EstimateUserOpGasParams = {
  userOp: Partial<UserOperationStruct>;
  overrides?: Overrides;
  skipBundlerGasEstimation?: boolean;
  paymasterServiceData?: SponsorUserOperationDto;
};

export interface TransactionDetailsForUserOp {
  target: string;
  data: string;
  value?: BigNumberish;
  gasLimit?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  nonce?: BigNumberish;
}

export type CounterFactualAddressParam = {
  index?: number;
  validationModule?: BaseValidationModule;
  scanForUpgradedAccountsFromV1?: boolean;
  maxIndexForScan?: number;
};

export type QueryParamsForAddressResolver = {
  eoaAddress: Hex;
  index: number;
  moduleAddress: Hex;
  moduleSetupData: Hex;
  maxIndexForScan?: number;
};

export type SmartAccountInfo = {
  accountAddress: Hex;
  factoryAddress: Hex;
  currentImplementation: string;
  currentVersion: string;
  factoryVersion: string;
  deploymentIndex: BigNumberish;
};

export type Transaction = {
  to: string;
  value: BigNumberish;
  data: string;
};
