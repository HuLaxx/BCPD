export type MarketKind = "Equity index" | "Digital asset";

export type Asset = {
  id: string;
  label: string;
  country: string;
  kind: MarketKind;
  symbol: string;
};

export const ASSETS: ReadonlyArray<Asset> = [
  {id:"us",label:"S&P 500",country:"United States",kind:"Equity index",symbol:"^GSPC"},
  {id:"uk",label:"FTSE 100",country:"United Kingdom",kind:"Equity index",symbol:"^FTSE"},
  {id:"de",label:"DAX",country:"Germany",kind:"Equity index",symbol:"^GDAXI"},
  {id:"fr",label:"CAC 40",country:"France",kind:"Equity index",symbol:"^FCHI"},
  {id:"jp",label:"Nikkei 225",country:"Japan",kind:"Equity index",symbol:"^N225"},
  {id:"hk",label:"Hang Seng",country:"Hong Kong",kind:"Equity index",symbol:"^HSI"},
  {id:"in",label:"Nifty 50",country:"India",kind:"Equity index",symbol:"^NSEI"},
  {id:"au",label:"ASX 200",country:"Australia",kind:"Equity index",symbol:"^AXJO"},
  {id:"ca",label:"TSX Composite",country:"Canada",kind:"Equity index",symbol:"^GSPTSE"},
  {id:"btc",label:"Bitcoin",country:"Digital asset",kind:"Digital asset",symbol:"BTC-USD"},
  {id:"eth",label:"Ethereum",country:"Digital asset",kind:"Digital asset",symbol:"ETH-USD"},
  {id:"xrp",label:"XRP",country:"Digital asset",kind:"Digital asset",symbol:"XRP-USD"},
  {id:"bnb",label:"BNB",country:"Digital asset",kind:"Digital asset",symbol:"BNB-USD"},
  {id:"sol",label:"Solana",country:"Digital asset",kind:"Digital asset",symbol:"SOL-USD"}
];

export const DEFAULT_MARKETS = ["us","in","btc","eth"];
