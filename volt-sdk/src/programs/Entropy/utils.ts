// import type {
//   Cluster,
//   GroupConfig,
//   I80F48,
//   MangoAccount,
//   MangoCache,
//   MangoGroup,
//   PerpMarket,
//   PerpMarketConfig,
//   RootBank,
//   SpotMarketConfig,
//   TokenConfig,
//   TokenInfo,
// } from "@friktion-labs/entropy-client";
// import {
//   Config,
//   getPerpMarketByBaseSymbol,
//   getSpotMarketByBaseSymbol,
//   getTokenByMint,
//   IDS,
//   MangoClient,
//   QUOTE_INDEX,
// } from "@friktion-labs/entropy-client";
// import type { Connection, PublicKey } from "@solana/web3.js";

// const ENTROPY_GROUP_NAME = "devnet.2";

// const invalidClusterError = "Invalid cluster";
// const clusterDataNotFoundError = "Couldn't find the associated ClusterData";
// const groupNotFoundError = "Group must be defined";
// const undefinedGroupConfigError = "GroupConfig must be defined";
// const tokenConfigNotFoundError = "TokenConfig not found";

// // Helper to init and configure a Mango object.
// export async function createAndInitializeMango(
//   connection: Connection,
//   cluster: Cluster
// ): Promise<Mango> {
//   let mangoGroup: string;
//   let mangoProgramId: PublicKey;

//   switch (cluster) {
//     case "devnet":
//       mangoGroup = MANGO_DEVNET_GROUP_TWO;
//       mangoProgramId = MANGO_PROGRAM_ID_DEVNET;
//       break;
//     case "mainnet":
//       mangoGroup = MANGO_MAINNET_GROUP_ONE;
//       mangoProgramId = MANGO_PROGRAM_ID;
//       break;
//     default: {
//       throw invalidClusterError;
//     }
//   }
//   const config = new Config(IDS);
//   const groupConfig = config.getGroup(cluster, mangoGroup);
//   if (!groupConfig) {
//     throw new Error("unable to get mango group config");
//   }

//   const clusterData = IDS.groups.find(
//     (g: { name: string; cluster: string }) => {
//       return g.name === mangoGroup && g.cluster === cluster;
//     }
//   );
//   if (!clusterData) {
//     throw clusterDataNotFoundError;
//   }

//   const mangoGroupKey = groupConfig.publicKey;
//   const client = new MangoClient(connection, mangoProgramId);
//   const group = await client.getMangoGroup(mangoGroupKey);

//   // Fetching, a first time to prevent undefined root banks
//   group.rootBankAccounts = await group.loadRootBanks(connection);

//   return new Mango(group, groupConfig, client);
// }

// export class Mango {
//   groupConfig: GroupConfig;
//   group: MangoGroup;
//   client: MangoClient;
//   programId: PublicKey;
//   quoteTokenInfo: TokenInfo;

//   constructor(
//     group: MangoGroup,
//     groupConfig: GroupConfig,
//     client: MangoClient
//   ) {
//     this.group = group;
//     this.groupConfig = groupConfig;
//     this.client = client;
//     this.programId = client.programId;
//     this.quoteTokenInfo = group.getQuoteTokenInfo();
//   }

//   async getCache(): Promise<MangoCache> {
//     return this.group.loadCache(this.client.connection);
//   }

//   // Load Mango Market V3 account's infos
//   async load(account: PublicKey): Promise<MangoAccount> {
//     return this.client.getMangoAccount(account, this.programId);
//   }

//   // Reload Mango Market V3 account's infos
//   async reload(account: MangoAccount): Promise<MangoAccount> {
//     return account.reload(this.client.connection, this.group.dexProgramId);
//   }

//   async mangoAccountSpotBalanceQuote(account: MangoAccount): Promise<I80F48> {
//     const cache = await this.getCache();
//     const collateralSpotAmount = account.getNet(
//       cache.rootBankCache[QUOTE_INDEX],
//       QUOTE_INDEX
//     );
//     return collateralSpotAmount;
//   }

//   async mangoAccountSpotBalanceFor(
//     mint: PublicKey,
//     mintSymbol: string,
//     account: MangoAccount
//   ): Promise<I80F48> {
//     const cache = await this.getCache();
//     const smi = this.getSpotMarketConfig(mintSymbol).marketIndex;
//     const sti = this.getTokenIndex(mint);
//     const collateralSpotAmount = account.getNet(cache.rootBankCache[smi], sti);
//     return collateralSpotAmount;
//   }

//   async getQuoteRootBank(): Promise<RootBank> {
//     const rootBanks = await this.group.loadRootBanks(this.client.connection);
//     const rootBankPk = this.getRootBankForToken(QUOTE_INDEX);
//     const rootBankIndex = this.group.getRootBankIndex(rootBankPk);
//     const rootBank = rootBanks[rootBankIndex];
//     if (!rootBank) {
//       throw Error("RootBankNotFound");
//     }
//     return rootBank;
//   }

//   getSpotMarketConfig(marketName: string): SpotMarketConfig {
//     return getSpotMarketByBaseSymbol(
//       this.groupConfig,
//       marketName.toUpperCase()
//     ) as SpotMarketConfig;
//   }

//   getPerpMarketConfig(marketName: string): PerpMarketConfig {
//     return getPerpMarketByBaseSymbol(
//       this.groupConfig,
//       marketName.toUpperCase()
//     ) as PerpMarketConfig;
//   }

//   getPerpMarket(marketName: string): Promise<PerpMarket> {
//     const perpMarketConfig = this.getPerpMarketConfig(marketName);
//     return this.client.getPerpMarket(
//       perpMarketConfig.publicKey,
//       perpMarketConfig.baseDecimals,
//       perpMarketConfig.quoteDecimals
//     );
//   }

//   async printAccountInfo(account: MangoAccount) {
//     const cache = await this.getCache();
//     console.log(
//       `       <*> ${account
//         .toPrettyString(this.groupConfig, this.group, cache)
//         .replace(/\/n/g, "       \n<*>")}`
//     );
//   }

//   getTokenIndex(tokenMint: PublicKey): number {
//     if (!this.group) {
//       throw groupNotFoundError;
//     }
//     // look up token index by mint public key
//     return this.group.getTokenIndex(tokenMint);
//   }

//   getTokenConfig(tokenIndex: number): TokenConfig {
//     if (!this.groupConfig) {
//       throw undefinedGroupConfigError;
//     }
//     const tokenConfig = this.groupConfig.tokens.find((_config, index) => {
//       return index === tokenIndex;
//     });
//     if (!tokenConfig) {
//       throw tokenConfigNotFoundError;
//     }

//     return tokenConfig;
//   }

//   getRootBankForToken(tokenIndex: number): PublicKey {
//     if (!this.group) {
//       throw groupNotFoundError;
//     }
//     const rootBank = this.group.rootBankAccounts[tokenIndex];
//     if (!rootBank) {
//       throw new Error("vault is undefined");
//     }
//     return rootBank.publicKey;
//   }

//   getNodeBankFor(tokenIndex: number, tokenMint: PublicKey): PublicKey {
//     if (!this.group) {
//       throw groupNotFoundError;
//     }
//     const rootBankAccount = this.group.rootBankAccounts[tokenIndex];
//     if (!rootBankAccount) {
//       const error = `rootBankAccount not found for ${tokenIndex}`;
//       throw error;
//     }
//     const tokenConfig = getTokenByMint(this.groupConfig, tokenMint); // this.getTokenConfig(tokenIndex) seems it's unordered on devnet, let's see on mainnet later
//     if (!tokenConfig) {
//       throw tokenConfigNotFoundError;
//     }
//     const nodeBank = rootBankAccount.nodeBankAccounts.find((node, _index) => {
//       if (!node) {
//         return false;
//       }
//       return node.publicKey.toBase58 === tokenConfig.rootKey.toBase58;
//     });
//     if (!nodeBank) {
//       throw new Error("nodeBank is undefined");
//     }
//     return nodeBank.publicKey;
//   }

//   getVaultFor(tokenIndex: number): PublicKey {
//     if (!this.group) {
//       throw groupNotFoundError;
//     }
//     const rootBankAccount = this.group.rootBankAccounts[tokenIndex];
//     if (!rootBankAccount) {
//       const error = `rootBankAccount not found for ${tokenIndex}`;
//       throw error;
//     }
//     const vault = rootBankAccount.nodeBankAccounts[0].vault;
//     if (!vault) {
//       throw new Error("vault is undefined");
//     }
//     return vault;
//   }

//   getMangoCacheAccount(): PublicKey {
//     if (!this.group) {
//       throw groupNotFoundError;
//     }
//     return this.group.mangoCache;
//   }
// }
